# 용강 만들기 디자인 노트

## 게임 이름
용강 만들기

## 최종 목표 캐릭터
- 이름: 용강
- 설정: 제철 밸류체인의 공정과 제품 흐름으로 태어나는 주황색 생물.
- 외형 기준: 둥근 주황/노랑 얼굴, 진한 남색 외곽선, 위쪽이 움푹 파인 두 봉우리 형태, 작은 물방울, 볼터치, 작은 검은 눈과 입, 파란 작업복 느낌.
- 레퍼런스 반영: `assets/generated/yonggang-mascot.png`.

## 티어 흐름
1. 철광석
2. 석탄
3. 코크스
4. 제선공정
5. 쇳물
6. 제강공정
7. 연주·반제품
8. 열연강판
9. 형강·봉강
10. 특수강·내연
11. 자동차·가전·건물
12. 용강

## 게임플레이
- 같은 티어끼리 충돌하면 다음 티어로 병합된다.
- 최종 목표는 용강 얼굴을 만드는 것이다.
- 물리엔진은 기존보다 높은 반복 계산, 티어별 밀도/마찰/반발 계수를 사용한다.
- 공정 한계선 위에서 안정적으로 오래 정체되면 게임오버가 된다.

## 데이터베이스
- 기본 DB: Google Sheets.
- 생성된 시트: https://docs.google.com/spreadsheets/d/1bdcRVCFmTrgMUi-CFj28E-AknJjqb8HxHghfyU_XuB8/edit
- Spreadsheet ID: `1bdcRVCFmTrgMUi-CFj28E-AknJjqb8HxHghfyU_XuB8`
- 현재 프런트엔드 스키마: `timestamp, player, score, maxTier, durationMs, mergeCount`.
- Sheets endpoint가 없을 때는 `localStorage.yonggang:lastResult`에 fallback 저장한다.

## 이미지 자산
- GPT 이미지 생성 사용.
- 생성 파일:
  - `assets/generated/yonggang-mascot.png`
  - `assets/generated/value-chain-sprites.png`
  - `assets/generated/factory-background.png`

## 검증 기준
- 페이지가 로드되고 제목이 `용강 만들기`로 보인다.
- 콘솔 오류가 없다.
- 캔버스 클릭/터치/키보드로 오브젝트가 떨어진다.
- 같은 티어 병합 시 점수와 티어가 증가한다.
- 용강 티어는 캐릭터 이미지로 렌더링된다.
- 게임오버 후 결과가 로컬 또는 Sheets로 기록된다.
