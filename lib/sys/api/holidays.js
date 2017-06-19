const request = require('request');
const debug   = require('debug')('payroll:api:holidays');

/**
 * The API endpoint for retrieving an array of public holidays
 *
 * @returns {object} The GET method for the /api/holidays endpoint
 */
module.exports = function () {
    const cache = new Map();
    const e     = {};

    /**
     * The GET /api/holidays endpoint.
     * Retrieves an array of public holidays using the 'country' and 'year' query parameters
     */
    e['GET /'] = function (req, res) {
        const year    = Number(req.query['year'] || new Date().getFullYear());
        const country = req.query['country'] || '';
        const key     = `${country.toUpperCase().trim()}/${year}`;

        if (cache.has(key)) {
            debug('Responding with cached result');
            res.status(200).send({
                payload: cache.get(key),
                error:   null,
                status:  true
            });
        } else {
            request({
                method: 'get',
                url:    'http://www.kayaposoft.com/enrico/json/v1.0',
                qs:     {
                    action:  'getPublicHolidaysForYear',
                    year:    year,
                    country: country
                }
            }, (err, _res, body) => {
                if (err) {
                    debug(err);
                    res.status(500).send({
                        payload: null,
                        error:   'Internal Server Error',
                        status:  false
                    });
                } else {
                    try {
                        let json = JSON.parse(body);
                        if (json.error) {
                            res.status(400).send({
                                payload: null,
                                error:   json.error,
                                status:  false
                            })
                        } else {
                            debug('Caching response');
                            cache.set(key, json);
                            res.status(200).send({
                                payload: json,
                                error:   null,
                                status:  true
                            });
                        }
                    } catch (err) {
                        debug(err);
                        res.status(500).send({
                            payload: null,
                            error:   'Internal Server Error',
                            status:  false
                        });
                    }
                }
            });
        }
    };

    return e;
};