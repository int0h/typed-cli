import { CliDeclaration, ResolveCliDeclaration } from "./type-logic";
import { createKebabAlias, findKeyCollision } from "./utils";
import { Parser, prepareCliDeclaration } from "./parser";
import { Writer, Exiter, ArgvProvider } from "./cli-helper";
import { Printer } from "./printer";
import { isError } from "util";
import { Report, errorToReport } from "./report";
import { CompleterOptions, handleCompleterOptions, tabtabCommandDeclComplete } from "./completer";
import { allIssues } from "./errors";

export const defaultCommand = Symbol('defaultCommand');

export type CommandSet = Record<string, CommandBuilder<any>> & {[defaultCommand]?: CommandBuilder<any>};

export type CommandHandler<D extends CliDeclaration> = (data: ResolveCliDeclaration<D>) => void;

export const _decl = Symbol('decl');
export const _subCommandSet = Symbol('subCommandSet');
export const _fn = Symbol('fn');
export const _aliases = Symbol('aliases');
export const _clone = Symbol('clone');
export const _match = Symbol('match');

export class CommandBuilder<D extends CliDeclaration> {
    [_decl]: D;
    [_fn]: CommandHandler<D>;
    [_aliases]: string[] = [];
    [_subCommandSet]: CommandSet = {};

    constructor(decl: D) {
        this[_decl] = decl;
    }

    [_clone] = (): CommandBuilder<D> => {
        const cl = new CommandBuilder(this[_decl]);
        cl[_fn] = this[_fn];
        cl[_aliases] = this[_aliases];
        cl[_subCommandSet] = this[_subCommandSet];
        return cl;
    }

    handle(fn: CommandHandler<D>): CommandBuilder<D> {
        const cl = this[_clone]();
        cl[_fn] = fn;
        return cl;
    }

    alias(...aliases: string[]): CommandBuilder<D> {
        const cl = this[_clone]();
        cl[_aliases] = aliases;
        return cl;
    }

    subCommands(subCommandSet: Record<string, CommandBuilder<any>>): CommandBuilder<D> {
        const cl = this[_clone]();
        cl[_subCommandSet] = {
            ...this[_subCommandSet],
            ...subCommandSet
        };
        return cl;
    }

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

export function prepareCommandSet<C extends CommandSet>(cs: C, namePrefix = ''): C {
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
        cmd[_subCommandSet] = prepareCommandSet(cmd[_subCommandSet], namePrefix + ' ' + key);
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
        throw new Error(`alias colision for comand <${aliasCollision}>`);
    }
    return res;
}

// function create
export type ParseCommandSetParams = {
    cs: CommandSet;
    argv: string[];
    onReport: (report: Report) => void;
    onHelp?: (cmd: CommandBuilder<CliDeclaration>) => void;
}

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

function parseCommand(cmd: CommandBuilder<CliDeclaration>, args: string[], params: ParseCommandSetParams): void {
    const {onReport, onHelp} = params;
    const handledByChild = parseCommandSet({
        cs: cmd[_subCommandSet],
        argv: args,
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
    const {report, data} = parser.parse(args);
    if (report.issue !== null || report.children.length > 0) {
        onReport(report);
    }
    cmd[_fn](data as any);
    return;
}

export function parseCommandSet(params: ParseCommandSetParams): boolean {
    const {cs, argv} = params;
    const [commandName, ...args] = argv;
    for (const cmd of Object.values(cs)) {
        if (cmd[_match](commandName)) {
            parseCommand(cmd, args, params);
            return true;
        }
    }
    return false;
}

export type CreateCommandHelperParams = {
    writer: Writer;
    exiter: Exiter;
    argvProvider: ArgvProvider;
    printer: Printer;
    helpGeneration?: boolean;
}

export type CommandHelperParams = {
    program?: string;
    description?: string;
    completer?: CompleterOptions | boolean;
}

export const createCommandHelper = (params: CreateCommandHelperParams) =>
    (cfg: CommandHelperParams, cs: CommandSet): void => {
        cs = prepareCommandSet(cs, cfg.program);
        const {writer, exiter, argvProvider, printer, helpGeneration} = params;
        const argv = argvProvider();
        if (cfg.completer) {
            const program = cfg.program;
            if (!program) {
                throw new Error('program name must be provided for completions');
            }
            handleCompleterOptions(argv[0], cfg.completer, program, () => {
                tabtabCommandDeclComplete(cs);
                exiter(false);
                throw new Error('exiter has failed');
            }, (hasErrors) => {
                exiter(hasErrors);
                throw new Error('exiter has failed');
            });
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
        const handled = parseCommandSet({cs, argv, onReport, onHelp});
        if (handled) {
            return;
        }
        if (helpGeneration && argv.includes('--help')) {
            writer(printer.generateHelpForComands(cfg, cs), 'log');
            exiter(false);
            throw new Error('exiter has failed');
        }

        const defCmd = cs[defaultCommand as unknown as keyof CommandSet];
        const firstCommand = argv[0];
        const hasCommand = firstCommand && /^[^-]/.test(firstCommand);
        if (!hasCommand) {
            if (defCmd) {
                parseCommand(defCmd, argv, {cs, argv, onReport, onHelp});
                return;
            } else {
                onReport(errorToReport(new allIssues.NoCommand()));
            }
        }

        onReport(errorToReport(new allIssues.InvalidCommand(firstCommand)));
}

export function command<D extends CliDeclaration>(decl: D): CommandBuilder<D> {
    return new CommandBuilder(decl);
}
