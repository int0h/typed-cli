import test from 'tape';

import {option, getOptData} from '../src/option';
import {handleAllOptions, handleOption} from '../src/pipeline';

test('handleOption', t => {
    const opt = option('int')
        .process('pre', i => Math.abs(i))
        .validate('option is bad', i => i < 256)
        .process('post', i => i / 256)
        .process('post', i => i * 2 - 1);

    const {value, errors} = handleOption(getOptData(opt), 128);
    t.equal(value, 0);
    t.deepEqual(errors, []);
    t.end();
});

test('handleAllOptions', t => {
    const opt1 = option('int')
        .process('pre', i => Math.abs(i))
        .validate('option is bad', i => i < 256)
        .process('post', i => i / 256)
        .process('post', i => i * 2 - 1);

    const opt2 = option('string')
        .default('abc');

    const {data, report} = handleAllOptions({
        opt1: getOptData(opt1),
        opt2: getOptData(opt2)
    }, {opt1: 128}, new Set() as any);

    t.deepEqual(data, {opt1: 0, opt2: 'abc'});
    t.end();
});

test('handleArrayOption', t => {
    const opt = option('int')
        .process('pre', i => Math.abs(i))
        .validate('option is bad', i => i < 256)
        .process('post', i => i / 255)
        .process('post', i => i * 2 - 1)
        .process('post', i => Math.round(i * 100) / 100)
        .array();

    const {value, errors} = handleOption(getOptData(opt), [0, 128, 255]);
    t.deepEqual(value, [-1, 0, 1]);
    t.deepEqual(errors, []);
    t.end();
});

test('invalid options', t => {
    const opt1 = option('int')
        .validate('option is bad', i => i < 256)
        .process('post', i => i / 256)
        .process('post', i => i * 2 - 1);

    const opt2 = option('string')
        .default('abc');

    const {data, report} = handleAllOptions({
        opt1: getOptData(opt1),
        opt2: getOptData(opt2)
    }, {opt1: false, opt2: false, opt3: false}, new Set() as any);

    t.true(report.items.opt1.errors.length > 0);
    t.true(report.items.opt2.errors.length > 0);
    t.true(report.warnings.length > 0);
    t.true(!report.isValid);
    t.end();
});
