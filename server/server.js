(function(io) {
    var games = [];
    var playerIdGenerator = 0;

    io.sockets.on('connection', function(socket) {
        socket.on('iam:presenter', function(data){
            var game = new Game(socket);
            games.push(game);

            game.presenterSocket.emit('display:code', game.code);
        });

        socket.on('iam:player', function(data){
            var game = getGameByCode(data.code);
            game.createPlayer(data.name, socket);
            game.presenterSocket.emit('display:player', { "name" : data.name } );
        });

    });

    function Game(socket) {
        this.code = this.generateCode();
        this.presenterSocket = socket;
        this.players = [];
    }

    function getGameByCode(code) {
        return games.filter(function(game) {
            return game.code === code;
        })[0];
    }

    Game.prototype.generateCode = function() {
        var valid = false;
        while(!valid) {
            var candidate = Math.random().toString(36).replace(/[a-z]/g, '').substr(0, 5);
            valid = games.filter(function(game){
                return game.code === candidate;
            }).length === 0;
        }
        return candidate;
    };

    Game.prototype.createPlayer = function(name, socket) {
        this.players.push(new Player(name, socket));
    };

    function Player(name, socket) {
        this.name = name;
        this.socket = socket;
        this.id = playerIdGenerator++;

        socket.emit('identify', this.id);
    }

})(require('socket.io').listen(8000));