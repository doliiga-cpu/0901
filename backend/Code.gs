var APP = Object.freeze({
  spreadsheetId: '1A8IQ8LEZKpP4aYzW3xdRF2HQWZbr53cA7RqtOH53U3Y',
  usersSheet: 'Users',
  sessionsSheet: 'Sessions',
  sessionDays: 1,
  rememberDays: 30,
  maxLoginFailures: 5,
  loginBlockSeconds: 300
});

var USER_HEADERS = [
  'id', 'createdAt', 'name', 'handle', 'email',
  'passwordSalt', 'passwordHash', 'status'
];
var SESSION_HEADERS = [
  'tokenHash', 'userId', 'createdAt', 'expiresAt'
];

function doGet() {
  return json_({
    ok: true,
    service: 'SIDE NOTE Auth API',
    message: 'POST 요청을 사용하세요.'
  });
}

function doPost(e) {
  try {
    var action = String((e && e.parameter && e.parameter.action) || '').toLowerCase();
    var payloadText = (e && e.parameter && e.parameter.payload) || '{}';
    var payload = JSON.parse(payloadText);

    if (action === 'signup') return json_(signup_(payload));
    if (action === 'login') return json_(login_(payload));
    if (action === 'session') return json_(getSession_(payload));
    if (action === 'logout') return json_(logout_(payload));
    throw new Error('지원하지 않는 요청입니다.');
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return json_({ ok: false, error: safeError_(error) });
  }
}

function setup() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    getPepper_();
    getSheet_(APP.usersSheet, USER_HEADERS);
    getSheet_(APP.sessionsSheet, SESSION_HEADERS);
    return '인증용 Users, Sessions 시트와 서버 비밀키가 준비되었습니다.';
  } finally {
    lock.releaseLock();
  }
}

