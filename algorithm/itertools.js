var itertools = require('itertools');
var dis = require('./distance');
var itertools = require("itertools");
var _ = require('underscore');
var arrs = [{
	name: 'a',
	lat: 23
}, {
	name: 'b',
	lat: 2
}, {
	name: 'c',
	lat: 15
}]
var nums = [2,1,4,1,5,6];
var fruitBaskets = itertools.permutationsSync(arrs, 3);

var start = { latitude: 40.759676, longitude: -73.985073, name: '纽约时代广场' },
	end = { latitude: 40.708328,
    longitude: -74.008895,
    duration: 60,
    name: '纽约联邦储备银行',
    type: 0,
    id: '516cc44ce3c6a60f69000033',
}
var result = _.reduce(arrs, function(index, arr) {
	return index + arr.lat
}, 0)

var result2 = _.without(arrs, {name: 'b'});
var result3 = _.without(nums, 1);

var count = 0;
var i = 0;
(function(i) {
	for(var a = 0; a<2; a++) {
		i ++ ;
		count += i;
	}
})(i);
console.log(count);
// console.log(result2);
// console.log(dis.calculateRealDistOfTwoPoints(start, end));