# 용강 만들기 GPT 이미지 자산 교체 및 전체 QA 리포트

- 최종 갱신: 2026-06-23 01:12:32 KST
- 실행 환경: MacBook / macOS 26.5.1 / Darwin ARM64 / Node v26.3.0 / Python 3.11.15
- 대상 프로젝트: `/Users/01chungee10/Projects/sujak-maker-game`
- 요청 기준: 첨부된 현대제철 캐릭터 레퍼런스의 얼굴 인상(정면, 검은 타원 눈, 작은 눈썹, w형 입, 볼터치, 진한 남색 외곽선)을 용강이 및 나머지 이미지 자산에도 적용

## 품질 개선 반영

이번 전체 품질보증 루프에서 확인한 개선점은 `factory-background.png`가 manifest에는 포함되어 있었지만 런타임 이미지 로딩 검증 목록에는 잡히지 않는다는 점이었습니다. 이를 다음과 같이 수정했습니다.

- `index.html`: `STEEL MILL BACKDROP` 패널을 추가해 `assets/generated/factory-background.png`를 실제 UI에 노출
- `style.css`: `.factory-card img` 스타일을 추가해 배경 이미지를 카드 안에서 안정적으로 표시
- `scripts/validate-assets.js`: `factory-background.png` 예외를 제거해 모든 manifest 자산이 앱/문서에서 참조되는지 검증
- `scripts/qa_playwright.py`: 런타임 QA에서 3개 핵심 이미지가 모두 로딩되는지 `missingExpectedImages`로 강제 검증

## 작업 결과

### 1. 레퍼런스 저장

- 원본 첨부 이미지 저장: `docs/references/yonggang-character-reference.jpg`
- 얼굴 기준 문서 저장: `docs/asset-prompts/yonggang-face-reference.md`

### 2. GPT 이미지 생성 자산

최종 반영 자산은 다음과 같습니다.

- `assets/generated/yonggang-mascot.png`
  - 크기: 1024×1024
  - 상태: 통과
  - 내용: 주황색 용강이 마스코트, 정면 얼굴, 눈·눈썹·입·볼 적용

- `assets/generated/value-chain-sprites.png`
  - 크기: 1024×576
  - 상태: 통과
  - 내용: 12개 GPT 생성 아이콘을 4×3으로 합성한 스프라이트 시트
  - 검증: 모든 칸에 전면 얼굴 요소 확인

- `assets/generated/factory-background.png`
  - 크기: 576×1024
  - 상태: 통과
  - 내용: 제철소 배경, 전면 캐릭터/설비 얼굴 모티프 포함
  - 반영: 정보 패널의 `STEEL MILL BACKDROP` 카드에서 실제 런타임 이미지로 로딩

### 3. 실패한 후보와 조치

스프라이트 시트는 한 장 생성 방식에서 결함이 반복되어 폐기했습니다.

- v2 문제: 15개처럼 과생성, 일부 항목 얼굴 누락
- v3 문제: 4×3이 아니라 5×3에 가까움, 여러 항목 얼굴 누락
- 최종 조치: 12개 아이콘을 각각 GPT 이미지로 생성한 뒤, 1024×576 4×3 시트로 합성

폐기/후보 파일은 `assets/generated/candidates/` 및 `assets/generated/archive-*` 경로에 보존했습니다.

## Manifest

- 갱신 파일: `assets/generated/asset-manifest.json`
- 포함 내용:
  - 최종 3개 자산 경로
  - 기준 레퍼런스 파일
  - 생성 프롬프트 문서
  - 12개 GPT 생성 컴포넌트 소스 URL과 파일 크기

## 검증 결과

### 데이터 계약 검증

명령:

```bash
node scripts/validate-game-data.js
```

결과:

```text
validated 12 tiers and 14 recipe quizzes
```

### 레시피 퀴즈 연결 검증

명령:

```bash
node scripts/validate-recipe-quiz-wiring.js
```

결과:

```text
validated 10 recipe quiz wiring checks
```

### 자산 검증

명령:

```bash
node scripts/validate-assets.js
```

결과:

```text
validated 3 generated assets and manifest entries
```

검증 항목:

