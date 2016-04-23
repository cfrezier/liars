(function(Presenter, Player) {

    function PrepareGame() {
        var socket = null;
        var executor = null;

        return {
            connect: function() {
                socket = io.connect("http://localhost:" + PORT);
            },
            iAm: function(what) {
                if(what === 'presenter') {
                    executor = new Presenter(socket);
                } else {
                    executor = new Player(socket, document.querySelector("#name"), document.querySelector("#code"));
                }
                executor.execute(this);
            },
            showPanel: function(type) {
                var allPanels = ["#startPanel", "#liePanel", "#answerPanel", "#resultPanel"];
                allPanels.forEach(function(panel) {
                    document.querySelector(panel).style.display = "none";
                });
                document.querySelector("#" + type + "Panel").style.display = "block";
            },
            lie: function() {
                executor.lie();
            }
        }
    }

    var prep = new PrepareGame();
    document.observe("dom:loaded", prep.connect());

})(Presenter, Player);