let options = {
    gameDelay: 100,
    minGameDelay: 30,
    width: 1024,
    height: 768,
    cell: {
        width: 8,
        height: 8,
    },
    camera: {
        x: 0,
        y: 0,
    },
};

let rows = 1000;
let cols = 1000;
let playing = false;
let grid = new Array(rows);
let nextGrid = new Array(rows);
let timer;
let canvas;
let linen;

const ctrlsState = {
    mode: "draw",
    leftButtonDown: false,
    x: 0,
    y: 0,
};

function throttle(fn, ms) {
    let isThrottled = false,
        savedArgs,
        savedThis;
    function wrapper() {
        if (isThrottled) {
            savedArgs = arguments;
            savedThis = this;
            return;
        }
        fn.apply(this, arguments);
        isThrottled = true;
        setTimeout(function () {
            isThrottled = false;
            if (savedArgs) {
                wrapper.apply(savedThis, savedArgs);
                savedArgs = savedThis = null;
            }
        }, ms);
    }
    return wrapper;
}

function initGrids() {
    for (var i = 0; i < rows; i++) {
        grid[i] = new Array(cols);
        nextGrid[i] = new Array(cols);
    }
}

function resetGrids() {
    for (var i = 0; i < rows; i++) {
        for (var j = 0; j < cols; j++) {
            grid[i][j] = 0;
            nextGrid[i][j] = 0;
        }
    }
}

function mergeGrids() {
    for (var i = 0; i < rows; i++) {
        for (var j = 0; j < cols; j++) {
            grid[i][j] = nextGrid[i][j];
            nextGrid[i][j] = 0;
        }
    }
}

const getMousePos = (event) => {
    const pos = event.currentTarget.getBoundingClientRect();
    return {
        x: event.clientX - pos.left,
        y: event.clientY - pos.top,
    };
};

function createCanvas() {
    canvas = document.createElement("canvas");
    canvas.id = "canvas";
    canvas.width = options.width;
    canvas.height = options.height;
    canvas.addEventListener("mousemove", (event) => {
        const point = getMousePos(event);
        if (ctrlsState.leftButtonDown) {
            if (ctrlsState.mode == "move") {
                options.camera.x = options.camera.x + point.x - ctrlsState.x;
                options.camera.y = options.camera.y + point.y - ctrlsState.y;
            } else if (ctrlsState.mode == "draw") {
                const i = torCoords(
                    Math.ceil(point.x / options.cell.width) -
                        Math.ceil(options.camera.x / options.cell.width) -
                        1,
                    rows
                );
                const j = torCoords(
                    Math.ceil(point.y / options.cell.height) -
                        Math.ceil(options.camera.y / options.cell.height) -
                        1,
                    cols
                );
                grid[j][i] = 1;
            }
        }
        ctrlsState.x = point.x;
        ctrlsState.y = point.y;
        redrawThrottle();
    });
    canvas.addEventListener("mousedown", (event) => {
        const point = getMousePos(event);
        ctrlsState.leftButtonDown = true;
        ctrlsState.x = point.x;
        ctrlsState.y = point.y;
        redrawThrottle();
    });
    canvas.addEventListener("click", (event) => {
        const point = getMousePos(event);
        if (ctrlsState.mode == "draw") {
            const i = torCoords(
                Math.ceil(point.x / options.cell.width) -
                    Math.ceil(options.camera.x / options.cell.width) -
                    1,
                rows
            );
            const j = torCoords(
                Math.ceil(point.y / options.cell.height) -
                    Math.ceil(options.camera.y / options.cell.height) -
                    1,
                cols
            );
            grid[j][i] = 1 - grid[j][i];
        }
        redrawThrottle();
    });
    canvas.addEventListener("mouseup", (event) => {
        const point = getMousePos(event);
        ctrlsState.leftButtonDown = false;
        ctrlsState.x = point.x;
        ctrlsState.y = point.y;
        redrawThrottle();
    });
    linen = new OffscreenCanvas(options.width, options.height);
    const body = document.getElementsByTagName("body")[0];
    body.addEventListener("mouseup", () => {
        ctrlsState.leftButtonDown = false;
    });
    const container = document.getElementById("canvas_container");
    container.appendChild(canvas);
}

