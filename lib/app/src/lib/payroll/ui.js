import crossroads from 'crossroads';
import swal from 'sweetalert';
import URL from 'url';

export default class UserInterface {
    constructor(payroll) {
        this.payroll    = payroll;
        this.controller = payroll.controller;

        this.controller.on('auth:status:ok', data => {
            $('[data-bind="auth:user:username"]').text(data.user.username);
            $('[data-bind="auth:user:email"]').text(data.user.email);
            $('[data-bind="auth:user:first_name"]').text(data.user.first_name);
            $('[data-bind="auth:user:last_name"]').text(data.user.last_name);

            $('[data-show="auth:fail"]').hide();
            $('[data-show="auth:ok"]').show();
        });
        this.controller.on('auth:status:fail', data => {
            $('[data-bind="auth:user:username"]').text('');
            $('[data-bind="auth:user:email"]').text('');
            $('[data-bind="auth:user:first_name"]').text('');
            $('[data-bind="auth:user:last_name"]').text('');

            $('[data-show="auth:ok"]').hide();
            $('[data-show="auth:fail"]').show();
        });

        $('[data-show]').hide();

        this.controller.checkAuth();
    }

    initialize(routes) {
        this.payroll.routes = routes;

        routes.forEach(route =>
            route._route = crossroads.addRoute(route.route, () => this.loadView(route.view)));

        window.popstate = this.updateView.bind(this);
        this.setupView();
    }

    setupView() {
        $('a[href]').off('click').on('click', e => {
            e.preventDefault();

            let $e          = $(e.delegateTarget);
            let href        = $e.attr('href');
            let current_url = URL.parse(location.href);
            let url         = URL.parse(href);

            if (!url.host) url = URL.parse(URL.resolve(location.href, href));

            if (current_url.host === url.host) this.setRoute(url.pathname);
            else location.href = url.href;

        });
        $('.button-collapse').sideNav();
        $('.dropdown-button').dropdown();
        $('select').material_select();

        $('[data-form="sign-up"]').on('submit', e => {
            e.preventDefault();

            let $e   = $(e.delegateTarget);
            let data = {
                username:     $e.find('#username').val(),
                email:        $e.find('#email').val(),
                password:     $e.find('#password').val(),
                first_name:   $e.find('#first_name').val(),
                last_name:    $e.find('#last_name').val(),
                subscription: $e.find('#subscription').val()
            };

            let body = `Hello! \r\n` +
                `I would like to sign up for the Payroll app! \r\n` +
                `Please sign me up using the information below: \r\n\r\n` +
                `\tUsername: ${data.username || 'Choose one for me'} \r\n` +
                `\tEmail: ${data.email} \r\n` +
                `\tPassword: ${data.password || 'Choose one for me'} \r\n` +
                `\tFirst name: ${data.first_name} \r\n` +
                `\tLast name: ${data.last_name} \r\n` +
                `\tSubscription: ${data.subscription || 'Basic'} \r\n` +
                `\r\n\r\n` +
                `Regards, \r\n` +
                `${data.first_name} ${data.last_name} \r\n` +
                `${data.email} \r\n\r\n`;

            location.href = `mailto://ragnar.laud@hotmail.com?subject=${encodeURIComponent('Sign Me Up!')}&body=${encodeURIComponent(body)}`;
        });
        $('[data-form="sign-in"]').on('submit', e => {
            e.preventDefault();

            let $e             = $(e.delegateTarget);
            let signInResponse = {
                success: user => {
                    this.payroll.controller.off('sign-in:success', signInResponse.success);
                    this.payroll.controller.off('sign-in:fail', signInResponse.fail);

                    swal({
                        title: 'Signed In',
                        text:  `Hello ${user.first_name}`,
                        type:  'success'
                    }, () => this.payroll.userInterface.setRoute('/dashboard'));
                },
                fail:    () => {
                    this.payroll.controller.off('sign-in:success', signInResponse.success);
                    this.payroll.controller.off('sign-in:fail', signInResponse.fail);

                    swal({
                        title: 'Unable to sign in',
                        text:  'Invalid credentials',
                        type:  'error'
                    });
                }
            };
            let data           = {
                login:    $e.find('#login').val(),
                password: $e.find('#password').val(),
                token:    $e.find('#token').val()
            };

            this.payroll.controller.on('sign-in:success', signInResponse.success);
            this.payroll.controller.on('sign-in:fail', signInResponse.fail);

            this.payroll.controller.signIn(data.login, data.password, data.token);
        });
    }

    updateView() {
        const url = URL.parse(location.href).pathname;

        if (this.isValidRoute(url)) crossroads.parse(url);
    }

    setRoute(pathname) {
        let route = this.payroll.routes.find(route => route._route.match(pathname));

        if (route) {
            window.history.pushState({
                route: {
                    route: route.route,
                    view:  route.view,
                    title: route.title
                }
            }, route.title, pathname);
            this.loadView(route.view);
        }
    }

    loadView(view) {
        $.ajax({
            method: 'get',
            url:    `/views?view=${view}`,
        }).then(data => {
            if (this.payroll.viewContainer.html() !== data)
                this.payroll.viewContainer.html(data);
            this.setupView();
        }, err => console.error(err));
    }

    isValidRoute(r) {
        for (let route of this.payroll.routes) {
            if (route._route.match(r)) return true;
        }
        return false;
    }
}