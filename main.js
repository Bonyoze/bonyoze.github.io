var cameraFOV = 1.5,
mouseSensitivity = 1000,
movementForce = 0.2,
jumpForce = 0.1;

const init = async () => {
    const canvas = document.getElementById("canvas"),
    engine = new BABYLON.Engine(canvas, true);

    // setup scene
    var scene = new BABYLON.Scene(engine);

    const isGameActive = () => {
        return document.pointerLockElement === canvas;
    }

    // setup camera
    var camera = new BABYLON.FreeCamera("playerCamera", new BABYLON.Vector3(0, 50, -100), scene);
    camera.fov = cameraFOV;
    camera.minZ = 0.1;

    // setup lights and shadows
    var skyLight = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(-1, -1, 1), scene);
    skyLight.intensity = 0.4;

    var dirLight = new BABYLON.DirectionalLight("light2", new BABYLON.Vector3(-1, -1, 1), scene);
    dirLight.intensity = 0.8;
    dirLight.position = new BABYLON.Vector3(0, 100, 0);

    var shadowGenerator = new BABYLON.ShadowGenerator(2048, dirLight);
    shadowGenerator.setDarkness(0.5);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 16;
    shadowGenerator.useKernelBlur = true;
    
    // setup physics
    scene.enablePhysics(new BABYLON.Vector3(0, -32, 0), new BABYLON.CannonJSPlugin());
    scene.physicsEnabled = false; // init value

    // create skybox
    var skybox = BABYLON.MeshBuilder.CreateBox("skybox", { size: 10000 }, scene);
    skybox.material = new BABYLON.StandardMaterial("skyboxMaterial", scene);
    skybox.material.backFaceCulling = false;
    skybox.material.reflectionTexture = new BABYLON.CubeTexture("assets/skybox", scene);
    skybox.material.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    skybox.material.diffuseColor = new BABYLON.Color3();
    skybox.material.specularColor = new BABYLON.Color3();

    // create ground collider
    var ground = BABYLON.Mesh.CreateGroundFromHeightMap("ground", "assets/heightMap.png", 1000, 1000, 100, 0, 20, scene, false, () => {
        ground.physicsImpostor = new BABYLON.PhysicsImpostor(ground, BABYLON.PhysicsImpostor.HeightmapImpostor, { mass: 0, friction: 0.1, restitution: 0 }, scene);
        ground.material = new BABYLON.StandardMaterial("ground", scene);
        ground.material.diffuseTexture = new BABYLON.Texture("assets/grass.jpg", scene);
        ground.material.diffuseTexture.uScale = ground.material.diffuseTexture.vScale = 200;
        ground.material.specularColor = ground.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
    });
    ground.receiveShadows = true;
    ground.position.y -= 20;

    var platform = BABYLON.MeshBuilder.CreateBox("platform", { height: 5, width: 50, depth: 50});
    platform.physicsImpostor = new BABYLON.PhysicsImpostor(platform, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, friction: 0.01, restitution: 0 }, scene);
    platform.material = new BABYLON.StandardMaterial("platform", scene);
    platform.material.diffuseTexture = new BABYLON.Texture("assets/concrete.jpg", scene);
    platform.material.diffuseTexture.uScale = platform.material.diffuseTexture.vScale = 5;
    platform.material.specularColor = platform.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
    shadowGenerator.addShadowCaster(platform);
    platform.receiveShadows = true;
    platform.position.y -= 9.5;

    // create player
    var player = BABYLON.MeshBuilder.CreateCylinder("player", { height: 5, diameter: 2.5, tesselation: 48 });
    player.physicsImpostor = new BABYLON.PhysicsImpostor(player, BABYLON.PhysicsImpostor.CylinderImpostor, { mass: 50, friction: 0, restitution: 0 }, scene);
    player.isPickable = false;
    player.position = new BABYLON.Vector3(0, 1, 0);

    skybox.parent = player;
    skybox.position = player.position
    camera.parent = player;
    camera.position = new BABYLON.Vector3(0, 2, 0);

    // test physics objects
    for (let i = 0; i < 20; i++) {
        var cube = BABYLON.MeshBuilder.CreateBox("cube", { size: 20 - i });
        cube.physicsImpostor = new BABYLON.PhysicsImpostor(cube, BABYLON.PhysicsImpostor.BoxImpostor, { mass: (40 - i) * 4, friction: 0.85, restitution: 0 }, scene);
        cube.material = new BABYLON.StandardMaterial("ground", scene);
        cube.material.diffuseTexture = new BABYLON.Texture("assets/checker.jpg", scene);
        cube.material.diffuseTexture.uScale = cube.material.diffuseTexture.vScale = 2;
        let hue = Math.random();
        new BABYLON.Color3.HSVtoRGBToRef(hue * 360, 1, 1, cube.material.diffuseColor);
        new BABYLON.Color3.HSVtoRGBToRef(hue * 360, 1, 0.5, cube.material.emissiveColor);
        shadowGenerator.addShadowCaster(cube);
        cube.receiveShadows = true;
        cube.position.z += 200;
        cube.position.y += (10 + i * 20);
    }

    // handle key inputs
    var keysActive = false,
    forward = false,
    left = false,
    back = false,
    right = false,
    jump = false;

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
                    player.physicsImpostor.setLinearVelocity(new BABYLON.Vector3());
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
        scene.physicsEnabled = isGameActive(); // basically pauses the game
    }

    document.addEventListener("pointerlockchange", lockCallback, false);
    document.addEventListener("mozpointerlockchange", lockCallback, false);
    document.addEventListener("webkitpointerlockchange", lockCallback, false);

    // handle mouse movement
    canvas.onmousemove = e => {
        if (!isGameActive()) return;

        let {
            movementX,
            movementY
        } = e;

        let rot = camera.rotation.add(new BABYLON.Vector3(movementY / mouseSensitivity, movementX / mouseSensitivity));
        rot.x = Math.min(Math.max(rot.x, -85 * (Math.PI / 180)), 85 * (Math.PI / 180)); // clamp camera pitch
        camera.rotation = rot;
    };

    canvas.onclick = () => {
        canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
        canvas.requestPointerLock();
    };

    // handle player physics/movement
    const applyPlayerVel = vel => {
        player.physicsImpostor.setLinearVelocity(player.physicsImpostor.getLinearVelocity().add(vel.multiply(new BABYLON.Vector3(engine.getDeltaTime(), engine.getDeltaTime(), engine.getDeltaTime()))));
    };

    scene.registerBeforeRender(() => {
        if (!scene.physicsEnabled) return;

        /*let onGround,
        ray = new BABYLON.Ray(player.position.add(new BABYLON.Vector3(0, 0, 0)), new BABYLON.Vector3(0, -1, 0), 2),
        pick = scene.pickWithRay(ray);
        if (pick) onGround = pick.hit;
        console.log(onGround);*/

        player.rotationQuaternion = new BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(), Math.PI / 3); // prevent rotation

        /*if (onGround) */player.physicsImpostor.setLinearVelocity(new BABYLON.Vector3.Lerp(player.physicsImpostor.getLinearVelocity(), new BABYLON.Vector3(0, player.physicsImpostor.getLinearVelocity().y, 0), 0.1));

        let dir = camera.getTarget().subtract(camera.position); // camera direction

        // apply movement velocity
        let movement = new BABYLON.Vector3();

        if (forward) movement = movement.add(new BABYLON.Vector3(dir.x, 0, dir.z));
        if (left) movement = movement.add(new BABYLON.Vector3(-dir.z, 0, dir.x));
        if (back) movement = movement.add(new BABYLON.Vector3(-dir.x, 0, -dir.z));
        if (right) movement = movement.add(new BABYLON.Vector3(dir.z, 0, -dir.x));

        movement = movement.normalize();

        applyPlayerVel(movement.multiply(new BABYLON.Vector3(movementForce, movementForce, movementForce)));

        // apply jump velocity
        if (jump) applyPlayerVel(new BABYLON.Vector3(0, jumpForce, 0));
    });

    // render scene
    engine.runRenderLoop(() => {
        scene.render();
    });
};

window.addEventListener("DOMContentLoaded", init);