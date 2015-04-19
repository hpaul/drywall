'use strict';

exports.init = function(req, res){
  res.render('account/index', { subscriptions: req.user.roles.account.subscriptions });
};
