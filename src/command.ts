import { CliDeclaration, ResolveCliDeclaration } from "./type-logic";
import { createKebabAlias, findKeyCollision } from "./utils";
import { Parser, prepareCliDeclaration } from "./parser";
import { Writer, Exiter, ArgvProvider, EnvProvider } from "./cli-helper";
import { Printer } from "./printer";
import { isError } from "util";
import { Report, errorToReport } from "./report";
import { CompleterOptions, handleCompleterOptions, tabtabCommandDeclComplete } from "./completer";
import { allIssues } from "./errors";

/**
 * It can be used as a key in command set to set a default command.
 * Such command will be used if no command was provided.
 */
export const defaultCommand = Symbol('defaultCommand');

/** @hidden */
export type CommandSet = Record<string, CommandBuilder<any>> & {[defaultCommand]?: CommandBuilder<any>};

/** @hidden */
export type CommandHandler<D extends CliDeclaration> = (data: ResolveCliDeclaration<D>) => void;

/** @hidden */
export const _decl = Symbol('decl');
/** @hidden */
export const _subCommandSet = Symbol('subCommandSet');
/** @hidden */
export const _fn = Symbol('fn');
/** @hidden */
export const _aliases = Symbol('aliases');
/** @hidden */
export const _clone = Symbol('clone');
/** @hidden */
export const _match = Symbol('match');

export class CommandBuilder<D extends CliDeclaration> {
    [_decl]: D;
    [_fn]!: CommandHandler<D>;
    [_aliases]: string[] = [];
    [_subCommandSet]: CommandSet = {};

    constructor(decl: D) {
        this[_decl] = decl;
    }

    /** @hidden */
    [_clone] = (): CommandBuilder<D> => {
        const cl = new CommandBuilder(this[_decl]);
        cl[_fn] = this[_fn];
        cl[_aliases] = this[_aliases];
        cl[_subCommandSet] = this[_subCommandSet];
        return cl;
    }

    /**
     * Sets a command handler - a function to be called
     * if the input string matches against the command.
     * **Important:** a handler must be provided for a command, if you don't
     * want your program to do anything, just pass `() => {}`
     * @param fn - a function to be called for the command
     */
    handle(fn: CommandHandler<D>): CommandBuilder<D> {
        const cl = this[_clone]();
        cl[_fn] = fn;
        return cl;
    }

    /**
     * Adds aliases to the command
     * @param aliases - alias list
     */
    alias(...aliases: string[]): CommandBuilder<D> {
        const cl = this[_clone]();
        cl[_aliases] = aliases;
        return cl;
    }

    /**
     * Sets sub-command for the current command.
     * The signature is similar to `T` in `cli.commands({}, <T>)`.
     *
     * `git remote add` - is a "sub-command" where:
     * `git` - is a program,
     * `remote` - is a command
     * `add` - is sub-command of command `remote`
     * @param subCommandSet - map (dictionary) of sub-commands
     */
    subCommands(subCommandSet: Record<string, CommandBuilder<any>>): CommandBuilder<D> {
        const cl = this[_clone]();
        cl[_subCommandSet] = {
            ...this[_subCommandSet],
            ...subCommandSet
        };
        return cl;
    }

    /** @hidden */
    [_match] = (cmdString: string): boolean => {
        return this[_aliases].includes(cmdString);
    }
}

function getCommandSetAliases(cs: CommandSet): string[] {
    let res: string[] = [];
    for (const key of Object.keys(cs)) {
        res = res.concat(cs[key][_aliases]);
    }
    return res;
}

/** @hidden */
export function prepareCommandSet<C extends CommandSet>(cs: C, cfg: CommandHelperParams = {}): C {
    const namePrefix = cfg.program ?? '';
    const res: C = {} as C;
    for (const key of Object.keys(cs).sort()) {
        const cmd = cs[key][_clone]();
        if (!cmd[_fn]) {
            throw new Error('no handler was set for command <${key}>');
        }
        cmd[_aliases] = [key, ...cmd[_aliases]];
        const kebab = createKebabAlias(key);
        if (kebab) {
            cmd[_aliases].push(kebab);
        }
        cmd[_decl] = {
            ...prepareCliDeclaration(cmd[_decl]).decl,
            name: namePrefix + ' ' + key
        };
        cmd[_subCommandSet] = prepareCommandSet(cmd[_subCommandSet], {...cfg, program: namePrefix + ' ' + key});
        cmd[_decl].useEnv ??= cfg.useEnv;
        cmd[_decl].envPrefix ??= cfg.envPrefix;
        res[key as keyof C] = cmd as any;
    }
    const defCmd = cs[defaultCommand];
    if (defCmd) {
        const cmd = defCmd[_clone]();
        if (!cmd[_fn]) {
            throw new Error('no handler was set for command <${key}>');
        }
        cmd[_decl] = {
            ...prepareCliDeclaration(defCmd[_decl]).decl,
            name: namePrefix
        };
        res[defaultCommand] = cmd;
    }
    const allAliases = getCommandSetAliases(res);
    const aliasCollision = findKeyCollision(allAliases);
    if (aliasCollision) {
        throw new Error(`alias collision for command <${aliasCollision}>`);
    }
    return res;
}

