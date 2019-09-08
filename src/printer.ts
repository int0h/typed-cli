import chalk from 'chalk';

import {ValidationReport} from './pipeline';

export function printOptionError(title: string, errors: string[]) {
    console.error(title);
    for (const err of errors) {
        console.error(`\t ${chalk.red('>')} ` + err);
    }
}

export function printArgumentError(errors: string[]) {
    printOptionError(`❌  ` + chalk.redBright(`arguments are invalid`), errors);
}

export function printReport(report: ValidationReport) {
    for (const warn of report.warnings) {
        console.warn('⚠️  ' + chalk.yellow(warn));
    }
    for (const [key, item] of Object.entries(report.items)) {
        if (item.errors.length === 0) {
            continue;
        }
        printOptionError(`❌  ` + chalk.redBright(`option " ${key} " is invalid`), item.errors);
    }
}