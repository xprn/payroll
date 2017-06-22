const mongoose = require('mongoose');
const debug    = require('debug')('payroll:mongoose:config');
const Promise  = require('bluebird');

/**
 * The configuration and setup module for the Mongoose MongoDB connection.
 * @param {Connection} db The Mongoose MongoDB connection instance.
 */
module.exports = function (db) {
    /** The User model */
    const User        = db.model('User', new mongoose.Schema({
        username:   {
            type:     String,
            required: true
        },
        email:      {
            type:     String,
            required: true
        },
        password:   {
            type:     String,
            required: true
        },
        first_name: {
            type:     String,
            required: true
        },
        last_name:  {
            type:     String,
            required: true
        },
        group:      {
            type:     mongoose.Schema.Types.ObjectId,
            ref:      'AccessGroup',
            required: true
        },
        flags:      [{
            type:     mongoose.Schema.Types.ObjectId,
            ref:      'AccessFlag',
            required: true
        }],
        secret:     {
            type:     String,
            required: true
        }
    }));
    /** The AccessGroup model */
    const AccessGroup = db.model('AccessGroup', new mongoose.Schema({
        tag:         {
            type:     String,
            required: true
        },
        name:        {
            type:     String,
            required: true
        },
        description: {
            type:     String,
            required: true
        },
        flags:       [{
            type:     mongoose.Schema.Types.ObjectId,
            ref:      'AccessFlag',
            required: true
        }]
    }));
    /** The AccessFlag model */
    const AccessFlag  = db.model('AccessFlag', new mongoose.Schema({
        flag:        {
            type:     String,
            required: true
        },
        name:        {
            type:     String,
            required: true
        },
        description: {
            type:     String,
            required: true
        }
    }));

    /**
     * Create all predefined access groups and the flags associated with them.
     */
    return Promise.all(Object.entries({
        'user':  {
            tag:         'user',
            name:        'User',
            description: 'Gives basic privileges to user',
            flags:       [
                {
                    flag:        'use_statistics_api',
                    name:        'Use the Statistics API',
                    description: 'Gives the user permission to use the Statistics API'
                },
                {
                    flag:        'use_holiday_api',
                    name:        'Use the Holiday API',
                    description: 'Gives the user permission to use the Holiday API'
                },
                {
                    flag:        'use_event_api',
                    name:        'Use the Work Event Generation API',
                    description: 'Gives the user permission to use the Work Event Generation API'
                },
                {
                    flag:        'read_users',
                    name:        'View users',
                    description: 'Gives the user permission to view all users within the platform'
                }
            ]
        },
        'admin': {
            tag:         'admin',
            name:        'Administrators',
            description: 'Gives administrative privileges to user',
            flags:       [
                {
                    flag:        'use_statistics_api',
                    name:        'Use the Statistics API',
                    description: 'Gives the user permission to use the Statistics API'
                },
                {
                    flag:        'use_holiday_api',
                    name:        'Use the Holiday API',
                    description: 'Gives the user permission to use the Holiday API'
                },
                {
                    flag:        'use_event_api',
                    name:        'Use the Work Event Generation API',
                    description: 'Gives the user permission to use the Work Event Generation API'
                },
                {
                    flag:        'read_system_config',
                    name:        'View the system configuration',
                    description: 'Gives the user permission to view the system configuration'
                },
                {
                    flag:        'write_system_config',
                    name:        'Update the system configuration',
                    description: 'Gives the user permission to update the system configuration'
                },
                {
                    flag:        'read_users',
                    name:        'View users',
                    description: 'Gives the user permission to view all users within the platform'
                },
                {
                    flag:        'write_users',
                    name:        'Create and update users',
                    description: 'Gives the user permission to create, update, and delete users within the platform'
                },
                {
                    flag:        'read_access_groups',
                    name:        'View access groups',
                    description: 'Gives the user permission to create, update, and delete access groups'
                },
                {
                    flag:        'write_access_groups',
                    name:        'Create, update, and delete access groups',
                    description: 'Gives the user permission to create, update, and delete access groups'
                },
            ]
        }
    }).map(async ([tag, groupData]) => {
        let flags = await Promise.reduce(groupData.flags, async (flags, {flag, name, description}) => {
            let f = await AccessFlag.findOne({flag});
            if (!f) {
                debug(`Flag ${flag} does not exist, creating`);
                await (f = new AccessFlag({flag, name, description})).save();
            }

            flags.push(f._id);
            return flags;
        }, []);
        let group = await AccessGroup.findOne({tag});

        if (!group) {
            debug(`Access Group '${groupData.name}' does not exist, creating`);
            await (new AccessGroup({
                tag:         tag,
                name:        groupData.name,
                description: groupData.description,
                flags:       flags
            })).save();
        } else {
            group.flags = Array.from(new Set([...group.flags, ...flags]));
            await group.save();
        }
    }));
};