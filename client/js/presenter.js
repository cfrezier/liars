var Presenter = (function () {
    var Presenter = function (socket) {
        this.socket = socket;
        this.code = null;
    };

    Presenter.prototype.execute = function (ctxt) {
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
            data.lies.forEach(function (lie) {
                container.appendChild(document.createTextNode(lie))
            });
            ctxt.showPanel("answer");
        });

        this.socket.('clear:message', function () {
            var container = document.querySelector("#messageContainer");
            while (container.childElementCount > 0) {
                container.removeChild(container.firstElementChild);
            }
        });

        this.socket.on('display:message', function (data) {
            var container = document.querySelector("#messageContainer");
            document.querySelector("#codeResultText").innerHTML = data.question;
            container.appendChild(document.createTextNode(data.msg.msg));
            ctxt.showPanel("result");
        });

        this.socket.on('end', function (data) {
            ctxt.showPanel("start");
        });

    };

    Presenter.prototype.start = function () {
        this.socket.emit('start', {code: this.code});
    };

    return Presenter;
})();