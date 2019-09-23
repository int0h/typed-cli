#! /usr/bin/env node
import {cli, option} from 'typed-cli';

const data = cli({
    name: 'calc-area',
    description: 'calculate area',
    options: {
        width: option('number').alias('w').required().description('width of a rectangle'),
        height: option('number').alias('h').required().description('height of a rectangle'),
    }
});

const {width, height} = data.options;

function calculateArea(width: number, height: number): number {
    return width * height;
}

process.stdout.write(String(calculateArea(width, height)));
