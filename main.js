// ═══════════════════════════════════════════
// 용강 만들기 — Steel Value Chain Merge Game
// ═══════════════════════════════════════════

const { Engine, World, Bodies, Body, Events, Composite, Vector } = Matter;

const GAME_DATA = window.YONGGANG_GAME_DATA;
const TIERS = GAME_DATA.tiers;
const MAX_TIER = TIERS.length - 1;
const CANVAS_W = 420;
const CANVAS_H = 640;
const WALL_THICKNESS = 24;
const DROP_COOLDOWN = 360;
const GAME_OVER_LINE = 92;
const SAFE_OVER_FRAMES = 90;
const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

let engine, world, canvas, ctx;
let score = 0;
let mergeCount = 0;
let maxTierReached = 0;
let currentTier = 0;
let nextTier = 0;
let canDrop = true;
let gameOver = false;
let mouseX = CANVAS_W / 2;
let dropLineY = 58;
let initialized = false;
let frameCount = 0;
let startedAt = Date.now();
const effects = [];
const overLineFrames = new Map();
const images = {};

function init() {
  if (initialized) return;
  initialized = true;
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');
  resizeCanvasForDpr();
  loadImages();

  engine = Engine.create({ enableSleeping: true });
  engine.gravity.y = 1.08;
  engine.positionIterations = 10;
  engine.velocityIterations = 8;
  engine.constraintIterations = 4;
  world = engine.world;

  createWalls();
  setupInput();
  setupCollision();
  setupKeyboard();

  currentTier = pickRandomTier();
  nextTier = pickRandomTier();
  updateNextPreview();
  renderEvolutionChart();
  updateDbStatus();

  document.getElementById('restart-btn').addEventListener('click', restart);
  requestAnimationFrame(gameLoop);
}

function resizeCanvasForDpr() {
  canvas.width = CANVAS_W * DPR;
  canvas.height = CANVAS_H * DPR;
  canvas.style.width = `${CANVAS_W}px`;
  canvas.style.height = `${CANVAS_H}px`;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

function loadImages() {
  images.mascot = new Image();
  images.mascot.src = 'assets/generated/yonggang-mascot.png';
  images.background = new Image();
  images.background.src = 'assets/generated/factory-background.png';
}

function pickRandomTier() {
  const weights = [0.30, 0.25, 0.18, 0.12, 0.08, 0.05, 0.02];
  let r = Math.random();
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return 0;
}

function createWalls() {
  const opts = { isStatic: true, render: { visible: false }, friction: 0.9 };
  const floor = Bodies.rectangle(CANVAS_W / 2, CANVAS_H - WALL_THICKNESS / 2, CANVAS_W, WALL_THICKNESS, opts);
  const leftWall = Bodies.rectangle(WALL_THICKNESS / 2, CANVAS_H / 2, WALL_THICKNESS, CANVAS_H, opts);
  const rightWall = Bodies.rectangle(CANVAS_W - WALL_THICKNESS / 2, CANVAS_H / 2, WALL_THICKNESS, CANVAS_H, opts);
  const leftSlope = Bodies.rectangle(34, CANVAS_H - 52, 78, 12, { ...opts, angle: Math.PI * 0.12 });
  const rightSlope = Bodies.rectangle(CANVAS_W - 34, CANVAS_H - 52, 78, 12, { ...opts, angle: -Math.PI * 0.12 });
  World.add(world, [floor, leftWall, rightWall, leftSlope, rightSlope]);
}

function createPart(x, y, tierIndex, extra = {}) {
  const tier = TIERS[tierIndex];
  const body = Bodies.circle(x, y, tier.radius, {
    restitution: tier.restitution,
    friction: tier.friction,
    frictionStatic: 0.82,
    frictionAir: 0.012,
    density: tier.density,
    slop: 0.015,
    label: 'part',
    tier: tierIndex,
    spawnFrame: frameCount,
    justMerged: extra.justMerged || 0,
    renderAngle: Math.random() * Math.PI * 2
  });
  Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.04);
  return body;
}

