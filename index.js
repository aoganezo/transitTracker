/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/


'use strict';

const Alexa = require('alexa-sdk');
var responseState;
var request = require('request');
var firebase = require('firebase');
var favBus = "";

var config = {
     apiKey: "AIzaSyCbeVja8AkkgEpNHStAq9_yur53DnZEONg",
        authDomain: "hackillinois2018-9ada1.firebaseapp.com",
        databaseURL: "https://hackillinois2018-9ada1.firebaseio.com",
        projectId: "hackillinois2018-9ada1",
        storageBucket: "hackillinois2018-9ada1.appspot.com",
        messagingSenderId: "684777404962"
      };
      // var firebase = require('firebase');
      firebase.initializeApp(config);

function titleCase(input){
    var list = input.split(" ");
    var str1 = "";
    list.map((word, i) => {
        var temp = word.charAt(0).toUpperCase() + word.substring(1);
        str1 += temp;
        if(i < list.length - 1){
            str1 += " ";
        }
        
    });
    return str1;
}

function stopsMatch(str1, str2, actual){
    if(actual === (str1 + " & " + str2) || actual === (str2 + " & " + str1)){
        return true;
    }
    return false;
}

const APP_ID = undefined;  // TODO replace with your app ID (OPTIONAL).
const handlers = {
    'LaunchRequest': function () {
        this.response.speak("Try asking when the next train or bus is coming. Or Set a favorite train or bus.").listen("hmmmmmmmmmmmm");

        this.emit(':responseReady');
    },
    'getBusTime': function () {
        var bus = this.event.request.intent.slots.bus.value;
        var dir = this.event.request.intent.slots.direction.value;
        dir = dir.charAt(0).toUpperCase() + dir.substring(1);
        var str1 = titleCase(this.event.request.intent.slots.road.value);
        var str2 = titleCase(this.event.request.intent.slots.street.value);

        
        var stpid = '';
        let numBusses = 3; //max amount of predictions to list out

        responseState = this;
        var url = "http://www.ctabustracker.com/bustime/api/v2/getstops?key=WavXPF2WZPanZypHaUdxgrF4Y&rt="+bus+"&dir="+dir+"bound&format=json";
        request(url, function (error, response, body) {
          if(body && responseState != null) {
            // var database = firebase.database();
            var data = JSON.parse(body);

            var foundStop = null;
            // var allStops = "";
            data['bustime-response']['stops'].map(stop => {
              if(stopsMatch(str1.trim(), str2.trim(), stop['stpnm'].trim())){
                foundStop = stop;
                //break here to save time!!!!! Likely not possible
              }        
            });

            if(foundStop != null) {
                //don't speak if found stop
                stpid = foundStop['stpid'];
                url = "http://ctabustracker.com/bustime/api/v2/getpredictions?key=WavXPF2WZPanZypHaUdxgrF4Y&&stpid="+stpid+"&format=json&top=2";
                request(url, function (error, response, body) {
                  if(body && responseState != null){
                    //var database = firebase.database();
                    var data = JSON.parse(body);
                    data = data['bustime-response']['prd'];
                    
                    if (data != undefined) {
                        var predictions = [];
                        data.map(times => {
                            predictions.push(times['prdctdn']);
                        });
                        if (predictions[0] == "DUE" && predictions.length > 1) {
                            responseState.response.speak("The bus is due now. The next bus comes in " + predictions[1] + " minutes.");
                        }
                        else {
                            responseState.response.speak("The next bus comes in " + predictions[0] + " minutes.");
                        }
                        responseState.emit(':responseReady');
                    }
                    else {
                        responseState.response.speak("The next bus comes isn't coming soon, sorry.");
                        responseState.emit(':responseReady');
                    }
                    
                  }
                });
   
            } else {
                //stop not found
                responseState.response.speak("did not find stop: " + str1 + " & " + str2);//+ " : " + allStops);
                responseState.emit(':responseReady');
            }
          }
        });


    },
    //save the thirty six bus going North at Broadway and Roscoe
    'setBusFav': function () {
        var bus = this.event.request.intent.slots.bus.value;
        var dir = this.event.request.intent.slots.direction.value;
        dir = dir.charAt(0).toUpperCase() + dir.substring(1);
        var str1 = titleCase(this.event.request.intent.slots.road.value);
        var str2 = titleCase(this.event.request.intent.slots.street.value);


        var stpid = '';
        let numBusses = 3; //max amount of predictions to list out

        responseState = this;
        var url = "http://www.ctabustracker.com/bustime/api/v2/getstops?key=WavXPF2WZPanZypHaUdxgrF4Y&rt="+bus+"&dir="+dir+"bound&format=json";
        request(url, function (error, response, body) {
          if(body && responseState != null){
            // var database = firebase.database();
            var data = JSON.parse(body);

            var foundStop = null;
            // var allStops = "";
            data['bustime-response']['stops'].map(stop => {
              // allStops += "(" + stop['stpnm'].trim() + ", " + str1.trim() + " & " + str2.trim() + "   " + (stop['stpnm'].trim() === str1.trim() + " & " + str2.trim()) + "),  ";
              if(stopsMatch(str1.trim(), str2.trim(), stop['stpnm'].trim())){
                foundStop = stop;
              }
              //if(stop['stpnm'].trim() === str1.trim() + " & " + str2.trim()){
                
            });
            stpid = foundStop['stpid'];
            favBus = stpid;
            firebase.database().ref().child("f" + bus).set(stpid).then(function (data){}).catch(function (error){});
            responseState.response.speak("Saved bus " + bus + " to favorite");
            responseState.emit(':responseReady');

         }
        });
    },
    'getBusFav': function() {
        var bus = this.event.request.intent.slots.bus.value;

        responseState = this;


        firebase.database().ref().once("value")
          .then(function(snapshot) {
            var data = snapshot.val();

            var stpid = data[("f"+bus)];
                var url = "http://ctabustracker.com/bustime/api/v2/getpredictions?key=WavXPF2WZPanZypHaUdxgrF4Y&&stpid="+stpid+"&format=json&top=3";
                request(url, function (error, response, body) {
                  if(body && responseState != null){
                    //var database = firebase.database();
                    var data = JSON.parse(body);
                    data = data['bustime-response']['prd'];
                    
                    if (data != undefined) {
                        var predictions = [];
                        data.map(times => {
                            predictions.push(times['prdctdn']);
                        });
                        if (predictions[0] == "DUE" && predictions.length > 1) {
                            responseState.response.speak("The bus is due now. The next bus comes in " + predictions[1] + " minutes.");
                        }
                        else {
                            responseState.response.speak("The next bus comes in " + predictions[0] + " minutes.");
                        }
                        responseState.emit(':responseReady');
                    }
                    else {
                        responseState.response.speak("The next bus isn't coming for at least 30 minutes.");
                        responseState.emit(':responseReady');
                    }
                    
                  }
                });


            // responseState.response.speak("You got it: " + bus + "= " +  data.favorite +" : " + data[("f"+bus)] );
            // responseState.emit(':responseReady');
            // var key = snapshot.key; // "ada"
            // var childKey = snapshot.child("name/last").key; // "last"
          });

           // responseState.response.speak("Youdsgfbcjh got it");
            // responseState.emit(':responseReady');
  // .on("value", function(snapshot) {
  //           //console.log(snapshot.val());
  //            responseState.response.speak("You got it");
  //           responseState.emit(':responseReady');
  //       }, function (errorObject) {

  //           responseState.response.speak("You DON'T got it");
  //           responseState.emit(':responseReady');
  //         // console.log("The read failed: " + errorObject.code);
  //       });
        // .get(favBus).then(function(favorite) {
        //     responseState.response.speak("You got it");
        //     responseState.emit(':responseReady');
        // }.catch(function (error){
        //     responseState.response.speak("You DON'T got it");
        //     responseState.emit(':responseReady');
        // }));            
        // }
    
    },
    'getTrainTime': function () {
        var dir = "north";
        dir = dir.charAt(0).toUpperCase();
        var stopnm = "Argyle"
        var color = "red"
        
        var stpid = '';
        let numBusses = 3; //max amount of predictions to list out

        responseState = this;
        var url = "https://data.cityofchicago.org/resource/8mj8-j3c4.json";
        request(url, function (error, response, body) {
            if(body && responseState != null) {
                // var database = firebase.database();
                var data = JSON.parse(body);
                responseState.response.speak("data[0] is: "+data[0][0]+" data[1] is: "+data[1][0]+" data[2] is: "+data[2][0]+
                    "......data[0][stop_name] is: "+data[0]["stop_name"]+" data[1] is: "+data[1]["stop_name"]+" data[2] is: "+data[2][0]));
                responseState.emit(':responseReady');
            

                for (var stop in data) {
                    responseState.response.speak("stop is: "+stop);
                    responseState.emit(':responseReady');
                    var temp = stop['stop_name'];
                    if (temp != undefined) {
                        var n = temp.indexOf('(');
                        temp = temp.substring(0, n != -1 ? n-1 : temp.length);
                        temp = temp.trim();
                        
                        responseState.response.speak("1.The >"+stop[color]+"< line cannot be found at >"+temp+"<. It's different from >"+stopnm+"<. Train is going >"+stop[direction_id]+"<.");
                        responseState.emit(':responseReady');

                       //  if (stop[color] && stop[direction_id] == dir && temp == stopnm) {
                       //      trnstpid = stop[stop_id];
                       //      responseState.response.speak("2.The >"+color+"< line cannot be found at >"+stopnm+"< going >"+dir+"<. By the way, the stop we're comparing to is "+temp+"");
                       //      responseState.emit(':responseReady');
                       //      break;
                       // }
                       } else if (temp == undefined) {
                            responseState.response.speak("temp is null");
                            responseState.emit(':responseReady');
                       }
                }
            } else if (body == null) {
                responseState.response.speak("body is null");
                responseState.emit(':responseReady');
            } else if (responseState == null) {
                responseState.response.speak("response is null");
                responseState.emit(':responseReady');
            }

                
            //stop not found
            responseState.response.speak("Here's data: " + data[0]['stop_name'].indexOf('(')+"..."+data[0]['stop_name'].substring(0,6));//+ " : " + allStops);
            responseState.emit(':responseReady');
        
        });






        /*
        //api key: 97e58b296d9742888e61ff9c2ba6bf55
        //test: http://lapi.transitchicago.com/api/1.0/ttarrivals.aspx?key=97e58b296d9742888e61ff9c2ba6bf55&mapid=40380
        var color = this.event.request.intent.slots.trainLine.value;
        var dir = this.event.request.intent.slots.direction.value;
        dir = dir.charAt(0).toUpperCase();
        var stopnm = this.event.request.intent.slots.stop.value;
        if (color == 'brown') {
            color = 'brn';
        }
        else if (color == 'pink') {
            color = 'pnk';
        }
        else if (color == 'orange') {
            color = 'o';
        }
        else if (color == 'purple') {
            color = 'p';
        }
        else if (color == 'orange') {
            color = 'o';
        }
        else if (color == 'purple express') {
            color = 'pexp';
        }
        else if (color == 'green') {
            color = 'g';
        }

        let numTrains = 2;

        var trnstpid = '';
        responseState = this;

       // var url = "http://lapi.transitchicago.com/api/1.0/ttpositions.aspx?key=97e58b296d9742888e61ff9c2ba6bf55&rt=red&outputType=JSON"
        var url = "http://data.cityofchicago.org/resource/8mj8-j3c4.json"

       try {
            
            request(url, function (error, response, body) {
                this.response.speak("TWOOOOOOOOOO");
                    responseState.emit(':responseReady');
                if(body && responseState != null) {
                    
                // var database = firebase.database();
                    var data = JSON.parse(body);
                    data = data[0]
                    // var foundTrainStop = null;

                    for (var stop in data) {
                        var temp = stop[stop_name];
                        let n = temp.indexOf('(');
                        temp = temp.substring(0, n != -1 ? n-1 : temp.length);
                        temp = temp.trim();
                        
                        this.response.speak("The >"+stop[color]+"< line cannot be found at >"+temp+"< going >"+stop[direction_id]+"<. By the way, the stop we're comparing to is "+temp+"");
                        responseState.emit(':responseReady');

                        if (stop[color] && stop[direction_id] == dir.charAt(0) && temp == stopnm) {
                            trnstpid = stop[stop_id];
                            this.response.speak("The >"+color+"< line cannot be found at >"+stopnm+"< going >"+dir+"<. By the way, the stop we're comparing to is "+temp+"");
                            responseState.emit(':responseReady');
                            break;
                        }
                    }
                }
            }); 

   
        } catch (err) {
            this.response.speak("TWOOOOOOOOOO");
            responseState.emit(':responseReady');
        }
        finally {
            this.response.speak("THREEEEEEEE");
            responseState.emit(':responseReady');
        }
        

        if (trnstpid != '')  {
            var url = "http://lapi.transitchicago.com/api/1.0/ttarrivals.aspx?key=97e58b296d9742888e61ff9c2ba6bf55&stpid="+trnstpid+"&max=5&outputType=JSON"
            this.response.speak("The "+train+" line going "+dir+" comes real soon");

            request (url, function (error, response, body) {
                if (body && responseState != null) {
                    var data = JSON.parse(body);


                    data = data['ctatt']['eta'];

                    if (data != undefined) {
                        arrivals = [];
                        data.map(times => {
                            if (data['isApp'] != 1) {
                                let tempCtaDate = data['arrT'];
                                let ctaDate = new Date(Date.parse(tempCtaDate));
                                let currentDate = new Date();
                                let eta = Math.abs( - currentDate);
                                let eta_toMinutes = Math.floor(eta / 60000);
                                arrivals.push(eta_toMinutes);
                                
                            }
                            else {
                                arrivals.push('DUE');
                            }
                        });

                        if (arrivals[0] = 'DUE' && arrivals.length > 1) {
                            responseState.response.speak("The train is due now. The next train is due in " + arrivals[1] + " minutes.");
                            
                        }
                        else {
                            responseState.response.speak("The train is due in " + arrivals[0] + " minutes.");
                        }
                        responseState.emit(':responseReady');
                    }

                    else {
                        responseState.response.speak("The next train comes isn't coming soon, sorry.");
                        responseState.emit(':responseReady');
                    }


                }
            });
        }
        else {
            this.response.speak("The >"+color+"< line cannot be found at >"+stopnm+"< going >"+dir+"<. By the way, the stop we're compa");
        }
        this.emit(':responseReady');
        */
    },
    'setTrainFav': function () {

        this.emit(':responseReady');
    },
    'setLocation': function () {

        this.emit(':responseReady');
    },
    'AMAZON.HelpIntent': function () {
        const speechOutput = this.t('HELP_MESSAGE');
        const reprompt = this.t('HELP_MESSAGE');
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },
};

exports.handler = function (event, context) {
   
 
    const alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    // To enable string internationalization (i18n) features, set a resources object.
    alexa.registerHandlers(handlers);
    alexa.execute();

     
};


