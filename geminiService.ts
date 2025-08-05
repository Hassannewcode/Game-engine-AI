
import { GoogleGenAI, Chat, Type } from "@google/genai";
import type { WorkspaceType } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const baseSystemInstruction = `You are 'VibeCode-X', a world-class AI game development assistant specializing in high-performance web technologies. Your purpose is to help users create advanced web-based games and interactive experiences by generating complete, self-contained HTML files that are ready for deployment on platforms like Vercel.

**Core Instructions:**

1.  **Output Format:** You MUST ALWAYS respond with a valid JSON object matching this schema: \`{ "explanation": "...", "code": "..." }\`.
    - \`explanation\`: A brief, friendly explanation of the code changes you made.
    - \`code\`: The complete, self-contained, and updated HTML code for the web game.

2.  **Iterative Development:** The user will provide prompts iteratively. Use the previous code from the chat history as the starting point and modify it to incorporate the user's new request. Always return the FULL, updated HTML file. Do not provide patches or snippets.

3.  **Deployment & Mobile-First:**
    - **Self-Contained:** All HTML, CSS, and JavaScript must be in a single \`index.html\` file. No external file references.
    - **Viewport:** ALWAYS include \`<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">\` in the \`<head>\` for proper mobile scaling.
    - **Responsiveness:** Use responsive design techniques. The game canvas should dynamically resize to fit the window (e.g., using \`window.innerWidth\` and \`window.innerHeight\`).
    - **Styling:** Embed all CSS within a \`<style>\` tag in the \`<head>\`. Default to a clean, dark theme for the game canvas unless specified otherwise. Make things look good by default.

4.  **WebAssembly (WASM):** You cannot compile Rust, C++, etc., to WASM. However, you can write the JavaScript "glue" code required to load and interact with a \`.wasm\` file if the user says they will provide one.
`;

const technologyInstructions = {
    '2D': `
**Technology Focus: 2D Canvas**
- You MUST use the vanilla JavaScript HTML5 Canvas API for all rendering.
- Do NOT use any external game libraries like p5.js, PixiJS, etc., unless explicitly asked by the user.
- Your goal is to create clean, efficient, and self-contained 2D game code.
`,
    '3D': `
**Technology Focus: 3D with Three.js**
- You MUST use the Three.js library for all 3D rendering.
- The project is pre-configured with an import map for Three.js. You can use it by writing \`import * as THREE from 'three';\`
- You are an expert in Three.js, WebGL, and performance optimization. Structure the code to be efficient and clean.
`
};

const initialCodeTemplates = {
    '2D': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>AI 2D Game</title>
    <style>
        body { margin: 0; overflow: hidden; background: #111; }
        canvas { display: block; }
    </style>
</head>
<body>
    <canvas id="game-canvas"></canvas>
    <script type="module">
        const canvas = document.getElementById('game-canvas');
        const ctx = canvas.getContext('2d');
        
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        
        console.log("2D Game initialized.");

        function gameLoop() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText("Welcome to your 2D game!", canvas.width / 2, canvas.height / 2);
            // requestAnimationFrame(gameLoop);
        }
        gameLoop();
    </script>
</body>
</html>`,
    '3D': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>AI 3D Game</title>
    <style>
        body { margin: 0; overflow: hidden; background: #111; }
        canvas { display: block; }
    </style>
</head>
<body>
    <script type="importmap">
    {
        "imports": {
            "three": "https://esm.sh/three@0.166.1"
        }
    }
    </script>
    <script type="module">
        import * as THREE from 'three';

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);
        
        window.addEventListener('resize', () => {
            renderer.setSize(window.innerWidth, window.innerHeight);
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
        });

        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshNormalMaterial();
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);

        camera.position.z = 5;

        function animate() {
            requestAnimationFrame(animate);
            cube.rotation.x += 0.01;
            cube.rotation.y += 0.01;
            renderer.render(scene, camera);
        }
        animate();
    </script>
</body>
</html>`
};

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        explanation: {
            type: Type.STRING,
            description: "A brief, friendly explanation of the code changes you made in response to the user's prompt."
        },
        code: {
            type: Type.STRING,
            description: "The complete and self-contained HTML code for the web game. It must include all necessary HTML, CSS, and JavaScript within a single file."
        }
    },
    required: ['explanation', 'code']
};


export const createAIGameChatSession = (workspaceType: WorkspaceType): { chat: Chat; initialCode: string; welcomeMessage: string; } => {
    if (!process.env.API_KEY) {
        throw new Error("API Key is not configured. Cannot contact AI service.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const systemInstruction = baseSystemInstruction + technologyInstructions[workspaceType];
    const initialCode = initialCodeTemplates[workspaceType];
    const welcomeMessage = `Welcome! I've set up a ${workspaceType} project for you. What would you like to create?`;

    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.1, 
            topP: 0.9,
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        },
        history: [
             {
                role: 'user',
                parts: [{ text: `Start a new ${workspaceType} project.` }],
            },
            {
                role: 'model',
                parts: [{ text: JSON.stringify({
                    explanation: welcomeMessage,
                    code: initialCode
                }) }]
            }
        ]
    });

    return { chat, initialCode, welcomeMessage };
};