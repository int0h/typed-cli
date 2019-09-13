import test from 'tape';

import {Printer} from '../../src/printer';
import { en_US } from '../../src/i18n';
import { plain } from '../../src/decorator';
import { option } from '../../src/option';
import { Parser } from '../../src/parser';

const helpTextRef =
`Description
description

Usage
    test-cmd -w --required <int> [-bz --bigBoolean -i <int> -n <number> -s <string> --array <int> --default <any> --desc <any>] [<number>]

Options
    -b, --boolean                <boolean>  [optional]  -
    --bigBoolean, --big-boolean  <boolean>  [optional]  -
    -z                           <boolean>  [optional]  -
    -w                           <boolean>  [required]  -
    -i, --int                    <int>      [optional]  -
    -n, --number                 <number>   [optional]  -
    -s, --string                 <string>   [optional]  -
    --array                      <int>      [multiple]  -
    --required                   <int>      [required]  -
    --default                    <any>      [=123]      -
    --desc                       <any>      [optional]  - option desc`;

test('printer:genHelp', t => {
    const printer = new Printer(en_US, plain);
    const helpText = printer.generateHelp({
        command: 'test-cmd',
        description: 'description',
        options: {
            boolean: option('boolean').alias('b'),
            bigBoolean: option('boolean'),
            z: option('boolean'),
            w: option('boolean').required(),
            int: option('int').alias('i'),
            number: option('number').alias('n'),
            string: option('string').alias('s'),

            array: option('int').array(),
            required: option('int').required(),
            default: option('any').default(123),

            desc: option('any').description('option desc')
        },
        _: option('number')
    });

    t.equal(helpText, helpTextRef);

    t.end();
});

test('printer:noOpts', t => {
    const helpTextRef = [
        'Description',
        'description',
        '',
        'Usage',
        '    test-cmd'
    ].join('\n');
    const printer = new Printer(en_US, plain);
    const helpText = printer.generateHelp({
        command: 'test-cmd',
        description: 'description',
    });

    t.equal(helpText, helpTextRef);

    t.end();
});

test('printer:args:multiple', t => {
    const helpTextRef = [
        'Description',
        'description',
        '',
        'Usage',
        '    test-cmd [<int> <int> ...]'
    ].join('\n');
    const printer = new Printer(en_US, plain);
    const helpText = printer.generateHelp({
        command: 'test-cmd',
        description: 'description',
        _: option('int').array()
    });

    t.equal(helpText, helpTextRef);

    t.end();
});

test('printer:args:optional', t => {
    const helpTextRef = [
        'Description',
        'description',
        '',
        'Usage',
        '    test-cmd [<int>]'
    ].join('\n');
    const printer = new Printer(en_US, plain);
    const helpText = printer.generateHelp({
        command: 'test-cmd',
        description: 'description',
        _: option('int')
    });

    t.equal(helpText, helpTextRef);

    t.end();
});

test('printer:args:required', t => {
    const helpTextRef = [
        'Description',
        'description',
        '',
        'Usage',
        '    test-cmd <int>'
    ].join('\n');
    const printer = new Printer(en_US, plain);
    const helpText = printer.generateHelp({
        command: 'test-cmd',
        description: 'description',
        _: option('int').required()
    });

    t.equal(helpText, helpTextRef);

    t.end();
});

const reportTextRef =
`option <bar> is invalid
    - custom:error:stringify
option <booleanOpt> is invalid
    - expected <boolean>, but received <string>
option <foo> is invalid
    - custom:error
option <intOpt> is invalid
    - expected <int>, but received <number>
option <numberOpt> is invalid
    - expected <number>, but received <string>
option <stringOpt> is invalid
    - expected <string>, but received <boolean>
option <invalid> is not supported`;

test('printer:stringifyReport:basic types', t => {
    const printer = new Printer(en_US, plain);

    const parser = new Parser({
        options: {
            booleanOpt: option('boolean'),
            intOpt: option('int'),
            numberOpt: option('number'),
            stringOpt: option('string'),
            foo: option('string').validate('custom:error', () => false),
            bar: option('string').validate(() => {
                class CustomError extends Error {
                    stringify(): string {
                        return 'custom:error:stringify'
                    }
                }
                throw new CustomError();
            }),
        }
    });

    const {data, report} = parser.parse([
        '--intOpt', '12.23',
        '--booleanOpt', 'asd',
        '--numberOpt', 'qwe',
        '--stringOpt',
        '--foo', '0',
        '--bar', '1',
        '--invalid'
    ]);

    t.equal(data, null);

    const reportAsText = printer.stringifyReport(report);

    t.equals(reportAsText, reportTextRef);

    t.end();
});

test('printer:stringifyReport:valid report', t => {
    const printer = new Printer(en_US, plain);

    const parser = new Parser({
        options: {
            booleanOpt: option('boolean'),
        }
    });

    const {report} = parser.parse([
        '--booleanOpt'
    ]);

    t.equals(printer.stringifyReport(report), '');

    t.end();
});
