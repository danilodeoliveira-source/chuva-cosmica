const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
canvas.style.imageRendering = "pixelated";
const highScoreElement = document.getElementById("highScore");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

let state = "menu";
let score = 0;
let highScore = Number(localStorage.getItem("chuvaCosmicaRecorde") || 0);
let lives = 3;
let level = 1;
let elapsed = 0;
let lastTime = 0;

let spawnTimer = 0;
let starTimer = 0;
let powerTimer = 0;
let shake = 0;
let messageTimer = 0;

highScoreElement.textContent = highScore;

const keys = {};
const meteors = [];
const stars = [];
const powers = [];
const particles = [];
const backgroundStars = [];

const player = {
  x: WIDTH / 2,
  y: HEIGHT - 70,
  width: 42,
  height: 48,
  speed: 470,
  shield: 0,
  invulnerable: 0
};

for (let i = 0; i < 120; i++) {
  backgroundStars.push({
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    size: Math.random() * 2.5 + 0.4,
    speed: Math.random() * 30 + 10,
    alpha: Math.random() * 0.8 + 0.2
  });
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function resetGame() {
  state = "playing";
  score = 0;
  lives = 3;
  level = 1;
  elapsed = 0;
  spawnTimer = 0;
  starTimer = 0;
  powerTimer = 0;
  shake = 0;
  messageTimer = 0;

  meteors.length = 0;
  stars.length = 0;
  powers.length = 0;
  particles.length = 0;

  player.x = WIDTH / 2;
  player.shield = 0;
  player.invulnerable = 0;
}

function startGame() {
  resetGame();
}

function endGame() {
  state = "gameover";

  if (Math.floor(score) > highScore) {
    highScore = Math.floor(score);
    localStorage.setItem("chuvaCosmicaRecorde", highScore);
    highScoreElement.textContent = highScore;
  }
}

function createMeteor() {
  const radius = random(15, 32);

  meteors.push({
    x: random(radius, WIDTH - radius),
    y: -radius - 10,
    radius,
    speed: random(150, 240) + level * 13,
    rotation: random(0, Math.PI * 2),
    rotationSpeed: random(-2, 2),
    color: Math.random() > 0.5 ? "#b85b3e" : "#7d5964"
  });
}

function createStar() {
  stars.push({
    x: random(20, WIDTH - 20),
    y: -20,
    radius: 11,
    speed: random(130, 190) + level * 8,
    rotation: random(0, Math.PI * 2)
  });
}

function createPower() {
  powers.push({
    x: random(25, WIDTH - 25),
    y: -25,
    radius: 15,
    speed: 145 + level * 5,
    rotation: 0
  });
}

function createExplosion(x, y, color = "#ffb52e", amount = 18) {
  for (let i = 0; i < amount; i++) {
    particles.push({
      x,
      y,
      vx: random(-180, 180),
      vy: random(-180, 180),
      life: random(0.4, 0.9),
      maxLife: 0.9,
      size: random(2, 6),
      color
    });
  }
}

function drawBackground(dt) {
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);

  gradient.addColorStop(0, "#090d2b");
  gradient.addColorStop(1, "#030513");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (const star of backgroundStars) {
    star.y += star.speed * dt;

    if (star.y > HEIGHT) {
      star.y = -5;
      star.x = Math.random() * WIDTH;
    }

    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = "#ffffff";

    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;

  const moonGradient = ctx.createRadialGradient(
    WIDTH - 100,
    90,
    5,
    WIDTH - 100,
    90,
    90
  );

  moonGradient.addColorStop(0, "rgba(155, 238, 255, .7)");
  moonGradient.addColorStop(1, "rgba(100, 180, 255, 0)");

  ctx.fillStyle = moonGradient;
  ctx.beginPath();
  ctx.arc(WIDTH - 100, 90, 90, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(130, 220, 255, .65)";
  ctx.beginPath();
  ctx.arc(WIDTH - 100, 90, 28, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer() {
  if (
    player.invincible > 0 &&
    Math.floor(player.invincible * 12) % 2 === 0
  ) {
    return;
  }

  ctx.save();
  ctx.translate(
    Math.floor(player.x),
    Math.floor(player.y)
  );

  // Escudo verde
  if (player.shield > 0) {
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.rect(-38, -38, 76, 76);
    ctx.stroke();
  }

  // Corpo da nave
  ctx.fillStyle = "#ffffff";

  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.lineTo(22, 20);
  ctx.lineTo(9, 16);
  ctx.lineTo(0, 24);
  ctx.lineTo(-9, 16);
  ctx.lineTo(-22, 20);
  ctx.closePath();
  ctx.fill();

  // Parte azul da nave
  ctx.fillStyle = "#00aaff";
  ctx.fillRect(-8, -8, 16, 20);

  // Janela
  ctx.fillStyle = "#000000";
  ctx.fillRect(-5, -3, 10, 10);

  // Fogo da nave
  ctx.fillStyle = "#ffb000";
  ctx.fillRect(-7, 20, 14, 11);

  ctx.fillStyle = "#ff5500";
  ctx.fillRect(-3, 30, 6, 8);

  ctx.restore();
}

function drawMeteor(m) {
  ctx.save();

  ctx.translate(
    Math.floor(m.x),
    Math.floor(m.y)
  );

  ctx.rotate(m.angle);

  // Meteoro quadrado/pixelado
  ctx.fillStyle = "#703800";

  ctx.fillRect(-m.r, -m.r, m.r * 2, m.r * 2);

  ctx.fillStyle = "#a05020";

  ctx.fillRect(-m.r + 6, -m.r + 6, 12, 12);
  ctx.fillRect(m.r - 15, -m.r + 14, 9, 9);
  ctx.fillRect(-m.r + 13, m.r - 18, 10, 10);

  ctx.fillStyle = "#ffb000";
  ctx.fillRect(-5, -5, 8, 8);

  ctx.restore();
}
function drawStar(s) {
  ctx.save();

  ctx.translate(
    Math.floor(s.x),
    Math.floor(s.y)
  );

  ctx.fillStyle = "#ffb000";

  // Estrela em blocos
  ctx.fillRect(-4, -16, 8, 32);
  ctx.fillRect(-16, -4, 32, 8);
  ctx.fillRect(-9, -9, 18, 18);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-3, -8, 6, 6);

  ctx.restore();
}
function drawPower(power) {
  ctx.save();

  ctx.translate(power.x, power.y);
  ctx.rotate(power.rotation);

  ctx.shadowColor = "#70ffb1";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#2eff87";

  ctx.beginPath();
  ctx.arc(0, 0, power.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#073d2a";
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("S", 0, 1);

  ctx.restore();
}

function drawShield(item) {
  ctx.save();

  ctx.translate(
    Math.floor(item.x),
    Math.floor(item.y)
  );

  ctx.fillStyle = "#00ff00";

  ctx.fillRect(-16, -16, 32, 32);

  ctx.fillStyle = "#000000";
  ctx.fillRect(-9, -9, 18, 18);

  ctx.fillStyle = "#00ff00";
  ctx.font = "bold 18px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("S", 0, 1);

  ctx.restore();
}
function drawParticles() {
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(
      0,
      particle.life / particle.maxLife
    );

    ctx.fillStyle = particle.color;

    ctx.fillRect(
      particle.x - particle.size / 2,
      particle.y - particle.size / 2,
      particle.size,
      particle.size
    );
  }

  ctx.globalAlpha = 1;
}

function drawHUD() {
  ctx.fillStyle = "rgba(0, 0, 0, .35)";
  ctx.fillRect(18, 16, 270, 78);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 21px Arial";

  ctx.fillText(`Pontos: ${Math.floor(score)}`, 32, 45);
  ctx.fillText(
    `Vidas: ${"♥".repeat(lives)}${"♡".repeat(3 - lives)}`,
    32,
    75
  );

  ctx.textAlign = "right";
  ctx.fillText(`Nível ${level}`, WIDTH - 28, 45);

  if (player.shield > 0) {
    ctx.fillStyle = "#65f5ff";
    ctx.font = "bold 16px Arial";
    ctx.fillText(
      `Escudo: ${Math.ceil(player.shield)}s`,
      WIDTH - 28,
      75
    );
  }

  ctx.textAlign = "left";
}

function drawOverlay(title, lines, buttonText) {
  ctx.fillStyle = "rgba(2, 5, 20, .78)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.textAlign = "center";

  ctx.fillStyle = "#72eaff";
  ctx.shadowColor = "#00bfff";
  ctx.shadowBlur = 20;
  ctx.font = "bold 52px Arial";
  ctx.fillText(title, WIDTH / 2, 170);

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff";
  ctx.font = "21px Arial";

  lines.forEach((line, index) => {
    ctx.fillText(line, WIDTH / 2, 235 + index * 34);
  });

  ctx.fillStyle = "#ffe85c";
  ctx.fillRect(WIDTH / 2 - 145, 350, 290, 65);

  ctx.fillStyle = "#171b42";
  ctx.font = "bold 22px Arial";
  ctx.fillText(buttonText, WIDTH / 2, 391);

  ctx.font = "15px Arial";
  ctx.fillStyle = "#b9c8ed";
  ctx.fillText("Clique ou pressione ENTER", WIDTH / 2, 455);

  ctx.textAlign = "left";
}

function circleRectCollision(circle, rect) {
  const closestX = Math.max(
    rect.x - rect.width / 2,
    Math.min(circle.x, rect.x + rect.width / 2)
  );

  const closestY = Math.max(
    rect.y - rect.height / 2,
    Math.min(circle.y, rect.y + rect.height / 2)
  );

  const dx = circle.x - closestX;
  const dy = circle.y - closestY;

  return dx * dx + dy * dy <
    circle.radius * circle.radius;
}

function updatePlayer(dt) {
  let direction = 0;

  if (keys["ArrowLeft"] || keys["a"] || keys["A"]) {
    direction--;
  }

  if (keys["ArrowRight"] || keys["d"] || keys["D"]) {
    direction++;
  }

  player.x += direction * player.speed * dt;

  player.x = Math.max(
    player.width / 2,
    Math.min(WIDTH - player.width / 2, player.x)
  );

  if (player.invulnerable > 0) {
    player.invulnerable -= dt;
  }

  if (player.shield > 0) {
    player.shield -= dt;
  }
}

function updateGame(dt) {
  elapsed += dt;
  score += dt * (8 + level * 1.5);

  level = Math.floor(elapsed / 15) + 1;

  spawnTimer -= dt;
  starTimer -= dt;
  powerTimer -= dt;

  const meteorInterval = Math.max(
    0.23,
    0.85 - level * 0.045
  );

  if (spawnTimer <= 0) {
    createMeteor();

    if (Math.random() < Math.min(0.28, level * 0.025)) {
      createMeteor();
    }

    spawnTimer = meteorInterval;
  }

  if (starTimer <= 0) {
    createStar();
    starTimer = random(1.4, 2.7);
  }

  if (powerTimer <= 0) {
    createPower();
    powerTimer = random(18, 28);
  }

  updatePlayer(dt);

  const playerRect = {
    x: player.x,
    y: player.y,
    width: player.width,
    height: player.height
  };

  for (const meteor of meteors) {
    meteor.y += meteor.speed * dt;
    meteor.rotation += meteor.rotationSpeed * dt;

    if (circleRectCollision(meteor, playerRect)) {
      meteor.y = HEIGHT + meteor.radius;

      if (player.shield > 0) {
        createExplosion(meteor.x, meteor.y, "#4ce8ff", 12);
        score += 15;
      } else if (player.invulnerable <= 0) {
        lives--;
        player.invulnerable = 2;
        shake = 0.35;

        createExplosion(player.x, player.y, "#ff453e", 28);

        if (lives <= 0) {
          endGame();
          return;
        }
      }
    }
  }

  for (const star of stars) {
    star.y += star.speed * dt;
    star.rotation += dt * 3;

    if (circleRectCollision(star, playerRect)) {
      star.y = HEIGHT + 100;
      score += 100;
      messageTimer = 1;

      createExplosion(star.x, star.y, "#ffe943", 12);
    }
  }

  for (const power of powers) {
    power.y += power.speed * dt;
    power.rotation += dt * 2;

    if (circleRectCollision(power, playerRect)) {
      power.y = HEIGHT + 100;
      player.shield = 7;
      score += 50;

      createExplosion(power.x, power.y, "#2eff87", 18);
    }
  }

  for (const particle of particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 100 * dt;
    particle.life -= dt;
  }

  removeOffscreenObjects();

  if (shake > 0) {
    shake -= dt;
  }

  if (messageTimer > 0) {
    messageTimer -= dt;
  }
}

function removeOffscreenObjects() {
  for (let i = meteors.length - 1; i >= 0; i--) {
    if (meteors[i].y > HEIGHT + 80) {
      meteors.splice(i, 1);
    }
  }

  for (let i = stars.length - 1; i >= 0; i--) {
    if (stars[i].y > HEIGHT + 80) {
      stars.splice(i, 1);
    }
  }

  for (let i = powers.length - 1; i >= 0; i--) {
    if (powers[i].y > HEIGHT + 80) {
      powers.splice(i, 1);
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    if (particles[i].life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function draw(dt) {
  ctx.save();

  if (shake > 0) {
    ctx.translate(
      random(-shake * 20, shake * 20),
      random(-shake * 20, shake * 20)
    );
  }

  function drawBackground(dt) {
  // Fundo preto típico dos jogos antigos
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, W, H);

  // Estrelas quadradas
  for (const s of sky) {
    s.y += s.speed * dt;

    if (s.y > H) {
      s.y = -5;
      s.x = Math.random() * W;
    }

    ctx.fillStyle = Math.random() > 0.5
      ? "#ffffff"
      : "#aaaaaa";

    ctx.fillRect(
      Math.floor(s.x),
      Math.floor(s.y),
      Math.ceil(s.size),
      Math.ceil(s.size)
    );
  }

  // Lua quadrada em estilo 8-bit
  ctx.fillStyle = "#ffb000";
  ctx.fillRect(W - 125, 65, 55, 55);

  ctx.fillStyle = "#000000";
  ctx.fillRect(W - 110, 65, 40, 20);
  ctx.fillRect(W - 125, 85, 15, 25);
}
function canvasPosition(event) {
  const rect = canvas.getBoundingClientRect();

  const clientX = event.touches
    ? event.touches[0].clientX
    : event.clientX;

  return (clientX - rect.left) * (WIDTH / rect.width);
}

function moveWithPointer(event) {
  if (state !== "playing") return;

  const x = canvasPosition(event);

  player.x = Math.max(
    player.width / 2,
    Math.min(WIDTH - player.width / 2, x)
  );
}

function gameLoop(timestamp) {
  const dt = Math.min(
    (timestamp - lastTime) / 1000 || 0,
    0.035
  );

  lastTime = timestamp;

  if (state === "playing") {
    updateGame(dt);
  }

  draw(dt);
  requestAnimationFrame(gameLoop);
}

canvas.addEventListener("mousemove", moveWithPointer);

canvas.addEventListener(
  "touchmove",
  event => {
    event.preventDefault();
    moveWithPointer(event);
  },
  { passive: false }
);

canvas.addEventListener("click", event => {
  const rect = canvas.getBoundingClientRect();

  const x = (event.clientX - rect.left) * (WIDTH / rect.width);
  const y = (event.clientY - rect.top) * (HEIGHT / rect.height);

  const buttonClicked =
    x > WIDTH / 2 - 180 &&
    x < WIDTH / 2 + 180 &&
    y > 320 &&
    y < 435;

  if (
    buttonClicked &&
    (state === "menu" || state === "gameover")
  ) {
    startGame();
  }
});

document.addEventListener("keydown", event => {
  keys[event.key] = true;

  if (
    event.key === "Enter" &&
    (state === "menu" || state === "gameover")
  ) {
    startGame();
  }

  if (
    ["ArrowLeft", "ArrowRight", " "].includes(event.key)
  ) {
    event.preventDefault();
  }
});

document.addEventListener("keyup", event => {
  keys[event.key] = false;
});

requestAnimationFrame(gameLoop);
