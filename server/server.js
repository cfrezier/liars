(function (io, DISPLAY_TIMEOUT, ANSWER_TIMEOUT, SHORT_DISPLAY_TIMEOUT, HTTP_PORT) {
    var games = [];
    var players = [];
    var playerIdGenerator = 0;

    io.sockets.on('connection', function (socket) {
        socket.on('iam:presenter', function (data) {
            var game = new Game(socket);
            games.push(game);

            game.presenterSocket.emit('display:code', game.code);
        });

        socket.on('iam:player', function (data) {
            var game = getGameByCode(data.code);
            game.createPlayer(data.name, socket);
            game.presenterSocket.emit('display:player', {"name": data.name});
        });

        socket.on('start', function (data) {
            getGameByCode(data.code).start();
        });

        socket.on('play:lie', function (data) {
            var player = getPlayerById(data.id);
            player.actualLie = data.lie.toUpperCase();

            if (player.game.allLiesEntered()) {
                player.game.endLie();
            }
        });

        socket.on('play:answer', function (data) {
            var player = getPlayerById(data.id);
            player.actualAnswer = data.answer.toUpperCase();

            if (player.game.allAnswersEntered()) {
                player.game.endAnswer();
            }
        });
    });

    var express = require('express'),
        app = express(),
        port = HTTP_PORT;

    app.use(express.static(__dirname + '/client'));
    app.get('/', function(req, res){
        res.sendfile(__dirname + '/client/index.html');
    });
    app.listen(port);

    function Game(socket) {
        this.code = this.generateCode();
        this.presenterSocket = socket;
        this.players = [];
        this.questions = [
            {question: "Ceci est une 1ere phrase à remplir par un ______.", truth: "blanc", lies: ["grrrr", "méchant"]},
            {question: "Ceci est une 2eme phrase à remplir par un ______.", truth: "blanc", lies: ["grrrr", "méchant"]},
            {question: "Ceci est une 3eme phrase à remplir par un ______.", truth: "blanc", lies: ["grrrr", "méchant"]},
            {question: "Ceci est une 4eme phrase à remplir par un ______.", truth: "blanc", lies: ["grrrr", "méchant"]},
            {question: "Ceci est une 5eme phrase à remplir par un ______.", truth: "blanc", lies: ["grrrr", "méchant"]},
            {question: "Ceci est une 6eme phrase à remplir par un ______.", truth: "blanc", lies: ["grrrr", "méchant"]},
            {question: "Ceci est une 7eme phrase à remplir par un ______.", truth: "blanc", lies: ["grrrr", "méchant"]}
        ];
    }

    function getGameByCode(code) {
        return games.filter(function (game) {
            return game.code === code;
        })[0];
    }

    Game.prototype.generateCode = function () {
        var valid = false;
        while (!valid) {
            var candidate = Math.random().toString(36).replace(/[a-z]/g, '').substr(0, 5);
            valid = games.filter(function (game) {
                    return game.code === candidate;
                }).length === 0;
        }
        return candidate;
    };

    Game.prototype.createPlayer = function (name, socket) {
        var player = new Player(name, socket, this);
        this.players.push(player);
        players.push(player);
    };

    Game.prototype.start = function () {
        this.state = "lying";
        this.players.forEach(function (player) {
            player.actualLie = null;
            player.actualAnswer = null;
        });
        var game = this;
        if (this.questions.length > 0) {
            this.broadcast('display:lie', this.questions[0]);
            setTimeout(function () {
                game.endLie();
            }, ANSWER_TIMEOUT);
        } else {
            this.broadcast('end');
        }
    };

    Game.prototype.endLie = function () {
        var game = this;
        if (this.state == "lying") {
            this.state = "answering";

            this.broadcast("display:answer", {
                question: this.questions[0],
                lies: this.players.map(function (player) {
                    return player.actualLie;
                }).concat(this.questions[0].truth).shuffle()
            });

            setTimeout(function () {
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
            allLied = allLied && player.actualLie !== null;
        });
        return allLied;
    };

    Game.prototype.allAnswersEntered = function () {
        var allAnswers = true;
        this.players.forEach(function (player) {
            allAnswers = allAnswers && player.actualAnswer !== null;
        });
        return allAnswers;
    };

    Game.prototype.endAnswer = function () {
        var game = this;
        if (this.state == "answering") {
            this.state = "calculating";
            this.presenterSocket.emit("clear:message", {});
            this.resultMessages = [];

            var points = 500;
            switch (this.questions.length) {
                case 3:
                case 2:
                    points = 1000;
                    break;
                case 1:
                    points = 1500;
                    break;
            }

            /* A menti */
            this.players.forEach(function (player, idx, arr) {
                var liedTo = "";
                arr.players.forEach(function (potentialLiedTo) {
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
            this.resultMessages.push({msg: "La réponse " + game.questions[0].truth, time: SHORT_DISPLAY_TIMEOUT});
            this.resultMessages.push({msg: "Etait la VERITE", time: SHORT_DISPLAY_TIMEOUT});
            var haveFoundTruth = "";
            this.players.forEach(function (player, idx, arr) {
                if (player.answer === game.questions[0].truth) {
                    player.score += points * 2;
                    haveFoundTruth += player.name + " ";
                }
            });
            this.resultMessages.push({msg: "qui a été trouvée par " + haveFoundTruth, time: SHORT_DISPLAY_TIMEOUT});

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
                game.questions.shift();
                game.start();
            }, DISPLAY_TIMEOUT);
        }
    };

    Game.prototype.getScoreTab = function () {
        return this.players.sort(function (a, b) {
            return a.score - b.score;
        });
    };

    function Player(name, socket, game) {
        this.name = name.toUpperCase();
        this.socket = socket;
        this.id = playerIdGenerator++;
        this.game = game;
        this.score = 0;

        socket.emit('identify', this.id);
    }

    function getPlayerById(id) {
        return players.filter(function (player) {
            return player.id === id;
        })[0];
    }

    Array.prototype.shuffle = function () {
        var i = this.length, j, temp;
        if (i == 0) return this;
        while (--i) {
            j = Math.floor(Math.random() * ( i + 1 ));
            temp = this[i];
            this[i] = this[j];
            this[j] = temp;
        }
        return this;
    }

})(require('socket.io').listen(8000), 5000, 30000, 1000, 80);