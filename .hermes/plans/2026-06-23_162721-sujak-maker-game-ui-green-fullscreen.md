# sujak-maker-game UI 친환경 풀스크린 개편 구현 계획

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task. TTAK 방식으로 각 슬라이스 구현 → 검증 → 실패 원인 수정 루프를 돌리고, 인간 판단이 필요한 비주얼/UX 승인 지점에서 멈춘다.

**Goal:** 우상단 NEXT를 숨기고, 게임 화면을 화면 가득 채우는 친환경 테마로 재구성하며, 12단계 위계/정보 모달/최초 안내 팝업/퀴즈 시간 2.5초 규칙을 반영한다.

**Architecture:** 기존 정적 웹 구조(`index.html`, `style.css`, `main.js`, `data/game-data.js`)를 유지한다. 사이드 패널의 `evolution-chart`를 게임 컨테이너 최상단의 가로/반응형 위계 바와 정보 모달 컨텐츠로 재사용하고, 안내 팝업은 첫 방문 세션 플래그로 제어한다.

**Tech Stack:** HTML/CSS/Vanilla JS, Matter.js, Playwright smoke test, `node --check`.

---

## 현재 구조 요약

- `index.html`
  - `#header`: `#score-box`, `#title-box`, `#next-box`가 3열 구조.
  - `#canvas-wrap`: canvas + quiz/gameover overlay.
  - `#info-panel`: mascot/evolution-chart/sprite/factory/db 카드가 우측 aside.
- `main.js`
  - `RECIPE_RULE.secondsPerCharacter` 기본값 3.
  - `startRecipeQuiz()`가 `timeLimitSeconds || charCount * secondsPerCharacter`로 시간 계산하고 help 문구도 `× 3초` 하드코딩.
  - `updateNextPreview()`는 `#next-preview`에 NEXT 텍스트를 계속 갱신.
  - `renderEvolutionChart()`는 `#evolution-chart`에 12단계 차트를 렌더.
- `style.css`
  - `#app-shell`이 2열 grid, 게임 폭 420px 중심.
  - 다크/철강/용광로 색감 중심 배경.
- `data/game-data.js`
  - `recipeQuiz.secondsPerCharacter: 3`.
  - 일부 quiz는 개별 `timeLimitSeconds`가 있어 전역 2.5초 규칙과 충돌 가능.

---

## 구현 슬라이스

### Slice 1: HTML 정보구조 재배치 — 상단 12단계 바, 정보 버튼, 최초 안내 팝업 뼈대

**Objective:** 12단계 위계를 게임 화면 최상단에 보이게 하고, 정보/도움말 모달을 위한 DOM을 추가한다.

**Files:**
- Modify: `index.html`

**Changes:**
1. `#game-container` 내부 `#header`보다 위에 `#top-hierarchy` 추가.
   - 내부에 `div#evolution-chart`를 배치해 기존 `renderEvolutionChart()`를 그대로 사용.
   - 예: `<div id="top-hierarchy" class="hud-panel"><div class="hierarchy-title"><span class="label">12 STEP VALUE CHAIN</span><button id="info-btn" ...>information</button></div><div id="evolution-chart"></div></div>`
2. `#next-box`는 DOM 제거 또는 `hidden aria-hidden="true"` 처리.
   - 구현 안전성 때문에 1차는 `hidden` 처리하고, `updateNextPreview()`가 없어도 오류 없도록 Slice 3에서 방어.
3. `#info-panel`의 FLOW 카드는 제거하거나 보조 패널에서 제외. 게임 화면 가득 채우기 목적상 aside 전체를 숨기거나 아래쪽 보조 정보로 내려도 됨.
4. `body` 끝에 다음 모달 2개 추가:
   - `#info-modal.hidden` : 12단계 위계 설명 모달. `#info-modal-list`에 JS로 티어 설명 주입.
   - `#intro-overlay.hidden` : 최초 접속 게임 목표/플레이 방법 안내. “시작하기” 버튼 `#intro-start-btn` 포함.
5. 접근성 속성:
   - 모달: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.
   - 버튼: `aria-controls`, 닫기 버튼 `type="button"`.

**Acceptance:**
- `#evolution-chart`가 `#game-container` 내부 최상단에 존재.
- `#next-box`는 화면/접근성 트리에서 숨김.
- `#info-btn`, `#info-modal`, `#intro-overlay` DOM 존재.

---

### Slice 2: CSS 레이아웃 — 풀스크린 게임, 친환경 배경, 반응형 위계 바

**Objective:** 게임 영역이 뷰포트를 최대한 채우고 전체 배경을 친환경 분위기로 변경한다.

