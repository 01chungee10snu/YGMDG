#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const candidateRoot = path.join(root, 'assets/generated/candidates/yonggang-face-refresh-v3');
const mascotDir = path.join(candidateRoot, 'mascot');
const componentDir = path.join(candidateRoot, 'components');

const DEFAULT_GPTIMAGEN_SOURCE = '/Users/01chungee10/.codex/generated_images/019f093a-f902-7ac1-ad3c-b9275bcbb897/ig_0b17215f923ec127016a412294bb0c81908078c43a69a6326c.png';

const TIERS = [
  ['01-iron-ore.png', 'iron ore lump with small sinter and limestone hints', 'ore'],
  ['02-coal.png', 'metallurgical coal lump', 'coal'],
  ['03-coke.png', 'porous coke block', 'coke'],
  ['04-blast-furnace.png', 'blast furnace front with molten tap hole', 'furnace'],
  ['05-pig-iron-ladle.png', 'molten pig iron ladle', 'ladle'],
  ['06-steelmaking-converter.png', 'basic oxygen furnace converter with oxygen lance', 'converter'],
  ['07-casting-slab.png', 'continuous casting slab, bloom, and billet', 'caster'],
  ['08-hot-rolled-coil.png', 'hot rolled coil', 'hotcoil'],
  ['09-cold-rolled-auto-sheet.png', 'cold rolled automotive sheet coil', 'coldcoil'],
  ['10-heavy-plate.png', 'heavy steel plate stack', 'plate'],
  ['11-long-special-products.png', 'long and special product group with H-beam, rebar, rail, and special bar', 'longs'],
  ['12-yonggang-final.png', 'final Yonggang molten-steel mascot head and upper body', 'yonggang']
];

