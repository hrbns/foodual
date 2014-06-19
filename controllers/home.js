var _ = require('lodash');
var User = require('../models/User');
var Job = require('../models/Job');
var Factual = require('factual-api');
var where = require('where')

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
exports.addKey = function(req, res, next) {
  // executed only after key is validated
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
  validateKey = function (err, user, callback) {
    var keyIndex = _.findIndex(user.factualKeys, function(factKey){
      return factKey.key == req.body.key;
    });
    // handling various errors 
    if (!req.body.key) {
      var messages =  { messages: { errors: { error: { msg: "Empty key!" }}}};
      return res.render('partials/flash', messages, function(err, html) {
        res.status(411).send({flash: html});
      });
    }
    if (keyIndex != -1) {
      var messages =  { messages: { errors: { error: { msg: "Duplicate key!" }}}};
      return res.render('partials/flash', messages, function(err, html) {
        res.status('409').send({ flash: html }); 
      });
    }
    // if no errors add the key
    callback();
  }

  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);
    validateKey(err, user, function() {
      addKey();
    });
  });     
}

/**
 * GET /keys/remove/:keyId
 * Remove key.
 */
exports.removeKey = function(req, res, next) {
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

/**
 * POST /job/run
 * Run factual job
 */
exports.runJob = function(req, res, next) {
  User.findById(req.user.id, function(err, user) {
    if (!req.body.key) {
      var messages =  { messages: { errors: { error: { msg: "Empty key!" }}}};
      return res.render('partials/flash', messages, function(err, html) {
        res.status(411).send({flash: html});
      });
    }
    if (!req.body.bounds) {
      var messages =  { messages: { errors: { error: { msg: "No bounds given!" }}}};
      return res.render('partials/flash', messages, function(err, html) {
        res.status('409').send({flash: html});
      });
    }
    var job = new Job();
    job.key = req.body.key;
    job.progress = 0;
    user.jobs.push(job);
    user.save();
    console.log(req.body);
    var keyIndex = _.findIndex(user.factualKeys, function(factKey){
      return factKey.key == req.body.key;
    });
    var jobIndex = _.findIndex(user.jobs, function(job){
      return job.key == req.body.key;
    });
    var queriesLeft;
    if (req.body.queryLimit) {
      queriesLeft = parseInt(req.body.queryLimit);
    } else {
      queriesLeft = (1 - (parseInt(user.factualKeys[keyIndex].daily.replace('%', '')) * 0.01)) * 10000;
    }
    var secret = user.factualKeys[keyIndex].secret;
    var factual = new Factual(req.body.key, secret);
    var step = (parseFloat(req.body.bounds.se.lon) - parseFloat(req.body.bounds.nw.lon)) / queriesLeft;
    console.log(step);
    console.log(req.body.bounds);
    var nw = { lat: parseFloat(req.body.bounds.nw.lat), lon: parseFloat(req.body.bounds.nw.lon) };
    var se = { lat: parseFloat(req.body.bounds.se.lat), lon: parseFloat(req.body.bounds.nw.lon + step) };
    queriesLeft = 5;
    var queryCount = queriesLeft;
    console.log('query count: ' + queryCount);
    var dailyLimit = '0%';
    for (var i = 0; i < 5; i++) {
      factual.get('/t/restaurants-us', {geo:{"$within": {"$rect":[[ nw.lat, nw.lon], [se.lat, se.lon]]}}}, function (error, res, respObject) {
        nw.lon = se.lon;
        se.lon += step;
        job.data.push(res.data);
        dailyLimit = respObject.headers['x-factual-throttle-allocation'].daily;
        queriesLeft--;
        job.progress = 100 - (Math.round((queriesLeft/queryCount)*100));
        job.save();
        user.factualKeys[keyIndex].daily = dailyLimit;
        user.save();
        console.log( ' queriesLeft: ' + queriesLeft + '   queryCount: ' + queryCount);
        console.log(' progress: ' + user.jobs[jobIndex].progress);
      });
      if (se.lon >= req.body.bounds.se.lon || queriesLeft == 0) {
        user.save();
        return res.send("Job complete!");
      }
    }
    if (err) return next(err);
  });
}

/**
 * POST /job/progress
 * Return progress update
 */
exports.progressUpdate = function (req, res, next) {
  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);
    var keyIndex = _.findIndex(user.factualKeys, function(factKey){
      return factKey.key == req.body.key;
    });
    var jobIndex = _.findIndex(user.jobs, function(job) {
      return job.key == req.body.key;
    }); 
    var progress = 0; 
    if (jobIndex != -1) {
      progress = user.jobs[jobIndex].progress;
    }
    console.log(user.factualKeys[keyIndex].daily);
    return res.send({ 
      progress: progress,
      daily: user.factualKeys[keyIndex].daily 
    });
  });     
}
