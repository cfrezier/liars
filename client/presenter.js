var Presenter = (function() {
    var Presenter = function(socket) {
        this.socket = socket;
    };

    Player.prototype.execute = function(ctxt) {
        this.socket.emit('iam:presenter');

        this.socket.on('display:lie', function (data) {
            document.querySelector("#questionText").innerHTML = data.question;
            ctxt.showPanel("lie");
        });

        this.socket.on('display:answer', function (data) {
            var container = document.querySelector("#answerLieContainer");
            document.querySelector("#answerQuestionText").innerHTML = data.question;
            while (container.childElementCount > 0) {
                container.removeChild(container.firstElementChild);
            }
            ctxt.showPanel("answer");
        });

    };

    return Presenter;
})();