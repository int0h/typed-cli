import { Parser, prepareCliDeclaration } from './parser';
import { Printer } from './printer';
import { CliDeclaration, ResolveCliDeclaration } from './type-logic';
import { isError } from './report';
import { CompleterOptions, tabtabCliDeclComplete, normalizeCompleterOptions } from './completer';

/**
 * Writer - is a function to be called by `typed-cli`
 * when it reports invalid data or printing help.
 * For the most cases `console.log` works fine.
 */
export type Writer = (str: string, logType: 'log' | 'error') => void;

/**
 * Exiter - is a function that handles premature exit from program.
 * It will be fired when user inputs invalid data or
 * asked for help with `--help` flag.
 * It is `process.exit(...)` by default
 */
export type Exiter = (hasErrors: boolean) => void;

/**
 * ArgvProvider - is a function to return argv.
 * It is `() => process.argv` by default.
 */
export type ArgvProvider = () => string[];

export type EnvProvider = () => Record<string, string | undefined>;

/** CliHelper - is a function that takes CLI declaration and returns data user inputed */
export type CliHelper = <D extends CliDeclaration>(decl: D) => ResolveCliDeclaration<D>;

export type CreateCliHelperParams = {
    writer: Writer;
    exiter: Exiter;
    argvProvider: ArgvProvider;
    envProvider:EnvProvider;
    printer: Printer;
    helpGeneration?: boolean;
    completer?: CompleterOptions | boolean;
}

/**
 * Creates a CliHelper.
 * `cli(...)` - is an example for CliHelper
 * @param params - helper configuration
 */
export function createCliHelper(params: CreateCliHelperParams): CliHelper {
    return <D extends CliDeclaration>(decl: D): ResolveCliDeclaration<D> => {
        const {argvProvider, envProvider, exiter, printer, writer, helpGeneration, completer} = params;
        decl = prepareCliDeclaration(decl).decl as any;
        const parser = new Parser(decl);
        const argv = argvProvider();
        if (completer) {
            const {completeCmd} = normalizeCompleterOptions(typeof completer === 'boolean' ? {} : completer);
            if (argv[0] === completeCmd) {
                tabtabCliDeclComplete(decl);
                exiter(false);
                throw new Error('exiter has failed');
            }
        }
        if (helpGeneration) {
            if (argv.includes('--help')) {
                writer(printer.generateHelp(decl), 'log');
                exiter(false);
                throw new Error('exiter has failed');
            }
        }
        const {data, report} = parser.parse(argv, envProvider());
        const printedReport = printer.stringifyReport(report);
        printedReport !== '' && writer(printedReport, 'error');
        if (isError(report.issue)) {
            exiter(true);
            throw new Error('exiter has failed');
        }
        return data as ResolveCliDeclaration<D>;
    };
}
