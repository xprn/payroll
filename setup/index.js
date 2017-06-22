const cp         = require('child_process');
const os         = require('os');
const util       = require('util');
const path       = require('path');
const http       = require('http');
const express    = require('express');
const bodyParser = require('body-parser');
const opn        = require('opn');
const api        = require('./api');

function log(tag, stream, ...messages) {
    messages.forEach(message => {
        if ('object' === typeof message) {
            let lines = util.inspect(message, {depth: null}).split('\n');
            lines.forEach(line => stream.write(tag + ' :: ' + line + '\n'));
        } else {
            stream.write(tag + ' :: ' + message + '\n');
        }
    });
}

function getVersion(v) {
    let __ver = v.match(/v=?(\d+)(\.(\d+)(\.(\d+))?)?/)[0];
    let _ver  = __ver.match(/(\d+)(\.(\d+)(\.(\d+))?)?/)[0];
    let ver   = _ver.split('.');
    return {
        major: Number(ver[0]) || 0,
        minor: Number(ver[1]) || 0,
        patch: Number(ver[2]) || 0
    };
}

function getNodeVersion() {
    return new Promise(resolve =>
        cp.exec(`node --version`, (err, stdout) => resolve(err ? null : getVersion(stdout))));
}
function getRedisVersion() {
    return new Promise(resolve =>
        cp.exec(`redis-server --version`, (err, stdout) => resolve(err ? console.log(err) || null : getVersion(stdout))));
}
function getMongoVersion() {
    return new Promise(resolve =>
        cp.exec(`mongod --version`, (err, stdout) => resolve(err ? null : getVersion(stdout))));
}

console.log   = log.bind(null, 'PAYROLL', process.stdout);
console.error = log.bind(null, 'PAYROLL', process.stderr);

(function main() {
    const app    = express();
    const server = http.createServer(app);

    app.set('view engine', 'pug');
    app.set('views', path.resolve(__dirname, 'views'));

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(express.static(path.resolve(__dirname, 'static')));

    app.use('/api', api());

    app.get('/', async (req, res) => res.status(200).render('index', {
        versions: {
            node:  await getNodeVersion(),
            redis: await getRedisVersion(),
            mongo: await getMongoVersion()
        }
    }));

    app.use((req, res) => res.status(400).render('404'));

    server.once('listening', () => {
        const hostname = os.hostname();
        const port     = server.address().port;
        const url      = `http://${hostname}:${port}`;

        console.log(`Setup server started at ${url}`);
        opn(url);
    });

    server.once('error', err =>
        console.error(err));

    server.listen();
})();