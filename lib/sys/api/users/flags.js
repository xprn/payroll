const debug = require('debug')('payroll:api:flags');

/**
 * The API endpoint for retrieving a list of access flags
 *
 * @param {UserAccessController} userAccessController The UserAccessController instance
 * @returns {object} The GET method for the /api/flags endpoint
 */
module.exports = function (userAccessController) {
    const e = {};

    /**
     * The GET /api/flags endpoint.
     * Retrieves the array of access flags
     */
    e['GET /'] = function (req, res) {
        userAccessController.listAccessFlags()
            .then(flags => res.status(200).send({
                payload: flags.map(flag => ({
                    id:          flag._id.toString(),
                    flag:        flag.flag,
                    name:        flag.name,
                    description: flag.description
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

    return e;
};