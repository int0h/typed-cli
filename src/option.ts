import { Validator, Preprocessor, makeValidator, BooleanValidator } from './pipeline';
import { allIssues } from './errors';
import { Completion } from './completer';

type TypeMap = {
    number: number;
    int: number;
    string: string;
    boolean: boolean;
    any: number | string | boolean;
}

/** @hidden */
export type Types = keyof TypeMap;

/** @hidden */
export type ResolveType<T extends Types> = TypeMap[T];

const intrinsicPreProcessors: Partial<Record<Types, Preprocessor>> = {
    string: s => typeof s === 'number' ? String(s) : s
}

const intrinsicValidators: Partial<Record<Types, BooleanValidator<any>>> = {
    number: n => n * 1 === n,
    int: n => Number.isInteger(n),
    string: s => typeof s === 'string',
    boolean: b => typeof b === 'boolean'
}

const optionDataKey = Symbol('__data');

type OptionCompleter = (partial: string) => Completion[];

/** @hidden */
export type OptData<T> = {
    name: string;
    type: Types;
    labelName: string;
    description: string;
    isRequired: boolean;
    aliases: string[];
    isArray: boolean;
    defaultValue?: T;
    isArg?: boolean;
    validators: Validator<any>[];
    prePreprocessors: Preprocessor[];
    postPreprocessors: Preprocessor[];
    completer?: OptionCompleter;
};

/** @hidden */
export function getOptData(opt: Option<any, any, any, any>): OptData<unknown> {
    return opt[optionDataKey];
}

/** @hidden */
export function setOptData(opt: Option<any, any, any, any>, data: OptData<any>): void {
    opt[optionDataKey] = data;
}

/** @hidden */
export function cloneOption<O extends Option<any, any, any, any>>(opt: O): O {
    const oldOpt = opt;
    const oldData = getOptData(oldOpt);
    opt = new Option(oldData.type) as any;
    setOptData(opt, oldData);
    return opt;
}

/** @hidden */
export function updateOptData<O extends Option<any, any, any, any>>(opt: O, data: Partial<OptData<any>>): O {
    return changeOptData(cloneOption(opt), data);
}

/** @hidden */
export function changeOptData<O extends Option<any, any, any, any>>(opt: O, data: Partial<OptData<any>>): O {
    setOptData(opt, {
        ...getOptData(opt),
        ...data
    });
    return opt;
}


/**
 * Defines a new option
 * @param type option data type
 */
export function opt<T extends Types>(type: T): Option<T, false, false, ResolveType<T>> {
    return new Option<T, false, false, ResolveType<T>>(type);
}

/**
 * Option - is a helper class used to configure options.
 * It's used for chained calls such as
 * ```js
 * ... .alias().description().default() ...
 * ```
 */
export class Option<T extends Types, R extends boolean, A extends boolean, RT> {
    /** @hidden */
    name = '';
    /** @hidden */
    [optionDataKey]: OptData<RT> = {
        name: '',
        type: 'any',
        labelName: 'any',
        description: '',
        isRequired: false,
        aliases: [],
        isArray: false,
        defaultValue: undefined,
        validators: [],
        prePreprocessors: [],
        postPreprocessors: [],
    };

    _isRequired!: R;
    _isArray!: A;

    constructor(type: T) {
        this[optionDataKey].type = type;
        this[optionDataKey].labelName = type;
        const intrinsicValidator = intrinsicValidators[type];
        if (intrinsicValidator) {
            changeOptData(this, {
                validators: [
                    (value): void => {
                        if (intrinsicValidator(value)) {
                            return;
                        }
                        throw new allIssues.TypeMismatchError(this[optionDataKey].labelName, typeof value);
                    }
                ]
            });
        }
        const intrinsicPreProcessor = intrinsicPreProcessors[type];
        if (intrinsicPreProcessor) {
            changeOptData(this, {
                prePreprocessors: [intrinsicPreProcessor as Preprocessor]
            })
        }
    }

    /**
     * Allows to create custom type name.
     * Useful for presets, allows to get output like:
     * `expected <MyType> but received <string>`
     * @param name - new label for the type
     */
    label(name: string): Option<T, R, A, RT> {
        return updateOptData(this, {
            labelName: name
        });
    }

