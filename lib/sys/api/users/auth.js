const debug = require('debug')('payroll:api:users:auth');

/**
 *
 * The API endpoints module for generating access tokens and retrieving user data using an access token
 *
 * @param {UserAuthenticationController} userAuthenticationController The UserAuthenticationController instance
 * @returns {object} The GET and POST methods for the /api/auth endpoint
 */
module.exports = function (userAuthenticationController) {
    const e = {};

    /**
     * The GET /api/auth endpoint.
     * Retrieves the user data using the access token specified in the 'x-access-token' header
     */
    e['GET /'] = function (req, res) {
        userAuthenticationController.getUserByToken(req.headers['x-access-token'])
            .then(user => res.status(200).send({
                payload: {
                    id:         user._id.toString(),
                    username:   user.username.toLowerCase(),
                    email:      user.email.toLowerCase(),
                    first_name: user.first_name[0].toUpperCase() + user.first_name.substr(1).toLowerCase(),
                    last_name:  user.last_name[0].toUpperCase() + user.last_name.substr(1).toLowerCase(),
                    group:      {
                        id:          user.group._id.toString(),
                        tag:         user.group.tag,
                        name:        user.group.name,
                        description: user.group.description
                    },
                    flags:      user.flags.map(flag => ({
                        id:          flag._id.toString(),
                        flag:        flag.flag.toLowerCase(),
                        name:        flag.name,
                        description: flag.description
                    })),
                    token:      user.token
                },
                error:   null,
                status:  true
            }))
            .catch(err => {
                switch (err.name) {
                    case 'InvalidAuthenticationTokenError':
                        return res.status(401).send({
                            payload: null,
                            error:   'Unauthorized',
                            status:  false
                        });
                    default:
                        debug(err);
                        return res.status(500).send({
                            payload: null,
                            error:   'Internal Server Error',
                            status:  false
                        })
                }
            });
    };
    /**
     * The POST /api/auth endpoint.
     * Generates an access token using the 'login', 'password', and 'token' fields
     */
    e['POST /'] = function (req, res) {
        userAuthenticationController.authenticateUser(req.body)
            .then(user => res.status(200).send({
                payload: {
                    id:         user._id.toString(),
                    username:   user.username.toLowerCase(),
                    email:      user.email.toLowerCase(),
                    first_name: user.first_name[0].toUpperCase() + user.first_name.substr(1).toLowerCase(),
                    last_name:  user.last_name[0].toUpperCase() + user.last_name.substr(1).toLowerCase(),
                    group:      {
                        id:          user.group._id.toString(),
                        tag:         user.group.tag,
                        name:        user.group.name,
                        description: user.group.description
                    },
                    flags:      user.flags.map(flag => ({
                        id:          flag._id.toString(),
                        flag:        flag.flag.toLowerCase(),
                        name:        flag.name,
                        description: flag.description
                    })),
                    auth:       {
                        token:   user.auth.token,
                        expires: user.auth.expires
                    }
                },
                error:   null,
                status:  true
            }))
            .catch(err => {
                switch (err.name) {
                    case 'TokenExpiredError':
                        return res.status(401).send({
                            payload: null,
                            error:   'Token Expired',
                            status:  false
                        });
                    case 'InvalidAuthenticationTokenError':
                        return res.status(401).send({
                            payload: null,
                            error:   'Unauthorized',
                            status:  false
                        });
                    default:
                        debug(err);
                        return res.status(500).send({
                            payload: null,
                            error:   'Internal Server Error',
                            status:  false
                        })
                }
            });
    };

    return e;
};