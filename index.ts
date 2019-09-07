import yargsParser from 'yargs-parser';
import chalk from 'chalk';

type TypeMap = {
    number: number;
    int: number;
    string: string;
    boolean: boolean;
    any: number | string | boolean;
}

type Types = keyof TypeMap;

type ResolveType<T extends Types> = TypeMap[T];

type Validator<T> = (value: T) => void;

type BooleanValidator<T> = (value: T) => boolean;

function makeValidator<T>(errorMsg: string, fn: (value: T) => boolean): Validator<T> {
    return (value: any) => {
        if (fn(value)) {
            return;
        }
        throw new Error(errorMsg);
    }
}

type Preprocessor<I = any, O = any> = (value: I) => O;

const intrinsicPreProcessors: Partial<Record<Types, Preprocessor>> = {
    string: s => typeof s === 'number' ? String(s) : s
}

const intrinsicValidators: Partial<Record<Types, BooleanValidator<any>>> = {
    number: n => n * 1 === n,
    int: n => Number.isInteger(n),
    string: s => typeof s === 'string',
    boolean: b => typeof b === 'boolean'
}

class Option<T extends Types, R extends boolean, A extends boolean> {
    private type: Types;
    private description: string = '';
    private isRequired: boolean = false;
    private aliases: string[] = [];
    private isArray: boolean = false;
    private defaultValue?: ResolveType<T>;
    private validators: Validator<any>[] = [];
    private prePreprocessors: Preprocessor[] = [];
    private postPreprocessors: Preprocessor[] = [];

    private _isRequired!: R;
    private _isArray!: A;

    constructor(type: T) {
        this.type = type;
        const intrinsicValidator = intrinsicValidators[type];
        if (intrinsicValidator) {
            this.validate('type error', value => {
                if (intrinsicValidator(value)) {
                    return true;
                }
                throw new Error(`expected <${type}>, but received <${typeof value}>`);
            });
        }
        const intrinsicPreProcessor = intrinsicPreProcessors[type];
        if (intrinsicPreProcessor) {
            this.process('pre', intrinsicPreProcessor as Preprocessor);
        }
    }

    alias(...aliases: string[]) {
        this.aliases = this.aliases.concat(aliases);
        return this;
    }

    desc(text: string) {
        this.description = text;
        return this;
    }

    required() {
        this.isRequired = true;
        return this as any as Option<T, true, A>;
    }

    array() {
        this.isArray = true;
        return this as any as Option<T, R, true>;
    }

    default(value: ResolveType<T>) {
        this.defaultValue = value;
        this.isRequired = false;
        this.process('post', v => v === undefined ? value : v);
        return this as any as Option<T, true, A>;
    }

    validate(errorMsg: string, validator: BooleanValidator<T>): Option<T, R, A>;
    validate(validator: Validator<T>): Option<T, R, A>;
    validate(...args: any[]): Option<T, R, A> {
        const validator = args.length === 2
            ? makeValidator(args[0], args[1])
            : args[0];
        this.validators.push(validator);
        return this;
    }


    process(phase: 'pre', fn: Preprocessor<any, ResolveType<T>>): Option<T, R, A>;
    process(phase: 'post', fn: Preprocessor<ResolveType<T>, ResolveType<T>>): Option<T, R, A>;
    process(phase: 'pre' | 'post', fn: Preprocessor): Option<T, R, A> {
        switch (phase) {
            case 'pre': this.prePreprocessors.push(fn); break;
            case 'post': this.postPreprocessors.push(fn); break;
            default:
                throw new Error(`unknown phase "${phase}"`);
        }
        return this;
    }

    __getData() {
        return {
            type: this.type,
            description: this.description,
            isRequired: this.isRequired,
            aliases: this.aliases,
            isArray: this.isArray,
            defaultValue: this.defaultValue,
            validators: this.validators,
            prePreprocessors: this.prePreprocessors,
            postPreprocessors: this.postPreprocessors,
        }
    }
}

