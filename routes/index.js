var express = require('express');
var router = express.Router();
var models = require('../models');
var async = require('async');
var algorithm = require('../algorithm/version1.0.js');

/* GET home page. */
router.get('/', function(req, res) {
	var city = req.query.city;
	async.series({
		city: function(cb) {
			models.City.findOne({_id: city}).exec(function(err, result) {
				cb(null, result);
			})
		},
		attractions: function(cb) {
			models.Attraction.find({city_id: city, show_flag: 1}).exec(function(err, results){
				cb(null, results);
			})
		},
		restaurants: function(cb) {
			models.Restaurant.find({city_id: city, show_flag: true}).exec(function(err, results){
				cb(null, results);
			})
		},
		areas: function(cb) {
			models.Area.find({city_id: city}).exec(function(err, results){
				cb(null, results);
			})
		}
	}, function(err, results) {
  		res.render('map', { data: results });
	})
});

router.post('/calculate', function(req, res) {
	var tripplan = JSON.parse(req.body.tripplan)
	algorithm.calculate(tripplan, function(result) {
		res.status(200).send(result);
	})
})
module.exports = router;
