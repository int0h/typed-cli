import {Locale} from './i18n';
import {TextDecorator} from './decorator';
import {Report, isError} from './report';
import {CliDeclaration} from './type-logic';
import { getOptData, Option } from './option';
import { alignTextMatrix, arrayPartition, tabText } from './utils';
import { BaseError, BaseWarning } from './errors';
import { prepareCliDeclaration } from './parser';

function findMinialAlias(opt: Option<any, any, any, any>): string {
    return [opt.name, ...getOptData(opt).aliases].sort((a, b) => a.length - b.length)[0];
}

export class Printer {
    private locale: Locale;
    private decorator: TextDecorator;

    constructor (locale: Locale, decorator: TextDecorator) {
        this.locale = locale;
        this.decorator = decorator;
    }

    private generateOptionDescription(config: Required<CliDeclaration>): string | undefined {
        const d = this.decorator;
        const l = this.locale;

        const options = config.options;

        const optionTextMatrix: string[][] = [];
        for (const [name, optCgf] of Object.entries(options)) {
            const lineParts: string[] = [];
            const optData = getOptData(optCgf);

            // aliases
            const aliases = [name, ...optData.aliases]
                .sort((a, b) => a.length - b.length)
                .map(alias => {
                    return alias.length > 1
                        ? '--' + alias
                        : '-' + alias;
                })
                .join(', ');
            lineParts.push(d.alias(aliases));

            // type
            lineParts.push(d.type(`<${optData.labelName}>`));

            // optionality
            if (optData.isArray) {
                lineParts.push(d.multiple(`[${l.texts.opt_multile(d)}]`));
            } else if (optData.defaultValue) {
                lineParts.push(d.optional(`[=${optData.defaultValue}]`));
            } else if (!optData.isRequired) {
                lineParts.push(d.optional(`[${l.texts.opt_optional(d)}]`));
            } else {
                lineParts.push(d.required(`[${l.texts.opt_required(d)}]`));
            }

            // description
            lineParts.push(d.optionDescription('- ' + optData.description));

            optionTextMatrix.push(lineParts);
        }

        return alignTextMatrix(optionTextMatrix)
            .map(line => '    ' + line.join('  '))
            .join('\n');
    }

    private generateUsage(config: Required<CliDeclaration>) {
        const d = this.decorator;
        const l = this.locale;

        const options = config.options;

        // options:
        const [requiredOpts, optionalOpts] = arrayPartition(Object.values(options), (opt) => {
            return getOptData(opt).isRequired;
        })
            .map(opts => {
                const optionStrings: string[] = [];

                const [boolean, rest] = arrayPartition(opts, (opt) => {
                    return getOptData(opt).labelName === 'boolean' && findMinialAlias(opt).length === 1;
                });

                const booleanGroup = boolean.map(opt => findMinialAlias(opt)).join('');
                booleanGroup.length > 0 && optionStrings.push(d.usageOption('-' + booleanGroup));

                rest.forEach(opt => {
                    const alias = findMinialAlias(opt);
                    const prefix = alias.length === 1 ? '-' : '--';
                    const value = getOptData(opt).labelName === 'boolean'
                        ? ''
                        : ' ' + d.type(`<${getOptData(opt).labelName}>`);
                    optionStrings.push(d.usageOption(prefix + alias) + value);
                });

                return optionStrings.join(' ');
            });

        // arguments:
        let argText: string | undefined = undefined;
        if (config._) {
            const arg = getOptData(config._);
            const argType = d.type(`<${arg.labelName}>`);
            if (arg.isArray) {
                argText = `[${argType} ${argType} ...]`;
            } else if (!arg.isRequired) {
                argText = `[${argType}]`;
            } else {
                argText = argType;
            }
        }

        return [
            config.command && d.command(config.command),
            requiredOpts,
            optionalOpts.length > 0 && ('[' + optionalOpts + ']'),
            argText
        ]
            .filter(Boolean)
            .join(' ');
    }

    generateHelp(decl: CliDeclaration): string {
        decl = prepareCliDeclaration(decl).decl;

        const d = this.decorator;
        const l = this.locale;

        const textAbstracts: string[] = [];
        const {description, _} = decl;

        description && textAbstracts.push(
            d.title(l.texts.title_description(d))
            + '\n' +
            description
        );

        textAbstracts.push(
            d.title(l.texts.title_usage(d))
            + '\n    ' +
            this.generateUsage(decl as Required<CliDeclaration>)
        );

        const optDecription = this.generateOptionDescription(decl as Required<CliDeclaration>);
        optDecription && textAbstracts.push(
            d.title(l.texts.title_options(d))
            + '\n' +
            optDecription
        );

        return textAbstracts
            .join('\n\n')
            .replace(/[\ \t]+\n/g, '\n');
    }

    private printReportLayer(report: Report, level: number) {
        const d = this.decorator;
        const l = this.locale;

        let text = '';

        if (report.issue instanceof BaseError || report.issue instanceof BaseWarning) {
            text += l.issues[report.issue.className](report.issue as any, d);
        } else {
            if ((report.issue as any).stringify) {
                text += (report.issue as any).stringify(l.code, d);
            } else {
                text += (report.issue as Error).message;
            }
        }

        if (level === 0) {
            text = isError(report.issue)
                ? d.errorLine(text)
                : d.warningLine(text);
        }

        const childText: string = report.children
            .map(childReport => this.printReportLayer(childReport, level + 1))
            .join('\n');

        return childText.trim() !== ''
            ? [text, tabText(childText, '    - ')].join('\n')
            : text;
    }

    stringifyReport(report: Report): string {
        return isError(report.issue)
            ? report.children
                .map(child => this.printReportLayer(child, 0))
                .join('\n')
            : '';
    }
}