function runValidator(validator: Validator<any>, value: any): string | undefined {
    let msg: string | undefined = undefined;
    try {
        validator(value);
    } catch(e) {
        msg = e.message;
    }
    return msg;
}

type ValidationReport = {
    isValid: boolean;
    items: {
        [key: string]: {
            errors: string[];
        }
    };
    warnings: string[];
}

function validateOption(optCfg: Option<any, any, any>, value: any): string[] {
    const errors: string[] = [];
    if (value === undefined) {
        return optCfg.__getData().isRequired
            ? ['required']
            : [];
    }
    const validators = optCfg.__getData().validators;
    validators.forEach(validator => {
        const error = runValidator(validator, value);
        if (error) {
            errors.push(error);
        }
    });
    return errors;
}

function runPreprocessors(phase: 'pre' | 'post', optCfg: Option<any, any, any>, value: any): any {
    const preprocessors = phase === 'pre'
        ? optCfg.__getData().prePreprocessors
        : optCfg.__getData().postPreprocessors;
    preprocessors.forEach(fn => {
        value = fn(value);
    });
    return value;
}

function handleOption(optCfg: Option<any, any, any>, value: any, iterating?: boolean): {value: any, errors: string[]} {
    if (optCfg.__getData().isArray && !iterating) {
        const arrValue = ([] as any[]).concat(value);
        let errorsArr: string[] = [];
        let valueArr: string[] = [];
        arrValue.forEach(v => {
            const res = handleOption(optCfg, v, true);
            errorsArr = errorsArr.concat(res.errors);
            valueArr = valueArr.concat(res.value);
        });
        return {errors: errorsArr, value: valueArr};
    }
    value = runPreprocessors('pre', optCfg, value);
    const errors = validateOption(optCfg, value);
    value = runPreprocessors('post', optCfg, value);
    return {errors, value};
}

function handleAllOptions(optSchema: OptionSet, rawData: Record<string, any>, usedKeys: Set<string>): {data: any, report: ValidationReport} {
    const report: ValidationReport = {
        isValid: true,
        items: {},
        warnings: []
    };
    const data: any = {};
    const dataCopy = {...rawData};
    for (const [key, optCfg] of Object.entries(optSchema)) {
        const dataValue = dataCopy[key];
        delete dataCopy[key];
        const {value, errors} = handleOption(optCfg, dataValue);
        if (errors.length > 0) {
            report.isValid = false;
        }
        report.items[key] = {errors};
        data[key] = value;
    }
    report.warnings = Object.keys(dataCopy)
        .filter(key => !usedKeys.has(key))
        .map(key => `unknown option "${key}"`);
    return {data, report};
}

function printOptionError(title: string, errors: string[]) {
    console.error(title);
    for (const err of errors) {
        console.error(`\t ${chalk.red('>')} ` + err);
    }
}

function printArgumentError(errors: string[]) {
    printOptionError(`❌  ` + chalk.redBright(`arguments are invalid`), errors);
}

