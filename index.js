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
        
        // var str2 = this.event.request.intent.slots.street.value;

        
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

            if(foundStop != null) {
                //don't speak if found stop
                stpid = foundStop['stpid'];
                url = "http://ctabustracker.com/bustime/api/v2/getpredictions?key=WavXPF2WZPanZypHaUdxgrF4Y&&stpid="+stpid+"&format=json&top=3";
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
                        responseState.response.speak("The next bus comes in the morning, sorry.");
                        responseState.emit(':responseReady');
                    }
                    
                  }
                });
   
            }else{
                //stop not found
                responseState.response.speak("did not find stop: " + str1 + " & " + str2 + " : " + allStops);
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
        // var str1 = this.event.request.intent.slots.road.value;
        // var str2 = this.event.request.intent.slots.street.value;
//        var busNickName = this.event.request.intent.slots.busNickName.value;

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
                        responseState.response.speak("The next bus comes in the morning, sorry.");
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
        var train = this.event.request.intent.slots.trainLine.value;
        var dir = this.event.request.intent.slots.direction.value;
        if (dir != undefined)  {

            this.response.speak("The "+train+" line going "+dir+" comes real soon");
        }
        else {
            this.response.speak("The "+train+" line is coming soon from all directions");
        }
        this.emit(':responseReady');
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


