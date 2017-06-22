const bcrypt      = require('bcryptjs');
const jwt         = require('jsonwebtoken');
const speakeasy   = require('speakeasy');
const debug       = require('debug')('payroll:user-auth-controller');
const createError = require('../errors');

/**
 * The UserAuthenticationController.
 */
class UserAuthenticationController {

    /**
     * @param {Connection} db The Mongoose MongoDB connection instance.
     * @param {RedisClient} redis The RedisClient instance.
     * @param {UserController} userController The UserController instance.
     */
    constructor(db, redis, userController) {
        Object.defineProperty(this, 'db', {
            value:    db,
            writable: false
        });
        Object.defineProperty(this, 'redis', {
            value:    redis,
            writable: false
        });
        Object.defineProperty(this, 'userController', {
            value:    userController,
            writable: false
        });
    }

    /**
     * Generates an authentication token for the user
     * @param {{login, password, token}} data The data to use for authentication
     * @returns {Promise.<object|null>} An object containing the user data and the token, or null on failure.
     */
    async authenticateUser(data) {
        let status = true;

        if ('string' !== typeof data.login) status = false;
        if ('string' !== typeof data.password) status = false;
        if ('string' !== typeof data.token) status = false;

        const user = status ? await this.userController.findUserByLogin(data.login.toLowerCase()) : null;

        status = status &&
            !!user &&
            !!bcrypt.compareSync(data.password, user.password) &&
            !!speakeasy.totp.verify({secret: user.secret, encoding: 'base32', token: data.token});

        if (status) {
            let token = jwt.sign({user: user._id.toString()}, await this.redis.getAsync('token:secret') || 'secret', {expiresIn: '30min'});

            return Object.assign({}, user, {
                auth: {
                    token,
                    expires: Date.now() + (30 * 60 * 6000)
                }
            });
        } else {
            return Promise.reject(createError('Invalid Authentication Token'));
        }
    }

    /**
     * Gets the user data using the specified access token
     * @param {string} token The access token
     * @returns {Promise.<object|null>} An object containing the user data, or null on failure
     */
    async getUserByToken(token) {
        return new Promise(async (resolve, reject) => {
            jwt.verify(token, await this.redis.getAsync('token:secret') || 'secret', async (err, data) => {
                if (err) {
                    reject(createError('Invalid Authentication Token'));
                } else {
                    this.userController.findUserByID(data.user)
                        .then(user => resolve(user))
                        .catch(err => reject(err));
                }
            });
        });
    }

    /**
     * Checks an access token to see if it is authorized to perform a certain action.
     * @param {string} token The access token to check
     * @param {string} flag The action (AccessFlag) that would be performed
     * @returns {Promise.<boolean>} Whether or not the access token is authorized to perform the specified action
     */
    async isTokenAuthorized(token, flag) {
        return this.getUserByToken(token)
            .then(user => user && !!user.flags.find(f => f.flag === flag));
    }
}

module.exports.UserAuthenticationController = UserAuthenticationController;