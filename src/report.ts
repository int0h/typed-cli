import {IssueType} from './errors';

// type ReportItem = {
//     issue: IssueType;
//     children: ReportItem[];
// }

export type Report = Array<{
    issue: IssueType;
    children: Report;
}>;

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
