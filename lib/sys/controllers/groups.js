const mongoose = require('mongoose');

class UserAccessGroupController {
    constructor(db) {
        Object.defineProperty(this, 'db', {
            value:    db,
            writable: false
        });
    }

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

    async addFlagsToGroup(id, addFlags) {
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

        if (!Array.isArray(addFlags) || !(addFlags = addFlags.map(flag => {
                if ('string' === typeof flag) {
                    if (mongoose.Types.ObjectId.isValid(flag))
                        return new mongoose.Types.ObjectId(flag);
                    else
                        return null;
                }
                else if (!flag instanceof mongoose.Types.ObjectId) {
                    return null;
                }
            }))
                .reduce((result, flag) => result && !!flag, false)) return null;

        let group = await AccessGroup.findOne({_id: id});

        if (!group) return null;

        group.flags = Array.from(new Set([...group.flags, ...addFlags]));
        await group.save();

        let flags = group.flags.length > 0 ? await AccessFlag.find({
            $or: group.flags.map(_id => ({_id}))
        }) : [];

        return Object.assign({}, group._doc, {flags: flags.map(flag => flag._doc)});
    }

    async removeFlagsFromGroup(id, removeFlags) {
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

        if (!Array.isArray(removeFlags) || !(removeFlags = removeFlags.map(flag => {
                if ('string' === typeof flag) {
                    if (mongoose.Types.ObjectId.isValid(flag))
                        return new mongoose.Types.ObjectId(flag);
                    else
                        return null;
                }
                else if (!flag instanceof mongoose.Types.ObjectId) {
                    return null;
                }
            }))
                .reduce((result, flag) => result && !!flag, false)) return null;

        let group = await AccessGroup.findOne({_id: id});

        if (!group) return null;

        group.flags = group.flags.reduce((flags, flag) => {
            if (removeFlags.findIndex(f => f.toString() === flag.toString()) < 0)
                flags.push(flag);
            return flags;
        }, []);
        await group.save();

        let flags = group.flags.length > 0 ? await AccessFlag.find({
            $or: group.flags.map(_id => ({_id}))
        }) : [];

        return Object.assign({}, group._doc, {flags: flags.map(flag => flag._doc)});
    }

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