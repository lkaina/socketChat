$(document).ready(function(){
  var user, currentRoom;
  var url = 'http://127.0.0.1';
  var socket = io.connect(url);

  var $msgBox = $('.msgBox');
  var $msgList = $('.messages ul');
  var $roomList = $('.roomList ul');
  var $userList = $('.userList ul');

  $('main').hide();
  $('.modal').hide();

  setTimeout(function(){
    $('.modal').fadeIn();
  }, 500);

  var encryptMsg = function(msg, key) {
    return CryptoJS.AES.encrypt(msg, key);
  };

  var decryptMsg = function(msg, key) {
    return CryptoJS.AES.decrypt(msg, key).toString(CryptoJS.enc.Utf8);
  };

  var checkScriptTags = function(msg) {
    msg = msg.replace(' ', '');
    return msg.indexOf('<script') === -1;
  };

  //enable chat when name entered in modal - check for name duplicates
  $('.nameButton').on('click', function(e){
    user = $('.nameBox').val();
    if (user !== ''){
      socket.emit('checkUser', {user:user}, function(data){
        if (data.valid) {
          $('h1').text('Hello '+user+'!');
          socket.emit('newUser', {user:user, room:'lobby'});
          $('main').show();
          $('.modal').fadeOut();
          currentRoom = 'lobby';
        } else {
          alert("Sorry, that username is already taken.")
        }
      });
    }
    return false;
  });

  //send message when button is clicked
  $('.msgButton').on('click', function(e){
    var msg = $msgBox.val();
    if (msg !== '') {
      $msgBox.val('');
      if (checkScriptTags(msg)) {
        var eMsg = encryptMsg(msg, user+currentRoom).toString();
        socket.emit('newMsg', {user:user, msg:eMsg, room:currentRoom});
      } else {
        alert('Script tags are not allowed in this chat room.');
      }
    }
    return false;
  });

  //create new room when button clicked
  $('.newRoomButton').on('click', function(e){
    var newRoom = $('.newRoomBox').val();
    if (newRoom !== ''){
      socket.emit('checkRoom', {room:newRoom}, function(data){
        if (data.valid) {
          $('.newRoomBox').val('');
          socket.emit('newRoom', {user:user, room:newRoom}, function(data){
            socket.emit('changeRoom', {
              user:user,
              oldRoom:currentRoom,
              room:newRoom
            });
            $msgList.append('<li> *** You have left '+currentRoom+', and joined '+newRoom+' ***</li>');
            currentRoom = newRoom;
          });
        } else {
          alert("Sorry, that room name is already in use.")
        }
      });
    }
    return false;
  });

  //change rooms when clicked on
  $('.roomList ul').on('click', 'li', function(e){
    var newRoom = $(this).text();
    if (newRoom !== currentRoom) {
      socket.emit('changeRoom', {
        user:user,
        oldRoom:currentRoom,
        room: newRoom
      });
      $msgList.append('<li> *** You have left '+currentRoom+', and joined '+newRoom+' ***</li>');
      currentRoom = newRoom;
    }
    return false;
  });

  //socket event handlers
  socket.on('currentUsers', function(data){
    $userList.text('');
    for (var i = 0; i < data.users.length; i++) {
      $userList.append('<li>'+data.users[i]+'</li>');
    }
  });
  socket.on('currentRooms', function(data){
    $roomList.text('');
    for (var i = 0; i < data.rooms.length; i++) {
      if (data.rooms[i] === currentRoom) {
        $roomList.prepend('<li>'+data.rooms[i]+'</li>');
      } else {
        $roomList.append('<li>'+data.rooms[i]+'</li>');
      }
    }
  });
  socket.on('addRoom', function(data){
    $('.roomList ul').append('<li>'+data.room+'<li>')
    $roomList.scrollTop($roomList.prop('scrollHeight'));
  });
  socket.on('addUser', function(data){
    $userList.append('<li>'+data.user+'</li>');
    $msgList.append('<li>*** '+data.user+' has joined the room *** </li>');
    $userList.scrollTop($userList.prop('scrollHeight'));
  });
  socket.on('addMsg', function(data){
    var dMsg = decryptMsg(data.msg, data.user+data.room);
    $msgList.append('<li>'+data.user+': '+dMsg+'</li>');
    $msgList.scrollTop($msgList.prop('scrollHeight'));
  });
  socket.on('removeUser', function(data){
    $('.userList li:contains("'+data.user+'")').remove();
    $msgList.append('<li>*** '+data.user+' has left the room ***</li>');
    $msgList.scrollTop($msgList.prop('scrollHeight'));
  });
});
