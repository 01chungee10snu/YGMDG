# 용강 만들기 하네스 오케스트레이터

## 목표
철광석·석탄·코크스에서 제선공정, 제강공정, 반제품, 열연강판, 형강·봉강, 특수강, 수요산업을 거쳐 최종 생물 `용강`을 만드는 물리 머지 게임을 유지한다.

## 역할
1. **Game Designer**: 밸류체인 순서, 티어 이름, 점수, 난이도, 화면 정보 구조를 관리한다.
2. **Physics Engineer**: Matter.js 중력, 마찰, 반발, 밀도, 게임오버 판정을 조정한다.
3. **Asset Artist**: GPT 이미지 생성물과 캔버스 벡터 렌더링의 스타일 일관성을 관리한다.
4. **Data Engineer**: `data/game-data.js` 스키마와 Google Sheets 기록 스키마를 관리한다.
5. **QA Verifier**: 브라우저 실행, 콘솔 오류, 드롭/머지/게임오버/리스타트 동작을 검증한다.

## 산출물 계약
- `index.html`: 게임 UI와 패널 구조.
- `style.css`: 반응형 레이아웃과 시각 스타일.
- `main.js`: 게임 루프, 물리, 렌더링, 결과 기록.
- `data/game-data.js`: 티어/DB 스키마의 단일 소스.
- `assets/generated/*.png`: GPT 이미지 생성 자산.
- `docs/yonggang-design.md`: 기획/데이터베이스/QA 기준.

## 실행 루프
1. 요구사항을 `docs/yonggang-design.md`에 반영한다.
2. 작은 구현 슬라이스를 만든다.
3. `node --check main.js`로 문법을 확인한다.
4. 로컬 서버를 띄워 브라우저에서 콘솔 오류를 확인한다.
5. 주요 이벤트를 수동 또는 스크립트로 실행해 드롭/머지/리스타트가 작동하는지 확인한다.
6. 실패 시 원인 단위로 수정 후 같은 검증을 재실행한다.

## Google Sheets DB 계약
기록 행 스키마는 다음 순서를 유지한다.
`timestamp, player, score, maxTier, durationMs, mergeCount, quizCorrectCount, quizFailReason`

프런트엔드는 Apps Script Web App endpoint가 `data/game-data.js`의 `googleSheets.endpoint`에 들어오면 POST를 시도하고, 없거나 실패하면 `localStorage`에 fallback 기록을 남긴다.
