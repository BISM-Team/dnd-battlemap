const app = require('express')();
const server = app.listen(3000);

async function init() {
    require('./startup/express')(app);
    require('./startup/engine')(server);
}

init();