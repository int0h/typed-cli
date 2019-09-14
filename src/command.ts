import { CliDeclaration, ResolveCliDeclaration } from "./type-logic";
import { createKebabAlias, findKeyCollision } from "./utils";
import { Parser } from "./parser";
import { Writer, Exiter, ArgvProvider } from "./cli-helper";
import { Printer } from "./printer";
import { isError } from "util";
import { Report } from "./report";

export type CommandSet = Record<string, CommandBuilder<CliDeclaration>>;

export type CommandHandler<D extends CliDeclaration> = (data: ResolveCliDeclaration<D>) => void;

export class CommandBuilder<D extends CliDeclaration> {
    decl: D;
    fn!: CommandHandler<D>;
    aliases: string[] = [];
    subCommandSet: CommandSet = {};

    constructor(decl: D) {
        this.decl = decl;
    }

    clone(): CommandBuilder<D> {
        const cl = new CommandBuilder(this.decl);
        cl.fn = this.fn;
        cl.aliases = this.aliases;
        cl.subCommandSet = this.subCommandSet;
        return cl;
    }

    handle(fn: CommandHandler<D>): CommandBuilder<D> {
        const cl = this.clone();
        cl.fn = fn;
        return cl;
    }

    alias(...aliases: string[]): CommandBuilder<D> {
        const cl = this.clone();
        cl.aliases = aliases;
        return cl;
    }

    subCommands(subCommandSet: Record<string, CommandBuilder<any>>): CommandBuilder<D> {
        const cl = this.clone();
        cl.subCommandSet = {
            ...this.subCommandSet,
            ...subCommandSet
        };
        return cl;
    }

    match(cmdString: string): boolean {
        return this.aliases.includes(cmdString);
    }
}

function getCommandSetAliases(cs: CommandSet): string[] {
    let res: string[] = [];
    for (const key of Object.keys(cs)) {
        res = res.concat(cs[key].aliases);
    }
    return res;
}

function prepareCommandSet<C extends CommandSet>(cs: C, namePrefix = ''): C {
    const res: C = {} as C;
    for (const key of Object.keys(cs).sort()) {
        const cmd = cs[key].clone();
        if (!cmd.fn) {
            throw new Error('no handler was set for command <${key}>');
        }
        cmd.aliases = [key, ...cmd.aliases];
        const kebab = createKebabAlias(key);
        if (kebab) {
            cmd.aliases.push(kebab);
        }
        cmd.decl = {
            ...cmd.decl,
            name: namePrefix + ' ' + key
        };
        cmd.subCommandSet = prepareCommandSet(cmd.subCommandSet, namePrefix + ' ' + key);
        res[key as keyof C] = cmd as any;
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

function parseCommand(cmd: CommandBuilder<CliDeclaration>, args: string[], params: ParseCommandSetParams): void {
    const {onReport, onHelp} = params;
    const handledByChild = parseCommandSet({
        cs: cmd.subCommandSet,
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
    const parser = new Parser(cmd.decl);
    const {report, data} = parser.parse(args);
    if (report.issue !== null) {
        onReport(report);
    }
    if (isError(report.issue)) {
        return;
    }
    cmd.fn(data as any);
    return;
}

export function parseCommandSet(params: ParseCommandSetParams): boolean {
    const {cs, argv} = params;
    const [commandName, ...args] = argv;
    for (const cmd of Object.values(cs)) {
        if (cmd.match(commandName)) {
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

export const defaultCommand = Symbol('defaultCommand');

export type CommandHelperParams = {
    program?: string;
    description?: string;
}

export const createCommandHelper = (params: CreateCommandHelperParams) =>
    (cfg: CommandHelperParams, cs: CommandSet): void => {
        cs = prepareCommandSet(cs, cfg.program);
        const {writer, exiter, argvProvider, printer, helpGeneration} = params;
        const onReport = (report: Report): void => {
            const printedReport = printer.stringifyReport(report);
            printedReport !== '' && writer(printedReport, 'error');
            if (isError(report.issue)) {
                exiter(true);
                throw new Error('exiter has failed');
            }
        };
        const argv = argvProvider() as string[] // TODO;
        const onHelp = (cmd: CommandBuilder<CliDeclaration>): void => {
            writer(printer.generateHelp(cmd.decl), 'log');
        }
        const handled = parseCommandSet({cs, argv, onReport, onHelp});
        if (handled) {
            return;
        }
        if (helpGeneration && argv.includes('--help')) {
            writer(printer.generateHelpForComands(cfg, cs), 'log');
        }
        const defCmd = cs[defaultCommand as unknown as keyof CommandSet];
        if (defCmd) {
            parseCommand(defCmd, argv, {cs, argv, onReport, onHelp});
        }
}

export function command<D extends CliDeclaration>(decl: D): CommandBuilder<D> {
    return new CommandBuilder(decl);
}
