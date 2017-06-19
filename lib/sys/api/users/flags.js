const debug = require('debug')('payroll:api:flags');

module.exports = function (userAccessController) {
    const e = {};

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