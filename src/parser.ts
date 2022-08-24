import yargsParser from 'yargs-parser';

import { getOptData, updateOptData, OptData } from './option';
import { CliDeclaration, ResolveCliDeclaration, OptionSet } from './type-logic';
import { handleAllOptions, handleOption } from './pipeline';
import { createKebabAlias, objMap, uniq } from './utils';
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
                aliases: uniq([...getOptData(opt).aliases, alias])
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

function optNameToEnvName(optName: string) {
    return optName
        .replace(/[A-Z]/g, l => '_' + l)
        .toUpperCase();
}

export class Parser<D extends CliDeclaration> {
    private optCfg: Record<string, OptData<unknown>>;
    private decl: D;
    private usedKeys: Set<string>;
    private envPrefix: string;
    private useEnv: boolean;

    constructor(decl: D) {
        const {decl: declPrepared, usedKeys} = prepareCliDeclaration(decl);
        this.usedKeys = usedKeys;
        this.decl = declPrepared as D;
        this.optCfg = objMap(declPrepared.options, item => getOptData(item));
        this.envPrefix = decl.envPrefix ?? '';
        this.useEnv = decl.useEnv ?? false;
        if (decl.useEnv && decl.envPrefix === undefined && decl.name) {
            this.envPrefix = optNameToEnvName(decl.name) + '_';
        }
    }

    private async parseOptions(parsed: any): Promise<{data: any; report: Report}> {
        return await handleAllOptions(this.optCfg, extractOptionsFromYargs(parsed), this.usedKeys);
    }

    private async parseArguments(parsed: any): Promise<{data: any; report: Report}> {
        if (this.decl._) {
            let parsedArgs = parsed._;

            if (!getOptData(this.decl._).isArray) {
                // if multiple args passed to single argument program
                if (parsedArgs.length > 1) {
                    return {
                        data: undefined,
                        report: {
                            issue: new allIssues.InvalidSomeArgumentsError(),
                            children: [{
                                issue: new allIssues.TooManyArgumentsError(),
                                children: []
                            }]
                        }
                    }
                }
                parsedArgs = parsedArgs[0];
            }

            const {value, report} = await handleOption(getOptData(this.decl._), parsedArgs);
            if (isError(report.issue)) {
                return {
                    data: value,
                    report: {
                        issue: new allIssues.InvalidSomeArgumentsError(),
                        children: [report]
                    }
                }
            }
            return {data: value, report};
        }
        return {data: undefined, report: {issue: null, children: []}};
    }

    private parseEnv(env: Record<string, string | undefined>) {
        if (!this.useEnv) {
            return {};
        }
        const res: Record<string, any> = {};
        Object.keys(this.optCfg).forEach(key => {
            const envKey = this.envPrefix + optNameToEnvName(key);
            if (env[envKey]) {
                switch (this.optCfg[key].type) {
                    case 'number':
                    case 'int':
                        res[key] = Number(env[envKey]!);
                        break;
                    case 'boolean':
                        res[key] = Boolean(env[envKey]!);
                        break;
                    default:
                        res[key] = env[envKey]!;
                }
            }
        });
        return res;
    }

    async parse(argv: string[] | string, env: Record<string, string | undefined>): Promise<{report: Report; data: ResolveCliDeclaration<D> | null}> {
        const parsed = yargsParser(argv, {
            alias: this.decl.options && objMap(this.decl.options, item => getOptData(item).aliases),
            boolean: Object.values(this.decl.options as OptionSet)
                .filter(opt => getOptData(opt).type === 'boolean')
                .map(opt => opt.name)
        });
        const {report: optionsReport, data: optionsData} = await this.parseOptions({...this.parseEnv(env), ...parsed});
        const {report: argumentsReport, data: argumentsData} = await this.parseArguments(parsed);
        const report = mergeReports(new allIssues.InvalidInputError, optionsReport, argumentsReport);
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
