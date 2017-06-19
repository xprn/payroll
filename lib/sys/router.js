const URL          = require('url');
const pathToRegExp = require('path-to-regexp');

function cleanRouteData(route) {
    return {
        method:      route.method.toUpperCase(),
        endpoint:    route.endpoint.toLowerCase(),
        description: route.description,
        data:        {
            query:   Object.entries(route.data.query).reduce((obj, [k, {description, required, defaultValue}]) => {
                obj[k.toString()] = {
                    description: description.toString(),
                    required:    Boolean(required),
                    default:     defaultValue
                };
                return obj;
            }, {}),
            params:  Object.entries(route.data.params).reduce((obj, [k, {description, required, defaultValue}]) => {
                obj[k.toString()] = {
                    description: description.toString(),
                    required:    Boolean(required),
                    default:     defaultValue
                };
                return obj;
            }, {}),
            headers: Object.entries(route.data.headers).reduce((obj, [k, {description, required, defaultValue}]) => {
                obj[k.toString()] = {
                    description: description.toString(),
                    required:    Boolean(required),
                    default:     defaultValue
                };
                return obj;
            }, {}),
            body:    Object.entries(route.data.body).reduce((obj, [k, {description, required, defaultValue}]) => {
                obj[k.toString()] = {
                    description: description.toString(),
                    required:    Boolean(required),
                    default:     defaultValue
                };
                return obj;
            }, {})
        }
    }
}

module.exports = function (root) {
    const routes = [];

    let authController = null;
    let authHeader     = null;

    const getRoutes = () => routes.slice().map(cleanRouteData);
    const auth      = (controller, header) => {
        authController = controller;
        authHeader     = header;
    };
    const route     = (method, endpoint) => {
        let container = {
            method:       method.toUpperCase(),
            endpoint:     (root + endpoint).toLowerCase(),
            description:  '',
            authenticate: (req, res, next) => next(),
            validate:     (req, res, next) => next(),
            handle:       (req, res) => res.status(501).send({
                payload: null,
                error:   'Not Implemented',
                status:  false
            }),
            data:         {
                query:   {},
                params:  {},
                headers: {},
                body:    {}
            }
        };
        routes.push(container);

        let mod = {
            route:       route,
            description: description => {
                container.description = description;
                return mod;
            },
            handler:     handler => {
                container.handle = handler;
                return mod;
            },
            query:       (query, description = '', required = true, defaultValue = null) => {
                container.data.query[query] = {description, required, defaultValue};
                return mod;
            },
            param:       (param, description = '', required = true, defaultValue = null) => {
                container.data.params[param] = {description, required, defaultValue};
                return mod;
            },
            header:      (header, description = '', required = true, defaultValue = null) => {
                container.data.headers[header] = {description, required, defaultValue};
                return mod;
            },
            body:        (field, description = '', required = true, defaultValue = null) => {
                container.data.body[field] = {description, required, defaultValue};
                return mod;
            },
            auth:        (flag) => {
                container.authenticate = async (req, res, next) => {
                    let token = req.headers[authHeader];
                    if (await authController.isTokenAuthorized(token, flag)) next();
                    else res.status(401).send({
                        payload: null,
                        error:   'Unauthorized',
                        status:  false
                    });
                };
                return mod;
            },
            validation:  descriptor => {
                container.validate = (req, res, next) => {
                    let errors = [];

                    // Query validation
                    Object.entries(container.data.query)
                        .forEach(([query, {required}]) => {
                            if (required) {
                                if (!req.query.hasOwnProperty(query))
                                    errors.push(`Missing required query parameter '${query}'`);
                            }
                        });
                    // Header validation
                    Object.entries(container.data.headers)
                        .forEach(([header, {required}]) => {
                            if (required) {
                                if (!req.headers.hasOwnProperty(header))
                                    errors.push(`Missing required header '${header}'`);
                            }
                        });
                    // Body validation
                    Object.entries(container.data.body)
                        .forEach(([field, {required}]) => {
                            if (required) {
                                if (!req.body.hasOwnProperty(field))
                                    return errors.push(`Missing required field '${field}'`);
                            }
                            if (descriptor && descriptor[field] && req.body[field]) {
                                switch (descriptor[field].type) {
                                    case 'string':
                                        if ('string' !== typeof req.body[field])
                                            errors.push(`Invalid type '${typeof req.body[field]}' for '${field}': Required 'string'`);
                                        break;
                                    case 'number':
                                        if ('number' !== typeof req.body[field] || isNaN(req.body[field]) || !isFinite(req.body[field]))
                                            errors.push(`Invalid type '${typeof req.body[field]}' for '${field}': Required 'number'`);
                                        else if (descriptor[field].hasOwnProperty('min') && req.body[field] < descriptor[field].min)
                                            errors.push(`Invalid value '${req.body[field]}' for '${field}': Must be above '${descriptor[field].min}'`);
                                        else if (descriptor[field].hasOwnProperty('max') && req.body[field] > descriptor[field].max)
                                            errors.push(`Invalid value '${req.body[field]}' for '${field}': Must be below '${descriptor[field].max}'`);
                                        break;
                                    case 'boolean':
                                        if ('boolean' !== typeof req.body[field])
                                            errors.push(`Invalid type '${typeof req.body[field]}' for '${field}': Required 'boolean'`);
                                        break;
                                    case 'array':
                                        if (!Array.isArray(req.body[field]))
                                            errors.push(`Invalid type '${typeof req.body[field]}' for '${field}': Required 'array'`);
                                        else if (descriptor[field].hasOwnProperty('contents') && !req.body[field].reduce((result, value) => result && descriptor[field].contents.includes(typeof value), true))
                                            errors.push(`Invalid content for '${field}': Allowed content type${descriptor[field].contents.length > 1 ? 's are' : ' is'} ${descriptor[field].contents.map(type => `'${type}'`).join(', ')}`);
                                        break;
                                    case 'object':
                                        if ('object' !== typeof req.body[field])
                                            errors.push(`Invalid type '${typeof req.body[field]}' for '${field}': Required 'object'`);
                                        else if (descriptor[field].hasOwnProperty('keys')) {
                                            descriptor[field].keys.forEach(key => {
                                                if (!req.body[field].hasOwnProperty(key))
                                                    errors.push(`Missing field '${key}' from '${field}'`);
                                            });
                                        }
                                        break;
                                    default:
                                        throw new Error(`Invalid validation type: ${descriptor[field].type}`);
                                }
                            }
                        });

                    return errors.length > 0 ? res.status(400).send({
                        payload: errors,
                        error:   'Invalid Data',
                        status:  false
                    }) : next();
                };
                return mod;
            }
        };

        return mod;
    };
    const router    = (req, res, next) => {
        const method   = req.method.toUpperCase();
        const endpoint = URL.parse(req.originalUrl).pathname;
        const route    = routes.find(route => route.method === method && pathToRegExp(route.endpoint).test(endpoint));

        if (route) {
            const regex  = pathToRegExp(route.endpoint);
            const params = {
                keys:   (route.endpoint.match(/:((?!\/).)*/g) || []).map(k => k.substr(1)),
                values: regex.exec(endpoint).slice(1)
            };
            req.params   = params.keys.reduce((out, key, index) => {
                out[key] = params.values[index];
                return out;
            }, {});
            route.authenticate(req, res, () =>
                route.validate(req, res, () =>
                    route.handle(req, res)))
        } else next();
    };

    return {getRoutes, auth, route, router};
};