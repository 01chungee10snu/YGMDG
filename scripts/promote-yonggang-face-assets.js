#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const DEFAULT_CANDIDATE = path.join(root, 'assets/generated/candidates/yonggang-face-refresh-v3');

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
    candidate: DEFAULT_CANDIDATE,
    stamp: timestampStamp()
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--candidate') args.candidate = path.resolve(argv[++i]);
    if (argv[i] === '--stamp') args.stamp = argv[++i];
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  const archiveRoot = path.join(root, `assets/generated/archive-${args.stamp}-pre-yonggang-face-v3`);
  archiveCurrentAssets(archiveRoot);
  promoteCandidates(args.candidate);
  updateManifest(args.candidate);
  console.log(`archived previous assets: ${rel(archiveRoot)}`);
  console.log('promoted yonggang face v3 runtime assets');
}

function archiveCurrentAssets(archiveRoot) {
  fs.mkdirSync(path.join(archiveRoot, 'components'), { recursive: true });
  fs.mkdirSync(path.join(archiveRoot, 'components-orb'), { recursive: true });
  copy('assets/generated/yonggang-mascot.png', path.join(archiveRoot, 'yonggang-mascot.png'));
  copy('assets/generated/value-chain-sprites.png', path.join(archiveRoot, 'value-chain-sprites.png'));
  copy('assets/generated/asset-manifest.json', path.join(archiveRoot, 'asset-manifest.json'));
  for (const file of COMPONENT_FILES) copy(`assets/generated/components/${file}`, path.join(archiveRoot, 'components', file));
  for (const file of ORB_FILES) copy(`assets/generated/components-orb/${file}`, path.join(archiveRoot, 'components-orb', file));
}

function promoteCandidates(candidate) {
  copyAbs(path.join(candidate, 'mascot/yonggang-mascot-v3-selected.png'), path.join(root, 'assets/generated/yonggang-mascot.png'));
  copyAbs(path.join(candidate, 'composited/value-chain-sprites.png'), path.join(root, 'assets/generated/value-chain-sprites.png'));
  for (const file of COMPONENT_FILES) {
    copyAbs(path.join(candidate, 'components', file), path.join(root, 'assets/generated/components', file));
  }
  for (const file of ORB_FILES) {
    copyAbs(path.join(candidate, 'composited/components-orb', file), path.join(root, 'assets/generated/components-orb', file));
  }
  const manifestPath = path.join(candidate, 'job-manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.promotionStatus = 'promoted-runtime-assets';
    manifest.promotedAt = new Date().toISOString();
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
}

function updateManifest(candidate) {
  const manifestPath = path.join(root, 'assets/generated/asset-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.generatedAt = koreaIsoString();
  manifest.theme = 'Yonggang face v3 steel value chain icons with strict Hyundai Steel Yonggang face-reference grammar';
  manifest.modelIntent = 'GPTImaGen-style reference-guided candidate generation with deterministic sprite/orb compositing';
  manifest.reference = 'docs/references/yonggang-character-reference.jpg';
  manifest.candidateManifest = 'assets/generated/candidates/yonggang-face-refresh-v3/job-manifest.json';
  manifest.prompts = Array.from(new Set([
    ...(manifest.prompts || []),
    'docs/asset-prompts/yonggang-face-reference.md',
    'docs/asset-prompts/04-yonggang-face-refresh-v3.md'
  ]));

  updateAsset(manifest, 'assets/generated/yonggang-mascot.png', `${rel(path.join(candidate, 'job-manifest.json'))}#mascot/yonggang-mascot-v3-selected.png`);
  updateAsset(manifest, 'assets/generated/value-chain-sprites.png', `${rel(path.join(candidate, 'job-manifest.json'))}#composited/value-chain-sprites.png`);
  updateAsset(manifest, 'assets/generated/factory-background.png', manifest.assets.find(asset => asset.file === 'assets/generated/factory-background.png')?.sourceUrl);
  manifest.componentSources = COMPONENT_FILES.map(file => ({
    file: `assets/generated/components/${file}`,
    sourceUrl: `${rel(path.join(candidate, 'job-manifest.json'))}#components/${file}`,
    bytes: fs.statSync(path.join(root, 'assets/generated/components', file)).size
  }));
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function updateAsset(manifest, file, sourceUrl) {
  const asset = manifest.assets.find(entry => entry.file === file);
  if (!asset) throw new Error(`manifest asset missing ${file}`);
  asset.sourceUrl = sourceUrl || asset.sourceUrl;
  asset.bytes = fs.statSync(path.join(root, file)).size;
}

function copy(from, to) {
  copyAbs(path.join(root, from), to);
}

function copyAbs(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function timestampStamp() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(now).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}${parts.second}`;
}

function koreaIsoString() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(now).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+09:00`;
}

main();
