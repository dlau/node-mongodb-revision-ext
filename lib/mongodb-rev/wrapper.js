var MongoDB = require('mongodb');
var util = require('util');
var async = require('async');
var JsDiff = require('diff');


//Must be a better way to implement over mongodb module
var Wrapper = MongoDB;

var IsObjectEmpty = function(Obj){
    return JSON.stringify(Obj).replace('[{}]*','') === '';
};

var GetObjDiff = function(OldObj, NewObj){
    var Keys = {};
    var Difference = {};
    //Each call to this function inspects a single layer
    var Key = null;
    for(Key in OldObj){
        Keys[Key] = true;
    }
    for(Key in NewObj){
        Keys[Key] = true;
    }
    for(Key in Keys){
        if(!(Key in NewObj) && Key in OldObj){
            Difference[Key] = {
                status : 'deleted',
                value : OldObj[Key]
            };
        }
        if(!(Key in OldObj) && Key in NewObj){
            Difference[Key] = {
                status : 'added',
                value : NewObj[Key]
            };
        }
        if(Key in NewObj && Key in OldObj){
            var Diff = {
                status : 'modified'
            };
            if(typeof NewObj[Key] == 'string' && typeof OldObj[Key] == 'string'){
                Diff.value = JsDiff.createPatch('', OldObj[Key], NewObj[Key]);
            }
            else if(typeof OldObj[Key] != typeof NewObj[Key]){
                Diff.value = NewObj[key];
            }
            else if(typeof NewObj[Key] != 'object' && OldObj[Key] != NewObj[Key]){
                Diff.value = NewObj[key];
            }
            else if(typeof NewObj[Key] == 'object'){
                var ObjDiff = {};
                ObjDiff[Key] = GetObjDiff(OldObj[Key], NewObj[Key]);
                if(IsObjectEmpty(ObjDiff)){
                    Diff.value = ObjDiff;
                }
            }
            if('value' in Diff){
                Difference[Key] = Diff;
            }
        }
    }
    return Difference;
};

Wrapper.Collection.prototype.updateAndTrack = function (Selector, Document, Options, Callback) {
    var _this = this;
    async.waterfall([
        function(Callback){
            if('multi' in Options && Options.multi) {
                return _this.find(Selector).toArray(Callback);
            }
            return _this.find(Selector).limit(1).toArray(Callback);
        },
        function(Res, Callback){
            if(Res.length === 0){
                if('upsert' in Options && Options.upsert){
                    return _this.update(Selector, Document, Options, Callback);
                }
                return Callback(null,null);
            }
            async.each(
                Res,
                function(Item, Callback){
                    async.waterfall([
                        function(Callback){
                            var Sorting = [];
                            var Options = {};
                            Options['new'] = true;
                            _this.findAndModify({_id : Item._id}, Sorting, Document, Options, Callback);
                        },
                        function(Res, LastError, Callback){
                            var Diff = GetObjDiff(Item, Res);
                            if(!IsObjectEmpty(Diff)){
                                var Update = {
                                    $push : {
                                        _history : Diff
                                    }
                                };
                                return _this.update({_id: Item._id}, Update, {}, Callback);
                            }
                            return Callback(null,null);
                        }
                    ],
                    function(Err,Res){
                        return Callback(Err, Res);
                    });
                },
                function(Err){
                    return Callback(Err,null);
                }
            );
        }
    ],
    function(Err, Res){
        return Callback(Err,Res);
    });
};


exports.MongoDBWrapper = Wrapper;
