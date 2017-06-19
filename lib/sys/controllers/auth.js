const mongoose  = require('mongoose');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const speakeasy = require('speakeasy');

class UserAuthenticationController {

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

    async getUserByToken(token) {
        try {
            let data = jwt.verify(token, await this.redis.getAsync('token:secret') || 'secret');
            return await this.userController.findUserByID(data.user);
        } catch (e) {
            return null;
        }
    }

    async isTokenAuthorized(token, flag) {
        let user = await this.getUserByToken(token);
        return user && !!user.flags.find(f => f.flag === flag);
    }
}

module.exports.UserAuthenticationController = UserAuthenticationController;