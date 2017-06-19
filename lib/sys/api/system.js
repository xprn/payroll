/**
 * The API endpoints module for retrieving and modifying the system configuration.
 *
 * @param {RedisClient} redis The RedisClient instance
 * @returns {object} GET and PUT methods for the /api/system endpoint,
 *                      PUT method for the /api/system/:setting/:value endpoint,
 *                      and DELETE method for the /api/system/:setting endpoint
 */
module.exports = function (redis) {
    /** All keys stored on the Redis server */
    const redisKeys = new Set();
    const e         = {};

    /*
     * Get all keys from the redis configuration and cache them
     * TODO Create a better system for the configuration which is manually reloadable
     */
    redis.keysAsync('*')
        .then(keys => keys.forEach(key => redisKeys.add(key)));

    /**
     * The GET /api/system endpoint.
     * Retrieves the current system configuration.
     */
    e['GET /'] = function (req, res) {
        let settings = req.query['settings'] ? req.query['settings'].split(',').filter(a => !!a) : Array.from(redisKeys);
        Promise.reduce(Array.from(new Set(settings)), async (data, key) => {
            let value = await redis.getAsync(key);
            if (value) data[key] = value;
            return data;
        }, {}).then(values => res.status(200).send({
            payload: values,
            error:   null,
            status:  true
        }));
    };
    /**
     * The PUT /api/system endpoint.
     * Updates the current system configuration using the request body as the set of new configuration settings.
     */
    e['PUT /'] = function (req, res) {
        if ('object' !== typeof req.body || Array.isArray(req.body) || null === req.body) {
            res.status(400).send({
                payload: null,
                error:   'Invalid data',
                status:  false
            });
        } else {
            let entries = Object.entries(req.body);
            let keys    = [];
            let error   = null;

            entries.forEach(([key, value]) => {
                if (!error) {
                    if ('string' !== typeof key) {
                        error = 'Invalid key type: Only string is allowed';
                    } else if (!/^string|boolean|number$/.test(typeof value)) {
                        error = 'Invalid value type: Only string, boolean, and number are allowed';
                    } else {
                        keys.push(key);
                    }
                }
            });

            if (!error) {
                keys.forEach(key => redisKeys.add(key));

                Promise.reduce(keys, async (data, key) => {
                    await redis.setAsync(key, data[key] = req.body[key].toString());
                    return data;
                }, {}).then(values => res.status(200).send({
                    payload: values,
                    error:   null,
                    status:  true
                }));
            } else {
                res.status(400).send({
                    payload: null,
                    error:   error,
                    status:  false
                });
            }
        }
    };
    /**
     * The PUT /api/system/:setting/:value endpoint.
     * Updates the current system configuration using the 'setting' and 'value' URL parameters.
     */
    e['PUT /:setting/:value'] = function (req, res) {
        let setting = req.params['setting'];
        let value   = req.params['value'];
        let data    = {};
        let error   = null;

        if ('string' !== typeof setting) {
            error = 'Invalid key type: Only string is allowed';
        } else if (!/^string|boolean|number$/.test(typeof value)) {
            error = 'Invalid value type: Only string, boolean, and number are allowed';
        } else {
            data[setting] = value;
        }

        if (!error) {
            redisKeys.add(setting);
            redis.setAsync(setting, value.toString())
                .then(() => res.status(200).send({
                    payload: data,
                    error:   null,
                    status:  true
                }));
        } else {
            res.status(400).send({
                payload: null,
                error:   error,
                status:  false
            });
        }
    };
    /**
     * The DELETE /api/system/:settings endpoint.
     * Updates the current system configuration by deleting the settings specified in the comma-separated 'settings' query parameter.
     */
    e['DELETE /'] = function (req, res) {
        const settings = req.query['settings'].split(',').filter(s => !!s);
        Promise.all(settings.map(setting =>
            Promise.resolve()
                .then(() => redis.delAsync(setting))
                .then(() => redisKeys.delete(setting))))
            .then(() => res.status(200).send({
                payload: null,
                error:   null,
                status:  true
            }));
    };

    return e;
};