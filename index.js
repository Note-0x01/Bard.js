const express = require('express')

const app = express()
var config = require('./files/config.json');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const db = require('better-sqlite3')('files/bard.db');

var _ = require('lodash');
var jsmediatags = require("jsmediatags");
var sanitize = require("sanitize-filename");
var ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath("files/ffmpeg/ffmpeg.exe");
ffmpeg.setFfprobePath("files/ffmpeg/ffprobe.exe");
var formidable = require('formidable');

const broadcast = require('./broadcast');

const server = require('http').Server(app);
const io = require("socket.io")(server);

app.set('view engine', 'ejs')
app.use(session({
    secret: config.webPortalSecret,
	resave: true,
	saveUninitialized: true
}))
app.use(express.static('public'));
const directoryPath = 'files/songs';
const artDirectory = "public/images/albums"

const Bard = new broadcast(config.botToken, config.defaultChannel)

/*================
    MAIN BLOCK
================*/

app.get('/', function (req, res) {
    res.render('login');
})
app.get('/index', function (req, res) {
    if(req.session.loggedin) {
        res.render('index');
    } else {
        res.send('Please login to enter this page.')
    }
})
app.get('/settings', function (req, res) {
    if(req.session.loggedin) {
        res.render('settings');
    } else {
        res.send('Please login to enter this page.')
    }
})
app.get('/upload', function (req, res) {
    if(req.session.loggedin) {
        res.render('upload');
    } else {
        res.send('Please login to enter this page.')
    }
})

app.get("/auth", function (req, res) {
    var password = req.query.password;
    if(password && password == config.webPortalPass) {
        req.session.loggedin = true;
        res.redirect('/index');
    } else {
        res.send('Incorrect password!');
    }
    res.end()
})

server.listen(config.port, async function () {
    db.prepare("CREATE TABLE IF NOT EXISTS songs (id INTEGER PRIMARY KEY, album int, artist VARCHAR[255], name VARCHAR[255], length TIME, path VARCHAR[255]);").run()
    db.prepare("CREATE TABLE IF NOT EXISTS albums (id INTEGER PRIMARY KEY, name VARCHAR[255]);").run()
    db.prepare("CREATE TABLE IF NOT EXISTS playlists (id INTEGER PRIMARY KEY, name VARCHAR[255], songs TEXT);").run()
    console.log('App is running on port ' + config.port + '!')
    scan(directoryPath)
})

/*=====================
    SONG INFO BLOCK
=====================*/
app.get('/search', function(req, res) {
    var songs = db.prepare("SELECT * FROM songs WHERE name LIKE  ('%' || ? || '%') ORDER BY id;").all(req.query.name);
    var searchContent = {songs: songs}
    res.json(searchContent)
});

app.get('/songs', function(req, res) {
    var songs = db.prepare("SELECT * FROM songs WHERE album = ? ORDER BY id;").all(req.query.album_id);
    var album = db.prepare("SELECT * FROM albums WHERE id = ?;").all(req.query.album_id);
    var albumContent = {songs: songs, album_name: album[0].name}
    res.json(albumContent)
});

app.get('/albums', function(req, res) {
    var albums;
    if (req.query.album_id != undefined) {
        albums = db.prepare("SELECT * FROM albums WHERE id = ?;").get(req.query.album_id)
        res.json(albums)
    } else {
        albums = db.prepare("SELECT * FROM albums ORDER BY name;").all()
        res.json(albums)
    }
})

app.get('/playlists', function(req, res) {
    var playlists = db.prepare("SELECT * FROM playlists ORDER BY name;").all()
    res.json(playlists)
})

app.get('/playlist', function(req, res) {
    if (req.query.playlist_id != undefined) {
        var playlist = db.prepare("SELECT * FROM playlists WHERE id = ?;").get(req.query.playlist_id)
        var songJson = JSON.parse(playlist.songs)
        var songs = songJson.songs
        var length = songJson.length

        var songsJson = {}
        var x = 0;
        for(x = 0; x < length; x++) {
            var entry = db.prepare("SELECT * FROM songs WHERE id = ?;").get(songs[x])
            songsJson[x] = entry;
        }
        var tosend = {}
        tosend['songs'] = songsJson
        tosend['length'] = x;
        tosend['name'] = playlist.name
        res.json(tosend)
    }
})

app.get('/addplaylist', function (req, res) {
    if(req.query.name != undefined || req.query.name.match(/[a-z]/i)) {
        console.log("New playlist recieved")
        db.prepare("INSERT INTO playlists (name, songs) VALUES (?, ?);").run([req.query.name, JSON.stringify({length: 0, songs: {}})])
        res.sendStatus(200)
        io.emit("newplaylist")
    }
})

