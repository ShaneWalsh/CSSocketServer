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

let usernameTokenMap={}; // player tokens for security yo.
let usernamePlayerDataMap={}; // cache for the player data when its loaded from the server.
let partyIdTicker = 0;

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

var loginSocket = '/login';
var login = io
 .of(loginSocket)
 .on('connection', function (socket) { // on conection, outlines the calls the connect can make
	logg('connected to Login');
  socket.on('attemptLogin', function (data) { //{username,password}
    logg("Login Attempted by:"+data.username);

    // todo go to the back end, check if this is a valid login, if it is, then log the socket innnnn.
    if(true){
      let token = data.username + generateToken({});
      let playerData = getPlayerData(data.username);
      usernamePlayerDataMap[''+data.username] = playerData;
      usernameTokenMap[''+data.username] = token;
      socket.emit('attemptLoginReply',{token:token,playerData:playerData}); // send a replay to only the sender socket.
    } else { // login failed.
      socket.emit('attemptLoginReply',{error:true}); // send a replay to only the sender socket.
    }
  });

  socket.on('disconnect', (reason) => {
    logg('Lost Login socket');
  });
});

function getPlayerData(username){
  if(!usernamePlayerDataMap[username]){
      usernamePlayerDataMap[username] = {username:username, character:{name:username, beef:2, brains:3, agility:3, charm:3,aim:3}};
  }
  return usernamePlayerDataMap[username];
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

var tavernChat = '/tavern';
var tavern = io
  .of(tavernChat)
  .on('connection', function (socket) { // on conection, outlines the calls the connect can make
 	 logg('connected to tavern');
   socket.on('registry', function (data) {
     // todo add check here to ensure this is a logged in user with a valid token.
     tavernSockets[socket] = data.username;
   });
   socket.on('shout', function (data) {
     // todo validate its from a logged in user, then shout it to every socket listening on this type.
    let shoutBack = {username:data.username,shout:data.shout};
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
// todo store socket to party links, when a user leaves, if he is the last member of that party, remove that party.

// party id : 5 users 5 does event. broacast to all on party.

 var partyChat = '/party';
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
     // todo loop on the member sockets of the group and send the shout to them all.
     party.emit('shoutBack',shoutBack); // send a chat to everyone connected to chat on this game
    });

    socket.on('createParty', function(data){
      logg('createParty');
      let partyId = partyIdTicker + "_" +  generateToken({});
      let partyName = data.partyName;
      let partyDescription = data.partyDescription;
      let partySize = 1;
      let members = [];
      members.push(data.username);
      let leader = data.username;
      let publicParty = data.publicParty; // if this party is visible in the public party list.

      partyIdTicker++;
      parties[partyId] = {partyId:partyId,
                          partyName:partyName,
                          partyDescription:partyDescription,
                          partySize:partySize,
                          publicParty:publicParty,
                          members:members,
                          leader:leader};
      let memberData = []; memberData.push( getPlayerData(data.username));
      socket.emit('createdParty',{partyId:partyId,partyName:partyName,
                                  partyDescription:partyDescription,membersData:memberData,
                                  partySize:partySize,publicParty:publicParty}); // reply only to the socket that created the party.
      // emit to everyone that there is a new part.
      party.emit('newParty',{partyId:partyId,partyName:partyName,
                              partyDescription:partyDescription,membersData:memberData,
                              partySize:partySize,publicParty:publicParty});
    });

    socket.on('joinParty', function (data) {
      logg('joinParty');//todo validate its from a logged in user

     // get the party with the id provided.
     let party = parties[data.partyId];
     if(party != undefined && party.partySize < 4){
       party.partySize += 1; // increment party size
       party.members.push(data.username); // add new party member

       // now update all of the other members of the same party that this new fella has joined. // can do this with a message in the party chats.
      let membersData = [];
      for(var h = 0; h < party.members.length; h++){
        membersData.push(getPlayerData(party.members[h]));
      }
      emitToEntireParty(party,"joinedParty",{username:data.username,partyId:party.partyId,
                           membersData:membersData});
       // todo now update all of the listening games to update their list of the new party member, increaseing the size.
       //party.emit('newPartySize',{partyId:partyId, partySize:partySize});
     } else{
       logg('No party'+data);
       // todo invalid party, handle this shit! Send a error response to the client so it can flash to the user that operation failed.
     }
    });

    // invite player to party

    // launching quest.
    socket.on('startQuest', function (data) {
      logg('startQuest');//todo validate its from a logged in user
     let party = parties[data.partyId];
     if(party != undefined){
       emitToEntireParty(party,"launchQuest",{questId:data.questId});
       // todo mark this party as in a game, so it its removed from the inactive parties list.
     } else{
       logg('No party'+data);
       // todo invalid party, handle this shit! Send a error response to the client so it can flash to the user that operation failed.
     }
    });

    // vote on item
    socket.on('voteSubmit', function (data) {
      logg('voteSubmit');//todo validate its from a logged in user
     let party = parties[data.partyId];
     if(party != undefined){
       emitToEntireParty(party,"voteEmit",{choiceId:data.choiceId, username:data.username});
     } else{
       logg('No party'+data);// todo invalid party, handle this shit!
     }
    });

    // pass some action to all party members.
    socket.on('partyUpdate', function (data) {
      logg('partyUpdate:'+data.questActionCode);//todo validate its from a logged in user
     let party = parties[data.partyId];
     if(party != undefined){
      emitToEntireParty(party,"partyUpdateAction",data); //{choiceId:data.choiceId, username:data.username, questActionCode:data.questActionCode, taskData};
     } else{
       logg('No party'+data); // todo invalid party, handle this shit! Send a error response to the client so it can flash to the user that operation failed.
     }
    });


    socket.on('disconnect', (reason) => { // remove their socket reference
       // todo _s find out if they are in a party, if so remove them from it.
       //partySockets[data.username] = undefined;
    });

  });
//gameplaySocket

function emitToEntireParty(party,action,emitData){
  for(var h = 0; h < party.members.length; h++){
    partySockets[party.members[h]].emit(action,emitData); // pass data to all members
  }
}

// handle the actual in game actions? No, why build the socket group then?














//
