/**
 * Created by marku on 2016-04-19.
 */
var fs = require('fs');

var config = JSON.parse(fs.readFileSync('config.json'));

// Authentication and Authorization Middleware
var auth = function(req, res, next) {
  if ((req.session && req.session.admin) || req.get('token') === config.token)
    return next();
  else {
    req.flash('danger', 'Unauthorized!');
    return res.redirect('/admin');
  }
};

module.exports = auth;
