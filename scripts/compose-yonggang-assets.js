#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');

const COMPONENT_FILES = [
  '01-iron-ore.png',
  '02-coal.png',
  '03-coke.png',
  '04-blast-furnace.png',
  '05-pig-iron-ladle.png',
  '06-steelmaking-converter.png',
  '07-casting-slab.png',
  '08-hot-rolled-coil.png',
  '09-cold-rolled-auto-sheet.png',
  '10-heavy-plate.png',
  '11-long-special-products.png',
  '12-yonggang-final.png'
];

const ORB_FILES = [
  '01-iron-ore-orb.png',
  '02-coal-orb.png',
  '03-coke-orb.png',
  '04-blast-furnace-orb.png',
  '05-pig-iron-ladle-orb.png',
  '06-steelmaking-converter-orb.png',
  '07-casting-slab-orb.png',
  '08-hot-rolled-coil-orb.png',
  '09-cold-rolled-auto-sheet-orb.png',
  '10-heavy-plate-orb.png',
  '11-long-special-products-orb.png',
  '12-yonggang-final-orb.png'
];

function parseArgs(argv) {
  const args = {
    components: path.join(root, 'assets/generated/candidates/yonggang-face-refresh-v3/components'),
    out: path.join(root, 'assets/generated/candidates/yonggang-face-refresh-v3/composited')
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--components') args.components = path.resolve(argv[++i]);
    if (argv[i] === '--out') args.out = path.resolve(argv[++i]);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const componentPaths = COMPONENT_FILES.map(file => path.join(args.components, file));
  for (const file of componentPaths) {
    if (!fs.existsSync(file)) throw new Error(`missing component ${file}`);
  }
  fs.mkdirSync(args.out, { recursive: true });
  fs.mkdirSync(path.join(args.out, 'components-orb'), { recursive: true });

  const images = componentPaths.map(fileToDataUrl);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 });
  await page.addScriptTag({ content: COMPOSITOR_SOURCE });

  const sheetDataUrl = await page.evaluate((input) => window.composeSpriteSheet(input), { images });
  const derivedOutputs = [];
  const spritePath = path.join(args.out, 'value-chain-sprites.png');
  writeDataUrl(spritePath, sheetDataUrl);
  derivedOutputs.push(spritePath);

  for (let i = 0; i < images.length; i++) {
    const orbDataUrl = await page.evaluate((input) => window.composeOrb(input), { image: images[i] });
    const orbPath = path.join(args.out, 'components-orb', ORB_FILES[i]);
    writeDataUrl(orbPath, orbDataUrl);
    derivedOutputs.push(orbPath);
  }

  await browser.close();
  updateCandidateManifest(args.out, derivedOutputs);
  console.log(`composed sprite and ${ORB_FILES.length} orb icons`);
  console.log(`output root: ${path.relative(root, args.out)}`);
}

function fileToDataUrl(file) {
  const data = fs.readFileSync(file).toString('base64');
  return `data:image/png;base64,${data}`;
}

function writeDataUrl(outPath, dataUrl) {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
}

function updateCandidateManifest(outDir, outputPaths) {
  const candidateRoot = path.dirname(outDir);
  const manifestPath = path.join(candidateRoot, 'job-manifest.json');
  if (!fs.existsSync(manifestPath)) return;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const relOutputs = outputPaths.map(file => path.relative(root, file).replaceAll(path.sep, '/'));
  manifest.jobs = (manifest.jobs || []).filter(job => job.id !== 'deterministic-yonggang-face-v3-composited');
  manifest.jobs.push({
    id: 'deterministic-yonggang-face-v3-composited',
    mode: 'canvas-composite',
    status: 'success',
    prompt_used: 'Compose the selected Yonggang face v3 component assets into a 1024x768 4x3 sprite sheet and 12 circular 256x256 orb icons with transparent corners.',
    output_paths: relOutputs
  });
  manifest.selectedOutputs = Array.from(new Set([...(manifest.selectedOutputs || []), ...relOutputs]));
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

const COMPOSITOR_SOURCE = String.raw`
(() => {
  const NAVY = '#17217d';

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  async function composeSpriteSheet({ images }) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const loaded = await Promise.all(images.map(loadImage));
    for (let i = 0; i < loaded.length; i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      drawOrbCell(ctx, loaded[i], col * 256, row * 256, 256, 256);
    }
    return canvas.toDataURL('image/png');
  }

  async function composeOrb({ image }) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);
    drawOrbCell(ctx, await loadImage(image), 0, 0, 256, 256);
    return canvas.toDataURL('image/png');
  }

  function drawOrbCell(ctx, image, x, y, w, h) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) * 0.47;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    const bg = ctx.createRadialGradient(cx - r * 0.34, cy - r * 0.36, r * 0.08, cx, cy, r);
    bg.addColorStop(0, '#ffffff');
    bg.addColorStop(0.48, '#dfe3e6');
    bg.addColorStop(1, '#7f858b');
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);

    drawContain(ctx, image, cx, cy + h * 0.015, w * 0.84, h * 0.84);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = Math.max(4, w * 0.032);
    ctx.beginPath();
    ctx.arc(cx, cy, r - ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = Math.max(2, w * 0.012);
    ctx.beginPath();
    ctx.arc(cx - r * 0.12, cy - r * 0.12, r * 0.68, Math.PI * 1.08, Math.PI * 1.72);
    ctx.stroke();
    ctx.restore();
  }

  function drawContain(ctx, image, cx, cy, maxW, maxH) {
    const scale = Math.min(maxW / image.naturalWidth, maxH / image.naturalHeight);
    const drawW = image.naturalWidth * scale;
    const drawH = image.naturalHeight * scale;
    ctx.drawImage(image, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
  }

  window.composeSpriteSheet = composeSpriteSheet;
  window.composeOrb = composeOrb;
})();
`;

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
