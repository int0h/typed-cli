export class BaseError extends Error {
    className!: keyof typeof allIssues;
}

export class BaseWarning {
    className!: keyof typeof allIssues;
    isWarning = true;
}

class EmptyRequiredOptionError extends BaseError {
    requiredOption: string;
    className = 'EmptyRequiredOptionError' as const;
    constructor(requiredOption: string) {
        super();
        this.requiredOption = requiredOption;
    }
}

class TypeMismatchError extends BaseError {
    className = 'TypeMismatchError' as const;
    expected: string;
    received: string;
    constructor(expected: string, received: string) {
        super();
        this.expected = expected;
        this.received = received;
    }
}

class IvalidOptionError extends BaseError {
    className = 'IvalidOptionError' as const;
    optionName: string;
    value: any;
    constructor(optionName: string, value: any) {
        super();
        this.optionName = optionName;
        this.value = value;
    }
}

class SomeIvalidOptionsError extends BaseError {
    className = 'SomeIvalidOptionsError' as const;
}

class IvalidSomeArguemntsError extends BaseError {
    className = 'IvalidSomeArguemntsError' as const;
}

class IvalidArguemntError extends BaseError {
    className = 'IvalidArguemntError' as const;
    value: any;
    constructor(value: any) {
        super();
        this.value = value;
    }
}

class TooManyArgumentsError extends BaseError {
    className = 'TooManyArgumentsError' as const;
}

class InvalidCommand extends BaseError {
    className = 'InvalidCommand' as const;
    commandName: any;
    constructor(commandName: any) {
        super();
        this.commandName = commandName;
    }
}

class NoCommand extends BaseError {
    className = 'NoCommand' as const;
}

class IvalidInputError extends BaseError {
    className = 'IvalidInputError' as const;
}

class UnknownOptionWarning extends BaseWarning {
    className = 'UnknownOptionWarning' as const;
    optionName: string;
    constructor(optionName: string) {
        super();
        this.optionName = optionName;
    }
}

export type IssueType = {
    [key in keyof typeof allIssues]: InstanceType<(typeof allIssues)[key]>;
}[keyof typeof allIssues];

export const allIssues = {
    UnknownOptionWarning,
    EmptyRequiredOptionError,
    IvalidOptionError,
    IvalidSomeArguemntsError,
    IvalidArguemntError,
    TooManyArgumentsError,
    SomeIvalidOptionsError,
    IvalidInputError,
    TypeMismatchError,
    InvalidCommand,
    NoCommand
}

