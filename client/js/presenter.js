var Presenter = (function () {
    var Presenter = function (socket) {
        this.socket = socket;
        this.code = null;
        this.msgContainer = document.querySelector("#messageContainer");
        this.questionContainer = document.querySelector("#codeResultText");
        this.playerContainer = document.querySelector("#playersContainer");
        this.questionLieContainer = document.querySelector("#questionText");
        this.lieResponse = document.querySelector("#lieResponse");
        this.answerLieContainer = document.querySelector("#answerLieContainer");
        this.answerQuestionContainer = document.querySelector("#answerQuestionText");

        this.audioPlayer = new AudioPlayer();
    };

    Presenter.prototype.execute = function (ctxt) {
        var presenter = this;

        this.socket.emit('iam:presenter');

        this.socket.on('display:code', function (data) {
            presenter.audioPlayer.song();
            presenter.code = data;
            document.querySelector("#codeText").innerHTML = data;
            ctxt.showPanel("code");
        });

        this.socket.on('display:player', function (data) {
            presenter.audioPlayer.player(data.id);
            presenter.playerContainer.appendChild(addElementText(data.name));
            ctxt.showPanel("code");
        });

        this.socket.on('display:lie', function (data) {
            presenter.questionLieContainer.innerHTML = data.question;
            presenter.lieResponse.style.display = 'none';
            ctxt.showPanel("lie");
        });

        this.socket.on('display:answer', function (data) {
            presenter.displayAnswer(data);
            ctxt.showPanel("answer");
        });

        this.socket.on('clear:message', function () {
            presenter.clearMsg();
        });

        this.socket.on('song:result', function() {
            presenter.audioPlayer.end();
        });

        this.socket.on('song:player', function(id) {
            presenter.audioPlayer.player(id);
        });

        this.socket.on('display:message', function (data) {
            presenter.displayQuestion(data);
            presenter.addMsg(data.msg.msg);
            ctxt.showPanel("result");
        });

        this.socket.on('player:lied', function (data) {
            presenter.addMsg(data.name + " a menti.");
        });

        this.socket.on('display:score', function (data) {
            presenter.audioPlayer.result();
            presenter.clearMsg();
            presenter.displayQuestion(data);
            data.scoreTab.forEach(function (score) {
                presenter.addMsg("" + score.name + " : " + score.score);
            });
            ctxt.showPanel("result");
        });


        this.socket.on('end', function (data) {
            presenter.audioPlayer.song();
            ctxt.showPanel("code");
        });

    };

    Presenter.prototype.start = function () {
        this.socket.emit('start', {code: this.code});
    };

    Presenter.prototype.clearMsg = function () {
        while (this.msgContainer.childElementCount > 0) {
            this.msgContainer.removeChild(this.msgContainer.firstElementChild);
        }
    };

    Presenter.prototype.displayQuestion = function (data) {
        this.questionContainer.innerHTML = data.question;
    };

    Presenter.prototype.addMsg = function (msg) {
        var text = document.createTextNode(msg);
        var p = document.createElement("P");
        p.appendChild(text);
        this.msgContainer.appendChild(p);
    };

    function addElementText(msg) {
        var text = document.createTextNode(msg);
        var p = document.createElement("P");
        p.appendChild(text);
        return p;
    }

    Presenter.prototype.displayAnswer = function (data) {
        var presenter = this;
        this.answerQuestionContainer.innerHTML = data.question.question;
        while (this.answerLieContainer.childElementCount > 0) {
            this.answerLieContainer.removeChild(this.answerLieContainer.firstElementChild);
        }
        data.lies.forEach(function (lie) {
            presenter.answerLieContainer.appendChild(addElementText(lie));
        });
    };

    function AudioPlayer() {
        this.sounds = [
            document.querySelector("#endgame"),
            document.querySelector("#song"),
            document.querySelector("#result"),
            document.querySelector("#player1"),
            document.querySelector("#player2"),
            document.querySelector("#player3"),
            document.querySelector("#player4"),
            document.querySelector("#player5"),
            document.querySelector("#player6"),
            document.querySelector("#player7"),
            document.querySelector("#player8"),
            document.querySelector("#player9"),
            document.querySelector("#player10")
        ];
        this.sounds.forEach(function (sound) {
            sound.load();
        });
        this.playerSound = [];
    }

    AudioPlayer.prototype.end = function () {
        this.sounds[0].play();
    };
    AudioPlayer.prototype.song = function () {
        this.sounds[1].play();
    };
    AudioPlayer.prototype.result = function () {
        this.sounds[2].play();
    };
    AudioPlayer.prototype.player = function (id) {
        if (this.playerSound.indexOf(id) == -1) {
            /* pas de son attribué */
            this.playerSound.push(id);
        }
        this.sounds[3 + this.playerSound.indexOf(id)].play();
    };

    return Presenter;
})();