/*
 ===== SETUP =====
 This platform works in a perfect world where the first of
 january is a monday, the employees are ideal, they arrive
 at and leave from work on time, go to and arrive from lunch
 on time, have no sick days or dental appointments, etc.
 ===== SETUP =====
 */

/** This is the date format used here */
const DATE_FORMAT     = 'DD/MM/YYYY';
/** This is the time format used here */
const TIME_FORMAT     = 'hh:mm[:ss]';
/** This is the date-time format used here */
const DATETIME_FORMAT = 'DD/MM/YYYY-hh:mm[:ss]';

/**
 * This is the input that is provided by the user via an API endpoint
 */
const input = {
    name:        'Ragnar Laud',
    // The list of personal holidays
    holidays:    [
        // I will take the first two days of 2017 off
        '01/01/2017',
        '02/01/2017',

        // I will take my birthday off
        '02/03/2017',
        // I will take two days after my birthday off, for obvious reasons
        '03/03/2017',
        '04/03/2017',

        // I will take the end of 2017 off, because Christmas and stuff
        '23/12/2017',
        '24/12/2017',
        '25/12/2017',
        '26/12/2017',
        '27/12/2017',
        '28/12/2017',
        '29/12/2017',
        '30/12/2017',
        '31/12/2017'
    ],
    // The net income of the employee
    income:      2000,
    // The time at which the employee would arrive at work
    work_start:  '09:00',
    // The time at which the employee would leave work
    work_end:    '17:00',
    // The time at which the employee would leave for lunch
    lunch_start: '12:00',
    // The time at which the employee would arrive from lunch
    lunch_end:   '13:00',
    // The days on which the employee works
    work_days:   [1, 2, 3, 4, 5],
    // I want to get a generated work event for first two weeks of 2017
    period:      {
        from: '01/01/2017',
        to:   '14/01/2017'
    },
    // The day of each month when the payouts would start being made
    payment_day:  '01',
    // The time at which the payouts would start being made
    payment_time: '12:00',
    // The currency in which the payments should be made
    currency:     'EUR',
    // The country that will be used
    country:      'EST'
};

/**
 * This is the output that is returned by the API endpoint
 */
const output = {
    // The name of the employee
    name:     'Ragnar Laud',
    // The period of generation
    period:   {
        from: '01/01/2017',
        to:   '14/01/2017'
    },
    employee: {
        name:        'Ragnar Laud',
        income:      2000,
        work_start:  '09:00',
        work_end:    '17:00',
        lunch_start: '12:00',
        lunch_end:   '13:00',
        work_days:   [1, 2, 3, 4, 5]
    },
    // The list of generated events
    events:   [
        {date: '01/01/2017', time: '09:00', event: 'DAY_OFF_HOLIDAY', data: {name: 'Personal Holiday'}},
        {date: '01/01/2017', time: '12:00', event: 'SALARY_PAYMENT', data: {amount: 2000, currency: 'EUR'}},

        {date: '02/01/2017', time: '09:00', event: 'DAY_OFF_HOLIDAY', data: {name: 'Personal Holiday'}},

        {date: '03/01/2017', time: '09:00', event: 'ARRIVES_AT_WORK'},
        {date: '03/01/2017', time: '17:00', event: 'LEAVES_FOR_LUNCH'},
        {date: '03/01/2017', time: '17:00', event: 'ARRIVES_FROM_LUNCH'},
        {date: '03/01/2017', time: '17:00', event: 'LEAVES_WORK'},

        {date: '04/01/2017', time: '09:00', event: 'ARRIVES_AT_WORK'},
        {date: '04/01/2017', time: '17:00', event: 'LEAVES_FOR_LUNCH'},
        {date: '04/01/2017', time: '17:00', event: 'ARRIVES_FROM_LUNCH'},
        {date: '04/01/2017', time: '17:00', event: 'LEAVES_WORK'},

        {date: '05/01/2017', time: '09:00', event: 'ARRIVES_AT_WORK'},
        {date: '05/01/2017', time: '17:00', event: 'LEAVES_FOR_LUNCH'},
        {date: '05/01/2017', time: '17:00', event: 'ARRIVES_FROM_LUNCH'},
        {date: '05/01/2017', time: '17:00', event: 'LEAVES_WORK'},

        {date: '06/01/2017', time: '09:00', event: 'DAY_OFF_WEEKEND'},

        {date: '07/01/2017', time: '09:00', event: 'DAY_OFF_WEEKEND'},

        {date: '08/01/2017', time: '09:00', event: 'ARRIVES_AT_WORK'},
        {date: '08/01/2017', time: '17:00', event: 'LEAVES_FOR_LUNCH'},
        {date: '08/01/2017', time: '17:00', event: 'ARRIVES_FROM_LUNCH'},
        {date: '08/01/2017', time: '17:00', event: 'LEAVES_WORK'},

        {date: '09/01/2017', time: '09:00', event: 'ARRIVES_AT_WORK'},
        {date: '09/01/2017', time: '17:00', event: 'LEAVES_FOR_LUNCH'},
        {date: '09/01/2017', time: '17:00', event: 'ARRIVES_FROM_LUNCH'},
        {date: '09/01/2017', time: '17:00', event: 'LEAVES_WORK'},

        {date: '10/01/2017', time: '09:00', event: 'DAY_OFF_HOLIDAY', data: {name: 'Lorem Day'}},

        {date: '11/01/2017', time: '09:00', event: 'ARRIVES_AT_WORK'},
        {date: '11/01/2017', time: '17:00', event: 'LEAVES_FOR_LUNCH'},
        {date: '11/01/2017', time: '17:00', event: 'ARRIVES_FROM_LUNCH'},
        {date: '11/01/2017', time: '17:00', event: 'LEAVES_WORK'},

        {date: '12/01/2017', time: '09:00', event: 'ARRIVES_AT_WORK'},
        {date: '12/01/2017', time: '17:00', event: 'LEAVES_FOR_LUNCH'},
        {date: '12/01/2017', time: '17:00', event: 'ARRIVES_FROM_LUNCH'},
        {date: '12/01/2017', time: '17:00', event: 'LEAVES_WORK'},

        {date: '13/01/2017', time: '09:00', event: 'DAY_OFF_WEEKEND'},

        {date: '14/01/2017', time: '09:00', event: 'DAY_OFF_WEEKEND'},
    ]
};