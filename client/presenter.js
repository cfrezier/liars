var Presenter = (function() {
    var Presenter = function(socket) {
        this.socket = socket;
        this.code = null;
    };

    Presenter.prototype.execute = function(ctxt) {
        var presenter = this;

        this.socket.emit('iam:presenter');

        this.socket.on('display:code', function (data) {
            presenter.code = data;
            document.querySelector("#codeText").innerHTML = data;
            ctxt.showPanel("code");
        });

        this.socket.on('display:player', function (data) {
            var container = document.querySelector("#playersContainer");
            container.appendChild(document.createTextNode(data.name));
            ctxt.showPanel("code");
        });

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

    Presenter.prototype.start = function()  {
        this.socket.emit('start', { code : this.code });
    };

    return Presenter;
})();