function signup_(input) {
  var name = clean_(input.name);
  var handle = clean_(input.handle).toLowerCase();
  var email = clean_(input.email).toLowerCase();
  var password = String(input.password || '');

  if (input.terms !== true) throw new Error('이용약관에 동의해 주세요.');
  if (name.length < 2 || name.length > 40) throw new Error('이름은 2~40자로 입력해 주세요.');
  if (!/^[a-z0-9_]{3,20}$/.test(handle)) throw new Error('사용자 이름은 영문, 숫자, 밑줄로 3~20자여야 합니다.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error('올바른 이메일을 입력해 주세요.');
  if (password.length < 8 || password.length > 128 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error('비밀번호는 영문과 숫자를 포함해 8~128자로 입력해 주세요.');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = getSheet_(APP.usersSheet, USER_HEADERS);
    var users = rowsAsObjects_(sheet, USER_HEADERS);
    if (users.some(function (user) { return String(user.email).toLowerCase() === email; })) {
      throw new Error('이미 가입된 이메일입니다.');
    }
    if (users.some(function (user) { return String(user.handle).toLowerCase() === handle; })) {
      throw new Error('이미 사용 중인 사용자 이름입니다.');
    }

    var salt = newToken_();
    appendTextRow_(sheet, [
      Utilities.getUuid(),
      new Date().toISOString(),
      name,
      handle,
      email,
      salt,
      passwordHash_(password, salt),
      'active'
    ]);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function login_(input) {
  var email = clean_(input.email).toLowerCase();
  var password = String(input.password || '');
  var rateKey = 'login:' + sha256_(email).slice(0, 32);
  var cache = CacheService.getScriptCache();
  var failures = Number(cache.get(rateKey) || 0);
  if (failures >= APP.maxLoginFailures) {
    throw new Error('로그인 시도가 너무 많습니다. 5분 뒤 다시 시도해 주세요.');
  }

  var users = rowsAsObjects_(getSheet_(APP.usersSheet, USER_HEADERS), USER_HEADERS);
  var user = users.find(function (item) {
    return String(item.email).toLowerCase() === email && item.status === 'active';
  });
  var suppliedHash = user ? passwordHash_(password, user.passwordSalt) : sha256_(password + ':' + getPepper_());
  if (!user || !constantTimeEqual_(suppliedHash, String(user.passwordHash))) {
    cache.put(rateKey, String(failures + 1), APP.loginBlockSeconds);
    throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
  }
  cache.remove(rateKey);

  var token = newToken_() + newToken_();
  var now = new Date();
  var days = input.remember === true ? APP.rememberDays : APP.sessionDays;
  var expires = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  var sessionSheet = getSheet_(APP.sessionsSheet, SESSION_HEADERS);
  cleanupSessions_(sessionSheet, now);
  appendTextRow_(sessionSheet, [sha256_(token), user.id, now.toISOString(), expires.toISOString()]);

  return {
    ok: true,
    token: token,
    expiresAt: expires.toISOString(),
    user: publicUser_(user)
  };
}

function getSession_(input) {
  var token = String(input.token || '');
  if (token.length < 40) throw new Error('로그인이 필요합니다.');
  var tokenHash = sha256_(token);
  var now = new Date();
  var sessions = rowsAsObjects_(getSheet_(APP.sessionsSheet, SESSION_HEADERS), SESSION_HEADERS);
  var session = sessions.find(function (item) {
    return constantTimeEqual_(String(item.tokenHash), tokenHash) && new Date(item.expiresAt) > now;
  });
  if (!session) throw new Error('로그인 세션이 만료되었습니다.');

  var users = rowsAsObjects_(getSheet_(APP.usersSheet, USER_HEADERS), USER_HEADERS);
  var user = users.find(function (item) { return item.id === session.userId && item.status === 'active'; });
  if (!user) throw new Error('사용자 정보를 찾을 수 없습니다.');
  return { ok: true, user: publicUser_(user) };
}

function logout_(input) {
  var token = String(input.token || '');
  if (!token) return { ok: true };
  var tokenHash = sha256_(token);
  var sheet = getSheet_(APP.sessionsSheet, SESSION_HEADERS);
  var values = sheet.getDataRange().getDisplayValues();
  for (var row = values.length - 1; row >= 1; row -= 1) {
    if (constantTimeEqual_(String(values[row][0]), tokenHash)) sheet.deleteRow(row + 1);
  }
  return { ok: true };
}

function publicUser_(user) {
  return { id: user.id, name: user.name, handle: user.handle, email: user.email };
}

function getSheet_(name, headers) {
  var spreadsheet = SpreadsheetApp.openById(APP.spreadsheetId);
  var sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  } else {
    var actual = sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
    if (actual.join('|') !== headers.join('|')) throw new Error(name + ' 시트의 헤더가 올바르지 않습니다.');
  }
  return sheet;
}

function rowsAsObjects_(sheet, headers) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues().map(function (row) {
    return headers.reduce(function (result, header, index) {
      result[header] = row[index];
      return result;
    }, {});
  });
}

function appendTextRow_(sheet, values) {
  var row = sheet.getLastRow() + 1;
  sheet.getRange(row, 1, 1, values.length).setNumberFormat('@').setValues([values]);
}

function cleanupSessions_(sheet, now) {
  var values = sheet.getDataRange().getDisplayValues();
  for (var row = values.length - 1; row >= 1; row -= 1) {
    if (new Date(values[row][3]) <= now) sheet.deleteRow(row + 1);
  }
}

function getPepper_() {
  var properties = PropertiesService.getScriptProperties();
  var pepper = properties.getProperty('AUTH_PEPPER');
  if (!pepper) {
    pepper = newToken_() + newToken_();
    properties.setProperty('AUTH_PEPPER', pepper);
  }
  return pepper;
}

function passwordHash_(password, salt) {
  return bytesToHex_(Utilities.computeHmacSha256Signature(
    salt + ':' + password,
    getPepper_(),
    Utilities.Charset.UTF_8
  ));
}

function sha256_(text) {
  return bytesToHex_(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(text),
    Utilities.Charset.UTF_8
  ));
}

function bytesToHex_(bytes) {
  return bytes.map(function (value) {
    var byte = value < 0 ? value + 256 : value;
    return ('0' + byte.toString(16)).slice(-2);
  }).join('');
}

function constantTimeEqual_(left, right) {
  if (left.length !== right.length) return false;
  var difference = 0;
  for (var index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function newToken_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
}

function clean_(value) {
  return String(value || '').trim();
}

function safeError_(error) {
  var message = String(error && error.message ? error.message : '요청을 처리하지 못했습니다.');
  return message.indexOf('Exception:') === 0 ? '서버 설정을 확인해 주세요.' : message;
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