app.get('/deleteplaylist', function (req, res) {
    if(req.query.playlist_id != undefined) {
        console.log("Delete playlist recieved " + req.query.playlist_id)
        db.prepare("DELETE FROM playlists WHERE id = ?").run(req.query.playlist_id)
        res.sendStatus(200)
        io.emit("newplaylist")
    }
})

app.get('/addsongstolist', function (req, res) {
    if(req.query.playlist_id != undefined) {
        console.log("Add to playlist recieved")

        var playlist = db.prepare("SELECT * FROM playlists WHERE id = ?;").get(req.query.playlist_id)
        var songJson = JSON.parse(playlist.songs)
        var songs = songJson.songs
        var length = songJson.length

        for(var x = 0; x < Object.keys(req.query.songs).length; x++) {
            songs[x + length] = req.query.songs[x].song.id
        }

        var input = {length: length + Object.keys(req.query.songs).length, songs: songs}

        console.log(input)

        db.prepare("UPDATE playlists SET songs = ? WHERE id = ?").run(JSON.stringify(input), req.query.playlist_id)

        res.sendStatus(200)
    }
})

app.get('/addalbumtolist', function (req, res) {
    if(req.query.playlist_id != undefined) {
        console.log("Add to playlist recieved")

        var playlist = db.prepare("SELECT * FROM playlists WHERE id = ?;").get(req.query.playlist_id)
        var songJson = JSON.parse(playlist.songs)
        var songs = songJson.songs
        var length = songJson.length

        var songsAlbum = db.prepare("SELECT * FROM songs WHERE album = ? ORDER BY id;").all(req.query.album_id);

        for(var x = 0; x < songsAlbum.length; x++) {
            songs[x + length] = songsAlbum[x].id
        }

        var input = {length: length + songsAlbum.length, songs: songs}

        db.prepare("UPDATE playlists SET songs = ? WHERE id = ?").run(JSON.stringify(input), req.query.playlist_id)

        res.sendStatus(200)
    }
})

app.get('/removesongsfromlist', function (req, res) {
    if(req.query.playlist_id != undefined) {
        console.log("Remove from playlist recieved")

        var playlist = db.prepare("SELECT * FROM playlists WHERE id = ?;").get(req.query.playlist_id)
        var songJson = JSON.parse(playlist.songs)
        var songs = songJson.songs
        var length = songJson.length

        for(item in req.query.songs) {
            delete songs[parseInt(req.query.songs[item].elementid.replace('song', ''))]
        }

        var newSongs = {}
        var i = 0;
        for(item in songs) {
            newSongs[i] = songs[item]
            i++;
        }

        var input = {length: i, songs: newSongs}

        db.prepare("UPDATE playlists SET songs = ? WHERE id = ?").run(JSON.stringify(input), req.query.playlist_id)

        res.sendStatus(200)
    }
})

app.get('/removesongs', function (req, res) {
    songClear(req.query.songs)
    res.sendStatus(200)
})

app.get('/removealbum', function (req, res) {
    console.log("Remove album")
    db.prepare("DELETE FROM albums WHERE id = ?").run(req.query.album_id)
    fs.rmdir(directoryPath + '/' + req.query.album_id, { recursive: true }, (err) => {
        if (err) {
            throw err;
        }
        fs.unlink(artDirectory + '/' + req.query.album_id + '.jpg', async function(err) {
            if (err) throw err;
        })

        var songs = db.prepare("SELECT * FROM songs WHERE album = ?").all(req.query.album_id)

        var newSongs = {}
        var i = 0;
        for(item in songs) {
            newSongs[i] = {song: songs[item]}
            i++;
        }
    
        songClear(newSongs)
        res.sendStatus(200)
    });
})

function songClear(songs) {
    Bard.endSong()
    console.log("Remove songs")
    for(song in songs) {
        var songid = songs[song].song.id
        if(fs.existsSync(songs[song].song.path)) {
            fs.unlink(songs[song].song.path, async function(err) {
                if (err) throw err;
            })
        }
        db.prepare("DELETE FROM songs WHERE id = ?").run(songid)
    }

    var playlists = db.prepare("SELECT * FROM playlists").all()
    for(playlist in playlists) {
        var songJson = JSON.parse(playlists[playlist].songs)
        var plsongs = songJson.songs
        for(select in songs) {
            for(song in plsongs) {
                if(parseInt(plsongs[song]) == songs[select].song.id) {
                    delete plsongs[song]
                }
            }
        }

        var newSongs = {}
        var i = 0;
        for(item in plsongs) {
            newSongs[i] = plsongs[item]
            i++;
        }

        var input = {length: i, songs: newSongs}

        console.log(input)

        db.prepare("UPDATE playlists SET songs = ? WHERE id = ?").run(JSON.stringify(input), playlists[playlist].id)
    }
}

