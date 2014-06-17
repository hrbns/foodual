var _ = require('lodash');
var User = require('../models/User');
var request = require('request');
var Factual = require('factual-api');

/**
 * GET /
 * Home page.
 */

exports.index = function(req, res) {
  res.render('home', {
    title: 'Home'
  });
};

/**
 * POST /keys/add
 * Add key.
 */
exports.postAddKey = function(req, res, next) {
  addKey = function() {
    User.findByIdAndUpdate(req.user.id, 
    {$push: {"factualKeys": {"key": req.body.key, "secret": req.body.secret}}},
    function(err, user) {
      if (err) return next(err);
      var factual = new Factual(req.body.key, req.body.secret);
      factual.get('/t/places-us', {filters:{category_ids:{"$includes":1}}}, function (error, data, response) {
        if ('x-factual-throttle-allocation' in response.headers) {
          respLimitHeader = JSON.parse(response.headers['x-factual-throttle-allocation']);
          var keyIndex = _.findIndex(user.factualKeys, function(factKey){
            return factKey.key == req.body.key;
          });
          user.factualKeys[keyIndex].daily = respLimitHeader.daily;
          user.save();
          res.contentType('json');
          return res.send({ key: req.body.key, daily: respLimitHeader.daily});
        } else {
          return res.status(response.statusCode).send('Invalid key');
        }
      });
    });
  };
  User.findById(req.user.id, function(err, user) {
    if (!req.body.key) {
      return res.status('411').send('Empty key');
    }
    for (var i = 0; i < user.factualKeys.length; i++) {
      if (user.factualKeys[i].key == req.body.key) {
        return res.status('409').send('Duplicate key');
      }
    }
    if (err) return next(err);
    addKey();
  });     
}

/**
 * GET /keys/remove/:keyId
 * Remove key.
 */
exports.getRemoveKey = function(req, res, next) {
  var keyId = req.params.keyId;
  User.findByIdAndUpdate(req.user.id, 
    {$pull: { factualKeys: {key: keyId}}},
    function(err, user) {
      if (err) { 
        res.send(err.code);
        return next(err);
      }
    });
  res.contentType('json');
  res.send("Key: " + keyId + " deleted");
}
