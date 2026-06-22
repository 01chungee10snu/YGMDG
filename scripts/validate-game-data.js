const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const dataSource = fs.readFileSync(path.join(root, 'data/game-data.js'), 'utf8');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(dataSource, context);

const data = context.window.YONGGANG_GAME_DATA;
const expectedScores = [20, 40, 90, 200, 430, 990, 2175, 4865, 10750, 24575, 56320, 135170];

if (!data || !Array.isArray(data.tiers)) throw new Error('YONGGANG_GAME_DATA.tiers is missing');
if (data.tiers.length !== expectedScores.length) throw new Error(`expected ${expectedScores.length} tiers, got ${data.tiers.length}`);

data.tiers.forEach((tier, index) => {
  if (tier.score !== expectedScores[index]) {
    throw new Error(`${tier.id} score expected ${expectedScores[index]}, got ${tier.score}`);
  }
  if (!(Number.isFinite(tier.radius) && tier.radius > 0)) {
    throw new Error(`${tier.id} radius must be a positive number`);
  }
  if (!(Number.isFinite(tier.density) && tier.density > 0)) {
    throw new Error(`${tier.id} density must be a positive number`);
  }
  if (index > 0) {
    const prev = data.tiers[index - 1];
    if (!(tier.radius > prev.radius)) {
      throw new Error(`${tier.id} radius ${tier.radius} must be greater than ${prev.id} radius ${prev.radius}`);
    }
    const prevNominalMass = Math.PI * prev.radius * prev.radius * prev.density;
    const nominalMass = Math.PI * tier.radius * tier.radius * tier.density;
    if (!(nominalMass > prevNominalMass)) {
      throw new Error(`${tier.id} nominal mass ${nominalMass.toFixed(4)} must be greater than ${prev.id} nominal mass ${prevNominalMass.toFixed(4)}`);
    }
    if (!(tier.density >= prev.density * 0.75)) {
      throw new Error(`${tier.id} density ${tier.density} dropped too sharply from ${prev.id} density ${prev.density}`);
    }
  }
});

if (!data.physics || data.physics.radiusPolicy !== 'strictly-increasing-tier-radius') {
  throw new Error('physics.radiusPolicy must be strictly-increasing-tier-radius');
}
if (data.physics.massPolicy !== 'strictly-increasing-nominal-mass') {
  throw new Error(`physics.massPolicy expected strictly-increasing-nominal-mass, got ${data.physics.massPolicy}`);
}
if (data.physics.renderScale !== 1) {
  throw new Error(`physics.renderScale expected 1, got ${data.physics.renderScale}`);
}

const firstRadius = data.tiers[0].radius;
const lastRadius = data.tiers[data.tiers.length - 1].radius;
if (lastRadius < firstRadius * 6) {
  throw new Error(`final tier radius ${lastRadius} should be at least 6x first tier radius ${firstRadius}`);
}

if (!Array.isArray(data.recipeQuizzes) || data.recipeQuizzes.length < 12) {
  throw new Error('recipeQuizzes must contain at least 12 prompts');
}

data.recipeQuizzes.forEach((quiz, index) => {
  if (!quiz.prompt.includes('____')) throw new Error(`quiz ${index} prompt must include blank marker`);
  if (!quiz.answer || typeof quiz.answer !== 'string') throw new Error(`quiz ${index} answer missing`);
  const expectedTime = [...quiz.answer.replace(/\s/g, '')].length * 3;
  if (quiz.timeLimitSeconds !== expectedTime) {
    throw new Error(`quiz ${index} timeLimitSeconds expected ${expectedTime}, got ${quiz.timeLimitSeconds}`);
  }
});

console.log(`validated ${data.tiers.length} tiers and ${data.recipeQuizzes.length} recipe quizzes`);
