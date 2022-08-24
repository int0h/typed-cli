import test from 'tape';

import { option } from '../../';
import { getOptData } from '../../src/option';
import { handleAllOptions, handleOption } from '../../src/pipeline';
import { isError, Report } from '../../src/report';
import { IssueType, allIssues } from '../../src/errors';

test('handleOption', t => {
    const opt = option.int
        .process('pre', i => Math.abs(i))
        .validate('option is bad', i => i < 256)
        .process('post', i => i / 256)
        .process('post', i => i * 2 - 1);

    const {value, report} = handleOption(getOptData(opt), 128);
    t.equal(value, 0);
    t.deepEqual(report.children, []);
    t.end();
});

test('handleAllOptions', t => {
    const opt1 = option.int
        .process('pre', i => Math.abs(i))
        .validate('option is bad', i => i < 256)
        .process('post', i => i / 256)
        .process('post', i => i * 2 - 1);

    const opt2 = option.string
        .default('abc');

    const {data} = handleAllOptions({
        opt1: getOptData(opt1),
        opt2: getOptData(opt2)
    }, {opt1: 128}, new Set() as any);

    t.deepEqual(data, {opt1: 0, opt2: 'abc'});
    t.end();
});

test('handleArrayOption', t => {
    const opt = option.int
        .process('pre', i => Math.abs(i))
        .validate('option is bad', i => i < 256)
        .process('post', i => i / 255)
        .process('post', i => i * 2 - 1)
        .process('post', i => Math.round(i * 100) / 100)
        .array();

    const {value, report} = handleOption(getOptData(opt), [0, 128, 255]);
    t.deepEqual(value, [-1, 0, 1]);
    t.deepEqual(report.children, []);
    t.end();
});

type ReportReference = {
    issue: [new (...args: any[]) => IssueType, Record<string, any>];
    children: ReportReference[];
};

function cheapDeepEqual(v1: any, v2: any): boolean {
    const res = JSON.stringify(v1) === JSON.stringify(v2);
    if (!res) {
        console.error('not equal:', v1, v2);
    }
    return res;
}

export function validateReport(r: Report, ref: ReportReference): void {
    const [IssueClass, shape] = ref.issue;
    if (!(r.issue instanceof (IssueClass as any))) {
        throw new Error('report issue is wrong class');
    }
    for (const key of Object.keys(shape)) {
        if (!cheapDeepEqual((r.issue as any)[key], shape[key])) {
            throw new Error(`report Error.${key} is incorrect`);
        }
    }
    ref.children.forEach((ref, i) => validateReport(r.children[i], ref));
}

test('invalid options', t => {
    const opt1 = option.int
        .validate('option is bad', i => i < 256)
        .process('post', i => i / 256)
        .process('post', i => i * 2 - 1);

    const opt2 = option.string
        .default('abc');

    const {data, report} = handleAllOptions({
        opt1: getOptData(opt1),
        opt2: getOptData(opt2)
    }, {opt1: false, opt2: false, opt3: false}, new Set() as any);

    validateReport(report, {
        issue: [allIssues.SomeInvalidOptionsError, {}],
        children: [
            {
                issue: [allIssues.InvalidOptionError, {value: false}],
                children: [{
                    issue: [allIssues.TypeMismatchError, {expected: 'int', received: 'boolean'}],
                    children: []
                }]
            },
            {
                issue: [allIssues.InvalidOptionError, {value: false}],
                children: [{
                    issue: [allIssues.TypeMismatchError, {expected: 'string', received: 'boolean'}],
                    children: []
                }]
            },
            {
                issue: [allIssues.UnknownOptionWarning, {}],
                children: []
            }
        ]
    })

    t.true(isError(report.issue));
    t.equal(data, null);
    t.end();
});

test('handle strings containing digits only', t => {
    const opt = option.string;

    const res1 = handleOption(getOptData(opt), '123');
    t.deepEqual(res1.value, '123');
    t.deepEqual(res1.report.children, []);

    const res2 = handleOption(getOptData(opt), 123);
    t.deepEqual(res2.value, '123');
    t.deepEqual(res2.report.children, []);
    t.end();
});

test('custom validator', t => {
    const opt = option.string
        .validate('invalid', () => false);

    const res = handleOption(getOptData(opt), '123');
    validateReport(res.report, {
        issue: [allIssues.InvalidOptionError, {}], children: [{
            issue: [Error as any, {message: 'invalid'}], children: []
        }]
    });

    t.end();
});

test('empty required option', t => {
    const opt = option.string
        .required();

    const res = handleOption(getOptData(opt), undefined);
    validateReport(res.report, {
        issue: [allIssues.InvalidOptionError, {}], children: [{
            issue: [allIssues.EmptyRequiredOptionError, {}], children: []
        }]
    });

    t.end();
});

test('all empty & all optional', t => {
    const opt = option.string;

    const res = handleOption(getOptData(opt), undefined);
    t.false(isError(res.report.issue));

    t.equal(res.value, undefined);

    t.end();
});

test('invalid array', t => {
    const opt = option.string.array();

    const res = handleOption(getOptData(opt), ['asd', true, false]);

    validateReport(res.report, {
        issue: [allIssues.InvalidOptionError, {}], children: [
            {issue: [allIssues.TypeMismatchError, {}], children: []},
            {issue: [allIssues.TypeMismatchError, {}], children: []}
        ]
    });

    t.end();
});
