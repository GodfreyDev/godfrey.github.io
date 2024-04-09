const socket = io.connect('https://cool-accessible-pint.glitch.me');

let player = {
    id: null,
    x: 400,
    y: 300,
    width: 32,
    height: 32,
    color: 'red'
};
let players = {};
const movementSpeed = 150; // pixels per second
let zoomLevel = 1; // 1 is default, <1 is zoomed out, >1 is zoomed in
const keysPressed = {};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

let lastRenderTime = 0;

function gameLoop(timeStamp) {
    requestAnimationFrame(gameLoop);
    const deltaTime = (timeStamp - lastRenderTime) / 1000;
    if (player.id) {
        updatePlayerPosition(deltaTime);
    }
    drawPlayers();
    lastRenderTime = timeStamp;
}

function sendMessage() {
    const messageInput = document.getElementById('chatInput');
    const message = messageInput.value;
    socket.emit('chatMessage', { message: message });
    messageInput.value = ''; // Clear the input field after sending
}

function updatePlayerPosition(deltaTime) {
    let dx = 0;
    let dy = 0;

    if (keysPressed['ArrowLeft']) dx -= movementSpeed * deltaTime;
    if (keysPressed['ArrowRight']) dx += movementSpeed * deltaTime;
    if (keysPressed['ArrowUp']) dy -= movementSpeed * deltaTime;
    if (keysPressed['ArrowDown']) dy += movementSpeed * deltaTime;

    // Adjust for zoom level
    dx /= zoomLevel;
    dy /= zoomLevel;

    const newX = player.x + dx;
    const newY = player.y + dy;

    if (newX !== player.x || newY !== player.y) {
        player.x = newX;
        player.y = newY;
        socket.emit('playerMovement', { x: player.x, y: player.y });
    }
}

function drawPlayers() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(zoomLevel, zoomLevel);
    Object.values(players).forEach(p => {
        ctx.fillStyle = p.color;
        const x = p.x - player.x + canvas.width / 2 / zoomLevel;
        const y = p.y - player.y + canvas.height / 2 / zoomLevel;
        ctx.fillRect(x, y, p.width, p.height);
    });
    ctx.restore();
}

document.addEventListener('keydown', (e) => {
    keysPressed[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    keysPressed[e.key] = false;
});

// Listening to server events
socket.on('currentPlayers', (playersData) => {
    players = playersData;
    if (socket.id in players) {
        player.id = socket.id;
    }
});

socket.on('newPlayer', (playerData) => {
    players[playerData.id] = playerData;
});

socket.on('playerMoved', (playerData) => {
    if (players[playerData.playerId]) {
        players[playerData.playerId].x = playerData.x;
        players[playerData.playerId].y = playerData.y;
    }
});

socket.on('playerDisconnected', (playerId) => {
    delete players[playerId];
});

// Handling chat messages
socket.on('chatMessage', (data) => {
    const dialogueBox = document.getElementById('dialogueBox');
    dialogueBox.style.display = 'block';
    dialogueBox.textContent = `${data.playerId.substring(0, 5)}: ${data.message}`;
    setTimeout(() => dialogueBox.style.display = 'none', 5000); // Hide after 5 seconds
});

requestAnimationFrame(gameLoop);
