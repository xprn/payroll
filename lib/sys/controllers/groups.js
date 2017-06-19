const mongoose = require('mongoose');

/**
 * The UserAccessGroupController.
 */
class UserAccessGroupController {
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
     * Retrieves an array of access groups.
     */
    async listGroups() {
        const AccessGroup = this.db.model('AccessGroup');
        const AccessFlag  = this.db.model('AccessFlag');

        let groups = await AccessGroup.find();
        let flags  = await AccessFlag.find();

        return groups.map(group => {
            group.flags = group.flags.map(flag => flags.find(f => f._id.toString() === flag.toString()));
            return group;
        });
    }

    /**
     * Retrieves the group with the specified ID.
     * @param {ObjectId|string} id The ID of the group to find.
     * @returns {Promise.<object|null>} An object containing the group data, or null on failure.
     */
    async findGroupByID(id) {
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

        let group = await AccessGroup.findOne({_id: id});
        let flags = group && group.flags.length > 0 ? await AccessFlag.find({
            $or: group.flags.map(_id => ({_id}))
        }) : [];

        return group ? Object.assign({}, group._doc, {flags: flags.map(flag => flag._doc)}) : null;
    }

    /**
     * Creates a new group.
     * @param {string} tag The tag for the group.
     * @param {string} name The name of the group.
     * @param {string} description The description of the group.
     * @returns {Promise} An object containing the data of the newly created group.
     */
    async createGroup({tag, name, description} = {}) {
        const AccessGroup = this.db.model('AccessGroup');

        if ('string' !== typeof tag) return Promise.reject(new Error('Tag is not a valid string'));
        if ('string' !== typeof name) return Promise.reject(new Error('Name is not a valid string'));
        if ('string' !== typeof description) return Promise.reject(new Error('Description is not a valid string'));
        if (await AccessGroup.count({tag})) return Promise.reject(new Error('An Access Group with that tag already exists'));
        if (await AccessGroup.count({name})) return Promise.reject(new Error('An Access Group with that name already exists'));

        let group = new AccessGroup({tag, name, description});

        await group.save();

        return Object.assign({}, group._doc, {flags: []});
    }

    /**
     * Updates the data of a group.
     * @param {ObjectId|string} id The ID of the group to update.
     * @param {object} newData The object containing the new data.
     * @returns {Promise.<object|null>} An object containing the new data of the group, or null on failure.
     * @rejects If there was a problem updating the group
     */
    async updateGroup(id, newData) {
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

        let group = await AccessGroup.findOne({_id: id});
        let flags = group && group.flags.length > 0 ? await AccessFlag.find({
            $or: group.flags.map(_id => ({_id}))
        }) : [];

        if (!group) return null;

        if ('string' === typeof newData.tag) {
            let same = await AccessGroup.count({tag: newData.tag});
            if (same.length > 0) return Promise.reject(new Error('Access Group with that tag already exists'));
            else group.tag = newData.tag;
        }
        if ('string' === typeof newData.name) {
            let same = await AccessGroup.count({name: newData.name});
            if (same.length > 0) return Promise.reject(new Error('Access Group with that name already exists'));
            else group.name = newData.name;
        }
        if ('string' === typeof newData.description) group.description = newData.description;

        await group.save();

        return Object.assign({}, group._doc, {
            flags: flags.map(flag => flag._doc)
        });
    }

    /**
     * Assigns an access flag to a group.
     * @param {ObjectId|string} id The ID of the group.
     * @param {string} _flag The flag to assign.
     * @returns {Promise.<object|null>} An object containing the data of the group, or null on failure
     */
    async assignFlagToGroup(id, _flag) {
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

        let group = await AccessGroup.findOne({_id: id});
        let flag  = await AccessFlag.findOne({flag: _flag});

        if (!group || !flag) return null;

        group.flags = Array.from(new Set([...group.flags, flag._id]));
        await group.save();

        let flags = group.flags.length > 0 ? await AccessFlag.find({
            $or: group.flags.map(_id => ({_id}))
        }) : [];

        return Object.assign({}, group._doc, {flags: flags.map(flag => flag._doc)});
    }

    /**
     * Unassigns an access flag from a group.
     * @param {ObjectId|string} id The ID of the group.
     * @param {string} _flag The flag to unassign.
     * @returns {Promise.<object|null>} An object containing the data of the group, or null on failure.
     */
    async unassignFlagFromGroup(id, _flag) {
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

        let group = await AccessGroup.findOne({_id: id});
        let flag  = await AccessFlag.findOne({flag: _flag});

        if (!group || !flag) return null;

        group.flags = group.flags.reduce((flags, f) => {
            if (f.toString() !== flag._id.toString()) flags.push(f);
            return flags;
        }, []);
        await group.save();

        let flags = group.flags.length > 0 ? await AccessFlag.find({
            $or: group.flags.map(_id => ({_id}))
        }) : [];

        return Object.assign({}, group._doc, {flags: flags.map(flag => flag._doc)});
    }

    /**
     * Deletes a group.
     * @param {ObjectId|string} id The ID of the group to delete.
     * @returns {Promise.<boolean>} Whether or not the group was successfully found and deleted.
     */
    async deleteGroup(id) {
        const AccessGroup = this.db.model('AccessGroup');

        if ('string' === typeof id) {
            if (mongoose.Types.ObjectId.isValid(id))
                id = new mongoose.Types.ObjectId(id);
            else
                return null;
        }
        else if (!id instanceof mongoose.Types.ObjectId) {
            return null;
        }

        let group = await AccessGroup.findOne({_id: id});

        if (!group) {
            return false;
        } else {
            await group.remove();
            return true;
        }
    }
}

module.exports.UserAccessGroupController = UserAccessGroupController;