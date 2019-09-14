import {Parser} from './parser';
import {Printer} from './printer';
import { CliDeclaration, ResolveCliDeclaration } from './type-logic';
import { isError } from './report';

export type Writer = (str: string, logType: 'log' | 'error') => void;

export type Exiter = (hasErrors: boolean) => void;

export type ArgvProvider = () => string | string[];

export type CliHelper = <D extends CliDeclaration>(decl: D) => ResolveCliDeclaration<D>;

export type CreateCliHelperParams = {
    writer: Writer;
    exiter: Exiter;
    argvProvider: ArgvProvider;
    printer: Printer;
    helpGeneration?: boolean;
}

export function createCliHelper(params: CreateCliHelperParams): CliHelper {
    return <D extends CliDeclaration>(decl: D): ResolveCliDeclaration<D> => {
        const {argvProvider, exiter, printer, writer, helpGeneration} = params;
        const parser = new Parser(decl);
        const argv = argvProvider();
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