**Files:**
- Modify: `style.css`

**Changes:**
1. 친환경 토큰 추가/교체:
   - `--forest: #0f3d2e`, `--leaf: #3fbf73`, `--mint: #b9f6ca`, `--earth: #6b4f2a`, `--sky: #d7f8e8` 등.
   - `body` background를 숲/잎/햇살 느낌 radial + linear gradient로 변경.
2. 풀스크린 레이아웃:
   - `body { min-height: 100dvh; padding: clamp(6px, 1.5vw, 16px); align-items: stretch; }`
   - `#app-shell { width: min(100%, 1280px); min-height: calc(100dvh - ...); grid-template-columns: minmax(320px, 1fr); }`
   - `#game-container { width: min(100%, 720px); justify-self: center; display: grid; grid-template-rows: auto auto 1fr; }`
3. canvas 표시 크기 확대:
   - 내부 물리 좌표(`CANVAS_W=420`, `CANVAS_H=640`)는 유지하고 CSS만 `#game-canvas { width: min(100%, calc((100dvh - 상단UI높이) * 420 / 640)); height: auto; aspect-ratio: 420 / 640; }`로 확장.
   - `#canvas-wrap`도 동일 폭으로 중앙 정렬.
4. `#header` 2열/중앙 구조로 단순화:
   - `grid-template-columns: 96px 1fr;` 또는 score + title만.
   - `#next-box { display:none !important; }`.
5. 12단계 바 스타일:
   - `#top-hierarchy`를 sticky/top 카드처럼 표시.
   - `#evolution-chart { display: grid; grid-template-columns: repeat(12, minmax(56px, 1fr)); overflow-x: auto; }`
   - `.chart-item`는 세로 compact 카드(아이콘, 번호, 이름)로 축소. 모바일은 horizontal scroll 유지.
6. 모달/인트로 스타일:
   - 공통 `.modal-backdrop` 또는 `#info-modal, #intro-overlay`를 fixed inset overlay.
   - 카드 폭 `min(720px, 92vw)`, max-height `86dvh`, scroll.
   - 친환경 CTA 버튼(leaf gradient).
7. 기존 aside 처리:
   - 풀스크린 우선 요구에 따라 `#info-panel { display:none; }` 또는 `details`형 하단으로 이동. 추천: 일단 숨김, DB 상태는 header/작은 footer로 필요 시 유지.

**Acceptance:**
- 데스크톱/모바일 모두 게임 캔버스가 기존 420px 고정폭보다 크게/가득 보임.
- NEXT 영역이 보이지 않음.
- 12단계가 화면 최상단에 순서대로 표시되고 모바일에서 가로 스크롤로 접근 가능.
- 전체 배경 색감이 철강 다크에서 친환경 녹색 계열로 변경됨.

---

### Slice 3: JS UI 동작 — 정보 모달, 최초 안내 팝업, NEXT 방어, 위계 설명 렌더

**Objective:** 새 UI 버튼/모달을 동작시키고 숨겨진 NEXT 때문에 런타임 오류가 나지 않게 한다.

**Files:**
- Modify: `main.js`

**Changes:**
1. `init()`에 `setupInfoModal(); setupIntroOverlay();` 호출 추가.
2. `updateNextPreview()` 방어:
   ```js
   function updateNextPreview() {
     const el = document.getElementById('next-preview');
     if (!el) return;
     const t = TIERS[nextTier];
     el.textContent = `${t.icon} ${t.name}`;
   }
   ```
3. `renderEvolutionChart()` 확장:
   - 각 `.chart-item`에 `aria-label`, `title`, 단계 번호(`i + 1`) 포함.
   - 모달 리스트에서도 같은 데이터 사용 가능하게 `createTierDescriptionItem(t, i)` 헬퍼 분리 권장.
4. `setupInfoModal()` 구현:
   - `#info-btn` click → `#info-modal.hidden` 제거.
   - `#info-modal-close` 및 backdrop click/Escape → 닫기.
   - `#info-modal-list`에 `TIERS`의 `name`, `stage`, `desc`를 1~12 순서대로 렌더.
5. `setupIntroOverlay()` 구현:
   - 최초 접속 시 표시. 기준은 `sessionStorage.getItem('yonggang:introSeen')` 추천(새 브라우저 세션마다 한 번); 영구 1회가 요구되면 `localStorage`로 변경.
   - `#intro-start-btn` click → 숨김 + storage set.
   - 내용: “목표: 12단계 병합으로 용강 만들기”, “조작: 클릭/터치/←→/Space/Enter”, “퀴즈: 병합 중 레시피 빈칸 입력, 글자당 2.5초, 실패 시 GAME OVER DEAD”.
