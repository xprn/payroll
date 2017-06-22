const express = require('express');
const debug   = require('debug')('payroll:api');
const ROUTER  = require('../router')('/api');

const {UserController}               = require('../controllers/users');
const {UserAccessController}         = require('../controllers/access');
const {UserAuthenticationController} = require('../controllers/auth');
const {UserAccessGroupController}    = require('../controllers/groups');

/**
 * Creates the API router
 *
 * @param {System} sys The System instance
 * @returns {module} The Express.js router object
 */
module.exports = function (sys) {
    /** The express router containing all the API endpoints */
    const router = express.Router();

    /** The Redis client */
    const redis    = sys.redis;
    /** The MongoDB connection */
    const mongoose = sys.mongoose;

    /** The user controller */
    const userController = this.userController = new UserController(mongoose);
    /** The user access controller */
    const userAccessController = this.userAccessController = new UserAccessController(mongoose);
    /** The user authentication controller */
    const userAuthenticationController = this.userAuthenticationController = new UserAuthenticationController(mongoose, redis, userController);
    /** The access group controller */
    const userAccessGroupController = this.userAccessGroupController = new UserAccessGroupController(mongoose);

    /** The /api/holidays API endpoint */
    const holidayRoutes            = require('./holidays')();
    /** The /api/system API endpoints */
    const systemRoutes             = require('./system')(redis);
    /** The /api/users API endpoints*/
    const userRoutes               = require('./users')(userController);
    /** The /api/events API endpoint */
    const eventRoutes              = require('./events')();
    /** The /api/users/:user/flags API endpoints */
    const userAccessRoutes         = require('./users/access')(userAccessController);
    /** The /api/auth API endpoints */
    const userAuthenticationRoutes = require('./users/auth')(userAuthenticationController);
    /** The /api/groups API endpoints */
    const userAccessGroupRoutes    = require('./users/groups')(userAccessGroupController);
    /** The /api/flags API endpoints */
    const userAccessFlagRoutes     = require('./users/flags')(userAccessController);

    /* Set up API Endpoint authentication */
    ROUTER
        .auth(userAuthenticationController, 'x-access-token')

        /*
         * The GET /api endpoint.
         * Retrieves the list of available endpoints.
         */
        .route('get', '/')
        .description('Get all available endpoints')
        .handler((req, res) => res.status(200).send({
            payload: ROUTER.getRoutes(),
            error:   null,
            status:  true
        }))

        /*
         * The GET /api/statistics endpoint.
         * Retrieves the platform statistics.
         */
        .route('get', '/statistics')
        .description('Get the platform statistics')
        .header('x-access-token', 'The access token to use for checking authorization')
        .auth('use_statistics_api')
        .handler(async (req, res) => {
            let users  = await userController.listUsers();
            let groups = await userAccessGroupController.listGroups();
            let flags  = await userAccessController.listAccessFlags();

            let server_time = new Date();

            res.status(200).send({
                payload: [
                    [
                        {
                            id:    'server_date',
                            name:  'Current server date',
                            value: `${server_time.getDate() < 10 ? '0' + server_time.getDate() : server_time.getDate()}/` +
                                   `${(server_time.getMonth() + 1) < 10 ? '0' + (server_time.getMonth() + 1) : server_time.getMonth() + 1}/` +
                                   `${server_time.getFullYear()}`
                        },
                        {
                            id:    'server_time',
                            name:  'Current server time',
                            value: `${server_time.getHours() < 10 ? '0' + server_time.getHours() : server_time.getHours()}:` +
                                   `${server_time.getMinutes() < 10 ? '0' + server_time.getMinutes() : server_time.getMinutes()}`
                        }
                    ],
                    [
                        {
                            id:    'redis_status',
                            name:  'Redis status',
                            value: redis.connected ? 'Connected' : 'Disconnected'
                        },
                        {
                            id:    'redis_version',
                            name:  'Redis version',
                            value: redis && redis.server_info && redis.server_info.redis_version ?
                                       redis.server_info.redis_version : 'Not Installed'
                        }
                    ],
                    [
                        {
                            id:    'num_users',
                            name:  'Registered users',
                            value: users.length
                        },
                        {
                            id:    'num_groups',
                            name:  'Access groups',
                            value: groups.length
                        },
                        {
                            id:    'num_flags',
                            name:  'Access flags',
                            value: flags.length
                        }
                    ]
                ],
                error:   null,
                status:  true
            })
        })

        /*
         * The GET /api/holidays endpoint.
         * Retrieves the holidays for a country.
         */
        .route('get', '/holidays')
        .description('Get the holidays for a country')
        .query('year', 'The year to retrieve', false, 'The current year')
        .query('country', 'The 3-letter country code to retrieve')
        .header('x-access-token', 'The access token to use for checking authorization')
        .auth('use_holiday_api')
        .validation()
        .handler(holidayRoutes['GET /'])

        /*
         * The GET /api/system endpoint.
         * Retrieves the system configuration.
         */
        .route('get', '/system')
        .description('Get the current system configuration')
        .header('x-access-token', 'The access token to use for checking authorization')
        .auth('read_system_config')
        .handler(systemRoutes['GET /'])

        /*
         * The PUT /api/system endpoint.
         * Modifies the system configuration.
         */
        .route('PUT', '/system')
        .description('Update the current system configuration. Each field represents a new or updated setting')
        .header('x-access-token', 'The access token to use for checking authorization')
        .auth('write_system_config')
        .handler(systemRoutes['PUT /'])

        /*
         * The PUT /api/system/:setting/:value endpoint.
         * Modifies an individual system configuration setting
         */
        .route('PUT', '/system/:setting/:value')
        .description('Update the current system configuration')
        .header('x-access-token', 'The access token to use for checking authorization')
        .param('setting', 'The setting to create or update')
        .param('value', 'The value for the setting')
        .auth('write_system_config')
        .handler(systemRoutes['PUT /:setting/:value'])

        /*
         * The DELETE /api/system/:setting endpoint.
         * Removes a set of system configuration settings
         */
        .route('DELETE', '/system')
        .description('Remove settings from the current system configuration')
        .header('x-access-token', 'The access token to use for checking authorization')
        .query('settings', 'The comma-separated list of settings to remove', false, '')
        .auth('write_system_config')
        .handler(systemRoutes['DELETE /'])

        /*
         * The GET /api/users endpoint.
         * Retrieves an array of users and their data.
         */
        .route('get', '/users')
        .description('Get a list of all the users')
        .header('x-access-token', 'The access token to use for checking authorization')
        .auth('read_users')
        .handler(userRoutes['GET /'])

        /*
         * The POST /api/users endpoint.
         * Creates a new user.
         */
        .route('post', '/users')
        .description('Create a new user')
        .header('x-access-token', 'The access token to use for checking authorization')
        .body('username', 'The username that the user will use when authenticating')
        .body('email', 'The email address that the will be used for verification')
        .body('password', 'The password that the user will use when authenticating')
        .body('first_name', 'The user\'s first name')
        .body('last_name', 'The user\'s last name')
        .body('group', 'The group where the user will be assigned to')
        .validation({
            _skipBodyValidation: true,
            username:            {type: 'string'},
            email:               {type: 'string'},
            password:            {type: 'string'},
            first_name:          {type: 'string'},
            last_name:           {type: 'string'},
            group:               {type: 'string'}
        })
        .auth('write_users')
        .handler(userRoutes['POST /'])

        /*
         * The GET /api/users/:user endpoint.
         * Retrieves the data of an individual user.
         */
        .route('get', '/users/:user')
        .description('Get data about a certain user')
        .header('x-access-token', 'The access token to use for checking authorization')
        .param('user', 'The ID of the user to retrieve')
        .auth('read_users')
        .handler(userRoutes['GET /:user'])

        /*
         * The PUT /api/users/:user endpoint.
         * Updates the data of an individual user.
         */
        .route('put', '/users/:user')
        .description('Update the data of a certain user')
        .header('x-access-token', 'The access token to use for checking authorization')
        .param('user', 'The ID of the user to update')
        .body('username', 'The new username, or omitted to keep unchanged', false, null)
        .body('email', 'The new email address, or omitted to keep unchanged', false, null)
        .body('password', 'The new password, or omitted to keep unchanged', false, null)
        .body('first_name', 'The user\'s new first name, or omitted to keep unchanged', false, null)
        .body('last_name', 'The user\'s new last name, or omitted to keep unchanged', false, null)
        .body('group', 'The new group where the user will be assigned to, or omitted to keep unchanged', false, null)
        .validation({
            _skipBodyValidation: true,
            username:            {type: 'string'},
            email:               {type: 'string'},
            password:            {type: 'string'},
            first_name:          {type: 'string'},
            last_name:           {type: 'string'},
            group:               {type: 'string'}
        })
        .auth('write_users')
        .handler(userRoutes['PUT /:user'])

        /*
         * The DELETE /api/users/:user endpoint.
         * Deletes an individual user
         */
        .route('delete', '/users/:user')
        .description('Delete a certain user')
        .header('x-access-token', 'The access token to use for checking authorization')
        .param('user', 'The ID of the user to delete')
        .auth('write_users')
        .handler(userRoutes['DELETE /:user'])

        /*
         * The PUT /api/users/:user/flags/:flag endpoint.
         * Assigns an individual flag to an individual user.
         */
        .route('put', '/users/:user/flags/:flag')
        .description('Assign an individual flag to a certain user')
        .header('x-access-token', 'The access token to use for checking authorization')
        .param('user', 'The ID of the user to assign the flag to')
        .param('flag', 'The ID of the flag to assign the user')
        .auth('write_users')
        .handler(userAccessRoutes['PUT /:flag'])

        /*
         * The DELETE /api/users/:user/flags/:flag endpoint.
         * Unassigns an individual flag from an individual user
         */
        .route('delete', '/users/:user/flags/:flag')
        .description('Unassign an individual flag from a certain user')
        .header('x-access-token', 'The access token to use for checking authorization')
        .param('user', 'The ID of the user to unassign the flag from')
        .param('flag', 'The ID of the flag to unassign from the user')
        .auth('write_users')
        .handler(userAccessRoutes['DELETE /:flag'])

        /*
         * The GET /api/groups endpoint.
         * Retrieves an array of groups and their data.
         */
        .route('get', '/groups')
        .description('Get a list of all the access groups')
        .header('x-access-token', 'The access token to use for checking authorization')
        .auth('read_access_groups')
        .handler(userAccessGroupRoutes['GET /'])

        /*
         * The POST /api/groups.
         * Creates a new group.
         */
        .route('post', '/groups')
        .description('Create a new access group')
        .header('x-access-token', 'The access token to use for checking authorization')
        .body('tag', 'The tag for the access group')
        .body('name', 'The name for the access group')
        .body('description', 'The description for the access group')
        .validation({
            'tag':         {type: 'string'},
            'name':        {type: 'string'},
            'description': {type: 'string'}
        })
        .auth('write_access_groups')
        .handler(userAccessGroupRoutes['POST /'])

        /*
         * The GET /api/groups/:group endpoint.
         * Retrieves the data of an individual group.
         */
        .route('get', '/groups/:group')
        .description('Get data about a certain access group')
        .header('x-access-token', 'The access token to use for checking authorization')
        .param('group', 'The ID of the group to retrieve')
        .auth('read_access_groups')
        .handler(userAccessGroupRoutes['GET /:group'])

        /*
         * The PUT /api/groups/:group endpoint.
         * Updates the data of an individual group.
         */
        .route('put', '/groups/:group')
        .description('Update the data of a certain group')
        .header('x-access-token', 'The access token to use for checking authorization')
        .param('group', 'The ID of the group to update')
        .body('tag', 'The tag for the access group')
        .body('name', 'The name for the access group')
        .body('description', 'The description for the access group')
        .validation({
            'tag':         {type: 'string'},
            'name':        {type: 'string'},
            'description': {type: 'string'}
        })
        .auth('write_access_groups')
        .handler(userAccessGroupRoutes['PUT /:group'])

        /*
         * The PUT /api/groups/:group/flags/:flag endpoint.
         * Assigns an individual flag to an individual group.
         */
        .route('put', '/groups/:group/flags/:flag')
        .description('Assign an access flag to an access group')
        .header('x-access-token', 'The access token to use for checking authorization')
        .param('group', 'The ID of the group')
        .param('flag', 'The flag to be assigned')
        .auth('write_access_groups')
        .handler(userAccessGroupRoutes['PUT /:group/flags/:flag'])

        /*
         * The DELETE /api/groups/:group/flags/:flag endpoint.
         * Unassigns an individual flag from an individual group.
         */
        .route('delete', '/groups/:group/flags/:flag')
        .description('Unassign an access flag to an access group')
        .header('x-access-token', 'The access token to use for checking authorization')
        .param('group', 'The ID of the group')
        .param('flag', 'The flag to be assigned')
        .auth('write_access_groups')
        .handler(userAccessGroupRoutes['DELETE /:group/flags/:flag'])

        /*
         * The DELETE /api/groups/:group endpoint.
         * Deletes an individual group.
         */
        .route('delete', '/groups/:group')
        .description('Delete a group')
        .header('x-access-token', 'The access token to use for checking authorization')
        .param('group', 'The ID of the group to delete')
        .auth('write_access_groups')
        .handler(userAccessGroupRoutes['DELETE /:group'])

        /*
         * The GET /api/flags endpoint.
         * Retrieves an array of flags and their data.
         */
        .route('get', '/flags')
        .description('Get all access flags')
        .header('x-access-token', 'The access token to use for checking authorization')
        .auth('read_access_groups')
        .handler(userAccessFlagRoutes['GET /'])

        /*
         * The POST /api/events endpoint.
         * Generates work events.
         */
        .route('post', '/events')
        .header('x-access-token', 'The access token to use for checking authorization')
        .description('Generate a list of work events from an input')
        .body('name', 'The name of the employee about whom the data is generated')
        .body('holidays', 'The array of DD/MM/YYYY formatted dates representing personal holidays')
        .body('income', 'A numeric value representing the employee\'s monthly salary')
        .body('work_start', 'A hh:mm formatted time representing the time the employees starts work')
        .body('work_end', 'A hh:mm formatted time representing the time the employees finishes work')
        .body('lunch_start', 'A hh:mm formatted time representing the time the employees leaves for lunch')
        .body('lunch_end', 'A hh:mm formatted time representing the time the employees arrives from lunch')
        .body('work_days', 'An array of numbers representing the days on which the employee works (1-7)')
        .body('period', 'An object containing two DD/MM/YYYY values, from and to, representing the period of generation')
        .body('payment_day', 'A numeric value representing the day of each month on which all payments are made')
        .body('payment_time', 'A hh:mm formatted time representing the time when all payments are made')
        .body('country', 'The 3-letter country code for the employee')
        .body('currency', 'The currency in which the employee is paid in')
        .body('public_holidays', 'An array containing public holidays retrieved from the /holidays API endpoint')
        .validation({
            name:            {type: 'string'},
            holidays:        {type: 'array', contents: ['string']},
            income:          {type: 'number', min: 0},
            work_start:      {type: 'string'},
            work_end:        {type: 'string'},
            lunch_start:     {type: 'string'},
            lunch_end:       {type: 'string'},
            work_days:       {type: 'array', contents: ['number']},
            period:          {type: 'object', keys: ['from', 'to']},
            payment_day:     {type: 'string'},
            payment_time:    {type: 'string'},
            country:         {type: 'string'},
            currency:        {type: 'string'},
            public_holidays: {type: 'array', contents: ['object']}
        })
        .auth('use_event_api')
        .handler(eventRoutes['POST /'])

        /*
         * The GET /api/auth endpoint.
         * Retrieves user data using an access token
         */
        .route('get', '/auth')
        .header('x-access-token', 'The access token to use for checking authorization')
        .description('Get the user data associated with an access token')
        .handler(userAuthenticationRoutes['GET /'])

        /*
         * The POST /api/flags endpoint.
         * Generates an access token
         */
        .route('post', '/auth')
        .description('Generate an access token')
        .body('login', 'The username or email')
        .body('password', 'The password')
        .body('token', 'The two-factor authentication token')
        .handler(userAuthenticationRoutes['POST /']);

    /* Use the API Endpoint Router's route handler middleware */
    router.use(ROUTER.router);

    /* The 400 Bad Request fallback handler */
    router.use((req, res) => res.status(400).send({
        payload: null,
        error:   'Bad Request',
        status:  false
    }));

    this.router = router;

    return this;
};