const debug = require('debug')('payroll:api:users:groups');

module.exports = function (userAccessGroupController) {

    const e = {};

    e['GET /']          = function (req, res) {
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
    e['POST /']         = function (req, res) {
        userAccessGroupController.createGroup(req.body)
            .then(group => res.status(group ? 200 : 400).send({
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
                error:   !!group ? null : 'Bad Data',
                status:  !!group
            }))
            .catch(err => {
                if (/^(.* is not a valid .*)|(An access group with that .* already exists)$/i.test(err.message)) {
                    res.status(400).send({
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
    e['GET /:group']    = function (req, res) {
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
                status:  false
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
    e['DELETE /:group'] = function (req, res) {
        userAccessGroupController.deleteGroup(req.params['group'])
            .then(result => res.status(result ? 200 : 404).send({
                payload: null,
                error:   result ? null : 'Access group not found',
                status:  !!result
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