6. 모달 중 입력 충돌 방지:
   - 안내/정보 모달 열림 상태에서는 canvas click이 뒤로 전달되지 않도록 overlay가 `pointer-events` 점유.
   - Escape 키는 모달 닫기를 우선하고, Space/Enter가 `dropItem()`으로 전달되지 않도록 버튼 focused 상태 처리.

**Acceptance:**
- information 버튼 클릭 시 12단계 설명 모달 표시/닫기 가능.
- 최초 접속 시 안내 레이어 표시, 시작하기 클릭 후 사라짐.
- reload 같은 세션에서는 안내가 다시 뜨지 않음(sessionStorage 기준).
- 콘솔에 `next-preview` null 오류 없음.

---

### Slice 4: 퀴즈 제한시간 2.5초 규칙 정리

**Objective:** 모든 퀴즈 제한시간을 정답 한 글자당 2.5초로 일관 적용한다.

**Files:**
- Modify: `data/game-data.js`
- Modify: `main.js`
- Modify: `index.html`
- Modify: `docs/yonggang-design.md`

**Changes:**
1. `data/game-data.js`:
   - `recipeQuiz.secondsPerCharacter: 2.5`로 변경.
   - 각 `recipeQuizzes`의 `timeLimitSeconds` 제거 권장. 제거하지 않으면 기존 개별 시간이 우선 적용되어 요구사항과 충돌한다.
2. `main.js` `startRecipeQuiz()`:
   - `const secondsPerChar = RECIPE_RULE.secondsPerCharacter ?? 2.5;`
   - `const seconds = charCount * secondsPerChar;`로 개별 `activeQuiz.timeLimitSeconds` 우선권 제거.
   - 소수 시간 표시: help는 `정답 ${charCount}글자 × ${secondsPerChar}초 = ${seconds.toFixed(1)}초`.
3. `index.html` help 초기 문구:
   - `제한시간: 1글자당 2.5초`.
4. `docs/yonggang-design.md` 게임플레이 설명:
   - “정답 글자 수 × 2.5초”로 갱신하고 예시도 `현대제철 4글자 → 10초`로 변경.

**Acceptance:**
- `window.YONGGANG_GAME_DATA.recipeQuiz.secondsPerCharacter === 2.5`.
- `현대제철` 4글자 퀴즈 제한시간이 10.0초로 계산됨.
- 모든 quiz 항목에 `timeLimitSeconds`가 없거나, 있더라도 JS가 무시함.
- 퀴즈 UI 문구에 3초가 남지 않음.

---

### Slice 5: QA/E2E 보강

**Objective:** 요구사항 회귀를 자동 검증한다.

**Files:**
- Modify: `tests/e2e-orb-render.spec.js` 또는 Create: `tests/e2e-ui-refresh.spec.js`
- Optional Modify: `package.json` scripts

**Changes:**
1. 새 UI 테스트 추가 권장(`tests/e2e-ui-refresh.spec.js`):
   - 서버 시작 후 페이지 로드.
   - 콘솔 오류 없음.
   - `#next-box` hidden/display none 검증.
   - `#evolution-chart .chart-item` 12개, 텍스트 순서가 `window.YONGGANG_GAME_DATA.tiers.map(t=>t.name)`와 일치.
   - `#info-btn` 클릭 후 `#info-modal` visible 및 12개 설명 표시.
   - 최초 로드에서 `#intro-overlay` visible, 시작하기 클릭 후 hidden, reload 후 hidden(sessionStorage 유지).
   - `recipeQuiz.secondsPerCharacter` 2.5 검증.
2. 기존 `tests/e2e-orb-render.spec.js`는 canvas 클릭 전에 intro overlay를 닫는 step 추가 필요.
   - 그렇지 않으면 최초 안내 overlay가 canvas 클릭을 막아 드롭 테스트가 실패할 수 있음.
3. `package.json` scripts 개선(optional):
   - 현재 `npm test`는 실패 스텁. `"test": "node --check main.js && node tests/e2e-orb-render.spec.js && node tests/e2e-ui-refresh.spec.js"`로 바꾸면 검증 명령 단순화.

**Acceptance:**
- `node --check main.js` 통과.
- `node tests/e2e-orb-render.spec.js` 통과(인트로 닫기 반영 후).
- `node tests/e2e-ui-refresh.spec.js` 통과.
- 브라우저 smoke에서 콘솔 오류 없음.

---

## 파일별 변경 요약

### `index.html`
- Add: `#top-hierarchy`, `#info-btn`.
- Move/keep: `#evolution-chart`를 게임 화면 최상단으로 이동.
- Hide/remove: `#next-box`.
- Add: `#info-modal`, `#intro-overlay`.
- Update: quiz help text `1글자당 2.5초`.

