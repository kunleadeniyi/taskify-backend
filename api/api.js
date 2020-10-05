const apiRouter = require('express').Router();

// mount auth router
const authRouter = require('./auth');
apiRouter.use('/auth', authRouter);

// mount board router
const boardRouter = require('./board');
apiRouter.use('/board', boardRouter);

// dummyRoute test
// for heroku
const dummyRouter = require('./dummy');
apiRouter.use('/dummyRoute', dummyRouter)

module.exports = apiRouter;