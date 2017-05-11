var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var moment = require('moment');
require('console.table');

app.use('/', express.static('public'));

app.use('/remote', express.static('remote'));

http.listen(3000, function() {
    console.log('listening on *:3000');
});

var clients = {
    screen: 0,
    remote: 0
};

function isRemote(str) {
    return /\/remote/.test(str);
}

io.on('connection', function(socket) {
    console.log('connection', socket.handshake.headers.referer);
    if (isRemote) {
        clients.remote++;
        var kioskDirective = {
            directive : 'updateKiosks',
            kiosks : randomData.kiosks
        };
        //socket.broadcast.emit('remoteEvent', kioskDirective);
        io.emit('remoteEvent', kioskDirective);

    }
    else {
        clients.screen++;
    }
    console.log('Connected clients:', clients);

    socket.on('remoteEvent', function(data) {
        console.log('REMOTE EVENT', data.directive);
        socket.broadcast.emit('remoteEvent', data);
        if (data.directive === 'toggleRandomData') {
            //toggle it
            randomData.active = !randomData.active;
            console.log(randomData.active);
            if (randomData.active === true) {
                randomEventLoop();
            }
        }
        if (data.directive === 'updateKiosks') {
            randomData.kiosks = data.kiosks;
            console.log(randomData.kiosks);
        }
    });
    socket.on('disconnect', function(socket) {
      if (isRemote) {
          clients.remote--;
      }
      else {
          clients.screen--;
      }
        console.log('Connected clients:', clients);
    });
});





//randomEventLoop();

function randomEvent() {

    var eventType = Math.floor((Math.random() * 3) + 1);

    var randomId = Math.floor((Math.random() * 200));

    var event;

    //puffTaken
    if (eventType <= 2) {
        event = randomData.eventTemplates.puffTaken;

        event.eventId = 'P-100' + randomId;

        var medicationType = Math.floor((Math.random() * 2) + 1);

        if (medicationType === 1) {
            event.eventDetails.medicationType = "Control";
        }
        if (medicationType === 2) {
            event.eventDetails.medicationType = "Rescue";
        }
    }

    //lungFunctionTest
    if (eventType === 3) {
        event = randomData.eventTemplates.lungFunctionTest;
        var randomPef = Math.floor((Math.random() * 200) + 400) / 60;
        event.eventDetails.pef = randomPef;
        event.eventId = 'LF-100' + randomId;
    }

    var now = moment().format('HH:mm:ss');
    event.localTimestamp = now;
    event.eventDetails.eventTimeLocal = now;
    event.eventDetails.syncToDeviceTimeLocal = now;


    var randomKiosk = Math.floor(Math.random() * randomData.kiosks.length);
    var kioskName = randomData.kiosks[randomKiosk];
    event.title = kioskName;

    console.log('\nEvent Emitted\n');
    console.table(event);
    io.emit('kioskEvent', event);
}

function randomEventLoop() {
    var rand = Math.round(Math.random() * 4000) + 2000;
    if (randomData.active === true) {
        setTimeout(function() {
            randomEvent();
            randomEventLoop();
        }, rand);
    }
}






var randomData = {
    eventTemplates: {},
    kiosks: ['Glenlivet', 'Dewars', 'Jameson', 'Laphroaig'],
    active: false
};

randomData.eventTemplates.puffTaken = {
    "eventType": "puffTaken",
    "eventId": "P-12345678",
    /*Dmitry this will be "P" for Puff, and the Id from the Puff table for puffs, for PFTs it will "LF" for lung function, and the Id from the UserMeasurements table like "LF-678363" */
    "userId": "18043",
    "title": "Jameson",
    /*Will be first name of "account"*/
    "localTimestamp": "20:11:30",
    "utcTimestamp": "16:11:30",
    "eventDetails": { /*This object will be different for puffs vs. lung function tests*/
        "medication": "Atrovent HFA",
        "medicationType": "Control",
        /*This would be either "Control", "Rescue - Emergency", "Rescue - Sport"*/
        "eventTimeLocal": "20:11:30",
        "eventTimeUTC": "16:11:30",
        "syncToDeviceTimeLocal": "20:11:31",
        "syncToDeviceTimeUTC": "16:11:31",
        "syncToServerTimeLocal": "20:11:33",
        "syncToServerTimeUTC": "16:11:33",
        "inhalerBattery": 98,
        /*0-100*/
        "remainingPuffs": 67
    }
};

randomData.eventTemplates.lungFunctionTest = {
    "eventType": "lungFunctionTest",
    "eventId": "LF-456797",
    /*Dmitry this will be "P" for Puff, and the Id from the Puff table for puffs, for PFTs it will "LF" for lung function, and the Id from the UserMeasurements table like "LF-678363" */
    "userId": "18041",
    "title": "Glenlivet",
    /*Will be first name of "account"*/
    "localTimestamp": "20:12:30",
    "utcTimestamp": "16:12:30",
    "eventDetails": { /*This object will be different for puffs vs. lung function tests*/
        "pef": 8.85,
        "fev1": 4.32,
        "fvc": 326.98,
        "eventTimeLocal": "20:12:30",
        "evenTimeUTC": "16:12:30",
        "syncToDeviceTimeLocal": "20:12:31",
        "syncToDeviceTimeUTC": "16:12:31",
        "syncToServerTimeLocal": "20:12:33",
        "syncToServerTimeUTC": "16:12:33",
        "battery": 77 /*0-100*/
    }
};
