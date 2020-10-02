const apiRouter = require('express').Router();

// mount auth router
const authRouter = require('./auth');
apiRouter.use('/auth', authRouter);

// mount board router
const boardRouter = require('./board');
apiRouter.use('/board', boardRouter);

module.exports = apiRouter;