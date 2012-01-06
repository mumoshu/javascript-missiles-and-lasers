// forked from mumoshu's "アニメーションとシーンブラー、レイヤの合成とか" http://jsdo.it/mumoshu/w2He
(function() {
    var ShapeFactory = function() {
    };

    ShapeFactory.prototype.fromPoints = function(points) {
        if (! (points instanceof Array))
            points = Array.prototype.slice.call(arguments);
        assertGreater(points.length, 0);
        return new Shape({points: points});
    };

    var ShapeBuilder = function() {
        this.points = [];
        this.currentX = 0;
        this.currentY = 0;
    };

    ShapeBuilder.prototype.p = function(x, y) {
        this.currentX = x || this.currentX;
        this.currentY = y || this.currentY;
        this.points.push({x: this.currentX, y: this.currentY});
        return this;
    };

    ShapeBuilder.prototype.x = function(x) {
        return this.p(x, null);
    };

    ShapeBuilder.prototype.y = function(y) {
        return this.p(null, y);
    };

    ShapeBuilder.prototype.build = function() {
        return new ShapeFactory().fromPoints(this.points);
    };

    var Shape = function(params) {
        params = params || {};
        this.points  = params.points || null;
    };

    Shape.prototype.getBounds = function() {
        var x = $.map(this.points, function(){ return this.x; });
        var y = $.map(this.points, function(){ return this.y; });
        var maxX = Math.max(x);
        var minX = Math.min(x);
        var maxY = Math.max(y);
        var minY = Math.min(y);
        return {
            topLeft: {
                x: minX,
                y: minY
            },
            bottomRight: {
                x: maxX,
                y: maxY
            },
            top: minY,
            bottom: maxY,
            left: minX,
            right: maxX
        };
    };

    Shape.prototype.draw = function(context, options) {
        drawShape(context, this.points, options);
    };

    var ShapeWithOptions = function(shape, options) {
        this.shape   = shape;
        this.options = options;
    };

    ShapeWithOptions.prototype.draw = function(context) {
        this.shape.draw(context, this.options);
    };

    var Line = function(p1, p2, options) {
        options = options || {};

        this.p1 = p1;
        this.p2 = p2;
        this.fillColor = options.fillColor || 'rgba(150, 150, 150, 0.9)';
        this.width     = options.width || 5;

    };

    Line.prototype.draw = function(context, options) {
        options = options || {};
        var offset = options.offset || {x: 0, y: 0};
        context.save();
        context.globalCompositeOperation = "source-over";
        context.translate(offset.x, offset.y);
        context.beginPath();
        context.fillStyle   = this.fillColor;
        context.strokeStyle = this.fillColor;
        context.lineWidth   = this.width;
        context.moveTo(this.p1.x, this.p1.y);
        context.lineTo(this.p2.x, this.p2.y);
        context.stroke();
        context.fill();
        context.restore();
    };


    /**
     * @param {String} text
     * @param {Number} x
     * @param {Number} y
     */
    var Label = function(text, x, y, options) {
        options = options || {};

        this.text   = text;
        this.x      = x;
        this.y      = y;
        this.margin = options.margin || { x: 0, y: 0 };
    };

    Label.prototype.draw = function(context, options) {
        drawLabel(context, this, options);
    };

    var LabeledShape = function(shape, label) {
        this.shape = shape;
        this.label = label;
    };

    LabeledShape.prototype.draw = function(contextForShape, contextForLabel, options) {
        this.label.y = this.shape.getBounds().bottom;
        this.shape.draw(contextForShape, options);
        this.label.draw(contextForLabel, options);
    };

    LabeledShape.prototype.setText = function(text) {
        this.label.text = text;
        return this;
    };

    function drawShape(context, points, options) {
        options = options || {};

        var start  = points[points.length - 1];
        var offset = options.offset || {x: 0, y: 0};
        var rotate = options.rotate || 0.0;

        context.save();
        context.fillStyle = options.fillColor || 'red';
        context.translate(offset.x, offset.y);
        context.rotate(rotate);
        context.beginPath();
        context.moveTo(start.x, start.y);
        for (var i=0; i<points.length; i++) {
            var p = points[i];
            context.lineTo(p.x, p.y);
        }
        context.fill();
        if (options.drawOrigin) {
            context.fillStyle = 'rgba(0, 0, 0, 0.5)';
            context.fillRect(-2, -2, 4, 4);
        }
        context.restore();
    }

    function drawLabel(context, label, options) {
        options = options || {};

        var offset = options.offset || { x: 0, y: 0 };
        var margin = label.margin;
        var x = label.x + margin.x;
        var y = label.y + margin.y;

        context.save();
        context.fillStyle = 'black';
        context.textAlign = 'center';
        context.translate(offset.x, offset.y);
        context.fillText(label.text, label.x + margin.x, label.y + margin.y);
        context.restore();
    }

    var Pane = function(context) {
        this.context   = context;
        this.drawables = [];
    };

    Pane.prototype.add = function(drawable) {
        this.drawables.push(drawable);
    };

    Pane.prototype.draw = function() {
        var context = this.context;
        $.each(this.drawables, function(i, d) {
            d.draw(context);
        });
    };

    /** @exports ShapeFactory as window.ShapeFactory */
    window.ShapeFactory = ShapeFactory;
    /** @exports ShapeBuilder as window.ShapeBuilder */
    window.ShapeBuilder = ShapeBuilder;
    /** @exports LabeledShape as window.LabeledShape */
    window.LabeledShape = LabeledShape;
    /** @exports Label as window.Label */
    window.Label        = Label;
    /** @exports Pane as window.Pane */
    window.Pane         = Pane;
    /** @exports ShapeWithOptions as window.ShapeWithOptions */
    window.ShapeWithOptions = ShapeWithOptions;
    /** @exports Line as window.Line */
    window.Line = Line;
})();

