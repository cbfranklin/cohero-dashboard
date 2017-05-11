var socket;

$(function() {


    connectToSocket();

    handleRemoteEvents();

    $('.cohero-remote-options button').on('click', handleClicks);




});

function connectToSocket() {
    socket = io();
    console.log('Connected to Socket.io');
    //socket.on('kioskEvent', kioskEventHandler);
}

function handleClicks() {
    var directive = $(this).attr('data-directive');
    var msg = {
        "directive": directive
    };
    socket.emit('remoteEvent', msg);
    console.log('Sent remote event', msg);
}

function handleRemoteEvents() {
    socket.on('remoteEvent', remoteEventHandler);
}

function remoteEventHandler(msg) {
    console.log('Remote Event Recieved', msg);
    var directive = msg.directive;
    admin[directive](msg);
}

var kioskInputInit = false;

var $kioskInput = $('.kiosk-names');

var admin = {
    updateKiosks: function(msg) {
        var kioskNames = msg.kiosks;
        if (kioskInputInit === false) {
            $kioskInput.tagsManager({
                prefilled: kioskNames,
                deleteTagsOnBackspace: false
            });
            $kioskInput.on('tm:refresh', function(e, tagList) {
                var tagArr = tagList.split(',');
                var msg = {
                    "directive": 'updateKiosks',
                    "kiosks": tagArr
                };
                socket.emit('remoteEvent', msg);
            });
            kioskInputInit = true;
        } else {
            $kioskInput.off('tm:refresh');
            $kioskInput.tagsManager('empty');
            for (var i in kioskNames) {
                var k = kioskNames[i];
                $kioskInput.tagsManager('pushTag', k);
            }
            $kioskInput.on('tm:refresh', function(e, tagList) {
                var tagArr = tagList.split(',');
                var msg = {
                    "directive": 'updateKiosks',
                    "kiosks": tagArr
                };
                socket.emit('remoteEvent', msg);
            });
        }

    }
};
