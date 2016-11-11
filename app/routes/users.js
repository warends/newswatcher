"use strict"

var express = require('express'),
    bcrypt = require('bcryptjs'), // password hash
    async = require('async'),
    joi = require('joi'),  //data validation
    authHelper = require('./authHelper'),
    config = require('../config/config'),
    ObjectId = require('mongodb').ObjectID;

var router = express.Router();

router.post('/', function postUser(req, res, next){
  var schema = {
    displayName: joi.string().alpanum().min(3).max(50).required(),
    email: joi.string().email().min(7).max(50).required(),
    password: joi.string().regex(/^(?=.*[0-9]) (?=.*[!@#$%^&*]) [a-zA-Z0-0!@#$%^&*]{7,15}$/).required()
  };

  joi.validate(req.body, schema, function(err, value){
    if(err)
      return next(new Error('Invalid field: display name 3 to 50 characters, valid email 7 to 15 (1 number, 1 special character)'));

      req.db.collection.findOne({
        type: 'USER_TYPE',
        email: req.body.email,
      }, function(err, doc) {
        if(err)
          return next(err);
        if(doc)
          return next(new Error('Email accounr already registered'));

        var xferUser = {
          type: 'USER_TYPE',
          displayName: req.body.displayName,
          email: req.body.email,
          passwordHash: null,
          date: Date.now(),
          completed: false,
          settings: {
            requiredWiFi: true,
            enableAlerts: false,
          },
          newsFilters: [{
            name: 'Technology Companies',
            keywords: ['Apple', 'Microsoft', 'IBM', 'Amazon', 'Google', 'Intel'],
            enableAlert: false,
            alertFrequency: 0,
            enableAutoDelete: false,
            deleteTime: 0,
            timeOfLastScan: 0,
            newsStories: []
          }],
          savedStories: []
        };

        bycrypt.hash(req.body.password, 10, function getHash(err, hash){
          if(err)
            return next(err);

          xferUser.passwordHash = hash;
          req.db.collection.insertOne(xferUser, function(err, result){
            if(err)
              return next(err);
            req.node2.send({
              msg: 'Refresh Stories',
              doc: result.ops[0]
            });
            res.status(201).json(result.ops[0]);
          });

        });
      });
  });
});

router.delete('/:id', authHelper.checkAuth, function(req, res, next){
  //verify that the passed in id to delete is the same as the auth token
  if(req.params.id != req.auth.userId)
    return next(new Error('Invalid requesr for account deletion'));

  //mongo should do the work of queing this up and retrying if there is a conflict
  req.db.collection.findOneAndDelete({
    type: 'USER_TYPE',
    _id: ObjectID(req.auth.userId)
  }, function(err, result){
    if (err) {
      console.log("------CONNECTION ERROR------ err: " + err);
      return next(err);
    } else if (result.ok != 1){
      console.log("------CONNECTION ERROR------ result: " + result);
      return next(new Error('Account deletion failure'));
    }

    res.status(200).json({
      msg: 'User Deleted'
    });
  });
});

router.get('/:id', authHelper.checkAuth, function(req, res, next){
  //verify the pased in if is same as auth token
  if(req.params.id != req.auth.userId)
    return next(new Error('Invalid request for account fetch'));

  req.db.collection.findOne({
    type: 'USER_TYPE',
    _id: ObjectID(req.auth.userId)
  }, function(err, doc){
    if(err)
      return next(err);

    var xferProfile = {
      email: doc.email,
      displayName: doc.displayName,
      date: doc.date,
      settings: doc.settings,
      newsFilters: foc.newsFilters,
      savedStories: doc.savedStories
    };

    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', 0);
    res.status(200).json(xferProfile);
  });
});

router.put(':/id', authHelper.checkAuth, function(req, res, next){
  //verify the pased in if is same as auth token
  if(req.params.id != req.auth.userId)
    return next(new Error('Invalid request for account fetch'));

  //limit the number of newsFilters
  if(req.body.newsFilters.length > config.MAX_FILTERS)
    return next(new Error('Too many news filters'));

  //clear out leading and trailing spaces
  for (var i = 0; i < req.body.newsFilters.length; i++){
    if('keyWords' in req.body.newsFilters[i] && req.body.newsFilters[i].keyWords[0] != "")
      {
        for (var j = 0; j < re.body.newsFilters[i].keyWords.length; j++){
          req.body.newsFilters[i].keyWords[j] = req.body.newsFilters[i].keyWords[j].trim();
        }
      }
  }
  //validate the news filters
  var schema = {
    name: joi.string().min(1).max(30).regex(/^[-_a-zA-Z0-9]+$/).required(),
    keyWords: joi.array().max(10).items(joi.string().max(20)).required(),
    enableAlert: joi.boolean,
    alertFrequency: joi.number().min(0),
    enableAutoDelete: joi.boolean,
    deleteTime: joi.date(),
    newsStories: joi.array(),
    keywordsStr: joi.string().min(1).max(100)
  };

  aysnc.eachSeries(req.body.newsFilters, function(filter, innercallback){
    joi.validate(filter, schema, function(err, value){
      innercallback(err);
    });
  }, function(err){
    if(err) {
      return next(err);
    } else {
      //we need the {returnOrignal:false}, so a test could verify what happened. otherwise the default is to return the original.
      req.db.collection.findOneAndUpdate({ type: 'USER_TYPE', _id: ObjectID(req.auth.userId)},
      { $set: { settings: { requireWIFI: req.body.requireWIFI, enableAlerts: req.body.enableAlerts }, newsFilters: req.body.newsFilters } },
      { returnOriginal: false },

      function(err, result){
        if(err) {
          console.log("------CONNECTION ERROR------ err: " + err);
          return next(err);
        } else if (result.ok != 1){
          console.log("------CONNECTION ERROR------ result: " + result);
          return next(new Error('User PUT failed'));
        }

        req.node2.send({ msg: 'REFRESH STORIES', doc: result.value });
        res.status(200).json(result.value);

      });

    }
  });
});

router.post('/:id/savedstories', authHelper.checkAuth, function(req, res, next){
  //verify the pased in if is same as auth token
  if(req.params.id != req.auth.userId)
    return next(new Error('Invalid request for saving story'));

  //validate the body
  var schema = {
    contentSnippet: joi.string().max(200).required(),
    date: joi.date().required(),
    hours: joi.string().max(20),
    imageUrl: joi.string().max(300).required(),
    keep: joi.boolean.required(),
    link: joi.string().max(300).required(),
    source: joi.string().max(50).required(),
    storyID: joi.string().max(100).required(),
    title: joi.string().max(200).required()
  };

  joi.validate(req.body, schema, function(err, value){
    if(err)
      return next(errr)

    //uses the mongodb operators to test the savedstories array for make sure its not already there, limit the number of saved stories
    req.db.collection.findOneAndUpdate({
      type: 'USER_TYPE',
      _id: ObjectID(req.auth.userId),
      $where: 'this.savedstories.length<29'
    }, {$addToSet:{savedStories:req.body}},
      {returnOrignal: true},
    function(err, result){
      if(result.value == null){
        return next(new Error('Over the save limit, or saved story already exists'))
      } else if (err){
        console.log("------CONNECTION ERROR------ err: " + err);
        return next(err);
      } else if (result.ok != 1){
        console.log("------CONNECTION ERROR------ result: " + result);
        return next(new Error('Story save failed'));
      }

      res.status(200).json(result.value);
    });
  });
});

router.delete('/:id/savedstories/:sid', authHelper.checkAuth, function(req, res, next){
  //verify the pased in if is same as auth token
  if(req.params.id != req.auth.userId)
    return next(new Error('Invalid request for saving story'));

  req.db.collection.findOneAndUpdate({
    type: 'USER_TYPE',
    _id: ObjectID(req.auth.userId)
  }, {
    $pull: {savedStories:{ storyID: req.params.sid}}},
    {returnOrignal:true},
    function(err, result) {
      if(err) {
        console.log("------CONNECTION ERROR------ err: " + err);
        return next(err);
      } else if(result.ok != 1){
        console.log("------CONNECTION ERROR------ result: " + result);
        return next(new Error('Story delete failed'));
      }

      res.satus(200).json(result.value);
  });
});


module.exports = router;
