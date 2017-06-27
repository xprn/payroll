import {
    PayrollController,
    UserInterface
} from './lib/payroll';

(function ($) {
    if (!$) throw new Error('Payroll requires jQuery');

    $(function () {
        const payroll = {};

        payroll.data          = JSON.parse(localStorage.getItem('payroll') || sessionStorage.getItem('payroll') || '{}');
        payroll.controller    = new PayrollController(payroll);
        payroll.userInterface = new UserInterface(payroll);
        payroll.viewContainer = $('#view');

        $.ajax({
            method: 'get',
            url:    '/_routes'
        }).then(routes => payroll.userInterface.initialize(routes));
    });
})(window.jQuery);
