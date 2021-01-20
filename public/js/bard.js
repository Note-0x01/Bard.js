const socket = io();
let contextPlaylist = 0;
Dropzone.autoDiscover = false;
Dropzone.acceptedFiles = "audio/mpeg"

function imageExists(image_url){

    var http = new XMLHttpRequest();

    http.open('HEAD', image_url, false);
    http.send();

    return http.status != 404;

}

socket.on('newplaylist', (data) => {
    playlists();
})

$(document).ready(function() {
    playlists();

    $("#songs").click(function(){
        openRoot();
    }); 

    $("#upload").click(function(){
        openUpload();
    }); 

    $("#settings").click(function(){
        console.log("settings")
    }); 

    $("#playlist-mod").submit(function(){
        var plname = $("#playlist-name").val(); 
        
        $.ajax({
            url:"addplaylist",
            data: {name: plname}
        })

        $("#playlist-name").val(''); 
        document.getElementById("playlist-menu").classList.remove("active");
        event.preventDefault();
    }); 

    $("#playlist-close").click(function(){
        $("#playlist-name").val(''); 
        document.getElementById("playlist-menu").classList.remove("active");
        event.preventDefault();
    }); 

    window.addEventListener("click",function(){
        document.getElementById("context-menu-playlist").classList.remove("active");
    });

    window.addEventListener("contextmenu",function(){
        event.preventDefault();
    });
});

function openUpload() {
    $("#files").html("");
    $("#folder").html("");
    $('#albumname').text("Upload")
    var dropzone = $('<div/>').attr('id', 'drop').appendTo("#folder")

    $("#drop").dropzone({ url: "/fileupload" })
}

function playlists() {
    $.ajax({
        url:"playlists",
        success:function(data){
            $('#playlists').html("")
            $('#menuplaylist').html("")
            $('<li/>').addClass("playlist-list").addClass("noselect").attr('id', 'newplaylist').text("+ New Playlist").appendTo("#playlists").click(function(){
                $("#playlist-name").val(''); 
                var contextElement = document.getElementById("playlist-menu");
                contextElement.style.top = '200px';
                contextElement.style.left = 'calc(50% - 300px)';
                contextElement.classList.add("active");
                console.log(contextElement)
            });
            for(let i = 0; i < data.length; i++) {
                $('<li/>').addClass("playlist-list").addClass("noselect").append($('<a />').click(function () {
                    openPlaylist(data[i].id)
                }).text(data[i].name).addClass("playlist-list")).appendTo("#playlists").bind("contextmenu", function(event){
                    document.getElementById("context-menu-song").classList.remove("active");
                    var contextElement = document.getElementById("context-menu-playlist");
                    contextElement.style.top = event.pageY + "px";
                    contextElement.style.left = event.pageX + "px";
                    contextElement.classList.add("active");
                    contextPlaylist = data[i].id;
                });

                $('<li/>').addClass("item").appendTo("#menuplaylist").text(data[i].name).click(function () {
                    if(currentDisplay == "album") {
                        var counter = 0;
                        var jsonToSend = {}
                        for(key in Object.keys(selected)) {
                            if(counter == 15) {
                                $.ajax({
                                    url:"addsongstolist",
                                    data: {playlist_id: data[i].id, songs: jsonToSend},
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
                            url:"addsongstolist",
                            data: {playlist_id: data[i].id, songs: jsonToSend},
                            success:function(data){
                            }
                        })
                    } else if (currentDisplay == "root") {
                        console.log("test")
                        $.ajax({
                            url:"addalbumtolist",
                            data: {playlist_id: data[i].id, album_id: contextAlbum},
                            success:function(data){
    
                            }
                        })
                    }
                })
            }
        }
    })
}