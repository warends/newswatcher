"use strict"

var express = require('express'),
    bcrypt = require('bcryptjs'), // password hash
    jwt = require('jwt-simple'), //token auth
    joi = require('joi'),  //data validation
    authHelper = require('./authHelper'),
    config = require('../config/config');

var router = express.Router();

//create security token as the user logs in that can be passed to the cleint and used on subsequent calls.


router.post('/', function postSession(req, res, next){
  //password must be 7 to 15 char and contain on special char and one number
  var schema = {
    email: joi.string().email().min(7).max(50).required(),
    password: joi.string().regex(/^(?=.*[0-9]) (?=.*[!@#$%^&*]) [a-zA-Z0-0!@#$%^&*]{7,15}$/).required()
  };

  joi.validate(req.body, schema, function(err, value){
    if(err)
      return next(new Error('invalid field: password 7 to 15 (one number, one special character)'));

      req.db.collection.findOne({
        type: 'USER_TYPE',
        email: req.body.email
      }, function(err, user){
        if (err) return next(err);
        if(!user) return next(new Error('User was not found. '));

        bcrypt.compare(req.body.password, user.passwordHash, function comparePassword(err, match){
          if(match){
            try{
              var token = jwt.encode({
                authorized: true,
                sessionIP: req.ip,
                sessionUA: req.headers['user-agent'],
                userId: user._id.toHexString(),
                displayName: user.displayName },
                config.JWT_SECRET );
              res.status(201).json({
                displayName : user.displayName,
                userId: user._id.toHexString(),
                token: token,
                msg: 'Authorized'
              });
            } catch(err) { return next(err); }
          } else {
            return next(new Error ('Wrong Password'));
          }
        });
      });
  });
});

//Delete the token as the user logs out
router.delete('/:id', authHelper.checkAuth, function(req, res, next){
  //verify the passed in email is the same as that in the auth token
  if(req.params.id != req.auth.userId)
    return next(new Error('Invalid request for logout'));

  res.status(200).json({msg: 'Logged Out'});
});

module.exports = router;