    /**
     * Adds one or more aliases to an option.
     * Used to create short aliases such '-a', '-b' etc.
     * Could be called multiple times, the alias lists will be
     * concatenated.
     * @param aliases - alias list
     */
    alias(...aliases: string[]): Option<T, R, A, RT> {
        return updateOptData(this, {
            aliases: this[optionDataKey].aliases.concat(aliases)
        });
    }

    /**
     * Sets the completer for the option.
     * A completer is a function to be called when
     * shell completion is computed for an option.
     * See 'oneOf' preset source code for usage.
     * @param completer - completer function
     */
    completer(completer: OptionCompleter): Option<T, R, A, RT> {
        return updateOptData(this, {
            completer
        });
    }

    /**
     * Sets the description of the option that is
     * printed with the rest of the help when '--help' flag
     * is provided.
     * @param text - description string
     */
    description(text: string): Option<T, R, A, RT> {
        return updateOptData(this, {
            description: text
        });
    }

    /**
     * Marks the option as required.
     * Required options must be provided. Otherwise
     * the program will quit with non-zero code and print an error.
     * On the other hand required options always accessible so
     * there is no need to check if they are presented i.e.
     * no `options.foo && options.foo.toString()` checks.
     */
    required(): Option<T, true, A, RT> {
        return updateOptData(this, {
            isRequired: true
        }) as any;
    }

    /**
     * Marks the option as multiple.
     * It allows to pass the same option multiple times.
     * So `-o 1 -o 2 -o 3` will be resolved as `[1, 2, 3]`.
     * *Important:* result will be an array even if only one value
     * was presented (or no value at all)
     * i.e. both `[]` and `[1]` are valid results.
     */
    array(): Option<T, true, true, RT> {
        return updateOptData(this, {
            isArray: true
        }) as any;
    }

    /**
     * Sets the default value for an option.
     * Option will be resolved to that value if no value was present.
     * Also removes `nullability` from the result type like `required()` does.
     * @param value - default value of the option
     */
    default(value: RT): Option<T, true, A, RT> {
        return updateOptData(this, {
            isRequired: false,
            defaultValue: value,
        }) as any;
    }

    /**
     * Adds custom validation function.
     * @param errorMsg - error message to be shown if the result of validate function is falsy
     * @param validator - a validate function that takes a value and return `true` for valid
     * values and `false` otherwise
     */
    validate(errorMsg: string, validator: BooleanValidator<RT>): Option<T, R, A, RT>;
    /**
     * Adds custom validation function.
     * @param validator - a validate function that will throw an error if the provided value is invalid
     */
    validate(validator: Validator<RT>): Option<T, R, A, RT>;
    validate(...args: any[]): Option<T, R, A, RT> {
        const validator = args.length === 2
            ? makeValidator(args[0], args[1])
            : args[0];
        return updateOptData(this, {
            validators: getOptData(this).validators.concat(validator),
        });
    }


    /**
     * Adds a pre-/post- processor. A processor is a function
     * that takes a value and return a new one. Each processor gets
     * the result from the previous one and passes new value to the next one.
     * So it looks like this: `argv -> proc1 -> proc2 -> result data`
     *
     * Preprocessors run from raw input and before validation, while
     * postprocessors run after validation and can produce either __invalid__ or non-string-like
     * values such as objects, functions etc.
     *
     * So the full data pipeline looks like this:
     * `argv -> preprocessors -> validators -> postprocessors -> result data`
     * @param phase - determine whether it will be a **pre**processor or **post** processor
     * @param fn - a processor function
     */
    process(phase: 'pre', fn: Preprocessor<any, ResolveType<T>>): Option<T, R, A, RT>;
    process<FR>(phase: 'post', fn: Preprocessor<ResolveType<T>, FR>): Option<T, R, A, FR>;
    process(phase: 'pre' | 'post', fn: Preprocessor): Option<T, R, A, RT> {
        switch (phase) {
            case 'pre':
                return updateOptData(this, {
                    prePreprocessors: getOptData(this).prePreprocessors.concat(fn),
                });
            case 'post':
                return updateOptData(this, {
                    postPreprocessors: getOptData(this).postPreprocessors.concat(fn),
                });
            default:
                throw new Error(`invalid phase <${phase}>`);
        }
    }
}

export type OptionSet = Record<string, Option<any, boolean, boolean, any>>;
