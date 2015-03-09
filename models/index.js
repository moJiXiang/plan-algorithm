var mongoose = require('mongoose'),
	config = require('../config');

mongoose.connect(config.db, function (err) {
  if (err) {
    console.error('connect to %s error: ', config.db, err.message);
    process.exit(1);
  }
});

require('./attraction');
require('./restaurant');
require('./area');
require('./city');
require('./path');

exports.Attraction = mongoose.model('Attraction');
exports.Restaurant = mongoose.model('Restaurant');
exports.Area = mongoose.model('Area');
exports.City = mongoose.model('City');
exports.Path = mongoose.model('Path');
