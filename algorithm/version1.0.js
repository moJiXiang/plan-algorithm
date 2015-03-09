var _ = require('underscore'),
	dis = require('./distance');
var algo = require('ape-algorithm');
var multichoose = require('multichoose'),
	itertools = require('itertools'),
	async = require('async'),
	request = require('request');
var models = require('../models');

// plan:{centers:[Array], places: [Array]}
// days          : Number,   // how many days to be spent in this plan
// startAt       : Number,     // plan starts from date
// endAt         : Number,     // plan ends at date
// intensity     : Number,   // how much intensive is this plan ?
// 命名空间
var G = {};
// 轻松， 中等， 高强度时间， 单位分钟
var easytime = [360, 480]
, middletime = [480, 600]
, hardtime = [600, 720]
, SPEED = 20
, group = []
, TIME = [] //  根据强度得到的时间
, arrayToPoint = [] // 用来保存聚类的点
, bestRoute = [] // 存储最佳路线
, tmp = []; // 临时数组

// G.MODE = transilate;
// 无算法计算
exports.noCalculate = function(plan, cb) {
	plan.places.unshift(_.first(plan.centers));
	var calculatedPlan = plan.places;
	cb(calculatedPlan);
}

// 有算法计算
// 餐馆和购物区都没有推荐时间，如果在某一天的线路上，那么这一天的景点总时间要减少
exports.calculate = function(plan, cb) {
	var placesnum = plan.places.length;

	// 如果点的个数小于3个，先去最近的点，再去最远的点
	// 这个方法保留， 因为点数少的话， 用快速排序效率也会提高一点
	if(placesnum < 3) {
		easyModeCalculate(plan, cb);
	} 
	if(placesnum >= 3) {
		// 如果点数大于3个， 会先判断大概时间， 然后进行分组聚合， 最后进行一天内的点的规划
		hardModeCalculate(plan, cb);
	}


}

