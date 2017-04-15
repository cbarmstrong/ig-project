var express = require("express");
var app = express();
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
var conf = require("./config.json");
var sg = require("sendgrid")(conf.sg_key);
var helper = require("sendgrid").mail
var e_from = new helper.Email('cbarmstrong@gmail.com');
var e_to = new helper.Email('cbarmstrong@gmail.com');

var prices = require("./prices.js")(app);
var index = require("./index.js")(app);
app.use(express.static(__dirname+"/static"));

app.listen(54321);