function dropItem() {
  if (!canDrop || gameOver) return;
  const tier = TIERS[currentTier];
  const x = clamp(mouseX, WALL_THICKNESS + tier.radius, CANVAS_W - WALL_THICKNESS - tier.radius);
  const body = createPart(x, dropLineY, currentTier);
  Body.setVelocity(body, { x: (Math.random() - 0.5) * 0.25, y: 1.0 });
  World.add(world, body);

  canDrop = false;
  setTimeout(() => { canDrop = true; }, DROP_COOLDOWN);
  currentTier = nextTier;
  nextTier = pickRandomTier();
  updateNextPreview();
}

function setupCollision() {
  Events.on(engine, 'collisionStart', (event) => {
    const merged = new Set();
    for (const pair of event.pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;
      if (a.label !== 'part' || b.label !== 'part') continue;
      if (merged.has(a.id) || merged.has(b.id)) continue;
      if (a.tier === b.tier && a.tier < MAX_TIER) {
        merged.add(a.id);
        merged.add(b.id);
        mergeParts(a, b);
      }
    }
  });
}

function mergeParts(a, b) {
  const newTier = a.tier + 1;
  const tierData = TIERS[newTier];
  const mid = Vector.mult(Vector.add(a.position, b.position), 0.5);
  const velocity = Vector.mult(Vector.add(a.velocity, b.velocity), 0.35);

  World.remove(world, [a, b]);
  const newBody = createPart(mid.x, mid.y, newTier, { justMerged: 18 });
  Body.setVelocity(newBody, velocity);
  Body.applyForce(newBody, newBody.position, { x: 0, y: -0.018 * newBody.mass });
  World.add(world, newBody);

  score += tierData.score;
  mergeCount += 1;
  maxTierReached = Math.max(maxTierReached, newTier);
  updateScore();
  playMergeEffect(mid.x, mid.y, newTier);
  if (newTier === MAX_TIER) playYonggangBurst(mid.x, mid.y);
}

function updateScore() {
  document.getElementById('score').textContent = score.toLocaleString('ko-KR');
}

function updateNextPreview() {
  const t = TIERS[nextTier];
  document.getElementById('next-preview').textContent = `${t.icon} ${t.name}`;
}

function renderEvolutionChart() {
  const container = document.getElementById('evolution-chart');
  container.innerHTML = '';
  TIERS.forEach((t, i) => {
    const item = document.createElement('div');
    item.className = `chart-item ${i === MAX_TIER ? 'final' : ''}`;
    item.innerHTML = `<span class="dot" style="background:${t.color};border-color:${t.edge}">${t.icon}</span><div><strong>${t.name}</strong><em>${t.stage}</em></div>`;
    container.appendChild(item);
  });
}

function updateDbStatus() {
  const el = document.getElementById('db-status');
  const endpoint = GAME_DATA.googleSheets.endpoint;
  el.textContent = endpoint ? 'Google Sheets 연결 준비 완료' : '로컬 기록 우선, Sheets endpoint 주입 대기';
}

async function recordGameResult() {
  const payload = {
    timestamp: new Date().toISOString(),
    player: 'local-player',
    score,
    maxTier: TIERS[maxTierReached].name,
    durationMs: Date.now() - startedAt,
    mergeCount
  };
  localStorage.setItem('yonggang:lastResult', JSON.stringify(payload));
  const endpoint = GAME_DATA.googleSheets.endpoint;
  if (!endpoint) return { mode: 'local', payload };
  try {
    await fetch(endpoint, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return { mode: 'sheets', payload };
  } catch (error) {
    console.warn('Sheets 기록 실패, localStorage fallback 사용', error);
    return { mode: 'local-fallback', payload };
  }
}

function playMergeEffect(x, y, tier) {
  const data = TIERS[tier];
  effects.push({ type: 'ring', x, y, radius: 5, maxRadius: data.radius + 28, alpha: 1, color: data.color });
  for (let i = 0; i < 8; i++) {
    effects.push({ type: 'spark', x, y, vx: Math.cos(i * Math.PI / 4) * 2.2, vy: Math.sin(i * Math.PI / 4) * 2.2, life: 24, color: data.color });
  }
}

function playYonggangBurst(x, y) {
  for (let i = 0; i < 24; i++) {
    effects.push({ type: 'spark', x, y, vx: Math.cos(i * Math.PI / 12) * 4, vy: Math.sin(i * Math.PI / 12) * 4, life: 42, color: i % 2 ? '#ffbd3f' : '#18347a' });
  }
}

function updateEffects() {
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    if (e.type === 'ring') {
      e.radius += 3.5;
      e.alpha -= 0.055;
      if (e.alpha <= 0) effects.splice(i, 1);
    } else {
      e.x += e.vx;
      e.y += e.vy;
      e.vy += 0.08;
      e.life -= 1;
      if (e.life <= 0) effects.splice(i, 1);
    }
  }
}

