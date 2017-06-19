const {System} = require('../../lib/sys');

/**
 * A function that creates a System instance using mock database instances.
 * @returns {Promise.<System>} The System instance with mock database instances
 */
module.exports = async function () {
    const Mongoose  = require('mongoose');
    const Mockgoose = require('mockgoose').Mockgoose;
    const mockgoose = new Mockgoose(Mongoose);

    const redis    = require('redis-js');
    const mongoose = Mongoose.connection;

    /* Promisify the mock redis connection */
    redis.getAsync  = (key) => new Promise((resolve, reject) =>
        redis.get(key, (err, data) => err ? reject(err) : resolve(data)));
    redis.setAsync  = (key, value) => new Promise((resolve, reject) =>
        redis.set(key, value, err => err ? reject(err) : resolve()));
    redis.keysAsync = (a) => new Promise((resolve, reject) =>
        redis.keys(a, (err, keys) => err ? reject(err) : resolve(keys)));
    redis.delAsync  = (a) => new Promise((resolve, reject) =>
        redis.del(a, (err, keys) => err ? reject(err) : resolve(keys)));

    /* Set the Promise library of mongoose to Bluebird */
    Mongoose.Promise = Promise;

    /* Create the mock mongoose connection */
    await mockgoose.prepareStorage();
    await new Promise((resolve, reject) => {
        mongoose.on('error', err => reject(err));
        mongoose.on('open', () => Promise.resolve()
            .then(() => require('../../lib/sys/mongoose.config')(mongoose))
            .then(() => resolve()));
        Mongoose.connect('localhost');
    });

    return new System({redis, mongoose});
};