import chalk from 'chalk';

import {ValidationReport} from './pipeline';
import {CliDeclaration} from './type-logic';
import {alignTextMatrix, arrayPartition} from './utils';
import { Option } from './option';

export function printOptionError(title: string, errors: string[]) {
    console.error(title);
    for (const err of errors) {
        console.error(`\t ${chalk.red('>')} ` + err);
    }
}

export function printArgumentError(errors: string[]) {
    printOptionError(`❌  ` + chalk.redBright(`arguments are invalid`), errors);
}

export function printReport(report: ValidationReport) {
    for (const warn of report.warnings) {
        console.warn('⚠️  ' + chalk.yellow(warn));
    }
    for (const [key, item] of Object.entries(report.items)) {
        if (item.errors.length === 0) {
            continue;
        }
        printOptionError(`❌  ` + chalk.redBright(`option " ${key} " is invalid`), item.errors);
    }
}

export type HelpDecorator = (text: string, ctx: 'alias' | 'type' | 'optionality' | 'option-description' | 'title') => string;

export const defaultHelpDecorator = (str: string) => str;

export const fancyHelpDecorator: HelpDecorator = (str, ctx) => {
    switch (ctx) {
        case 'type': return chalk.green(str);
        case 'optionality': return chalk.yellow(str);
        case 'option-description': return chalk.dim(str);
        case 'title': return chalk.underline(str);
        default: return str;
    }
}

function generateOptionDescription(config: CliDeclaration, decorator: HelpDecorator = defaultHelpDecorator): string | undefined {
    const options = config.options;
    if (!options) {
        return;
    }

    const optionTextMatrix: string[][] = [];
    for (const [name, optCgf] of Object.entries(options)) {
        const lineParts: string[] = [];
        const optData = optCgf.__getData();

        // aliases
        const aliases = [name, ...optData.aliases]
            .sort((a, b) => a.length - b.length)
            .map(alias => {
                return alias.length > 1
                    ? '--' + alias
                    : '-' + alias;
            })
            .join(', ');
        lineParts.push(decorator(aliases, 'alias'));

        // type
        lineParts.push(decorator(`<${optData.type}>`, 'type'));

        // optionality
        if (optData.isArray) {
            lineParts.push(decorator('[multiple]', 'optionality'));
        } else if (optData.defaultValue) {
            lineParts.push(decorator(`[=${optData.defaultValue}]`, 'optionality'))
        } else if (!optData.isRequired) {
            lineParts.push(decorator('[optional]', 'optionality'));
        }

        // description
        lineParts.push(decorator('- ' + optData.description, 'option-description'));

        optionTextMatrix.push(lineParts);
    }

    return alignTextMatrix(optionTextMatrix)
        .map(line => '    ' + line.join('  '))
        .join('\n');
}

function findMinialAlias(opt: Option<any, any, any>): string {
    return [opt.name, ...opt.__getData().aliases].sort((a, b) => a.length - b.length)[0];
}

function generateUsage(config: CliDeclaration, decorator: HelpDecorator = defaultHelpDecorator) {
    const options = config.options || {};

    // options:
    const [requiredOpts, optionalOpts] = arrayPartition(Object.values(options), (opt) => {
        return opt.__getData().isRequired;
    })
        .map(opts => {
            const optionStrings: string[] = [];

            const [boolean, rest] = arrayPartition(opts, (opt) => {
                return opt.__getData().type === 'boolean' && findMinialAlias(opt).length === 1;
            });

            const booleanGroup = boolean.map(opt => findMinialAlias(opt)).join('');
            booleanGroup.length > 0 && optionStrings.push('-' + booleanGroup);

            rest.forEach(opt => {
                const alias = findMinialAlias(opt);
                const prefix = alias.length === 1 ? '-' : '--';
                const value = opt.__getData().type === 'boolean'
                    ? ''
                    : ' ' + decorator(`<${opt.__getData().type}>`, 'type');
                optionStrings.push(prefix + alias + value);
            });

            return optionStrings.join(' ');
        });

    // arguments:
    let argText: string | undefined = undefined;
    if (config._) {
        const arg = config._.__getData();
        if (arg.isArray) {
            argText = `[<${arg.type}> <${arg.type}> ...]`;
        } else if (!arg.isRequired) {
            argText = `[<${arg.type}>]`;
        } else {
            argText = `<${arg.type}>`;
        }
    }

    return [
        config.command,
        requiredOpts,
        optionalOpts.length > 0 && ('[' + optionalOpts + ']'),
        argText
    ]
        .filter(Boolean)
        .join(' ');
}

export function generateHelp(config: CliDeclaration, decorator: HelpDecorator = defaultHelpDecorator) {
    const textAbstracts: string[] = [];
    const {description, _} = config;

    description && textAbstracts.push(
        decorator('Description:', 'title')
        + '\n' +
        description
    );

    textAbstracts.push(
        decorator('Usage:', 'title')
        + '\n    ' +
        generateUsage(config, decorator)
    );

    const optDecription = generateOptionDescription(config, decorator);
    optDecription && textAbstracts.push(
        decorator('Options:', 'title')
        + '\n' +
        optDecription
    );

    return textAbstracts.join('\n\n');
}
