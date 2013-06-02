//Using nodeunit
var MongoDB = require('../lib/mongodb-rev/index.js');
var async = require('async');
var clone = require('clone');

var g_MongoTestDatabaseURL = 'mongodb://localhost/test';
if(typeof process.env.MONGO_ADDRESS != 'undefined'){
    g_MongoTestDatabaseURL = process.env.MONGO_ADDRESS + '/test';
}
var g_MongoTestCollectionName = 'mongodb_rev';

var g_ExampleDocument = {
    text : 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    somefloat : 3943.242,
    someotherfloat : 0.322,
    somearray : [1 , 2 , 3 , 4, 5],
    anobj : {
        prop1 : 'hello world',
        prop2 : 9999999
    }
};
var g_DocumentId = null;

//Obj 1 (- Obj 2
var IsObjectSubset = function(Obj1, Obj2){
    if(typeof Obj1 != typeof Obj2){
        return false;
    }
    if(typeof Obj1 != 'undefined' && typeof Obj1 != 'object'){
        return (Obj1 == Obj2);
    }
    if(Array.isArray(Obj1)){
        return Obj1.compare(Obj2);
    }
    for(var Key in Obj1){
        if(Obj1.hasOwnProperty(Key)){
            if(!(Key in Obj2)){
                return false;
            }
            if(!IsObjectSubset(Obj1[Key], Obj2[Key])){
                return false;
            }
        }
    }
    return true;
};

module.exports = {
    setUp : function(Callback){
        var _this = this;
        MongoDB.Db.connect(
            g_MongoTestDatabaseURL,
            function(Err,Res){
                if(Err){
                    throw Err;
                }
                _this.MongoClient = Res;
                Callback();
            }
        );
    },
    tearDown : function(Callback){
        Callback();
    },
    TestInsert : function(Test){
        var _this = this;
        var Collection = new MongoDB.Collection(_this.MongoClient, g_MongoTestCollectionName);
        async.waterfall([
                function(Callback){
                    Collection.insert(g_ExampleDocument, Callback);
                },
                function(Res, Callback){
                    Collection.findOne(g_ExampleDocument, Callback);
                }
            ],
            function(Err,Res){
                Test.equals(Err,null);
                Test.equals(IsObjectSubset(g_ExampleDocument,Res), true);
                g_DocumentId = Res._id;
                Test.done();
            }
        );

    },
    TestUpdate : function(Test){
        var _this = this;
        var Changes = {
            $set : {
                text : 'modified'
            }
        };
        var ExpectedDocument = clone(g_ExampleDocument);
        ExpectedDocument.text = 'modified';
        var Collection = new MongoDB.Collection(_this.MongoClient, g_MongoTestCollectionName);
        async.waterfall([
                function(Callback){
                    Collection.updateAndTrack(g_ExampleDocument, Changes, {}, Callback);
                }
            ],
            function(Err,Res){
                Test.equals(Err,null);
                Test.done();
            }
        );
    },
    TestRemove : function(Test){
        var _this = this;
        Test.notEqual(g_DocumentId, null, 'TestRemove expected non null document id');
        var Collection = new MongoDB.Collection(_this.MongoClient, g_MongoTestCollectionName);
        var Query = {
            _id : g_DocumentId
        };
        async.waterfall([
                function(Callback){
                    Collection.findOne(Query, Callback);
                },
                function(Res, Callback){
                    console.info(Res);
                    Collection.remove(Query, Callback);
                },
                function(Res, Callback){
                    Collection.findOne(Query, Callback);
                }
            ],
            function(Err,Res){
                Test.equals(Err, null, 'TestRemove bad mongo result');
                Test.done();
            }
        );
    }
};


Array.prototype.compare = function (array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time
    if (this.length != array.length)
        return false;

    for (var i = 0; i < this.length; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].compare(array[i]))
                return false;
        }
        else if (this[i] != array[i]) {
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;
        }
    }
    return true;
};

