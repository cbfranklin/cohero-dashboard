var socket;

$(function() {


    connectToSocket();

    $('.cohero-remote-options button').on('click',handleClicks);

});

function connectToSocket() {
    socket = io();
    console.log('Connected to Socket.io');
    //socket.on('kioskEvent', kioskEventHandler);
}

function handleClicks(){
  var directive = $(this).attr('data-directive');
  var msg = {
    "directive": directive
  };
  socket.emit('remoteEvent', msg);
  console.log('Sent remote event', msg);
}
