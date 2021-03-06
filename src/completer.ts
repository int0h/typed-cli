import { CommandSet, findMatchedCommand, _decl, _aliases, _subCommandSet, defaultCommand } from './command';
import { CliDeclaration } from './type-logic';
import yargsParser from 'yargs-parser';
import { objMap } from './utils';
import { getOptData, OptData } from './option';
import {parseArgsStringToArgv} from 'string-argv';
import * as tabtab from 'tabtab';
// import {} from ''

export type Completion = {
    completion: string;
    description: string;
};

function completeForOptionValue(option: OptData<any>, typedText: string): Completion[] {
    if (option.completer) {
        return option.completer(typedText);
    }
    return [];
}

function genOptionMap(decl: CliDeclaration): Record<string, OptData<any>> {
    const res: Record<string, OptData<any>> = {};
    for (const opt of Object.values(decl.options || {})) {
        const optData = getOptData(opt);
        res[opt.name] = optData;
        for (const alias of optData.aliases) {
            res[alias] = optData;
        }
    }
    return res;
}

export function completeForCliDecl(decl: CliDeclaration, argv: string[], typedText: string): Completion[] {
    const parsed = yargsParser(argv, {
        alias: decl.options && objMap(decl.options, item => getOptData(item).aliases)
    });
    const lastCmd = argv[argv.length - 1];
    const optionMap = genOptionMap(decl);

    // option value
    if (lastCmd && lastCmd.startsWith('-')) {
        const optName = lastCmd.startsWith('--')
            ? lastCmd.slice(2) // removes '--'
            : lastCmd.slice(1); // removes '-'
        const option = optionMap[optName];
        if (!option) {
            return [];
        }
        if (option.type !== 'boolean') {
            return completeForOptionValue(option, typedText);
        }
    }

    const getOptionNameCompletions = (partialName: string, longOpt: boolean): Completion[] => {
        const availableOptions = Object.entries(optionMap)
            // skip used opts
            .filter(([, optData]) => {
                if (optData.isArray) {
                    return true;
                }
                return !parsed[optData.name];
            })
            // filter by text
            .filter(([key]) => key.indexOf(partialName) === 0)
            // skip shorthands if '--' is typed already
            .filter(([key]) => key.length > 1 || !longOpt);
        return availableOptions.map(([key, optData]) => {
            const prefix = key.length > 1 ? '--' : '-';
            return {
                completion: prefix + key,
                description: optData.description
            };
        });
    };

    const getArgumentCompletions = (): Completion[] => [];

    if (typedText === '') {
        return [
            ...getOptionNameCompletions('', false),
            ...getArgumentCompletions()
        ]
    } else if (typedText.startsWith('-')) {
        return getOptionNameCompletions(typedText.replace(/^--?/, ''), typedText.startsWith('--'));
    } else {
        return getArgumentCompletions();
    }
}

function completeCommands(cs: CommandSet, typedText: string): Completion[] {
    const res: Completion[] = [];
    for (const cmd of Object.values(cs)) {
        for (const alias of cmd[_aliases]) {
            if (alias.indexOf(typedText) === 0) {
                res.push({
                    completion: alias,
                    description: cmd[_decl].description || ''
                });
            }
        }
    }
    return res;
}

export function completeForCommandSet(cs: CommandSet, argv: string[], typedText: string): Completion[] {
    const matchedCommand = findMatchedCommand(argv, cs);
    if (!matchedCommand || matchedCommand === cs[defaultCommand]) {
        return completeCommands(cs, typedText);
    }
    const decl = matchedCommand[_decl];
    return [
        ...completeCommands(matchedCommand[_subCommandSet], typedText),
        ...completeForCliDecl(decl, argv, typedText),
    ];
}

export function tabtabCommandDeclComplete(cs: CommandSet): void {
    const env = tabtab.parseEnv(process.env);
    const line = env.last.length > 0
        ? env.line.slice(0, -env.last.length)
        : env.line;
    const argv = parseArgsStringToArgv(line).slice(1);
    const completions = completeForCommandSet(cs, argv, env.last);
    tabtab.log(
        completions.map(c => ({
            name: c.completion,
            description: c.description
        }))
    );
}

export function tabtabCliDeclComplete(decl: CliDeclaration): void {
    const env = tabtab.parseEnv(process.env);
    const line = env.last.length > 0
        ? env.line.slice(0, -env.last.length)
        : env.line;
    const argv = parseArgsStringToArgv(line).slice(1);
    const completions = completeForCliDecl(decl, argv, env.last);
    tabtab.log(
        completions.map(c => ({
            name: c.completion,
            description: c.description
        }))
    );
}

export type CompleterOptions = {
    installCmd?: string;
    uninstallCmd?: string;
    completeCmd?: string;
}

export function normalizeCompleterOptions(opts: CompleterOptions): Required<CompleterOptions> {
    return {
        installCmd: 'typed-cli--install-shell-completions',
        uninstallCmd: 'typed-cli--install-shell-completions',
        completeCmd: 'typed-cli--complete-input',
        ...opts
    }
}

export function handleCompleterOptions(
    cmd: string,
    opts: CompleterOptions | boolean,
    name: string | undefined,
    onComplete: () => void,
    exiter: (hasErrors: boolean) => void
): boolean {
    const completerOpts = normalizeCompleterOptions(typeof opts === 'boolean' ? {} : opts);
    if (cmd === completerOpts.installCmd) {
        if (!name) {
            throw new Error('name must be provided for completions');
        }
        tabtab
            .install({
                name: name,
                completer: name,
                completeCmd: completerOpts.completeCmd
            })
            .then(() => exiter(false))
            .catch(err => {
                console.error('INSTALL ERROR', err);
                exiter(true);
            });
        return true;
    }
    if (cmd === completerOpts.uninstallCmd) {
        if (!name) {
            throw new Error('name must be provided for completions');
        }
        tabtab
            .uninstall({
                name: name,
            })
            .then(() => exiter(false))
            .catch(err => {
                console.error('UNINSTALL ERROR', err);
                exiter(true);
            });
            return true;
    }
    if (cmd === completerOpts.completeCmd) {
        onComplete();
        return true;
    }
    return false;
}
