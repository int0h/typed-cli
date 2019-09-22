#! /usr/bin/env node
import {cli, option, presets} from '../';

const data = cli({
    name: 'calc',
    description: 'Calculate expressions',
    options: {
        operation: presets.oneOf(['+', '-', '*', '/'] as const)
            .alias('o')
            .required()
            .description('opeartion to be applied'),
        round: option('boolean').alias('r').description('rounds the result'),
    },
    _: option('number').array()
});

const OperatorMap = {
    '+': (prev: number, cur: number) => prev + cur,
    '/': (prev: number, cur: number) => prev / cur,
    '-': (prev: number, cur: number) => prev - cur,
    '*': (prev: number, cur: number) => prev * cur,
};

// Type safe!
// n1: number
// n2: number
// (place a cursor on a variable to see its type)
const [n1, n2] = data._;

// Type safe!
// op: '+' | '-' | '*' | '/'
const op = data.options.operation;

console.log(`Calculating: ${n1} ${op} ${n2} = ${[n1, n2].reduce(OperatorMap[op])}`);
