const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
// const errorHandler = require('errorhandler');
const cors = require('cors');

require('dotenv').config()

const PORT = process.env.PORT || 4000 ;

// DB stuff
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_TASKIFY_DB, { useUnifiedTopology: true, useNewUrlParser: true });
var db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));

db.once("open", function() {
  console.log("Connection Successful!");
});

// Initialize Express
const app = express();

// Logging and bodyParsing middleware
app.use(morgan('dev'));
app.use(bodyParser.json());

// CORS
app.use(cors())

// load
// const path = require('path');
// const publicPath = path.join(__dirname, '..', 'public');
// app.use(express.static(publicPath));
// Mount your existing apiRouter below at the '/api' path.

const apiRouter = require('./api/api');
app.use('/api', apiRouter);



app.use(function (error, req, res, next) {
  console.error(error.stack)
  res.status(403).send(error.message)
})

app.listen(PORT, () => {
  console.log(`listening at port: ${PORT}`);
})