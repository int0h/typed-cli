import { allIssues } from "../errors";
import { opt } from "../option";
import { Validator } from "../pipeline";

const validateWrap = (intrinsicValidator: (value: any) => boolean): Validator<any> => (value, ctx) => {
    if (!intrinsicValidator(value)) {
        throw new allIssues.TypeMismatchError(ctx.typeName, typeof value);
    }
}
const string = opt<string>('string')
    .process('pre', s => typeof s === 'number' ? String(s) : s)
    .validate(validateWrap(s => typeof s === 'string'));

const number = opt<number>('number')
    .validate(validateWrap(n => typeof n === 'number'));

const boolean = opt<boolean>('boolean')
    .validate(validateWrap(b => typeof b === 'boolean'));

const int = opt<number>('int')
    .validate(validateWrap(n => Number.isInteger(n)));

export const option = {
    string,
    number,
    boolean,
    int,
};