function drawEffects() {
  for (const e of effects) {
    ctx.save();
    if (e.type === 'ring') {
      ctx.globalAlpha = e.alpha;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      ctx.globalAlpha = Math.max(0, e.life / 42);
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function checkGameOver() {
  if (gameOver) return;
  const bodies = Composite.allBodies(world);
  for (const body of bodies) {
    if (body.label !== 'part') continue;
    if (frameCount - body.spawnFrame < 120) continue;
    if (Math.abs(body.velocity.y) > 0.22 || Math.abs(body.velocity.x) > 0.28) {
      overLineFrames.delete(body.id);
      continue;
    }
    const over = body.position.y - TIERS[body.tier].radius < GAME_OVER_LINE;
    if (!over) {
      overLineFrames.delete(body.id);
      continue;
    }
    const count = (overLineFrames.get(body.id) || 0) + 1;
    overLineFrames.set(body.id, count);
    if (count > SAFE_OVER_FRAMES) {
      triggerGameOver();
      return;
    }
  }
}

async function triggerGameOver() {
  gameOver = true;
  document.getElementById('final-score').textContent = score.toLocaleString('ko-KR');
  document.getElementById('game-over-overlay').classList.remove('hidden');
  const result = await recordGameResult();
  const el = document.getElementById('db-status');
  el.textContent = result.mode === 'sheets' ? 'Google Sheets 기록 요청 완료' : '결과를 로컬 저장소에 기록함';
}

function restart() {
  const bodies = Composite.allBodies(world);
  for (const body of bodies) if (body.label === 'part') World.remove(world, body);
  score = 0;
  mergeCount = 0;
  maxTierReached = 0;
  gameOver = false;
  canDrop = true;
  frameCount = 0;
  startedAt = Date.now();
  effects.length = 0;
  overLineFrames.clear();
  currentTier = pickRandomTier();
  nextTier = pickRandomTier();
  updateScore();
  updateNextPreview();
  updateDbStatus();
  document.getElementById('game-over-overlay').classList.add('hidden');
}

function setupInput() {
  const getCanvasX = (clientX) => {
    const rect = canvas.getBoundingClientRect();
    const scale = CANVAS_W / rect.width;
    return (clientX - rect.left) * scale;
  };
  canvas.addEventListener('mousemove', (e) => { mouseX = getCanvasX(e.clientX); });
  canvas.addEventListener('click', dropItem);
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    mouseX = getCanvasX(e.touches[0].clientX);
  }, { passive: false });
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (e.changedTouches.length > 0) mouseX = getCanvasX(e.changedTouches[0].clientX);
    dropItem();
  }, { passive: false });
}

function setupKeyboard() {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') mouseX = clamp(mouseX - 18, 0, CANVAS_W);
    if (e.key === 'ArrowRight') mouseX = clamp(mouseX + 18, 0, CANVAS_W);
    if (e.key === ' ' || e.key === 'Enter') dropItem();
  });
}

