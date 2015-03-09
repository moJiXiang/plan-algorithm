var mongoose = require('mongoose'),
    Schema   = mongoose.Schema,
    ObjectId = Schema.ObjectId;
 
var CitySchema = new Schema({
    backgroundimage     : Array,
    cityname            : String,
    cityname_en         : String,
    cityname_py         : String,
    continents          : String,
    continentscode      : String,
    countryname         : String,
    countrycode         : String,
    coverImageName      : String,
    imgforapp           : String,
    createFlag          : String,
    created             : { type : Date, default : Date.now},
    hot_flag            : String,
    image               : Array,
    image_url           : Array,
    imgFlag             : Boolean,
    introduce           : [{
        intrItemTitle   : String, 
        intrItemContent : String
    }],                       
    labels              : [{
        _id             : String,
        description     : String,
        description_en  : String,
        title: String,
        title_en : String
    }] ,
    latitude            : String,
    likecount           : Number,
    longitude           : String,
    masterLabel         : String,
    recommand_day       : String,
    recommand_intensity : String,
    short_introduce     : String,
    show_flag           : String,
    subLabel            : Array,
    tips                : [{
        tipItemTitle    : String,
        tipItemContent  : String
    }],                      
    traffic             : [{
        traItemTitle    : String,
        traItemContent  : String
    }],                      
    recommand_center    : {
        name            : String,
        name_en         : String,
        latitude        : String,
        longitude       : String,
        _id             : String
    },
    city_overview       : String,
    restaurant_overview : String, // overview of restaurants in city
    shopping_overview   : String, // overview of shoppings in city
    attraction_overview : String, // overview of attractions in city
    weoid               : String, //yahoo weather api ID
    status              : String,
    en_info: {
        continents : String,
        countryname: String,
        short_introduce: String,
        city_overview : String,
        attraction_overview: String,
        restaurant_overview: String,
        shopping_overview: String,
        introduce      : [{
            intrItemTitle   : String, 
            intrItemContent : String
        }],
        tips                : [{
            tipItemTitle    : String,
            tipItemContent  : String
        }],
        traffic             : [{
            traItemTitle    : String,
            traItemContent  : String
        }],
    }

}, {
    versionKey: false,
    collection : 'latestcity'
});

CitySchema.statics = {

    load : function (id, cb) {
        this.findOne({_id: id})
            .exec(cb);
    },
    queryByName : function (opt, cb) {
        this.find({cityname_py: {$regex: opt.criteria.value}}, cb);
    },
    pushImage : function (opt, cb) {
        var city = opt.city;
        this.findOne({_id: city}, cb);
    }
}

CitySchema.methods = {

    /**
     * find restaurants in **this** city
     * city_id is automatically set : `opt.city_id = this.city_id`
     * 
     */
    listRestaurants : function (opt, cb) {
        opt.city_id = this.city_id;
        mongoose.model('Restaurant').listByCity(opt, cb);
    }
}

CitySchema.queryMap = {
    /*name : function (q, value, done) {
        q.or([{cityname: {$regex: value}}, {cityname_en: {$regex: value}}]);
        done();//don't forget this callback
    }*/
    citiespy : function (q, value, done) {

        q.where('cityname_py', {$regex: value, $options: 'i'});
        done();
    },

    citiesbycountry: function(q, value, done) {
        q.where({
            'countryname': {
                $regex: value
            }
        });
        done();
    },

    getCitiesByCountrycode: function(q, value, done) {
        q.where({'countrycode': value});
        done();
    }
}

// CitySchema.plugin(require('../lib/mongoosePlugin').queryPlugin);

mongoose.model('City', CitySchema);
