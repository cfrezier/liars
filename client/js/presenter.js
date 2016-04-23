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

        this.socket.on('display:message', function (data) {
            presenter.displayQuestion(data);
            ctxt.showPanel("result");
        });

        this.socket.on('display:score', function (data) {
            presenter.clearMsg();
            presenter.displayQuestion(data);
            presenter.addMsg(data.msg.msg);
            ctxt.showPanel("result");
        });


        this.socket.on('end', function (data) {
            ctxt.showPanel("start");
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

    return Presenter;
})();