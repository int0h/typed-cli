import { Report, Issue, combineIssues, isError } from './report';
import { allIssues } from './errors';
import inquirer from 'inquirer';
import { OptData } from './option';

export type Validator<T> = (value: T) => void;

export type BooleanValidator<T> = (value: T) => boolean;

export function makeValidator<T>(errorMsg: string, fn: (value: T) => boolean): Validator<T> {
    return (value: any): void => {
        if (fn(value)) {
            return;
        }
        throw new Error(errorMsg);
    }
}

export type Preprocessor<I = any, O = any> = (value: I) => O;

function runValidator(validator: Validator<any>, value: any): undefined | Error {
    try {
        validator(value);
    } catch(e) {
        return e as any;
    }
}

interface ValidationCfg {
    isRequired: boolean;
    validators: Validator<any>[];
    name: string;
    isArg?: boolean;
}

function validateOption(optCfg: ValidationCfg, value: any): Report {
    const issues: Issue[] = [];
    if (value === undefined) {
        if (optCfg.isRequired) {
            return {
                issue: optCfg.isArg
                    ? new allIssues.InvalidArgumentError(value)
                    : new allIssues.InvalidOptionError(optCfg.name, value),
                children: [{
                    issue: new allIssues.EmptyRequiredOptionError(optCfg.name),
                    children: []
                }]
            };
        }
        return {
            issue: null,
            children: []
        };
    }
    const validators = optCfg.validators;
    validators.forEach(validator => {
        const error = runValidator(validator, value);
        if (error) {
            issues.push(error);
        }
    });
    return combineIssues(
        optCfg.isArg
            ? new allIssues.InvalidArgumentError(value)
            : new allIssues.InvalidOptionError(optCfg.name, value)
    , issues);
}

function runPreprocessors(processors: Preprocessor[], value: any): any {
    processors.forEach(fn => {
        value = fn(value);
    });
    return value;
}

interface OptCfg extends ValidationCfg {
    prePreprocessors: Preprocessor[];
    postPreprocessors: Preprocessor[];
    isArray: boolean;
    defaultValue?: any;
    isArg?: boolean;
}

async function handleArrayOption(optCfg: OptData<unknown>, value: any): Promise<{value: any[] | null; report: Report}> {
    value = ([] as any[]).concat(value);
    let issues: Issue[] = [];
    const resValue: any[] = [];
    for (const v of value) {
        const res = await handleOption(optCfg, v, true);
        resValue.push(res.value);
        issues = [...issues, ...res.report.children.map(c => c.issue)];
    };
    const report = combineIssues(new allIssues.InvalidOptionError(optCfg.name, value), issues);
    return {
        report,
        value: isError(report.issue) ? null : resValue
    };
}

class CliPrompt {
    async text(msg: string): Promise<string> {
        const res = await inquirer.prompt([
            {
                name: '_',
                message: msg,
                type: 'input'
            }
        ]);
        return res._;
    }
}

const cliPrompt = new CliPrompt();

async function getOptionInteractively(optCfg: OptData<unknown>): Promise<any> {
    switch (optCfg.type) {
        case 'string':
            return cliPrompt.text(optCfg.name + ':');
    }
}

export async function handleOption(optCfg: OptData<unknown>, value: any, iterating?: boolean): Promise<{value: any; report: Report}> {
    if (optCfg.isArray && !iterating) {
        return handleArrayOption(optCfg, value);
    }
    value = runPreprocessors(optCfg.prePreprocessors, value);
    if (value === undefined) {
        value = await getOptionInteractively(optCfg);
    }
    const report = validateOption(optCfg, value);
    if (isError(report.issue)) {
        return {report, value: null};
    }
    if (!optCfg.isRequired && value === undefined) {
        if (optCfg.defaultValue !== undefined) {
            value = optCfg.defaultValue;
        } else {
            return {report, value};
        }
    }
    value = runPreprocessors(optCfg.postPreprocessors, value);
    return {
        report,
        value
    };
}

export async function handleAllOptions(optSchema: Record<string, OptData<unknown>>, rawData: Record<string, any>, usedKeys: Set<string>): Promise<{data: any; report: Report}> {
    const data: any = {};
    const dataCopy = {...rawData};
    let isValid = true;
    const allReports: Report[] = [];
    for (const key of Object.keys(optSchema).sort()) {
        const optCfg = optSchema[key];
        const dataValue = dataCopy[key];
        delete dataCopy[key];
        const {value, report} = await handleOption(optCfg, dataValue);
        if (isError(report.issue)) {
            isValid = false;
        }
        isError(report.issue) && allReports.push(report);
        data[key] = value;
    }
    const report = {
        issue: isValid ? null : new allIssues.SomeInvalidOptionsError(),
        children: allReports
    };
    const warnings = Object.keys(dataCopy)
        .filter(key => !usedKeys.has(key))
        .map(key => new allIssues.UnknownOptionWarning(key))
        .map(warning => ({
            issue: warning,
            children: []
        }));
    report.children = report.children.concat(warnings);
    if (isError(report.issue)) {
        return {data: null, report};
    }
    return {data, report};
}
