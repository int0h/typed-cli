import {BaseWarning, BaseError} from './errors';

// type ReportItem = {
//     issue: IssueType;
//     children: ReportItem[];
// }

// export class Report {

// }

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

// class Report {
//     issue: Error | BaseWarning;
//     children: Report[] = [];

//     constructor(issue: Error | BaseWarning) {

//     }
// }

// export function reportIssue(err: IssueType): Report {
//     return {
//         issue: err,
//         children: []
//     };
// }

// export class Report {
//     issues: IssueType[] = [];
//     children: Report[] = [];

//     constructor(issues: IssueType[] = []) {
//         this.addIssues(issues);
//     }

//     addIssues(issues: IssueType[]) {
//         this.issues = [...this.issues, ...issues];
//     }

//     addChild(childReport: Report) {
//         this.children.push(childReport);
//     }

//     validate(): boolean {
//         return this.issues.every(issue => !(issue instanceof Error))
//             && this.children.every(child => child.validate());
//     }
// }
