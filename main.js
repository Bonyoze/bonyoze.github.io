const blinkRateMin = 100,
blinkRateMax = 15000;

const showText = (text, elem) => {
    var chars = text.split("");

    elem.text("");

    for (var i = 0; i < chars.length; i++) {
        setTimeout(() => {
            elem.text(elem.text() + chars[0]);
            chars.shift();
        }, 100 * (i + 1));
    }
}

//showText("hello", $("#speech-bubble > p"));

const screenBlink = (mesh, defaultMat, blinkMat, callback) => {
    mesh.material = blinkMat;
    setTimeout(() => {
        mesh.material = defaultMat;
        if (callback)
            callback();
    }, 250);
}

var mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 4;

const init = async () => {
    var canvas = document.getElementById("canvas"),
    engine = new BABYLON.Engine(canvas, true);

    // setup scene
    var scene = new BABYLON.Scene(engine);
    scene.useRightHandedSystem = true;
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

    // setup camera
    var camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 0, -45), scene);
    camera.maxZ = 60;

    // setup materials
    var baseMat = new BABYLON.StandardMaterial("base", scene);
    baseMat.diffuseTexture = new BABYLON.Texture("./assets/monitor_base.png", scene);
    baseMat.emissiveColor = new BABYLON.Color3(1, 1, 1);

    var screenMat = new BABYLON.StandardMaterial("screen", scene);
    screenMat.diffuseTexture = new BABYLON.Texture("./assets/monitor_screen.png", scene);
    screenMat.emissiveColor = new BABYLON.Color3(1, 1, 1);

    var screenBlinkMat = new BABYLON.StandardMaterial("screenBlink", scene);
    screenBlinkMat.diffuseTexture = new BABYLON.Texture("./assets/monitor_screen_blink.png", scene);
    screenBlinkMat.emissiveColor = new BABYLON.Color3(1, 1, 1);

    // load/setup mesh
    BABYLON.SceneLoader.ImportMesh(null, "assets/", "monitor.obj", scene, meshes => {
        var base = meshes[0],
        screen = meshes[1];

        base.addChild(screen);

        base.material = baseMat;
        screen.material = screenMat;

        base.enableEdgesRendering(0.5);
        base.edgesWidth = 30;
        base.edgesColor = new BABYLON.Color4(0, 0, 0, 1);

        base.rotation.y = 180 * Math.PI / 180;

        var oldTarget = new BABYLON.Vector3.Zero();

        engine.runRenderLoop(() => {
            var target = new BABYLON.Vector3.Lerp(
                oldTarget,
                new BABYLON.Vector3(
                    -mouseX + (engine.getRenderWidth() / window.innerWidth) + engine.getRenderWidth() / 2,
                    -mouseY + (engine.getRenderHeight() / window.innerHeight) + engine.getRenderHeight() / 2,
                    -1200),
                0.1
            );

            oldTarget = target;
            
            base.lookAt(target); // make head follow pointer
            
            var pickedMesh = scene.pick(mouseX, mouseY).pickedMesh;
            canvas.style.cursor = (pickedMesh == base || pickedMesh == screen) ? "pointer" : "default"; // cursor style fix

            base.position.y = Math.sin(new Date().getTime() / 1200) * 1.5; // some movement

            scene.render();
        });

        // click on head
        scene.onPointerObservable.add(pointerInfo => {
            if (pointerInfo.type == BABYLON.PointerEventTypes.POINTERDOWN) {
                var pickedMesh = pointerInfo.pickInfo.pickedMesh;
                if (screen.material != screenBlinkMat && (pickedMesh == base || pickedMesh == screen)) {
                    screen.material = screenBlinkMat;
                    screenBlink(screen, screenMat, screenBlinkMat);
                }
            }
        });

        // random blinking
        var blinkLoop = () => {
            setTimeout(() => {
                screenBlink(screen, screenMat, screenBlinkMat, blinkLoop);
            }, Math.floor(Math.random() * (blinkRateMax - blinkRateMin + 1) + blinkRateMin));
        }

        blinkLoop();
	});

    window.onresize = () => {
        engine.resize();
    };
};

window.onmousemove = event => {
    mouseX = event.clientX;
    mouseY = event.clientY;
}

window.addEventListener("DOMContentLoaded", init);