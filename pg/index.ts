import {cli, option} from '../';

const data = cli({
    command: 'tasker',
    description: `Blah blah`,
    options: {
        taskerFilePath: option('int').array().required().alias('p').desc('a path to a task file'),
        cleanLogs: option('boolean').label('flag').default(false).alias('c').desc('cleans logs before start'),
        logsPath: option('string').alias('l').desc('cleans logs before start')
    },
    _: option('number').required()
})

console.log('Ok');
console.log(data);
