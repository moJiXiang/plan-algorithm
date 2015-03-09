var async = require('async');

var test = function() {
	var arr = ['1', '2'];
	async.map(arr, getname, function(err, r) {
		console.log(r);
	})
}



var getname = function(name, cb) {
	var name = name + 'mojixiang';
	cb(null, name);
}

test();