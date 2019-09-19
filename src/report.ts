import { BaseWarning, BaseError, allIssues } from './errors';

export type Issue = (Error | BaseWarning | null);

export type Report = {
    issue: Issue;
    children: Report[];
};

export function combineIssues(conclusion: Issue, issues: Issue[]): Report {
    let isValid = true;
    const children = issues.map(i => {
        isValid = isValid && !isError(i);
        return {
            issue: i,
            children: []
        };
    });
    return {
        issue: isValid ? null : conclusion,
        children
    }
}

export function isError(issue?: Issue): boolean {
    return !(issue instanceof BaseWarning)
        &&
        (Boolean(issue) || issue instanceof BaseError || issue instanceof Error);
}

export function mergeReports(conclusion: Issue, ...reports: Report[]): Report {
    const res: Report = {
        issue: null,
        children: []
    };
    let isValid = true;
    for (const r of reports) {
        isValid = isValid && !isError(r.issue)
        res.children = [...res.children, ...r.children];
    }
    res.issue = isValid ? null : conclusion;
    return res;
}

export function errorToReport(err: Error): Report {
    return {
        issue: new allIssues.IvalidInputError(),
        children: [{
            issue: err,
            children: []
        }]
    };
}
