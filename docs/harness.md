# Sujak Maker Game — Harness

## 1. Input Contract
- **User request shape**:
  - target_theme: 수박 → 다른 소재 리테마 (기본값: 보석/젬)
  - platform: 웹(`html/js`) — 고정
  - delivery: 공유 가능한 링크/빌드 — 고정
  - scope: 리테마만 (규칙/레벨/난이도는 원본 유지, 소재/시각만 교체)
  - approval_required: ["theme selection", "deploy target", "public release"]

## 2. Output Contract / Schema
- **Primary deliverable**: 정적 웹 게임 빌드
  - `dist/index.html` — 단일 페이지 진입점
  - `dist/assets/` — 압축된 이미지/오디오
  - `dist/*.js`, `dist/*.css` — 빌드된 에셋
- **Hosting URL**: HTTPS 공유 링크 1개
- **Supporting docs**:
  - `docs/design.md` — 리테마 디자인 가이드라인
  - `docs/harness.md` — 본 문서

## 3. File/Folder Layout
```
/Users/01chungee10/projects/sujak-maker-game/
├── index.html            # 개발용 진입점
├── style.css             # 개발용 스타일
├── package.json          # 스크립트/의존성
├── dist/                 # 프로덕션 빌드 산출물
│   ├── index.html
│   ├── assets/
│   │   ├── images/
│   │   └── sounds/
│   └── *.js/*.css
├── src/                  # 소스
│   ├── main.js
│   ├── drop.js
│   ├── physics.js
│   ├── merge.js
│   └── game.js
└── docs/
    ├── design.md
    └── harness.md
```

## 4. Execution Commands / Tool Calls
- 프로젝트 초기화: `npm init -y`
- 개발 서버: `npx serve .` (검증용)
- 빌드: 아직 번들러 미정 (필요시 terser + rsync 또는 단일 파일 병합)
  - 임시 검증 명령: `cp -r src/ dist/ && cp index.html style.css dist/`
- 배포: GitHub Pages 또는 Vercel
  - 후보: `npx vercel --prod` 또는 GitHub Pages workflow

## 5. Verification Method
- 브라우저 로컬 테스트:
  - `open dist/index.html` 또는 `npx serve dist`
  - 데스크탑/모바일 viewport 정상 렌더링 확인
- 기능 체크리스트:
  1. 상단 아이템 스폰 및 프리뷰
  2. 마우스/터치 드롭
  3. 물리 충돌 및 같은 등급 병합
  4. 점수 증가, 게임오버, 리스타트
  5. UI 오버레이 배치

## 6. Approval Gates
사용자 승인 후 다음 행동을 허용한다.
- **Theme gate**: 리테마 소재/색상/게임 이름 확정
- **Asset gate**: 상업적 사용 가능한 무료 이미지/사운드 사용 여부
- **Deploy gate**: 배포 대상 서비스 선택 + 공개 URL 노출
- **Release gate**: 친구 공유용 링크 전달

## 7. Error Handling / Fallback
- Matter.js 로드 실패 → 로컬 `matter.js` fallback 또는 CDN 재시도
- 이미지 로드 실패 → 색상 사각형 fallback 렌더링
- 호스팅 실패 → GitHub Pages 폴백 또는 로컬 번들 제공
- 저작권/라이선스 문제 발생 시 리테마를 완전히 독창적 에셋으로 전환

## 8. Logging / Memory Update Rules
- 이 프로젝트 작업 기록은 Hermes `memory/cron/`에 저장하지 않는다.
- 진행 로그는 `docs/design.md`와 프로젝트 내 `docs/changelog.md`에만 기록한다.
- 마일스톤 완료 시 아래 상태 파일에 1줄 추가한다:
  - `/Users/01chungee10/projects/sujak-maker-game/docs/state.json` 또는 `docs/changelog.md`
