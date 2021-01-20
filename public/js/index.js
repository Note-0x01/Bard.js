let playing = false;
let currentDisplay = "root";
let currentPlaylist = 0;

let albumimg = [];
let albumsrc = [];

$(document).keydown(function(event){
    if(event.which=="17")
        cntrl = true;
});

$(document).keyup(function(){
    cntrl = false;
});

var cntrl = false;

$(document).keydown(function(event){
    if(event.which=="16")
        shift = true;
});

$(document).keyup(function(){
    shift = false;
});

var shift = false;

var lastClick = 0;
let contextAlbum = 0;

let selected = {};
$(function() {
    init();
});

function init() {
    $.ajax({
        url:"albums",
        success:function(data){
            for(let x = 1; x <= data.length+1; x++) {
                var img;
                if(imageExists('/images/albums/' + x + '.jpg')) {
                    img = $('<img />', { 
                        src: '/images/albums/' + x + '.jpg',
                    }).addClass("song-browse");
                    albumsrc.push('/images/albums/' + x + '.jpg')
                } else {
                    img = $('<img />', { 
                        src: '/images/album.png',
                    }).addClass("song-browse");
                    albumsrc.push('/images/album.png')
                }
                albumimg.push(img)
            }
            console.log(albumimg)
            openRoot();
        }
    });

    window.addEventListener("click",function(){
        document.getElementById("context-menu-song").classList.remove("active");
    });
}

function openRoot() {
    $("#files").html("");
    $("#folder").html("");
    currentDisplay = "root";
    $.ajax({
        url:"albums",
        success:function(data){
            $('#albumname').text("Albums")
            for(let i = 0; i < data.length; i++) {
                let img;
                let src;
                img = albumimg[data[i].id-1]
                console.log(data[i].id-1)

                var li = $('<li/>').addClass("song-list").append($('<a />').append(img).append($('<span/>').text(data[i].name).addClass("song"))).appendTo("#files").bind("contextmenu", function(event){
                    document.getElementById("context-menu-playlist").classList.remove("active");
                    var contextElement = document.getElementById("context-menu-song");
                    contextElement.style.top = event.pageY + "px";
                    contextElement.style.left = event.pageX + "px";
                    contextElement.classList.add("active");
                    contextAlbum = data[i].id
                }).click(function () {
                    openAlbum(data[i].id)
                })
            }
        }
    })
}

function openAlbum(id) {
    $("#files").html("");
    $("#folder").html("");
    currentDisplay = "album";
    $.ajax({
        url:"songs",
        data: {album_id: id},
        success:function(data){
            $('#albumname').text(data['album_name'])

            let root = $('<img />', { 
                src: '/images/back.png',
            }).addClass("song-browse")
        
            $('<a />').click(function () {
                selected = {}
                lastClick = 0
                openRoot()
            }).append(root).append($('<span/>').text("Root").addClass("song-list").addClass("noselect").addClass("song")).addClass("song-option").appendTo("#folder");
        
            console.log(data['album_name'])
            for(let i = 0; i < data.songs.length; i++) {
                let img;
                img = $('<img />', { 
                    src: albumsrc[data.songs[i].album-1]
                }).addClass("song-browse");

                var li = $('<li/>', {
                    id: "song" + i
                }).addClass("song-list").addClass("noselect").append($('<a />').append(img).append($('<span/>').text(data.songs[i].name).addClass("song"))).appendTo("#files").bind("contextmenu", function(event){
                    document.getElementById("context-menu-playlist").classList.remove("active");
                    var contextElement = document.getElementById("context-menu-song");
                    contextElement.style.top = event.pageY + "px";
                    contextElement.style.left = event.pageX + "px";
                    contextElement.classList.add("active");
                    songSelect(data, i, true, false, 0);
                }).click(function () {
                    songSelect(data, i, false, false, 0);
                })
            }
        }
    })
}