function drawBackground() {
  if (images.background && images.background.complete && images.background.naturalWidth) {
    ctx.drawImage(images.background, 0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = 'rgba(9, 18, 36, 0.42)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, '#09172e');
    grad.addColorStop(0.55, '#13294a');
    grad.addColorStop(1, '#2e1d18');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
  ctx.fillStyle = 'rgba(255, 177, 59, 0.08)';
  ctx.fillRect(0, CANVAS_H - 118, CANVAS_W, 118);
}

function drawPart(body) {
  const tier = TIERS[body.tier];
  const { x, y } = body.position;
  const r = tier.radius;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(body.angle * 0.3 + body.renderAngle * 0.06);

  if (body.justMerged && body.justMerged > 0) {
    const scale = 1 + (body.justMerged / 18) * 0.25;
    ctx.scale(scale, scale);
    body.justMerged--;
  }

  if (body.tier === MAX_TIER && images.mascot.complete && images.mascot.naturalWidth) {
    ctx.drawImage(images.mascot, -r, -r, r * 2, r * 2);
    ctx.restore();
    return;
  }

  drawIndustrialShape(tier, r);
  ctx.restore();
}

function drawIndustrialShape(tier, r) {
  const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.38, r * 0.08, 0, 0, r);
  grad.addColorStop(0, lightenColor(tier.color, 48));
  grad.addColorStop(0.68, tier.color);
  grad.addColorStop(1, tier.edge);
  ctx.fillStyle = grad;
  ctx.strokeStyle = tier.edge;
  ctx.lineWidth = Math.max(2, r * 0.055);

  if (['casting', 'hot_rolled'].includes(tier.id)) {
    roundRect(-r * 0.88, -r * 0.48, r * 1.76, r * 0.96, r * 0.16);
    ctx.fill(); ctx.stroke();
  } else if (tier.id === 'section_steel') {
    drawHBeam(r);
  } else if (tier.id === 'special_steel') {
    drawStar(r * 0.95, 5);
    ctx.fill(); ctx.stroke();
  } else if (tier.id === 'final_goods') {
    drawCity(r);
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.24)';
  ctx.beginPath();
  ctx.arc(-r * 0.34, -r * 0.36, r * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff8e8';
  ctx.font = `800 ${Math.max(13, r * 0.38)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,.38)';
  ctx.shadowBlur = 3;
  ctx.fillText(tier.icon, 0, -r * 0.10);
  ctx.font = `700 ${Math.max(9, r * 0.17)}px system-ui, sans-serif`;
  ctx.fillText(tier.name, 0, r * 0.45);
  ctx.shadowBlur = 0;
}

function drawPreview() {
  if (!canDrop || gameOver) return;
  const tier = TIERS[currentTier];
  const x = clamp(mouseX, WALL_THICKNESS + tier.radius, CANVAS_W - WALL_THICKNESS - tier.radius);
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.translate(x, dropLineY);
  drawIndustrialShape(tier, tier.radius);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 6]);
  ctx.beginPath();
  ctx.moveTo(x, dropLineY + tier.radius);
  ctx.lineTo(x, CANVAS_H - WALL_THICKNESS);
  ctx.stroke();
  ctx.restore();
}

function drawGameOverLine() {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 98, 67, 0.65)';
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 5]);
  ctx.beginPath();
  ctx.moveTo(0, GAME_OVER_LINE);
  ctx.lineTo(CANVAS_W, GAME_OVER_LINE);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 190, 80, .85)';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillText('공정 한계선', 56, GAME_OVER_LINE - 8);
  ctx.restore();
}

function drawHBeam(r) {
  ctx.beginPath();
  ctx.rect(-r * 0.72, -r * 0.55, r * 0.26, r * 1.1);
  ctx.rect(r * 0.46, -r * 0.55, r * 0.26, r * 1.1);
  ctx.rect(-r * 0.54, -r * 0.16, r * 1.08, r * 0.32);
  ctx.fill(); ctx.stroke();
}

function drawCity(r) {
  roundRect(-r * 0.82, -r * 0.58, r * 1.64, r * 1.16, r * 0.18);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  for (let i = -2; i <= 2; i++) ctx.fillRect(i * r * 0.26 - 3, -r * 0.25, 6, r * 0.45);
}

function drawStar(radius, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + i * Math.PI / points;
    const rr = i % 2 === 0 ? radius : radius * 0.48;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function lightenColor(hex, amount) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function gameLoop() {
  Engine.update(engine, 1000 / 60);
  updateEffects();
  drawBackground();
  drawGameOverLine();
  for (const body of Composite.allBodies(world)) if (body.label === 'part') drawPart(body);
  drawPreview();
  drawEffects();
  frameCount++;
  if (frameCount % 20 === 0) checkGameOver();
  requestAnimationFrame(gameLoop);
}

if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', init);
else init();
