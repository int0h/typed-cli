import {Report, Issue, combineIssues, isError} from './report';
import {allIssues} from './errors';

export type Validator<T> = (value: T) => void;

export type BooleanValidator<T> = (value: T) => boolean;

export function makeValidator<T>(errorMsg: string, fn: (value: T) => boolean): Validator<T> {
    return (value: any) => {
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
        return e;
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
                    ? new allIssues.IvalidArguemntError(value)
                    : new allIssues.IvalidOptionError(optCfg.name, value),
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
            ? new allIssues.IvalidArguemntError(value)
            : new allIssues.IvalidOptionError(optCfg.name, value)
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

function handleArrayOption(optCfg: OptCfg, value: any): {value: any[] | null, report: Report} {
    value = ([] as any[]).concat(value);
    let issues: Issue[] = [];
    const resValue: any[] = [];
    value.forEach((v: any) => {
        const res = handleOption(optCfg, v, true);
        resValue.push(res.value);
        issues = [...issues, ...res.report.children.map(c => c.issue)];
    });
    const report = combineIssues(new allIssues.IvalidOptionError(optCfg.name, value), issues);
    return {
        report,
        value: isError(report.issue) ? null : resValue
    };
}

export function handleOption(optCfg: OptCfg, value: any, iterating?: boolean): {value: any, report: Report} {
    if (optCfg.isArray && !iterating) {
        return handleArrayOption(optCfg, value);
    }
    value = runPreprocessors(optCfg.prePreprocessors, value);
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

export function handleAllOptions(optSchema: Record<string, OptCfg>, rawData: Record<string, any>, usedKeys: Set<string>): {data: any, report: Report} {
    const data: any = {};
    const dataCopy = {...rawData};
    let isValid = true;
    const allReports: Report[] = [];
    for (const key of Object.keys(optSchema).sort()) {
        const optCfg = optSchema[key];
        const dataValue = dataCopy[key];
        delete dataCopy[key];
        const {value, report} = handleOption(optCfg, dataValue);
        if (isError(report.issue)) {
            isValid = false;
        }
        isError(report.issue) && allReports.push(report);
        data[key] = value;
    }
    const report = {
        issue: isValid ? null : new allIssues.SomeIvalidOptionsError(),
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