function songSelect(data, i, isContext, isList, listID) {
    if(cntrl && shift) {
        if(lastClick <= i) {
            for(var index = lastClick; index <= i; index++) {
                var contextElement = document.getElementById("song" + index);
                contextElement.classList.add("active");
                selected[index] = {elementid: "song" + index, song: data.songs[index]}
            }
        } else {
            for(var index = lastClick; index >= i; index--) {
                var contextElement = document.getElementById("song" + index);
                contextElement.classList.add("active");
                selected[index] = {elementid: "song" + index, song: data.songs[index]}
            }
        }
    } else if(cntrl) {
        var contextElement = document.getElementById("song" + i);
        contextElement.classList.add("active");
        selected[i] = {elementid: "song" + i, song: data.songs[i]}
        lastClick = i;
    } else if(shift) {
        for (item in selected) {
            if(selected[item].song != data.songs[i]) {
                var element = document.getElementById(selected[item].elementid);
                if(element != null)
                    element.classList.remove("active");
                
                delete selected[item]
            }
        }
        if(lastClick <= i) {
            for(var index = lastClick; index <= i; index++) {
                var contextElement = document.getElementById("song" + index);
                contextElement.classList.add("active");
                selected[index] = {elementid: "song" + index, song: data.songs[index]}
            }
        } else {
            for(var index = lastClick; index >= i; index--) {
                var contextElement = document.getElementById("song" + index);
                contextElement.classList.add("active");
                selected[index] = {elementid: "song" + index, song: data.songs[index]}
            }
        }
    } else {
        if(selected[i] != undefined && isContext == false) {
            for (item in selected) {
                if(selected[item].song != data.songs[i]) {
                    var element = document.getElementById(selected[item].elementid);
                    if(element != null)
                        element.classList.remove("active");
                    
                    delete selected[item]
                } else if(selected[item].song == data.songs[i] && Object.keys(selected).length == 1) {
                    if(isList) {
                        playList(i, listID)
                    } else {
                        playSong(data.songs[i].id)
                    }
                }
            }
        } 

        for (item in selected) {
            if(selected[item].song != data.songs[i] && isContext == false) {
                var element = document.getElementById(selected[item].elementid);
                if(element != null)
                    element.classList.remove("active");
                
                delete selected[item]
            } else if(isContext && !selected.hasOwnProperty(i)) {
                var element = document.getElementById(selected[item].elementid);
                if(element != null)
                    element.classList.remove("active");
                
                delete selected[item]
            }
        }
        lastClick = i;
        var contextElement = document.getElementById("song" + i);
        contextElement.classList.add("active");
        selected[i] = {elementid: "song" + i, song: data.songs[i]}
    }
    console.log(selected)
}

function openPlaylist(id) {
    $("#files").html("");
    $("#folder").html("");
    currentDisplay = "playlist";
    currentPlaylist = id;
    $.ajax({
        url:"playlist",
        data: {playlist_id: id},
        success:function(data){
            $('#albumname').text(data['name'])
            for(let i = 0; i < data['length']; i++) {
                let img;
                let src;
                if(imageExists('/images/albums/' + data.songs[i].album + '.jpg')) {
                    src = '/images/albums/' + data.songs[i].album + '.jpg'
                } else {
                    src = '/images/song.png'
                }

                img = $('<img />', { 
                    src: src,
                }).addClass("song-browse");

                var li = $('<li/>', {
                    id: "song" + i
                }).addClass("song-list").addClass("noselect").append($('<a />').append(img).append($('<span/>').text(data.songs[i].name).addClass("song"))).appendTo("#files").bind("contextmenu", function(event){
                    document.getElementById("context-menu-playlist").classList.remove("active");
                    var contextElement = document.getElementById("context-menu-song");
                    contextElement.style.top = event.pageY + "px";
                    contextElement.style.left = event.pageX + "px";
                    contextElement.classList.add("active");
                    songSelect(data, i, true, true, id);
                }).click(function () {
                    console.log(data)
                    songSelect(data, i, false, true, id);
                });
            }
        }
    })
}

function playSong(id) {
    $.ajax({
        url:"playsong",
        data: {id: id},
        success:function(data) {
            
        }
    })
}

function playList(index, playlistId) {
    $.ajax({
        url:"queue",
        data: {index: index, playlistId: playlistId},
        success:function(data) {
            
        }
    })
}

var playlistLock = false

$('#context-menu-listadd').hover(function() {
    console.log("lock")
    playlistLock = true;
}, function() {
    var contextElement = document.getElementById("context-menu-listadd");
    contextElement.classList.remove("active");
    playlistLock = false;
})


$('#addtoplaylist').hover(function() {
    var songMenu = document.getElementById("context-menu-song");
    var contextElement = document.getElementById("context-menu-listadd");
    var maincontext = document.getElementById("context-menu-song");
    console.log(maincontext.offsetTop + 400)
    console.log(document.body.clientHeight)
    if(maincontext.offsetTop + 400 > document.body.clientHeight) {
        console.log(maincontext.offsetTop + 400 - document.body.clientHeight)
        contextElement.style.top = "-" + (maincontext.offsetTop + 400 - document.body.clientHeight) + "px"
    } else {
        contextElement.style.top = "0px"
    }
    
    contextElement.style.left = "150px"
    contextElement.classList.add("active");
}, function() {
    if(!playlistLock) {
        console.log("fire")
        var contextElement = document.getElementById("context-menu-listadd");
        contextElement.classList.remove("active");
    }
})

