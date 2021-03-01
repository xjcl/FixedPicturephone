const Canvas = class {
    constructor(width, height, bookName) {
        this.width = width;
        this.height = height;
        this.canvas = document.createElement("canvas");
        this.canvas.className = "canvas-area-canvas";
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext("2d");
        this.layers = [];
        this.canvas.addEventListener("pointerdown", (e) => this.startLine(e));
        //this.canvas.addEventListener("mousedown", (e) => this.startLine(e));
        //this.canvas.addEventListener("touchstart", (e) => this.startLine(e));
        window.addEventListener("pointermove", (e) => this.moveLine(e), { passive: false });
        window.addEventListener("touchmove", (e) => this.moveLine(e), { passive: false });
        window.addEventListener("pointerup", () => this.endLine());
        window.addEventListener("touchend", () => this.endLine());

        this.totalLineHistory = [];
        this.lineUndoHistory = [];
        this.lineRedoHistory = [];
        this.deletedLayers = [];

        this.area = $("<div/>").addClass("canvas-area").appendTo(".game-page-main");
        $("<div/>").addClass("canvas-area-book-name").html("You are drawing in: <strong>" + sanitize(bookName) + "</strong>'s book").appendTo(this.area);
        this.area.append(this.canvas);
        this.layerElement = $("<div/>").addClass("canvas-area-layers").appendTo(this.area);
        this.addLayerButton = $("<div/>").addClass("canvas-area-layers-add").html("<span>\u002b</span><br/>Add<br/>Layer").appendTo(this.layerElement).on("click", () => this.addLayer());

        this.controlsBar = $("<div/>").addClass("canvas-area-controls").appendTo(this.area);

        this.tools = ["line", "rect", "circle", "marker", "eraser", "fill"].map((name) => {
            var element = $("<div/>").addClass("canvas-area-controls-tool canvas-area-controls-tool-" + name).appendTo(this.controlsBar).on("click", () => this.switchTool(name));
            return { name, element };
        });
        this.currentTool = "marker";
        this.currentColor = "#ff0000";
        this.currentThickness = 10;


        if (localStorage.getItem("canvas")) {
            const existingCanvas = JSON.parse(localStorage.getItem("canvas"));
            existingCanvas.layers.forEach((l) => this.addLayer(l));
            this.activateLayer(existingCanvas.activeLayer);
        } else this.addLayer();

        if (localStorage.getItem("canvasSettings")) {
            const existingSettings = JSON.parse(localStorage.getItem("canvasSettings"));
            this.currentTool = existingSettings.currentTool;
            this.currentColor = existingSettings.currentColor;
            this.currentThickness = existingSettings.currentThickness;
        }

        this.updateTools();
        this.saveSettings();
    }

    updateTools() {
        this.tools.forEach((t) => t.element.toggleClass("active", t.name == this.currentTool));
    }

    switchTool(name) {
        if (this.currentTool == name) return;
        this.currentTool = name;
        this.updateTools();
        this.saveSettings();
    }

    getTouchForEvent(e) {
        return e.touches ? e.touches[0] : e;
    }

    getCoordinateForEvent(e) {
        var touch = this.getTouchForEvent(e);
        var rect = this.canvas.getBoundingClientRect();
        var scale = Math.max(this.width / $(this.canvas).width(), 1);
        this.canvasScale = Math.min($(this.canvas).width() / this.width, 1);
        return { x: Math.round((touch.clientX - rect.left) * scale), y: Math.round((touch.clientY - rect.top) * scale), pressure: touch.pressure == null ? 0.5 : touch.pressure };
    }

    getExport() {
        return {
            width: this.width,
            height: this.height,
            activeLayer: this.layers.findIndex((l) => l.active),
            layers: this.layers.map((l) => l.lines),
            lineUndoHistory: this.lineUndoHistory,
            lineRedoHistory: this.lineRedoHistory
        };
    }

    save() {
        localStorage.setItem("canvas", JSON.stringify(this.getExport()));
    }

    updateHistory() {

    }

    getSettingsExport() {
        return {
            currentTool: this.currentTool,
            currentColor: this.currentColor,
            currentThickness: this.currentThickness
        };
    }

    saveSettings() {
        localStorage.setItem("canvasSettings", JSON.stringify(this.getSettingsExport()));
    }

    get activeLayer() {
        return this.layers.find((l) => l.active);
    }

    startLine(e) {
        this.activeLayer.startLine(e);
        this.updateLayers();
    }

    moveLine(e) {
        e.preventDefault();
        var pos = this.getCoordinateForEvent(e);
        if (pos.x >= 0 && pos.y >= 0 && pos.x <= this.width && pos.y <= this.height) {
            if (!this.currentCursor) this.currentCursor = $("<div/>").addClass("canvas-cursor").appendTo(document.body);
            var touch = this.getTouchForEvent(e);
            this.currentCursor.css({ left: touch.clientX, top: touch.clientY, width: this.currentThickness, height: this.currentThickness, transform: "translate(-50%, -50%) scale(" + this.canvasScale + ")" });
        } else if (this.currentCursor) {
            this.currentCursor.remove();
            this.currentCursor = null;
        }
        if (this.activeLayer.moveLine(e)) {
            this.updateLayers(true);
        }
    }

    endLine() {
        if (this.activeLayer.endLine()) {
            this.updateLayers();
        }
    }

    addLayer(lines) {
        var layer = new Layer(this.width, this.height, this);
        layer.element.insertBefore(this.addLayerButton);
        if (lines) {
            layer.lines = lines;
            layer.drawLines();
        }
        this.layers.push(layer);
        this.activateLayer(this.layers.length - 1);
    }

    activateLayer(index) {
        this.layers.forEach((l, i) => l.active = index == i);
        this.updateLayers();
    }

    canMoveLayerLeft(i) {
        return i > 0;
    }

    canMoveLayerRight(i) {
        return i + 1 < this.layers.length;
    }

    updateLayers(move) {
        this.layers.forEach((l, i) => {
            l.element.toggleClass("active", l.active).off("click").on("click", (e) => {
                if (e.target.tagName == "CANVAS") this.activateLayer(i);
            });
            l.elementNumber.text(i + 1);
            l.elementDelete.toggle(this.layers.length > 1).off("click").on("click", () => this.deleteLayer(i));
            l.elementLeft.toggle(this.canMoveLayerLeft(i)).off("click").on("click", () => this.moveLayer(i, false));
            l.elementRight.toggle(this.canMoveLayerRight(i)).off("click").on("click", () => this.moveLayer(i, true));;
        });
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.layers.forEach((l) => this.ctx.drawImage(l.canvas, 0, 0));
        if (!move) this.save();
    }

    moveLayer(i, right) {
        if (this.movingLayer || (right && !this.canMoveLayerRight(i)) || (!right && !this.canMoveLayerLeft(i))) return;
        this.movingLayer = true;
        var to = right ? i + 1 : i - 1;
        var fromElement = this.layers[i].element;
        var toElement = this.layers[to].element;
        var placeholders = [];
        var scrollLeft = this.layerElement.scrollLeft();
        var getLeft = (e) => scrollLeft + e.position().left;
        var fromLeft = getLeft(fromElement);
        var toLeft = getLeft(toElement);
        var nadone = 0;
        var adone = () => {
            if (++nadone == 2) {
                placeholders.forEach((p) => p.remove());
                fromElement.css({ position: "relative", left: 0 })[right ? "insertAfter" : "insertBefore"](toElement);
                toElement.css({ position: "relative", left: 0 });
                this.movingLayer = false;
            }
        };
        var addPlaceholder = () => placeholders.push($("<div/>").addClass("canvas-area-layers-layer-switch-placeholder").insertAfter(toElement));
        fromElement.css({ position: "absolute", left: fromLeft, zIndex: 2 }).animate({ left: toLeft }, 400, adone);
        toElement.css({ position: "absolute", left: toLeft, zIndex: 1 }).animate({ left: fromLeft }, 400, adone);
        addPlaceholder();
        addPlaceholder();
        this.layerElement.scrollLeft(scrollLeft);
        if (to >= this.layers.length) {
            var x = to - this.layers.length + 1;
            while (x--) {
                this.layers.push(undefined);
            }
        }
        this.layers.splice(to, 0, this.layers.splice(i, 1)[0]);
        this.updateLayers();
    }

    deleteLayer(index) {
        if (this.movingLayer || this.layers.length <= 1) return;
        this.layers[index].element.remove();
        this.layers.splice(index, 1);
        if (this.layers[index]) this.activateLayer(index);
        else this.activateLayer(index - 1);
        this.updateLayers();
    }
};

