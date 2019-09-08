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

function runValidator(validator: Validator<any>, value: any): string | undefined {
    let msg: string | undefined = undefined;
    try {
        validator(value);
    } catch(e) {
        msg = e.message;
    }
    return msg;
}

export type ValidationReport = {
    isValid: boolean;
    items: {
        [key: string]: {
            errors: string[];
        }
    };
    warnings: string[];
}

interface ValidationCfg {
    isRequired: boolean;
    validators: Validator<any>[];
}

function validateOption(optCfg: ValidationCfg, value: any): string[] {
    const errors: string[] = [];
    if (value === undefined) {
        return optCfg.isRequired
            ? ['required']
            : [];
    }
    const validators = optCfg.validators;
    validators.forEach(validator => {
        const error = runValidator(validator, value);
        if (error) {
            errors.push(error);
        }
    });
    return errors;
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
}

export function handleOption(optCfg: OptCfg, value: any, iterating?: boolean): {value: any, errors: string[]} {
    if (optCfg.isArray && !iterating) {
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
    value = runPreprocessors(optCfg.prePreprocessors, value);
    const errors = validateOption(optCfg, value);
    if (errors.length > 0) {
        return {errors, value};
    }
    if (!optCfg.isRequired && value === undefined) {
        return {errors, value};
    }
    value = runPreprocessors(optCfg.postPreprocessors, value);
    return {errors, value};
}

export function handleAllOptions(optSchema: Record<string, OptCfg>, rawData: Record<string, any>, usedKeys: Set<string>): {data: any, report: ValidationReport} {
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
