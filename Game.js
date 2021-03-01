const Game = class {
    constructor(client) {
        this.client = client;
        var joinPage = $(".join-page").animate({ top: 40, opacity: 0 }, 300, "easeInQuart", () => {
            joinPage.remove();
            $(".game-page").show().css({ opacity: 0, top: -40 }).animate({ top: 0, opacity: 1 }, 300, "easeOutQuart");
            this.init();
        });
    }

    get state() {
        return this.client.state;
    }

    init() {
        this.startDrawing();
    }

    recieve() {
        this.updateSidebar();
    }

    startDrawing() {
        const canvas = new Canvas(600, 450, this.state.bookName);
    }

    updateSidebar() {
        var state = this.client.state;

        console.log(state);

        var logGroup = (o, t) => {
            console.group(t);
            var keys = Object.keys(o);
            var max = Math.max(...keys.filter(k => typeof (o[k]) != "object").map(k => k.length));
            keys.forEach(k => {
                var s = k + ": " + " ".repeat(Math.max(max - k.length, 0));
                if (typeof (o[k]) == "object") logGroup(o[k], s);
                else console.log(s, o[k]);
            });
            console.groupEnd();
        };
        logGroup(state, "Player state");

        // sidebar
        var s = $(".game-page-sidebar-main").empty();

        // players
        var p = $("<div/>").appendTo(s);
        state.game.players.forEach((player) => {
            var you = player.id == state.id;
            var ending = player.currentBook ? ": <span>" + player.currentBook.name + " - page " + (player.currentBook.page + 1) + "</span>" : "";
            $("<div/>").html((you ? "<strong>You</strong>" : player.name) + ending).appendTo(p);
        });

        // actions
        var ac = $("<div/>").appendTo(s);
        $("<button/>").html("Show room code").on("click", () => this.showRoomCode()).appendTo(ac);
        $("<button/>").html("Download books").attr({ disabled: !state.game.allBooksReady }).appendTo(ac);
        $("<button/>").html("Present all images").attr({ disabled: !state.game.allBooksReady }).appendTo(ac);
        $("<button/>").html("New game").attr({ disabled: !state.vip || !state.game.allBooksReady }).appendTo(ac);
    }

    showRoomCode() {
        Swal.fire({
            title: this.client.roomcode,
            customClass: { title: "roomcode-title" },
            showConfirmButton: false,
            showCloseButton: true
        });
    }
};