export class BaseError extends Error {

}

export class BaseWarning {}

class UnknownPhaseError extends BaseError {
    invalidPhaseName: string;
    constructor(invalidPhaseName: string) {
        super();
        this.invalidPhaseName = invalidPhaseName;
    }
}

class UnknownOptionWarning extends BaseWarning {
    optionName: string;
    constructor(optionName: string) {
        super();
        this.optionName = optionName;
    }
}

export type IssueType = (typeof issues)[keyof typeof issues];

export const issues = {
    UnknownPhaseError,
    UnknownOptionWarning
}

