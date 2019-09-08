
import {Validator, Preprocessor, makeValidator, BooleanValidator} from './pipeline';

type TypeMap = {
    number: number;
    int: number;
    string: string;
    boolean: boolean;
    any: number | string | boolean;
}

export type Types = keyof TypeMap;

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

export class Option<T extends Types, R extends boolean, A extends boolean> {
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
            this.validate(value => {
                if (intrinsicValidator(value)) {
                    return;
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

export type OptionSet = Record<string, Option<any, boolean, boolean>>;
