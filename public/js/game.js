(() => {
  const canvas = document.getElementById("gameCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // Tamaño base (16:9) para mejor look
  const GAME_WIDTH = 960;
  const GAME_HEIGHT = 540;

  // Mundo más largo que la pantalla
  const WORLD_WIDTH = 3200;
  const GROUND_Y = GAME_HEIGHT - 80;
  const TILE_SIZE = 32;
  const GRAVITY = 1800;

  // HUD
  const scoreEl = document.getElementById("gameScore");
  const heartsEl = document.getElementById("gameHearts");
  const messageEl = document.getElementById("gameMessage");
  const fullscreenBtn = document.getElementById("btnFullscreen");
  const playBtn = document.getElementById("btnPlay");

 // === AUDIO ===
const bgMusic = new Audio('/sounds/farm-theme.mp3');   // ruta según tu carpeta
bgMusic.loop = true;
bgMusic.volume = 0.35;

const jumpSound = new Audio('/sounds/jump.wav');       // ruta según tu carpeta
jumpSound.volume = 0.6;

let musicEnabled = true;
let musicStarted = false;

const musicToggleBtn = document.getElementById('music-toggle');

function updateMusicToggleLabel() {
  if (!musicToggleBtn) return;
  musicToggleBtn.textContent = musicEnabled ? '🔊 Música ON' : '🔇 Música OFF';
}

// evento del botón de música
if (musicToggleBtn) {
  musicToggleBtn.addEventListener('click', () => {
    musicEnabled = !musicEnabled;

    if (musicEnabled) {
      bgMusic.play().catch(() => {});
    } else {
      bgMusic.pause();
    }

    updateMusicToggleLabel();
  });

  // estado inicial del texto
  updateMusicToggleLabel();
}

// Llamar esto cuando el juego pase a "playing"
function ensureMusicPlaying() {
  if (!musicEnabled) return;
  if (!musicStarted) {
    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => {});
    musicStarted = true;
  }
}


  // Controles
  const keys = { left: false, right: false };
  let currentColor = "#facc15";

  // Estado del jugador
  const MAX_HEALTH = 3;
  const player = {
    x: 120,
    y: GROUND_Y - 32,
    w: 28,
    h: 32,
    vy: 0,
    speed: 260,
    jumpForce: -650,
    onGround: false,
    health: MAX_HEALTH,
    invFrames: 0,
  };

  // Profe perseguidor
  const teacher = {
    x: 30,
    y: GROUND_Y - 40,
    w: 30,
    h: 44,
  };

  // Plataformas y peligros
  const platforms = [];
  const hazards = [];
  const goal = { x: WORLD_WIDTH - 140, y: GROUND_Y - 64, w: 40, h: 64 };

  // Camara
  let cameraX = 0;

  // Estado del juego
  let distance = 0;
let state = "ready"; // "ready" | "playing" | "win" | "gameover"
 let lastTime = performance.now();

  // ------------------ Inicialización de nivel ------------------

  function addPlatform(x, y, w, h) {
    platforms.push({ x, y, w, h });
  }

  function addHazard(x, y, w, h) {
    hazards.push({ x, y, w, h });
  }

  function buildLevel() {
    platforms.length = 0;
    hazards.length = 0;

    // Suelo principal
    addPlatform(0, GROUND_Y, WORLD_WIDTH, GAME_HEIGHT - GROUND_Y);

    // Plataformas elevadas
    addPlatform(420, GROUND_Y - 120, 220, 20);
    addPlatform(780, GROUND_Y - 160, 180, 20);
    addPlatform(1150, GROUND_Y - 110, 260, 20);
    addPlatform(1550, GROUND_Y - 90, 180, 20);
    addPlatform(1900, GROUND_Y - 130, 200, 20);
    addPlatform(2250, GROUND_Y - 180, 220, 20);
    addPlatform(2600, GROUND_Y - 130, 200, 20);

    // Huecos/pocitos (caer quita vida)
    addHazard(620, GROUND_Y + 10, 100, 40);
    addHazard(1400, GROUND_Y + 10, 110, 40);
    addHazard(2100, GROUND_Y + 10, 100, 40);

    // "Púas" simples en el suelo
    addHazard(1000, GROUND_Y - 10, 70, 20);
    addHazard(1750, GROUND_Y - 10, 70, 20);
  }

  buildLevel();

  // ------------------ Resize responsivo ------------------

  function resizeCanvas() {
    const wrapper = document.querySelector(".game-canvas-wrapper");
    if (!wrapper) return;

    const ratio = GAME_WIDTH / GAME_HEIGHT;
    let w = wrapper.clientWidth;
    let h = w / ratio;

    if (h > 440) {
      h = 440;
      w = h * ratio;
    }

    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // ------------------ Utilidades ------------------

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function rectsCollide(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function updateHUD() {
    scoreEl.textContent = Math.floor(distance);
    const hearts = "♥".repeat(player.health).padEnd(MAX_HEALTH, " ");
    heartsEl.textContent = hearts;
  }

  function setMessage(text) {
    if (messageEl) messageEl.textContent = text;
  }

  function resetGame(full = true) {
    state = "playing";
    distance = 0;
    player.x = 120;
    player.y = GROUND_Y - 32;
    player.vy = 0;
    player.onGround = false;
    player.invFrames = 0;
    if (full) player.health = MAX_HEALTH;
    teacher.x = 30;
    cameraX = 0;
    setMessage(
      "Avanza hacia la puerta azul del final. Evita caer en los huecos o tocar los bloques amarillos."
    );
    updateHUD();
  }

  function startGame(fullReset = true) {
  // Reinicia el nivel completo si lo pedimos
  resetGame(fullReset);

  // Cambia estado a "jugando"
  state = "playing";

  // Arranca música si está habilitada
  ensureMusicPlaying();
}


startGame(true);

playBtn?.addEventListener("click", () => {
  startGame(true);
});

  function damagePlayer() {
    if (player.invFrames > 0 || state !== "playing") return;
    player.health -= 1;
    player.invFrames = 60; // ~1 segundo
    if (player.health <= 0) {
      state = "gameover";
      setMessage(
        "Te quedaste sin vida 💀. Pulsa R para reiniciar el nivel completo."
      );
    } else {
      setMessage(
        "¡Auch! Perdiste 1 corazón. Pulsa R para volver al inicio rápido."
      );
    }
    updateHUD();
  }

  // ------------------ Update ------------------

  function update(dt) {
    if (state !== "playing") return;

    if (player.invFrames > 0) {
      player.invFrames -= 60 * dt;
      if (player.invFrames < 0) player.invFrames = 0;
    }

    // Movimiento horizontal
    let dir = 0;
    if (keys.left) dir -= 1;
    if (keys.right) dir += 1;
    player.x += dir * player.speed * dt;

    player.x = clamp(player.x, 0, WORLD_WIDTH - player.w);

    // Gravedad + movimiento vertical
    player.vy += GRAVITY * dt;
    player.y += player.vy * dt;

    player.onGround = false;

    // Colisión con plataformas
    platforms.forEach((p) => {
      const future = {
        x: player.x,
        y: player.y,
        w: player.w,
        h: player.h,
      };

      if (!rectsCollide(future, p)) return;

      // ¿Venimos de arriba?
      if (player.vy > 0 && player.y + player.h - p.y < 40) {
        player.y = p.y - player.h;
        player.vy = 0;
        player.onGround = true;
      } else if (player.vy < 0 && p.y + p.h - player.y < 40) {
        // golpeando por abajo
        player.y = p.y + p.h;
        player.vy = 0;
      }
    });

    // Caer al vacío (huecos)
    if (player.y > GAME_HEIGHT + 40) {
      damagePlayer();
      resetGame(false);
      return;
    }

    // Choque con hazards
    hazards.forEach((h) => {
      if (rectsCollide(player, h)) {
        damagePlayer();
        resetGame(false);
      }
    });

    // Llegar a la meta
    if (rectsCollide(player, goal)) {
      state = "win";
      setMessage(
        "¡Llegaste a la salida! Aprobaste Seguridad de Aplicaciones 🎉. Pulsa R para volver a jugar."
      );
    }

    // Distancia recorrida
    distance = Math.max(distance, player.x / 4);

    // Profe te persigue poco a poco
    const targetX = player.x - 220;
    teacher.x += (targetX - teacher.x) * 0.015;
    if (teacher.x < 10) teacher.x = 10;

    // Si el profe te alcanza
    if (teacher.x + teacher.w > player.x + 4) {
      state = "gameover";
      setMessage(
        "El profe Adrián te alcanzó 😱. Pulsa R para reiniciar el nivel."
      );
    }

    // Cámara sigue al jugador
    cameraX = clamp(
      player.x - GAME_WIDTH / 2,
      0,
      WORLD_WIDTH - GAME_WIDTH
    );

    updateHUD();
  }

  // ------------------ Draw ------------------

  function drawBackground() {
    // Fondo oscuro
    const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    grad.addColorStop(0, "#020617");
    grad.addColorStop(0.4, "#02021b");
    grad.addColorStop(1, "#020617");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // "Estrellas"
    ctx.fillStyle = "#0f172a";
    for (let i = 0; i < 80; i++) {
      const x = (i * 37) % GAME_WIDTH;
      const y = (i * 71) % 160;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  function drawTiles() {
    // Suelo de bloques pixelados
    for (let x = 0; x < WORLD_WIDTH; x += TILE_SIZE) {
      const sx = x - cameraX;
      if (sx > GAME_WIDTH || sx + TILE_SIZE < 0) continue;
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(sx, GROUND_Y, TILE_SIZE, GAME_HEIGHT - GROUND_Y);
      ctx.fillStyle = "#111827";
      ctx.fillRect(sx + 3, GROUND_Y + 3, TILE_SIZE - 6, TILE_SIZE - 10);
    }

    // Plataformas
    platforms.forEach((p) => {
      const sx = p.x - cameraX;
      if (sx > GAME_WIDTH || sx + p.w < 0) return;
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(sx, p.y, p.w, p.h);
      ctx.fillStyle = "#4b5563";
      ctx.fillRect(sx, p.y, p.w, 4);
    });

    // Hazards
    hazards.forEach((h) => {
      const sx = h.x - cameraX;
      if (sx > GAME_WIDTH || sx + h.w < 0) return;
      ctx.fillStyle = "#b91c1c";
      ctx.fillRect(sx, h.y, h.w, h.h);

      // Triángulos tipo púas
      ctx.fillStyle = "#f97316";
      const spikes = Math.max(2, Math.floor(h.w / 16));
      for (let i = 0; i < spikes; i++) {
        const baseX = sx + (i * h.w) / spikes;
        ctx.beginPath();
        ctx.moveTo(baseX, h.y + h.h);
        ctx.lineTo(baseX + h.w / spikes / 2, h.y);
        ctx.lineTo(baseX + h.w / spikes, h.y + h.h);
        ctx.closePath();
        ctx.fill();
      }
    });
  }

  function drawGoal() {
    const sx = goal.x - cameraX;
    if (sx + goal.w < 0 || sx > GAME_WIDTH) return;

    ctx.fillStyle = "#0ea5e9";
    ctx.fillRect(sx, goal.y, goal.w, goal.h);

    ctx.fillStyle = "#e0f2fe";
    ctx.fillRect(sx + 6, goal.y + 6, goal.w - 12, goal.h - 12);
  }

  function drawTeacher() {
    const sx = teacher.x - cameraX;
    if (sx + teacher.w < 0 || sx > GAME_WIDTH) return;

    ctx.fillStyle = "#020617";
    ctx.fillRect(sx, teacher.y - 20, teacher.w, teacher.h);
    ctx.fillStyle = "#020617";
    ctx.fillRect(sx + 3, teacher.y - 44, teacher.w - 6, 28);
    ctx.strokeStyle = "#6b7280";
    ctx.strokeRect(sx + 3, teacher.y - 44, teacher.w - 6, 28);
  }

  function drawPlayer() {
    const sx = player.x - cameraX;
    const sy = player.y - player.h;

    // cuerpo
    ctx.fillStyle = currentColor;
    ctx.fillRect(sx, sy, player.w, player.h);

    // “sombrero” / cabeza
    ctx.fillStyle = "#fde68a";
    ctx.fillRect(sx + 4, sy - 10, player.w - 8, 10);

    // pico
    ctx.fillStyle = "#f97316";
    ctx.fillRect(sx + player.w - 6, sy + player.h / 2 - 4, 6, 6);

    // parpadeo cuando está en invencible
    if (player.invFrames > 0 && Math.floor(player.invFrames * 10) % 2 === 0) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.5)";
      ctx.fillRect(sx, sy, player.w, player.h);
    }
  }

  function draw() {
    ctx.imageSmoothingEnabled = false;

    drawBackground();
    drawTiles();
    drawGoal();
    drawTeacher();
    drawPlayer();
  }

  // ------------------ Game Loop ------------------

  function loop(timestamp) {
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    update(dt);
    draw();

    requestAnimationFrame(loop);
  }

  // ------------------ Input ------------------

function jump() {
  if (player.onGround && state === "playing") {
    player.vy = player.jumpForce;
    player.onGround = false;

    // sonido de salto
    if (musicEnabled) {
      try {
        jumpSound.currentTime = 0;
        jumpSound.play();
      } catch (e) {
        // ignorar errores de reproducción
      }
    }
  }
}

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      keys.left = true;
    }
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      keys.right = true;
    }
    if (e.code === "Space" || e.key === "ArrowUp") {
      e.preventDefault();
      jump();
    }
    if (e.key === "r" || e.key === "R") {
      resetGame(true);
    }
    if (e.key === "f" || e.key === "F") {
      toggleFullscreen();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      keys.left = false;
    }
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      keys.right = false;
    }
  });

  // Selección de pollito (mantenemos lo que ya tenías en el HTML)
  document.querySelectorAll("[data-chick]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll("[data-chick]")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentColor = btn.dataset.color || "#facc15";
    });
  });

  // Pantalla completa
  function toggleFullscreen() {
    const container = document.querySelector(".game-main");
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  fullscreenBtn?.addEventListener("click", toggleFullscreen);

  // Color inicial
  currentColor = "#facc15";

  // Iniciamos
  setMessage(
    "Avanza hacia la puerta azul del final. Evita los huecos y bloques amarillos. R = reiniciar, F = pantalla completa."
  );
  updateHUD();
  requestAnimationFrame(loop);
})();
