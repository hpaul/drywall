'use strict';

exports.find = function(req, res, next){
  req.query.name = req.query.name ? req.query.name : '';
  req.query.language = req.query.language ? req.query.language : '';
  req.query.limit = req.query.limit ? parseInt(req.query.limit, null) : 20;
  req.query.page = req.query.page ? parseInt(req.query.page, null) : 1;
  req.query.sort = req.query.sort ? req.query.sort : '_id';

  var filters = {};

  if (req.query.name) {
    filters['header.name'] = new RegExp('^.*?'+ req.query.name +'.*$', 'i');
  }

  if (req.query.language) {
    filters['header.language'] = new RegExp('^.*?'+ req.query.language +'.*$', 'i');
  }

  req.app.db.models.Subscription.pagedFind({
    filters: filters,
    limit: req.query.limit,
    page: req.query.page,
    sort: req.query.sort
  }, function(err, results) {
    if (err) {
      return next(err);
    }

    if (req.xhr) {
      res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      results.filters = req.query;
      res.send(results);
    }
    else {
      results.filters = req.query;
      res.render('admin/subscriptions/index', { data: { results: escape(JSON.stringify(results)) } });
    }
  });
};

exports.read = function(req, res, next){
  req.app.db.models.Subscription.findById(req.params.id).exec(function(err, subscription) {
    if (err) {
      return next(err);
    }

    if (req.xhr) {
      res.send(subscription);
    }
    else {
      res.render('admin/subscriptions/details', { data: { record: escape(JSON.stringify(subscription)) } });
    }
  });
};

exports.create = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.user.roles.admin.isMemberOf('root')) {
      workflow.outcome.errors.push('You may not create subscriptions.');
      return workflow.emit('response');
    }

    var valid = true;

    for(var element in req.body.header)
    {
      if (req.body.header.hasOwnProperty(element)) {

        if(!req.body.header[element] && valid) {

          workflow.outcome.errors.push('A ' + element + ' is required.');
          return workflow.emit('response');
        }
      }
    }

    workflow.emit('duplicateSubscriptionCheck');
  });

  workflow.on('duplicateSubscriptionCheck', function() {
    req.app.db.models.Subscription.findOne({ 'header.name': req.body.name }).exec(function(err, subscription) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (subscription) {
        workflow.outcome.errors.push('That name is already taken.');
        return workflow.emit('response');
      }

      workflow.emit('createSubscription');
    });
  });

  workflow.on('createSubscription', function() {
    req.body.header.active = 0;

    var fieldsToSet = {
      header: req.body.header,

      userCreated: {
        id: req.user.roles.admin.id,
        name: req.user.username
      }
    };

    req.app.db.models.Subscription.create(fieldsToSet, function(err, subscription) {
      if (err) {
        return workflow.emit('exception', err);
      }

      workflow.outcome.record = subscription;
      return workflow.emit('response');
    });
  });

  workflow.emit('validate');
};

exports.update = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.user.roles.admin.isMemberOf('root')) {
      workflow.outcome.errors.push('You may not update subscriptions.');
      return workflow.emit('response');
    }

    var valid = true;

    for(var element in req.body.header)
    {
      if (req.body.header.hasOwnProperty(element)) {

        if(!req.body.header[element] && valid) {

          workflow.outcome.errors.push('A ' + element + ' is required.');
          return workflow.emit('response');
        }
      }
    }

    workflow.emit('patchSubscription');
  });

  workflow.on('patchSubscription', function() {
    var fieldsToSet = {
      header: req.body.header
    };

    req.app.db.models.Subscription.findByIdAndUpdate(req.params.id, fieldsToSet, function(err, subscription) {
      if (err) {
        return workflow.emit('exception', err);
      }

      workflow.outcome.subscription = subscription;
      return workflow.emit('response');
    });
  });

  workflow.emit('validate');
};

exports.delete = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.user.roles.admin.isMemberOf('root')) {
      workflow.outcome.errors.push('You may not delete subscriptions.');
      return workflow.emit('response');
    }

    workflow.emit('deleteSubscription');
  });

  workflow.on('deleteSubscription', function(err) {
    req.app.db.models.Subscription.findByIdAndRemove(req.params.id, function(err, category) {
      if (err) {
        return workflow.emit('exception', err);
      }
      workflow.emit('response');
    });
  });

  workflow.emit('validate');
};