(function() {
    var Timeline = function() {
        this.objects = [];
    };

    Timeline.prototype.add = function(object) {
        this.objects.push(object);
    };

    Timeline.prototype.progress = function() {
        var objects = this.objects;
        $.each(objects, function(i, object) {
            if (object.progress().isExpired()) {
                objects.splice(i, 1);
            }
        });
    };

    var TimedObject = function(drawable, step) {
        this.drawable = drawable;
        this.step     = step;
    };

    TimedObject.prototype.progress = function() {
        this.options = this.step();
        return this;
    };

    TimedObject.prototype.draw = function(context) {
        this.drawable.draw(context, this.options);
        return this;
    };

    TimedObject.prototype.isExpired = function() {
        return false;
    };

    /** @exports Timeline as window.Timeline */
    window.Timeline    = Timeline;
    /** @exports TimedObject as window.TimedObject */
    window.TimedObject = TimedObject;
})();

function assertGreater(a, b) {
    if (a <= b) {
        window.alert("assertion failed: " + a + " must be greater than " + b);
    }
}

(function() {
    var animation = {};

    function Point2D(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Point2D を x、y方向に移動させた、新しい Point2D を返す。
     *
     * @param {Point2D} point2d
     * @param {object} params 移動量
     * @param {number} params.dx x 方向の移動量(px)
     * @param {number} params.dy y 方向の移動量(px)
     * @return {Point2D} new point after the move.
     */
    animation.moved = function moved(point2d, params) {
        return {
            x: point2d.x + params.dx,
            y: point2d.y + params.dy
        };
    }

    function rotates(position) {
        position = position || {x: 50, y: 100};
        return (function() {
            var options = {
                rotate: 0,
                offset: position,
                label: "rotating",
                drawOrigin: true
            };
            return function() {
                options.rotate += 5 / 180.0 * Math.PI;
                return options;
            };
        })();
    }

    function revolves(center) {
        center = center || {x: 50, y: 200};
        return (function() {
            var steps = 0;
            var options = {
                rotate: 0,
                label: "revolving",
                drawOrigin: true
            };
            var previousOffset = null;
            return function() {
                steps++;
                var angle = steps * 5.0 / 180 * Math.PI;
                var x = Math.cos(angle) * 30;
                var y = Math.sin(angle) * 30;
                options.offset = {x: x + center.x, y: y + center.y};
                if (previousOffset) {
                    var dx = options.offset.x - previousOffset.x;
                    var dy = options.offset.y - previousOffset.y;
                    var direction = Math.atan2(dy, dx);
                    options.rotate = direction + (Math.PI / 2);
                }
                previousOffset = options.offset;
                return options;
            };
        })();
    }

    function follows(timedObject) {
        return function() {
            return timedObject.options;
        };
    }

    function compose(animationA, animationB) {
        return function() {
            var a = animationA();
            var b = animationB();
            return {
                rotate: a.rotate + b.rotate,
                offset: {
                    x: a.offset.x + b.offset.x,
                    y: a.offset.y + b.offset.y
                }
            };
        };
    }

    animation.rotates  = rotates;
    animation.revolves = revolves;
    animation.follows  = follows;
    animation.compose  = compose;
//    animation.moved = moved;

    window.animation   = animation;
})();

var modules = {};

modules.gaming = {};

(function(parentPackage) {
    var LivingThing = function LivingThing(params) {
        this.hitPoint = params.hitPoint;
    };

    LivingThing.prototype.isDead = function isDead() {
        return this.hitPoint <= 0;
    };

    /**
     * 他の LivingThing と衝突後の LivingThing を返す。
     * @param other LivingThing
     */
    LivingThing.prototype.collided = function collided(other) {
        return new LivingThing({hitPoint: this.hitPoint - other.hitPoint});
    };

    parentPackage.LivingThing = LivingThing;
})(modules.gaming);

(function(parentPackage) {
    /**
     * @param {object} params GameObject の作成オプション
     * @param {Shape} params.shape 形状
     * @param {Transform} params.transform アニメーション
     */
    var GameObject = modules.gaming.GameObject = function(params) {
        this.position = params.position;
    };

    GameObject.prototype.progressed = function() {
        return new GameObject({
            shape: this.shape,
            transform: this.transform,
            time: this.time + 1
        });
    };

    GameObject.prototype.getTransformedShape = function() {
        return this.transform.apply(this.shape);
    };

    function Animation() {

    }

    Animation.prototype.getTransformAt = function(time) {
        throw new Error("Not Implemented!");
    }
})(modules.gaming);

(function(parentPackage) {
    /**
     * @param params Missile のプロパティ
     * @param {LivingThing} params.livingThing living thing
     * @param {GameObject} params.timedObject timed object
     */
    modules.gaming.Missile = function Missile(params) {
        this.timedObject = params.timedObject;
        this.livingThing = params.livingThing;
    };

    Missile.prototype.getX = function() {
        return this.timedObject.getX();
    };

    Missile.prototype.getY = function() {
        return this.timedObject.getY();
    }
})(modules.gaming);

// tests
(function() {
    function assertEquals(message, expected, actual, showError) {
        if (typeof showError != "function") {
            showError = alert;
        }
        if (actual != expected) {
            showError(message + " : expected [" + expected + "], but was [" + actual + "].");
        }
    }

    // tests for LivingThing
    (function() {
        var LivingThing = modules.gaming.LivingThing;

        var bob = new LivingThing({hitPoint: 10});
        var tom = new LivingThing({hitPoint: 20});

        var tomCollided = tom.collided(bob);
        var bobCollided = bob.collided(tom);

        assertEquals("bob's hitPoint should be 10.", 10, bob.hitPoint);
        assertEquals("bob should not be dead before the collision.", false, bob.isDead());
        assertEquals("tom should not be dead before the collision.", false, tom.isDead());
        assertEquals("bob should be dead after the collision with tom.", true, bobCollided.isDead());
        assertEquals("tom should not be dead after the collision with bob.", false, tomCollided.isDead());
    })();

    // tests for Missile
    (function() {
        var LivingThing = modules.gaming.LivingThing;
        var Missile = modules.gaming.Missile;

        var shape = new ShapeBuilder().p(0, 0)
            .p(10, 0)
            .p(10, 10)
            .x(0)
            .y(0)
            .build();
        var timedObject = new TimedObject(shape, function (point2d) {
            return animation.moved(point2d, {dx: 5, dy: y});
        });
        var livingThing = new LivingThing({hitPoint: 10});

        var missile = new Missile({timedObject: timedObject, livingThing: livingThing});

        assertEquals("missile should be at x = 0.", 0, missile.getX());
        assertEquals("missile should be at y = 0.", 0, missile.getY());

        var missileProgressed = missile.progressed();

        assertEquals("missile should be at x = 5 after the move.", 5, missileProgressed.getX());
        assertEquals("missile should be at y = 5 after the move.", 5, missileProgressed.getY());
    })();

})();

(function() {
    var rotates  = animation.rotates;
    var revolves = animation.revolves;
    var follows  = animation.follows;
    var compose  = animation.compose;

    var LABEL_OPTIONS = {
        margin: { x: 0, y: 20 }
    };

    var shape     = new ShapeBuilder().p(0, -10)
            .p(-10, 10)
            .x(10)
            .build();
    var world         = document.getElementById('world');
    var worldContext  = world.getContext('2d');
    var layer1        = document.getElementById('layer1');
    var layer1Context = layer1.getContext('2d');
    var layer2        = document.getElementById('layer2');
    var layer2Context = layer2.getContext('2d');
    /** 煙描画用のバッファ */
    var smokeCanvas  = document.getElementById('smoke_canvas');
    var smokeContext = smokeCanvas.getContext('2d');
    var smokePane    = new Pane(smokeContext);
    /** バックバッファ */
    var backBufferCanvas = document.getElementById('back_buffer');
    var backBufferContext = backBufferCanvas.getContext('2d');

    var timeline        = new Timeline();
    var shapesPane      = new Pane(layer1Context);
    var labelsPane      = new Pane(layer2Context);
    var rotatingObject  = new TimedObject(shape, rotates({x:30, y:60}));
    var revolvingObject = new TimedObject(shape, compose(revolves({x:60, y:130}), rotates({x:0,y:0})));
    var testObject      = new TimedObject(shape, compose(rotates({x:60,y:60}), rotates({x:0,y:0})));
    var rotatingLabel   = new TimedObject(new Label("rotating", 0, 0, LABEL_OPTIONS), follows(rotatingObject));
    var revolvingLabel  = new TimedObject(new Label("revolving", 0, 0, LABEL_OPTIONS), follows(revolvingObject));
    timeline.add(rotatingObject);
    timeline.add(rotatingLabel);
    timeline.add(revolvingObject);
    timeline.add(revolvingLabel);
    timeline.add(testObject);
    shapesPane.add(rotatingObject);
    labelsPane.add(rotatingLabel);
    shapesPane.add(revolvingObject);
    labelsPane.add(revolvingLabel);
    shapesPane.add(testObject);

    var smoke = new Line({x:0,y:0}, {x:50,y:50});
    smokePane.add(smoke);

    for (var i=0; i<11; i++) {
        var rotate = 30 * i / 180.0 * Math.PI;
        var text   = "r=" + rotate.toString().match(/^\d+\.?\d?\d?/)[0];
        var object = new ShapeWithOptions(shape, {
            offset: {x: 30 * (i+1), y: 20},
            rotate: rotate,
            drawOrigin: true
        });
        var label  = new TimedObject(new Label(text, 0, 0, LABEL_OPTIONS), follows(object));
        shapesPane.add(object);
        labelsPane.add(label);
        timeline.add(label);
    }

    setInterval(function() {
        // キャンバスをクリア
        // layer1: 図形を描画するレイヤーはシーンブラーをかける
        //layer1Context.globalCompositeOperation = "source-over";
        layer1Context.fillStyle = "rgba(255, 255, 255, 0.2)";
        layer1Context.fillRect(0, 0, 400, 300);
        // layer2: 文字を描画するレイヤーにはシーンブラーをかけない
        layer2Context.clearRect(0, 0, 400, 300);
        backBufferContext.clearRect(0, 0, 400, 300);
        backBufferContext.drawImage(smokeCanvas, 0, 0);
        smokeContext.globalAlpha = 0.9;
        smokeContext.clearRect(0, 0, 400, 300);
        smokeContext.drawImage(backBufferCanvas, 0, 0);
        // 再描画
        //rotating.draw(layer1Context, layer2Context, rotate());
        timeline.progress();
        shapesPane.draw();
        labelsPane.draw();
        smoke.p1 = smoke.p2;
        smoke.p2 = revolvingObject.options.offset;
        smokePane.draw();
        // レイヤ合成
        worldContext.clearRect(0, 0, 400, 300);
        worldContext.drawImage(layer1, 0, 0);
        worldContext.drawImage(layer2, 0, 0);
        worldContext.drawImage(smokeCanvas, 0, 0);
    }, 33);
})();
