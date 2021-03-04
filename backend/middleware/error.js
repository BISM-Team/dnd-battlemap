module.exports = function(err, req, res, next) {
    console.error('CAUGHT ASYNC ERROR');
    console.error(err);
    switch(err.message) {
        case '404':
            return res.status(404).send('Resource not found or not accessible');
        case '403':
            return res.status(404).send('Resource not found or not accessible');
        case '400':
            return res.status(400).send('Invalid request');
        default:
            break;
    }
    switch(err.status) {
        case 404:
            return res.status(404).send('Resource not found or not accessible');
        case 403:
            return res.status(404).send('Resource not found or not accessible');
        case 400:
            return res.status(400).send('Invalid request');
        default:
            break;
    }
    res.status(500).send('Request failed');
};