var express = require('express'),
    path = require('path'),
    assert = require('assert'),
    logger = require('morgan'),
    bodyParser = require('body-parser'),
    cp = require('child_process'),
    responseTime = require('response-time'),
    helmet = require('helmet'),
    MongoClient = require('mongodb').MongoClient,
    RateLimit = require('express-rate-limit');

var config = require('./app/config/config'),
    users = require('./app/routes/users'),
    session = require('./app/routes/session'),
    sharedNews = require('./app/routes/sharedNews');

var app = express();
    app.enable('trust proxy');

//set up rate limiting
var limiter = new RateLimit({
  windowMs: 15*60*1000, // 15 min
  max: 100, //limit each IP TO 100 request per windowMs
  delayMS: 0 // disable delaying - full speef until the max limit is reached
});
app.use(limiter);

//set up helmet for security hacks
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'maxcdn.bootstrapcdn.com'", "'ajax.ggogleapis.com'"],
    styleSrc: ["'self'", "'unsafe-inline'", "'maxcdn.bootstrapcdn.com'"],
    fontSrc: ["'self'", "'maxcdn.bootstrapcdn.com'"],
    imgSrc: ['*']
    //report Uri: /report-violation,
  }
}));

//Add x-response-time to headet to responses to measure response times
app.use(responseTime());

//log all HTTP requests.
app.use(logger('dev'));

//Set up the response object in the routes to contain a body property with an object of what is parsed from a JSON body req payload
app.use(bodyParser.json({limit: '100kb'}));

//this takes any querty string and sticks them in the body property
app.use(bodyParser.urlencoded({extended: false}));

//simplify the serving of static content
app.use(express.static(path.join(__dirname, 'static')));

var node2 = cp.fork('./app/config/app_FORK.js');

var db = {};
MongoClient.connect(config.MONGODB_CONNECT_URL, function(err, dbConn){
  assert.equal(null, err);
  db.dbConnection = dbConn;
  db.collection = dbConn.collection('newswatcher');
  console.log('connected to mongodb');
});

app.use(function(req, res){
  req.db = db;
  req.node2 = node2;
  next();
});

app.get('/', function(req, res){
  res.render('index.html');
});

//REST API routes
app.use('/api/users', users);
app.use('/api/sessions', session);
app.use('/api/sharedNews', sharedNews);

//Catch 404 and forward to error handler
app.use(function(req, res, next){
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

//dev error handler that wil add in stacktrace
if(app.get('env') === 'development'){
  app.use(function(err, req, res, next){
    res.status(err.status || 500).json({message: err.toString(), error:err});
    console.log(err);
  });
}
//production error handler with no stactrace exposure
app.use(function(err, req, res, next){
  res.status(err.status || 500).json({message: err.toString(), error: {}});
  console.log(err);
});

app.set('port', process.env.PORT || 3000);

var server = app.listen(app.get('port'), function(){
  console.log('express listening on port ' + server.address().port);
});
