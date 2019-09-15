#! /usr/bin/env node
/* eslint-disable */
import { cli, option } from '../';
import urlOption from '../presets/url';
import { command } from '../src/command';
// import { en_US } from '../src/i18n';
// import { plain, fancy } from '../src/decorator';

// const data = cli({
//     name: 'tasker',
//     description: `Blah blah`,
//     options: {
//         taskerFilePath: option('int').array().required().alias('p').description('a path to a task file'),
//         cleanLogs: option('boolean').label('flag').default(false).alias('c').description('cleans logs before start'),
//         logsPath: option('string').alias('l').description('cleans logs before start'),
//         a: option('string').label('email').validate(s => s.includes('@')).process('post', s => ({email: s})),
//         url: urlOption.required().description('url 1'),
//         url2: urlOption.description('url 2')
//     },
//     _: option('number'),
//     commands: {
//         foo: command({description: 'asd', options: {}})
//     }
// });

// process.argv = '$ git --help'.split(' ')

cli.commands({
    program: 'pg',
    description: 'Version control system',
    completer: {
        completeCmd: 'completion'
    }
}, {
    checkout:
        command({
            description: 'changes the current branch',
            options: {
                newBranch: option('boolean').alias('b')
            }
        })
        .alias('ch')
        .handle(data => {
            console.log(data.options.newBranch)
        }),
    reset:
        command({
            description: 'eliminates changes compared to branch',
            options: {
                hard: option('boolean')
            }
        })
        .handle(data => {
            console.log(data);
        }),
    repository: command({}).subCommands({
        create:
            command({
                description: 'creates a new repo',
                options: {
                    name: option('string')
                }
            })
            .handle(data => {
                console.log(data);
            })
    }).handle(data => {
        console.log
    })
});

// const printer = new Printer(en_US, fancy);

// const {data, report} = parser.parse('-p --sad')
// const rep = printer.generateHelp(parser.decl);
// console.error(rep);
// console.log('Ok');
// console.log(data);
