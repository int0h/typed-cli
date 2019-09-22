import { Parser, prepareCliDeclaration } from './parser';
import { Printer } from './printer';
import { CliDeclaration, ResolveCliDeclaration } from './type-logic';
import { isError } from './report';
import { CompleterOptions, tabtabCliDeclComplete, normalizeCompleterOptions } from './completer';

export type Writer = (str: string, logType: 'log' | 'error') => void;

export type Exiter = (hasErrors: boolean) => void;

export type ArgvProvider = () => string[];

export type CliHelper = <D extends CliDeclaration>(decl: D) => ResolveCliDeclaration<D>;

export type CreateCliHelperParams = {
    writer: Writer;
    exiter: Exiter;
    argvProvider: ArgvProvider;
    printer: Printer;
    helpGeneration?: boolean;
    completer?: CompleterOptions | boolean;
}

export function createCliHelper(params: CreateCliHelperParams): CliHelper {
    return <D extends CliDeclaration>(decl: D): ResolveCliDeclaration<D> => {
        const {argvProvider, exiter, printer, writer, helpGeneration, completer} = params;
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
        const {data, report} = parser.parse(argv);
        const printedReport = printer.stringifyReport(report);
        printedReport !== '' && writer(printedReport, 'error');
        if (isError(report.issue)) {
            exiter(true);
            throw new Error('exiter has failed');
        }
        return data as ResolveCliDeclaration<D>;
    };
}
