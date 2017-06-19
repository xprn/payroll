const chai    = require('chai');
const mocha   = require('mocha');
const request = require('request');

const speakeasy = require('speakeasy');
const bcrypt    = require('bcryptjs');

const mockSystem           = require('./mock/system');
const process_stdout_write = process.stdout.write.bind(process.stdout);

global.expect     = chai.expect;
global.describe   = mocha.describe;
global.it         = mocha.it;
global.before     = mocha.before;
global.beforeEach = mocha.beforeEach;
global.after      = mocha.after;
global.afterEach  = mocha.afterEach;
global.Promise    = require('bluebird');

global.disableLogging = function () {
    process.stdout.write = () => null;
};
global.enableLogging  = function () {
    process.stdout.write = process_stdout_write;
};

chai.use(require('chai-http'));

describe('All Tests', function () {
    this.timeout(60 * 1000);

    let system   = null;
    let agent    = null;
    let userData = {
        username:   'tester',
        password:   'password',
        email:      'tester@localhost',
        first_name: 'Tester',
        last_name:  'User'
    };
    let user     = null;
    let token    = null;
    let groups   = {};

    before(async () => {
        disableLogging();
        system = await mockSystem();
        enableLogging();

        groups = (await system._api.userAccessGroupController.listGroups()).reduce((groups, group) => {
            groups[group.tag] = group._id;
            return groups;
        }, {});
        user   = await system._api.userController.createUser(Object.assign({}, userData,
            {
                password: bcrypt.hashSync(userData.password, 10),
                group:    groups.admin
            }));
        agent  = chai.request.agent(system._handler);

        await system.initialize();

        await agent.post('/api/auth').send({
            login:    userData.username,
            password: userData.password,
            token:    speakeasy.totp({
                secret:   user.secret.base32,
                encoding: 'base32'
            })
        }).then(res => token = res.body.payload.token);
    });

    describe.skip('User API Tests', () => {
        let user        = null;
        let updateUser  = null;
        let createdUser = null;

        before((done) => {
            request('https://randomuser.me/api/?results=2', (err, res, body) => {
                let data   = JSON.parse(body).results[0];
                let data2  = JSON.parse(body).results[1];
                user       = {
                    username:   data.login.username,
                    email:      data.email,
                    password:   data.login.password,
                    first_name: data.name.first[0].toUpperCase() + data.name.first.substr(1).toLowerCase(),
                    last_name:  data.name.last[0].toUpperCase() + data.name.last.substr(1).toLowerCase(),
                    group:      groups.user
                };
                updateUser = {
                    username:   data2.login.username,
                    email:      data2.email,
                    password:   data2.login.password,
                    first_name: data2.name.first[0].toUpperCase() + data2.name.first.substr(1).toLowerCase(),
                    last_name:  data2.name.last[0].toUpperCase() + data2.name.last.substr(1).toLowerCase(),
                    group:      groups.user
                };
                done();
            });
        });

        it('should create a new user if all fields are valid', () => {
            return agent.post('/api/users')
                .set('x-access-token', token)
                .send(user)
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(200);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');

                    expect(res.body.payload).to.be.an('object')
                        .and.to.have.all.keys('id', 'username', 'email', 'first_name', 'last_name', 'qr', 'flags', 'group');
                    expect(res.body.payload.id).to.be.a('string');
                    expect(res.body.payload.username).to.be.a('string');
                    expect(res.body.payload.first_name).to.be.a('string');
                    expect(res.body.payload.last_name).to.be.a('string');
                    expect(res.body.payload.email).to.be.a('string');
                    expect(res.body.payload.qr).to.be.a('string');
                    expect(res.body.payload.group).to.be.an('object')
                        .and.to.have.all.keys('id', 'tag', 'name', 'description');
                    expect(res.body.payload.flags).to.be.an('array');
                    res.body.payload.flags.forEach(flag => {
                        expect(flag).to.be.an('object')
                            .and.to.have.all.keys('id', 'flag', 'name', 'description');
                        expect(flag.id).to.be.a('string');
                        expect(flag.flag).to.be.a('string');
                        expect(flag.name).to.be.a('string');
                        expect(flag.description).to.be.a('string');
                    });

                    expect(res.body.error).to.equal(null);
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(true);

                    createdUser = res.body.payload;
                    delete createdUser.qr;
                })
        });
        it('should retrieve a list of users', () => {
            return agent.get('/api/users')
                .set('x-access-token', token)
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(200);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.be.an('array')
                        .and.to.deep.include(createdUser);
                    expect(res.body.error).to.equal(null);
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(true);
                });
        });
        it('should retrieve a certain user', () => {
            return agent.get(`/api/users/${createdUser.id}`)
                .set('x-access-token', token)
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(200);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.be.an('object')
                        .and.to.have.all.keys('id', 'username', 'email', 'first_name', 'last_name', 'flags', 'group')
                        .and.to.deep.equal(createdUser);
                    expect(res.body.error).to.equal(null);
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(true);
                });
        });
        it('should assign the `write_users` flag to the user', () => {
            return agent.put(`/api/users/${createdUser.id}/flags/write_users`)
                .set('x-access-token', token)
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(200);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.be.an('object')
                        .and.to.have.all.keys('id', 'username', 'email', 'first_name', 'last_name', 'flags', 'group');
                    expect(res.body.payload.flags).to.be.an('array');
                    expect(res.body.payload.flags.find(flag => flag.flag === 'write_users')).to.be.an('object')
                        .and.to.have.all.keys('id', 'flag', 'name', 'description');
                    createdUser.flags.push(res.body.payload.flags.find(flag => flag.flag === 'write_users'));
                    expect(res.body.payload).to.deep.equal(createdUser);
                    expect(res.body.error).to.equal(null);
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(true);
                });
        });
        it('should unassign the `write_users` flag from the user', () => {
            let flag       = createdUser.flags.find(flag => flag.flag === 'write_users');
            let flag_index = createdUser.flags.findIndex(flag => flag.flag === 'write_users');

            expect(flag_index).to.be.a('number')
                .and.to.be.above(-1);

            if (flag_index >= 0)
                createdUser.flags.splice(flag_index, 1);

            return agent.delete(`/api/users/${createdUser.id}/flags/write_users`)
                .set('x-access-token', token)
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(200);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.be.an('object')
                        .and.to.have.all.keys('id', 'username', 'email', 'first_name', 'last_name', 'flags', 'group');
                    expect(res.body.payload.flags).to.be.an('array')
                        .and.to.not.deep.contain(flag);
                    expect(res.body.payload).to.deep.equal(createdUser);
                    expect(res.body.error).to.equal(null);
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(true);
                });
        });

        ['username', 'email', 'password', 'first_name', 'last_name'].forEach(field => {
            it(`should respond with a 400 Bad Request when missing the '${field}' field`, () => {
                let userData = Object.assign({}, user);
                delete userData[field];

                return agent.post('/api/users')
                    .set('x-access-token', token)
                    .send(userData)
                    .catch(err => err.response)
                    .then(res => {
                        expect(res.status).to.equal(400);
                        expect(res.body).to.be.an('object')
                            .and.to.have.all.keys('payload', 'error', 'status');
                        expect(res.body.payload).to.be.an('array')
                            .and.to.deep.contain(`Missing required field '${field}'`);
                        expect(res.body.error).to.be.a('string')
                            .and.to.equal('Invalid Data');
                        expect(res.body.status).to.be.a('boolean')
                            .and.to.equal(false);
                    });
            });
        });
        ['username', 'email', 'first_name', 'last_name'].forEach(field => {
            it(`should update the user's ${field}`, () => {
                let data           = {};
                createdUser[field] = data[field] = updateUser[field];

                return agent.put(`/api/users/${createdUser.id}`)
                    .set('x-access-token', token)
                    .send(data)
                    .catch(err => err.response)
                    .then(res => {
                        expect(res.status).to.equal(200);
                        expect(res.body).to.be.an('object')
                            .and.to.have.all.keys('payload', 'error', 'status');
                        expect(res.body.payload).to.be.an('object')
                            .and.to.have.all.keys('id', 'username', 'email', 'first_name', 'last_name', 'flags', 'group')
                            .and.to.deep.equal(createdUser);
                        expect(res.body.error).to.equal(null);
                        expect(res.body.status).to.be.a('boolean')
                            .and.to.equal(true);
                    });
            });
        });

        it('should respond with a 401 Unauthorized when attempting to create a new user without specifying an access token', () => {
            return agent.post('/api/users')
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(401);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.equal(null);
                    expect(res.body.error).to.be.a('string')
                        .and.to.equal('Unauthorized');
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(false);
                });
        });
        it('should respond with a 401 Unauthorized when attempting to retrieve a list of users without specifying an access token', () => {
            return agent.get('/api/users')
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(401);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.equal(null);
                    expect(res.body.error).to.be.a('string')
                        .and.to.equal('Unauthorized');
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(false);
                });
        });
        it('should respond with a 401 Unauthorized when attempting to retrieve a certain user without specifying an access token', () => {
            return agent.get(`/api/users/${createdUser.id}`)
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(401);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.equal(null);
                    expect(res.body.error).to.be.a('string')
                        .and.to.equal('Unauthorized');
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(false);
                });
        });
        it('should respond with a 401 Unauthorized when attempting to update a user without specifying an access token', () => {
            return agent.put(`/api/users/${createdUser.id}`)
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(401);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.equal(null);
                    expect(res.body.error).to.be.a('string')
                        .and.to.equal('Unauthorized');
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(false);
                });
        });
        it('should respond with a 401 Unauthorized when attempting to assign a flag to a user without specifying an access token', () => {
            return agent.put(`/api/users/${createdUser.id}/flags/read_users`)
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(401);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.equal(null);
                    expect(res.body.error).to.be.a('string')
                        .and.to.equal('Unauthorized');
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(false);
                });
        });
        it('should respond with a 401 Unauthorized when attempting to unassign a flag to a user without specifying an access token', () => {
            return agent.delete(`/api/users/${createdUser.id}/flags/read_users`)
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(401);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.equal(null);
                    expect(res.body.error).to.be.a('string')
                        .and.to.equal('Unauthorized');
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(false);
                });
        });
        it('should respond with a 401 Unauthorized when attempting to delete a user without specifying an access token', () => {
            return agent.delete(`/api/users/${createdUser.id}`)
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(401);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.equal(null);
                    expect(res.body.error).to.be.a('string')
                        .and.to.equal('Unauthorized');
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(false);
                });
        });

        it('should delete the user', () => {
            return agent.delete(`/api/users/${createdUser.id}`)
                .set('x-access-token', token)
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(200);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.equal(null);
                    expect(res.body.error).to.equal(null);
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(true);
                })
                .then(() => agent.get(`/api/users/${createdUser.id}`)
                    .set('x-access-token', token)
                    .catch(err => err.response)
                    .then(res => {
                        expect(res.status).to.equal(404);
                        expect(res.body).to.be.an('object')
                            .and.to.have.all.keys('payload', 'error', 'status');
                        expect(res.body.payload).to.equal(null);
                        expect(res.body.error).to.be.a('string')
                            .and.to.equal('User not found');
                        expect(res.body.status).to.be.a('boolean')
                            .and.to.equal(false);
                    }));
        });
    });
    describe.skip('Platform API Tests', () => {
        it('should retrieve all the settings', () => {
            return agent.get('/api/system')
                .set('x-access-token', token)
                .then(res => {
                    expect(res.status).to.equal(200);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.be.an('object');
                    expect(Object.keys(res.body.payload)).to.be.an('array')
                        .and.to.be.empty;
                    expect(res.body.error).to.equal(null);
                });
        });
        it(`should respond with a 401 Unauthorized when attempting to retrieve all settings without specifying an access token`, () => {
            return agent.get(`/api/system`)
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(401);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.equal(null);
                    expect(res.body.error).to.be.a('string')
                        .and.to.equal('Unauthorized');
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(false);
                });
        });
        [
            ['foo', '1'],
            ['bar', '2'],
            ['baz', '3']
        ]
            .forEach(([setting, value]) => {
                let data      = {};
                data[setting] = value;

                it(`should set '${setting}' to '${value}'`, () => {
                    return agent.put('/api/system')
                        .set('x-access-token', token)
                        .send(data)
                        .then(res => {
                            expect(res.status).to.equal(200);
                            expect(res.body).to.be.an('object')
                                .and.to.have.all.keys('payload', 'error', 'status');
                            expect(res.body.payload).to.be.an('object')
                                .and.to.have.all.keys(setting);
                            expect(res.body.payload[setting]).to.be.a('string').and.equal(value);
                            expect(res.body.error).to.equal(null);
                        });
                });
                it(`should verify that '${setting}' is set to '${value}'`, () => {
                    return agent.get('/api/system/')
                        .set('x-access-token', token)
                        .query({settings: setting})
                        .then(res => {
                            expect(res.status).to.equal(200);
                            expect(res.body).to.be.an('object')
                                .and.to.have.all.keys('payload', 'error', 'status');
                            expect(res.body.payload).to.be.an('object')
                                .and.to.have.all.keys(setting);
                            expect(res.body.payload[setting]).to.be.a('string').and.equal(value);
                            expect(res.body.error).to.equal(null);
                        });
                });
                it(`should update the value of '${setting}' to '${value + value}'`, () => {
                    return agent.put(`/api/system/${setting}/${value + value}`)
                        .set('x-access-token', token)
                        .then(res => {
                            expect(res.status).to.equal(200);
                            expect(res.body).to.be.an('object')
                                .and.to.have.all.keys('payload', 'error', 'status');
                            expect(res.body.payload).to.be.an('object')
                                .and.to.have.all.keys(setting);
                            expect(res.body.payload[setting]).to.be.a('string').and.equal(value + value);
                            expect(res.body.error).to.equal(null);
                        });
                });
                it(`should verify that '${setting}' was updated to '${value + value}'`, () => {
                    return agent.get('/api/system/')
                        .set('x-access-token', token)
                        .then(res => {
                            expect(res.status).to.equal(200);
                            expect(res.body).to.be.an('object')
                                .and.to.have.all.keys('payload', 'error', 'status');
                            expect(res.body.payload).to.be.an('object')
                                .and.to.have.any.keys(setting);
                            expect(res.body.payload[setting]).to.be.a('string').and.equal(value + value);
                            expect(res.body.error).to.equal(null);
                        });
                });
                it(`should remove '${setting}'`, () => {
                    return agent.delete(`/api/system/${setting}`)
                        .set('x-access-token', token)
                        .then(res => {
                            expect(res.status).to.equal(200);
                            expect(res.body).to.be.an('object')
                                .and.to.have.all.keys('payload', 'error', 'status');
                            expect(res.body.payload).to.equal(null);
                            expect(res.body.error).to.equal(null);
                            expect(res.body.status).to.be.a('boolean')
                                .and.to.equal(true);
                        });
                });
                it(`should verify that '${setting}' was removed`, () => {
                    return agent.get('/api/system/')
                        .set('x-access-token', token)
                        .then(res => {
                            expect(res.status).to.equal(200);
                            expect(res.body).to.be.an('object')
                                .and.to.have.all.keys('payload', 'error', 'status');
                            expect(res.body.payload).to.be.an('object')
                                .and.to.not.have.any.keys(setting);
                            expect(res.body.error).to.equal(null);
                        });
                });

                it(`should respond with a 401 Unauthorized when attempting to set '${setting}' to '${value}' without specifying an access token`, () => {
                    let data      = {};
                    data[setting] = value;

                    return agent.put(`/api/system`)
                        .send(data)
                        .catch(err => err.response)
                        .then(res => {
                            expect(res.status).to.equal(401);
                            expect(res.body).to.be.an('object')
                                .and.to.have.all.keys('payload', 'error', 'status');
                            expect(res.body.payload).to.equal(null);
                            expect(res.body.error).to.be.a('string')
                                .and.to.equal('Unauthorized');
                            expect(res.body.status).to.be.a('boolean')
                                .and.to.equal(false);
                        });
                });
                it(`should respond with a 401 Unauthorized when attempting to set '${setting}' to '${value}' individually without specifying an access token`, () => {
                    return agent.put(`/api/system/${setting}/${value}`)
                        .catch(err => err.response)
                        .then(res => {
                            expect(res.status).to.equal(401);
                            expect(res.body).to.be.an('object')
                                .and.to.have.all.keys('payload', 'error', 'status');
                            expect(res.body.payload).to.equal(null);
                            expect(res.body.error).to.be.a('string')
                                .and.to.equal('Unauthorized');
                            expect(res.body.status).to.be.a('boolean')
                                .and.to.equal(false);
                        });
                });
                it(`should respond with a 401 Unauthorized when attempting to get the value of '${setting}' without specifying an access token`, () => {
                    return agent.put(`/api/system`)
                        .query({settings: setting})
                        .catch(err => err.response)
                        .then(res => {
                            expect(res.status).to.equal(401);
                            expect(res.body).to.be.an('object')
                                .and.to.have.all.keys('payload', 'error', 'status');
                            expect(res.body.payload).to.equal(null);
                            expect(res.body.error).to.be.a('string')
                                .and.to.equal('Unauthorized');
                            expect(res.body.status).to.be.a('boolean')
                                .and.to.equal(false);
                        });
                });
                it(`should respond with a 401 Unauthorized when attempting to delete '${setting}' without specifying an access token`, () => {
                    return agent.delete(`/api/system/${setting}`)
                        .catch(err => err.response)
                        .then(res => {
                            expect(res.status).to.equal(401);
                            expect(res.body).to.be.an('object')
                                .and.to.have.all.keys('payload', 'error', 'status');
                            expect(res.body.payload).to.equal(null);
                            expect(res.body.error).to.be.a('string')
                                .and.to.equal('Unauthorized');
                            expect(res.body.status).to.be.a('boolean')
                                .and.to.equal(false);
                        });
                });
            });
    });
    describe.skip('Authentication API Tests', () => {
        it('should respond with a 401 Unauthorized when attempting to retrieve the user data without specifying an access token', () => {
            return agent.get('/api/auth')
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(401);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.equal(null);
                    expect(res.body.error).to.be.a('string')
                        .and.to.equal('Unauthorized');
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(false);
                });
        });
        it('should retrieve the user data for the access token', () => {
            return agent.get('/api/auth')
                .set('x-access-token', token)
                .then(res => {
                    expect(res.status).to.equal(200);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');

                    expect(res.body.payload).to.be.an('object')
                        .and.to.have.all.keys('id', 'username', 'email', 'first_name', 'last_name', 'group', 'flags');

                    expect(res.body.payload.id).to.be.a('string')
                        .and.to.equal(user._id.toString());
                    expect(res.body.payload.username).to.be.a('string')
                        .and.to.equal(user.username);
                    expect(res.body.payload.email).to.be.a('string')
                        .and.to.equal(user.email);
                    expect(res.body.payload.first_name).to.be.a('string')
                        .and.to.equal(user.first_name);
                    expect(res.body.payload.last_name).to.be.a('string')
                        .and.to.equal(user.last_name);
                    expect(res.body.payload.group).to.be.an('object')
                        .and.to.have.all.keys('id', 'tag', 'name', 'description');
                    expect(res.body.payload.flags).to.be.an('array');
                    res.body.payload.flags.forEach((flag, index) => {
                        let _flag = user.flags[index];

                        expect(flag).to.be.an('object')
                            .and.to.have.all.keys('id', 'flag', 'name', 'description');
                        expect(flag.id).to.be.a('string')
                            .and.to.equal(_flag._id.toString());
                        expect(flag.flag).to.be.a('string')
                            .and.to.equal(_flag.flag);
                        expect(flag.name).to.be.a('string')
                            .and.to.equal(_flag.name);
                        expect(flag.description).to.be.a('string')
                            .and.to.equal(_flag.description);
                    });

                    expect(res.body.error).to.equal(null);
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(true);
                });
        });

        it('should respond with a 401 Unauthorized when attempting to generate an access token with an invalid login', () => {
            return agent.post('/api/auth')
                .send({
                    login:    'invalid login',
                    password: userData.password,
                    token:    speakeasy.totp({
                        secret:   user.secret.base32,
                        encoding: 'base32'
                    })
                })
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(401);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.equal(null);
                    expect(res.body.error).to.be.a('string')
                        .and.to.equal('Unauthorized');
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(false);
                });
        });
        it('should respond with a 401 Unauthorized when attempting to generate an access token with an invalid password', () => {
            return agent.post('/api/auth')
                .send({
                    login:    userData.username,
                    password: 'invalid password',
                    token:    speakeasy.totp({
                        secret:   user.secret.base32,
                        encoding: 'base32'
                    })
                })
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(401);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.equal(null);
                    expect(res.body.error).to.be.a('string')
                        .and.to.equal('Unauthorized');
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(false);
                });
        });
        it('should respond with a 401 Unauthorized when attempting to generate an access token with an invalid two-factor authentication token', () => {
            return agent.post('/api/auth')
                .send({
                    login:    userData.username,
                    password: userData.password,
                    token:    'invalid token'
                })
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(401);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.equal(null);
                    expect(res.body.error).to.be.a('string')
                        .and.to.equal('Unauthorized');
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(false);
                });
        });

        it('should generate an access token when specifying the username as the login', () => {
            return agent.post('/api/auth')
                .send({
                    login:    userData.username,
                    password: userData.password,
                    token:    speakeasy.totp({
                        secret:   user.secret.base32,
                        encoding: 'base32'
                    })
                })
                .then(res => {
                    expect(res.status).to.equal(200);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');

                    expect(res.body.payload).to.be.an('object')
                        .and.to.have.all.keys('id', 'username', 'email', 'first_name', 'last_name', 'group', 'flags', 'token');
                    expect(res.body.payload.id).to.be.a('string')
                        .and.to.equal(user._id.toString());
                    expect(res.body.payload.username).to.be.a('string')
                        .and.to.equal(user.username);
                    expect(res.body.payload.email).to.be.a('string')
                        .and.to.equal(user.email);
                    expect(res.body.payload.first_name).to.be.a('string')
                        .and.to.equal(user.first_name);
                    expect(res.body.payload.last_name).to.be.a('string')
                        .and.to.equal(user.last_name);

                    expect(res.body.payload.group).to.be.an('object')
                        .and.to.have.all.keys('id', 'tag', 'name', 'description');
                    expect(res.body.payload.group.id).to.be.a('string')
                        .and.to.equal(user.group._id.toString());
                    expect(res.body.payload.group.tag).to.be.a('string')
                        .and.to.equal(user.group.tag);
                    expect(res.body.payload.group.name).to.be.a('string')
                        .and.to.equal(user.group.name);
                    expect(res.body.payload.group.description).to.be.a('string')
                        .and.to.equal(user.group.description);

                    expect(res.body.payload.flags).to.be.an('array');
                    res.body.payload.flags.forEach((flag, index) => {
                        let _flag = user.flags[index];
                        expect(flag).to.be.an('object')
                            .and.to.have.all.keys('id', 'flag', 'name', 'description');
                        expect(flag.id).to.be.a('string')
                            .and.to.equal(_flag._id.toString());
                        expect(flag.flag).to.be.a('string')
                            .and.to.equal(_flag.flag);
                        expect(flag.name).to.be.a('string')
                            .and.to.equal(_flag.name);
                        expect(flag.description).to.be.a('string')
                            .and.to.equal(_flag.description);
                    });

                    expect(res.body.payload.token).to.be.a('string');
                })
        });
        it('should generate an access token when specifying the email as the login', () => {
            return agent.post('/api/auth')
                .send({
                    login:    userData.email,
                    password: userData.password,
                    token:    speakeasy.totp({
                        secret:   user.secret.base32,
                        encoding: 'base32'
                    })
                })
                .then(res => {
                    expect(res.status).to.equal(200);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');

                    expect(res.body.payload).to.be.an('object')
                        .and.to.have.all.keys('id', 'username', 'email', 'first_name', 'last_name', 'group', 'flags', 'token');
                    expect(res.body.payload.id).to.be.a('string')
                        .and.to.equal(user._id.toString());
                    expect(res.body.payload.username).to.be.a('string')
                        .and.to.equal(user.username);
                    expect(res.body.payload.email).to.be.a('string')
                        .and.to.equal(user.email);
                    expect(res.body.payload.first_name).to.be.a('string')
                        .and.to.equal(user.first_name);
                    expect(res.body.payload.last_name).to.be.a('string')
                        .and.to.equal(user.last_name);

                    expect(res.body.payload.group).to.be.an('object')
                        .and.to.have.all.keys('id', 'tag', 'name', 'description');
                    expect(res.body.payload.group.id).to.be.a('string')
                        .and.to.equal(user.group._id.toString());
                    expect(res.body.payload.group.tag).to.be.a('string')
                        .and.to.equal(user.group.tag);
                    expect(res.body.payload.group.name).to.be.a('string')
                        .and.to.equal(user.group.name);
                    expect(res.body.payload.group.description).to.be.a('string')
                        .and.to.equal(user.group.description);

                    expect(res.body.payload.flags).to.be.an('array');
                    res.body.payload.flags.forEach((flag, index) => {
                        let _flag = user.flags[index];
                        expect(flag).to.be.an('object')
                            .and.to.have.all.keys('id', 'flag', 'name', 'description');
                        expect(flag.id).to.be.a('string')
                            .and.to.equal(_flag._id.toString());
                        expect(flag.flag).to.be.a('string')
                            .and.to.equal(_flag.flag);
                        expect(flag.name).to.be.a('string')
                            .and.to.equal(_flag.name);
                        expect(flag.description).to.be.a('string')
                            .and.to.equal(_flag.description);
                    });

                    expect(res.body.payload.token).to.be.a('string');
                })
        });
    });
    describe.skip('Access Groups API Tests', () => {
        let groupData       = {
            tag:         'test_group',
            name:        'Test Group',
            description: 'A test access group'
        };
        let updateGroupData = {
            tag:         'test_group_update',
            name:        'Test Group Update',
            description: 'A test access group that has been updated'
        };
        let group           = null;

        it('should respond with a 401 Unauthorized when attempting to retrieve all access groups without specifying an access token', () => {
            return agent.get('/api/groups')
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(401);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.equal(null);
                    expect(res.body.error).to.be.a('string')
                        .and.to.equal('Unauthorized');
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(false);
                });
        });
        it('should retrieve all the access groups', () => {
            return agent.get('/api/groups')
                .set('x-access-token', token)
                .then(res => {
                    expect(res.status).to.equal(200);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');

                    expect(res.body.payload).to.be.an('array');
                    res.body.payload.forEach(group => {
                        expect(group).to.be.an('object')
                            .and.to.have.all.keys('id', 'tag', 'name', 'description', 'flags');
                        expect(group.id).to.be.a('string');
                        expect(group.tag).to.be.a('string');
                        expect(group.name).to.be.a('string');
                        expect(group.description).to.be.a('string');
                        expect(group.flags).to.be.an('array');
                        group.flags.forEach(flag => {
                            expect(flag).to.be.an('object')
                                .and.to.have.all.keys('id', 'flag', 'name', 'description');
                            expect(flag.id).to.be.a('string');
                            expect(flag.flag).to.be.a('string');
                            expect(flag.name).to.be.a('string');
                            expect(flag.description).to.be.a('string');
                        });
                    });

                    expect(res.body.error).to.equal(null);
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(true);
                })
        });

        it('should respond with a 401 Unauthorized when attempting to create a new access groups without specifying an access token', () => {
            return agent.post('/api/groups')
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(401);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.equal(null);
                    expect(res.body.error).to.be.a('string')
                        .and.to.equal('Unauthorized');
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(false);
                });
        });
        it('should create a new access group', () => {
            return agent.post('/api/groups')
                .set('x-access-token', token)
                .send(groupData)
                .then(res => {
                    expect(res.status).to.equal(200);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.be.an('object')
                        .and.to.have.all.keys('id', 'tag', 'name', 'description', 'flags');
                    expect(res.body.payload.id).to.be.a('string');
                    expect(res.body.payload.tag).to.be.a('string')
                        .and.to.equal(groupData.tag);
                    expect(res.body.payload.name).to.be.a('string')
                        .and.to.equal(groupData.name);
                    expect(res.body.payload.description).to.be.a('string')
                        .and.to.equal(groupData.description);
                    expect(res.body.payload.flags).to.be.an('array')
                        .and.to.be.empty;
                    expect(res.body.error).to.equal(null);
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(true);

                    group = res.body.payload;
                });
        });
        it('should verify that the access group exists', () => {
            return agent.get(`/api/groups/${group.id}`)
                .set('x-access-token', token)
                .then(res => {
                    expect(res.status).to.equal(200);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.be.an('object')
                        .and.to.have.all.keys('id', 'tag', 'name', 'description', 'flags')
                        .and.to.deep.equal(group);
                    expect(res.body.error).to.equal(null);
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(true);
                });
        });

        it('should respond with a 401 Unauthorized when attempting to update the access groups without specifying an access token', () => {
            return agent.put(`/api/groups/${group.id}`)
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(401);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.equal(null);
                    expect(res.body.error).to.be.a('string')
                        .and.to.equal('Unauthorized');
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(false);
                });
        });
        it('should update the access group', () => {
            group.tag         = updateGroupData.tag;
            group.name        = updateGroupData.name;
            group.description = updateGroupData.description;

            return agent.put(`/api/groups/${group.id}`)
                .set('x-access-token', token)
                .send(updateGroupData)
                .then(res => {
                    expect(res.status).to.equal(200);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.be.an('object')
                        .and.to.have.all.keys('id', 'tag', 'name', 'description', 'flags');
                    expect(res.body.payload.id).to.be.a('string')
                        .and.to.equal(group.id);
                    expect(res.body.payload.tag).to.be.a('string')
                        .and.to.equal(group.tag);
                    expect(res.body.payload.name).to.be.a('string')
                        .and.to.equal(group.name);
                    expect(res.body.payload.description).to.be.a('string')
                        .and.to.equal(group.description);
                    expect(res.body.payload.flags).to.be.an('array');
                });
        });
        it('should verify that the access group has been updated', () => {
            return agent.get(`/api/groups/${group.id}`)
                .set('x-access-token', token)
                .then(res => {
                    expect(res.status).to.equal(200);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.be.an('object')
                        .and.to.have.all.keys('id', 'tag', 'name', 'description', 'flags')
                        .and.to.deep.equal(group);
                    expect(res.body.error).to.equal(null);
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(true);
                });
        });

        it('should respond with a 401 Unauthorized when attempting to assign the \'write_users\' flag to the access group without specifying an access token', () => {
            return agent.put(`/api/groups/${group.id}/flags/write_users`)
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(401);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.equal(null);
                    expect(res.body.error).to.be.a('string')
                        .and.to.equal('Unauthorized');
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(false);
                });
        });
        it('should assign the \'write_users\' flag to the access group', () => {
            return agent.put(`/api/groups/${group.id}/flags/write_users`)
                .set('x-access-token', token)
                .then(res => {
                    expect(res.status).to.equal(200);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.be.an('object')
                        .and.to.have.all.keys('id', 'tag', 'name', 'description', 'flags');
                    expect(res.body.payload.id).to.be.a('string')
                        .and.to.equal(group.id);
                    expect(res.body.payload.tag).to.be.a('string')
                        .and.to.equal(group.tag);
                    expect(res.body.payload.name).to.be.a('string')
                        .and.to.equal(group.name);
                    expect(res.body.payload.description).to.be.a('string')
                        .and.to.equal(group.description);
                    expect(res.body.payload.flags).to.be.an('array');

                    let flag = res.body.payload.flags.find(flag => flag.flag === 'write_users');
                    expect(flag).to.be.an('object')
                        .and.to.have.all.keys('id', 'flag', 'name', 'description');
                    expect(flag.id).to.be.a('string');
                    expect(flag.flag).to.be.a('string');
                    expect(flag.name).to.be.a('string');
                    expect(flag.description).to.be.a('string');

                    group.flags.push(flag);
                });
        });
        it('should verify that the \'write_users\' flag has been assigned to the access group', () => {
            return agent.get(`/api/groups/${group.id}`)
                .set('x-access-token', token)
                .then(res => {
                    expect(res.status).to.equal(200);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.be.an('object')
                        .and.to.have.all.keys('id', 'tag', 'name', 'description', 'flags')
                        .and.to.deep.equal(group);
                    expect(res.body.error).to.equal(null);
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(true);
                });
        });

        it('should respond with a 401 Unauthorized when attempting to unassign the \'write_users\' flag from the access group without specifying an access token', () => {
            return agent.delete(`/api/groups/${group.id}/flags/write_users`)
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(401);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.equal(null);
                    expect(res.body.error).to.be.a('string')
                        .and.to.equal('Unauthorized');
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(false);
                });
        });
        it('should unassign the \'write_users\' flag from the access group', () => {
            return agent.delete(`/api/groups/${group.id}/flags/write_users`)
                .set('x-access-token', token)
                .then(res => {
                    expect(res.status).to.equal(200);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.be.an('object')
                        .and.to.have.all.keys('id', 'tag', 'name', 'description', 'flags');
                    expect(res.body.payload.id).to.be.a('string')
                        .and.to.equal(group.id);
                    expect(res.body.payload.tag).to.be.a('string')
                        .and.to.equal(group.tag);
                    expect(res.body.payload.name).to.be.a('string')
                        .and.to.equal(group.name);
                    expect(res.body.payload.description).to.be.a('string')
                        .and.to.equal(group.description);
                    expect(res.body.payload.flags).to.be.an('array');

                    let flag  = group.flags.find(flag => flag.flag === 'write_users');
                    let index = group.flags.findIndex(flag => flag.flag === 'write_users');

                    expect(res.body.payload.flags).to.not.deep.include(flag);

                    group.flags.splice(index, 1);
                });
        });
        it('should verify that the \'write_users\' flag has been unassigned from the access group', () => {
            return agent.get(`/api/groups/${group.id}`)
                .set('x-access-token', token)
                .then(res => {
                    expect(res.status).to.equal(200);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.be.an('object')
                        .and.to.have.all.keys('id', 'tag', 'name', 'description', 'flags')
                        .and.to.deep.equal(group);
                    expect(res.body.error).to.equal(null);
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(true);
                });
        });

        it('should respond with a 401 Unauthorized when attempting to delete the access group without specifying an access token', () => {
            return agent.delete(`/api/groups/${group.id}`)
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(401);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.equal(null);
                    expect(res.body.error).to.be.a('string')
                        .and.to.equal('Unauthorized');
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(false);
                });
        });
        it('should delete the access group', () => {
            return agent.delete(`/api/groups/${group.id}`)
                .set('x-access-token', token)
                .then(res => {
                    expect(res.status).to.equal(200);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.equal(null);
                    expect(res.body.error).to.equal(null);
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(true);
                })
        });
        it('should verify that the access group has been deleted', () => {
            return agent.get(`/api/groups/${group.id}`)
                .set('x-access-token', token)
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(404);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.equal(null);
                    expect(res.body.error).to.be.a('string')
                        .and.to.equal('Access Group not found');
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(false);
                });
        });
    });
    describe('Access Flag API Tests', () => {
        it('should respond with a 401 Unauthorized when attempting to retrieve all access flags without specifying an access token', () => {
            return agent.get('/api/flags')
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(401);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.equal(null);
                    expect(res.body.error).to.be.a('string')
                        .and.to.equal('Unauthorized');
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(false);
                });
        });
        it('should retrieve all the access groups', () => {
            return agent.get('/api/flags')
                .set('x-access-token', token)
                .then(res => {
                    expect(res.status).to.equal(200);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');

                    expect(res.body.payload).to.be.an('array');
                    res.body.payload.forEach(flag => {
                        expect(flag).to.be.an('object')
                            .and.to.have.all.keys('id', 'flag', 'name', 'description');
                        expect(flag.id).to.be.a('string');
                        expect(flag.flag).to.be.a('string');
                        expect(flag.name).to.be.a('string');
                        expect(flag.description).to.be.a('string');
                    });

                    expect(res.body.error).to.equal(null);
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(true);
                });
        });
    });
    describe.skip('Cached Holiday API Tests', () => {
        const YEAR    = new Date().getFullYear();
        const COUNTRY = 'EST';

        it('should respond with a 401 Unauthorized when no access token is specified', () => {
            return agent.get('/api/holidays')
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(401);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.equal(null);
                    expect(res.body.error).to.be.a('string')
                        .and.to.equal('Unauthorized');
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(false);
                });
        });
        it('should respond with a 400 Bad Request when no country is specified', () => {
            return agent.get('/api/holidays')
                .set('x-access-token', token)
                .catch(err => err.response)
                .then(res => {
                    expect(res.status).to.equal(400);
                    expect(res.body).to.be.an('object')
                        .and.to.have.all.keys('payload', 'error', 'status');
                    expect(res.body.payload).to.be.an('array')
                        .and.to.deep.include('Missing required query parameter \'country\'');
                    expect(res.body.error).to.be.a('string')
                        .and.to.equal('Invalid Data');
                    expect(res.body.status).to.be.a('boolean')
                        .and.to.equal(false);
                });
        });
        it(
            `should retrieve the list of public holidays for ${YEAR} in ${COUNTRY}`
            , () => {
                return agent.get('/api/holidays')
                    .query({year: YEAR, country: COUNTRY})
                    .set('x-access-token', token)
                    .then(res => {
                        expect(res.status).to.equal(200);
                        expect(res.body).to.be.an('object')
                            .and.to.have.all.keys('payload', 'error', 'status');
                        expect(res.body.payload).to.be.an('array');
                        expect(res.body.error).to.equal(null);
                        expect(res.body.status).to.equal(true);
                        res.body.payload.forEach(a => {
                            expect(a).to.be.an('object')
                                .and.to.have.all.keys('date', 'localName', 'englishName');

                            expect(a.localName).to.be.a('string');
                            expect(a.englishName).to.be.a('string');

                            expect(a.date).to.be.an('object')
                                .and.to.have.all.keys('day', 'month', 'year', 'dayOfWeek');

                            expect(a.date.day).to.be.a('number');
                            expect(a.date.month).to.be.a('number');
                            expect(a.date.year).to.be.a('number');
                            expect(a.date.dayOfWeek).to.be.a('number');
                        });
                    });
            });
    });
    describe.skip('Work Event Generation API Tests', () => {
        // TODO This
    });
});