// 简单模式，只有1到2个点 
var easyModeCalculate =  function(plan, cb) {
	var center = _.first(plan.centers),
		places = plan.places;
	// 返回带距离的点
	var placeswithattribute = dis.calculatePointAttributes(center, places);
	//  用快速排序来对点进行排序
	var sortedplaces = algo.quicksort.sortObj(placeswithattribute,'dist','asc');
	sortedplaces.unshift(center);
	sortedplaces.push(center);
	cb(sortedplaces);
}
// 三个点以上，需要先计算路程时间和所有景点的推荐总时间
var hardModeCalculate = function(plan, cb) {
	// 将group清理
	group = [];
	TIME = [];
	arrayToPoint = []; // 用来保存聚类的点
	bestRoute = []; // 存储最佳路线
	tmp = [];
	// 总时间变量, 计算总时间， 不能用先枚举所有路径的方法来求最短时间
	// 如果选了20个点， 就得计算20!种情况效率非常低
	// 只能先大概估算一下时间
	var alltime = 0;
	var center = _.first(plan.centers),
		places = plan.places,
		attractions = _.filter(plan.places, function(place){return place.type == 0}),
		restaurants = _.filter(plan.places, function(place){return place.type == 1}),
		areas = _.filter(plan.places, function(place){return place.type == 3}),
		notRestaurants = _.filter(plan.places, function(place){return place.type != 1});
	// var intensity = plan.intensity;
	var intensity = 2;
	// 返回带距离的点
	var placeswithattribute = dis.calculatePointAttributes(center, notRestaurants);

	switch(intensity){
		case 0:
			TIME = [360, 480];
			break;
		case 1:
			TIME = [480, 600];
			break;
		case 2:
			TIME = [600, 720];
			break;
	}

	// 粗略计算大概时间
	var placesforcalcuatetime = algo.quicksort.sortObj(placeswithattribute,'dist','desc');
	placesforcalcuatetime.unshift(center);
	placesforcalcuatetime.push(center);
	alltime = calculateTimeOfRoute(placesforcalcuatetime);
	// _.each(plan.places, function(place, num) {
	// 	alltime += 60 * (dis.calculateRealDistOfTwoPoints(start, place) / SPEED);
	// 	if(place.type != 3) {
	// 		// 有的推荐餐馆没有推荐时间
	// 		if(place.duration) {
	// 			alltime += place.duration;
	// 		} else {
	// 			alltime += 60;
	// 		}
	// 	} else {
	// 		// 购物区域默认3小时
	// 		alltime += 180
	// 	}
	// })
	console.log('alltime------' + alltime);
	// 如果时间在一天的推荐游览时间内或者小于最大值 ， 就直接将这一天的点计算出最优路径
	if(alltime < TIME[1]) {
		var routes = [];
		var route= generateRoutesOfOneDayPlaces(center, notRestaurants);
		routes.push(route);
		var tripplanplaces = returnTripplanPlaces(routes);
		// getAllTrafficOfRoute(tripplanplaces, function(result) {
			if(restaurants.length > 0) {
				var res = planRestaurants(center, routes, restaurants);
				tripplanplaces = tripplanplaces.concat(res);
				cb(tripplanplaces);
			} else {
				cb(tripplanplaces);
			}
		// })
	} else { // 如果时间超出一天的最大推荐时间 就考虑聚类， 然后再划分出天
		// 先分组， 得到大概的区间分布， 如果出现一个点
		// 先按照bear角度，方向，距离三个要素来将所有点进行分组
		var sortedplaces = algo.quicksort.sortObj(placeswithattribute,'dist','desc');
		groupByAttribute(center, sortedplaces, function(result) {
			// // 安排参观， 遵循规则将餐馆安排到靠的最近的点的路线内
			var routes;
			if(restaurants.length > 0) {
				var res = planRestaurants(center, result, restaurants);
				console.log(res);
			} else{
				routes = result;
			}
			// // 给数组内的点赋予day, sequence属性
			// var tripplan = [];
			// _.each(routes, function(route, day) {
			// 	_.each(route, function(point, sequence) {
			// 		if(point.id && point.type != 1) {
			// 			point = _.omit(point, ['dist', 'bear', 'direction', 'neardist', "index"]);
			// 			point.day = day;
			// 			// 因为有出发点作为起点
			// 			point.sequence = sequence - 1;
			// 			point.preloc = [route[sequence -1].latitude, route[sequence - 1].longitude];
			// 			tripplan.push(point);
			// 		} else if(point.type == 1) {
			// 			point = _.omit(point, ['dist', 'bear', 'direction', 'neardist', "index"]);
			// 			point.day = day;
			// 			tripplan.push(point);
			// 		}
			// 	})
			// })
			// getAllTrafficOfRoute(tripplan, function(result) {
			// 	cb(result);
			// });
			cb(result);
		});
				// // groupedplaces: {N:[],NW:[],E:[]}
				// var groupedplaces = _.groupBy(sortedplaces, function(obj) {

				// 	return obj.direction;
				// })

				// // 中心点可以修改, 会根据天数来确定
				// var centers = plan.centers;
				// // calculateTimeOfRoute(centers, groupedplaces, function)
	}
}

var returnTripplanPlaces = function(routes) {
	// 给数组内的点赋予day, sequence属性
	var tripplan = [];
	_.each(routes, function(route, day) {
		_.each(route, function(point, sequence) {
			if (point.id && point.type != 1) {
				point = _.omit(point, ['dist', 'bear', 'direction', 'neardist', "index"]);
				point.day = day;
				// 因为有出发点作为起点
				point.sequence = sequence - 1;
				point.preloc = [route[sequence - 1].latitude, route[sequence - 1].longitude];
				tripplan.push(point);
			} else if (point.type == 1) {
				point = _.omit(point, ['dist', 'bear', 'direction', 'neardist', "index"]);
				point.day = day;
				tripplan.push(point);
			}
		})
	})
	return tripplan;
}
// 将places按照bear, dist来进行分组
// 结果大概是按照两个点到center的角度之差来分组的
// 保证了在北10度和东北15度也会作为一组来考虑
// 在一个方向上， 根据角度差在[-30,30]之间, 距离相差在1.5到0.5倍之间
var groupByAttribute = function(center, sortedplaces, cb) {
	// console.log('use groupByAttribute function');
	var PLACES = sortedplaces;
	if(PLACES.length > 0) {
		// 将每一个点和其他点比较
		var filterplaces = filterNearistPlaces(center, PLACES);
		// 将得到的点存到group数组中
		group.push(filterplaces);
		// 存完点之后， 需要从PLACES中删除存入的点
		_.each(filterplaces, function(p) {
			var index = _.indexOf(PLACES, p);
			PLACES.splice(index,1)
		})
		groupByAttribute(center, PLACES, cb);
	} else {
		// 得到了分组后的点
		// 可能出现两种情况
		// 1.分出来的组，数组长度都为1.[Array[1], Array[1], Array[1], Array[1], Array[1], Array[1], Array[1]]
		// 2.分出来的组，组合点比较多2.[Array[1], Array[1], Array[2], Array[3], Array[2], Array[1], Array[1]]
		// 将组合点看作一个点， bear和dist为平均数， 这样从离的最近的单点或者单组来计算离它最近的单点或者单组
		calculateBestRoute(center, group, function(dayarr) {
			// console.log(group);

			cb(dayarr);
		});
	}
}

