const Client = class {
    constructor(username, roomcode, revert, finish) {
        this.userId = localStorage.getItem("userID");
        if (!this.userId) this.userId = uuidv4();
        localStorage.setItem("userID", this.userId);
        this.username = username;
        this.roomcode = roomcode;
        console.log("Connecting as \"%s\" (%s) with code \"%s\"", this.username, this.userId, this.roomcode);

        this.serverURL = "http://localhost:7865";
        this.socket = new WebSocket(this.serverURL.replace("https://", "wss://").replace("http://", "ws://"), "play-protocol");
        this.socket.onopen = () => {
            this.open = true;
            this.send({ userId: this.userId, username: this.username, roomcode: this.roomcode });
            finish();
        };
        this.socket.onmessage = (e) => {
            try {
                var data = JSON.parse(e.data);
                this.recieve(data);
            } catch (e) {
                console.trace(e);
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    html: "An error has occured.<br/><br/>Please report this to Dark with the following info:<pre>" + sanitize(e.stack) + "</pre>You can attempt to rejoin after reloading the page.",
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    allowEscapeKey: false
                });
            }
        };
        this.socket.onclose = (e) => {
            this.disconnected = true;
            if (this.open) {
                Swal.fire({
                    icon: "error",
                    title: "Disconnected",
                    html: "You have been disconnected from the server.<br/><br/>If this was not intentional, please check your internet connection and try again.",
                    confirmButtonText: "Okay",
                    willClose: () => window.location.reload()
                });
            } else {
                revert();
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    html: `There was an error connecting to the server.<br/><br/>this shouldn't happen, please report this to Dark asap with the following info:<pre>userId: ${this.userId}<br/>code: ${e.code}<br/>username: "${this.username}"<br/>reason: ${e.reason}<br/>roomcode: "${this.roomcode}"<br/>url: ${e.currentTarget.url}</pre>`,
                    confirmButtonText: "Okay"
                });
            }
        };
    }

    recieve(data) {
        if (data.echo) {
            var ping = Date.now() - this.echoStart;
            $(".ping").text("Ping: " + Math.round(ping) + "ms");
            return;
        }
        if (!this.state) {
            this.state = data.state;
            this.game = new Game(this);
            var interval = setInterval(() => {
                if (this.disconnected) {
                    clearInterval(interval);
                    $(".ping").text("Disconnected");
                    return;
                }
                this.echoStart = Date.now();
                this.send({ echo: Date.now() });
            }, 1000);
        } else this.state = data.state;
        if (this.game) this.game.recieve();
    }

    send(data) {
        if (this.disconnected) return;
        this.socket.send(JSON.stringify(data));
    }
};

const sanitize = (t) => $("<div/>").text(t).html();

const uuidv4 = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    var r = Math.random() * 16 | 0, v = c == "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
});