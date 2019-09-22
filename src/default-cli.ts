import { createCliHelper, ArgvProvider, Exiter, Writer } from './cli-helper';
import { Printer } from './printer';
import { en_US } from './i18n';
import { fancy } from './decorator';
import { createCommandHelper } from './command';
import { CliDeclaration, ResolveCliDeclaration } from './type-logic';

export const defaultPrinter = new Printer({locale: en_US, decorator: fancy});

export const defaultArgvProvider: ArgvProvider = () => process.argv.slice(2);

export const defaultExiter: Exiter = hasErrors => process.exit(hasErrors ? 1 : 0);

export const defaultWriter: Writer = (text, logType) => {
    switch (logType) {
        case 'error': console.error(text); return;
        case 'log': console.log(text); return;
        default: throw new Error('unknown logType');
    }
};

const cliHelper = createCliHelper({
    printer: defaultPrinter,
    argvProvider: defaultArgvProvider,
    exiter: defaultExiter,
    writer: defaultWriter,
    helpGeneration: true,
    completer: true
});

export const setupCommands = createCommandHelper({
    printer: defaultPrinter,
    argvProvider: defaultArgvProvider,
    exiter: defaultExiter,
    writer: defaultWriter,
    helpGeneration: true
});

export function cli<D extends CliDeclaration>(decl: D): ResolveCliDeclaration<D> {
    return cliHelper(decl);
}

cli.commands = setupCommands;