const Layer = class {
    constructor(width, height, parent) {
        this.parent = parent;
        this.width = width;
        this.height = height;
        this.canvas = document.createElement("canvas");
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext("2d");
        this.lines = [];

        this.id = uuidv4();

        this.element = $("<div/>").addClass("canvas-area-layers-layer").append(this.canvas);
        this.elementNumber = $("<div/>").addClass("canvas-area-layers-layer-number").appendTo(this.element);
        this.elementDelete = $("<div/>").addClass("canvas-area-layers-layer-delete").appendTo(this.element);
        this.elementLeft = $("<div/>").addClass("canvas-area-layers-layer-move canvas-area-layers-layer-move-left").text("\u003c").appendTo(this.element);
        this.elementRight = $("<div/>").addClass("canvas-area-layers-layer-move canvas-area-layers-layer-move-right").text("\u003e").appendTo(this.element);
    }

    getCoordinateForEvent(e) {
        return this.parent.getCoordinateForEvent(e);
    }

    startLine(e) {
        if (this.down) return;
        this.down = true;
        this.lines.push({
            id: uuidv4(),
            color: this.parent.currentColor,
            thickness: this.parent.currentThickness,
            points: [this.getCoordinateForEvent(e)]
        });
        this.currentLine = this.lines[this.lines.length - 1];
    }

    addPoint(coord) {
        if (!this.currentLine.points.some((p) => p.x == coord.x && p.y == coord.y)) this.currentLine.points.push(coord);
    }

    moveLine(e) {
        if (!this.down) return false;
        var coord = this.getCoordinateForEvent(e);
        this.lastPoint = coord;
        var lastCoord = this.currentLine.points[this.currentLine.points.length - 1];
        if (lastCoord) {
            var diffX = Math.abs(coord.x - lastCoord.x);
            var diffY = Math.abs(coord.y - lastCoord.y);
            var threshold = 3;
            if (diffX > threshold || diffY > threshold) this.addPoint(coord);
        } else this.addPoint(coord);
        this.drawLines();
        return true;
    }

    endLine() {
        if (!this.down) return false;
        this.down = false;
        if (this.lastPoint) {
            this.parent.totalLineHistory.push(Object.assign({ layer: this.id }, this.currentLine));
            console.log(this.parent.totalLineHistory);
            this.addPoint(this.lastPoint);
            this.drawLines();
        }
        return true;
    }

    drawPoint(line, prev, point, start) {
        this.ctx.beginPath();
        this.ctx.lineWidth = line.thickness * (point.pressure + 0.5);
        this.ctx.moveTo(start ? point.x : prev.x, start ? point.y : prev.y);
        this.ctx.lineTo(point.x, point.y);
        this.ctx.stroke();
    }

    drawLine(line) {
        if (!line.points.length) return;
        this.ctx.strokeStyle = line.color;
        //this.ctx.lineWidth = line.thickness;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";

        line.points.forEach((point, index) => this.drawPoint(line, line.points[index - 1], point, !index));

    }

    drawLines() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.lines.forEach((line) => this.drawLine(line));
    }
};