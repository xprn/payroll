const mongoose  = require('mongoose');
const speakeasy = require('speakeasy');
const qr        = require('qrcode');

class UserController {
    constructor(db) {
        Object.defineProperty(this, 'db', {
            value:    db,
            writable: false
        });
    }

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

    async createUser({username, email, password, first_name, last_name, group} = {}) {
        const User        = this.db.model('User');
        const AccessGroup = this.db.model('AccessGroup');
        const AccessFlag  = this.db.model('AccessFlag');

        if ('string' === typeof group) {
            if (mongoose.Types.ObjectId.isValid(group))
                group = new mongoose.Types.ObjectId(group);
            else
                return null;
        }
        else if (!group instanceof mongoose.Types.ObjectId) {
            return null;
        }

        if ('string' !== typeof username) return Promise.reject(new Error('Username must be a String'));
        if ('string' !== typeof email) return Promise.reject(new Error('Email must be a String'));
        if ('string' !== typeof password) return Promise.reject(new Error('Password must be a String'));
        if ('string' !== typeof first_name) return Promise.reject(new Error('First Name must be a String'));
        if ('string' !== typeof last_name) return Promise.reject(new Error('Last Name must be a String'));
        if (!group) return Promise.reject(new Error('Group must be an Object ID'));

        group = await AccessGroup.findOne({_id: group});

        if (!group)
            return Promise.reject(new Error('Access Group not found'));
        if (await User.count({username}))
            return Promise.reject(new Error('Username already taken'));
        if (await User.count({email}))
            return Promise.reject(new Error('Email already used'));

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
    }

    async updateUser(id, newData) {
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

        let user = await User.findOne({_id: id});

        if (user) {
            let same_username = 'string' === typeof newData.username ? await User.findOne({username: newData.username}) : null;
            let same_email    = 'string' === typeof newData.email ? await User.findOne({email: newData.email}) : null;

            if (same_username && same_username._id.toString() !== user._id.toString())
                return Promise.reject(new Error('Username already taken'));
            if (same_email && same_email._id.toString() !== user._id.toString())
                return Promise.reject(new Error('Email already used'));

            if ('object' !== typeof newData) newData = {};
            if ('string' === typeof newData.username) user.username = newData.username;
            if ('string' === typeof newData.email) user.email = newData.email;
            if ('string' === typeof newData.password) user.password = newData.password;
            if ('string' === typeof newData.first_name) user.first_name = newData.first_name;
            if ('string' === typeof newData.last_name) user.last_name = newData.last_name;
            if ('string' === typeof newData.group &&
                mongoose.Types.ObjectId.isValid(id) &&
                await AccessGroup.count({_id: newData.group = new mongoose.Types.ObjectId(newData.group)}))
                user.group = newData.group;

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
            return null;
        }
    }

    async deleteUser(id) {
        id = new mongoose.Types.ObjectId(id);
        if (!id instanceof mongoose.Types.ObjectId) return Promise.reject(new Error('ID must be a valid ObjectID'));

        let user = await this.db.model('User').findOne({_id: id});

        if (user) {
            await user.remove();
            return true;
        } else {
            return false;
        }
    }
}

module.exports.UserController = UserController;