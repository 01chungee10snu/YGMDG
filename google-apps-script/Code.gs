/**
 * 용강 만들기 — Google Apps Script 백엔드
 * 플레이어 등록/조회, 게임 결과 기록, 하이스코어 관리
 *
 * 배포: script.google.com → 새 프로젝트 → 이 코드 붙여넣기
 *   → 배포 → 웹앱
 *   → 실행: 나, 액세스: 모든 사용자(익명 포함)
 *   → 배포 후 URL을 game-data.js googleSheets.endpoint 에 입력
 */

const SPREADSHEET_ID = '1bdcRVCFmTrgMUi-CFj28E-AknJjqb8HxHghfyU_XuB8';
const SHEET_PLAYERS = 'Players';
const SHEET_RECORDS = 'GameRecords';

const HEADERS_PLAYERS = ['nickname', 'employeeId', 'highScore', 'totalGames', 'createdAt'];
const HEADERS_RECORDS = ['timestamp', 'nickname', 'employeeId', 'startScore', 'endScore', 'maxTier', 'mergeCount', 'durationMs', 'quizCorrectCount', 'quizFailReason'];

function getSS() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/** 최초 실행 시 시트 초기화 */
function setup() {
  const ss = getSS();
  ensureSheet_(ss, SHEET_PLAYERS, HEADERS_PLAYERS);
  ensureSheet_(ss, SHEET_RECORDS, HEADERS_RECORDS);
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

/** GET — 플레이어 등록/조회 */
function doGet(e) {
  const params = e.parameter || {};
  const action = params.action || '';

  if (action === 'register') {
    return registerPlayer_(params.nickname, params.employeeId);
  }
  if (action === 'leaderboard') {
    return getLeaderboard_();
  }

  return jsonOut_({ status: 'ok', message: '용강 만들기 API' });
}

/** POST — 게임 결과 기록 또는 플레이어 등록 */
function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut_({ status: 'error', message: 'Invalid JSON' });
  }

  if (data.action === 'register') {
    return registerPlayer_(data.nickname, data.employeeId);
  }
  if (data.action === 'recordResult' || data.endScore !== undefined) {
    return recordResult_(data);
  }

  return jsonOut_({ status: 'error', message: 'Unknown action' });
}

/** 플레이어 등록 또는 기존 조회 → 하이스코어 승계 */
function registerPlayer_(nickname, employeeId) {
  if (!nickname || !employeeId) {
    return jsonOut_({ status: 'error', message: 'nickname, employeeId 필요' });
  }
  setup();

  const ss = getSS();
  const sheet = ss.getSheetByName(SHEET_PLAYERS);
  const values = sheet.getDataRange().getValues();
  const rowCount = values.length;

  for (let i = 1; i < rowCount; i++) {
    if (values[i][0] === nickname && String(values[i][1]) === String(employeeId)) {
      return jsonOut_({
        status: 'ok',
        action: 'register',
        isNew: false,
        nickname: nickname,
        employeeId: String(employeeId),
        highScore: Number(values[i][2]) || 0,
        totalGames: Number(values[i][3]) || 0,
        message: '기존 플레이어 기록을 불러왔습니다.'
      });
    }
  }

  // 신규 등록
  sheet.appendRow([nickname, String(employeeId), 0, 0, new Date().toISOString()]);
  return jsonOut_({
    status: 'ok',
    action: 'register',
    isNew: true,
    nickname: nickname,
    employeeId: String(employeeId),
    highScore: 0,
    totalGames: 0,
    message: '신규 플레이어로 등록되었습니다.'
  });
}

/** 게임 결과 기록 + 하이스코어 갱신 */
function recordResult_(data) {
  setup();

  const ss = getSS();

  // 1) GameRecords 시트에 기록
  const recSheet = ss.getSheetByName(SHEET_RECORDS);
  recSheet.appendRow([
    new Date().toISOString(),
    data.nickname || 'unknown',
    String(data.employeeId || ''),
    Number(data.startScore) || 0,
    Number(data.endScore) || 0,
    data.maxTier || '',
    Number(data.mergeCount) || 0,
    Number(data.durationMs) || 0,
    Number(data.quizCorrectCount) || 0,
    data.quizFailReason || ''
  ]);

  // 2) Players 시트의 하이스코어 갱신
  const pSheet = ss.getSheetByName(SHEET_PLAYERS);
  const pValues = pSheet.getDataRange().getValues();
  let isNewHighScore = false;
  let prevHigh = 0;

  for (let i = 1; i < pValues.length; i++) {
    if (pValues[i][0] === data.nickname && String(pValues[i][1]) === String(data.employeeId)) {
      prevHigh = Number(pValues[i][2]) || 0;
      const totalGames = (Number(pValues[i][3]) || 0) + 1;
      const endScore = Number(data.endScore) || 0;
      if (endScore > prevHigh) {
        pSheet.getRange(i + 1, 3).setValue(endScore);   // highScore
        isNewHighScore = true;
      }
      pSheet.getRange(i + 1, 4).setValue(totalGames);    // totalGames
      break;
    }
  }

  return jsonOut_({
    status: 'ok',
    action: 'recordResult',
    endScore: Number(data.endScore) || 0,
    prevHighScore: prevHigh,
    isNewHighScore: isNewHighScore,
    message: isNewHighScore ? '신기록 달성!' : '기록되었습니다.'
  });
}

/** 리더보드 (상위 20) */
function getLeaderboard_() {
  setup();
  const ss = getSS();
  const sheet = ss.getSheetByName(SHEET_PLAYERS);
  const values = sheet.getDataRange().getValues();
  const board = [];
  for (let i = 1; i < values.length; i++) {
    board.push({
      nickname: values[i][0],
      employeeId: String(values[i][1]),
      highScore: Number(values[i][2]) || 0,
      totalGames: Number(values[i][3]) || 0
    });
  }
  board.sort((a, b) => b.highScore - a.highScore);
  return jsonOut_({ status: 'ok', leaderboard: board.slice(0, 20) });
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