app.post('/fileupload', function (req, res) {
    const form = formidable({ multiples: true });
 
    form.parse(req, async (err, fields, files) => {
        console.log(files)
        var oldpath = files.file.path;
        var info = await uploadParse(oldpath)
        fs.mkdir('files/songs/' + info.album, () => {
            var newpath = 'files/songs/' + info.album + "/" + files.file.name;
            fs.copyFile(oldpath, newpath, function (err) {
                if (err) throw err;

                fs.unlink(oldpath, async function(err) {
                    if (err) throw err;
                    var fullinfo = await songData(newpath)
                    addSong(fullinfo)
                    res.sendStatus(200)
                })
            });
        }) 
    });
   /* var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {

        var oldpath = files.filetoupload.path;
        var newpath = 'files/songs/' + files.filetoupload.name;
        fs.copyFile(oldpath, newpath, function (err) {
          if (err) throw err;

          fs.unlink(oldpath, function(err) {
            if (err) throw err;
            })

            res.sendStatus(200)
        });
    })*/
})

/*========================
    BOT PLAYBACK BLOCK
========================*/


io.on('connection', (socket) => {
    socket.on('getinfo', () => {
        console.log("Emitted songinfo")
        io.emit("songinfo", Bard.song.info)
        io.emit("playing", Bard.playing)
        io.emit("repeat", Bard.repeat)
        seek_info = {length: Bard.song.length, current: new Date().getMilliseconds - Bard.startTime}
        io.emit("seek", seek_info)
    });

    socket.on('playcontrol', () => {
        Bard.pauseSong();
        io.emit("playing", Bard.playing)
    });

    socket.on('repeattoggle', () => {
        Bard.repeat = !Bard.repeat;
        io.emit("repeat", Bard.repeat)
        console.log("Repeat recieved " + Bard.repeat)
    });

    socket.on('shuffletoggle', () => {
        Bard.shuffle = !Bard.shuffle;
        io.emit("shuffle", Bard.shuffle)
        console.log("Shuffle recieved " + Bard.shuffle)
    });

    socket.on('nextqueue', () => {
        Bard.playNextInQueue()
        io.emit("playing", Bard.playing)
    })

    socket.on('getplaylists', () => {
        console.log("Emitted playlists")
        var playlists = getPlaylists();
        io.emit("playlists", Bard.song.info)
    });
});


app.get('/playsong', function (req, res) {
    console.log("Playsong recieved")

    var song = db.prepare("SELECT * FROM songs WHERE id = ?;").get(req.query.id)
    var album = db.prepare("SELECT * FROM albums WHERE id = ?;").get(song.album)

    Bard.playSong({id: song.id, album_id: song.album, album: album.name, artist: song.artist, name: song.name, path: song.path})
    io.emit("playing", Bard.playing)

    res.sendStatus(200)
})

app.get('/queue', function (req, res) {
    console.log("Queue recieved")

    var playlist = db.prepare("SELECT * FROM playlists WHERE id = ?;").get(req.query.playlistId)
    var songJson = JSON.parse(playlist.songs)
    var songs = songJson.songs
    var length = songJson.length
    var songsArray = []
    var x = 0;
    for(x = 0; x < length; x++) {
        var song = db.prepare("SELECT * FROM songs WHERE id = ?;").get(songs[x])
        var album = db.prepare("SELECT * FROM albums WHERE id = ?;").get(song.album)
        console.log(songs[x])
        songsArray.push({id: song.id, album_id: song.album, album: album.name, artist: song.artist, name: song.name, path: song.path});
    }

    Bard.queueList(songsArray, req.query.index)
    io.emit("playing", Bard.playing)

    res.sendStatus(200)
})

Bard.song.registerListener(function(val) {
    io.emit("songinfo", val)
})

/*====================
    DATABASE BLOCK
====================*/

