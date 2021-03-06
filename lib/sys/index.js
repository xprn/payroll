const debug      = require('debug');
const express    = require('express');
const bodyParser = require('body-parser');
const http       = require('http');
const bcrypt     = require('bcryptjs');
const crypto     = require('crypto');
const path       = require('path');
const fs         = require('fs');

/**
 * The System
 */
class System {
    /**
     * @param {RedisClient} redis The RedisClient instance.
     * @param {Connection} mongoose The Mongoose MongoDB connection instance.
     */
    constructor({redis, mongoose}) {
        Object.defineProperty(this, 'redis', {
            value:    redis,
            writable: false
        });
        Object.defineProperty(this, 'mongoose', {
            value:    mongoose,
            writable: false
        });

        this._log     = debug('payroll:system');
        this._handler = express();
        this._api     = require('./api')(this);
    }

    /**
     * Routes the application
     * @private
     */
    _createRoutes() {
        let app = this._handler;

        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({extended: true}));

        app.use('/api', this._api.router);
        app.use(require('../app')(this));

        app.use((req, res) => res.status(404).send('Not Found'));
    }

    /**
     * Initializes the system
     */
    async initialize() {
        this._log('Initializing system...');

        this._createRoutes();
        if ((await this._api.userController.listUsers()).length === 0) {
            let userData = {
                username:   'root',
                password:   crypto.createHash('sha512')
                                .update(Math.random().toString())
                                .digest()
                                .toString('hex')
                                .substr(0, 32),
                email:      'root@localhost',
                first_name: 'Root',
                last_name:  'Administrator',
                group:      (await this._api.userAccessGroupController.listGroups()).find(group => group.tag === 'admin')._id
            };
            let user     = await this._api.userController.createUser(Object.assign({}, userData, {
                password: bcrypt.hashSync(userData.password, 10)
            }));

            fs.writeFileSync(path.resolve(__dirname, '..', '..', 'data', 'root.json'), JSON.stringify({
                username: userData.username,
                password: userData.password,
                qr:       user.qr
            }, null, 4));

            this._log('Saved default root user data to data/root.json');
            this._log('Please delete the file as soon as possible');
        }

        this._log('System initialized');
    }
}

/**
 * The Server.
 * This is just a wrapper that includes logging
 */
class Server {

    /**
     * @param {System} system The System instance
     */
    constructor(system) {
        this._system = system;
        this._server = http.createServer(system._handler);

        this._log = debug('payroll:server');
    }

    /**
     * Listen on the specified port
     * @param {number} port The port to listen on
     * @resolves If the server is successfully started
     * @rejects If there was a problem starting the server
     */
    listen(port) {
        return new Promise((resolve, reject) => {
            this._server
                .on('error', err => Promise.resolve()
                    .then(() => this._log(`Unable to start server`))
                    .then(() => this._log(err))
                    .then(() => reject(err)))
                .on('listening', () => Promise.resolve()
                    .then(() => this._log(`Server started on port ${this._server.address().port}`))
                    .then(() => resolve()))
                .listen(port);
        });
    }
}

module.exports.System = System;
module.exports.Server = Server;