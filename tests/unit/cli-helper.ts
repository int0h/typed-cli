import test from 'tape';

import { createCliHelper } from '../../src/cli-helper';
import { en_US } from '../../src/i18n';
import { plain } from '../../src/decorator';
import { Printer } from '../../src/printer';
import { option } from '../../src/option';

test('createCliHelper', t => {
    let exitCode = -1;
    const log = {
        error: '',
        log: ''
    };
    let argv = '';
    const flush = (): void => {
        exitCode = -1;
        log.error = '';
        log.log = '';
    }

    const printer = new Printer(en_US, plain);

    const cli = createCliHelper({
        argvProvider: () => argv.split(' '),
        exiter: hasErrors => exitCode = (hasErrors ? 1 : 0),
        helpGeneration: true,
        writer: (text, logType) => {log[logType] += '\n' + text},
        printer
    });

    test('help generation', t => {
        const helpTextRef = [
            '',
            'Description',
            'description',
            '',
            'Usage',
            '    test-cmd [--foo <int>]',
            '',
            'Options',
            '    --foo  <int>  [optional]  - ',
        ].join('\n');

        try {
            argv = '--help';
            flush();
            cli({
                name: 'test-cmd',
                description: 'description',
                options: {
                    foo: option('int')
                }
            });
        } catch(e) {}

        t.equal(exitCode, 0);
        t.equal(log.log, helpTextRef);

        t.end();
    });

    test('return result', t => {
        argv = '--foo 1'
        flush();
        const data = cli({
            name: 'test-cmd',
            description: 'description',
            options: {
                foo: option('int')
            }
        });

        t.equal(exitCode, -1);
        t.deepEqual(data, {options: {foo: 1}, _: undefined});

        t.end();
    });

    test('handle problems', t => {
        const helpTextRef = [
            '',
            'option <foo> is invalid',
            '    - expected <int>, but received <string>',
        ].join('\n');

        try {
            argv = '--foo wrong';
            flush();
            cli({
                name: 'test-cmd',
                description: 'description',
                options: {
                    foo: option('int')
                }
            });
        } catch(e) {}

        t.equal(exitCode, 1);
        t.equal(log.error, helpTextRef);

        t.end();
    });

    t.end();
});

test('createCliHelper:noHelpGeneration', t => {
    let exitCode = -1;
    const log = {
        error: '',
        log: ''
    };
    let argv = '';
    const flush = (): void => {
        exitCode = -1;
        log.error = '';
        log.log = '';
    }

    const printer = new Printer(en_US, plain);

    const cli = createCliHelper({
        argvProvider: () => argv.split(' '),
        exiter: hasErrors => exitCode = (hasErrors ? 1 : 0),
        writer: (text, logType) => {log[logType] += '\n' + text},
        printer
    });

    const helpTextRef = [
        '',
        'option <help> is not supported',
    ].join('\n');

    try {
        argv = '--help';
        flush();
        cli({
            name: 'test-cmd',
            description: 'description',
            options: {
                foo: option('int')
            }
        });
    } catch(e) {}

    t.equal(exitCode, -1);
    t.equal(log.error, helpTextRef);

    t.end();
});
