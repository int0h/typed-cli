import {createCliHelper, ArgvProvider, Exiter, Writer} from './cli-helper';
import { Printer } from './printer';
import { en_US } from './i18n';
import { fancy } from './decorator';

export const defaultPrinter = new Printer(en_US, fancy);

export const defaultArgvProvider: ArgvProvider = () => process.argv.slice(2);

export const defaultExiter: Exiter = hasErrors => process.exit(hasErrors ? 1 : 0);

export const defaultWriter: Writer = (text, logType) => {
    switch (logType) {
        case 'error': console.error(text); return;
        case 'log': console.log(text); return;
        default: throw new Error('unknown logType');
    }
};

export const cli = createCliHelper({
    printer: defaultPrinter,
    argvProvider: defaultArgvProvider,
    exiter: defaultExiter,
    writer: defaultWriter,
    helpGeneration: true
});
