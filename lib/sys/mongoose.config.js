const mongoose = require('mongoose');
const debug    = require('debug')('payroll:mongoose:config');

module.exports = function (db) {
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

    return Promise.all(Object.entries({
        'user':  {
            tag:         'user',
            name:        'User',
            description: 'Gives basic privileges to user',
            flags:       [
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
                },
            ]
        },
        'admin': {
            tag:         'admin',
            name:        'Administrators',
            description: 'Gives administrative privileges to user',
            flags:       [
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
    }).map(async ([tag, group]) => {
        let flags = await Promise.reduce(group.flags, async (flags, {flag, name, description}) => {
            let f = await AccessFlag.findOne({flag});
            if (!f) {
                debug(`Flag ${flag} does not exist, creating`);
                await (f = new AccessFlag({flag, name, description})).save();
            }

            flags.push(f._id);
            return flags;
        }, []);

        if (!await AccessGroup.count({tag})) {
            debug(`Access Group '${group.name}' does not exist, creating`);
            await (new AccessGroup({
                tag:         tag,
                name:        group.name,
                description: group.description,
                flags:       flags
            })).save();
        }
    }));
};