/**
 * calculateBestRoute
 * @param  {Array} group [Array[1], Array[1], Array[1], Array[1], Array[1], Array[1], Array[1]]
 * @param  {Array} group [Array[1], Array[1], Array[2], Array[3], Array[2], Array[1], Array[1]]
 */

var calculateBestRoute = function(center, group, cb) {
	// 原始数组
	var originGroup = group;
	// 将这些数组处理， 如果有两个点以上， 就求中心点
	_.each(group, function(places, index) {
		var length = places.length;
		if(length > 1) {
			var lat = _.reduce(places, function(i, p) {return i + p.latitude;}, 0) / length,
				lng = _.reduce(places, function(i, p) {return i + p.longitude;}, 0) / length,
				dist = _.reduce(places, function(i, p) {return i + p.dist;}, 0) / length,
				bear = _.reduce(places, function(i, p) {return i + p.bear;}, 0) / length,
				direction = places[0].direction;
			var duration = _.reduce(places, function(i, p) {
				if(p.type == 3) {
					return i + 180;
				} else {
					return i + p.duration;
				}
			}, 0);
			var point = {
				latitude : lat,
				longitude : lng,
				duration : duration,
				dist : dist,
				bear : bear,
				index : index,
				direction: direction,
				type: 4
			}
			arrayToPoint[index] = point;
		} else {
			// console.log('********************');
			// console.log(places[0].name);
			// console.log(index);
			// console.log('********************');
			arrayToPoint[index] = places[0];
			// 加上index作为标记
			arrayToPoint[index].index = index;
		}
	})
	// 找到出发的第一个点
	var start = dis.findClosePlace(center, arrayToPoint);
	searchClosestPoints(center, start, arrayToPoint, function(result) {
		var maybebestroute = [].concat(result);
		var flag = [];
		try{
			for(var i = 0; i<maybebestroute.length; i++){
				for(var j=0; j<maybebestroute[i].length; j++) {
					var item = originGroup[maybebestroute[i][j].index];
					if(item.length > 1) {
						var arr = [i, maybebestroute[i][j].index];
						flag.push(arr);
						maybebestroute[i].splice(j, 1);
					} 
				}
			}
			for(var k = 0; k<flag.length; k++) {
				maybebestroute[flag[k][0]] = maybebestroute[flag[k][0]].concat(originGroup[flag[k][1]]);
			}
		}catch(e){
			console.log(e);
		}
		// 得到分天后的点， 然后进行一天内的规划
		_.each(maybebestroute, function(route, index){
			maybebestroute[index] = generateRoutesOfOneDayPlaces(center, route)
		})
		cb(maybebestroute);
	});
}	


// 迭代寻找到最近的点， 而且注意时间不能超过一天的浏览时间
var searchClosestPoints = function(center, start, places, cb) {
	var index = _.indexOf(arrayToPoint, start);
	arrayToPoint.splice(index,1)
	tmp.push(start);
	var route = generateRoutesOfOneDayPlaces(center, tmp);
	var spenttime = calculateTimeOfRoute(route);
	var goodtime = TIME[1] + 30;
	// console.log(spenttime, TIME[1], arrayToPoint.length);
	// 限制条件注意
	if((spenttime < TIME[0] || spenttime < goodtime) && arrayToPoint.length > 0) {
		var nextplace = dis.findCloseBearPlace(start, arrayToPoint);
		searchClosestPoints(center, nextplace, arrayToPoint, cb);
	} else if(spenttime > goodtime  && arrayToPoint.length >= 0){ // 超出半个小时可以接受吗
		// 如果时间超过规定时间， 那么会有可能加了一个组， 这样不准确应该删掉
		tmp.pop(start);
		arrayToPoint.push(start);
		bestRoute.push(tmp);
		tmp = [];
		// 如果时间超出了， 就会安排到第二天
		var nextdaystartplace = dis.findClosePlace(center, arrayToPoint)
		searchClosestPoints(center, nextdaystartplace, arrayToPoint, cb);
	} else {
		// 会有 575.7 480 600 0 这种情况
		bestRoute.push(tmp);
		tmp = [];
		cb(bestRoute);
	}
}

