import test from 'tape';

import {command, _aliases, _decl, _fn, _subCommandSet, createCommandHelper, defaultCommand} from '../../src/command';
import { Printer } from '../../src/printer';
import { locales } from '../../src/i18n';
import { decorators } from '../../src/decorator';
import { option } from '../../';

test('command helper result', async t => {
    const handleChild = (): void => {};
    const handleParent = (): void => {};
    const cmd = command({
        name: 'foo',
        description: 'boo'
    }).alias('a', 'b').subCommands({
        sub: command({}).handle(handleChild)
    }).handle(handleParent);

    t.is(cmd[_decl].name, 'foo');
    t.is(cmd[_decl].description, 'boo');
    t.is(cmd[_fn], handleParent);
    t.is(cmd[_subCommandSet].sub[_fn], handleChild);
    t.deepEqual(cmd[_aliases], ['a', 'b']);
    t.end();
});

test('command parsing', async t => {
    let argv: string[] = [];
    let env = {};
    let exitCode = 0;
    let out = '';
    let handled = false;

    const cleanup = (): void => {
        argv = [];
        exitCode = 0;
        out = '';
        handled = false;
    };

    const commandHelper = createCommandHelper({
        argvProvider: () => argv,
        envProvider: () => env,
        exiter: (hasErrors) => exitCode = (hasErrors ? 1 : 0),
        helpGeneration: true,
        printer: new Printer({locale: locales.en_US, decorator: decorators.plain}),
        writer: (text) => out = text
    });

    test('basics', async t => {
        cleanup();
        argv = ['cmd'];
        await commandHelper({}, {
            cmd: command({}).handle(() => handled = true)
        });
        t.is(handled, true);
        t.is(exitCode, 0);
        t.is(out, '');
        t.end();
    });

    test('no command', async t => {
        cleanup();
        argv = [];
        try {
            await commandHelper({}, {
                cmd: command({}).handle(() => handled = true)
            });
            t.fail();
        } catch(e) {};
        t.is(handled, false);
        t.is(exitCode, 1);
        t.is(out, 'no command was provided and no default command was set');
        t.end();
    });

    test('no command', async t => {
        cleanup();
        argv = ['ads'];
        try {
            await commandHelper({}, {
                cmd: command({}).handle(() => handled = true)
            });
            t.fail();
        } catch(e) {}
        t.is(handled, false);
        t.is(exitCode, 1);
        t.is(out, 'command <ads> is not supported');
        t.end();
    });

    test('default cmd', async t => {
        cleanup();
        argv = [''];
        await commandHelper({}, {
            [defaultCommand]: command({}).handle(() => handled = true)
        });
        t.is(handled, true);
        t.is(exitCode, 0);
        t.is(out, '');
        t.end();
    });

    test('default cmd', async t => {
        cleanup();
        argv = ['--help'];
        try {
            await commandHelper({
                program: 'prog'
            }, {
                abc: command({
                    description: 'abc-description'
                }).handle(() => handled = true),
                def: command({
                    description: 'def-description'
                }).handle(() => handled = true)
            });
            t.fail();
        } catch(e) {
            t.is((e as any).message, 'exiter has failed');
        }
        t.is(handled, false);
        t.is(exitCode, 0);
        t.is(out, [
            'Commands',
            'prog abc | - abc-description',
            'prog def | - def-description',
            '',
            'Type prog <command> --help for detailed documentation'
        ].join('\n'));
        t.end();
    });

    test('sub', async t => {
        cleanup();
        argv = ['cmd', 'subA'];
        await commandHelper({}, {
            cmd: command({}).handle(() => {}).subCommands({
                subA: command({}).handle(() => handled = true)
            })
        });
        t.is(handled, true);
        t.is(exitCode, 0);
        t.is(out, '');
        t.end();
    });

    test('sub help', async t => {
        cleanup();
        argv = ['cmd', 'subA', '--help'];
        try {
            await commandHelper({
                program: 'prog'
            }, {
                cmd: command({}).handle(() => {}).subCommands({
                    subA: command({
                        options: {
                            i: option.int.description('opt-desc')
                        }
                    }).handle(() => handled = true)
                })
            });
        } catch(e) {
            t.is((e as any).message, 'exiter has failed');
        }
        t.is(handled, false);
        t.is(exitCode, 0);
        t.is(out, [
            'Usage',
            '    prog cmd subA [-i <int>]',
            '',
            'Options',
            '    -i  <int>  [optional]  - opt-desc'
        ].join('\n'));
        t.end();
    });

    test('alias collision', async t => {
        cleanup();
        argv = ['cmd', 'subA'];
        try {
            await commandHelper({}, {
                cmd: command({}).handle(() => {}).subCommands({
                    subA: command({}).handle(() => handled = true)
                }),
                cmd2: command({}).handle(() => {}).alias('cmd')
            });
            t.fail();
        } catch(e) {}
        t.is(handled, false);
        t.end();
    });

    test('no command handler', async t => {
        cleanup();
        argv = ['cmd', 'subA'];
        try {
            await commandHelper({}, {
                cmd: command({})
            });
            t.fail();
        } catch(e) {};
        t.is(handled, false);
        t.end();
    });

    test('no default command handler', async t => {
        cleanup();
        argv = ['cmd', 'subA'];
        try {
            await commandHelper({}, {
                [defaultCommand]: command({})
            });
            t.fail();
        } catch(e) {};
        t.is(handled, false);
        t.end();
    });

    test('sub invalid', async t => {
        cleanup();
        argv = ['cmd', 'subA', '-i', 'asd'];
        try {
            await commandHelper({}, {
                cmd: command({}).handle(() => {}).subCommands({
                    subA: command({
                        options: {
                            i: option.int
                        }
                    }).handle(() => handled = true)
                })
            });
        } catch(e) {
            t.is((e as any).message, 'exiter has failed'); // does not make sense
        }
        t.is(handled, false);
        t.is(exitCode, 1);
        t.is(out, [
            'option <i> is invalid',
            '    - expected <int>, but received <string>'
        ].join('\n'));
        t.end();
    });

    test('sub warning', async t => {
        cleanup();
        argv = ['cmd', 'subA', '-r', 'asd'];
        try {
            await commandHelper({}, {
                cmd: command({}).handle(() => {}).subCommands({
                    subA: command({
                        options: {
                            i: option.int
                        }
                    }).handle(() => handled = true)
                })
            });
        } catch(e) {
            t.is((e as any).message, 'exiter has failed'); // does not make sense
        }
        t.is(handled, true);
        t.is(exitCode, 0);
        t.is(out, [
            'option <r> is not supported',
        ].join('\n'));
        t.end();
    });

    t.end();
});
