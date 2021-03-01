const Discord = require('discord.js');
const fs = require('fs')
const mergeImages = require('merge-images');
const Canvas = require(`canvas`);
var hubba = require('./files/hubba.json');

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

        this.bot.on('message', async msg => {
            var command = msg.content.split(" ");
            if (command[0] === '!hubbatester') {
                console.log(command)
                var first = this.getUserFromMention(command[1])
                var second = this.getUserFromMention(command[2])
                var loveFirst = Math.floor(Math.random() * 3);
                var loveSecond = Math.floor(Math.random() * 3);
                var bg = loveFirst + loveSecond; //0 = bad, 1-3 = okay, 4 = best
                let img = await this.generateHubba(bg, first, loveFirst, second, loveSecond)
                msg.channel.send(new Discord.MessageAttachment(img, "hubba.png"))
            }
        });
    }

    async generateHubba(bg, first, loveFirst, second, loveSecond) {
        var bgImage;
        if(bg == 0) {
            bgImage = './files/imgs/hubbatester/Bad.png'
        } else if (bg == 4) {
            bgImage = './files/imgs/hubbatester/Good.png'
        } else {
            bgImage = './files/imgs/hubbatester/Mutual.png'
        }

        let bgI = await Canvas.loadImage(bgImage);
        let firstAv = await Canvas.loadImage(first.avatarURL({ format: "jpg" }));
        let secAv = await Canvas.loadImage(second.avatarURL({ format: "jpg" }));

        let firstLv = await Canvas.loadImage('./files/imgs/hubbatester/' + loveFirst + '.png');
        let secLv = await Canvas.loadImage('./files/imgs/hubbatester/' + loveSecond + '.png');

        const canvas = Canvas.createCanvas(1664, 958);
        const ctx = canvas.getContext(`2d`);
        ctx.drawImage(bgI, 0, 0, 1664, 958);
        ctx.drawImage(firstAv, 200, 216, 330, 330);
        ctx.drawImage(secAv, 1133, 216, 330, 330)
        ctx.drawImage(firstLv, 609, 300, 447, 56);
        ctx.save()
        ctx.scale(-1, 1)
        ctx.drawImage(secLv, -609 - 447, 400, 447, 56)
        ctx.restore()

        //good = #851c29, mutual = #145106, bad = #1d1e27, hubbatext = #4a3318
        var firstR = ""
        var loveFirstC = "";
        if(loveFirst == 0) {
            loveFirstC = "#1d1e27"
            firstR = hubba.badFeeling[Math.floor(Math.random() * hubba.badFeeling.length)]
        } else if(loveFirst == 1) {
            loveFirstC = "#145106"
            firstR = hubba.goodFeeling[Math.floor(Math.random() * hubba.goodFeeling.length)]
        } else if(loveFirst == 2) {
            loveFirstC = "#851c29"
            firstR = hubba.bestFeeling[Math.floor(Math.random() * hubba.bestFeeling.length)]
        }

        ctx.font = '60px sans-serif';
	    ctx.fillStyle = loveFirstC;
        ctx.fillText(firstR, (canvas.width / 2) - ctx.measureText(firstR).width / 2, 281);
        
        var secondR = ""
        var loveSecondC = "";
        if(loveSecond == 0) {
            loveSecondC = "#1d1e27"
            secondR = hubba.badFeeling[Math.floor(Math.random() * hubba.badFeeling.length)]
        } else if(loveSecond == 1) {
            loveSecondC = "#145106"
            secondR = hubba.goodFeeling[Math.floor(Math.random() * hubba.goodFeeling.length)]
        } else if(loveSecond == 2) {
            loveSecondC = "#851c29"
            secondR = hubba.bestFeeling[Math.floor(Math.random() * hubba.bestFeeling.length)]
        }

        ctx.font = '60px sans-serif';
	    ctx.fillStyle = loveSecondC;
        ctx.fillText(secondR, (canvas.width / 2) - ctx.measureText(secondR).width / 2, 521);
        
        var hubbaText = ""
        if(loveFirst == 2 && loveSecond == 2) {
            hubbaText = hubba.mutualBest[Math.floor(Math.random() * hubba.mutualBest.length)]
        } else if((loveFirst == 2 && loveSecond == 1) || (loveFirst == 1 && loveSecond == 2)) {
            hubbaText = hubba.bestGood[Math.floor(Math.random() * hubba.bestGood.length)]
        } else if((loveFirst == 2 && loveSecond == 0) || (loveFirst == 0 && loveSecond == 2)) {
            hubbaText = hubba.bestBad[Math.floor(Math.random() * hubba.bestBad.length)]
        } else if(loveFirst == 1 && loveSecond == 1) {
            hubbaText = hubba.mutualGood[Math.floor(Math.random() * hubba.mutualGood.length)]
        } else if((loveFirst == 1 && loveSecond == 0) || (loveFirst == 0 && loveSecond == 1)) {
            hubbaText = hubba.goodBad[Math.floor(Math.random() * hubba.goodBad.length)]
        } else if(loveFirst == 0 && loveSecond == 0) {
            hubbaText = hubba.mutualBad[Math.floor(Math.random() * hubba.mutualBad.length)]
        } else {
            console.log("Wha?")
        }

        ctx.font = 'bold 60px sans';
	    ctx.fillStyle = "#4a3318";
        ctx.fillText(hubbaText, 500, 816);

        return canvas.toBuffer();
    }

    getUserFromMention(mention) {
        if (!mention) return;
    
        if (mention.startsWith('<@') && mention.endsWith('>')) {
            mention = mention.slice(2, -1);
    
            if (mention.startsWith('!')) {
                mention = mention.slice(1);
            }
    
            return this.bot.users.cache.get(mention);
        } else {
            console.log
            if(this.bot.users.cache.get(mention)) {
                return this.bot.users.cache.get(mention);
            } else if(this.bot.users.cache.find(user => user.username == mention)){
                return this.bot.users.cache.find(user => user.username == mention);
            } else {
                return;
            }
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