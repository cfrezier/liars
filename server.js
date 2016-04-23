(function (DISPLAY_TIMEOUT, ANSWER_TIMEOUT, SHORT_DISPLAY_TIMEOUT, HTTP_PORT, NUMBER_QUESTION) {
    var games = [];
    var players = [];
    var playerIdGenerator = 0;

    require('./array.js');

    try {
        var io = require('socket.io').listen(8001);
        console.log("WSServer lancé");
    } catch (e) {
        console.log("Problème WSServer" + e);
    }

    io.sockets.on('connection', function (socket) {
        socket.on('iam:presenter', function (data) {
            var game = new Game(socket);
            games.push(game);

            game.presenterSocket.emit('display:code', game.code);
            console.log("New Game: Presenter: " + game.code);
        });

        socket.on('iam:player', function (data) {
            var game = getGameByCode(data.code);
            if (game == undefined) {
                socket.emit('wrong:code');
            } else {
                var player = game.getPlayerByName(data.name);
                if (player !== undefined) {
                    player.disconnected = false;
                    player.socket = socket;
                } else {
                    game.createPlayer(data.name, socket);
                    game.presenterSocket.emit('display:player', {"name": data.name});
                    console.log("[Game" + game.code + "] New Player: " + data.name);
                }
            }

        });

        socket.on('start', function (data) {
            var game = getGameByCode(data.code).start();
            console.log("[Game" + game.code + "] Game Start !");
        });

        socket.on('play:lie', function (data) {
            var player = getPlayerById(data.id);
            if (player != undefined) {
                if (data.lie.trim() === player.game.questions[0].truth) {
                    socket.emit('lie:truth');
                    console.log("[Game" + player.game.code + "] Player found truth !");
                } else {
                    player.actualLie = data.lie.toUpperCase().trim();
                    player.socket.emit('lie:ok');
                    console.log("[Game" + player.game.code + "] Player " + player.name + " lied [" + player.actualLie + "]");

                    player.game.presenterSocket.emit('player:lied', player.name);

                    if (player.game.allLiesEntered()) {
                        player.game.endLie();
                        console.log("[Game" + player.game.code + "] All players lied !");
                    }
                }
            } else {
                console.log("Wrong lier " + JSON.stringify(data));
            }
        });

        socket.on('play:answer', function (data) {
            var player = getPlayerById(data.id);
            if (player != undefined) {
                player.actualAnswer = data.answer.toUpperCase().trim();
                console.log("[Game" + player.game.code + "] Player " + player.name + " answered [" + player.actualAnswer + "]");

                if (player.game.allAnswersEntered()) {
                    console.log("[Game" + player.game.code + "] All players Answered !");
                    player.game.endAnswer();
                }
            } else {
                console.log("Wrong answerer " + JSON.stringify(data));
            }
        });

        socket.on('disconnect', function () {
            socket.emit('disconnected');
            var player = getPlayerBySocket(socket);
            if (player != undefined) {
                player.disconnected = true;
            }
        });
    });

    var express = require('express'), app = express();

    try {
        app.use(express.static(__dirname + '/client'));
        app.get('/', function (req, res) {
            res.sendfile(__dirname + '/client/index.html');
        });
        app.listen(HTTP_PORT);
        console.log("Ready & listening to requests. Ctrl-C to stop.")
    } catch (e) {
        console.log("Error in server: " + e);
    }

    function Game(socket) {
        this.code = this.generateCode();
        this.presenterSocket = socket;
        this.players = [];
        this.questions = randomQuestions(NUMBER_QUESTION);
    }

    var fs = require('fs');
    function randomQuestions(nb) {
        var buffer = fs.readFileSync('./questions.json', "utf8");
        var possibleQuestions = JSON.parse(buffer);
        return possibleQuestions.shuffle().splice(0, nb);
    }

    function getGameByCode(code) {
        return games.filter(function (game) {
            return game.code === code;
        })[0];
    }

    Game.prototype.generateCode = function () {
        var valid = false;
        while (!valid) {
            var candidate = randomString(5, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
            valid = games.filter(function (game) {
                    return game.code === candidate;
                }).length === 0;
        }
        return candidate;
    };

    function randomString(length, chars) {
        var result = '';
        for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
        return result;
    }

    Game.prototype.createPlayer = function (name, socket) {
        var player = new Player(name, socket, this);
        this.players.push(player);
        players.push(player);
        socket.emit('identify', {"id": player.id});
    };

    Game.prototype.getPlayerByName = function (name) {
        return this.players.filter(function (player) {
            return name === player.name;
        })[0];
    };

    Game.prototype.start = function () {
        this.state = "lying";
        this.players.forEach(function (player) {
            player.actualLie = undefined;
            player.actualAnswer = undefined;
        });
        var game = this;
        if (this.questions.length > 0) {
            console.log("[Game" + this.code + "] Question n°" + ( NUMBER_QUESTION - this.questions.length) + " started");
            this.broadcast('display:lie', this.questions[0]);
            this.endLieTimeout = setTimeout(function () {
                game.endLie();
            }, ANSWER_TIMEOUT);
        } else {
            console.log("[Game" + this.code + "] Game terminated !");
            this.end = Date.now();
            this.questions = randomQuestions(NUMBER_QUESTION);
            this.broadcast('end');
        }
        return this;
    };

    Game.prototype.endLie = function () {
        var game = this;
        clearTimeout(this.endLieTimeout);
        if (this.state == "lying") {
            console.log("[Game" + game.code + "] Starting choosing answers");
            this.state = "answering";

            this.broadcast("display:answer", {
                question: this.questions[0],
                lies: this.players
                    .filter(function (player) {
                        return player.actualLie != undefined && player.actualLie != null;
                    })
                    .map(function (player) {
                        return player.actualLie;
                    })
                    .concat(this.questions[0].truth.toUpperCase())
                    .unique()
                    .completeWith(this.questions[0].lies, this.players.length + 1 > 4 ? this.players.length + 1 : 4)
                    .shuffle()
            });

            this.endAnswerTimeout = setTimeout(function () {
                game.endAnswer();
            }, ANSWER_TIMEOUT);
        }
    };

    Game.prototype.broadcast = function (evt, obj) {
        this.presenterSocket.emit(evt, obj);
        this.players.forEach(function (player) {
            player.socket.emit(evt, obj);
        });
    };

    Game.prototype.allLiesEntered = function () {
        var allLied = true;
        this.players.forEach(function (player) {
            allLied = allLied && (player.actualLie !== undefined);
        });
        return allLied;
    };

    Game.prototype.allAnswersEntered = function () {
        var allAnswers = true;
        this.players.forEach(function (player) {
            allAnswers = allAnswers && (player.actualAnswer !== undefined);
        });
        return allAnswers;
    };

    Game.prototype.endAnswer = function () {
        var game = this;
        clearTimeout(this.endAnswerTimeout);
        if (this.state == "answering") {
            console.log("[Game" + game.code + "] Starting displaying results");
            this.state = "calculating";
            this.presenterSocket.emit("clear:message", {});
            this.resultMessages = [];

            var points = 500;
            if ((NUMBER_QUESTION / 2) > this.questions.length) {
                points = 1000;
            }
            if (this.questions.length == 1) {
                points = 1500;
            }

            /* L'ordi a menti */
            game.questions[0].lies.forEach(function (lie) {
                var liedWorkedOn = "";
                game.players.forEach(function (player, idx, arr) {
                    if (lie.toUpperCase() === player.actualAnswer) {
                        liedWorkedOn += player.name + " ";
                        player.score -= points;
                    }
                });
                if (liedWorkedOn.length > 0) {
                    game.resultMessages.push({msg: "La réponse " + lie, time: SHORT_DISPLAY_TIMEOUT});
                    game.resultMessages.push({msg: "Etait un MENSONGE de la MATRICE !!!", time: SHORT_DISPLAY_TIMEOUT * 2});
                    game.resultMessages.push({msg: "qui a trompé " + liedWorkedOn, time: SHORT_DISPLAY_TIMEOUT * 2});
                }
            });

            /* A menti */
            this.players.forEach(function (player, idx, arr) {
                var liedTo = "";
                arr.forEach(function (potentialLiedTo) {
                    if (potentialLiedTo.actualAnswer === player.actualLie) {
                        liedTo += potentialLiedTo.name + " ";
                        player.score += points;
                    }
                });
                if (liedTo.length > 0) {
                    game.resultMessages.push({msg: "La réponse " + player.actualLie, time: SHORT_DISPLAY_TIMEOUT});
                    game.resultMessages.push({msg: "Etait un MENSONGE de " + player.name, time: SHORT_DISPLAY_TIMEOUT * 2});
                    game.resultMessages.push({msg: "qui a trompé " + liedTo, time: SHORT_DISPLAY_TIMEOUT * 2});
                }
            });

            /* A trouvé la vérité */
            this.resultMessages.push({msg: "La réponse " + game.questions[0].truth.toUpperCase(), time: SHORT_DISPLAY_TIMEOUT});
            this.resultMessages.push({msg: "Etait la VERITE", time: SHORT_DISPLAY_TIMEOUT});
            var haveFoundTruth = "";
            this.players.forEach(function (player, idx, arr) {
                if (player.actualAnswer === game.questions[0].truth.toUpperCase()) {
                    player.score += points * 2;
                    haveFoundTruth += player.name + " ";
                }
            });
            if (haveFoundTruth.length > 0) {
                this.resultMessages.push({msg: "qui a été trouvée par " + haveFoundTruth, time: SHORT_DISPLAY_TIMEOUT});
            } else {
                this.resultMessages.push({msg: "qui n'a été trouvée par PERSONNE !", time: SHORT_DISPLAY_TIMEOUT});
            }
            game.displayNextMessage();
        }
    };

    Game.prototype.displayNextMessage = function () {
        var game = this;
        if (this.resultMessages.length > 0) {
            var result = this.resultMessages.shift();
            this.presenterSocket.emit("display:message", {question: this.questions[0].question, msg: result});
            setTimeout(function () {
                game.displayNextMessage();
            }, DISPLAY_TIMEOUT);
        } else {
            this.presenterSocket.emit("display:score", {question: this.questions[0].question, scoreTab: game.getScoreTab()});
            setTimeout(function () {
                console.log("[Game" + game.code + "] Next Question !");
                game.questions.shift();
                game.start();
            }, DISPLAY_TIMEOUT);
        }
    };

    Game.prototype.getScoreTab = function () {
        return this.players.map(function (player) {
            return {name: player.name, score: player.score}
        }).sort(function (a, b) {
            return a.score - b.score;
        });
    };

    function Player(name, socket, game) {
        this.name = name.toUpperCase();
        this.socket = socket;
        this.id = playerIdGenerator++;
        this.game = game;
        this.score = 0;
    }

    function getPlayerById(id) {
        return players.filter(function (player) {
            return player.id === id;
        })[0];
    }

    function getPlayerBySocket(socket) {
        return players.filter(function (player) {
            return player.socket === socket;
        })[0];
    }

})(5000, 30000, 1000, 8000, 1);