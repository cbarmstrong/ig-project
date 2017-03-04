var IG = require('ig-markets')
var ig = new IG('4e990639434fb720bed7f12a7efcc897ed549438','colinarmstrongbet','V1rus932');
mongoose = require('mongoose');
mongoose.Promise = global.Promise;

module.exports = function (app){
    // Heating Functions

    var prices = {};

    var ohlc = mongoose.model('ohlc', { openBid: Number, highBid: Number, lowBid: Number, closeBid: Number, openAsk: Number, highAsk: Number, lowAsk: Number, closeAsk: Number, volume: Number, date: Date, name: String, epic: String, resolution: String });

    app.get('/markets/search/:query', function(req,res){
        ig.findMarkets(req.params.query, function(err,data){
	    if(err){ res.end(JSON.stringify({ error: err })); }
	    else{
		res.end(JSON.stringify(data,null,4));
	    }
	});
    });

    app.get('/prices/:epic',function(req,res){
         res.end(JSON.stringify({}));
    });

    app.delete('/pullPrices/:epic/:resolution', function(req,res){
        res.type('json');
        epic.find({ epic: req.params.epic, resolution: req.params.resolution }).remove().exec(function(){ res.end("{}") });
    });

    app.get('/pullPrices/:epic/:resolution/:start/:end', function(req,res){
	// RESOLUTION = DAY, 4H
	// EPIC  = Result of search
	// START = yyyy-mm-ddThh:mm:ss
	// END   = yyyy-mm-ddThh:mm:ss
        startTime=new Date(Date.parse(req.params.start)).getTime()
        endTime=new Date(Date.parse(req.params.end)).getTime()
        ohlc.find({ epic: req.params.epic, date: { $gt: startTime, $lt: endTime }, resolution: req.params.resolution}, function(err,docs){
            res.type('json');
            if(err){ res.end(JSON.stringify(err));return; }
            if(docs && docs.length>0){ res.end(JSON.stringify(docs));return; }
            console.log("No data found, searching IG... ");
	    ig.prices(req.params.epic+'?resolution='+req.params.resolution+'&from='+req.params.start+'&to='+req.params.end+'&pageSize=0', function(err,data){
                if(err){ console.error("ERROR: "+err); }
                else{
                    console.log("IG Data: ");
                    if(!data){ 
                        console.log('No data returned');
                        res.end(JSON.stringify([]));
                    } else if(data.code == "ECONNRESET"){
                        res.end(JSON.stringify(data,null,4));
                    } else{
                        for(i=0;i<data.prices.length;i++){
                            t=data.prices[i];
                            price=new ohlc({ openBid: t.openPrice.bid, 
                                             highBid: t.highPrice.bid, 
                                             lowBid: t.lowPrice.bid, 
                                             closeBid: t.closePrice.bid, 
                                             openAsk: t.openPrice.ask, 
                                             highAsk: t.highPrice.ask, 
                                             lowAsk: t.lowPrice.ask, 
                                             closeAsk: t.closePrice.ask, 
                                             volume: t.lastTradedVolume, 
                                             date: new Date(Date.parse(t.snapshotTimeUTC)), 
                                             resolution: req.params.resolution,
                                             epic: req.params.epic });
                            price.save();
                            console.log(JSON.stringify(t,null,4));
                        }
                        res.end(JSON.stringify({ result: "saved" }));
                    }
                }
            });
	});
    });

    return prices;
}
