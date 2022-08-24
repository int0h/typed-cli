import test from 'tape';

import { getOptData } from '../../src/option';
import { option } from '../../';

function omit(obj: any, keys: string[]) {
    const clone = {...obj};
    keys.forEach(k => delete clone[k]);
    return clone;
}

test('option basic', t => {
    t.deepEqual(omit(getOptData(option.string), ['prePreprocessors', 'postPreprocessors', 'validators']), {
        name: '',
        type: 'string',
        labelName: 'string',
        description: '',
        isRequired: false,
        aliases: [],
        isArray: false,
        defaultValue: undefined,
    });
    t.end();
});

test('option basic', t => {
    const preFn = (): void => {};
    const postFn = (): void => {};
    const valFn = (): void => {};

    const opt = option.number
        .alias('alias1', 'alias2')
        .array()
        .default(123)
        .description('description')
        .label('label')
        .process('pre', preFn as any)
        .process('post', postFn as any)
        .required()
        .validate(valFn);

    const data = getOptData(opt);
    //@ts-ignore
    delete data.postPreprocessors;
    t.deepEqual(omit(data, ['prePreprocessors', 'postPreprocessors', 'validators']), {
        name: '',
        type: 'number',
        labelName: 'label',
        description: 'description',
        isRequired: true,
        aliases: ['alias1', 'alias2'],
        isArray: true,
        defaultValue: 123,
    });
    t.end();
});

test('declaration validation', t => {
    t.throws(() => {
        option.string.process('blah' as any, () => {});
    });
    t.end();
});
