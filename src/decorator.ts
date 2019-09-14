import chalk from 'chalk';

type DecoratorFn = (text: string) => string;

/** for TS only */
function __definePlainTextDecorator<T extends Record<string, DecoratorFn>>(decorators: T): T {
    return decorators;
}

export const plain = __definePlainTextDecorator({
    alias: s => s,
    type: s => s,
    optional: s => s,
    required: s => s,
    multiple: s => s,
    optionDescription: s => s,
    title: s => s,
    usageOption: s => s,
    command: s => s,
    errorLine: s => s,
    warningLine: s => s,
    invalidValue: s => s,
});

export type TextDecorator = typeof plain;

export function defineTextDecorator<T extends Record<keyof typeof plain, DecoratorFn>>(decorators: T): T {
    return decorators;
}

export const fancy = defineTextDecorator({
    alias: s => s,
    type: s => chalk.green(s),
    optional: s => chalk.yellow(s),
    required: s => chalk.redBright(s),
    multiple: s => chalk.cyan(s),
    optionDescription: s => chalk.dim(s),
    title: s => chalk.underline(s),
    usageOption: s => chalk.italic(s),
    command: s => chalk.bold(s),
    errorLine: s => '❌  ' + s,
    warningLine: s => '⚠️  ' + s,
    invalidValue: s => chalk.redBright(s),
});

export const decorators = {fancy, plain};
