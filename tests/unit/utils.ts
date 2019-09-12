import test from 'tape';

import {alignTextMatrix, createKebabAlias, objMap, arrayPartition, tabText} from '../../src/utils';

test('alignTextMatrix', t => {
    t.deepEqual(alignTextMatrix([
        ['1', '123', '12'],
        ['', '12345', '1'],
        ['12345', '12345', '']
    ]), [
        ['1    ', '123  ', '12'],
        ['     ', '12345', '1 '],
        ['12345', '12345', '  ']
    ]);
    t.end();
});

test('createKebabAlias', t => {
    t.equal(createKebabAlias('asd'), undefined);
    t.equal(createKebabAlias('abcAbc'), 'abc-abc');
    t.equal(createKebabAlias('AbcAbc'), 'abc-abc');
    t.end();
});

test('objMap', t => {
    t.deepEqual(objMap({a: 2, b: 3}, i => i ** 2), {a: 4, b: 9});
    t.end();
});

test('arrayPartition', t => {
    t.deepEqual(arrayPartition([1, 2, 3, 4, 5], i => i % 2 === 0), [[2, 4], [1, 3, 5]]);
    t.end();
});

test('tabText', t => {
    t.equal(tabText('abc\ndef', '! '), '! abc\n! def');
    t.end();
});
