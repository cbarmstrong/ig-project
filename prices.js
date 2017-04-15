var IG = require('ig-markets');
var conf = require('./config.json');
var ig = new IG(conf.ig_key,conf.ig_usr,conf.ig_pwd);
mongoose = require('mongoose');
mongoose.Promise = global.Promise;

module.exports = function (app){
    // Heating Functions

    var prices = {};

    var ohlc = mongoose.model('ohlc', { openBid: Number, highBid: Number, lowBid: Number, closeBid: Number, openAsk: Number, highAsk: Number, lowAsk: Number, closeAsk: Number, volume: Number, date: Date, name: String, epic: String, resolution: String });

    function igfindMarkets(req,res){
        try{
            ig.findMarkets(req.params.query, function(err,data){
                if(err){ res.end(JSON.stringify({ error: err })); }
                else{
                    res.end(JSON.stringify(data,null,4));
                }
            });
        } catch(e){
            console.log("Exception while searching for market"+JSON.stringify(req,null,4));
            setTimeout(igfindMarkets,5000,req,res);
        }
    }

    app.get('/markets/search/:query', function(req,res){
        igfindMarkets(req,res);
    });

    app.get('/prices/:epic',function(req,res){
         res.end(JSON.stringify({}));
    });

    app.get('/storedPrices/:epic', function(req,res){
        ohlc.find({ epic: req.params.epic }).sort({ date: 1 }).exec(function(err,docs){
            res.type('json');
            if(err){ res.end(JSON.stringify(err));return; }
            if(docs && docs.length>0){ res.end(JSON.stringify(docs,null,4));return; }
            res.end(JSON.stringify({},null,4));
        });
    });

    app.delete('/pullPrices/:epic/:resolution', function(req,res){
        res.type('json');
        ohlc.find({ epic: req.params.epic, resolution: req.params.resolution }).remove().exec(function(){ res.end("{}") });
    });

    function igPrices(search,callback){
        try{
            ig.prices(search,callback);
        } catch(e) {
            console.log("Exception while searching for market"+JSON.stringify(search,null,4));
            console.log(e);
            setTimeout(igPrices,5000,search,callback);
        }
    }

    app.get('/pullPrices/:epic/:resolution/:start/:end', function(req,res){
	// RESOLUTION = DAY, 4H
	// EPIC  = Result of search
	// START = yyyy-mm-ddThh:mm:ss
	// END   = yyyy-mm-ddThh:mm:ss
        startTime=new Date(Date.parse(req.params.start)).getTime()
        endTime=new Date(Date.parse(req.params.end)).getTime()
        ohlc.find({ epic: req.params.epic, date: { $gte: startTime, $lte: endTime }, resolution: req.params.resolution}).sort({ date: 1}).exec(function(err,docs){
            res.type('json');
            if(err){ res.end(JSON.stringify(err));return; }
            if(docs && docs.length>0){ res.end(JSON.stringify(docs,null,4));return; }
            console.log("No data found, searching IG... ");
            console.log(req.params.epic+'?resolution='+req.params.resolution+'&from='+req.params.start+'&to='+req.params.end+'&pageSize=0');
	    igPrices(req.params.epic+'?resolution='+req.params.resolution+'&from='+req.params.start+'&to='+req.params.end+'&pageSize=0', function(err,data){
                if(err){ console.error("ERROR: "+err);return; }
                else{
                    console.log("Prices returned");
                    if(!data){ 
                        console.log('No data returned');
                        res.end(JSON.stringify([]));
                        return;
                    } else if(data.code == "ECONNRESET"){
                        console.log("Connection Reset");
                        res.end(JSON.stringify(data,null,4));
                        return;
                    } else if(data.errorCode){
                        console.log("Error returned");
                        res.end(JSON.stringify(data,null,4));
                        return;
                    } else{
                        console.log("IG Data returned....");
                        currentDay=startTime;
                        if(!data.prices){ console.log(JSON.stringify(data,null,4));return; }
                        for(i=0;i<data.prices.length;i++){
                            t=data.prices[i];
                            ohlcDay=new Date(Date.parse(t.snapshotTimeUTC)).getTime();
                            //console.log("---------------------------------");
                            //console.log("Current ig data point : "+ohlcDay);
                            //console.log("Current expected day  : "+currentDay);
                            //console.log("---------------------------------");
                            //console.log();
                            while(currentDay<ohlcDay){
                                price=new ohlc({ openBid: 0,
                                                 highBid: 0,
                                                 lowBid: 0,
                                                 closeBid: 0,
                                                 openAsk: 0,
                                                 highAsk: 0,
                                                 lowAsk: 0,
                                                 closeAsk: 0,
                                                 volume: 0,
                                                 date: currentDay,
                                                 resolution: req.params.resolution,
                                                 epic: req.params.epic });
                                price.save();
                                currentDay+=24*60*60*1000;
                                //console.log("Current expected day  : "+currentDay);
                            }
                            price=new ohlc({ openBid: t.openPrice.bid, 
                                             highBid: t.highPrice.bid, 
                                             lowBid: t.lowPrice.bid, 
                                             closeBid: t.closePrice.bid, 
                                             openAsk: t.openPrice.ask, 
                                             highAsk: t.highPrice.ask, 
                                             lowAsk: t.lowPrice.ask, 
                                             closeAsk: t.closePrice.ask, 
                                             volume: t.lastTradedVolume, 
                                             date: ohlcDay, 
                                             resolution: req.params.resolution,
                                             epic: req.params.epic });
                            price.save();
                            currentDay+=24*60*60*1000;
                        }
                        console.log(JSON.stringify(data.metadata.allowance,null,4));
                        res.end(JSON.stringify({ result: "saved", allowance: data.metadata.allowance }));
                    }
                }
            });
	});
    });

    return prices;
}
