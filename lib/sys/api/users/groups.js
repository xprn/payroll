const debug = require('debug')('payroll:api:users:groups');

/**
 * The API endpoints for CRUD operations on access groups
 *
 * @param {UserAccessGroupController} userAccessGroupController The UserAccessGroupController instance
 * @returns {object} The GET and POST methods for the /api/groups endpoint,
 *                      GET, PUT, and DELETE methods for the /api/groups/:group endpoint,
 *                      and PUT and DELETE methods for the /api/groups/:group/flags/:flag endpoint
 */
module.exports = function (userAccessGroupController) {

    const e = {};

    /**
     * The GET /api/groups endpoint.
     * Retrieves the array of user access groups
     */
    e['GET /'] = function (req, res) {
        userAccessGroupController.listGroups()
            .then(groups => res.status(200).send({
                payload: groups.map(group => ({
                    id:          group._id.toString(),
                    tag:         group.tag,
                    name:        group.name,
                    description: group.description,
                    flags:       group.flags.map(flag => ({
                        id:          flag._id.toString(),
                        flag:        flag.flag.toLowerCase(),
                        name:        flag.name,
                        description: flag.description
                    }))
                })),
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
            })
    };
    /**
     * The POST /api/groups endpoint.
     * Creates a new access group using the 'tag', 'name', and 'description' fields
     */
    e['POST /'] = function (req, res) {
        userAccessGroupController.createGroup(req.body)
            .then(group => res.status(200).send({
                payload: {
                    id:          group._id.toString(),
                    tag:         group.tag,
                    name:        group.name,
                    description: group.description,
                    flags:       group.flags.map(flag => ({
                        id:          flag._id.toString(),
                        flag:        flag.flag.toLowerCase(),
                        name:        flag.name,
                        description: flag.description
                    }))
                },
                error:   null,
                status:  true
            }))
            .catch(err => {
                if (err.name === 'InvalidDataError') {
                    res.status(400).send({
                        payload: err.data,
                        error:   err.message,
                        status:  false
                    });
                } else {
                    debug(err);
                    res.status(500).send({
                        payload: null,
                        error:   'Internal Server Error',
                        status:  false
                    });
                }
            });
    };
    /**
     * The GET /api/groups/:group endpoint.
     * Gets the data of the :group
     */
    e['GET /:group'] = function (req, res) {
        userAccessGroupController.findGroupByID(req.params['group'])
            .then(group => res.status(group ? 200 : 404).send({
                payload: !!group ? {
                    id:          group._id.toString(),
                    tag:         group.tag,
                    name:        group.name,
                    description: group.description,
                    flags:       group.flags.map(flag => ({
                        id:          flag._id.toString(),
                        flag:        flag.flag.toLowerCase(),
                        name:        flag.name,
                        description: flag.description
                    }))
                } : null,
                error:   !!group ? null : 'Access Group not found',
                status:  !!group
            }))
            .catch(err => {
                debug(err);
                res.status(500).send({
                    payload: null,
                    error:   'Internal Server Error',
                    status:  false
                });
            })
    };
    /**
     * The PUT /api/groups/:group endpoint.
     * Update the data of the :group using the 'tag', 'name', and 'description' fields
     */
    e['PUT /:group'] = function (req, res) {
        userAccessGroupController.updateGroup(req.params['group'], req.body)
            .then(group => res.status(200).send({
                payload: {
                    id:          group._id.toString(),
                    tag:         group.tag,
                    name:        group.name,
                    description: group.description,
                    flags:       group.flags.map(flag => ({
                        id:          flag._id.toString(),
                        flag:        flag.flag.toLowerCase(),
                        name:        flag.name,
                        description: flag.description
                    }))
                },
                error:   null,
                status:  true
            }))
            .catch(err => {
                if (err.name === 'BAD_DATA') {
                    res.status(400).send({
                        payload: err.data,
                        error:   err.message,
                        status:  false
                    });
                } else {
                    debug(err);
                    res.status(500).send({
                        payload: null,
                        error:   'Internal Server Error',
                        status:  false
                    });
                }
            })
    };
    /**
     * The PUT /api/groups/:group/flags/:flag endpoint.
     * Assigns :flag to the :group
     */
    e['PUT /:group/flags/:flag'] = function (req, res) {
        userAccessGroupController.assignFlagToGroup(req.params['group'], req.params['flag'])
            .then(group => res.status(200).send({
                payload: {
                    id:          group._id.toString(),
                    tag:         group.tag,
                    name:        group.name,
                    description: group.description,
                    flags:       group.flags.map(flag => ({
                        id:          flag._id.toString(),
                        flag:        flag.flag.toLowerCase(),
                        name:        flag.name,
                        description: flag.description
                    }))
                },
                error:   null,
                status:  true
            }))
            .catch(err => {
                if (err.name === 'BAD_DATA') {
                    res.status(400).send({
                        payload: err.data,
                        error:   err.message,
                        status:  false
                    });
                } else {
                    debug(err);
                    res.status(500).send({
                        payload: null,
                        error:   'Internal Server Error',
                        status:  false
                    });
                }
            })
    };
    /**
     * The DELETE /api/groups/:group/flags/:flag endpoint.
     * Unassigns :flag from the :group
     */
    e['DELETE /:group/flags/:flag'] = function (req, res) {
        userAccessGroupController.unassignFlagFromGroup(req.params['group'], req.params['flag'])
            .then(group => res.status(200).send({
                payload: {
                    id:          group._id.toString(),
                    tag:         group.tag,
                    name:        group.name,
                    description: group.description,
                    flags:       group.flags.map(flag => ({
                        id:          flag._id.toString(),
                        flag:        flag.flag.toLowerCase(),
                        name:        flag.name,
                        description: flag.description
                    }))
                },
                error:   null,
                status:  true
            }))
            .catch(err => {
                if (err.name === 'INVALID_FLAG') {
                    res.status(400).send({
                        payload: err.data,
                        error:   err.message,
                        status:  false
                    });
                } else {
                    debug(err);
                    res.status(500).send({
                        payload: null,
                        error:   'Internal Server Error',
                        status:  false
                    });
                }
            })
    };
    /**
     * The DELETE /api/groups/:group endpoint.
     * Deletes the :group
     */
    e['DELETE /:group'] = function (req, res) {
        userAccessGroupController.deleteGroup(req.params['group'])
            .then(result => res.status(200).send({
                payload: null,
                error:   null,
                status:  true
            }))
            .catch(err => {
                if (err.name === 'INVALID_GROUP') {
                    res.status(404).send({
                        payload: null,
                        error:   err.message,
                        status:  false
                    });
                } else {
                    debug(err);
                    res.status(500).send({
                        payload: null,
                        error:   'Internal Server Error',
                        status:  false
                    });
                }
            });
    };

    return e;
};