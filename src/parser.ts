import yargsParser from 'yargs-parser';

import {OptionSet, getOptData, option} from './option';
import {CliDeclaration, ResolveCliDeclaration} from './type-logic';
import {handleAllOptions, handleOption} from './pipeline';
import {printReport, printArgumentError, generateHelp, fancyHelpDecorator} from './printer';
import {createKebabAlias, objMap} from './utils';

function checkAliasCollisions(opts: OptionSet) {
    const usedKeys = new Set<string>();

    const check = (str: string) => {
        if (usedKeys.has(str)) {
            throw new Error(`alias collision for "${str}"`); //
        }
        usedKeys.add(str);
    }

    for (const [name, opt] of Object.entries(opts)) {
        check(name);
        getOptData(opt).aliases.forEach(check);
    }

    return usedKeys;
}

function prepareCliDeclaration(decl: CliDeclaration) {
    const {options = {}, _ = option('any')} = decl;
    for (const [name, opt] of Object.entries(options)) {
        const alias = createKebabAlias(name);
        opt.name = name;
        if (alias) {
            opt.alias(alias);
        }
    }
    return checkAliasCollisions(options);
}

function extractOptionsFromYargs(data: any) {
    const copyData = {...data};
    delete copyData.$0;
    delete copyData._;
    return copyData;
}

export function configure<D extends CliDeclaration>(decl: D): {
    parse: (argv: string[] | string) => ResolveCliDeclaration<D>;
    generateHelp: () => string;
} {
    const usedKeys = prepareCliDeclaration(decl);
    const optCfg = objMap(decl.options || {}, item => getOptData(item));

    function parse(argv: string[] | string) {
        const res: ResolveCliDeclaration<D> = {
            _: undefined as any,
            options: {} as any
        };
        const parsed = yargsParser(argv, {
            alias: decl.options && objMap(decl.options, item => getOptData(item).aliases)
        });
        const {report, data} = handleAllOptions(optCfg, extractOptionsFromYargs(parsed), usedKeys);
        res.options = data;
        printReport(report);
        if (decl._) {
            const parsedArgs = (!getOptData(decl._).isArray && parsed._.length === 1) ? parsed._[0] : parsed._;
            const {value, errors} = handleOption(getOptData(decl._), parsedArgs);
            if (errors.length > 0) {
                printArgumentError(errors);
                throw new Error('\nProvided arguments are NOT valid'); //
            }
            res._ = value;
        }
        if (!report.isValid) {
            throw new Error('\nProvided options are NOT valid'); //
        }
        return res;
    }

    return {
        parse,
        generateHelp: () => generateHelp(decl, fancyHelpDecorator)
    };
}

export function cli<D extends CliDeclaration>(decl: D): ResolveCliDeclaration<D> {
    try {
        const {generateHelp, parse} = configure(decl);
        if (process.argv.includes('--help')) {
            console.log(generateHelp());
            process.exit(0);
        }
        return parse(process.argv.slice(2));
    } catch(e) {
        console.error(e.message);
        process.exit(1);
        throw 1;
    }
}