var filterNearistPlaces = function(center, places) {
	// 找出离出发点最近的点
	var nearistplace = dis.findClosePlace(center, places);
	var filterplaces =  _.filter(places, function(spot, i) {
		// 找到这个区间内bear和dist都和nearistplace最近的几个点
		var bearXY = Math.abs(nearistplace.bear - spot.bear);
		var distXY = _.max([nearistplace.dist, spot.dist]) / _.min([nearistplace.dist, spot.dist]);
		// console.log(bearXY, distXY);
		// 如果角度在20以内， 距离在1.5倍以内就归到一天
		if(bearXY < 20 && distXY >= 1 && distXY < 1.5) {
			return spot;
		}
	})
	// 返回符合条件的点
	return filterplaces;
}
// 计算几个点之间的大概时间， 不确定因素有公路曲线系数， 和speed
// 这个方法需要大概的计算从中心点出发， 经过n个点回到中心点的时间
// 但是不适用大量点的计算， 算法复杂度太高， 耗费时间
// 适合少量点通过计算最适合路线之后， 再来计算时间 ［center, place, place, center］
var calculateTimeOfRoute = function(places) {
	var time = 0;
	var alldistance = 0;
	// 用循环计算总距离
	for(var i = 0; i<places.length - 1; i++) {
		var start = places[i],
			place = places[i + 1];
		alldistance += dis.calculateLineDistOfTwoPoints(start, place);
	}
	time = 60 * (alldistance / SPEED);
	// 再加上duration
	_.each(places, function(place) {
		if(place.type == 0) {
			if(place.duration) {
				time += place.duration;
			} else {
				time += 60;
			}
		} 
		if(place.type == 3) {
			time += 180;
		}
		if(place.type == 4) {
			time += place.duration;
		}
	})
	return parseInt(time);
}

// 将所有点根据center得出向量系统，将center归位[0,0]
var buildVectorsSystem = function(origin, places) {
	var vectors = _.map(places, function(place) {
		var vector = {
			id : place.id,
			x: parseFloat(1000*(place.latitude - origin.latitude)),
			y: parseFloat(1000*(place.longitude - origin.longitude))
		}
		return vector;
	})
	return vectors;
}

// var dealPoint = function()

// 根据距离排序，找点方法，desc还是asc由参数确定
var findThesePoints = function(plan, num, sort) {
	var center = _.first(plan.centers),
		places = plan.places;
	// 返回带距离的点
	var placeswithattribute = dis.calculatePointAttributes(center, places);

	// 按顺序来排点
	var sortedplaces = algo.quicksort.sortObj(placeswithattribute, 'dist', sort);
	var theseplaces = _.first(sortedplaces, num);
	return theseplaces;
}

// 计算一天内的地点，这些点应该是不是餐馆的点， 最短的路程即最合适的路线
var generateRoutesOfOneDayPlaces = function(center, spots) {
	var length = spots.length;
	// 用itertolls这个npm包来算出所有点的排列组合
	var spotsArrange = itertools.permutationsSync(spots, length);

	var routeswithdist = _.map(spotsArrange, function(route) {
		var routeRealDistance = 0;
		// 给首尾加上中心点来计算这个排序的总路径
		// route: [{center}, {}, {}, {}, {center}]
		route.unshift(center);
		route.push(center);
		_.each(route, function(place, index) {
			if(index < route.length - 1) {

				var start = place;
				var end = route[index + 1];
				// distance中的计算实际距离有误差，得到的结果明显错误， 放弃
				routeRealDistance += dis.calculateLineDistOfTwoPoints(start, end);
				// console.log(start.name + '-----' + end.name + '-----' + routeRealDistance);
			}
		})
		var obj = {};
		obj.route = route;
		obj.realdistance = routeRealDistance;
		return obj;
	})
	routeswithdist = algo.quicksort.sortObj(routeswithdist, 'realdistance', 'asc');
	return routeswithdist[0].route;
}

