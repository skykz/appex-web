/**
 * Google Apps Script — заявки с лендинга в одну Google Таблицу.
 *
 * Две отдельные таблицы (Appex и Tech Orda):
 * - Создайте две Google Таблицы (или по одной на продукт).
 * - В КАЖДОЙ таблице: Расширения → Apps Script → вставьте ЭТОТ ЖЕ код → своё развёртывание «Веб-приложение».
 * - У каждой таблицы будет свой URL …/exec — не смешивайте их.
 *
 * Куда вставить URL в репозитории:
 * - appex-main.html  → переменная APPEX_LANDING_LEADS_WEBAPP_URL (таблица Appex KZ).
 * - appexlab-techorda-updated.html → TECHORDA_LANDING_LEADS_WEBAPP_URL (таблица Tech Orda).
 *
 * Развёртывание: Новое развертывание → Веб-приложение → выполнять «Я» → доступ «Все».
 *
 * Данные заявки: { submittedAt, fullname, phone, city, source } — в теле как JSON внутри поля data (x-www-form-urlencoded) или сырой JSON в postData.
 *
 * Тело может быть:
 * - application/x-www-form-urlencoded с полем data=… (JSON) — без CORS preflight в браузере;
 * - application/json (legacy) — из Postman/сервера.
 */
function doPost(e) {
  try {
    var data = parseLeadPayload_(e);
    var fullname = String(data.fullname || '').trim();
    var phone = String(data.phone || '').trim();
    var city = String(data.city || '').trim();
    var source = String(data.source || '').trim();
    var submittedAt = String(data.submittedAt || new Date().toISOString());

    if (!fullname || !phone || !city) {
      return jsonOut({ ok: false, error: 'missing fields' });
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    ensureHeaderRow_(sheet);
    sheet.appendRow([submittedAt, fullname, phone, city, source]);

    return jsonOut({ ok: true });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

/**
 * Извлекает объект заявки из doPost: сначала form-поле data (лендинг в браузере), иначе JSON в postData.
 */
function parseLeadPayload_(e) {
  if (!e) throw new Error('empty event');
  if (e.parameter && e.parameter.data) {
    return JSON.parse(String(e.parameter.data));
  }
  if (e.postData && e.postData.contents) {
    return JSON.parse(e.postData.contents);
  }
  throw new Error('empty body');
}

/**
 * Добавляет строку заголовков в первую строку, если лист новый; иначе вставляет строку сверху, если заголовков ещё нет.
 */
function ensureHeaderRow_(sheet) {
  var header = ['Submitted at', 'Full name', 'Phone', 'City', 'Source'];
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 5).setValues([header]);
    sheet.setFrozenRows(1);
    return;
  }
  var a1 = String(sheet.getRange(1, 1).getValue() || '');
  if (a1 !== 'Submitted at') {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, 5).setValues([header]);
    sheet.setFrozenRows(1);
  }
}

/**
 * JSON-ответ для веб-приложения.
 */
function jsonOut(obj) {
  var out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}
