// just to test my heroku deployment

const dummyRouter = require('express').Router();

dummyRouter.get('/', async function(req, res, next) {
   res.send("dummy things")
})


module.exports = dummyRouter