/**
 * Creates an Error object from a message
 * @param message The message to use
 * @returns {{name: string, message: string}}
 */
module.exports = function createError(message) {
    /*
     * All this does is it takes the error message, removes whitespace, and adds 'Error' to the end,
     * and create an error object using the message and name.
     * Eg. createError('Something Went Wrong') => {name: 'SomethingWentWrongError', message: 'Something Went Wrong'}
     */
    let name = message.replace(/\s/g, '') + 'Error';
    return {name, message};
};