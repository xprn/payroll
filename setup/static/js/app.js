(function () {
    function Setup() {
        let setupContainers = [];

        let index = 0;
        let data  = {
            root:  {
                username:   '',
                password:   '',
                email:      '',
                first_name: '',
                last_name:  ''
            },
            mongo: {
                hostname: 'localhost',
                port:     27017,
                db:       'payroll',
                tested:   false
            },
            redis: {
                hostname: 'localhost',
                port:     6379,
                db:       0,
                tested:   false
            }
        };

        (function () {
            $('[data-container="setup"]').each(function (i, e) {
                let $element = $(e);
                let index    = Number($element.attr('data-setup'));

                if (!isNaN(index) && index >= 0) {
                    setupContainers[index] = $element;
                    if (index === 0) $element.fadeIn();
                }
            });
        })();

        this.next = function () {
            if (index < setupContainers.length - 1) {
                setupContainers[index].fadeOut('fast', function () {
                    setupContainers[++index].fadeIn('fast');
                });
            }
        };

        this.prev = function () {
            if (index > 0) {
                setupContainers[index].fadeOut('fast', function () {
                    setupContainers[--index].fadeIn('fast');
                });
            }
        };

        this.enableNext = function () {
            setupContainers[index].find('[data-click="setup-next"]').removeClass('disabled').removeAttr('disabled');
        };

        this.disableNext = function () {
            setupContainers[index].find('[data-click="setup-next"]').addClass('disabled').attr('disabled', 'disabled');
        };

        this.isTested = function (a) {
            return data[a] && data[a].tested;
        };

        this.createUser = function (payload) {
            payload.mongo_hostname = data.mongo.hostname;
            payload.mongo_port     = data.mongo.port;
            payload.mongo_db       = data.mongo.db;

            data.root.username   = payload.username;
            data.root.password   = payload.password;
            data.root.email      = payload.email;
            data.root.first_name = payload.first_name;
            data.root.last_name  = payload.last_name;

            return new Promise(function (resolve, reject) {
                $.ajax({
                    method: 'post',
                    url:    '/api/user',
                    data:   payload
                }).then(function (data) {
                    resolve(data.payload);
                }, function (res) {
                    reject(res.responseJSON);
                });
            });
        };

        this.authenticate = function (token) {
            return new Promise(function (resolve, reject) {
                const login    = data.root.username;
                const password = data.root.password;
                $.ajax({
                    method: 'post',
                    url:    '/api/auth',
                    data:   {token, login, password}
                }).then(function () {
                    resolve();
                }, function (res) {
                    reject(res.responseJSON);
                })
            });
        };

        this.testMongoConnection = function (hostname, port, database) {
            return new Promise(function (resolve, reject) {
                $.ajax({
                    method: 'post',
                    url:    '/api/mongo',
                    data:   {hostname: hostname, port: port, database: database}
                }).then(function () {
                    data.mongo.hostname = hostname;
                    data.mongo.port     = port;
                    data.mongo.tested   = true;
                    resolve();
                }, function (res) {
                    reject(res.responseJSON);
                });
            });
        };

        this.testRedisConnection = function (hostname, port, database) {
            return new Promise(function (resolve, reject) {
                $.ajax({
                    method: 'post',
                    url:    '/api/redis',
                    data:   {hostname: hostname, port: port, database: database}
                }).then(function () {
                    data.redis.hostname = hostname;
                    data.redis.port     = hostname;
                    data.redis.db       = database;
                    data.redis.tested   = true;
                    resolve();
                }, function (res) {
                    reject(res.responseJSON);
                });
            });
        };
    }

    $('.hidden').hide().removeClass('hidden');

    let setup = new Setup();

    $('[data-click="setup-next"]').on('click', function (e) {
        e.preventDefault();
        setup.next();
    });
    $('[data-click="setup-prev"]').on('click', function (e) {
        e.preventDefault();
        setup.prev();
    });
    $('[data-click="setup-test-mongo"]').on('click', function () {
        let $e = $(this);

        $e.addClass('disabled')
            .attr('disabled');

        swal({
            title:             'Testing MongoDB connection...',
            text:              'Please hold...',
            type:              'info',
            showConfirmButton: false
        });

        setup.testMongoConnection($('#mongo-hostname').val(), $('#mongo-port').val(), $('#mongo-db').val())
            .then(function () {
                swal({
                    title: 'MongoDB connection established',
                    type:  'success'
                }, function () {
                    $e.removeClass('disabled').removeAttr('disabled');
                    setup.enableNext();
                });
            })
            .catch(function (res) {
                swal({
                    title: 'MongoDB connection could not be established',
                    text:  '<code style="padding: 15px; display: block; color: #f77; background-color: #252525">' + res.error + '</code>',
                    type:  'error',
                    html:  true
                }, function () {
                    $e.removeClass('disabled').removeAttr('disabled');
                });
            });
    });
    $('[data-click="setup-test-redis"]').on('click', function () {
        let $e = $(this);

        $e.addClass('disabled')
            .attr('disabled');

        swal({
            title:             'Testing Redis connection...',
            text:              'Please hold...',
            type:              'info',
            showConfirmButton: false
        });

        setup.testRedisConnection($('#redis-hostname').val(), $('#redis-port').val(), $('#redis-db').val())
            .then(function () {
                swal({
                    title: 'Redis connection established',
                    type:  'success'
                }, function () {
                    $e.removeClass('disabled').removeAttr('disabled');
                    setup.enableNext();
                });
            })
            .catch(function (res) {
                swal({
                    title: 'Redis connection could not be established',
                    text:  '<code style="padding: 15px; display: block; color: #f77; background-color: #252525">' + res.error + '</code>',
                    type:  'error',
                    html:  true
                }, function () {
                    $e.removeClass('disabled').removeAttr('disabled');
                });
            });
    });
    $('[data-click="setup-create-root"]').on('click', function () {
        if (setup.isTested('redis') && setup.isTested('mongo')) {
            setup.disableNext();
            swal({
                title:             'Creating root account...',
                text:              'Please hold...',
                type:              'info',
                showConfirmButton: false
            });

            setup.createUser({
                username:   $('#root-username').val(),
                email:      $('#root-email').val(),
                password:   $('#root-password').val(),
                first_name: $('#root-first-name').val(),
                last_name:  $('#root-last-name').val()
            }).then(function (data) {
                let qr = data.qr;

                swal({
                    title:            'Please authenticate',
                    text:             '<a target="_blank" href="' + qr + '">Click Here</a> to get the QR Code for the authentication secret',
                    html:             true,
                    type:             'input',
                    showCancelButton: false,
                    closeOnConfirm:   false,
                    inputPlaceholder: 'Authentication Token'
                }, function (value) {
                    if (value.length) {
                        setup.authenticate(value)
                            .then(function () {
                                swal({
                                    title: 'Successfully authenticated!',
                                    type:  'success'
                                }, function () {
                                    setup.next();
                                });
                            })
                            .catch(function (data) {
                                swal.showInputError(data.error);
                            });
                    } else {
                        swal.showInputError('Invalid Token');
                    }
                });
            }).catch(function (data) {
                swal({
                    title: 'Unable to create user',
                    text:  data.error,
                    type:  'error'
                });
            });
        }
    });

    $('form[data-setup-form="mongo-test"]').on('keypress', function (e) {
        if (e.which === 13) {
            e.preventDefault();

            if (setup.isTested('mongo')) {
                setup.next();
                setup.disableNext();
            } else {
                $('[data-click="setup-test-mongo"]').click();
            }
        } else return true;
    });
    $('form[data-setup-form="redis-test"]').on('keypress', function (e) {
        if (e.which === 13) {
            e.preventDefault();

            if (setup.isTested('redis')) {
                setup.next();
                setup.disableNext();
            } else {
                $('[data-click="setup-test-redis"]').click();
            }
        } else return true;
    });
    $('form[data-setup-form="root-creation"]').on('keypress', function (e) {
        if (e.which === 13) {
            e.preventDefault();
            $('[data-click="setup-create-root"]').click();
        } else return true;
    });
})();