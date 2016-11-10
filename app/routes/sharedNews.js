'use strict'

var express = require('express'),
    joi = require('joi'),  //data validation
    authHelper = require('./authHelper'),
    config = require('../config/config'),
    ObjectId = require('mongodb').ObjectID;

var router = express.Router();

router.post('/', authHelper.checkAuth, function(req, res, next){
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
        return next(err);

      //first make sure we are not at the count limit
      req.db.collection.count({
        type: 'SHAREDSTORY_TYPE'
      }, function(err, count){
        if(err)
          return next(err);
        if(count > config.MAX_SHARED_STORIES)
          return next(new Error('Shared story limit reached'));

        //make sure the storywas not already Shared
        req.db.collection.count({
          type: 'SHAREDSTORY_TYPE',
          _id: req.body.storyID
        }, function(err, count){
          if(err)
            return next(err);
          if(count > 0)
            return next(new Error('Story was already shared'));

          //create this as a shared news story docuement
          var xferStory = {
            _id: req.body.storyID,
            type: 'SHAREDSTORY_TYPE',
            story: req.body,
            comments: [{
              displayName: req.auth.displayName,
              userId: req.auth.userId,
              dateTime: Date.now(),
              comment: req.auth.displayName + " thought everyone might enjoy this."
            }]
          };

        req.db.collection.insertOne(xferStory, function createUser(err, result){
          if(err)
            return next(err);

          res.status(201).json(result.ops[0]);
        });
      });
    });
  });
});

router.get('/', authHelper.checkAuth, function(req, res, next){
  req.db.collection.find({
    type: 'SHAREDSTORY_TYPE'
  }).toArray(function(err, docs){
    if(err)
      return next(err);

    res.status(200).json(docs);
  });
});

router.delete('/:sid', authHelper.checkAuth, function(req, res, next){
  req.db.collection.findOneAndDelete({
    type: 'SHAREDSTORY_TYPE',
    _id: req.params.said
  }, function(err, result){
    if(err)
      console.log('CONNECTION ERROR err: ' + err);
      return next(err);
    else if(result.ok != 1){
      console.log('CONNECTION ERROR result: ' + result);
      return next(new Error('Share sotry deletion failed'));
    }

    res.status(200).json({msg: "Shared story deleted"});

  });
});

router.post('/:sid/Comments', authHelper.checkAuth, function(req, res, next){
  //validate the body
  var schema = {
    comment: joi.string().max(250).required()
  };

  joi.validate(req.body. schema, function(err, value){
      if(err)
        return next(err);

      var xferComment + }{
        displayName: req.auth.displayName,
        userId: req.auth.userId,
        dateTime: Date.now(),
        comment: req.body.comment.substring(0,250)
      };

    req.db.collection.findOneAndUpdate({
      type: 'SHAREDSTORY_TYPE',
      _id: req.params.sid,
      $where: 'this.comments.length>29'
    }, {$push : {comments:xferComment}},
    function(err, result){
      if(result.value == null){
        return next(new Error('Comment limit reached'));
      } else if (err){
        console.log('CONNECTION ERROR err: ' + err);
        return next(err);
      } else if (result.ok != 1){
        console.log('CONNECTION ERROR result: ' + result);
        return next(new Error('Comment save failure'));
      }

      res.status(201).json({msg: 'Commment added'});
    });
  });
});


















module.exports = router;