- PNG 존재 여부
- 3개 최종 자산 치수
- manifest bytes 일치
- 앱/문서 참조 여부
- 레퍼런스 파일 존재 여부
- 프롬프트 파일 존재 여부
- 12개 GPT 생성 componentSources 존재·치수·bytes 일치

### 문법 검증

명령:

```bash
python3 -m py_compile scripts/qa_playwright.py
node --check main.js
node --check data/game-data.js
node --check scripts/validate-game-data.js
node --check scripts/validate-recipe-quiz-wiring.js
node --check scripts/validate-assets.js
```

결과: 모두 종료코드 0

### MacBook Chrome 런타임 QA

명령:

```bash
python3 scripts/qa_playwright.py > docs/qa-artifacts/playwright-qa-output.json
```

결과 요약:

```json
{
  "title": "용강 만들기",
  "wrongTitle": "GAME OVER DEAD",
  "wrongMessage": "제철 레시피 입력퀴즈 실패. 같은 편의 안전·협업 레시피를 다시 익히십시오.",
  "correctPrompt": "업무지시는 ____하게, 회의는 간결하게.",
  "correctAnswer": "명확",
  "scoreBeforeCorrect": "0",
  "scoreAfterCorrect": "200",
  "timeoutTitle": "GAME OVER DEAD",
  "imageCount": 3,
  "loadedImages": [
    "assets/generated/yonggang-mascot.png",
    "assets/generated/value-chain-sprites.png",
    "assets/generated/factory-background.png"
  ],
  "brokenImages": [],
  "missingExpectedImages": [],
  "badHttpFailures": [],
  "consoleErrorsOrWarnings": [],
  "pageErrors": []
}
```

확인된 기능:

- 페이지 타이틀 정상
- 오답 시 `GAME OVER DEAD`
- 시간초과 시 `GAME OVER DEAD`
- 정답 입력 시 점수 `0 → 200`
- 핵심 이미지 3개 로딩 정상
- manifest 자산이 앱/문서에서 참조됨
- HTTP 실패 없음
- 콘솔 error/warning 없음

## 산출물

- `docs/references/yonggang-character-reference.jpg`
- `docs/asset-prompts/yonggang-face-reference.md`
- `docs/asset-prompts/01-yonggang-mascot.md`
- `docs/asset-prompts/02-value-chain-sprites.md`
- `docs/asset-prompts/02-value-chain-sprites-v2.md`
- `docs/asset-prompts/02-value-chain-sprites-v3.md`
- `docs/asset-prompts/03-factory-background.md`
- `assets/generated/yonggang-mascot.png`
- `assets/generated/value-chain-sprites.png`
- `assets/generated/factory-background.png`
- `assets/generated/components/*.png`
- `assets/generated/asset-manifest.json`
- `scripts/validate-assets.js`
- `scripts/qa_playwright.py`
- `docs/qa-artifacts/playwright-qa-output.json`
- `docs/qa-artifacts/playwright-qa-result.json`
- `docs/qa-artifacts/01-load.png`
- `docs/qa-artifacts/02-wrong-answer-game-over-dead.png`
- `docs/qa-artifacts/03-correct-answer-resume.png`
- `docs/qa-artifacts/04-timeout-game-over-dead.png`
- `docs/qa-artifacts/qa-report-2026-06-22-assets.md`

## 남은 리스크

- GPT 이미지 특성상 산업 오브젝트 정확도는 완전한 CAD/아이콘 규격보다 캐릭터 일관성을 우선합니다.
- 최종 스프라이트 시트는 12개 개별 GPT 이미지의 합성본입니다. “모든 개별 아이콘을 GPT 이미지 기반으로 만들라”는 요구는 충족하지만, 4×3 배열 자체는 합성 처리했습니다.
- 공개 배포 검증은 별도 배포 설정이 없어서 로컬 MacBook QA까지만 수행했습니다.

## 판정

통과입니다. 첨부 캐릭터 기준 얼굴을 반영한 GPT 이미지 자산 교체, manifest 갱신, 실제 UI 반영, 정적 검증, 자산 검증, MacBook Chrome 런타임 QA가 모두 완료됐습니다.
