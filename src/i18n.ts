import { allIssues } from './errors';
import { TextDecorator } from './decorator';
import { Issue } from './report';

export type LocaleFn = (decorator: TextDecorator, data?: any) => string;

export type IssueLocaleFn = (decorator: TextDecorator, issue: Issue) => string;

type IssueLocale = {
    [key in keyof typeof allIssues]: (issue: InstanceType<(typeof allIssues)[key]>, decorator: TextDecorator) => string;
}

function __declareEnglishTextsLocale<T extends Record<string, LocaleFn>>(locale: T): T {
    return locale;
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export const en_US = {
    code: 'en_US',
    texts: __declareEnglishTextsLocale({
        title_description: d => d.title('Description'),
        title_usage: d => d.title('Usage'),
        title_options: d => d.title('Options'),
        title_commands: d => d.title('Commands'),
        hint_commandHint: (d, {command} = {}) => `Type ${d.command(command)} <command> --help for detailed documentation`,
        opt_required: d => 'required',
        opt_optional: d => 'optional',
        opt_multile: d => 'multiple',
    }),
    issues: {
        IvalidOptionError: (e, d) => `option <${d.invalidValue(e.optionName)}> is invalid`,
        EmptyRequiredOptionError: (e, d) => `it's required`,
        IvalidInputError: (e, d) => `provided arguments were not correct`,
        SomeIvalidOptionsError: (e, d) => `some of the options are invalid`,
        UnknownOptionWarning: (e, d) => `option <${d.invalidValue(e.optionName)}> is not supported`,
        TypeMismatchError: (e, d) => `expected <${e.expected}>, but received <${d.invalidValue(e.received)}>`,
        IvalidSomeArguemntsError: (e, d) => `some of the arguments are invalid`,
        IvalidArguemntError: (e, d) => `provided argument value <${d.invalidValue(e.value)}> is not valid`,
        TooManyArgumentsError: (e, d) => `the program supports only 1 argument but many were provided`,
        InvalidCommand: (e, d) => `command <${d.invalidValue(e.commandName)}> is not supported`,
        NoCommand: (e, d) => `no command was provided and no default command was set`
    } as IssueLocale
};
/* eslint-enable @typescript-eslint/no-unused-vars */

export type Locale = typeof en_US;

export function declareLocale(locale: Locale): Locale {
    return locale;
}

export const locales = {en_US};
