const debug = require('debug')('payroll:api:events');

/**
 *  Generates an array of Date objects from a certain date to a certain date.
 * @param {string} from An DD/MM/YYYY formatted date-string
 * @param {string} to An DD/MM/YYYY formatted date-string
 * @returns {Array<Date>} The array of Date objects falling between the dates specified
 */
function generateDatesBetween(from, to) {
    let dates = [];

    let [f_DD, f_MM, f_YYYY] = from.split('/').map(n => Number(n));
    let [t_DD, t_MM, t_YYYY] = to.split('/').map(n => Number(n));

    let current = new Date(f_YYYY, f_MM - 1, f_DD);
    let end     = new Date(t_YYYY, t_MM - 1, t_DD);

    while (current.getTime() <= end.getTime()) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }

    return dates;
}

/**
 * Formats a date object into a DD/MM/YYYY formatted date-string
 * @param {Date} date The date object to format
 * @returns {string} The formatted date-string
 */
function formatDate(date) {
    let dd   = date.getDate();
    let mm   = date.getMonth() + 1;
    let yyyy = date.getFullYear();

    if (dd < 10) dd = '0' + dd;
    if (mm < 10) mm = '0' + mm;

    return `${dd}/${mm}/${yyyy}`;
}

function createWorkEventGenerator() {
    return async function (input) {
        const name            = input.name;
        const holidays        = input.holidays;
        const income          = input.income;
        const work_start      = input.work_start;
        const work_end        = input.work_end;
        const lunch_start     = input.lunch_start;
        const lunch_end       = input.lunch_end;
        const work_days       = input.work_days;
        const period_from     = input.period.from;
        const period_to       = input.period.to;
        const payment_day     = input.payment_day;
        const payment_time    = input.payment_time;
        const currency        = input.currency;
        const public_holidays = input.public_holidays.map(holiday => {
            let date  = holiday.date;
            let month = holiday.month;
            let year  = holiday.year;

            if (month < 10) month = '0' + month;
            if (date < 10) date = '0' + date;

            return {
                name: holiday.englishName,
                date: `${date}/${month}/${year}`
            };
        });

        const events = [];
        const dates  = generateDatesBetween(period_from, period_to);

        dates.forEach(date => {
            let formattedDate = formatDate(date);
            let holiday       = public_holidays
                .find(holiday => holiday.date === formattedDate);
            // Check if the employee is on holiday for the current date
            if ('undefined' !== typeof holidays.find(holiday => holiday === formattedDate)) {
                events.push({
                    date:  formattedDate,
                    event: 'DAY_OFF',
                    data:  {name: 'Personal'}
                });
            }

            // Check if the current date is a holiday
            else if ('undefined' !== typeof holiday) {
                events.push({
                    date:  formattedDate,
                    event: 'DAY_OFF',
                    data:  {name: holiday.name}
                });
            }

            // Check if the current date is a weekend
            else if (!input.work_days.includes(date.getDay() + 1)) {
                events.push({
                    date:  formattedDate,
                    event: 'DAY_OFF',
                    data: {
                        name: 'Day off'
                    }
                });
            }

            // At this point we're certain that the employee is at work
            else {
                events.push({
                    date:  formattedDate,
                    time:  input.work_start,
                    event: 'ARRIVES_AT_WORK'
                });
                events.push({
                    date:  formattedDate,
                    time:  input.work_end,
                    event: 'LEAVES_FROM_WORK'
                });
                events.push({
                    date:  formattedDate,
                    time:  input.lunch_start,
                    event: 'LEAVES_FOR_LUNCH'
                });
                events.push({
                    date:  formattedDate,
                    time:  input.lunch_end,
                    event: 'ARRIVES_FROM_LUNCH'
                });
            }

            // Check if the current date is a payday
            if (new RegExp(`^${payment_day}/\\d{1,2}/\\d{4,}$`).test(formattedDate)) {
                events.push({
                    date:  formattedDate,
                    time:  payment_time,
                    event: 'PAYDAY',
                    data:  {type: input.type, amount: income, currency: currency}
                });
            }
        });

        let sorted_events = events.sort((a, b) => {
            let [f_DD, f_MM, f_YYYY] = a.date.split('/').map(n => Number(n));
            let [t_DD, t_MM, t_YYYY] = b.date.split('/').map(n => Number(n));
            let [f_hh, f_mm]         = (a.time || '00:00').split(':').map(n => Number(n));
            let [t_hh, t_mm]         = (b.time || '00:00').split(':').map(n => Number(n));

            // TODO: Can this be cleaned?
            if (f_YYYY < t_YYYY) return -1;
            else if (f_YYYY > t_YYYY) return 1;
            else {
                if (f_MM < t_MM) return -1;
                else if (f_MM > t_MM) return 1;
                else {
                    if (f_DD < t_DD) return -1;
                    else if (f_DD > t_DD) return 1;
                    else {
                        if (f_hh < t_hh) return -1;
                        else if (f_hh > t_hh) return 1;
                        else {
                            if (f_mm < t_mm) return -1;
                            else if (f_mm > t_mm) return 1;
                            else return 0;
                        }
                    }
                }
            }
        });

        return {
            period:   {
                from: period_from,
                to:   period_to
            },
            employee: {name, income, work_start, work_end, lunch_start, lunch_end, work_days},
            events:   sorted_events
        };
    };
}

function createWorkEventGeneratorV2() {
    // TODO: This
    throw new Error('Not implemented');
}

module.exports = function () {
    const e   = {};
    const gen = createWorkEventGenerator();

    e['POST /'] = function (req, res) {
        gen(req.body)
            .then(output => res.status(200).send({
                payload: output,
                error:   null,
                status:  true
            }))
            .catch(err => {
                debug(err);
                res.status(500).send({
                    payload: null,
                    error:   'Internal Server Error',
                    status:  false
                });
            });
    };

    return e;
};