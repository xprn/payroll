const mongoose = require('mongoose');

/**
 * The UserAccessController
 */
class UserAccessController {
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
     * Retrieves an array of all flags.
     */
    async listAccessFlags() {
        const AccessFlag = this.db.model('AccessFlag');

        let flags = await AccessFlag.find();

        return flags.map(flag => flag._doc);
    }

    /**
     * Assigns an individual access flag to an individual user.
     * @param {ObjectId|string} user_id The ID of the user to assign the flag to
     * @param {string} _flag The flag to assign
     */
    async assignAccessFlagToUser(user_id, _flag) {
        const User        = this.db.model('User');
        const AccessFlag  = this.db.model('AccessFlag');
        const AccessGroup = this.db.model('AccessGroup');

        if ('string' === typeof user_id) {
            if (mongoose.Types.ObjectId.isValid(user_id))
                user_id = new mongoose.Types.ObjectId(user_id);
            else
                return null;
        }
        else if (!user_id instanceof mongoose.Types.ObjectId) {
            return null;
        }

        let user  = await User.findOne({_id: user_id});
        let flag  = await AccessFlag.findOne({flag: _flag});
        let group = user ? await AccessGroup.findOne({_id: user.group}) : null;

        if (!user || !flag || !group) return null;

        if (!user.flags.find(f => f.toString() === flag._id.toString()))
            user.flags.push(flag._id);

        await user.save();
        let flags = user && group && (user.flags.length + group.flags.length) > 0 ? await AccessFlag.find({
            $or: Array.from(new Set([...user.flags, ...group.flags])).map(_id => ({_id}))
        }) : [];

        return Object.assign({}, user._doc, {
            group: group._doc,
            flags: flags.map(flag => flag._doc)
        });
    }

    /**
     * Unassigns an individual access flag from an individual user.
     * @param {ObjectId|string} user_id The ID of the user to unassign the flag from
     * @param {string} _flag The flag to unassign
     */
    async unassignAccessFlagToUser(user_id, _flag) {
        const User        = this.db.model('User');
        const AccessFlag  = this.db.model('AccessFlag');
        const AccessGroup = this.db.model('AccessGroup');

        if ('string' === typeof user_id) {
            if (mongoose.Types.ObjectId.isValid(user_id))
                user_id = new mongoose.Types.ObjectId(user_id);
            else
                return null;
        }
        else if (!user_id instanceof mongoose.Types.ObjectId) {
            return null;
        }

        let user  = await User.findOne({_id: user_id});
        let flag  = await AccessFlag.findOne({flag: _flag});
        let group = user ? await AccessGroup.findOne({_id: user.group}) : null;

        if (!user || !flag || !group) return null;

        let index = user.flags.findIndex(f => f.toString() === flag._id.toString());
        if (index >= 0) user.flags.splice(index, 1);

        await user.save();

        let flags = user && group && (user.flags.length + group.flags.length) > 0 ? await AccessFlag.find({
            $or: Array.from(new Set([...user.flags, ...group.flags])).map(_id => ({_id}))
        }) : [];

        return Object.assign({}, user._doc, {
            group: group._doc,
            flags: flags.map(flag => flag._doc)
        });
    }
}

module.exports.UserAccessController = UserAccessController;