$('#menudelete').click(function() {
    if(currentDisplay == "root") {
        $.ajax({
            url:"removealbum",
            data: {album_id: contextAlbum},
            success:function(data){
                openRoot()
            }
        })
    } else if(currentDisplay == "album") {
        var counter = 0;
        var jsonToSend = {}
        for(key in Object.keys(selected)) {
            if(counter == 15) {
                $.ajax({
                    url:"removesongs",
                    data: {songs: jsonToSend},
                    success:function(data){
                    }
                })
                counter = 0;
                jsonToSend = {}
            }
            jsonToSend[counter] = selected[Object.keys(selected)[key]]
            counter++;
        }
        $.ajax({
            url:"removesongs",
            data: {songs: jsonToSend},
            success:function(data){
                openAlbum(selected[Object.keys(selected)[0]].song.album)
            }
        })
    } else if(currentDisplay == "playlist") {
        $.ajax({
            url:"removesongsfromlist",
            data: {playlist_id: currentPlaylist, songs: selected},
            success:function(data){
                openPlaylist(currentPlaylist)
            }
        })
    }
})

$('#pldelete').click(function() {
    console.log("contextPlaylist")
    $.ajax({
        url:"deleteplaylist",
        data: {playlist_id: contextPlaylist},
        success:function(data){
        }
    })
})

jQuery('#search').on('input', function() {
    $("#files").html("");
    $("#folder").html("");
    currentDisplay = "search";
    if($('#search').val() == "") {
        openRoot()
        return
    }
    $.ajax({
        url:"search",
        data: {name: $('#search').val()},
        success:function(data){
            $('#albumname').text("Search")

            let root = $('<img />', { 
                src: '/images/back.png',
            }).addClass("song-browse")
        
            console.log(data['album_name'])
            for(let i = 0; i < data.songs.length; i++) {
                let img = $('<img />', { 
                    src: albumsrc[data.songs[i].album-1]
                }).addClass("song-browse");

                var li = $('<li/>', {
                    id: "song" + i
                }).addClass("song-list").addClass("noselect").append($('<a />').append(img).append($('<span/>').text(data.songs[i].name).addClass("song"))).appendTo("#files").bind("contextmenu", function(event){
                    document.getElementById("context-menu-playlist").classList.remove("active");
                    var contextElement = document.getElementById("context-menu-song");
                    contextElement.style.top = event.pageY + "px";
                    contextElement.style.left = event.pageX + "px";
                    contextElement.classList.add("active");
                    songSelect(data, i, true, false, 0);
                }).click(function () {
                    songSelect(data, i, false, false, 0);
                })
            }
        }
    })
});
/*function navigate(path, up) {
    $("#files").html("");
    console.log(path)

    $.ajax({
        url:"files",
        data: {up: up, path: path},
        success:function(data){
            console.log(data)
            if(data[1] == false) {
                var img = $('<img />', { 
                    src: '/images/folder.png',
                });
                var li = $('<li/>').append($('<a />').click(function () {
                    navigate(data[2], true);
                }).append(img).append($('<span/>').text("..").addClass("file"))).appendTo("#files"); //
            }


            $.each(data[0], function(i) {
                if(data[0][i].isDirectory == true) {
                    var img = $('<img />', { 
                        src: '/images/folder.png',
                    });

                    var li = $('<li/>').append($('<a />').click(function () {
                        navigate(data[0][i].path, false);
                    }).append(img).append($('<span/>').text(data[0][i].name).addClass("file"))).appendTo("#files");
                } else {
                    var filedata = data;
                    $.ajax({
                        url:"songinfo",
                        data: {path:filedata[0][i].path},
                        success:function(data){
                            console.log(filedata);
                            var image = data.picture;
                            if (image) {
                                var base64String = "";
                                for (let b = 0; b < image.data.length; b++) {
                                    base64String += String.fromCharCode(image.data[b]);
                                }
                            }
                            var base64 = "data:" + image.format + ";base64," +
                            window.btoa(base64String);

                            var img = $('<img />', { 
                                src: base64,
                            }).addClass("fileart");

                            var li = $('<li/>').append($('<a />').click(function () {
                                play_song(filedata[0][i].path);
                            }).append(img).append($('<span/>').text(filedata[0][i].name).addClass("file"))).appendTo("#files");
                        }
                    })
                }
            })
        }
    })
}

function play_song(path) {

}

$.ajax({
    url:"files",
    success:function(data){
        $.each(data[0], function(i) {
            var img = $('<img />', { 
                src: '/images/folder.png',
            });

            var li = $('<li/>').append($('<a />').click(function () {
                navigate(data[0][i].path, false);
            }).append(img).append($('<span/>').text(data[0][i].name).addClass("file"))).appendTo("#files"); //
        })
    }
})*/
