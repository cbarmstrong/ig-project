var fs = require('fs');
var request = require('request');
var config = require("./config.json");
mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/ftse_epics');

module.exports = function (app){

    var index = {};
    index.ftse = {};

    var epic = mongoose.model('epic', { stock: String, epic: String, live: Boolean, description: String });
    var span = mongoose.model('span', { stock: String, date: Date, type: String });
  
    app.delete("/index/do_history",function(req,res){
        res.type("json");
        span.find({}).remove().exec(res.end(JSON.stringify({})));
    });

    app.get("/index/do_history",function(req,res){
        res.type("json");
        line = [];
        data=fs.readFileSync("FTSE_100_Constituent_history.txt").toString().split("\n");
        for(i=0;i<data.length;i++){
            dt="Invalid Date";
            if(data[i].match(/-[A-Za-z]+-/)){
                dt=new Date(Date.parse(data[i]));
            }
            //console.log("Parsed "+dt.toString()+" from "+data[i]);
            if(dt.toString() != "Invalid Date"){
                n_dt="Not a date";
                segment = 1;
                add = "";
                del = "";
                for(k=i+1;k<data.length;k++){
                    if(data[k]==""){
                        segment++;
                    } else{
                        n_dt=new Date(Date.parse(data[k]));
                        if(n_dt.toString()=="Invalid Date" && segment < 5){ 
                            if(segment == 2){ add+=" "+data[k]; }
                            if(segment == 3){ del+=" "+data[k]; }
                        } else { 
                            //i=k; 
                            add=add.trim();
                            del=del.trim();
                            if( add == "" || del == ""){ break; }
                            query = { type: 'add', stock: add, date: dt.getTime() }
                            opts = { upsert: true, new: true }
                            span.findOneAndUpdate(query, query, opts, function(err,item){
                                if(err){ return; }
                                console.log("Added: "+JSON.stringify(item));
                            });
                            query = { type: 'del', stock: del, date: dt.getTime() };
                            span.findOneAndUpdate(query, query, opts, function(err,item){
                                if(err){ return; }
                                console.log("Added: "+JSON.stringify(item));
                            });
                            break;
                        }
                    }
                }
            }
        }
        res.end(JSON.stringify({}));
    });

    app.get("/index/make_list/:date",function(req,res){
        res.type("json");
        index.ftse[req.params.date]=[];
        file_in=fs.readFileSync('FTSE100.list').toString();
        ind={};
        file_in.split("\n").forEach(function(item){
            line=item.split("=");
            if(line==""){ return; }
            if(line[0]=="list_date"){
                list_date = new Date(Date.parse(line[1]));
            } else {
                ind[line[0]]=1;
                console.log("Added "+line[0]);
            }
        });
        console.log("List generated on "+list_date.toString()+" ("+list_date.getTime()+") - "+Object.keys(ind).length+" items");
        date = new Date();
        date.setTime(req.params.date);
        console.log("Date requested: "+date.toString()+" ("+req.params.date+")");
        a_r_func = function(err,docs){
            if(err){ console.log(err); }
            for(i=0;i<docs.length;i++){
                stock=docs[i].stock;
                if(list_date.getTime()>docs[i].date.getTime()){
                    if(docs[i].type == "add"){ ind[stock]=0; }
                    if(docs[i].type == "del"){ ind[stock]=1; }
                    console.log("Processing un"+docs[i].type+": "+docs[i].stock+" ("+ind[stock]+")");
                } else{
                    if(docs[i].type == "del"){ ind[stock]=0; }
                    if(docs[i].type == "add"){ ind[stock]=1; }
                    console.log("Processing "+docs[i].type+": "+docs[i].stock+" ("+ind[stock]+")");
                }
            }
            stocks=Object.keys(ind).sort();
            for(i=0;i<stocks.length;i++){
                if(ind[stocks[i]]==1){ index.ftse[req.params.date].push(stocks[i]); }
            }
            res.end(JSON.stringify(index.ftse[req.params.date]));
        }
        if(date.getTime()>list_date.getTime()){
            span.find({ date: { $lt: date.getTime(), $gt: list_date.getTime() }}).sort({ date: 1 }).exec(a_r_func);
        } else{
            span.find({ date: { $lt: list_date.getTime(), $gt: date.getTime() }}).sort({ date: -1 }).exec(a_r_func);
        }
    });

    index.getEpic = function(stock,callback){
        console.log("Response for "+stock);
        epics=[];
        epic.find({ stock: stock }, function(err,docs){
            if(err){ console.log(err); return; }
            console.log(docs);
            if(docs && docs.length>0){ callback(docs); }
            else{
                request.get("http://localhost:54321/markets/search/"+stock,function(err,resp,body){
                    body = JSON.parse(body);
                    if( body.errorCode == "error.public-api.exceeded-api-key-allowance" || body.errno == "ECONNRESET"){ console.log(body.err); }
                    else if(body.markets){
                        for(i=0;i<body.markets.length;i++){
                            item=body.markets[i];
                            if(item.expiry=="DFB"){
                                console.log(item);
                                e=new epic({ stock: stock, epic: item.epic, live: false, description: item.instrumentName });
                                e.save();
                            }
                        }
                    } else{
                        console.log("market search failed: "+JSON.stringify(body));
                    }
                    if(callback){
                        callback(epics);
                    }
                });
            }
        });
    }

    app.get("/index/epic_search/:stock",function(req,res){
        res.type("json");
        index.getEpic(req.params.stock,function(es,err){
            res.end(JSON.stringify(es));
        });
    });

    app.delete("/index/epics/:stock", function(req,res){
        epic.find({ stock: req.params.stock }).remove(function(){
            res.type("json");
            res.end(JSON.stringify({ operation: 'removed' }));
        });
    });
        
    app.get("/index/epics/:stock",function(req,res){
        res.type("json");
        epic.find({ stock: req.params.stock },function(err,epics){
            if(err){ res.end(err); }
            else if(epics.length>0){ 
                res.end(JSON.stringify({ epics: epics }));
            } else { 
                res.end(JSON.stringify({ epics: [] }));
            }
        });
    });

    app.put("/index/epic_activate/:stock/:epic", function(req,res){
        epic.find({ stock: req.params.stock }, function(err, docs){
            if(err){ res.end(err); }
            else{
                for(i=0;i<docs.length;i++){
                    docs[i].live=(req.params.epic == docs[i].epic);
                    docs[i].save();
                }
            }
        });
    });


    app.put("/update/index/:stock/:epic", function(req,res){
        epic.find({ stock: req.params.stock }, function(err,epics){
            for(i=0;i<epics.length;i++){
                epics[i].live = epics[i].epic == req.params.epic;
                epics[i].save(function(err,obj){
                });
            } 
            res.type("json");
            res.end(JSON.stringify({ result: "ok"}));
        });
    });

    app.get("/index/all/:date",function(req,res){
        request.get("http://localhost:54321/index/make_list/"+req.params.date, function(err,resp,body){
            res.type("json");
            res.end(JSON.stringify(index.ftse));
        })
    });

    app.get("/index/metric/:date/:metric", function(req,res){
        request.get("http://localhost:54321/index/all/"+req.params.date, function(err,resp,body){
            res.type("json");
            result={};
            f_c=Object.keys(index.ftse);
            for(i=0;i<f_c.length;i++){
                if(index.ftse[f_c[i]]==1){
                	result[f_c[i]]={};
                    if(req.params.metric == "close"){
                    	result[f_c[i]]['close']
                    }
                }
            }
        });
    });

    return index;
}
