import EventEmitter from 'wolfy87-eventemitter';

export default class PayrollController extends EventEmitter {
    constructor(payroll) {
        super();

        this.payroll = payroll;
        this.data    = payroll.data;
    }

    _flushData() {
        if (this.data) {
            let storage = this.data.keep_logged_in ? localStorage : sessionStorage;

            storage.setItem('payroll', JSON.stringify(this.data));
        }
    }

    checkAuth() {
        if (this.data.user) {
            $.ajax({
                method:  'get',
                url:     '/api/auth',
                headers: {'x-access-token': this.data.user.auth.token}
            }).then(
                () => {
                    this.emit('auth:status:ok', this.data);
                },
                err => {
                    this.emit('auth:status:fail', err, this.data);
                }
            )
        } else {
            this.emit('auth:status:fail', new Error('Not signed in'), this.data);
        }
    }

    signIn(login, password, token) {
        $.ajax({
            method: 'post',
            url:    '/api/auth',
            data:   {login, password, token}
        }).then(
            data => {
                this.data.user = data.payload;
                this._flushData();

                this.emit('sign-in:success', this.data.user);
                this.emit('auth:status:ok', this.data);
            },
            err => {
                this.emit('sign-in:fail', err);
                this.emit('auth:status:fail', this.data);
            });
    }
}