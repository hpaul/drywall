'use strict';

exports = module.exports = function(app, mongoose) {
  var subscriptionSchema = new mongoose.Schema({
    
    header: {
      name: { type: String, default: '' },
      description: { type: String, default: '' },
      language: { type: String, default: 'EN' },
      genre: [String],
      active: { type: Boolean, default: 1 }
    },

    data: {
      subscriptionimage: { type: String },
      subscription: { type: String },
      subscriptionfallback: { type: String }
    },
    
    userCreated: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      time: { type: Date, default: Date.now },
      name: { type: String, default: '' }
    }
  });

  subscriptionSchema.plugin(require('./plugins/pagedFind'));
  subscriptionSchema.index({ 'header.name': 1 });
  subscriptionSchema.index({ 'header.description': 1 });
  subscriptionSchema.set('autoIndex', (app.get('env') === 'development'));
  app.db.model('Subscription', subscriptionSchema);
};
