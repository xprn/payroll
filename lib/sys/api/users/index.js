const debug  = require('debug')('payroll:api:users');
const bcrypt = require('bcryptjs');

module.exports = function (userController) {
    let e = {};

    e['GET /']         = function (req, res) {
        userController.listUsers()
            .then(users => users.map(user => ({
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
                }))
            })))
            .then(users => res.status(200).send({
                payload: users,
                error:   null,
                status:  true
            }))
            .catch(err => {
                debug(err);
                res.status(500).send({
                    payload: null,
                    error:   'Internal Server Error',
                    status:  false
                });
            });
    };
    e['POST /']        = function (req, res) {
        userController.createUser((() => {
            let user      = req.body;
            user.password = bcrypt.hashSync(user.password, 10);
            return user;
        })())
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
                    qr:         user.qr
                },
                error:   null,
                status:  true
            }))
            .catch(err => res.status(400).send({
                payload: null,
                error:   err.message || err,
                status:  false
            }));
    };
    e['GET /:user']    = function (req, res) {
        userController.findUserByID(req.params['user'])
            .then(user => res.status(user ? 200 : 404).send({
                payload: user ? {
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
                    }))
                } : null,
                error:   user ? null : 'User not found',
                status:  !!user
            }))
            .catch(err => {
                debug(err);
                res.status(500).send({
                    payload: null,
                    error:   'Internal Server Error',
                    status:  false
                })
            });
    };
    e['PUT /:user']    = function (req, res) {
        userController.updateUser(req.params['user'], (() => {
            let user = req.body;
            if ('string' === typeof user.password)
                user.password = bcrypt.hashSync(user.password, 10);
            return user;
        })())
            .then(user => res.status(user ? 200 : 404).send({
                payload: user ? {
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
                    }))
                } : null,
                error:   user ? null : 'User not found',
                status:  !!user
            }))
            .catch(err => {
                debug(err);
                if (/^Username already taken|Email already used$/i.test(err.message || '')) {
                    res.status(400).send({
                        payload: null,
                        error:   err.message,
                        status:  false
                    });
                } else {
                    res.status(500).send({
                        payload: null,
                        error:   'Internal Server Error',
                        status:  false
                    });
                }
            });
    };
    e['DELETE /:user'] = function (req, res) {
        userController.deleteUser(req.params['user'])
            .then(result => res.status(result ? 200 : 404).send({
                payload: null,
                error:   result ? null : 'User not found',
                status:  result
            }))
            .catch(err => {
                debug(err);
                res.status(500).send({
                    payload: null,
                    error:   'Internal Server Error',
                    status:  false
                });
            });
    };

    return e;
};