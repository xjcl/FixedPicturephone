$(() => {
    $(".game-page").hide();
    $(".wrapper").hide();

    setTimeout(() => $(".wrapper").fadeIn(200), 200);

    var darkTheme = localStorage.getItem("darkTheme") == null ? true : localStorage.getItem("darkTheme") == "true";
    var updateTheme = () => {
        $(document.body).toggleClass("dark", darkTheme);
        localStorage.setItem("darkTheme", darkTheme ? "true" : "false");
    };
    $(".theme-switcher").on("click", () => {
        darkTheme = !darkTheme;
        updateTheme();
    });
    updateTheme();

    var mobileSize = false;
    const resize = () => {
        var isMobileSize = window.innerWidth <= 800;
        if (mobileSize === isMobileSize) return;
        mobileSize = isMobileSize;
        $(".game-page-sidebar")[mobileSize ? "insertBefore" : "insertAfter"](".game-page-main");
    };
    $(window).on("resize", resize);
    resize();

    new Game({
        roomcode: "undefined",
        state: { bookName: "undefined", players: [], vip: false, game: { allBooksReady: false } }
    });

    return;

    return new Client("Dark", "saxophone", () => { }, () => { });
    var username = "", roomcode = "", isLoading = false;

    var updateForm = () => {
        username = $("#join-input-username").val().trim();
        roomcode = $("#join-input-roomcode").val().trim();
        $(".join-form>button").attr({ disabled: isLoading || !username || !roomcode }).text(isLoading ? "..." : "Create or Join");
        localStorage.setItem("formValues", JSON.stringify({ username, roomcode }));
    };
    $(".join-form>div>input").attr({ autocomplete: "off", autocorrect: "off", autocapitalize: "off", spellcheck: "false" }).on("input", updateForm);

    if (localStorage.getItem("formValues") != null) {
        try {
            var values = JSON.parse(localStorage.getItem("formValues"));
            $("#join-input-username").val(values.username);
            $("#join-input-roomcode").val(values.roomcode);
        } catch (e) { }
    }

    updateForm();

    $(".join-form").on("submit", (e) => {
        e.preventDefault();

        if (!isLoading && username && roomcode) {
            isLoading = true;
            updateForm();
            var troubleTimeout = setTimeout(() => {
                Swal.fire({
                    title: "It's taking some time to connect...",
                    html: "This could possibly be because the server is starting up. Please wait...",
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    allowEscapeKey: false
                });
            }, 3000);
            new Client(username, roomcode, () => {
                isLoading = false;
                updateForm();
                clearTimeout(troubleTimeout);
            }, () => {
                clearTimeout(troubleTimeout);
                Swal.close();
            });
        }

        return false;
    });
});