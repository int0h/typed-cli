import test from 'tape';

import { option, getOptData } from '../../src/option';

test('option basic', t => {
    t.deepEqual(getOptData(option('any')), {
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
        postPreprocessors: []
    });
    t.end();
});

test('option basic', t => {
    const preFn = (): void => {};
    const postFn = (): void => {};
    const valFn = (): void => {};

    const opt = option('any')
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
    delete data.postPreprocessors;
    t.deepEqual(data, {
        name: '',
        type: 'any',
        labelName: 'label',
        description: 'description',
        isRequired: true,
        aliases: ['alias1', 'alias2'],
        isArray: true,
        defaultValue: 123,
        validators: [valFn],
        prePreprocessors: [preFn],
    });
    t.end();
});

test('declaration validation', t => {
    t.throws(() => {
        option('any').process('blah' as any, () => {});
    });
    t.end();
});
