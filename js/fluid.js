(function (w) {
    var canvas;
    var ctx;

    var mouse = {
        x: 0,
        y: 0,
        px: 0,
        py: 0,
        down: false
    };

    var canvasWidth = 500;
    var canvasHeight = 500;
    var resolution = 10;
    var penSize = 40;

    var numCols = (canvasWidth / resolution);
    var numRows = (canvasHeight / resolution);
    var speckCount = 7000;

    var vecCells = [];
    var particles = [];

    function init() {
        canvas = document.getElementById('canvas');
        ctx = canvas.getContext('2d');

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        for (i = 0; i < speckCount; i++) {
            particles.push(new particle(Math.random() * canvasWidth, Math.random() * canvasHeight));
        }

        for (col = 0; col < numCols; col++) {
            vecCells[col] = [];

            for (row = 0; row < numRows; row++) {
                vecCells[col][row] = new cell(col * resolution, row * resolution, resolution);
                vecCells[col][row].col = col;
                vecCells[col][row].row = row;
            }
        }

        for (col = 0; col < numCols; col++) {
            for (row = 0; row < numRows; row++) {
                var cellData = vecCells[col][row];

                var row_up = (row - 1 >= 0) ? row - 1 : numRows - 1;
                var col_left = (col - 1 >= 0) ? col - 1 : numCols - 1;
                var col_right = (col + 1 < numCols) ? col + 1 : 0;

                var up = vecCells[col][row_up];
                var left = vecCells[col_left][row];
                var upLeft = vecCells[col_left][row_up];
                var upRight = vecCells[col_right][row_up];

                cellData.up = up;
                cellData.left = left;
                cellData.upLeft = upLeft;
                cellData.upRight = upRight;

                up.down = vecCells[col][row];
                left.right = vecCells[col][row];
                upLeft.downRight = vecCells[col][row];
                upRight.downLeft = vecCells[col][row];
            }
        }

        w.addEventListener("mousedown", mouseDownHandler);
        w.addEventListener("touchstart", mouseDownHandler);

        w.addEventListener("mouseup", mouseUpHandler);
        w.addEventListener("touchend", touchEndHandler);

        canvas.addEventListener("mousemove", mouseMoveHandler);
        canvas.addEventListener("touchmove", touchMoveHandler);

        w.onload = draw;
    }

    function updateParticle() {
        for (i = 0; i < particles.length; i++) {
            var p = particles[i];

            if (p.x >= 0 && p.x < canvasWidth && p.y >= 0 && p.y < canvasHeight) {
                var col = parseInt(p.x / resolution);
                var row = parseInt(p.y / resolution);

                var cellData = vecCells[col][row];

                var ax = (p.x % resolution) / resolution;
                var ay = (p.y % resolution) / resolution;

                p.xv += (1 - ax) * cellData.xv * 0.05;
                p.yv += (1 - ay) * cellData.yv * 0.05;

                p.xv += ax * cellData.right.xv * 0.05;
                p.yv += ax * cellData.right.yv * 0.05;

                p.xv += ay * cellData.down.xv * 0.05;
                p.yv += ay * cellData.down.yv * 0.05;

                p.x += p.xv;
                p.y += p.yv;

                var dx = p.px - p.x;
                var dy = p.py - p.y;

                var dist = Math.sqrt(dx * dx + dy * dy);

                var limit = Math.random() * 0.5;

                if (dist > limit) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.px, p.py);
                    ctx.stroke();
                }
                else {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x + limit, p.y + limit);
                    ctx.stroke();
                }

                p.px = p.x;
                p.py = p.y;
            }
            else {
                p.x = p.px = Math.random() * canvasWidth;
                p.y = p.py = Math.random() * canvasHeight;

                p.xv = 0;
                p.yv = 0;
            }

            p.xv *= 0.5;
            p.yv *= 0.5;
        }
    }

    function draw() {
        var mouseXVel = mouse.x - mouse.px;
        var mouseYVel = mouse.y - mouse.py;

        for (i = 0; i < vecCells.length; i++) {
            var cellDatas = vecCells[i];

            for (j = 0; j < cellDatas.length; j++) {
                var cellData = cellDatas[j];

                if (mouse.down) {
                    changeCellVelocity(cellData, mouseXVel, mouseYVel, penSize);
                }

                updatePressure(cellData);
            }
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "#8279BA";

        updateParticle();

        for (i = 0; i < vecCells.length; i++) {
            var cellDatas = vecCells[i];

            for (j = 0; j < cellDatas.length; j++) {
                var cellData = cellDatas[j];
                updateVelocity(cellData);
            }
        }

        mouse.px = mouse.x;
        mouse.py = mouse.y;

        requestAnimationFrame(draw);
    }

    function changeCellVelocity(cellData, mvelX, mvelY, penSize) {
        var dx = cellData.x - mouse.x;
        var dy = cellData.y - mouse.y;

        var dist = Math.sqrt(dy * dy + dx * dx);

        if (dist < penSize) {
            if (dist < 4) {
                dist = penSize;
            }

            var power = (penSize / dist);

            cellData.xv += mvelX * power;
            cellData.yv += mvelY * power;
        }
    }

    function updatePressure(cellData) {
        var pressureX = (
            cellData.upLeft.xv * 0.5
            + cellData.left.xv
            + cellData.downLeft.xv * 0.5
            - cellData.upRight.xv * 0.5
            - cellData.right.xv
            - cellData.downRight.xv * 0.5
        );

        var pressureY = (
            cellData.upLeft.yv * 0.5
            + cellData.up.yv
            + cellData.upRight.yv * 0.5
            - cellData.downLeft.yv * 0.5
            - cellData.down.yv
            - cellData.downRight.yv * 0.5
        );

        cellData.pressure = (pressureX + pressureY) * 0.25;
    }

    function updateVelocity(cellData) {
        cellData.xv += (
            cellData.upLeft.pressure * 0.5
            + cellData.left.pressure
            + cellData.downLeft.pressure * 0.5
            - cellData.upRight.pressure * 0.5
            - cellData.right.pressure
            - cellData.downRight.pressure * 0.5
        ) * 0.25;

        cellData.yv += (
            cellData.upLeft.pressure * 0.5
            + cellData.up.pressure
            + cellData.upRight.pressure * 0.5
            - cellData.downLeft.pressure * 0.5
            - cellData.down.pressure
            - cellData.downRight.pressure * 0.5
        ) * 0.25;

        cellData.xv *= 0.99;
        cellData.yv *= 0.99;
    }

    function cell(x, y, res) {
        this.x = x;
        this.y = y;

        this.r = res;

        this.col = 0;
        this.row = 0;

        this.xv = 0;
        this.yv = 0;

        this.pressure = 0;
    }

    function particle(x, y) {
        this.x = this.px = x;
        this.y = this.py = y;
        this.xv = this.yv = 0;
    }

    function mouseDownHandler(e) {
        e.preventDefault();
        mouse.down = true;
    }

    function mouseUpHandler() {
        mouse.down = false;
    }

    function touchEndHandler(e) {
        if (!e.touches) {
            mouse.down = false;
        }
    }

    function mouseMoveHandler(e) {
        mouse.px = mouse.x;
        mouse.py = mouse.y;

        mouse.x = e.offsetX || e.layerX;
        mouse.y = e.offsetY || e.layerY;
    }

    function touchMoveHandler(e) {
        mouse.px = mouse.x;
        mouse.py = mouse.y;

        var rect = canvas.getBoundingClientRect();

        mouse.x = e.touches[0].pageX - rect.left;
        mouse.y = e.touches[0].pageY - rect.top;
    }

    w.Fluid = {
        initialize: init
    }
}(window));

window.requestAnimationFrame = (
    window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame
);

document.addEventListener("DOMContentLoaded", function (event) {
    Fluid.initialize();
});