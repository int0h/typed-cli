import {Parser, Printer, option} from '../';
import urlOption from '../presets/url';
import { en_US } from '../src/i18n';
import { plain, fancy } from '../src/decorator';

const parser = new Parser({
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
    _: option('number')
});

const printer = new Printer(en_US, fancy);

const {data, report} = parser.parse('-p --sad')
const rep = printer.generateHelp(parser.decl);
console.error(rep);
console.log('Ok');
console.log(data);
