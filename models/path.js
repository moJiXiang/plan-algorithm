var mongoose = require('mongoose'),
    Schema   = mongoose.Schema,
    ObjectId = Schema.ObjectId,
    async    = require('async');

 //type 0:景点，1:餐馆，2：购物，3：游玩。
var PathSchema = new Schema({
    city_id        : { type: ObjectId ,index: true },
    city_name      : { type: String },
    a_id           : { type: ObjectId ,index: true },
    a_type         : { type: String },
    b_id           : { type: ObjectId ,index: true },
    b_type         : { type: String },
    a_latitude     : { type: String },
    a_longitude    : { type: String },
    b_latitude     : { type: String },
    b_longitude    : { type: String },
    driver         : {       
        taxifare   : { type: String },
        duration   : { type: String },
        distance   : { type: String },
        steps      : { type: Array }
    },                    
    bus            : {            
        duration   : { type: String },
        distance   : { type: String },
        steps      : { type: Array }
    },                      
    walk           : {                 
        duration   : { type: String },
        distance   : { type: String },
        steps      : { type: Array }
    }
},{
    collection: 'pathsnew'
});

PathSchema.statics = {

    load : function (id, cb) {
        this.findOne({_id : id})
            .exec(cb);
    },

    list : function (options, cb) {
        var criteria = options.criteria || {};

        this.find(criteria)
            // .populate('user', 'name username')
            // .sort({'createdAt': -1}) // sort by date
            .limit(options.limit || 10)
            .skip(options.offset || 0)
            .exec(cb);
    },

    //a, b are ObjectIds or strings of ObjectId
    //also accepts : ([a, b], cb)
    loadByAB : function (a, b, cb) {
        if (a instanceof Array && b instanceof Function) {
            cb = b, b = a[1], a = a[0];
        }
        this.findOne({a_id : a, b_id : b})
            .exec(cb);
    },

    /**
     * find by a series of attractions, reserve the order in array.
     * @param {Array} arr array of attraction ids
     */
    loadByAttractionIds : function (ids, cb) {
        var pairs = []
            that  = this;

        for (var i = 0 ; i < ids.length -1; i++) {
            pairs.push([ids[i], ids[i+1]]);
        }// an array of pairs : [[a, b], [a, b], ...]

        async.map(pairs, function(pair, cb2) {
            that.findOne({a_id: pair[0], b_id: pair[1]}).exec(cb2);
        }, cb);
        //TODO use $or syntax instead of issuing multiple queries 
    },

    loadByLatLong : function (options, cb) {
        this.findOne({a_latitude : options.a.latitude, 
                    a_longitude  : options.a.longitude, 
                    b_latitude   : options.b.latitude, 
                    b_longitude  : options.b.longitude})
            .exec(cb);
    },

    /**
     * @params opt  {planId:'123'}
     */
    listByPlan : function (opt, cb) {

        var that = this;
        mongoose.model('Plan').load(opt.planId, function (err, p) {
            if (err) return cb(err);
            if (!p) return cb(new Error('Plan not found : ' + opt.planId));
            var poi = {restaurants: [], shoppings: [], attractions: []};
            p.plan.forEach(function(a) {
                a.plans.forEach(function(b) {
                    if (b.attractions) {
                        poi.attractions.push(b._id+'');
                    } else if (b.info) {
                        poi.restaurants.push(b._id+'');
                    } else {
                        poi.shoppings.push(b._id+'');
                    }
                });
            });
            var criteria = opt.criteria = opt.criteria || {};
            var or = {$or: [
                {a_type: 0, a_id: {$in: poi.attractions}}, 
                {b_type: 0, b_id: {$in: poi.attractions}}, 
                {a_type: 1, a_id: {$in: poi.restaurants}}, 
                {b_type: 1, b_id: {$in: poi.restaurants}}, 
                {a_type: 2, a_id: {$in: poi.shoppings}}, 
                {b_type: 2, b_id: {$in: poi.shoppings}}
                ]};
            if (criteria.$or) {
                if (criteria.$and) {
                    criteria.$and = [criteria.$and, {$and : [or, criteria.$or]}];
                } else {
                    criteria.$and = {$and : [or, criteria.$or]};
                }
                delete criteria.$or;
            } else {
                criteria.$or = or.$or;
            }
            that.list(opt, cb);
        });
    }
};

PathSchema.queryMap = {
    /*name : function (q, value, done) {
        q.or([{cityname: {$regex: value}}, {cityname_en: {$regex: value}}]);
        done();//don't forget this callback
    }*/
    planId : function (q, value, done) {
        mongoose.model('TripPlan').findById(value, function (err, plan) {
            if (err) return done(err);
            
            var or = [];
            plan.places.forEach(function (item, idx, arr) {
                if (idx >= arr.length -1)return;//last element reached
                var a = item, b = arr[idx+1];
                or.push({a_type: a.type, a_id: a.id, b_type: b.type, b_id: b.id});
            });
            q.or(or);
            done();
        });
    },

    between: function (q, value, done) {
        var m = /(\d):(.+),(\d):(.+)/.exec(value);
        if (!m) 
            return done(new Error('Invalid parameter value for *between* :' + value));
        var a = {type: m[1], id: m[2]}, b = {type:m[3], id: m[4]};

        q.or([{a_type:a.type, a_id:a.id, b_type:b.type, b_id: b.id}, {a_type:b.type, a_id:b.id, b_type:a.type, b_id: a.id}]);
        done();
    },

    //value : "1:id1234,2:id45678,3:4a87bd332"
    places: function (q, value, done) { //path info on a serial of places
        var p = /(\d):([^,]+)/g;
        var list = [], m;
        while(m = p.exec(value)) {
            list.push({type: m[1], id: m[2]});
        }
        list.forEach(function (item, idx, arr) {
            if (idx >= arr.length -1)return;//last element reached
            var a = item, b = arr[idx+1];
            q.or({a_type: a.type, a_id: a.id, b_type: b.type, b_id: b.id});
        });
        done();
    }
}

// PathSchema.plugin(require('../lib/mongoosePlugin').queryPlugin);

exports.Path = mongoose.model('Path', PathSchema);
