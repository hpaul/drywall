'use strict';
var subcribed = function(results, account) {

  return results.map(function(result_subscription) {

    account.forEach(function(account_subscription) {
      if(result_subscription.id === account_subscription.id) {
        result_subscription.header.active = 1;

        console.log(account_subscription.header.active);
      }
    });

    return result_subscription;

  });
};

exports.find = function(req, res, next){
  req.query.name = req.query.name ? req.query.name : '';
  req.query.limit = req.query.limit ? parseInt(req.query.limit, null) : 20;
  req.query.page = req.query.page ? parseInt(req.query.page, null) : 1;
  req.query.sort = req.query.sort ? req.query.sort : '_id';

  var filters = {};

  if (req.query.name) {
    filters.name = new RegExp('^.*?'+ req.query.name +'.*$', 'i');
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
    
    results.data = subcribed(results.data, req.user.roles.account.subscriptions);
    
    if (req.xhr) {
      res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      results.filters = req.query;

      res.send(results);
    }
    else {
      results.filters = req.query;
      
      res.render('account/subscription/index', { data: { results: escape(JSON.stringify(results)) } });
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
      res.render('admin/subscription/details', { data: { record: escape(JSON.stringify(subscription)) } });
    }
  });
};

exports.update = function(req, res, next){
  var workflow = req.app.utility.workflow(req, res);


  workflow.on('validate', function() {
    if (!req.body.header) {
      workflow.outcome.errors.push('Data is required.');
      return workflow.emit('response');
    }

    workflow.emit('updateAccount');
  });

	workflow.on('updateAccount', function() {
		
		if(req.body.header.active) {
			
			workflow.emit('subscribe');

		} else {
			var subscriptions = req.user.roles.account.subscriptions;

			subscriptions = subscriptions.filter(function(subscription) {
				return (subscription.id.toString() !== req.body._id);
			});

			workflow.outcome.subscriptions = subscriptions;
			workflow.emit('unsubscribe');

		}
	});

	workflow.on('subscribe', function() {
		req.app.db.models.Account.findByIdAndUpdate(req.user.roles.account.id, { $push: { subscriptions: req.body } }, function(err, account) {
			if (err) {
				return workflow.emit('exception', err);
			}

			workflow.outcome.account = account;
			return workflow.emit('response');
		});
	});

	workflow.on('unsubscribe', function() {
		req.app.db.models.Account.findByIdAndUpdate(req.user.roles.account.id, { subscriptions: workflow.outcome.subscriptions }, function(err, account) {
			if (err) {
				return workflow.emit('exception', err);
			}

			workflow.outcome.account = account;
			return workflow.emit('response');
		});
	});

	workflow.emit('validate');
};