module.exports = function createError(message) {
    let name = message.replace(/\s/g, '') + 'Error';
    return {name, message};
};