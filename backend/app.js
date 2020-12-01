const app = require('express')();
const server = app.listen(process.env.PORT || 3000, '0.0.0.0');

async function init() {
    require('./startup/express')(app);
    require('./startup/engine')(server);
}

init();