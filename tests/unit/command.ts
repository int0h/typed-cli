import test from 'tape';

import {command, _aliases, _decl, _fn, _subCommandSet, createCommandHelper, defaultCommand} from '../../src/command';
import { Printer } from '../../src/printer';
import { locales } from '../../src/i18n';
import { decorators } from '../../src/decorator';
import { option } from '../../index';

test('command helper result', t => {
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

test('command parsing', t => {
    let argv: string[] = [];
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
        exiter: (hasErrors) => exitCode = (hasErrors ? 1 : 0),
        helpGeneration: true,
        printer: new Printer({locale: locales.en_US, decorator: decorators.plain}),
        writer: (text) => out = text
    });

    test('basics', t => {
        cleanup();
        argv = ['cmd'];
        commandHelper({}, {
            cmd: command({}).handle(() => handled = true)
        });
        t.is(handled, true);
        t.is(exitCode, 0);
        t.is(out, '');
        t.end();
    });

    test('no command', t => {
        cleanup();
        argv = [];
        t.throws(() => {
            commandHelper({}, {
                cmd: command({}).handle(() => handled = true)
            });
        });
        t.is(handled, false);
        t.is(exitCode, 1);
        t.is(out, 'no command was provided and no default command was set');
        t.end();
    });

    test('no command', t => {
        cleanup();
        argv = ['ads'];
        t.throws(() => {
            commandHelper({}, {
                cmd: command({}).handle(() => handled = true)
            });
        });
        t.is(handled, false);
        t.is(exitCode, 1);
        t.is(out, 'command <ads> is not supported');
        t.end();
    });

    test('default cmd', t => {
        cleanup();
        argv = [''];
        commandHelper({}, {
            [defaultCommand]: command({}).handle(() => handled = true)
        });
        t.is(handled, true);
        t.is(exitCode, 0);
        t.is(out, '');
        t.end();
    });

    test('default cmd', t => {
        cleanup();
        argv = ['--help'];
        try {
            commandHelper({
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
            t.is(e.message, 'exiter has failed');
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

    test('sub', t => {
        cleanup();
        argv = ['cmd', 'subA'];
        commandHelper({}, {
            cmd: command({}).handle(() => {}).subCommands({
                subA: command({}).handle(() => handled = true)
            })
        });
        t.is(handled, true);
        t.is(exitCode, 0);
        t.is(out, '');
        t.end();
    });

    test('sub help', t => {
        cleanup();
        argv = ['cmd', 'subA', '--help'];
        try {
            commandHelper({
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
            t.is(e.message, 'exiter has failed');
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

    test('alias collision', t => {
        cleanup();
        argv = ['cmd', 'subA'];
        t.throws(() => {
            commandHelper({}, {
                cmd: command({}).handle(() => {}).subCommands({
                    subA: command({}).handle(() => handled = true)
                }),
                cmd2: command({}).handle(() => {}).alias('cmd')
            });
        });
        t.is(handled, false);
        t.end();
    });

    test('no command handler', t => {
        cleanup();
        argv = ['cmd', 'subA'];
        t.throws(() => {
            commandHelper({}, {
                cmd: command({})
            });
        });
        t.is(handled, false);
        t.end();
    });

    test('no default command handler', t => {
        cleanup();
        argv = ['cmd', 'subA'];
        t.throws(() => {
            commandHelper({}, {
                [defaultCommand]: command({})
            });
        });
        t.is(handled, false);
        t.end();
    });

    test('sub invalid', t => {
        cleanup();
        argv = ['cmd', 'subA', '-i', 'asd'];
        try {
            commandHelper({}, {
                cmd: command({}).handle(() => {}).subCommands({
                    subA: command({
                        options: {
                            i: option.int
                        }
                    }).handle(() => handled = true)
                })
            });
        } catch(e) {
            t.is(e.message, 'exiter has failed');
        }
        t.is(handled, false);
        t.is(exitCode, 1);
        t.is(out, [
            'option <i> is invalid',
            '    - expected <int>, but received <string>'
        ].join('\n'));
        t.end();
    });

    test('sub warning', t => {
        cleanup();
        argv = ['cmd', 'subA', '-r', 'asd'];
        try {
            commandHelper({}, {
                cmd: command({}).handle(() => {}).subCommands({
                    subA: command({
                        options: {
                            i: option.int
                        }
                    }).handle(() => handled = true)
                })
            });
        } catch(e) {
            t.is(e.message, 'exiter has failed');
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
