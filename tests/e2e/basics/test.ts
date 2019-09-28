// import {spawn, ChildProcessWithoutNullStreams, exec, execSync} from 'child_process';
import {spawn, IPty} from 'node-pty';
import test from 'tape';
import chalk from 'chalk';
import stripAnsi from 'strip-ansi';

const sleep = (time: number): Promise<void> => new Promise((resolve): any => setTimeout(resolve, time));
const waitFor = (isReadyFn: () => boolean, interval = 25): Promise<void> => {
    return new Promise((resolve): void => {
        function check(): void {
            if (isReadyFn()) {
                resolve();
            } else {
                setTimeout(check, interval);
            }
        }

        check();
    });
}

function removePrompts(str: string): string {
    return str
        .split('\r\n')
        .slice(1) // removes input
        .filter(line => !/root@.+:\/.+#/.test(line))
        .join('\r\n');
}

function trimBorderLines(str: string): string {
    return str
        .split('\r\n')
        .slice(1, -1)
        .join('\r\n');
}

type ReadyFn = (buf: string) => boolean;

const defaultReadyFn: ReadyFn = buf => /root@.+:\/.+#/.test(buf.replace(/^.*\n/, ''));

class Dialog {
    private proc: IPty;
    private isReady = false;
    buf = '';

    constructor(cmd: string[]) {
        this.proc = spawn(cmd[0], cmd.slice(1), {
            name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: __dirname
        });

        this.proc.onData(str => {
            process.stdout.write(str);
            this.isReady = this.isReady || /root@.+:\/.+#/.test(str.replace(/^.*\n/, ''));
            this.buf += str;
        });
    }

    write(str: string): void {
        this.proc.write(str);
    }

    wait(readyFn: ReadyFn = defaultReadyFn): Promise<void> {
        return waitFor(() => readyFn(this.buf));
    }

    async talk(str: string): Promise<string> {
        await this.wait();
        this.isReady = false;
        this.buf = '';
        this.proc.write(str + '\n');
        await this.wait();
        return removePrompts(this.buf);
    }

}

const dialog = new Dialog('docker run -it typed-cli-basics /bin/bash'.split(' '));
// const sh = spawn('docker', `run -i typed-cli-basics /bin/bash`.split(' '));
// console.log(execSync('docker run -it typed-cli-basics /bin/bash'), {stdio: 'inherit'})
// const sh = spawn('docker', `run -it typed-cli-basics /bin/bash`.split(' '), {
//     name: 'xterm-color',
//     cols: 80,
//     rows: 30,
//     cwd: __dirname
// });
// global.sh = sh;
// sh.stdout.pipe(process.stdout);
// sh.on('error', err => {
//     console.error(err);
// });
// let buf = '';
// sh.on('data', str => {
//     process.stdout.write(str);
//     buf += str;
// });
// sh.stdout.on('data', str => {
//     buf += str;
// });
// sh.stderr.on('data', str => {
//     buf += str;
// });
// async function talk(str: string, pause = 100): Promise<string> {
//     buf = '';
//     sh.write(str + '\n');
//     await sleep(pause);
//     return buf;
// }

test('basics', async t => {
    t.is(await dialog.talk('node index.js && echo fail'), [
        `❌  option <${chalk.redBright('height')}> is invalid`,
        `    - it's required`,
        `❌  option <${chalk.redBright('width')}> is invalid`,
        `    - it's required`,
    ].join('\r\n'), 'no option fails');

    t.is(await dialog.talk('node index.js -w asv && echo fail'), [
        `❌  option <${chalk.redBright('height')}> is invalid`,
        `    - it's required`,
        `❌  option <${chalk.redBright('width')}> is invalid`,
        `    - expected <number>, but received <${chalk.redBright('string')}>`,
    ].join('\r\n'), 'invalid option fails');

    t.is(await dialog.talk('node index.js -w 12 -h 23 && echo success'), [
        `276success`,
    ].join('\r\n'), 'valid data works');

    t.is(stripAnsi(await dialog.talk('node index.js --help')), [
        `Description`,
        `calculate area`,
        ``,
        `Usage`,
        `    calc-area -w <number> -h <number>`,
        ``,
        `Options`,
        `    -w, --width   <number>  [required]  - width of a rectangle`,
        `    -h, --height  <number>  [required]  - height of a rectangle`,
    ].join('\r\n'), 'help is printed');

    // make 'calc-area' globally accessable
    await dialog.talk(`export PATH=/app:$PATH`);
    await dialog.talk(`ln -s /app/index.js ./calc-area`);
    await dialog.talk(`chmod +x ./calc-area`);

    // install completions
    dialog.talk(`node ./install-completions.js`);
    await dialog.wait(s => stripAnsi(s).includes('Which Shell do you use'));
    dialog.write('\n');
    await dialog.wait(s => stripAnsi(s).includes('We will install completion'));
    dialog.write('Y\n');
    await dialog.talk(`source ~/.bashrc`);

    dialog.write('calc-area \t');
    await sleep(1000);
    t.is(dialog.buf.slice(-1), '-');

    dialog.buf = '';
    dialog.write('\t\t');
    await dialog.wait();
    t.deepEqual(trimBorderLines(dialog.buf).split(/\s+/g).filter(Boolean).sort(), [
        `-w`, `-h`, `--width`, `--height`
    ].sort(), 'completions work');

    await dialog.talk('\u0003');
    await dialog.talk('exit');

    t.end();
});