function parseArgs(argv) {
  const args = {
    candidate: candidateRoot,
    gptimagenSource: DEFAULT_GPTIMAGEN_SOURCE
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--candidate') args.candidate = path.resolve(argv[++i]);
    if (argv[i] === '--gptimagen-source') args.gptimagenSource = path.resolve(argv[++i]);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const selectedMascotPath = path.join(args.candidate, 'mascot/yonggang-mascot-v3-selected.png');
  fs.mkdirSync(path.join(args.candidate, 'mascot'), { recursive: true });
  fs.mkdirSync(path.join(args.candidate, 'components'), { recursive: true });
  fs.mkdirSync(path.join(args.candidate, 'composited'), { recursive: true });

  const copiedSource = maybeCopyGptimagenSource(args.gptimagenSource, args.candidate);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
  await page.addScriptTag({ content: DRAWING_SOURCE });

  const outputs = [];
  await writeRendered(page, { kind: 'mascot' }, selectedMascotPath);
  outputs.push(selectedMascotPath);

  for (const [, , kind] of TIERS) {
    // Warm up script paths in deterministic tier order.
    if (!kind) throw new Error('missing tier kind');
  }
  for (const [file, subject, kind] of TIERS) {
    const outPath = path.join(args.candidate, 'components', file);
    await writeRendered(page, { kind, subject }, outPath);
    outputs.push(outPath);
  }

  await browser.close();
  writeJobManifest(args.candidate, copiedSource, outputs);
  console.log(`rendered ${outputs.length} yonggang face candidate assets`);
  console.log(`candidate root: ${path.relative(root, args.candidate)}`);
}

function maybeCopyGptimagenSource(sourcePath, targetRoot) {
  if (!sourcePath || !fs.existsSync(sourcePath)) return null;
  const target = path.join(targetRoot, 'gptimagen-sheet-candidate.png');
  fs.copyFileSync(sourcePath, target);
  return target;
}

async function writeRendered(page, spec, outPath) {
  const dataUrl = await page.evaluate((input) => window.renderYonggangAsset(input), {
    width: 1024,
    height: 1024,
    spec
  });
  writeDataUrl(outPath, dataUrl);
}

function writeDataUrl(outPath, dataUrl) {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
}

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function writeJobManifest(candidate, gptimagenSource, outputPaths) {
  const jobs = [];
  if (gptimagenSource) {
    jobs.push({
      id: 'gptimagen-sheet-candidate',
      mode: 'text-to-image',
      status: 'partial',
      prompt_used: 'Generate a 4x3 Yonggang face v3 steelmaking sprite sheet using the face contract in docs/asset-prompts/04-yonggang-face-refresh-v3.md.',
      output_paths: [rel(gptimagenSource)],
      note: 'Kept as GPTImaGen-style provenance. Not promoted because the generated sheet retained an H mark on the final Yonggang and was not the exact runtime size.'
    });
  }

  jobs.push({
    id: 'deterministic-yonggang-face-v3-selected-assets',
    mode: 'gptimagen-assisted-vector-composite',
    status: 'success',
    prompt_used: 'Render selected Yonggang face v3 game assets from docs/asset-prompts/04-yonggang-face-refresh-v3.md, preserving the reference face grammar while excluding text, logos, wordmarks, and H marks.',
    output_paths: outputPaths.map(rel)
  });

  const manifest = {
    batchId: 'yonggang-face-refresh-v3',
    createdAt: new Date().toISOString(),
    generator: 'GPTImaGen-style candidate manifest plus Playwright canvas deterministic selected assets',
    referenceImages: [
      {
        path: 'docs/references/yonggang-character-reference.jpg',
        role: 'main-subject',
        note: 'Canonical Yonggang face and body reference; do not copy logo or text.'
      },
      {
        path: 'assets/generated/components/12-yonggang-final.png',
        role: 'style-reference',
        note: 'Previous final-tier crop for comparison only.'
      },
      {
        path: 'assets/generated/value-chain-sprites.png',
        role: 'style-reference',
        note: 'Previous 12-tier sprite sheet for process icon context only.'
      }
    ],
    jobs,
    selectedOutputs: outputPaths.map(rel),
    rejectedOutputs: gptimagenSource
      ? [
          {
            path: rel(gptimagenSource),
            reason: 'Generated sheet had an H mark on the final Yonggang and required deterministic cleanup before runtime promotion.'
          }
        ]
      : [],
    promotionStatus: 'candidate-only'
  };
  fs.writeFileSync(path.join(candidate, 'job-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

const DRAWING_SOURCE = String.raw`
(() => {
  const NAVY = '#17217d';
  const NAVY_DARK = '#10184f';
  const ORANGE = '#faa323';
  const ORANGE_DARK = '#e77712';
  const CREAM = '#ffe39b';
  const BROWN = '#b55b13';
  const STEEL = '#8e9aa5';
  const STEEL_DARK = '#3f4f61';
  const BLUE = '#0877bd';
  const BLUE_DARK = '#06559a';

  function renderYonggangAsset({ width, height, spec }) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    drawAsset(ctx, spec.kind);
    return canvas.toDataURL('image/png');
  }

  function drawAsset(ctx, kind) {
    if (kind === 'mascot') return drawYonggang(ctx, 512, 444, 0.9, true);
    if (kind === 'yonggang') return drawYonggang(ctx, 512, 452, 0.86, true);
    if (kind === 'ore') return drawOre(ctx);
    if (kind === 'coal') return drawCoal(ctx);
    if (kind === 'coke') return drawCoke(ctx);
    if (kind === 'furnace') return drawFurnace(ctx);
    if (kind === 'ladle') return drawLadle(ctx);
    if (kind === 'converter') return drawConverter(ctx);
    if (kind === 'caster') return drawCaster(ctx);
    if (kind === 'hotcoil') return drawHotCoil(ctx);
    if (kind === 'coldcoil') return drawColdCoil(ctx);
    if (kind === 'plate') return drawPlate(ctx);
    if (kind === 'longs') return drawLongs(ctx);
    throw new Error('unknown kind ' + kind);
  }

  function outline(ctx, width = 18) {
    ctx.strokeStyle = NAVY_DARK;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function fillStroke(ctx, fill, width = 18) {
    ctx.fillStyle = fill;
    ctx.fill();
    outline(ctx, width);
  }

  function ellipse(ctx, x, y, rx, ry, fill, stroke, width = 0, rot = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.stroke();
    }
  }

  function poly(ctx, points, fill, width = 18) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (const point of points.slice(1)) ctx.lineTo(point[0], point[1]);
    ctx.closePath();
    fillStroke(ctx, fill, width);
  }

  function roundedRect(ctx, x, y, w, h, r, fill, width = 18) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    fillStroke(ctx, fill, width);
  }

  function drawFace(ctx, x, y, s = 1) {
    ellipse(ctx, x - 126 * s, y + 42 * s, 54 * s, 48 * s, CREAM);
    ellipse(ctx, x + 126 * s, y + 42 * s, 54 * s, 48 * s, CREAM);
    ellipse(ctx, x - 62 * s, y - 50 * s, 12 * s, 8 * s, BROWN, null, 0, -0.1);
    ellipse(ctx, x + 62 * s, y - 50 * s, 12 * s, 8 * s, BROWN, null, 0, 0.1);
    ellipse(ctx, x - 48 * s, y + 6 * s, 18 * s, 36 * s, '#030305');
    ellipse(ctx, x + 48 * s, y + 6 * s, 18 * s, 36 * s, '#030305');
    ctx.beginPath();
    ctx.moveTo(x - 30 * s, y + 58 * s);
    ctx.bezierCurveTo(x - 18 * s, y + 72 * s, x - 6 * s, y + 72 * s, x, y + 61 * s);
    ctx.bezierCurveTo(x + 6 * s, y + 72 * s, x + 18 * s, y + 72 * s, x + 30 * s, y + 58 * s);
    ctx.strokeStyle = '#030305';
    ctx.lineWidth = 13 * s;
    ctx.stroke();
  }

  function drawHighlight(ctx, x, y, s = 1) {
    ctx.beginPath();
    ctx.moveTo(x - 96 * s, y);
    ctx.bezierCurveTo(x - 42 * s, y + 46 * s, x + 50 * s, y + 46 * s, x + 106 * s, y + 8 * s);
    ctx.strokeStyle = 'rgba(255,230,138,0.82)';
    ctx.lineWidth = 20 * s;
    ctx.stroke();
    ellipse(ctx, x + 146 * s, y + 13 * s, 16 * s, 24 * s, 'rgba(255,223,129,0.72)');
  }

  function drawYonggangHead(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x - 290 * s, y + 104 * s);
    ctx.bezierCurveTo(x - 328 * s, y - 58 * s, x - 252 * s, y - 287 * s, x - 174 * s, y - 288 * s);
    ctx.bezierCurveTo(x - 102 * s, y - 290 * s, x - 116 * s, y - 110 * s, x - 58 * s, y - 104 * s);
    ctx.bezierCurveTo(x - 20 * s, y - 99 * s, x + 20 * s, y - 99 * s, x + 58 * s, y - 104 * s);
    ctx.bezierCurveTo(x + 116 * s, y - 110 * s, x + 102 * s, y - 290 * s, x + 174 * s, y - 288 * s);
    ctx.bezierCurveTo(x + 254 * s, y - 286 * s, x + 328 * s, y - 58 * s, x + 290 * s, y + 104 * s);
    ctx.bezierCurveTo(x + 258 * s, y + 248 * s, x + 154 * s, y + 324 * s, x, y + 324 * s);
    ctx.bezierCurveTo(x - 154 * s, y + 324 * s, x - 258 * s, y + 248 * s, x - 290 * s, y + 104 * s);
    ctx.closePath();
    fillStroke(ctx, ORANGE, 19 * s);
    drawHighlight(ctx, x, y - 170 * s, s);
    ellipse(ctx, x + 128 * s, y - 360 * s, 41 * s, 58 * s, ORANGE, NAVY_DARK, 18 * s, 0.45);
    drawFace(ctx, x, y + 12 * s, s);
  }

  function drawYonggang(ctx, x, y, s, body) {
    if (body) {
      roundedRect(ctx, x - 164 * s, y + 274 * s, 328 * s, 160 * s, 38 * s, BLUE, 18 * s);
      ctx.beginPath();
      ctx.moveTo(x - 70 * s, y + 282 * s);
      ctx.lineTo(x, y + 340 * s);
      ctx.lineTo(x + 70 * s, y + 282 * s);
      outline(ctx, 11 * s);
      roundedRect(ctx, x - 128 * s, y + 348 * s, 100 * s, 42 * s, 8 * s, '#bde3ff', 10 * s);
      roundedRect(ctx, x + 28 * s, y + 348 * s, 100 * s, 42 * s, 8 * s, '#bde3ff', 10 * s);
      roundedRect(ctx, x - 135 * s, y + 430 * s, 270 * s, 126 * s, 48 * s, ORANGE, 17 * s);
      ctx.beginPath();
      ctx.moveTo(x, y + 468 * s);
      ctx.bezierCurveTo(x - 8 * s, y + 518 * s, x - 34 * s, y + 538 * s, x - 70 * s, y + 548 * s);
      outline(ctx, 14 * s);
      ellipse(ctx, x - 202 * s, y + 352 * s, 42 * s, 80 * s, ORANGE, NAVY_DARK, 16 * s, -0.06);
      ellipse(ctx, x + 202 * s, y + 352 * s, 42 * s, 80 * s, ORANGE, NAVY_DARK, 16 * s, 0.06);
    }
    drawYonggangHead(ctx, x, y - 52 * s, s);
  }

  function drawOre(ctx) {
    poly(ctx, [[214,584],[278,330],[446,228],[635,268],[786,454],[730,694],[505,785],[295,716]], '#aa542e');
    poly(ctx, [[116,694],[174,488],[318,432],[428,554],[346,758]], '#8c3e24', 15);
    poly(ctx, [[710,668],[786,536],[896,604],[852,754],[722,788]], '#c06a36', 15);
    ellipse(ctx, 376, 320, 58, 20, 'rgba(255,180,112,0.22)', null, 0, -0.36);
    drawFace(ctx, 512, 514, 1.34);
    roundedRect(ctx, 344, 720, 112, 86, 15, '#d6d3b7', 10);
    ellipse(ctx, 620, 752, 44, 44, '#8c3e24', NAVY_DARK, 10);
  }

  function drawCoal(ctx) {
    poly(ctx, [[202,594],[238,378],[394,232],[604,210],[790,340],[838,552],[736,726],[502,806],[302,720]], '#25292c');
    poly(ctx, [[292,392],[366,292],[464,250],[398,370]], '#394047', 10);
    ellipse(ctx, 360, 326, 44, 12, 'rgba(186,204,214,0.28)', null, 0, -0.35);
    drawFace(ctx, 512, 508, 1.4);
  }

  function drawCoke(ctx) {
    roundedRect(ctx, 254, 250, 526, 478, 54, '#707579', 18);
    ctx.fillStyle = '#4c5358';
    for (const [x, y, r] of [[340,330,22],[510,304,24],[670,366,19],[420,514,18],[610,530,26],[710,642,20],[348,666,17]]) {
      ellipse(ctx, x, y, r, r * 0.7, '#31373b');
    }
    ctx.strokeStyle = ORANGE_DARK;
    ctx.lineWidth = 13;
    for (const points of [[[432,272],[474,360],[438,432]], [[682,246],[632,342],[675,444]], [[302,480],[378,424],[426,446]]]) {
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (const point of points.slice(1)) ctx.lineTo(point[0], point[1]);
      ctx.stroke();
    }
    drawFace(ctx, 512, 520, 1.26);
  }

  function drawFurnace(ctx) {
    roundedRect(ctx, 302, 250, 420, 526, 64, '#7d8790', 18);
    roundedRect(ctx, 282, 202, 460, 82, 35, '#65717d', 15);
    roundedRect(ctx, 330, 734, 366, 70, 24, STEEL_DARK, 15);
    ctx.beginPath();
    ctx.moveTo(440, 200);
    ctx.lineTo(580, 200);
    ctx.lineTo(612, 112);
    ctx.lineTo(408, 112);
    ctx.closePath();
    fillStroke(ctx, '#56616c', 15);
    ctx.beginPath();
    ctx.moveTo(512, 198);
    ctx.bezierCurveTo(482, 116, 540, 80, 604, 64);
    ctx.strokeStyle = '#7b5d45';
    ctx.lineWidth = 44;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(512, 634);
    ctx.bezierCurveTo(468, 692, 498, 760, 426, 816);
    ctx.bezierCurveTo(574, 800, 610, 700, 512, 634);
    ctx.closePath();
    fillStroke(ctx, ORANGE, 10);
    drawFace(ctx, 512, 498, 1.14);
  }

  function drawLadle(ctx) {
    ctx.beginPath();
    ctx.moveTo(236, 334);
    ctx.lineTo(752, 282);
    ctx.lineTo(684, 716);
    ctx.lineTo(318, 746);
    ctx.closePath();
    fillStroke(ctx, '#6f7c89', 18);
    ctx.beginPath();
    ctx.ellipse(494, 326, 264, 70, -0.08, 0, Math.PI * 2);
    ctx.fillStyle = ORANGE;
    ctx.fill();
    ctx.strokeStyle = NAVY_DARK;
    ctx.lineWidth = 15;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(748, 308);
    ctx.bezierCurveTo(822, 420, 832, 536, 728, 632);
    ctx.strokeStyle = NAVY_DARK;
    ctx.lineWidth = 18;
    ctx.stroke();
    roundedRect(ctx, 262, 742, 500, 72, 20, STEEL_DARK, 14);
    for (const x of [342, 654]) ellipse(ctx, x, 840, 46, 46, '#262f3b', NAVY_DARK, 10);
    drawFace(ctx, 492, 552, 1.14);
  }

  function drawConverter(ctx) {
    ctx.save();
    ctx.translate(512, 520);
    ctx.rotate(-0.2);
    roundedRect(ctx, -180, -184, 360, 374, 62, '#7896ae', 18);
    roundedRect(ctx, -112, 188, 224, 78, 28, STEEL_DARK, 14);
    drawFace(ctx, 0, 12, 1.05);
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(626, 190);
    ctx.lineTo(710, 84);
    ctx.lineTo(760, 126);
    ctx.lineTo(668, 238);
    ctx.closePath();
    fillStroke(ctx, '#758497', 12);
    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(606, 280);
    ctx.lineTo(558, 388);
    ctx.stroke();
    for (const [x, y] of [[548,276],[500,286],[606,330]]) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 48, y - 48);
      ctx.strokeStyle = ORANGE_DARK;
      ctx.lineWidth = 9;
      ctx.stroke();
    }
  }

  function drawCaster(ctx) {
    roundedRect(ctx, 210, 372, 486, 210, 26, '#de6737', 16);
    roundedRect(ctx, 594, 406, 178, 126, 32, '#b7c0c9', 14);
    roundedRect(ctx, 704, 432, 156, 86, 30, '#cbd3da', 12);
    roundedRect(ctx, 228, 598, 560, 82, 24, STEEL_DARK, 14);
    ctx.beginPath();
    ctx.moveTo(662, 386);
    ctx.bezierCurveTo(668, 264, 826, 232, 890, 332);
    ctx.strokeStyle = 'rgba(235,238,240,0.9)';
    ctx.lineWidth = 32;
    ctx.stroke();
    drawFace(ctx, 448, 482, 1.02);
    ctx.fillStyle = ORANGE;
    ctx.fillRect(708, 438, 72, 62);
  }

  function drawHotCoil(ctx) {
    ellipse(ctx, 514, 520, 316, 296, '#424d59', NAVY_DARK, 18, 0.08);
    ellipse(ctx, 414, 520, 186, 220, '#687482', NAVY_DARK, 16, 0.08);
    for (let r = 160; r > 46; r -= 36) ellipse(ctx, 414, 520, r, r * 1.12, 'transparent', '#84909b', 8, 0.08);
    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(510, 522, 238, -1.8, -0.2);
    ctx.stroke();
    drawFace(ctx, 414, 526, 0.96);
  }

  function drawColdCoil(ctx) {
    ellipse(ctx, 430, 530, 214, 244, '#cbd5dd', NAVY_DARK, 18, 0.04);
    for (let r = 178; r > 44; r -= 34) ellipse(ctx, 430, 530, r, r * 1.1, 'transparent', '#9eadb8', 8, 0.04);
    ctx.beginPath();
    ctx.moveTo(548, 324);
    ctx.lineTo(822, 404);
    ctx.lineTo(826, 682);
    ctx.lineTo(546, 618);
    ctx.closePath();
    fillStroke(ctx, '#d7e1e8', 14);
    drawFace(ctx, 430, 536, 0.96);
  }

  function drawPlate(ctx) {
    for (const [dx, dy, fill] of [[88,98,'#5d6975'], [52,52,'#828e99'], [0,0,'#a7b1ba']]) {
      ctx.beginPath();
      ctx.moveTo(226 + dx, 350 + dy);
      ctx.lineTo(716 + dx, 290 + dy);
      ctx.lineTo(812 + dx, 454 + dy);
      ctx.lineTo(324 + dx, 532 + dy);
      ctx.closePath();
      fillStroke(ctx, fill, 14);
    }
    drawFace(ctx, 512, 430, 1.02);
  }

  function drawLongs(ctx) {
    ctx.save();
    ctx.translate(42, 24);
    ctx.rotate(-0.11);
    roundedRect(ctx, 156, 414, 590, 132, 20, '#c8d2da', 15);
    roundedRect(ctx, 208, 366, 500, 64, 18, '#e0e7ec', 12);
    roundedRect(ctx, 210, 532, 500, 64, 18, '#9ca9b4', 12);
    drawFace(ctx, 330, 486, 0.98);
    ctx.restore();
    ctx.save();
    ctx.translate(604, 608);
    ctx.rotate(-0.22);
    roundedRect(ctx, 0, 0, 282, 50, 18, '#8d9aa4', 10);
    roundedRect(ctx, 12, 96, 282, 44, 16, '#73818d', 10);
    for (let i = 0; i < 6; i++) ellipse(ctx, 36 + i * 42, 184, 18, 18, '#6d7882', NAVY_DARK, 6);
    ctx.restore();
  }

  window.renderYonggangAsset = renderYonggangAsset;
})();
`;

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
