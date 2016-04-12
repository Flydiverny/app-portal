const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const fs = require('fs');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);

const models = path.join(__dirname, 'models');
const app = express();

var config = JSON.parse(
    fs.readFileSync('config.json')
);

app.locals.title = config.title || "App Portal";

const db = config.mongo.database || "app-portal";
const host = config.mongo.host || "localhost";
const port = config.mongo.port || 27017;

const DATABASE = "mongodb://" + host + ":" + port +  "/" + db;

// Bootstrap models
//noinspection BadExpressionStatementJS
fs.readdirSync(models)
  .filter(file => ~file.search(/^[^\.].*\.js$/))
  .forEach(file => require(path.join(models, file)));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Add session handlng
app.use(session({
  secret: 'jkA3vRMB6BRBGBE*%fJOr^Xb4JXea*uME$nmaX',
  resave: false,
  saveUninitialized: true,
  store: new MongoStore({
      url: DATABASE,
      autoRemove: 'interval',
      autoRemoveInterval: 10 // In minutes. Default
    }),
    cookie: { maxAge: 15*60*1000}
}));

// Allow use of flash messages
app.use(require('flash')());

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.png')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Inject session in locals
app.use(function(req,res,next){
    res.locals.session = req.session;
    next();
});

// Routes
app.use('/', require('./routes/index'));
app.use('/download', require('./routes/download'));
app.use('/admin', require('./routes/admin'));
app.use('/admin', require('./routes/admin/application'));
app.use('/admin', require('./routes/admin/dependency'));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    console.error(err);
    res.status(err.status || 500);
    res.render('error', {
      status: err.status,
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    status: err.status,
    message: err.message
  });
});

dbConnect()
  .on('error', console.error.bind(console, 'connection error:'))
  .on('disconnected', dbConnect);

function dbConnect() {
  return mongoose.connect(DATABASE).connection;
}

module.exports = app;
