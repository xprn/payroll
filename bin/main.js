const Promise = global.Promise = require('bluebird');
const debug    = require('debug');
const redis    = require('redis');
const mongoose = require('mongoose');
const fs       = require('fs');
const path     = require('path');
const yargs    = require('yargs')
    .usage('Usage: \n  $0 <command> [options]')
    .command(['start', 's'], 'Start the system', {}, startSystem)
    .command('setup', 'Start the system setup', {}, startSystemSetup)
    .demandCommand(1, 'Please specify a command')
    .option('port', {
        describe: 'The port to bind to',
        alias:    ['p'],
        default:  process.env.PORT || 3000,
        type:     'number'
    })
    .option('redis', {
        describe: 'The Redis database to use',
        alias:    ['redis-database', 'r'],
        default:  0,
        type:     'number'
    })
    .option('redis-host', {
        describe: 'The IP address to the Redis server',
        default:  'localhost',
        type:     'string'
    })
    .option('redis-port', {
        describe: 'The port of the Redis server',
        default:  6379,
        type:     'number'
    })
    .option('mongodb', {
        describe: 'The MongoDB database to use',
        alias:    ['mongo', 'm'],
        default:  'cloudator-payroll',
        type:     'string'
    })
    .option('mongodb-host', {
        describe: 'The IP address or hostname to the MongoDB server',
        alias:    ['mongo-host'],
        default:  'localhost',
        type:     'string'
    })
    .option('mongodb-port', {
        describe: 'The port of the MongoDB server',
        alias:    ['mongo-port'],
        default:  27017,
        type:     'number'
    })
    .option('config', {
        alias:   ['c'],
        default: 'data/config.json'
    })
    .config('config', 'The configuration file', f => {
        return JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', f)));
    })
    .help()
    .argv;

const {Server, System} = require('../lib/sys');

function connectToRedis({host = 'localhost', port = 6379, db = 0} = {}) {
    return new Promise(resolve => {
        let log = debug('payroll:redis');

        log(`Establishing connection to Redis server...`);

        let client                   = redis.createClient({host, port});
        let initialConnectionCreated = false;
        let currentConnectionStatus  = null;

        client.select(db);
        client.on('error', err => {
            if (currentConnectionStatus !== 'disconnected') {
                currentConnectionStatus = 'disconnected';

                if (initialConnectionCreated) {
                    log('Connection to Redis server lost');
                    log(err.message);
                } else {
                    log('Unable to establish connection to Redis server');
                    log(err.message);
                }
            }
        });
        client.on('connect', () => {
            if (currentConnectionStatus !== 'connected') {
                currentConnectionStatus = 'connected';
                if (initialConnectionCreated) {
                    log('Connection to Redis server regained');
                } else {
                    initialConnectionCreated = true;
                    log('Connection to Redis server established');
                    resolve(client);
                }
            }
        });
    });
}

function connectToMongo({host = 'localhost', port = 27017, name = 'cloudator-payroll'}) {
    return new Promise((resolve, reject) => {
        let log = debug('payroll:mongoose');
        let db  = mongoose.createConnection();

        log('Establishing connection to MongoDB...');

        db.on('error', err => Promise.resolve()
            .then(() => log(`Unable to establish connection to MongoDB server`))
            .then(() => log(err))
            .then(() => reject(err)));
        db.on('open', () => Promise.resolve()
            .then(() => log(`Connection to MongoDB server established`))
            .then(() => require('../lib/sys/mongoose.config')(db))
            .then(() => resolve(db)));
        db.open(`mongodb://${host}:${port}/${name}`);
    });
}

async function startSystem(argv) {
    let log = debug('payroll:main');

    let redis    = null;
    let mongoose = null;
    let system   = null;
    let server   = null;

    Promise.resolve()
        .then(() => connectToRedis({
            host: argv.redisHost,
            port: argv.redisPort,
            db:   argv.redisDatabase
        }))
        .then(_redis => redis = _redis)
        .then(() => connectToMongo({
            host: argv.mongoHost,
            port: argv.mongoPort,
            name: argv.mongo
        }))
        .then(_mongoose => mongoose = _mongoose)
        .then(() => system = new System({redis, mongoose}))
        .then(() => system.initialize())
        .then(() => server = new Server(system))
        .then(() => server.listen(argv.port))
        .then(() => log('System started'))
        .catch(err => {
            log(`Unable to start system`);
            log(err);
        });
}

async function startSystemSetup(argv) {
    let log = debug('payroll:setup');
    log(`Starting system setup...`);
}

mongoose.Promise = Promise;
Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);
process.on('unhandledRejection', (function () {
    let log = debug('payroll:unresolved');
    return err => log(err);
})());