
var mongoose = require('mongoose'),
    Schema   = mongoose.Schema,
    ObjectId = Schema.ObjectId;
 
var AttractionSchema = new Schema({
    address            : String,  
    am                 : Boolean,
    pm                 : Boolean,
    ev                 : Boolean, //evening
    attractions        : String,
    attractions_en     : String,
    checkFlag          : String,
    cityid             : ObjectId,
    city_id            : {type: ObjectId, index: true}, // add new 'city_id' for ios app
    // cityid             : { type: String, required: true }, //auditing records requires this property not empty
    cityname           : String,
    coverImageName     : String,
    createFlag         : String,  // who create it ?   0 : administrator(weego) , 1 : editor
    createPreson       : String,
    created            : {type : Date, default : Date.now},
    dayornight         : String,
    image              : Array,
    image_url          : Array,
    imgFlag            : Boolean,
    introduce          : String,
    latitude           : String,
    likecount          : Number,
    longitude          : String,
    loc                : Array,
    location           : Object,
    masterLabel        : String,
    masterLabelNew     : {
        _id            : ObjectId,
        label          : String,
        label_en       : String
    },
    opentime           : String,
    price              : String,
    random             : String,  // ? ? ? ?
    rank               : {type: Number, default: 0}, // 景点排名
    recommand_duration : String,
    recommand_flag     : String,  // 1 : recommended as 'hot' , 0 : else
    recommand_reason   : String,
    short_introduce    : String,
    index_flag         : String,
    show_flag          : Number,  //whethere it is visible to end user
    subLabel           : Array,
    subLabelNew        : Array,
    telno              : String,
    website            : String,
    traffic_info       : String,
    tips               : String,
    yelp_rating        : Number,
    yelp_review_count  : Number,
    yelp_update_time   : Number,
    type               : { type: String,default:'0'},
    status             : String,
    en_info: {
        recommand_reason: String,
        price          : String,
        opentime       : String,
        traffic_info   : String,
        short_introduce: String,
        introduce      : String,
        tips           : String,
    }
}, {
    collection : 'latestattractions'
});
AttractionSchema.index({loc:'2d'});
// AttractionSchema.index({location:'2dsphere'});

AttractionSchema.post('save', function (doc) {
    if (doc.isNew) {
        log.info('new doc saved, now create corresponding auditing instances');
        mongoose.model('Auditing').onObjectCreated(doc, 0);
    }
});

AttractionSchema.post('remove', function (doc) {
    mongoose.model('Auditing').onObjectRemoved(doc, 0);
});

/**@namespace*/
AttractionSchema.statics = {
    pushImg : function (opt, cb) {
        var attraction = opt.attraction;
        this.findOne({_id: attraction}, cb);
    }
};

AttractionSchema.queryMap = {
    /*name : function (q, value, done) {
        q.or([{cityname: {$regex: value}}, {cityname_en: {$regex: value}}]);
        done();//don't forget this callback
    }*/
    tag : function (q, value, done) {
        var tags = value.split(',').join(' ');
        mongoose.model('Label').find({label: {$in : tags}}, function (err, labels) {
            if (err) return done(err);
            if (labels) {
                var ids = labels.map(function(i) {return i._id;});
                q.in('masterLabel', ids);
                return done();
            }
            return done();
        });
    },

    name : function (q, value, done) {
        q.where({attractions : {$regex: value, $options: 'i'}});
        done();
    },

    cityname : function(q, value, done) {
        q.where({cityname : value});
        done();
    }
}

// AttractionSchema.plugin(require('../lib/mongoosePlugin').queryPlugin);

mongoose.model('Attraction', AttractionSchema);