// 安排餐馆
var planRestaurants = function(center, routes, restaurants) {
	console.log('this function');
	
	var restaurantsToCenter = dis.calculatePointAttributes(center, restaurants);
	// _.each(restaurantsToCenter, function(res) {res.day = [];});
	var routeCenter = [];

	_.each(routes, function(route) {
		var length = route.length - 1;
		console.log(length);
		var points = route.pop();
		console.log('888888888*************');
		route.pop();
		var lat = _.reduce(route, function(i, p) {return i + p.latitude;}, 0) / length;
		var lng = _.reduce(route, function(i, p) {return i + p.longitude;}, 0) / length;

		lat = parseFloat(lat.toFixed(5));
		lng = parseFloat(lng.toFixed(5));
		var obj = {};
		obj.latitude = lat; obj.longitude = lng;
		routeCenter.push(obj);
	})
	_.each(restaurantsToCenter, function(res) {
		
		var closeCenter = findClosestPoint(res, routeCenter);
		var day = _.indexOf(routeCenter, closeCenter);
		res.day = day;
	})
	return restaurantsToCenter;

}

function findClosestPoint(p, points) {
	// 返回带距离的点
	var placeswithattribute = dis.calculatePointAttributes(p, points);

	// 按顺序来排点
	var sortPoints = algo.quicksort.sortObj(placeswithattribute, 'dist', 'asc');
	var point = _.first(sortPoints);
	// point = _.omit(point, ['dist', 'bear', 'direction']);
	return point;
}

function getGoogleUrl(o, d, mode, sensor, key) {
	var url = 'https://maps.googleapis.com/maps/api/directions/json';
	url += "?origin=" + o;
	url += "&destination=" + d;
	url += "&mode=" + mode;
	// var departure_time = Math.round(new Date().getTime()/1000);
	url += "&departure_time=" + 1415878654;//departure_time;
	url += "&sensor=" + sensor;
	url += "&key=" + key;
	return url;
}

var getAllTrafficOfRoute = function(tripplan, cb) {

	
	async.map(tripplan, getTrafficFromPath, function(err, results) {
		cb(results);
	});
}

var getTrafficFromPath = function(point, callback) {
	var	a_lat = point.preloc[0].toString(),
		a_lng = point.preloc[1].toString(),
		b_lat = point.latitude.toString(),
		b_lng = point.longitude.toString();
	console.log(a_lat, a_lng, b_lat, b_lng);
	models.Path.findOne({a_latitude: a_lat, a_longitude: a_lng, b_latitude: b_lat, b_longitude: b_lng}, function(err, result) {
		if(result) {

			point.traffic = {};
			point.traffic.bus = result.bus;
			point.traffic.driver = result.driver;
			callback(null, point);
		} 
		else {
			getTrafficFromAtoB(a_lat, a_lng, b_lat, b_lng, function(result) {

				point.traffic = {};
				point.traffic.bus = result.bus;
				point.traffic.driver = result.driver;
				callback(null, point);
			})
		}
	})
}

var getTrafficFromAtoB = function(a_lat, a_lng, b_lat, b_lng, cb) {
	var o = a_lat + ',' + a_lng,
		d = b_lat + ',' + b_lng;

	var googlemode;
	var sensor = "false";
    var googlekey = 'AIzaSyCQc4Giw6akCaaWRllbHjWgxdEBGSUvra0';

	async.series({

		bus: function(callback) {
			googlemode = "transit";
			var myurl = getGoogleUrl(o, d, googlemode, sensor, googlekey);
			request(myurl, function(error, response, body) {
				body = JSON.parse(body);
				if (body.status == "OK") {
					callback(null, body.routes[0].legs[0]);
				} 
			})
		},
		driver: function(callback) {
			googlemode = "driving";
			var myurl = getGoogleUrl(o, d, googlemode, sensor, googlekey);
			request(myurl, function(error, response, body) {
				body = JSON.parse(body);
				if (body.status == "OK") {
					callback(null, body.routes[0].legs[0]);
				} 
			})
		}

	}, function(err, result) {
		cb(result);
	})
}












