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
 * POST /job/init
 * Initialize factual job
 */
exports.initJob = function(req, res, next) {
  var job = new Job();
  job.save(function (err, job) {
    return res.send({job_id: job._id});
  });
}

/**
 * POST /job/run
 * Run factual job
 */
exports.runJob = function(req, res, next) {
  Job.findById(req.body.job_id, function (err, job) {
    console.log(' ENTERING JOB: ' + req.body.job_id);
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
    job.key = req.body.key;
    job.progress = 0;
    var queriesLeft;
    if (req.body.queryLimit) {
      queriesLeft = parseInt(req.body.queryLimit);
    } else {
      var messages =  { messages: { errors: { error: { msg: "Query limit not given!" }}}};
      return res.render('partials/flash', messages, function(err, html) {
        res.status('409').send({flash: html});
      });
    }
    var secret;
    User.findById(req.user.id, function(err, user){
      console.log(user);
      var keyIndex = _.findIndex(user.factualKeys, function(factKey) {
        return factKey.key == req.body.key;
      });
      var factual = new Factual(user.factualKeys[keyIndex].key, user.factualKeys[keyIndex].secret);
      var step = (parseFloat(req.body.bounds.se.lon) - parseFloat(req.body.bounds.nw.lon)) / queriesLeft;
      console.log(step);
      console.log(req.body.bounds);
      var bounds = {nw:  { lat: parseFloat(req.body.bounds.nw.lat), lon: parseFloat(req.body.bounds.nw.lon) },
                   se:  { lat: parseFloat(req.body.bounds.se.lat), lon: parseFloat(req.body.bounds.nw.lon + step) }};
      var queryCount = queriesLeft;
      console.log('query count: ' + queryCount);
      var errorResp;
      var queryFactual = function(factual, bounds) {
        var qL = queriesLeft; 
        var data;
        factual.get('/t/restaurants-us', {geo:{"$within": {"$rect":[[ bounds.nw.lat, bounds.nw.lon], [bounds.se.lat, bounds.se.lon]]}}}, function (error, dataObj, respObject) {
          if (dataObj == null) {
            console.log(error);
          } else {
            data = job.data.push(dataObj.data);
          }
        });
        if (!data) {
          var messages =  { messages: { errors: { error: { msg: "Empty response from factual!" }}}};
          errorResp = function() {
            res.render('partials/flash', messages, function(err, html) {
              res.status('411').send({flash: html});
            })
          };
          return;
        }
        queriesLeft--;
        job.progress = Math.round(100 - (queriesLeft/queryCount)*100);
        console.log( ' queriesLeft: ' + queriesLeft + '   queryCount: ' + queryCount);
        console.log(' progress: ' + job.progress);
        if (qL != queriesLeft) {
          job.save();
          return;
        }      
      }
      queryFactual(factual, bounds);
      while ((queriesLeft >= 0 ) && (!errorResp)) {
        console.log(queriesLeft);
        bounds.nw.lon = bounds.se.lon;
        bounds.se.lon += step;
        job.save();
        queryFactual(factual, bounds);
      } 
      job.save();
      if (errorResp) {
        job.status = 'aborted';
        job.save;
        return errorResp();
      } else if (bounds.se.lon >= req.body.bounds.se.lon || queriesLeft <= 0) {
        var messages =  { messages: { success: { success: { msg: "Job completed!" }}}};
        return res.render('partials/flash', messages, function (err, html) {
          res.send({flash: html});
        });
      }
    });
  });
}

/**
 * POST /job/progress
 * Return progress update
 */
exports.progressUpdate = function (req, res, next) {
  Job.findById(req.body.job_id, function(err, job) {
    return res.send({ 
      progress: job.progress,
      status: job.status
    });
  });     
}
