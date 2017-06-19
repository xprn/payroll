const debug = require('debug')('payroll:api:users:access');

/**
 * The API endpoints module for assigning and unassigning access flags to and from users
 *
 * @param {UserAccessController} userAccessController The UserAccessController instance
 * @returns {object} The PUT and DELETE methods for the /api/users/:user/flags/:flag endpoint
 */
module.exports = function (userAccessController) {
    const e = {};

    /**
     * The PUT /api/users/:user/flags/:flag endpoint.
     * Assigns :flag to :user
     */
    e['PUT /:flag'] = function (req, res) {
        userAccessController.assignAccessFlagToUser(req.params['user'], req.params['flag'])
            .then(user => res.status(user ? 200 : 404).send({
                payload: !!user ? {
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
                error:   !!user ? null : 'User not found',
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
    /**
     * The DELETE /api/users/:user/flags/:flag endpoint.
     * Unassigns :flag to :user
     */
    e['DELETE /:flag'] = function (req, res) {
        userAccessController.unassignAccessFlagToUser(req.params['user'], req.params['flag'])
            .then(user => res.status(user ? 200 : 404).send({
                payload: !!user ? {
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
                error:   !!user ? null : 'User not found',
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

    return e;
};