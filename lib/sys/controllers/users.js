const mongoose  = require('mongoose');
const speakeasy = require('speakeasy');
const qr        = require('qrcode');

/**
 * The UserController
 */
class UserController {

    /**
     * @param {Connection} db The Mongoose MongoDB connection instance.
     */
    constructor(db) {
        Object.defineProperty(this, 'db', {
            value:    db,
            writable: false
        });
    }

    /**
     * Retrieves a list of users
     */
    async listUsers() {
        const User        = this.db.model('User');
        const AccessGroup = this.db.model('AccessGroup');
        const AccessFlag  = this.db.model('AccessFlag');

        let users  = await User.find();
        let groups = await AccessGroup.find();
        let flags  = await AccessFlag.find();

        return users.map(user => {
            user       = Object.assign({}, user._doc);
            user.group = groups.find(group => group._id.toString() === user.group.toString())._doc;
            user.flags = Array.from(new Set([...user.flags, ...user.group.flags]))
                .map(flag => flags.find(f => f._id.toString() === flag.toString()));
            return user;
        });
    }

    /**
     * Retrieves the data of a user with the specified login.
     * @param {string} login The username or email address of the user
     * @returns {Promise.<object|null>} An object containing the data of the user, or null on failure
     */
    async findUserByLogin(login) {
        const User        = this.db.model('User');
        const AccessGroup = this.db.model('AccessGroup');
        const AccessFlag  = this.db.model('AccessFlag');

        if ('string' !== typeof login) return null;

        let user  = await User.findOne({
            $or: [{username: login}, {email: login}]
        });
        let group = user ? await AccessGroup.findOne({_id: user.group}) : null;
        let flags = user && group && (user.flags.length + group.flags.length) > 0 ? await AccessFlag.find({
            $or: Array.from(new Set([...user.flags, ...group.flags])).map(_id => ({_id}))
        }) : [];

        return user ? Object.assign({}, user._doc, {
            group: group ? group._doc : null,
            flags: flags.map(flag => flag._doc)
        }) : null;
    }

    /**
     * Retrieves the data of a user with the specified ID.
     * @param {ObjectId|string} id The ID of the user.
     * @returns {Promise.<object|null>} An object containing the data of the user, or null on failure
     */
    async findUserByID(id) {
        const User        = this.db.model('User');
        const AccessGroup = this.db.model('AccessGroup');
        const AccessFlag  = this.db.model('AccessFlag');

        if ('string' === typeof id) {
            if (mongoose.Types.ObjectId.isValid(id))
                id = new mongoose.Types.ObjectId(id);
            else
                return null;
        }
        else if (!id instanceof mongoose.Types.ObjectId) {
            return null;
        }

        let user  = await User.findOne({_id: id});
        let group = user ? await AccessGroup.findOne({_id: user.group}) : null;
        let flags = user && group && (user.flags.length + group.flags.length) > 0 ? await AccessFlag.find({
            $or: Array.from(new Set([...user.flags, ...group.flags])).map(_id => ({_id}))
        }) : [];

        if (!user || !group) return null;

        return Object.assign({}, user._doc, {
            group: group._doc,
            flags: flags.map(flag => flag._doc)
        });
    }

    /**
     * Creates a new user.
     * @param {string} username The username of the user.
     * @param {string} email The email of the user.
     * @param {string} password The password hash for the user.
     * @param {string} first_name The first name of the user.
     * @param {string} last_name The last name of the user.
     * @param {ObjectId|string} group The ID of the group to assign to the user.
     * @returns {Promise.<object>} An object containing the data of the newly created user.
     * @rejects If there was a problem creating the user
     */
    async createUser({username, email, password, first_name, last_name, group} = {}) {
        const User        = this.db.model('User');
        const AccessGroup = this.db.model('AccessGroup');
        const AccessFlag  = this.db.model('AccessFlag');
        const fields      = {
            username:   {valid: true, unique: true},
            email:      {valid: true, unique: true},
            password:   {valid: true},
            first_name: {valid: true},
            last_name:  {valid: true},
            group:      {valid: true, exists: true}
        };

        if ('string' === typeof group) {
            if (mongoose.Types.ObjectId.isValid(group))
                group = new mongoose.Types.ObjectId(group);
            else
                group = null;
        }
        else if (!group instanceof mongoose.Types.ObjectId) {
            group = null;
        }

        if ('string' !== typeof username) fields.username.valid = fields.username.unique = false;
        if ('string' !== typeof email) fields.email.valid = fields.email.unique = false;
        if ('string' !== typeof password) fields.password.valid = false;
        if ('string' !== typeof first_name) fields.first_name.valid = false;
        if ('string' !== typeof last_name) fields.last_name.valid = false;
        if (!group) fields.group.valid = fields.group.exists = false;

        if (fields.group.valid)
            group = await AccessGroup.findOne({_id: group});

        if (await User.count({username}))
            fields.username.unique = false;
        if (await User.count({email}))
            fields.email.unique = false;

        if (
            fields.username.valid &&
            fields.username.unique &&
            fields.email.valid &&
            fields.email.unique &&
            fields.password.valid &&
            fields.first_name.valid &&
            fields.last_name.valid &&
            fields.group.valid &&
            fields.group.exists
        ) {
            let flags  = await AccessFlag.find({
                $or: group.flags.map(_id => ({_id}))
            });
            let secret = speakeasy.generateSecret();
            let image  = await new Promise((resolve, reject) =>
                qr.toDataURL(secret.otpauth_url, (err, img) => err ? reject(err) : resolve(img)));
            let user   = new User({
                username, email, password,
                first_name, last_name,
                group: group._id, secret: secret.base32
            });

            await user.save();

            return Object.assign({}, user._doc, {
                group:  group._doc,
                flags:  flags.map(flag => flag._doc),
                qr:     image,
                secret: secret
            });
        } else {
            let err  = new Error('Invalid Data');
            err.name = 'BAD_DATA';
            err.data = fields;
            return Promise.reject(err);
        }
    }

