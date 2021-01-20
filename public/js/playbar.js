$(function() {
    console.log("Emitted")
    $( "#seek" ).slider();
    socket.emit("getinfo")
});

socket.on("songinfo", (data) => {
    if(data.id != undefined) {
        let src;
        if(imageExists('/images/albums/' + data.album_id + '.jpg')) {
            src = '/images/albums/' + data.album_id + '.jpg';
        } else {
            src = '/images/album.png'
        }

        $('#song-cover').attr('src', src)
        $('#song-title').text(data.name)
        $('#song-album').text(data.album)
        $('#song-artist').text(data.artist)
    } else {
        $('#song-cover').attr('src', '/images/album.png')
        $('#song-title').text("No Current Song")
        $('#song-album').text("")
        $('#song-artist').text("")
    }
})

socket.on('seek', (data) => {
    console.log("recieved seek")
    console.log(data)
    if(data) {
        $('#seek').slider("option", "max", data.length);
        $('#seek').slider("option", "value", data.current);
    } else {
        $('#seek').slider("option", "max", 0);
        $('#seek').slider("option", "value", 0);
    }
})

socket.on('playing', (data) => {
    console.log("recieved playing")
    if(data) {
        $("#play-pause").attr('src', '/images/player_controls/pause.png')
    } else {
        $("#play-pause").attr('src', '/images/player_controls/play.png')
    }
})

socket.on('repeat', (data) => {
    console.log("recieved repeat " + data)
    if(data) {
        $("#play-repeat").attr('src', '/images/player_controls/repeat-active.png')
    } else {
        $("#play-repeat").attr('src', '/images/player_controls/repeat-inactive.png')
    }
})

socket.on('shuffle', (data) => {
    console.log("recieved repeat " + data)
    if(data) {
        $("#play-shuffle").attr('src', '/images/player_controls/shuffle-active.png')
    } else {
        $("#play-shuffle").attr('src', '/images/player_controls/shuffle-inactive.png')
    }
})

$(document).ready(function() {
    $("#play-pause").click(function(){
        socket.emit("playcontrol")
    }); 

    $("#play-repeat").click(function(){
        socket.emit("repeattoggle")
    }); 

    $("#play-shuffle").click(function(){
        socket.emit("shuffletoggle")
    }); 

    $("#play-forward").click(function(){
        socket.emit("nextqueue")
    }); 
});