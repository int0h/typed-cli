// main API:
export {option} from './src/option-helper';
export {command, defaultCommand} from './src/command';
export {cli} from './src/default-cli';

// helper creators:
export {createCliHelper} from './src/cli-helper';
export {createCommandHelper} from './src/command';
export {completeForCommandSet, completeForCliDecl} from './src/completer';

// types:
export {Writer, Exiter, ArgvProvider, CreateCliHelperParams, CliHelper} from './src/cli-helper';
export {Parser} from './src/parser';
export {Printer} from './src/printer';

// defaults:
export {defaultArgvProvider, defaultExiter, defaultPrinter, defaultWriter} from './src/default-cli';
export {decorators, chalkInstance} from './src/decorator';
export {locales} from './src/i18n';
import * as presets from './presets';
export {presets};
