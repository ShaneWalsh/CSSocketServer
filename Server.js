'use strict';

const express = require('express');
const socketIO = require('socket.io');
const path = require('path');

const PORT = process.env.PORT || 5000;
const INDEX = path.join(__dirname, 'index.html');
const loggingLevel = "debug";

const server = express()
  .use((req, res) => res.sendFile(INDEX) )
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));

const io = socketIO(server);
//io.set('origins', 'http://localhost:* https://anotherdomain.com:*'); // Come back to this at a later date, when we want to restrcit access.

let usernameTokenMap={};

// Logging
function logg(message, type="debug"){
  if(type == "info"){
    console.log(message);
  } else if(loggingLevel == type){
    console.log(message);
  }
}

//####################################################################
//#####################     LOGIN    #################################
//####################################################################

function generateToken({}){
  let str = '_tok_';
  for(let i = 0; i < 9;i++){
    str+= Math.floor(Math.random() * Math.floor(10));
  }
  return str;
}

var loginSocket = '/login'; // this is the socket for the chat box
var login = io
 .of(loginSocket)
 .on('connection', function (socket) { // on conection, outlines the calls the connect can make
	logg('connected to Login');
  socket.on('attemptLogin', function (data) { //{username,password}
    logg("Login Attempted by:"+data.username);

    // todo go to the back end, check if this is a valid login, if it is, then log the socket innnnn.
    if(true){
      let token = data.username + generateToken({});
      let playerData = getPlayerData({username: data.username});
      usernameTokenMap[''+data.username] = token;
      login.emit('attemptLoginReply',{token:token,playerData:playerData}); // send a chat to everyone connected to chat on this game
    } else { // login failed.
      login.emit('attemptLoginReply',{error:true}); // send a chat to everyone connected to chat on this game
    }
  });

  socket.on('disconnect', (reason) => {
    logg('Lost Login socket');
  });
});

function getPlayerData({username}){
  // todo go to the backend and get the data for username and return it.
  let playerData = {username:username, character:{name:'funkmachine', level:2, hp:12, str:5, dex:1, int:2}};
  return playerData;
}

// create a logout interval
  // it should cycle all logged in users every 6 hours, if the user doesnt have a loving warning token on the first pass add it, on second pass remove it.

function logLoggedInPlayers(){ // this should only be callable from admin login. E.g moi
  logg("############# Logging Players ###############");
  for (var key in usernameTokenMap) {
    if (usernameTokenMap.hasOwnProperty(key)) {
        logg(key + " -> " + usernameTokenMap[key]);
    }
  }
}

function removeOldPlayerCred(username){
  logg("Removing Disconnected Player:"+username);
  delete usernameTokenMap[username];
}

//setTimeout(() => logLoggedInPlayers(), 5000);
setInterval(() => logLoggedInPlayers(), 10000);

//####################################################################
//#####################     Tavern   #################################
//####################################################################
let tavernSockets={}; // we only need to track one of the sockets, once this diconnects, the user is no longer considered active on the server.

var tavernChat = '/tavern'; // this is the socket for the chat box
var tavern = io
  .of(tavernChat)
  .on('connection', function (socket) { // on conection, outlines the calls the connect can make
 	 logg('connected to tavern');
   socket.on('registry', function (data) {
     // todo add check here to ensure this is a logged in user with a valid token.
     tavernSockets[socket] = data.username;
   });
   socket.on('shout', function (data) {
     // validate its from a logged in user, then shout it to every socket listening on this type.
    let shoutBack = {username:data.username,shout:data.shout}; // remove token basically.
    tavern.emit('shoutBack',shoutBack); // send a chat to everyone connected to chat on this game
   });
   socket.on('disconnect', (reason) => { // remove them from the logged in users.
      removeOldPlayerCred(tavernSockets[socket]);
   });

 });



 //####################################################################
 //#####################     Party   ##################################
 //####################################################################

 let partySockets={}; // username to socket link.
 let parties = {}; // each party should have an id, {id:{id:id,name:name,members:[]}}

// party id : 5 users 5 does event. broacast to all on party.

 var partyChat = '/party'; // this is the socket for the chat box
 var party = io
   .of(partyChat)
   .on('connection', function (socket) { // on conection, outlines the calls the connect can make
  	 logg('connected to party');
    socket.on('registry', function (data) {
      partySockets[data.username] = socket;
    });
    socket.on('shout', function (data) {
      // validate its from a logged in user, then shout it to every socket listening on this type.
     let shoutBack = {username:data.username,shout:data.shout}; // remove token basically.
     party.emit('shoutBack',shoutBack); // send a chat to everyone connected to chat on this game
    });

    socket.on('createParty', function(data){
      logg('createParty');
      // create a new party instance and return the id of the party.
      socket.emit('createdParty',{party:'fun town'});
    });

    socket.on('joinParty', function (data) {
      logg('joinParty');
      // validate its from a logged in user
      // add them to the party if it exists.
     let shoutBack = {username:data.username}; // remove token basically.
     party.emit('joinedParty',shoutBack); // send a chat to everyone connected to chat on this game
    });

    socket.on('disconnect', (reason) => { // remove their socket reference
       // todo _s find out if they are in a party, if so remove them from it.
       //partySockets[data.username] = undefined;
    });

  });















//
