import test from 'tape';

import {locales, declareLocale} from '../../src/i18n';
import {decorators} from '../../src/decorator';

test('declareLocale', t => {
    const l = declareLocale({
        code: 'test',
        issues: {
            InvalidOptionError: (): string => 'InvalidOptionError',
            EmptyRequiredOptionError: (): string => 'EmptyRequiredOptionError',
            InvalidInputError: (): string => 'InvalidInputError',
            SomeInvalidOptionsError: (): string => 'SomeInvalidOptionsError',
            UnknownOptionWarning: (): string => 'UnknownOptionWarning',
            TypeMismatchError: (): string => 'TypeMismatchError',
            InvalidSomeArgumentsError: (): string => 'InvalidSomeArgumentsError',
            InvalidArgumentError: (): string => 'InvalidArgumentError',
            TooManyArgumentsError: (): string => 'TooManyArgumentsError',
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
            opt_multiple: (): string => 'opt_multiple',
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
