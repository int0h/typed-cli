import test from 'tape';

import {normalizeCompleterOptions, completeForCliDecl, completeForCommandSet} from '../../src/completer';
import { CliDeclaration } from '../../src/type-logic';
import { option } from '../../';
import { prepareCliDeclaration } from '../../src/parser';
import { oneOf } from '../../presets';
import { CommandSet, command, prepareCommandSet } from '../../src/command';

test('normalizeCompleterOptions', t => {
    t.deepEqual(normalizeCompleterOptions({
        completeCmd: 'a',
        installCmd: 'b'
    }), {
        completeCmd: 'a',
        installCmd: 'b',
        uninstallCmd: 'typed-cli--install-shell-completions',
    });

    t.end();
});

test('completeForCliDecl', t => {
    const cli: CliDeclaration = {
        name: 'prog',
        description: 'desc',
        options: {
            n: option('int').description('foo').array(),
            someProp: option('string').alias('some-opt-alias').description('bar'),
            en: oneOf(['a', 'b']).description('enum'),
            bool: option('boolean').description('bool')
        }
    };
    const pCli = prepareCliDeclaration(cli).decl;

    test('basics', t => {
        const res = completeForCliDecl(pCli, [''], '');
        t.deepEqual(res, [
            {completion: '-n', description: 'foo'},
            {completion: '--someProp', description: 'bar'},
            {completion: '--some-opt-alias', description: 'bar'},
            {completion: '--some-prop', description: 'bar'},
            {completion: '--en', description: 'enum'},
            {completion: '--bool', description: 'bool'},
        ]);
        t.end();
    });

    test('complete after bool', t => {
        const res = completeForCliDecl(pCli, ['--bool'], '');
        t.deepEqual(res, [
            {completion: '-n', description: 'foo'},
            {completion: '--someProp', description: 'bar'},
            {completion: '--some-opt-alias', description: 'bar'},
            {completion: '--some-prop', description: 'bar'},
            {completion: '--en', description: 'enum'},
        ]);
        t.end();
    });

    test('--', t => {
        const res = completeForCliDecl(pCli, [''], '--');
        t.deepEqual(res, [
            {completion: '--someProp', description: 'bar'},
            {completion: '--some-opt-alias', description: 'bar'},
            {completion: '--some-prop', description: 'bar'},
            {completion: '--en', description: 'enum'},
            {completion: '--bool', description: 'bool'},
        ]);
        t.end();
    });

    test('value completions', t => {
        const res = completeForCliDecl(pCli, ['--en'], '');
        t.deepEqual(res, [
            {completion: 'a', description: ''},
            {completion: 'b', description: ''},
        ]);
        t.end();
    });

    test('value completions without opt completer', t => {
        const res = completeForCliDecl(pCli, ['-n'], '');
        t.deepEqual(res, [
        ]);
        t.end();
    });

    test('invalid option value completions', t => {
        const res = completeForCliDecl(pCli, ['--asd'], '');
        t.deepEqual(res, [
        ]);
        t.end();
    });

    test('array option', t => {
        const res = completeForCliDecl(pCli, ['-n', '1'], '');
        t.deepEqual(res, [
            {completion: '-n', description: 'foo'},
            {completion: '--someProp', description: 'bar'},
            {completion: '--some-opt-alias', description: 'bar'},
            {completion: '--some-prop', description: 'bar'},
            {completion: '--en', description: 'enum'},
            {completion: '--bool', description: 'bool'},
        ]);
        t.end();
    });

    test('non array skipping', t => {
        const res = completeForCliDecl(pCli, ['--someProp', 'sad'], '');
        t.deepEqual(res, [
            {completion: '-n', description: 'foo'},
            {completion: '--en', description: 'enum'},
            {completion: '--bool', description: 'bool'},
        ]);
        t.end();
    });

    test('arg completions do not work so far, but do not break anything either', t => {
        const res = completeForCliDecl(pCli, [], 'a');
        t.deepEqual(res, [
        ]);
        t.end();
    });

    t.end();
});

test('completeForCommandSet', t => {
    const cs: CommandSet = prepareCommandSet({
        load: command({
            description: 'load-desc',
        }).alias('l').handle(() => {}),
        save: command({
            description: 'save-desc'
        }).handle(() => {}).subCommands({
            all: command({description: 'save-all-desc'}).handle(() => {})
        })
    });

    test('basics', t => {
        const res = completeForCommandSet(cs, [], '');
        t.deepEqual(res, [
            {completion: 'load', description: 'load-desc'},
            {completion: 'l', description: 'load-desc'},
            {completion: 'save', description: 'save-desc'},
        ]);
        t.end();
    });

    test('with partial', t => {
        const res = completeForCommandSet(cs, [], 'l');
        t.deepEqual(res, [
            {completion: 'load', description: 'load-desc'},
            {completion: 'l', description: 'load-desc'},
        ]);
        t.end();
    });

    test('subs', t => {
        const res = completeForCommandSet(cs, ['save'], '');
        t.deepEqual(res, [
            {completion: 'all', description: 'save-all-desc'},
        ]);
        t.end();
    });

    t.end();
});