### `style.css`
- Replace: dark steel background → eco/forest gradients.
- Refactor: `#app-shell`, `#game-container`, `#canvas-wrap`, `#game-canvas` full viewport responsive sizing.
- Refactor: header grid without NEXT.
- Add: top hierarchy bar styling, horizontal 12-step compact cards.
- Add: modal/intro overlay styling.
- Hide/reposition: `#info-panel` so game dominates screen.

### `main.js`
- Add: `setupInfoModal()`, `setupIntroOverlay()`, modal close helpers.
- Modify: `init()` setup calls.
- Modify: `updateNextPreview()` null guard.
- Modify: `renderEvolutionChart()` richer sequential/accessibility markup.
- Modify: quiz timing calculation and help text for 2.5 sec/char.

### `data/game-data.js`
- Modify: `recipeQuiz.secondsPerCharacter` 3 → 2.5.
- Remove or ignore: per-question `timeLimitSeconds` to satisfy global per-character rule.
- Bump: `version` to a new string, e.g. `2.3.0-eco-ui` for cache/live update.

### `docs/yonggang-design.md`
- Update: gameplay section for top 12-step hierarchy, info modal, intro popup, eco theme, NEXT hidden.
- Update: quiz limit examples to 2.5 sec/char.
- Update: validation criteria.

### `tests/e2e-orb-render.spec.js`
- Modify: dismiss intro overlay before canvas interaction.

### `tests/e2e-ui-refresh.spec.js` (recommended new)
- Add UI-specific acceptance checks listed above.

---

## 검증 기준 체크리스트

### Static
- [ ] `node --check main.js` exits 0.
- [ ] No `3초` stale text remains in `index.html`, `main.js`, `data/game-data.js`, `docs/yonggang-design.md` except historical notes if intentionally retained.
- [ ] `data/game-data.js` has `secondsPerCharacter: 2.5` and version bumped.

### Browser smoke
- [ ] Page title loads as `용강 만들기`.
- [ ] No console errors/page errors.
- [ ] NEXT preview/icon/card is not visible.
- [ ] 12 hierarchy cards appear at the top in order.
- [ ] Canvas is centered and fills available viewport more than before.
- [ ] Eco background visible behind game.
- [ ] Intro overlay appears on first session load and explains goal/how-to-play.
- [ ] Start button closes intro overlay.
- [ ] Information button opens a modal with 12 tier descriptions.
- [ ] Modal closes via close button, backdrop, and Escape.

### Gameplay regression
- [ ] Canvas click/touch/keyboard drops objects after intro close.
- [ ] Same tier merge increments score.
- [ ] Quiz opens at configured merge cadence.
- [ ] Quiz timer uses `answerCharCount(answer) * 2.5` seconds.
- [ ] Wrong answer/timeout still triggers `GAME OVER DEAD` and answer-filled recipe text.
- [ ] Restart clears overlays and resumes play.

---

## TTAK 자동 루프 운영

1. **논리모순 확인:** `timeLimitSeconds` 개별 값과 전역 2.5초 요구가 충돌하므로 전역 규칙 우선으로 결정한다.
2. **선후관계:** DOM 구조 → CSS 레이아웃 → JS 동작 → 데이터/문서 → 테스트 순서로 진행한다.
3. **자동 루프:** 각 Slice 후 `node --check main.js` + 관련 Playwright test를 실행하고 실패 시 같은 Slice 범위에서 원인 수정 후 재검증한다.
4. **인간 판단 정지점:** 친환경 배경의 최종 미감, 12단계 바의 밀도/가독성, 최초 안내 문구 톤은 구현 스모크 통과 후 스크린샷을 제시하고 사용자 승인 대기.

---

## 리스크 및 주의사항

- Intro overlay 추가 후 기존 E2E의 canvas click이 막힐 수 있으므로 테스트에서 먼저 닫아야 한다.
- `#info-panel`을 완전히 숨기면 `#db-status`, `#app-version-status`가 안 보여도 JS는 존재해야 한다. DOM을 제거하지 말거나 JS null guard를 추가한다.
- `#evolution-chart` ID는 하나만 유지해야 `renderEvolutionChart()`가 의도한 위치에 렌더된다.
- CSS로 canvas를 키워도 Matter 좌표는 420×640 그대로이므로 입력 좌표 변환(`getCanvasX`)은 기존 로직과 호환된다.
- 모바일에서 12개 카드를 모두 한 줄에 넣으면 너무 작아질 수 있으므로 horizontal scroll을 기본으로 둔다.