function printReport(report: ValidationReport) {
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

type OptionSet = Record<string, Option<any, boolean, boolean>>;

export type GetPropertiyNames<T extends Object, P> = {
    [K in keyof T]: T[K] extends P ? K : never;
}[keyof T];

export type GetProperties<T extends Object, P> = Pick<T, GetPropertiyNames<T, P>>;

type PickRequiredOpts<O extends OptionSet> = GetProperties<O, Option<any, true, boolean> | Option<any, boolean, true>>;
type PickNonRequiredOpts<O extends OptionSet> = GetProperties<O, Option<any, false, boolean>>;

type ResolveOptionType<O extends Option<Types, boolean, boolean>> = O extends Option<infer T, boolean, boolean>
    ? ResolveType<T>
    : never;

type ResolveOption<O extends Option<Types, boolean, boolean>> = O extends Option<Types, boolean, true>
    ? Array<ResolveOptionType<O>>
    : ResolveOptionType<O>;

type ResolveOptionSet<O extends OptionSet> = {
    [key in keyof PickRequiredOpts<O>]: ResolveOption<PickRequiredOpts<O>[key]>;
} & {
    [key in keyof PickNonRequiredOpts<O>]?: ResolveOption<PickNonRequiredOpts<O>[key]>;
}

type CliDeclaration = {
    options?: OptionSet;
    description?: string;
    _?: Option<Types, boolean, boolean>;
}

const aliasStorage = new WeakMap<any, Set<string>[]>();

type ResolveCliDeclaration<D extends CliDeclaration> = {
    options: D['options'] extends OptionSet ? ResolveOptionSet<D['options']> : {};
    _: D['_'] extends Option<any, infer R, any>
        ? R extends true
            ? ResolveOption<D['_']>
            : ResolveOption<D['_']> | undefined
        : undefined;
}

function createKebabAlias(str: string): string | undefined {
    if (!/[a-z][A-Z]/.test(str)) {
        return;
    }
    return str.replace(/[a-z][A-Z]/g, subStr => subStr.split('').join('-')).toLowerCase();
}

function checkAliasCollisions(opts: OptionSet) {
    const usedKeys = new Set<string>();

    const check = (str: string) => {
        if (usedKeys.has(str)) {
            throw new Error(`alias collision for "${str}"`);
        }
        usedKeys.add(str);
    }

    for (const [name, opt] of Object.entries(opts)) {
        check(name);
        opt.__getData().aliases.forEach(check);
    }

    return usedKeys;
}

function prepareCliDeclaration(decl: CliDeclaration) {
    const {options = {}, description = '', _ = option('any')} = decl;
    for (const [name, opt] of Object.entries(options)) {
        const alias = createKebabAlias(name);
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

function objMap<T, R>(obj: Record<string, T>, fn: (item: T) => R): Record<string, R> {
    const res: any = {};
    for (const [name, value] of Object.entries(obj)) {
        res[name] = fn(value);
    }
    return res;
}

function parse<D extends CliDeclaration>(decl: D, argv: string[]): ResolveCliDeclaration<D> {
    const res: ResolveCliDeclaration<D> = {
        _: undefined as any,
        options: {} as any
    };

    const usedKeys = prepareCliDeclaration(decl);
    const parsed = yargsParser(argv, {
        alias: decl.options && objMap(decl.options, item => item.__getData().aliases)
    });
    const {report, data} = handleAllOptions(decl.options || {}, extractOptionsFromYargs(parsed), usedKeys);
    res.options = data;
    printReport(report);
    if (decl._) {
        const parsedArgs = (!decl._.__getData().isArray && parsed._.length === 1) ? parsed._[0] : parsed._;
        const {value, errors} = handleOption(decl._, parsedArgs);
        if (errors.length > 0) {
            printArgumentError(errors);
            throw new Error('\nProvided arguments are NOT valid');
        }
        res._ = value;
    }
    if (!report.isValid) {
        throw new Error('\nProvided options are NOT valid');
    }
    return res;
}

function cli<D extends CliDeclaration>(decl: D): ResolveCliDeclaration<D> {
    try {
        return parse(decl, process.argv.slice(2));
    } catch(e) {
        console.error(e.message);
        process.exit(1);
        throw 1;
    }
}

// declareCli.foo = 13;

function option<T extends Types>(type: T) {
    return new Option<T, false, false>(type);
}

const data = cli({
    description: `Blah blah`,
    options: {
        taskerFilePath: option('int').array().required().alias('p').desc('a path to a task file'),
        cleanLogs: option('boolean').default(false).alias('c').desc('cleans logs before start'),
        logsPath: option('string').alias('l').desc('cleans logs before start')
    },
    _: option('number').required().array()
})

console.log('Ok');
console.log(data);

// cli.

const argv = yargsParser(process.argv, {

})

// console.log(argv);
// console.log(process.argv);