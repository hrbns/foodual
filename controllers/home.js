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
  User.findByIdAndUpdate(req.user.id, 
    {$push: {"factualKeys": {"key": req.body.key, "secret": req.body.secret}}},
    {safe: true, upsert: true},
    function(err, user) {
        if (err) return next(err);
    });
  res.contentType('json');
  res.send(req.body);
  //user.save(function(err) {
    //if (err) return next(err);
    //req.flash('success', { msg: 'Added key.' });
    //res.redirect('/');
  //});
}

/**
 * POST /keys/delete
 * Remove key.
 */
exports.postDeleteKey = function(req, res, next) {
  User.findByIdAndUpdate(req.user.id, 
    {$unset: {"factualKeys": {"key": req.body.key}}},
    {safe: true, upsert: true},
    function(err, user) {
        if (err) return next(err);
    });
}
