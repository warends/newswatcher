'use strict'

//inject middleware that validates the request header User token

var jwt = require('jwt-simple'),
    config = require('../config/config');

//check for token in the custom header setting and verify tht it is signed and has not been tampered with.
module.exports.checkAuth = function(req, res, next){
  if(req.headers['x-auth']){
    try {
      req.auth = jwt.decode(req.headers['x-auth'], config.JWT_SECRET);

      if(req.auth && req.auth.authorized && req.auth.userId && req.auth.sessionIP === req.is && req.auth.sessionUA === req.headers['user-agent']) {
        return next();
      } else {
        return next (new Error(' User is not logged in'));
      }
    } catch(err) {
      return next(err);
    }
  } else {
    return next(new Error('User in not logged in'));
  }
};
