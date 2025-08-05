
import { WorkspaceType } from '../types';

export const getEngineScript = (workspaceType: WorkspaceType): string => {
    const engine2D = `
        const canvas = document.getElementById('game-canvas');
        if (!canvas) throw new Error('Could not find canvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get 2D context');

        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });

        const keysPressed = new Set();
        document.addEventListener('keydown', (e) => keysPressed.add(e.code));
        document.addEventListener('keyup', (e) => keysPressed.delete(e.code));

        let sprites = [];
        let onUpdateCallback = (deltaTime) => {};
        let lastTime = 0;
        const state = new Map();

        window.Engine = {
            getCanvas: () => canvas,
            onUpdate: (callback) => { onUpdateCallback = callback; },
            setData: (key, value) => state.set(key, value),
            getData: (key) => state.get(key),
            create: {
                sprite: ({ x, y, width = 20, height = 20, asset, properties = {} }) => {
                    const colorMap = { player: 'skyblue', enemy: 'tomato', platform: 'lightgreen', coin: 'gold', default: 'white' };
                    const sprite = { x, y, width, height, asset, color: colorMap[asset] || colorMap.default, ...properties };
                    sprites.push(sprite);
                    return sprite;
                }
            },
            destroy: (spriteToDestroy) => {
                sprites = sprites.filter(s => s !== spriteToDestroy);
            },
            input: {
                isPressed: (key) => {
                    const keyMap = { 'space': 'Space', 'arrowleft': 'ArrowLeft', 'arrowright': 'ArrowRight', 'arrowup': 'ArrowUp', 'arrowdown': 'ArrowDown' };
                    const mappedKey = key.toLowerCase().replace(/ /g, '');
                    return keysPressed.has(keyMap[mappedKey] || key);
                }
            },
            physics: {
                applyGravity: (sprite, gravityForce = 980) => {
                    if (typeof sprite.velocityY !== 'number') sprite.velocityY = 0;
                    sprite.velocityY += gravityForce * (1/60); // Assuming 60fps for simplicity
                    sprite.y += sprite.velocityY * (1/60);
                },
                checkCollision: (spriteA, spriteB) => {
                    if (!spriteA || !spriteB) return false;
                    return spriteA.x < spriteB.x + spriteB.width &&
                           spriteA.x + spriteA.width > spriteB.x &&
                           spriteA.y < spriteB.y + spriteB.height &&
                           spriteA.y + spriteA.height > spriteB.y;
                },
                getCollisions: (sprite) => {
                    return sprites.filter(other => sprite !== other && Engine.physics.checkCollision(sprite, other));
                }
            }
        };

        function gameLoop(timestamp) {
            const deltaTime = (timestamp - lastTime) / 1000;
            lastTime = timestamp;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (onUpdateCallback) {
                onUpdateCallback(deltaTime || 0);
            }
            
            sprites.forEach(sprite => {
                ctx.fillStyle = sprite.color;
                ctx.fillRect(sprite.x, sprite.y, sprite.width, sprite.height);
            });

            requestAnimationFrame(gameLoop);
        }

        requestAnimationFrame(gameLoop);
    `;

    const engine3D = `
        import * as THREE from 'three';

        const canvas = document.getElementById('game-canvas');
        if (!canvas) throw new Error('Could not find canvas');

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111111);
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        const clock = new THREE.Clock();
        const state = new Map();
        let cameraTarget = null;
        let cameraOffset = new THREE.Vector3(0, 5, 10);

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        const keysPressed = new Set();
        document.addEventListener('keydown', (e) => keysPressed.add(e.code));
        document.addEventListener('keyup', (e) => keysPressed.delete(e.code));

        let meshes = [];
        let onUpdateCallback = (deltaTime) => {};

        window.Engine = {
            getScene: () => scene,
            getCamera: () => camera,
            onUpdate: (callback) => { onUpdateCallback = callback; },
            setData: (key, value) => state.set(key, value),
            getData: (key) => state.get(key),
            create: {
                mesh: ({ geometry, position = [0,0,0], material = 'normal', properties = {} }) => {
                    let geom;
                    switch(geometry) {
                        case 'sphere': geom = new THREE.SphereGeometry(0.5, 32, 16); break;
                        case 'capsule': geom = new THREE.CapsuleGeometry(0.5, 0.5, 16, 8); break;
                        case 'box': default: geom = new THREE.BoxGeometry(1, 1, 1); break;
                    }
                    
                    let mat;
                    switch(material) {
                        case 'phong': mat = new THREE.MeshPhongMaterial({ color: 0xcccccc }); break;
                        case 'lambert': mat = new THREE.MeshLambertMaterial({ color: 0xcccccc }); break;
                        case 'normal': default: mat = new THREE.MeshNormalMaterial(); break;
                    }

                    const mesh = new THREE.Mesh(geom, mat);
                    mesh.position.set(position[0], position[1], position[2]);
                    Object.assign(mesh.userData, properties); // Use userData for custom properties
                    scene.add(mesh);
                    meshes.push(mesh);
                    return mesh;
                },
                light: ({ type, color = 0xffffff, intensity = 1, position = [0, 10, 0] }) => {
                    let light;
                    switch(type) {
                        case 'directional': 
                            light = new THREE.DirectionalLight(color, intensity);
                            light.position.set(position[0], position[1], position[2]);
                            break;
                        case 'point':
                            light = new THREE.PointLight(color, intensity);
                            light.position.set(position[0], position[1], position[2]);
                            break;
                        case 'ambient':
                        default:
                            light = new THREE.AmbientLight(color, intensity);
                            break;
                    }
                    scene.add(light);
                    return light;
                }
            },
            destroy: (object3D) => {
                if (object3D.geometry) object3D.geometry.dispose();
                if (object3D.material) object3D.material.dispose();
                scene.remove(object3D);
                meshes = meshes.filter(m => m !== object3D);
            },
            input: {
                isPressed: (key) => {
                    const keyMap = { 'space': 'Space', 'arrowleft': 'ArrowLeft', 'arrowright': 'ArrowRight', 'arrowup': 'ArrowUp', 'arrowdown': 'ArrowDown', 'keyw': 'KeyW', 'keya': 'KeyA', 'keys': 'KeyS', 'keyd': 'KeyD'};
                    const mappedKey = key.toLowerCase().replace(/ /g, '');
                    return keysPressed.has(keyMap[mappedKey] || key);
                }
            },
            camera: {
                follow: (meshToFollow, offset = [0, 5, 10]) => {
                    cameraTarget = meshToFollow;
                    cameraOffset.set(offset[0], offset[1], offset[2]);
                },
                lookAt: (x, y, z) => {
                    cameraTarget = null; // stop following
                    camera.lookAt(x, y, z);
                }
            }
        };

        camera.position.z = 10;
        const gridHelper = new THREE.GridHelper( 100, 100, 0x444444, 0x444444 );
        scene.add( gridHelper );
        const ambient = new THREE.AmbientLight(0xffffff, 0.3);
        scene.add(ambient);


        function animate() {
            const deltaTime = clock.getDelta();
            
            if (onUpdateCallback) {
                onUpdateCallback(deltaTime);
            }
            
            if (cameraTarget) {
                const targetPosition = cameraTarget.position.clone().add(cameraOffset);
                camera.position.lerp(targetPosition, 0.1);
                camera.lookAt(cameraTarget.position);
            }

            renderer.render(scene, camera);
        }
        renderer.setAnimationLoop(animate);
    `;

    return workspaceType === '2D' ? engine2D : engine3D;
};
