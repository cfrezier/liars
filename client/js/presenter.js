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
            var text = document.createTextNode(data.name);
            var p = document.createElement("P");
            p.appendChild(text);
            container.appendChild(p);
            ctxt.showPanel("code");
        });

        this.socket.on('display:lie', function (data) {
            document.querySelector("#questionText").innerHTML = data.question;
            document.querySelector("#lieResponse").style.display = 'none';
            ctxt.showPanel("lie");
        });

        this.socket.on('display:answer', function (data) {
            var container = document.querySelector("#answerLieContainer");
            document.querySelector("#answerQuestionText").innerHTML = data.question.question;
            while (container.childElementCount > 0) {
                container.removeChild(container.firstElementChild);
            }
            data.lies.forEach(function (lie) {
                var text = document.createTextNode(lie);
                var p = document.createElement("P");
                p.appendChild(text);
                container.appendChild(p);
            });
            ctxt.showPanel("answer");
        });

        this.socket.on('clear:message', function () {
            var container = document.querySelector("#messageContainer");
            while (container.childElementCount > 0) {
                container.removeChild(container.firstElementChild);
            }
        });

        this.socket.on('display:message', function (data) {
            var container = document.querySelector("#messageContainer");
            document.querySelector("#codeResultText").innerHTML = data.question;
            var text = document.createTextNode(data.msg.msg);
            var p = document.createElement("P");
            p.appendChild(text);
            container.appendChild(p);
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