#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const DEFAULT_CANDIDATE = path.join(root, 'assets/generated/candidates/yonggang-face-refresh-v3');
const CONTACT_SHEET = path.join(root, 'docs/qa-artifacts/yonggang-face-refresh-v3-contact-sheet.png');

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
  const args = { candidate: DEFAULT_CANDIDATE };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--candidate') args.candidate = path.resolve(argv[++i]);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const failures = [];
  const candidate = args.candidate;

  const mascot = path.join(candidate, 'mascot/yonggang-mascot-v3-selected.png');
  expectPng(failures, mascot, 1024, 1024);

  const componentPaths = COMPONENT_FILES.map(file => path.join(candidate, 'components', file));
  for (const file of componentPaths) expectPng(failures, file, 1024, 1024);

  const sprite = path.join(candidate, 'composited/value-chain-sprites.png');
  expectPng(failures, sprite, 1024, 768);

  const orbPaths = ORB_FILES.map(file => path.join(candidate, 'composited/components-orb', file));
  for (const file of orbPaths) expectPng(failures, file, 256, 256);

  validateManifest(failures, candidate);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1180 }, deviceScaleFactor: 1 });
  await page.addScriptTag({ content: VALIDATOR_SOURCE });

  for (const file of orbPaths) {
    if (!fs.existsSync(file)) continue;
    const result = await page.evaluate((src) => window.sampleOrbCorners(src), fileToDataUrl(file));
    if (!result.ok) failures.push(`${rel(file)} orb corner alpha max ${result.maxAlpha}, expected <= 10`);
  }

  await writeContactSheet(page, candidate, sprite, orbPaths);
  await browser.close();

  if (failures.length) {
    for (const failure of failures) console.error(`FAIL ${failure}`);
    process.exit(1);
  }
  console.log('validated yonggang-face-refresh-v3: mascot=1 components=12 sprite=1 orbs=12');
  console.log(`contact sheet: ${rel(CONTACT_SHEET)}`);
}

function expectPng(failures, file, width, height) {
  if (!fs.existsSync(file)) {
    failures.push(`${rel(file)} missing`);
    return;
  }
  const info = pngInfo(file);
  if (info.width !== width || info.height !== height) {
    failures.push(`${rel(file)} dimensions ${info.width}x${info.height}, expected ${width}x${height}`);
  }
}

function pngInfo(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.toString('ascii', 1, 4) !== 'PNG') return { width: 0, height: 0 };
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function validateManifest(failures, candidate) {
  const manifestPath = path.join(candidate, 'job-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    failures.push(`${rel(manifestPath)} missing`);
    return;
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!Array.isArray(manifest.jobs) || manifest.jobs.length < 2) {
    failures.push('job-manifest jobs missing');
    return;
  }
  const selected = manifest.selectedOutputs;
  if (!Array.isArray(selected) || selected.length < 26) {
    failures.push('job-manifest selectedOutputs must include mascot, 12 components, sprite, and 12 orbs');
  }
  const candidateAbs = path.resolve(candidate);
  const jobOutputs = new Set();
  for (const job of manifest.jobs) {
    if (!job.prompt_used) failures.push(`job ${job.id || 'unknown'} missing prompt_used`);
    if (!Array.isArray(job.output_paths) || job.output_paths.length === 0) {
      failures.push(`job ${job.id || 'unknown'} missing output_paths`);
      continue;
    }
    for (const output of job.output_paths) {
      jobOutputs.add(output);
      const abs = path.resolve(root, output);
      if (!abs.startsWith(candidateAbs)) {
        failures.push(`${output} points outside candidate root`);
      }
    }
  }
  for (const output of selected || []) {
    const abs = path.resolve(root, output);
    if (!abs.startsWith(candidateAbs)) failures.push(`${output} selected output outside candidate root`);
    if (!fs.existsSync(abs)) failures.push(`${output} selected output missing`);
    if (!jobOutputs.has(output)) failures.push(`${output} missing from job output_paths`);
  }
}

async function writeContactSheet(page, candidate, sprite, orbPaths) {
  fs.mkdirSync(path.dirname(CONTACT_SHEET), { recursive: true });
  const payload = {
    reference: fileToDataUrl(path.join(root, 'docs/references/yonggang-character-reference.jpg')),
    previous: fileToDataUrl(path.join(root, 'assets/generated/value-chain-sprites.png')),
    candidate: fileToDataUrl(sprite),
    mascot: fileToDataUrl(path.join(candidate, 'mascot/yonggang-mascot-v3-selected.png')),
    orbs: orbPaths.map(fileToDataUrl)
  };
  const dataUrl = await page.evaluate((input) => window.makeContactSheet(input), payload);
  fs.writeFileSync(CONTACT_SHEET, Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
}

function fileToDataUrl(file) {
  const ext = path.extname(file).toLowerCase();
  const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
}

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

const VALIDATOR_SOURCE = String.raw`
(() => {
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  async function sampleOrbCorners(src) {
    const image = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const points = [
      [0, 0],
      [image.naturalWidth - 1, 0],
      [0, image.naturalHeight - 1],
      [image.naturalWidth - 1, image.naturalHeight - 1]
    ];
    let maxAlpha = 0;
    for (const [x, y] of points) {
      const alpha = ctx.getImageData(x, y, 1, 1).data[3];
      maxAlpha = Math.max(maxAlpha, alpha);
    }
    return { ok: maxAlpha <= 10, maxAlpha };
  }

  async function makeContactSheet(input) {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1180;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f6f8fb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#17217d';
    ctx.font = '700 28px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('Yonggang Face Refresh v3 QA Contact Sheet', 40, 48);
    ctx.font = '600 20px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

    const [reference, previous, candidate, mascot, ...orbs] = await Promise.all([
      loadImage(input.reference),
      loadImage(input.previous),
      loadImage(input.candidate),
      loadImage(input.mascot),
      ...input.orbs.map(loadImage)
    ]);

    drawPanel(ctx, reference, 40, 90, 330, 500, 'Reference');
    drawPanel(ctx, previous, 410, 90, 540, 405, 'Previous runtime sheet');
    drawPanel(ctx, candidate, 1000, 90, 540, 405, 'Candidate sheet');
    drawPanel(ctx, mascot, 40, 630, 250, 250, 'Mascot');

    const startX = 325;
    const startY = 620;
    for (let i = 0; i < orbs.length; i++) {
      const col = i % 6;
      const row = Math.floor(i / 6);
      drawPanel(ctx, orbs[i], startX + col * 200, startY + row * 250, 160, 160, String(i + 1).padStart(2, '0'));
    }
    return canvas.toDataURL('image/png');
  }

  function drawPanel(ctx, image, x, y, w, h, label) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#d8dde5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#263040';
    ctx.font = '600 18px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(label, x + 16, y + 30);
    const pad = 22;
    const topPad = 48;
    const maxW = w - pad * 2;
    const maxH = h - topPad - pad;
    const scale = Math.min(maxW / image.naturalWidth, maxH / image.naturalHeight);
    const drawW = image.naturalWidth * scale;
    const drawH = image.naturalHeight * scale;
    ctx.drawImage(image, x + (w - drawW) / 2, y + topPad + (maxH - drawH) / 2, drawW, drawH);
  }

  window.sampleOrbCorners = sampleOrbCorners;
  window.makeContactSheet = makeContactSheet;
})();
`;

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
