const express   = require('express');
const mongoose  = require('mongoose');
const redis     = require('redis');
const speakeasy = require('speakeasy');
const qr        = require('qrcode');
const bcrypt    = require('bcryptjs');
const fs        = require('fs');
const path      = require('path');

function createMongoConnection(hostname, port, database) {
    return new Promise((resolve, reject) => {
        const db = mongoose.createConnection();
        db.once('open', () => {
            require('../lib/sys/mongoose.config')(db)
                .then(() => resolve(db), err => reject(err));
        });
        db.once('error', err => {
            db.close();
            reject(err);
        });
        db.open(`mongodb://${hostname}:${port}/${database}`);
    });
}

function createRedisConnection(hostname, port) {
    return new Promise((resolve, reject) => {
        const client = redis.createClient(port, hostname);
        client.on('ready', () => resolve(client));
        client.on('error', err => {
            client.end(true);
            reject(err);
        });
    });
}

module.exports = function () {
    const api = express.Router();

    let mongo  = null;
    let redis  = null;
    let config = {};

    try {
        fs.writeFileSync(path.resolve(__dirname, '..', 'data', 'config.json'), '{}');
    } catch (e) {
        fs.mkdirSync(path.resolve(__dirname, '..', 'data'));
        fs.writeFileSync(path.resolve(__dirname, '..', 'data', 'config.json'), '{}');
    }

    api.post('/mongo', (req, res) => {
        if (mongo) {
            res.status(200).send({
                payload: null,
                error:   null,
                status:  true
            });
        } else {
            createMongoConnection(req.body.hostname, req.body.port, req.body.database)
                .then(db => {
                    mongo = db;

                    config['mongodb-host'] = req.body.hostname;
                    config['mongodb-port'] = req.body.port;
                    config['mongodb']      = req.body.database;
                    fs.writeFileSync(path.resolve(__dirname, '..', 'data', 'config.json'), JSON.stringify(config));

                    res.status(200).send({
                        payload: null,
                        error:   null,
                        status:  true
                    });
                })
                .catch(err => res.status(400).send({
                    payload: null,
                    error:   err.message,
                    status:  false
                }));
        }
    });
    api.post('/redis', (req, res) => {
        if (redis) {
            res.status(200).send({
                payload: null,
                error:   null,
                status:  true
            });
        } else {
            createRedisConnection(req.body.hostname, req.body.port)
                .then(db => {
                    redis = db;

                    config['redis-host'] = req.body.hostname;
                    config['redis-port'] = req.body.port;
                    config['redis']      = req.body.database;

                    fs.writeFileSync(path.resolve(__dirname, '..', 'data', 'config.json'), JSON.stringify(config));

                    res.status(200).send({
                        payload: null,
                        error:   null,
                        status:  true
                    });
                })
                .catch(err => res.status(400).send({
                    payload: null,
                    error:   err.message,
                    status:  false
                }));
        }
    });
    api.post('/user', async (req, res) => {
        const username   = req.body.username;
        const email      = req.body.email;
        const password   = req.body.password;
        const first_name = req.body.first_name;
        const last_name  = req.body.last_name;

        if (!mongo) return res.status(400).send({
            payload: null,
            error:   'No MongoDB connection created',
            status:  false
        });
        if (!redis) return res.status(400).send({
            payload: null,
            error:   'No Redis connection created',
            status:  false
        });

        const User        = mongo.model('User');
        const AccessGroup = mongo.model('AccessGroup');
        const AccessFlag  = mongo.model('AccessFlag');

        const group = (await AccessGroup.find()).find(g => g.tag === 'admin');

        let flags  = await AccessFlag.find({
            $or: group.flags.map(_id => ({_id}))
        });
        let secret = speakeasy.generateSecret();
        let image  = await new Promise((resolve, reject) =>
            qr.toDataURL(secret.otpauth_url, (err, img) => err ? reject(err) : resolve(img)));
        let user   = new User({
            username, email,
            password: bcrypt.hashSync(password, 10),
            first_name, last_name,
            group:    group._id,
            secret:   secret.base32
        });

        await user.save()
            .then(() => res.status(200).send({
                payload: {
                    id:         user._id.toString(),
                    username:   user.username.toLowerCase(),
                    email:      user.email.toLowerCase(),
                    first_name: user.first_name[0].toUpperCase() + user.first_name.substr(1).toLowerCase(),
                    last_name:  user.last_name[0].toUpperCase() + user.last_name.substr(1).toLowerCase(),
                    group:      {
                        id:          group._id.toString(),
                        tag:         group.tag,
                        name:        group.name,
                        description: group.description
                    },
                    flags:      flags.map(flag => ({
                        id:          flag._id.toString(),
                        flag:        flag.flag.toLowerCase(),
                        name:        flag.name,
                        description: flag.description
                    })),
                    qr:         image
                },
                error:   null,
                status:  true
            }))
            .catch(err => res.status(400).send({
                payload: null,
                error:   err.message,
                status:  false
            }));
    });
    api.post('/auth', async (req, res) => {
        const token    = req.body.token;
        const login    = req.body.login;
        const password = req.body.password;

        if (!mongo) return res.status(400).send({
            payload: null,
            error:   'No MongoDB connection created',
            status:  false
        });
        if (!mongo) return res.status(400).send({
            payload: null,
            error:   'No MongoDB connection created',
            status:  false
        });

        const User = mongo.model('User');

        const user = await User.findOne({$or: [{username: login}, {email: login}]});

        if (user &&
            bcrypt.compareSync(password, user.password) &&
            speakeasy.totp.verify({secret: user.secret, encoding: 'base32', token: token})) {
            res.status(200).send({
                payload: null,
                error:   null,
                status:  true
            });
        } else {
            res.status(400).send({
                payload: null,
                error:   'Invalid Credentials',
                status:  false
            });
        }
    });

    api.use((req, res) => res.status(400).send({
        payload: null,
        error:   'Bad Request',
        status:  false
    }));

    return api;
};