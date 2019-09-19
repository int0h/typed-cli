import yargsParser from 'yargs-parser';

import { OptionSet, getOptData, updateOptData } from './option';
import { CliDeclaration, ResolveCliDeclaration } from './type-logic';
import { handleAllOptions, handleOption } from './pipeline';
import { createKebabAlias, objMap } from './utils';
import { Report, mergeReports, isError } from './report';
import { allIssues } from './errors';

function checkAliasCollisions(opts: OptionSet): Set<string> {
    const usedKeys = new Set<string>();

    const check = (str: string): void => {
        if (usedKeys.has(str)) {
            throw new Error(`alias collision for "${str}"`);
        }
        usedKeys.add(str);
    }

    for (const [name, opt] of Object.entries(opts)) {
        check(name);
        getOptData(opt).aliases.forEach(check);
    }

    return usedKeys;
}

export function prepareCliDeclaration(decl: CliDeclaration): {decl: Required<CliDeclaration>; usedKeys: Set<string>} {
    const resDecl = {...decl};
    resDecl.options = {...(decl.options || {})};
    for (const [name, opt] of Object.entries(resDecl.options)) {
        const alias = createKebabAlias(name);
        let resOpt = updateOptData(opt, {name});
        if (alias) {
            resOpt = updateOptData(resOpt, {
                aliases: [...getOptData(opt).aliases, alias]
            });
        }
        resOpt.name = name;
        resDecl.options[name] = resOpt;
    }
    if (decl._) {
        resDecl._ = updateOptData(decl._, {name: '#argument#', isArg: true})
    }

    const usedKeys = checkAliasCollisions(resDecl.options);
    return {decl: resDecl as Required<CliDeclaration>, usedKeys};
}

function extractOptionsFromYargs(data: any): any {
    const copyData = {...data};
    delete copyData.$0;
    delete copyData._;
    return copyData;
}

export class Parser<D extends CliDeclaration> {
    private optCfg: Record<string, any>;
    private decl: D;
    private usedKeys: Set<string>;

    constructor(decl: D) {
        const {decl: declPrepared, usedKeys} = prepareCliDeclaration(decl);
        this.usedKeys = usedKeys;
        this.decl = declPrepared as D;
        this.optCfg = objMap(declPrepared.options, item => getOptData(item));
    }

    private parseOptions(parsed: any): {data: any; report: Report} {
        return handleAllOptions(this.optCfg, extractOptionsFromYargs(parsed), this.usedKeys);
    }

    private normalizeArgs(args: any[]): undefined | unknown | unknown[] {
        switch (args.length) {
            case 0:
                return undefined;
            case 1:
                return args[0];
            default:
                return args;
        }
    }

    private parseArguments(parsed: any): {data: any; report: Report} {
        if (this.decl._) {
            const parsedArgs = getOptData(this.decl._).isArray
                ? parsed._
                : this.normalizeArgs(parsed._);
            const {value, report} = handleOption(getOptData(this.decl._), parsedArgs);
            if (isError(report.issue)) {
                return {
                    data: value,
                    report: {
                        issue: new allIssues.IvalidSomeArguemntsError(),
                        children: [report]
                    }
                }
            }
            return {data: value, report};
        }
        return {data: undefined, report: {issue: null, children: []}};
    }

    parse(argv: string[] | string): {report: Report; data: ResolveCliDeclaration<D> | null} {
        const parsed = yargsParser(argv, {
            alias: this.decl.options && objMap(this.decl.options, item => getOptData(item).aliases),
            boolean: Object.values(this.decl.options || {})
                .filter(opt => getOptData(opt).type === 'boolean')
                .map(opt => opt.name)
        });
        const {report: optionsReport, data: optionsData} = this.parseOptions(parsed);
        const {report: argumentsReport, data: argumentsData} = this.parseArguments(parsed);
        const report = mergeReports(new allIssues.IvalidInputError, optionsReport, argumentsReport);
        if (isError(report.issue)) {
            return {report, data: null};
        }
        return {
            report,
            data: {
                options: optionsData,
                _: argumentsData
            }
        };
    }
}