    /**
     * Updates a user.
     * @param {ObjectId|string} id The ID of the user to update.
     * @param {object} newData The new data.
     * @returns {Promise.<object|null>} An object containing the data of the user, or null on failure.
     * @rejects If there was a problem updating the data.
     */
    async updateUser(id, newData) {
        const User        = this.db.model('User');
        const AccessGroup = this.db.model('AccessGroup');
        const AccessFlag  = this.db.model('AccessFlag');
        const fields      = {
            username:   {changed: false, valid: true, unique: true},
            email:      {changed: false, valid: true, unique: true},
            password:   {changed: false, valid: true},
            first_name: {changed: false, valid: true},
            last_name:  {changed: false, valid: true},
            group:      {changed: false, valid: true, exists: true}
        };

        if ('object' !== typeof newData) newData = {};

        if ('string' === typeof id) {
            if (mongoose.Types.ObjectId.isValid(id))
                id = new mongoose.Types.ObjectId(id);
            else
                return null;
        }
        else if (!id instanceof mongoose.Types.ObjectId) {
            return null;
        }

        let user = await User.findOne({_id: id});

        if (user) {
            fields.username.changed   = newData.hasOwnProperty('username') && !!newData.username;
            fields.email.changed      = newData.hasOwnProperty('email') && !!newData.email;
            fields.password.changed   = newData.hasOwnProperty('password') && !!newData.password;
            fields.first_name.changed = newData.hasOwnProperty('first_name') && !!newData.first_name;
            fields.last_name.changed  = newData.hasOwnProperty('last_name') && !!newData.last_name;
            fields.group.changed      = newData.hasOwnProperty('group') && !!newData.group;

            let same_username = fields.username.changed ? await User.findOne({username: newData.username}) : null;
            let same_email    = fields.email.changed ? await User.findOne({email: newData.email}) : null;

            if (fields.username.changed && same_username && same_username._id.toString() !== user._id.toString())
                fields.username.unique = false;
            if (fields.email.changed && same_email && same_email._id.toString() !== user._id.toString())
                fields.email.unique = false;

            fields.username.valid   = !fields.username.changed || ('string' === typeof newData.username);
            fields.email.valid      = !fields.email.changed || ('string' === typeof newData.email);
            fields.password.valid   = !fields.password.changed || ('string' === typeof newData.password);
            fields.first_name.valid = !fields.first_name.changed || ('string' === typeof newData.first_name);
            fields.last_name.valid  = !fields.last_name.changed || ('string' === typeof newData.last_name);
            fields.group.valid      = !fields.group.changed || mongoose.Types.ObjectId.isValid(newData.group);

            if ('string' === typeof newData.group) newData.group = new mongoose.Types.ObjectId(newData.group);

            fields.group.exists = !fields.group.changed || (fields.group.valid && 0 < await AccessGroup.count({_id: newData.group}));

            if (
                (!fields.username.changed || fields.username.valid) &&
                (!fields.username.changed || fields.username.unique) &&
                (!fields.email.changed || fields.email.valid) &&
                (!fields.email.changed || fields.email.unique) &&
                (!fields.password.changed || fields.password.valid) &&
                (!fields.first_name.changed || fields.first_name.valid) &&
                (!fields.last_name.changed || fields.last_name.valid) &&
                (!fields.group.changed || fields.group.valid)
            ) {
                if (fields.username.changed) user.username = newData.username;
                if (fields.email.changed) user.email = newData.email;
                if (fields.password.changed) user.password = newData.password;
                if (fields.first_name.changed) user.first_name = newData.first_name;
                if (fields.last_name.changed) user.last_name = newData.last_name;
                if (fields.group.changed) user.group = newData.group;

                await user.save();

                let group = await AccessGroup.findOne({_id: user.group});
                let flags = user && group && (user.flags.length + group.flags.length) > 0 ? await AccessFlag.find({
                    $or: Array.from(new Set([...user.flags, ...group.flags])).map(_id => ({_id}))
                }) : [];

                return Object.assign({}, user._doc, {
                    group: group._doc,
                    flags: flags.map(flag => flag._doc)
                });
            } else {
                let err  = new Error('Invalid Data');
                err.name = 'BAD_DATA';
                err.data = fields;
                return Promise.reject(err);
            }
        } else {
            return null;
        }
    }

    /**
     * Deletes a user.
     * @param {ObjectId|string} id The ID of the user to delete
     * @returns {Promise.<boolean>} Whether or not the user was successfully found and deleted.
     */
    async deleteUser(id) {
        const User = this.db.model('User');
        let exists = true;

        id = new mongoose.Types.ObjectId(id);
        if (!id instanceof mongoose.Types.ObjectId) exists = false;

        let user = exists ? await User.findOne({_id: id}) : null;
        exists   = exists && !!user;

        if (exists) {
            await user.remove();
        } else {
            let err  = new Error('User Not Found');
            err.name = 'INVALID_USER';
            return Promise.reject(err);
        }
    }
}

module.exports.UserController = UserController;