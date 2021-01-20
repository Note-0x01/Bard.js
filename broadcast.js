const Discord = require('discord.js');
const fs = require('fs')
const mergeImages = require('merge-images');
const { Canvas, Image } = require('canvas');

module.exports = class Bard {
    constructor(token, defaultChannel) {
        this.bot = new Discord.Client();
        this.token = token
        this.dispatcher = null
        this.defaultChannel = defaultChannel;
        this.song = {
            songInternal: {},
            songListener: function(val) {},
            set info(val) {
                this.songInternal = val;
                this.songListener(val);
            },
            get info() {
                return this.songInternal;
            },
            registerListener: function(listener) {
                this.songListener = listener;
            }
        }

        this.settings = {
            settingsInternal: {
                shuffle: false,
                repeat: 0
            },
            settingsListener: function(val) {},
            set setting(val) {
                this.settingsInternal[val.setting] = val.val;
                this.settingsListener(this.settingsInternal);
            },
            get settings() {
                return this.settingsInternal;
            },
            registerListener: function(listener) {
                this.settingsListener = listener;
            }
        }

        this.queue = []
        this.shuffledQueue = []
        this.queuePos = 0
        this.startTime = 0

        this.playing = false;

        //Playback Vars
        this.repeat = false
        this.shuffle = false;

        this.init()
        this.setupEvents()
    }

    init() {
        console.log("Bard.js has been initialized.")
        this.bot.login(this.token);
    }

    setupEvents() {
        this.bot.on('ready', () => {
            console.log(this.defaultChannel)
            this.bot.channels.fetch(this.defaultChannel).then(channel => {
                channel.join()
            });
        });

        this.bot.on('message', msg => {
            var command = msg.content.split(" ");
            if (command[0] === '!hubbatester') {
                console.log(command)
                var first = this.getUserFromMention(command[1])
                var second = this.getUserFromMention(command[2])
                var loveFirst = Math.floor(Math.random() * 3);
                var loveSecond = Math.floor(Math.random() * 3);
                var bg = loveFirst + loveSecond; //0 = bad, 1-3 = okay, 4 = best
                var bgImage;
                if(bg == 0) {
                    bgImage = './files/imgs/hubbatester/Bad.png'
                } else if (bg == 4) {
                    bgImage = './files/imgs/hubbatester/Good.png'
                } else {
                    bgImage = './files/imgs/hubbatester/Mutual.png'
                }

                console.log(first.avatarURL())
                console.log(second.avatarURL())
                console.log(bgImage)
                mergeImages([bgImage, first.avatarURL()], {
                    Canvas: Canvas,
                    Image: Image
                    }).then(b64 => {
                        var attachment = new Discord.MessageAttachment(Buffer.from(b64.split(';base64,').pop(), 'base64'));
                        msg.channel.send(attachment);
                    });
            }
        });
    }

    getUserFromMention(mention) {
        if (!mention) return;
    
        if (mention.startsWith('<@') && mention.endsWith('>')) {
            mention = mention.slice(2, -1);
    
            if (mention.startsWith('!')) {
                mention = mention.slice(1);
            }
    
            return this.bot.users.cache.get(mention);
        }
    }
    

    queueList(playlist, queueIndex) {
        this.queue = playlist;
        this.shuffleQueue();

        if(this.shuffle) {
            console.log("SHUFFLE TRUE")
            var songindex = 0;
            for(let i = 0; i < this.shuffledQueue.length; i++) {
                if(this.shuffledQueue[i] == this.queue[queueIndex]) {
                    songindex = i;
                    break;
                }
            }

            this.playList(this.shuffledQueue, songindex)
        } else {
            this.playList(this.queue, queueIndex);
        }
    }

    playList(playlist, songindex) {
        if(this.bot.voice.connections.first(1)[0] != undefined) {
            this.destroyDispatcher()
            this.queuePos = parseInt(songindex);
            
            this.song.info = playlist[songindex]
            this.playing = true;
            this.startTime = new Date().getMilliseconds

            this.dispatcher = this.bot.voice.connections.first(1)[0].play(playlist[this.queuePos].path).on('finish', () => {
                if(!this.repeat) {
                        songindex++;
                        if(songindex == parseInt(playlist.length)) {
                            songindex = 0;
                    }
                }
                if(this.shuffle) {
                    this.playList(this.shuffledQueue, songindex)
                } else {
                    this.playList(playlist, songindex)
                }
            });
        } else {
            console.log("Bard is not currently in a Voice Channel.")
        }
    }

    playNextInQueue() {
        if(this.queue[0] != undefined) {
            if(this.bot.voice.connections.first(1)[0] != undefined) {
                this.destroyDispatcher()
                var index = parseInt(this.queuePos);
                var playlist = this.queue;

                index++
    
                if(parseInt(index) == parseInt(playlist.length)) {
                    index = 0;
                }
    
                if(this.shuffle) {
                    this.playList(this.shuffledQueue, index)
                } else {
                    this.playList(playlist, index)
                }
            } else {
                console.log("Bard is not currently in a Voice Channel.")
            }
        }
    }

    shuffleQueue() {
        var shuffleQueue = this.queue.slice(0)
        for (let i = shuffleQueue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffleQueue[i], shuffleQueue[j]] = [shuffleQueue[j], shuffleQueue[i]];
        }
        this.shuffledQueue = shuffleQueue
    }

    playSong(song) {
        if(this.bot.voice.connections.first(1)[0] != undefined) {
            this.destroyDispatcher()
            this.queue = {};
            this.queuePos = 0;

            this.song.info = song
            this.playing = true;
            this.startTime = new Date().getMilliseconds
            
            this.dispatcher = this.bot.voice.connections.first(1)[0].play(song.path).on('finish', () => {
                if(this.repeat) {
                    this.playSong(this.song.info)
                } else {
                    console.log("Song Finished")
                    this.destroyDispatcher()
                }
            });
        } else {
            console.log("Bard is not currently in a Voice Channel.")
        }
    }

    pauseSong() {
        if(this.dispatcher != undefined) {
            if(this.playing) {
                this.dispatcher.pause();
                this.playing = false;
            } else {
                this.dispatcher.resume();
                this.playing = true;
            }
        }
    }

    destroyDispatcher() {
        this.playing = false;
        this.song.info = {}

        if(this.dispatcher != null) {
            console.log("Destroyed Dispatcher")
            this.dispatcher.destroy()
        }
    }


    endSong() {
        for (const connection of this.bot.voice.connections.values()) {
            if(connection.dispatcher != null) {
                connection.dispatcher.destroy()
            }
        }
    }
}