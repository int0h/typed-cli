import test from 'tape';

import stripAnsi from 'strip-ansi';

import {locales, declareLocale} from '../../src/i18n';
import {decorators} from '../../src/decorator';

test('declareLocale', t => {
    const l = declareLocale({
        code: 'test',
        issues: {
            IvalidOptionError: (): string => 'IvalidOptionError',
            EmptyRequiredOptionError: (): string => 'EmptyRequiredOptionError',
            IvalidInputError: (): string => 'IvalidInputError',
            SomeIvalidOptionsError: (): string => 'SomeIvalidOptionsError',
            UnknownOptionWarning: (): string => 'UnknownOptionWarning',
            TypeMismatchError: (): string => 'TypeMismatchError',
            IvalidSomeArguemntsError: (): string => 'IvalidSomeArguemntsError',
            IvalidArguemntError: (): string => 'IvalidArguemntError',
            InvalidCommand: (): string => 'InvalidCommand',
            NoCommand: (): string => 'NoCommand',
        },
        texts: {
            title_description: (): string => 'title_description',
            title_usage: (): string => 'title_usage',
            title_options: (): string => 'title_options',
            title_commands: (): string => 'title_commands',
            hint_commandHint: (): string => 'hint_commandHint',
            opt_required: (): string => 'opt_required',
            opt_optional: (): string => 'opt_optional',
            opt_multile: (): string => 'opt_multile',
        }
    });

    const results: boolean[] = [];
    for (const group of [l.issues, l.texts]) {
        for (const [key, fn] of Object.entries(group)) {
            const isValid = fn() === key;
            results.push(isValid)
        }
    }

    t.true(results.every(Boolean));
    t.end();
})

test('decorated text looks like original', t => {
    // this test is roughly checks that no locale throws any errors
    for (const locale of Object.values(locales)) {
        for (const fn of Object.values(locale.issues)) {
            fn({} as any, decorators.plain);
        }
        for (const fn of Object.values(locale.texts)) {
            fn(decorators.plain);
        }
    }
    t.pass();
    t.end();
});
