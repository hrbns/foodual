var User = require('../models/User');

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
  console.log(req.body.key);
  addKey = function() {
    User.findByIdAndUpdate(req.user.id, 
    {$push: {"factualKeys": {"key": req.body.key, "secret": req.body.secret}}},
    function(err, user) {
        if (err){
          console.log(err.code);
          return next(err);
        }
    });
    res.contentType('json');
    res.send(req.body);
  };
  User.findById(req.user.id, function(err, user) {
    for (var i = 0; i < user.factualKeys.length; i++) {
      if (user.factualKeys[i].key == req.body.key) {
        return res.status('500').send('Duplicate key');
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
  console.log(keyId);
  User.findByIdAndUpdate(req.user.id, 
    {$pull: { factualKeys: {key: keyId}}},
    function(err, user) {
      if (err) { 
        console.log(err.code);
        res.send(err.code);
        return next(err);
      }
    });
  res.contentType('json');
  res.send("Key: " + keyId + " deleted");
}
