const blinkRateMin = 100,
blinkRateMax = 15000,
speakElem = $("#speech-bubble > p");

var speakTimer;
const sayText = textData => {
    clearTimeout(speakTimer);
    speakElem.html("");

    var textIndex = 0,
    oldHTML = "",
    oldText = "";

    var applyStyles = (data, text) => {
        if (data.italic) text = "<i>" + text + "</i>";
        if (data.small) text = "<small>" + text + "</small>";
        if (data.newline) text = "<br>" + text;

        return text;
    }

    var runData = () => {
        var data = textData[textIndex];
        chars = data.text.split("");

        textIndex++;

        if (data.wait) {
            speakTimer = setTimeout(() => {
                applyStyles(data, true);
                runChars(data, chars);
            }, data.wait);
        } else {
            applyStyles(data, true);
            runChars(data, chars);
        }
    }

    var runChars = (data, chars) => {

        var typeChar = () => {
            oldText += chars[0];
            speakElem.html(oldHTML + applyStyles(data, oldText));
            chars.shift();

            if (chars.length > 0) {
                runChars(data, chars);
            } else if (textIndex < textData.length) {
                oldHTML = speakElem.html();
                oldText = "";
                runData();
            }
        }

        if (data.delay == null || data.delay >= 0) {
            speakTimer = setTimeout(typeChar, data.delay || 50);
        } else {
            typeChar();
        }
    }

    runData();
}

const dialogue = [
    [
        {
            text: "Heyo. ",
            italic: true,
            delay: 25
        },
        {
            text: "I'm Bonyoze.",
            wait: 1000
        },
        {
            text: "Click on me for more info! ",
            small: true,
            newline: true,
            wait: 1000
        },
        {
            text: ":] ",
            small: true,
            delay: -1,
            wait: 1500
        }
    ],
    [
        {
            text: "I enjoy programming, ",
        },
        {
            text: "graphic design/art ",
            wait: 750
        },
        {
            text: " and other cool stuff!",
            wait: 750
        }
    ],
    [
        {
            text: "Check out my socials! "
        }
    ],
    [
        {
            text: "I have my own Discord server!"
        },
        {
            text: "Check it out ",
            small: true,
            newline: true,
            wait: 750
        },
        {
            text: "(if you're cool)",
            small: true,
            wait: 500
        }
    ],
    [
        {
            text: "That's all I have to say about me."
        },
        {
            text: "Hope you enjoyed my site :]",
            newline: true,
            wait: 500
        }
    ]
];

sayText(dialogue[0]);

const screenBlink = (mesh, defaultMat, blinkMat, callback) => {
    mesh.material = blinkMat;
    setTimeout(() => {
        mesh.material = defaultMat;
        if (callback)
            callback();
    }, 250);
}

var mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;

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
        base.edgesWidth = 15;
        base.edgesColor = new BABYLON.Color4(0, 0, 0, 1);

        base.rotation.y = 180 * Math.PI / 180;

        var oldTarget = new BABYLON.Vector3.Zero();

        engine.runRenderLoop(() => {
            var rect = canvas.getBoundingClientRect(),
            target = new BABYLON.Vector3.Lerp(
                oldTarget,
                new BABYLON.Vector3(
                    -mouseX + (engine.getRenderWidth() / window.innerWidth) + engine.getRenderWidth() / 2 + rect.left,
                    -mouseY + (engine.getRenderHeight() / window.innerHeight) + engine.getRenderHeight() / 2 + rect.top,
                    -1000),
                0.1
            );
            oldTarget = target;
            base.lookAt(target); // make head follow pointer

            var speechPos = BABYLON.Vector3.Project(
                screen.getBoundingInfo().boundingSphere.centerWorld,
                BABYLON.Matrix.Identity(),
                scene.getTransformMatrix(),
                camera.viewport.toGlobal(
                engine.getRenderWidth(),
                engine.getRenderHeight(),
            ));

            $("#speech-bubble") // position speech bubble
                .css("left", speechPos.x + window.innerWidth / 2 - engine.getRenderWidth() / 2)
                .css("bottom", window.innerHeight - speechPos.y - window.innerHeight * 0.025);
            
            scene.render();
        });

        var dialogueIndex = 0;

        // click on head
        scene.onPointerObservable.add(pointerInfo => {
            if (pointerInfo.type == BABYLON.PointerEventTypes.POINTERDOWN) {
                var pickedMesh = pointerInfo.pickInfo.pickedMesh;
                if (screen.material != screenBlinkMat && (pickedMesh == base || pickedMesh == screen)) {
                    screen.material = screenBlinkMat;
                    screenBlink(screen, screenMat, screenBlinkMat);
                    
                    if (dialogueIndex < dialogue.length - 1) { // say dialogue
                        dialogueIndex++;
                        sayText(dialogue[dialogueIndex]);
                    }
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