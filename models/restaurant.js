var mongoose = require('mongoose'),
    Schema   = mongoose.Schema,
    ObjectId = Schema.ObjectId;
 
 //餐馆
var RestaurantSchema = new Schema({
    name              : { type: String },
    type              : { type: String,default:'1'},
    city_name         : { type: String },
    city_id           : { type: ObjectId ,index: true, require: true },  //auditing records requires this property not empty
    latitude          : { type: String },
    longitude         : { type: String },
    loc                : Array,
    address           : { type: String },
    postal_code       : { type: String },
    introduce         : { type: String },  // summary/description of restaurant
    tel               : { type: String },
    category          : { type: Array },
    categories        : [{type: ObjectId, ref: 'Category'}],
    lifetag           : { type: Array },
    tags              : { type: Array , default: []}, // 4 available tags : 'michilin', 'bestfordinner', 'popular', 'localflag'.   e.g.  ['michilin', 'popular']
    open_time         : { type: Array },
    image             : { type: Array },
    image_url         : { type: Array },
    cover_image       : { type: String },
    show_flag         : { type: Boolean,default:false},
    create_at         : { type: Date, default: Date.now },
    recommand_flag    : { type: Boolean, default:false },
    recommand_duration: { type: String },
    area_id           : { type: ObjectId},
    area_name         : { type: String},
    rating            : { type: Number ,default: 3},
    ranking            : { type: Number ,default: 3},
    rating_service    : { type: Number ,default: 3},
    rating_env        : { type: Number ,default: 3},
    rating_food       : { type: Number ,default: 3},
    score             : { type: Number ,default: 60},
    reviews           : { type: Number ,default: 0},
    comments_zh       : {type: Array},
    comments          : { type: Array },
    price_level       : { type: Number ,default: 3},
    price_desc        : { type: String ,default: '一般'},
    website           : { type: String },
    url               : { type: String },
    brief_introduce   : String,
    tips              : { type: String },  // another summary/description of restaurant
    index_flag        : { type: Boolean },
    am                : { type: Boolean },
    pm                : { type: Boolean },
    ev                : { type: Boolean }, //evening
    info: {              
        wifi          : { type: Boolean ,default: false},
        yu_ding       : { type: Boolean,default:false},
        delivery      : { type: Boolean,default:false},
        take_out      : { type: Boolean,default:false},
        card          : { type: Boolean,default:false},
        g_for         : { type: String },
        g_f_kid       : { type: Boolean,default:false},
        g_f_group     : { type: Boolean,default:false},
        noise         : { type: String },
        alcohol       : { type: String },
        out_seat      : { type: Boolean,default:false},
        tv            : { type: Boolean,default:false},
        waiter        : { type: Boolean,default:false}
    },
    status             : String,
    en_info: {
        open_time      : Array,
        price_desc     : String,
        brief_introduce: String,
        introduce      : String,
        tips           : String,
        comments       : String,
    }
});
RestaurantSchema.index({loc:'2d'});

RestaurantSchema.post('save', function (doc) {
    if (doc.isNew) {
        log.info('new doc saved, now create corresponding auditing instances');
        mongoose.model('Auditing').onObjectCreated(doc, 1);
    }
});

RestaurantSchema.post('remove', function (doc) {
    mongoose.model('Auditing').onObjectRemoved(doc, 1);
});

/**
 * Validations
 * 
 */
RestaurantSchema.path('tags').validate(function (val) {
    if (val) return val.length <= 4 && val.every(function (tag) {
        return ['michilin', 'bestfordinner', 'popular', 'localflag'].indexOf(tag) >= 0;
    });
}, 'at most 4 tags are allowed and must be picked from restricted set'); 


/**
 * Static methods
 * 
 */
RestaurantSchema.statics = {

    /**
     * find recommended Restaurants.
     * ```
     * Restaurant.listRecommends(function (err, arr) {}); // no parameter , default settings
     *     
     * Restaurant.listRecommends({limit : 5, offset : 2}, function (err, arr) {});
     * ```
     * @param {Function} cb - callback (err, result)
     * @param {Any} opt - optional options
     */
    listRecommends : function (opt, cb) {
        var criteria = {show_flag: true};
            // order    = {coverImageId: 1, coverImageExtention: 1}; //TODO order recommends by what ?

        if (!cb && opt instanceof Function) {
            cb = opt;
        }

        this.find(criteria)
            .skip(opt.offset || 0)
            .limit(opt.limit || global.recommendLimit || 10)
            .exec(cb);
    },

    /**
     * find restaurants in a city
     * ```
     * Restaurant.listByCity({city_id : 123, limit : 10, offset: 0}, function (err, arr) {});
     * // criteria : mongodb standard query object
     * Restaurant.listByCity({criteria : {city_id : 123}, limit : 10, offset: 0}, function (err, arr) {});
     * ```
     * @param {Object}   opt - options
     * @param {Function} cb  - callback (err, arr)
     */
    listByCity : function (opt, cb) {

        var c = opt.criteria || {};
        c.city_id = c.city_id || opt.city_id;
        if (opt.tags) {
            c.tags = {$all : tags};
        }

        this.find(c)
            .skip(opt.offset || 0)
            .limit(opt.limit || 10)
            .exec(cb);
    },

    load : function (id, cb) {
        this.findOne({_id : id})
            .exec(cb);
    },

    /**
     * queryByName use $regex
     * @param  {ObjectI}   opt 
     * @param  {Function} cb  
     * @return {array}    
     */
    queryByName : function (opt, cb) {
        this.find({name: {$regex: opt.criteria.value, $options: 'i'}})
            .skip(opt.offset || 0)
            .limit(opt.limit || 20)
            .exec(cb);
    }
};

/**
 * Instance methods
 */
RestaurantSchema.methods = {

    addTag : function (tag, cb) {
        if (!this.tags) this.tags = [];
        var that = this,
            arr  = tag instanceof Array ? tag : [tag];
        arr.forEach(function (t) {
            that.tags.indexOf(t) < 0 && that.tags.push(t);
        });
        
        that.save(cb);
    },

    removeTag : function (tag, cb) {
        if (!this.tags) this.tags = [];

        var that = this,
            arr = tag instanceof Array ? tag : [tag];
        arr.forEach(function (t) {
            var idx = that.tags.indexOf(t);
            idx >= 0 && that.tags.splice(idx, 1);
        });

        that.save(cb);
    }
};

RestaurantSchema.queryMap = {
    /*name : function (q, value, done) {
        q.or([{cityname: {$regex: value}}, {cityname_en: {$regex: value}}]);
        done();//don't forget this callback
    }*/
    tags : function (q, value, done) {
        q.in('tags', value.split(','));
        done();
    },
    city_name : function (q, value, done) {
        q.where({'city_name': {$regex : value}});
        done();
    }
}

// RestaurantSchema.plugin(require('../lib/mongoosePlugin').queryPlugin);

mongoose.model('Restaurant', RestaurantSchema);