async function scan(filepath) {
    if(!fs.existsSync('files/bard.db')) {
        db.prepare("CREATE TABLE IF NOT EXISTS songs (id INTEGER PRIMARY KEY, album int, artist VARCHAR[255], name VARCHAR[255], length TIME, path VARCHAR[255]);").run()
        db.prepare("CREATE TABLE IF NOT EXISTS albums (id INTEGER PRIMARY KEY, name VARCHAR[255]);").run()
        db.prepare("CREATE TABLE IF NOT EXISTS playlists (id INTEGER PRIMARY KEY, name VARCHAR[255], songs TEXT);").run()

        db.prepare("INSERT INTO albums (name) VALUES (@name);").run({name: "Other"})
    
        var musicfiles = await asyncScan(filepath);
        var songdata = []
        var count = 0;
        for(var i = 0; i < musicfiles.length; i++) {
            if(count == 100) {
                count = 0;
                addSong(songdata)
                songdata = []
            }
            songdata.push(await songData(musicfiles[i]));
            count++;
        }
        addSong(songdata)
    }
}

function addSong(data) {
    console.log(data)
    var songStmt = db.prepare('INSERT INTO songs (album, artist, name, length, path) VALUES (@album, @artist, @name, @length, @path);')
    songStmt.run(data)
}

function asyncScan(filepath) {
    var filelist
    return new Promise(resolve => {
        filelist = findInDir(filepath, /\.mp3$/);
        resolve(filelist)
    })
}

function findInDir (dir, filter, fileList = []) {
    const files = fs.readdirSync(dir);
  
    files.forEach((file) => {
        const filePath = path.join(dir, file);
        const fileStat = fs.lstatSync(filePath);
  
        if (fileStat.isDirectory()) {
            findInDir(filePath, filter, fileList);
        } else if (filter.test(filePath)) {
            fileList.push(filePath);
        }
    });
  
    return fileList;
}

function uploadParse(filepath) {
    return new Promise(resolve => {
        new jsmediatags.Reader(filepath)
        .setTagsToRead(["title", "artist", "album"])
        .read({
            onSuccess: async function(tag) {
                var artist
                if(tag.tags.artist != undefined) {
                    artist = tag.tags.artist.trim()
                } else {
                    artist = ""
                }

                var album
                if(tag.tags.album != undefined) {
                    album = await getAlbum(tag.tags.album.trim());
                } else {
                    album = await getAlbum("Other");
                }
                
                var name
                if(tag.tags.title != undefined) {
                    name = tag.tags.title.trim()
                } else {
                    name = filepath.replace(/^.*[\\\/]/, '')
                }
                
                ffmpeg.ffprobe(filepath, function(err, metadata) {
                    console.log("indexed " + filepath)
                    songdata = { album: album, artist: artist, name: name }
                    resolve(songdata)
                })
            },
            onError: function(error) {
                console.log(':(', error.type, error.info);
            }
        });
    })
}

function songData(filepath) {
    var songdata = {}
    return new Promise(resolve => {
        new jsmediatags.Reader(filepath)
        .setTagsToRead(["title", "artist", "album", "picture"])
        .read({
            onSuccess: async function(tag) {
                var artist
                if(tag.tags.artist != undefined) {
                    artist = tag.tags.artist.trim()
                } else {
                    artist = ""
                }

                var album
                if(tag.tags.album != undefined) {
                    album = await getAlbum(tag.tags.album.trim());
                } else {
                    album = await getAlbum("Other");
                }
                
                var name
                if(tag.tags.title != undefined) {
                    name = tag.tags.title.trim()
                } else {
                    name = filepath.replace(/^.*[\\\/]/, '')
                }
                
                var picture = tag.tags.picture
                var image_path = path.join(artDirectory, album + '.jpg')
                
                if(!fs.existsSync(image_path) && picture) {
                    if(picture.data.length != 0)
                        await extractArt(image_path, picture, album)
                }

                ffmpeg.ffprobe(filepath, function(err, metadata) {
                    console.log("indexed " + filepath)
                    songdata = { album: album, artist: artist, name: name, length: metadata.format.duration, path: filepath }
                    resolve(songdata)
                })
            },
            onError: function(error) {
                console.log(':(', error.type, error.info);
            }
        });
    })
}

function extractArt(image_path, picture, album) {
    return new Promise(resolve => {
        let base64String = ""
        for (let b = 0; b < picture.data.length; b++) {
            base64String += String.fromCharCode(picture.data[b]);
        }
    
        var base64 = Buffer.from(base64String, 'binary').toString('base64')
        console.log("Album Extracted: " + album)
        fs.writeFileSync(image_path, base64, 'base64', function(err) {
            console.log(err);
        });
        resolve()
    })
}

function getAlbum(name) {
    var albumId = db.prepare('SELECT id FROM albums WHERE name = ?').pluck().get(name)

    if(albumId == undefined) {
        db.prepare('INSERT INTO albums (name) VALUES (?)').run(name)
        albumId = db.prepare('SELECT id FROM albums WHERE name = ?').pluck().get(name)
    }

    return albumId;
}