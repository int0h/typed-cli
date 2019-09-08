import {cli, option} from '../';
import urlOption from '../presets/url';

const data = cli({
    command: 'tasker',
    description: `Blah blah`,
    options: {
        taskerFilePath: option('int').array().required().alias('p').description('a path to a task file'),
        cleanLogs: option('boolean').label('flag').default(false).alias('c').description('cleans logs before start'),
        logsPath: option('string').alias('l').description('cleans logs before start'),
        a: option('string').label('email').validate(s => s.includes('@')).process('post', s => ({email: s})),
        url: urlOption.required().description('url 1'),
        url2: urlOption.description('url 2')
    },
    _: option('number').required()
})

console.log('Ok');
console.log(data.options.url);
