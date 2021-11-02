import test from 'tape';
import {stripAnsi} from './strip-ansi';

import {decorators} from '../../src/decorator';

test('decorated text looks like original', t => {
    const results: boolean[] = [];
    for (const decorator of Object.values(decorators)) {
        for (const decoratorMethod of Object.values(decorator)) {
            const isValid = stripAnsi(decoratorMethod('some text')).toLowerCase().includes('some text');
            results.push(isValid)
        }
    }
    t.true(results.every(Boolean));
    t.end();
});
