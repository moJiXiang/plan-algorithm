var mongoose = require('mongoose'),
    Schema   = mongoose.Schema,
    ObjectId = Schema.ObjectId;
 
 //大类
 //餐馆 非洲菜，美洲菜等。
 //购物 种类，衣服，男装，女装，裤子，奢侈品，化妆品，等等。
 //游玩 种类，游泳池、SPA水疗馆、歌舞厅、KTV、桌球房、保龄球馆、棋牌室、网球场
 //type 1:餐馆，2：购物，3：游玩。
var AreaSchema = new Schema({
    city_id            : { type: ObjectId ,index: true, required: true }, //auditing records requires this property not empty
    city_name          : { type: String },
    area_name          : { type: String },
    area_enname        : { type: String },
    short_introduce    : { type: String },
    area_introduce     : { type: String},
    recommand_duration : { type: String },
    address            : { type: String},
    open_time          : { type: String },
    latitude           : { type: String },
    longitude          : { type: String },
    loc                : Array,
    image              : { type: Array },
    image_url          : { type: Array },
    cover_image        : { type: String },
    traffic            : { type: String },
    brief_introduce    : String,
    tips               : { type: String},
    tags               : { type: Array},
    categories           : [{type: ObjectId, ref: 'Category'}],
    tel                : { type: String },
    website            : { type: String },
    show_flag          : { type: Number },
    en_info                : {
        brief_introduce: String,
        open_time        : { type: String },
        tags             : { type: Array  },
        introduce        : { type: String },
        address          : { type: String },
        traffic          : { type: String },
        tips             : { type: String }
    }                            
});
AreaSchema.index({loc:'2d'});

AreaSchema.post('save', function (doc) {
    if (doc.isNew) {
        log.info('new doc saved, now create corresponding auditing instances');
        mongoose.model('Auditing').onObjectCreated(doc, 3);
    }
});

AreaSchema.post('remove', function (doc) {
    mongoose.model('Auditing').onObjectRemoved(doc, 3);
});

AreaSchema.statics = {
    /**
     * queryByName use $regex
     * @param  {ObjectI}   opt 
     * @param  {Function} cb  
     * @return {array}    
     */
    queryByName : function (opt, cb) {
        this.find({area_name: {$regex: opt.criteria.value, $options: 'i'}})
            .skip(opt.offset || 0)
            .limit(opt.limit || 20)
            .exec(cb);
    }
}

AreaSchema.queryMap = {
    /*name : function (q, value, done) {
        q.or([{cityname: {$regex: value}}, {cityname_en: {$regex: value}}]);
        done();//don't forget this callback
    }*/
    city_name : function (q, value, done) {
        q.where('city_name', {$regex : value, $options: 'i'});
        done();
    },
    name : function (q, value, done) {
        q.where('area_name', {$regex : value, $options: 'i'});
        done();
    }
}

// AreaSchema.plugin(require('../lib/mongoosePlugin').queryPlugin);

mongoose.model('Area', AreaSchema);
