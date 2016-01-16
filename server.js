var http            =       require("http");
var fs              =       require('fs');
var express         =       require("express");
var app             =       express();
var cp              =       require('child_process');
var mongodb         =       require('mongodb');
var bodyParser      =       require('body-parser');
//var mongodbServer   =       new mongodb.Server('localhost', 27017, { auto_reconnect: true, poolSize: 10 });
var database        =       'mongodb://localhost:27017/myMRT';
var MongoClient     =       mongodb.MongoClient;
var loadtable; var sendData = [] ; 
var url = "http://data.taipei/opendata/datalist/datasetMeta/download?id=6556e1e8-c908-42d5-b984-b3f7337b139b&rid=55ec6d6e-dc5c-4268-a725-d04cc262172b";
var url2 = "http://data.taipei/opendata/datalist/datasetMeta/download?id=a132516d-d2f3-4e23-866e-27e616b3855a&rid=8f6fcb24-290b-461d-9d34-72ed1b3f51f0";

app.use(bodyParser());

function sleep(time, callback) {
    var stop = new Date().getTime();
    while(new Date().getTime() < stop + time) {
        ;
    }
    callback();
}

app.get('/',function(req,res){
    res.sendFile(__dirname + "/index.html");
});

setInterval(function(){
    console.log('--------Update new data---------');
    var file = fs.createWriteStream('MRT.json');
    var request = http.get(url, function(response) {
        response.pipe(file);
        console.log("done pipe!");
    });
    file.on('close', function(){
        console.log('request finished downloading file');
        fs.readFile('MRT.json', 'utf8', function (err,data) {
            if(data == '[]'){
                var now = new Date();
                return console.log("No data! " + now);  
            }
            else{
                cp.execSync('mongoimport --db myMRT --collection Time --file MRT.json --jsonArray');
            }
        }); 
    });
}, 3 * 60 * 1000);      


// Use connect method to connect to the Server
MongoClient.connect(database, function (err, db) {
  if (err) {
      console.log('Connect mongoDB error. Error:', err);
  } 
  else {
      console.log('Connection established to', database);
      console.log('---------First Time---------')
      var file = fs.createWriteStream('MRT.json');
      var request = http.get(url, function(response) {
          response.pipe(file);
          console.log("done pipe!"); 
      });
      file.on('close', function(){
          console.log('request finished downloading file');
          fs.readFile('MRT.json', 'utf8', function (err,data) {
              if(data == '[]'){
                  var now = new Date();
                  return console.log("No data! " + now);  
              }
              else{
                  cp.execSync('mongoimport --db myMRT --collection Time --file MRT.json --jsonArray');
              }
          });
      });


      app.post('/loadindex', function(req,res){
          console.log("-----load index-----");
          loadtable = [];
          var collection = db.collection('Time');
          collection.find().toArray(function (err,result){
              for(var x in result.reverse()){
                  if (x == 30) {
                     break ;
                  }
                  loadtable.push(result[x]);
              }
              res.send(loadtable);
              //console.log("loadtable: " + loadtable);
          })  
      });

      app.post('/getdata', function (req,res){
          var collection = db.collection('Time');
          console.log("req: " + req.body.station);
          data = req.body.station;
          collection.find({'Station': data}).toArray(function (err, result) {
              if (err) {
                  console.log(err);
              } 
              else if (result.length) {
                  var desPlace = [] ; var nowTime = [];
                  sendData[0] = desPlace ; sendData[1] = nowTime;
                  
                  for(var x in result){
                      desPlace.push(result[x].Destination);
                      nowTime.push(result[x].UpdateTime);
                  }
                  console.log("sendData: " + sendData);
                  res.send(sendData);
                  console.log('sended!');
              } 
              else {
                  console.log('No document(s) found with defined "find" criteria!');
                  res.send("None");
              }
              
          }); 
      });
    //db.close();
  }
}); 

app.listen(3000,function(){
    console.log("Working on port 3000");
});