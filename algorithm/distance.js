var _ = require('underscore');
var algo = require('ape-algorithm');
var where = require('where');

// 非直线系数，即两点间经过道路的实际距离与空间直线距离的比值，又称交通曲度系数
// 根据网格式交通布局，简单设置系数
var NONLINEAR = Math.pow(2, 0.5).toFixed(5);
var SPEED = 20; // average speed, km/h, 误差很大， 粗略用用20

exports.calculatePointAttributes = function(center, places) {
	var tmpArr = [];
	var start = new where.Point(center.latitude, center.longitude);
	_.each(places, function(place) {
		// 算出每个点到出发点的距离
		var end = new where.Point(place.latitude, place.longitude);
		place.dist = start.distanceTo(end);
		// 计算这个点相对于正北方向 的角度
		place.bear = start.bearingTo(end);
		place.direction = start.directionTo(end);
		tmpArr.push(place);
	})
	return tmpArr;
}	

// 计算两点间大概的实际距离
exports.calculateRealDistOfTwoPoints = function(start, end) {
	var X = new where.Point(start.latitude, start.longitude),
		Y = new where.Point(end.latitude, end.longitude),
		// 非直线系数，即两点间经过道路的实际距离与空间直线距离的比值，又称交通曲度系数
		// 根据网格式交通布局，简单设置系数
		nonlinear; // 系数
	// 得到两点间的弧度弧度
	// var radian = (0.017453293*(2* Math.PI / 360)) * X.bearingTo(Y),
	var bear = X.bearingTo(Y),
		direction = X.directionTo(Y),
		dist = X.distanceTo(Y),
		radian;
	// 根据方位，计算两点间的交通曲度系数
	if(direction == 'N' || 'S' || 'W' || 'E') {
		nonlinear = 1;
	}
	if(direction == 'NE') {
		radian = 0.017453293 * bear;
		nonlinear = Math.sin(radian) + Math.cos(radian);
	}
	if(direction == 'SE') {
		radian = 0.017453293 * (180 - bear);
		nonlinear = Math.sin(radian) + Math.cos(radian);
	}
	if(direction == 'SW') {
		radian = 0.017453293 * (270 - bear);
		nonlinear = Math.sin(radian) + Math.cos(radian);
	}
	if(direction == 'NW') {
		radian = 0.017453293 * (360 - bear);
		nonlinear = Math.sin(radian) + Math.cos(radian);
	}
	nonlinear = nonlinear.toFixed(5);
	return nonlinear * dist;

}

// 返回两点间的直线距离
exports.calculateLineDistOfTwoPoints = function(start, end) {
	var X = new where.Point(start.latitude, start.longitude),
		Y = new where.Point(end.latitude, end.longitude);

	var	dist = X.distanceTo(Y);
	return dist;
}

exports.findClosePlace = function(origin, places) {
	var X = new where.Point(origin.latitude, origin.longitude);

	places = _.map(places, function(place) {
		var Y = new where.Point(place.latitude, place.longitude);
		var neardist = X.distanceTo(Y);
		place.neardist = neardist;
		return place;
	})
	return _.first(algo.quicksort.sortObj(places, 'neardist', 'asc'));
}

// 这个寻找方案， 需要精细处理， 直接影响路线的合理
// 寻找角度差在180之内的点， 确保不会反向
// 如果相同方向上没有了， 再从全局找
// 将相同方向的点插入到最近点之前， 这样可以排除最后剩下最北边和最南边的情况
exports.findCloseBearPlace = function(origin, places) {
	var X = new where.Point(origin.latitude, origin.longitude);

	var bear = origin.bear;
	var samedirectionplaces = [];
	_.each(places, function(p) {
		// console.log(origin.name + ' bearto ' + p.name + '=============' + Math.abs(p.bear - bear));
		if(Math.abs(p.bear - bear) <= 45){
			samedirectionplaces.push(p);
		};
	});
	if(samedirectionplaces.length > 0) {
		places = _.map(samedirectionplaces, function(place) {
			var Y = new where.Point(place.latitude, place.longitude);
			var neardist = X.distanceTo(Y);
			place.neardist = neardist;
			return place;
		});
		// console.log('_=========================');
		// console.log(_.first(algo.quicksort.sortObj(places, 'neardist', 'asc')).name);
		return _.first(algo.quicksort.sortObj(places, 'neardist', 'asc'));
	} else {
		places = _.map(places, function(place) {
			var Y = new where.Point(place.latitude, place.longitude);
			var neardist = X.distanceTo(Y);
			place.neardist = neardist;
			return place;
		});
		// console.log(_.first(algo.quicksort.sortObj(places, 'neardist', 'asc')).name);
		return _.first(algo.quicksort.sortObj(places, 'neardist', 'asc'));
	}
}













