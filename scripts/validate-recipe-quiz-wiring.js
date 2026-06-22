const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

const checks = [
  ['main loads recipe quizzes', /const RECIPE_QUIZZES = GAME_DATA\.recipeQuizzes/.test(main)],
  ['quiz blocks drop', /if \(!canDrop \|\| gameOver \|\| quizActive\) return;/.test(main)],
  ['quiz trigger after merge', /shouldTriggerRecipeQuiz\(\)/.test(main) && /setTimeout\(startRecipeQuiz, 180\)/.test(main)],
  ['time limit uses character count and seconds per character', /answerCharCount\(activeQuiz\.answer\)/.test(main) && /RECIPE_RULE\.secondsPerCharacter/.test(main)],
  ['wrong answer causes quiz dead', /failRecipeQuiz\('wrong-answer'\)/.test(main)],
  ['timeout causes quiz dead', /failRecipeQuiz\('timeout'\)/.test(main)],
  ['game over dead title wired', /RECIPE_RULE\.failTitle \|\| 'GAME OVER DEAD'/.test(main)],
  ['records quizCorrectCount', /quizCorrectCount/.test(main) && /quizFailReason/.test(main)],
  ['html overlay exists', /id="recipe-quiz-overlay"/.test(html) && /id="recipe-quiz-input"/.test(html)],
  ['css overlay styles exist', /#recipe-quiz-overlay/.test(css) && /#recipe-quiz-timer/.test(css)]
];

const failed = checks.filter(([, pass]) => !pass);
if (failed.length) {
  for (const [name] of failed) console.error(`FAIL ${name}`);
  process.exit(1);
}
console.log(`validated ${checks.length} recipe quiz wiring checks`);
