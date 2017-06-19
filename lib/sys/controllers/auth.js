const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const speakeasy = require('speakeasy');

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
        if ('string' !== typeof data.login) return null;
        if ('string' !== typeof data.password) return null;
        if ('string' !== typeof data.token) return null;

        const user = await this.userController.findUserByLogin(data.login.toLowerCase());

        if (!user) return null;
        if (!bcrypt.compareSync(data.password, user.password)) return null;
        if (!speakeasy.totp.verify({
                secret: user.secret, encoding: 'base32', token: data.token
            })) return null;

        let token = jwt.sign({user: user._id.toString()}, await this.redis.getAsync('token:secret') || 'secret');

        return Object.assign({}, user, {token});
    }

    /**
     * Gets the user data using the specified access token
     * @param {string} token The access token
     * @returns {Promise.<object|null>} An object containing the user data, or null on failure
     */
    async getUserByToken(token) {
        try {
            let data = jwt.verify(token, await this.redis.getAsync('token:secret') || 'secret');
            return await this.userController.findUserByID(data.user);
        } catch (e) {
            return null;
        }
    }

    /**
     * Checks an access token to see if it is authorized to perform a certain action.
     * @param {string} token The access token to check
     * @param {string} flag The action (AccessFlag) that would be performed
     * @returns {Promise.<boolean>} Whether or not the access token is authorized to perform the specified action
     */
    async isTokenAuthorized(token, flag) {
        let user = await this.getUserByToken(token);
        return user && !!user.flags.find(f => f.flag === flag);
    }
}

module.exports.UserAuthenticationController = UserAuthenticationController;