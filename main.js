const init = async () => {
    const canvas = document.getElementById("canvas"),
    engine = new BABYLON.Engine(canvas, true);

    // setup scene
    var scene = new BABYLON.Scene(engine);
    var camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 50, -100), scene);
    camera.fov = 1.5;
    camera.minZ = 0.1;
    camera.maxCameraSpeed = 1;
    camera.attachControl(canvas, true);
    var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;
    
    // enable physics
    scene.enablePhysics(new BABYLON.Vector3(0, -20, 0), new BABYLON.CannonJSPlugin());

    // create skybox
    var skybox = BABYLON.MeshBuilder.CreateBox("skybox", { size: 10000 }, scene);
    skybox.material = new BABYLON.StandardMaterial("skyboxMaterial", scene);
    skybox.material.backFaceCulling = false;
    skybox.material.reflectionTexture = new BABYLON.CubeTexture("assets/skybox", scene);
    skybox.material.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    skybox.material.diffuseColor = new BABYLON.Color3();
    skybox.material.specularColor = new BABYLON.Color3();

    // create ground collider
    var ground = BABYLON.MeshBuilder.CreateGround("ground1", { width: 200, height: 200 }, scene);
    ground.material = new BABYLON.GridMaterial("groundMaterial", scene);
    ground.material.mainColor = new BABYLON.Color3(1, 1, 1);
    ground.material.lineColor = new BABYLON.Color3();
    ground.physicsImpostor = new BABYLON.PhysicsImpostor(ground, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, friction: 0.01, restitution: 0 }, scene);

    // create player
    var player = BABYLON.MeshBuilder.CreateCylinder("player", { height: 2, diameter: 1, tesselation: 48 });
    player.position = new BABYLON.Vector3(0, 1, 0);
    player.physicsImpostor = new BABYLON.PhysicsImpostor(player, BABYLON.PhysicsImpostor.CylinderImpostor, { mass: 12, friction: 0, restitution: 0 }, scene);

    skybox.parent = player;
    skybox.position = player.position
    camera.parent = player;
    camera.position = new BABYLON.Vector3(0, 0.75, 0);

    // test physics objects
    for (let i = 0; i < 10; i++) {
        var cube = BABYLON.MeshBuilder.CreateBox("cube", { size: 10 - i });
        cube.material = new BABYLON.GridMaterial("cubeMaterial", scene);
        cube.material.mainColor = new BABYLON.Color3.Random();
        cube.material.lineColor = new BABYLON.Color3();
        cube.position.z += 30;
        cube.position.y += (5 + i * 10);
        cube.physicsImpostor = new BABYLON.PhysicsImpostor(cube, BABYLON.PhysicsImpostor.BoxImpostor, { mass: (10 - i) * 4, friction: 0.85, restitution: 0 }, scene);
    }

    // some vars
    var keysActive = false,
    forward = false,
    left = false,
    back = false,
    right = false,
    jump = false;

    // handle key inputs
    const keyCallback = (mode, key) => {
        switch (key) {
            case "w":
                forward = mode;
                break;
            case "a":
                left = mode;
                break;
            case "s":
                back = mode;
                break;
            case "d":
                right = mode;
                break;
            case " ":
                jump = mode;
                break;
            case "r":
                if (!mode) {
                    player.position = new BABYLON.Vector3(0, 1, 0);
                    camera.rotation = new BABYLON.Vector3();
                }
                break;
        }
        keysActive = mode;
    };

    canvas.addEventListener("keydown", event => { keyCallback(true, event.key) }, false);
    canvas.addEventListener("keyup", event => { keyCallback(false, event.key) }, false);

    // handle pointer lock
    const lockCallback = () => {
        scene.physicsEnabled = document.pointerLockElement === canvas;
    }

    document.addEventListener("pointerlockchange", lockCallback, false);
    document.addEventListener("mozpointerlockchange", lockCallback, false);
    document.addEventListener("webkitpointerlockchange", lockCallback, false);

    canvas.onclick = () => {
        canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
        canvas.requestPointerLock();
    };

    // handle player physics/movement
    const applyPlayerVel = vel => {
        player.physicsImpostor.setLinearVelocity(player.physicsImpostor.getLinearVelocity().add(vel));
    };

    scene.registerBeforeRender(() => {
        player.rotationQuaternion = new BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(), Math.PI / 3); // prevent rotation

        player.physicsImpostor.setLinearVelocity(new BABYLON.Vector3.Lerp(player.physicsImpostor.getLinearVelocity(), new BABYLON.Vector3(0, player.physicsImpostor.getLinearVelocity().y, 0), 0.1));

        let dir = camera.getTarget().subtract(camera.position); // camera direction

        // apply movement velocity
        let movement = new BABYLON.Vector3();

        if (forward) movement = movement.add(new BABYLON.Vector3(dir.x, 0, dir.z));
        if (left) movement = movement.add(new BABYLON.Vector3(-dir.z, 0, dir.x));
        if (back) movement = movement.add(new BABYLON.Vector3(-dir.x, 0, -dir.z));
        if (right) movement = movement.add(new BABYLON.Vector3(dir.z, 0, -dir.x));

        movement = movement.normalize();

        applyPlayerVel(movement);

        // apply jump velocity
        if (jump) applyPlayerVel(new BABYLON.Vector3(0, 0.75, 0));
    });

    // render scene
    engine.runRenderLoop(() => {
        scene.render();
    });

    // initial lock
    canvas.requestPointerLock();
    scene.physicsEnabled = document.pointerLockElement === canvas;
};

window.addEventListener("DOMContentLoaded", init);