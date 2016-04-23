var Presenter = (function() {
    var Presenter = function(socket) {
        this.socket = socket;
    };

    Player.prototype.execute = function(ctxt) {
        this.socket.emit('iam:presenter');


    };

    return Presenter;
})();