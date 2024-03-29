import test from 'tape';

import { Parser, option } from '../..';
import { validateReport } from './pipeline';
import { allIssues } from '../../src/errors';
import { isError } from '../../src/report';

test('every option type', t => {
    const parser = new Parser({
        options: {
            boolean: option.boolean,
            int: option.int,
            number: option.number,
            string: option.string,
        }
    });

    const {data, report} = parser.parse('--int 12.23 --number qwe --string', {});

    t.equal(data, null);

    validateReport(report, {
        issue: [allIssues.IvalidInputError, {}],
        children: [
            {issue: [allIssues.IvalidOptionError, {optionName: 'int', value: 12.23}], children: [
                {issue: [allIssues.TypeMismatchError, {}], children: []}
            ]},
            {issue: [allIssues.IvalidOptionError, {optionName: 'number', value: 'qwe'}], children: [
                {issue: [allIssues.TypeMismatchError, {}], children: []}
            ]},
            {issue: [allIssues.IvalidOptionError, {optionName: 'string', value: true}], children: [
                {issue: [allIssues.TypeMismatchError, {}], children: []}
            ]},
        ]
    });

    t.end();
});

test('parsing valid data', t => {
    const parser = new Parser({
        options: {
            boolean: option.boolean,
            int: option.int,
            number: option.number,
            string: option.string,
        }
    });

    const {data, report} = parser.parse('--int 12 --boolean --number 123 --string asd', {});

    t.equal(report.children.length, 0);
    t.deepEqual(data!.options, {
        boolean: true,
        int: 12,
        number: 123,
        string: 'asd'
    });

    t.end();
});

test('parsing ivalid arguments', t => {
    const parser = new Parser({
        _: option.int
    });

    const {data, report} = parser.parse('asd', {});

    t.equal(data, null);

    validateReport(report, {
        issue: [allIssues.IvalidInputError, {}],
        children: [
            {issue: [allIssues.IvalidArguemntError, {value: 'asd'}], children: [
                {issue: [allIssues.TypeMismatchError, {}], children: []}
            ]}
        ]
    });

    t.end();
});

test('empty required argument', t => {
    const parser = new Parser({
        _: option.int.required()
    });

    const {data, report} = parser.parse('', {});

    t.equal(data, null);

    validateReport(report, {
        issue: [allIssues.IvalidInputError, {}],
        children: [
            {issue: [allIssues.IvalidArguemntError, {value: undefined}], children: [
                {issue: [allIssues.EmptyRequiredOptionError, {}], children: []}
            ]}
        ]
    });

    t.end();
});

test('alias collision detection', t => {
    t.throws(() => {
        new Parser({
            options: {
                a: option.any,
                b: option.any.alias('a')
            }
        });
    });

    t.throws(() => {
        new Parser({
            options: {
                someVar: option.any,
                'some-var': option.any
            }
        });
    }, 'kebab alias collision check');

    t.end();
});

test('passing array for non-array option', t => {
    const parser = new Parser({
        _: option.int.required()
    });

    const {data, report} = parser.parse('1 2 3', {});

    t.equal(data, null);

    validateReport(report, {
        issue: [allIssues.IvalidInputError, {}],
        children: [
            {issue: [allIssues.TooManyArgumentsError, {}], children: []}
        ]
    });

    t.end();
});

test('parsing valid array of arguments', t => {
    const parser = new Parser({
        _: option.int.array()
    });

    const {data, report} = parser.parse('1 2 3', {});

    t.deepEqual(data!._, [1, 2, 3]);

    t.false(isError(report.issue));

    t.end();
});

test('parsing one valid arguments', t => {
    const parser = new Parser({
        _: option.int
    });

    const {data, report} = parser.parse('1', {});

    t.deepEqual(data!._, 1);

    t.false(isError(report.issue));

    t.end();
});

test('parsing one argument when multiple supported', t => {
    const parser = new Parser({
        _: option.int.array()
    });

    const {data, report} = parser.parse('1', {});

    t.deepEqual(data!._ as number[], [1]);

    t.false(isError(report.issue));

    t.end();
});

test('parsing from ENV', t => {
    const parser = new Parser({
        useEnv: true,
        options: {
            foo: option.int.array()
        }
    });

    const {data, report} = parser.parse('', {FOO: '1'});

    t.deepEqual(data?.options.foo as number[], [1]);

    t.false(isError(report.issue));

    t.end();
});

test('parsing from ENV: mutli-word', t => {
    const parser = new Parser({
        useEnv: true,
        options: {
            envOpt: option.int.array()
        }
    });

    const {data, report} = parser.parse('', {ENV_OPT: '1'});

    t.deepEqual(data?.options.envOpt as number[], [1]);

    t.false(isError(report.issue));

    t.end();
});

test('parsing from ENV: name as prefix by default', t => {
    const parser = new Parser({
        useEnv: true,
        name: 'program',
        options: {
            envOpt: option.int.array()
        }
    });

    const {data, report} = parser.parse('', {PROGRAM_ENV_OPT: '1'});

    t.deepEqual(data?.options.envOpt as number[], [1]);

    t.false(isError(report.issue));

    t.end();
});