function clearCanvas(canvas) {
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function torCoords(val, size) {
    if (val < -size) val = val % size;
    if (val < 0) val = size + val;
    else if (val >= size) val = val % size;
    return val;
}

function redraw() {
    clearCanvas(linen);
    let ctx = linen.getContext("2d");
    let camera = options.camera;
    rowsCount = Math.ceil(options.width / options.cell.width);
    colsCount = Math.ceil(options.height / options.cell.height);
    offsetX = Math.floor(-camera.x / options.cell.width);
    offsetY = Math.floor(-camera.y / options.cell.height);
    ctx.strokeStyle = "#CCC";
    ctx.width = 1;
    for (var i = -1; i <= rowsCount; i++) {
        ctx.moveTo(i * options.cell.width, 0);
        ctx.lineTo(i * options.cell.width, options.height);
    }
    for (var j = -1; j <= colsCount; j++) {
        ctx.moveTo(0, j * options.cell.height);
        ctx.lineTo(options.width, j * options.cell.height);
    }
    ctx.stroke();
    ctx.fillStyle = "#555";
    for (var i = -1; i <= rowsCount; i++) {
        icam = torCoords(i + offsetX, rows);
        for (var j = -1; j <= colsCount; j++) {
            jcam = torCoords(j + offsetY, cols);
            if (grid[jcam][icam] == 1) {
                ctx.fillRect(
                    i * options.cell.width,
                    j * options.cell.height,
                    options.cell.width - 1,
                    options.cell.height - 1
                );
            }
        }
    }
    canvas.getContext("2d").drawImage(linen, 0, 0);
}

const redrawThrottle = throttle(redraw, 30);

function setupControlButtons() {
    const modeButton = document.getElementById("mode");
    modeButton.onclick = modeButtonClick;
    const resizeButton = document.getElementById("resize");
    resizeButton.onclick = resizeButtonClick;
    const startButton = document.getElementById("start");
    startButton.onclick = startButtonClick;
    const clearButton = document.getElementById("clear");
    clearButton.onclick = clearButtonClick;
    const randomButton = document.getElementById("random");
    randomButton.onclick = randomButtonClick;
}

function modeButtonClick() {
    if (ctrlsState.mode == "draw") {
        ctrlsState.mode = "move";
        document.getElementById("mode").innerHTML = "Mode: Moving";
    } else if (ctrlsState.mode == "move") {
        ctrlsState.mode = "draw";
        document.getElementById("mode").innerHTML = "Mode: Drawing";
    }
}

function resizeButtonClick() {
    if (playing) return;
    rows = document.getElementById("rows_inp").valueAsNumber;
    cols = document.getElementById("cols_inp").valueAsNumber;
    initGrids();
    resetGrids();
    redrawThrottle();
}

function randomButtonClick() {
    if (playing) return;
    clearButtonClick();
    for (var i = 0; i < rows; i++) {
        for (var j = 0; j < cols; j++) {
            var isLive = Math.round(Math.random());
            if (isLive == 1) {
                grid[i][j] = 1;
            }
        }
    }
    redrawThrottle();
}

function clearButtonClick() {
    if (playing) return;
    resetGrids();
    redrawThrottle();
}

function startButtonClick() {
    if (playing) {
        playing = false;
        ["rows_inp", "cols_inp", "resize", "clear", "random"].forEach((el) =>
            document.getElementById(el).removeAttribute("disabled")
        );
        this.innerHTML = "Start";
        clearTimeout(timer);
    } else {
        playing = true;
        ["rows_inp", "cols_inp", "resize", "clear", "random"].forEach((el) =>
            document.getElementById(el).setAttribute("disabled", "true")
        );
        this.innerHTML = "Stop";
        play();
    }
}

function play() {
    const startTime = performance.now();
    gameRound();
    redrawThrottle();
    const calcTime = performance.now() - startTime;
    if (playing) {
        timer = setTimeout(
            play,
            Math.max(
                options.minGameDelay,
                Math.round(options.gameDelay - calcTime)
            )
        );
    }
}

function gameRound() {
    for (var i = 0; i < rows; i++) {
        for (var j = 0; j < cols; j++) {
            processCell(i, j);
        }
    }
    mergeGrids();
}

function processCell(row, col) {
    var numNeighbors = countNears(row, col);
    if (grid[row][col] == 1) {
        if (numNeighbors < 2) {
            nextGrid[row][col] = 0;
        } else if (numNeighbors == 2 || numNeighbors == 3) {
            nextGrid[row][col] = 1;
        } else if (numNeighbors > 3) {
            nextGrid[row][col] = 0;
        }
    } else if (grid[row][col] == 0) {
        if (numNeighbors == 3) {
            nextGrid[row][col] = 1;
        }
    }
}

function countNears(row, col) {
    var count = 0;
    if (grid[torCoords(row - 1, rows)][col] == 1) count++;
    if (grid[torCoords(row - 1, rows)][torCoords(col - 1, cols)] == 1) count++;
    if (grid[torCoords(row - 1, rows)][torCoords(col + 1, cols)] == 1) count++;
    if (grid[row][torCoords(col - 1, cols)] == 1) count++;
    if (grid[row][torCoords(col + 1, cols)] == 1) count++;
    if (grid[torCoords(row + 1, rows)][col] == 1) count++;
    if (grid[torCoords(row + 1, rows)][torCoords(col - 1, cols)] == 1) count++;
    if (grid[torCoords(row + 1, rows)][torCoords(col + 1, cols)] == 1) count++;
    return count;
}

// Init point
function init() {
    initGrids();
    resetGrids();
    createCanvas();
    setupControlButtons();
    redraw();
}

window.onload = init;
