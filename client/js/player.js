var Player = (function () {
    var Player = function (socket, name, code) {
        this.socket = socket;
        this.name = name;
        this.code = code;
        this.id = -1;
        this.ctxt = null;
    };

    Player.prototype.execute = function (ctxt) {
        var player = this;
        player.ctxt = ctxt;

        this.socket.emit('iam:player', {"name": this.name, "code": this.code});
        ctxt.showPanel("wait");

        this.socket.on('identify', function (data) {
            player.id = data.id;
        });

        this.socket.on('wrong:code', function (data) {
            alert("mauvais code entré");
        });

        this.socket.on('display:lie', function (data) {
            document.querySelector("#questionText").innerHTML = data.question;
            ctxt.showPanel("lie");
        });

        this.socket.on('display:answer', function (data) {
            document.querySelector("#warningTruth").style.display = "none";
            var container = document.querySelector("#answerLieContainer");
            document.querySelector("#answerQuestionText").innerHTML = data.question.question;
            while (container.childElementCount > 0) {
                container.removeChild(container.firstElementChild);
            }
            data.lies
                .filter(function (lie) {
                    return lie.id != player.id;
                })
                .forEach(function (lie) {
                    var btn = document.createElement("BUTTON");
                    btn.appendChild(document.createTextNode(lie));
                    btn.addEventListener("click", function () {
                        player.socket.emit('play:answer', {"id": player.id, "answer": lie});
                    });
                    container.appendChild(btn);
                });
            ctxt.showPanel("answer");
        });

        this.socket.on('lie:truth', function (data) {
            document.querySelector("#warningTruth").style.display = "block";
            ctxt.showPanel("lie");
        });

        this.socket.on('lie:ok', function (data) {
            ctxt.showPanel("wait");
        });
    };

    Player.prototype.lie = function () {
        var lie = document.querySelector("#lie").value;
        this.socket.emit('play:lie', {"id": this.id, "lie": lie});
        this.ctxt.showPanel("wait");
    };

    return Player;
})();