export type ParseCommandSetParams = {
    cs: CommandSet;
    argv: string[];
    env: Record<string, string | undefined>;
    onReport: (report: Report) => void;
    onHelp?: (cmd: CommandBuilder<CliDeclaration>) => void;
}

/** @hidden */
export function findMatchedCommand(argv: string[], cs: CommandSet): CommandBuilder<any> | null {
    let matched: CommandBuilder<any> | undefined = undefined;

    for (const command of Object.values(cs)) {
        if (command[_match](argv[0])) {
            matched = command;
            break;
        }
    }

    matched = matched || cs[defaultCommand];

    if (!matched) {
        return null;
    }

    const childMatch = findMatchedCommand(argv.slice(1), matched[_subCommandSet]);

    return childMatch || matched;
}

async function parseCommand(cmd: CommandBuilder<CliDeclaration>, args: string[], env: Record<string, string | undefined>, params: ParseCommandSetParams): Promise<void> {
    const {onReport, onHelp} = params;
    const handledByChild = await parseCommandSet({
        cs: cmd[_subCommandSet],
        argv: args,
        env,
        onReport,
        onHelp
    });
    if (handledByChild) {
        return;
    }
    if (onHelp && args.includes('--help')) {
        onHelp(cmd);
        return;
    }
    const parser = new Parser(cmd[_decl]);
    const {report, data} = await parser.parse(args, env);
    if (report.issue !== null || report.children.length > 0) {
        onReport(report);
    }
    cmd[_fn](data as any);
    return;
}

/** @hidden */
export async function parseCommandSet(params: ParseCommandSetParams): Promise<boolean> {
    const {cs, argv, env} = params;
    const [commandName, ...args] = argv;
    for (const cmd of Object.values(cs)) {
        if (cmd[_match](commandName)) {
            await parseCommand(cmd, args, env, params);
            return true;
        }
    }
    return false;
}

export type CreateCommandHelperParams = {
    writer: Writer;
    exiter: Exiter;
    argvProvider: ArgvProvider;
    envProvider: EnvProvider;
    printer: Printer;
    helpGeneration?: boolean;
}

export type CommandHelperParams = {
    /** program name */
    program?: string;
    /** program description */
    description?: string;
    /** `true` or completer config if tab completions wanted */
    completer?: CompleterOptions | boolean;
    /** parse options from environmental variables */
    useEnv?: boolean;
    /** environmental variable prefix */
    envPrefix?: string;
}

/**
 * Creates a CommandHelper. `cli.command` - is an example of CommandHelper
 * created with this function.
 * @param params
 */
export const createCommandHelper = (params: CreateCommandHelperParams) =>
    async (cfg: CommandHelperParams, cs: CommandSet): Promise<void> => {
        cs = prepareCommandSet(cs, cfg);
        const {writer, exiter, argvProvider, envProvider, printer, helpGeneration} = params;
        const argv = argvProvider();
        const env = envProvider();
        if (cfg.completer) {
            const program = cfg.program;
            if (!program) {
                throw new Error('program name must be provided for completions');
            }
            const handled = handleCompleterOptions(argv[0], cfg.completer, program, () => {
                tabtabCommandDeclComplete(cs);
                exiter(false);
                throw new Error('exiter has failed');
            }, (hasErrors) => {
                exiter(hasErrors);
                throw new Error('exiter has failed');
            });
            if (handled) {
                return;
            }
        }
        const onReport = (report: Report): void => {
            const printedReport = printer.stringifyReport(report);
            printedReport !== '' && writer(printedReport, 'error');
            if (isError(report.issue)) {
                exiter(true);
                throw new Error('exiter has failed');
            }
        };
        const onHelp = (cmd: CommandBuilder<CliDeclaration>): void => {
            writer(printer.generateHelp(cmd[_decl]), 'log');
        }
        const handled = await parseCommandSet({cs, argv, env, onReport, onHelp});
        if (handled) {
            return;
        }
        if (helpGeneration && argv.includes('--help')) {
            writer(printer.generateHelpForCommands(cfg, cs), 'log');
            exiter(false);
            throw new Error('exiter has failed');
        }

        const defCmd = cs[defaultCommand as unknown as keyof CommandSet];
        const firstCommand = argv[0];
        const hasCommand = firstCommand && /^[^-]/.test(firstCommand);
        if (!hasCommand) {
            if (defCmd) {
                await parseCommand(defCmd, argv, env, {cs, argv, env, onReport, onHelp});
                return;
            } else {
                onReport(errorToReport(new allIssues.NoCommand()));
            }
        }

        onReport(errorToReport(new allIssues.InvalidCommand(firstCommand)));
}

/**
 * Defines a program command
 * @param decl - command declaration, which is basically the same as program declaration passed to `cli()`
 */
export function command<D extends CliDeclaration>(decl: D): CommandBuilder<D> {
    return new CommandBuilder(decl);
}
