function doGet() {
  return jsonResponse({ ok: true, message: 'Web App activa.' });
}

function doPost(e) {
  try {
    if (!e) {
      return jsonResponse({ ok: false, message: 'Solicitud vacia.' });
    }

    var raw = '';
    if (e.postData && e.postData.contents) {
      raw = e.postData.contents;
    }

    if (raw && raw.indexOf('payload=') === 0) {
      raw = decodeURIComponent(raw.substring(8));
    }

    if ((!raw || raw === '') && e.parameter && e.parameter.payload) {
      raw = e.parameter.payload;
    }

    if (!raw || raw === '') {
      return jsonResponse({ ok: false, message: 'Solicitud sin cuerpo.' });
    }

    var payload = JSON.parse(raw);
    var action = payload.action || '';

    if (action === 'saveScores') {
      var resultScores = saveScores(payload);
      return jsonResponse({ ok: true, message: resultScores.message, rows: resultScores.rows });
    }

    if (action === 'uploadPdf') {
      var resultPdf = uploadPdf(payload);
      return jsonResponse({ ok: true, message: 'PDF guardado en Drive.', fileUrl: resultPdf.fileUrl, fileId: resultPdf.fileId });
    }

    return jsonResponse({ ok: false, message: 'Accion no soportada: ' + action });
  } catch (err) {
    return jsonResponse({ ok: false, message: String(err) });
  }
}

function saveScores(payload) {
  var spreadsheetId = payload.spreadsheetId;
  if (!spreadsheetId) {
    throw new Error('Falta spreadsheetId.');
  }

  var evaluator = payload.evaluator || '';
  var date = payload.date || '';
  var shift = payload.shift || '';
  var residents = payload.residents || [];

  var ss = SpreadsheetApp.openById(spreadsheetId);
  var sheet = ss.getSheetByName('Evaluaciones');
  if (!sheet) {
    sheet = ss.insertSheet('Evaluaciones');
  }

  ensureEvaluacionesHeader_(sheet);

  var rows = [];
  for (var i = 0; i < residents.length; i++) {
    var r = residents[i];
    var s = r.scores || {};
    rows.push([
      new Date(),
      date,
      shift,
      evaluator,
      r.resident || '',
      s.asistencia || '',
      s.dominio || '',
      s.procedimientos || '',
      s.respeto || '',
      s.turnos || '',
      r.percent || '',
      r.completed ? 'SI' : 'NO',
      r.notes || ''
    ]);
  }

  var summary = upsertEvaluacionesRows_(sheet, rows);

  return {
    message: 'Evaluaciones sincronizadas. Nuevas: ' + summary.inserted + ', actualizadas: ' + summary.updated + '.',
    rows: rows.length,
    inserted: summary.inserted,
    updated: summary.updated
  };
}

function ensureEvaluacionesHeader_(sheet) {
  if (sheet.getLastRow() > 0) {
    return;
  }

  sheet.appendRow([
    'Timestamp',
    'Fecha',
    'Turno',
    'Medico',
    'Residente',
    'Asistencia',
    'Dominio',
    'Procedimientos',
    'Respeto',
    'DesempenoTurnos',
    'Porcentaje',
    'Completo',
    'Observaciones'
  ]);
}

function upsertEvaluacionesRows_(sheet, rows) {
  if (!rows.length) {
    return { inserted: 0, updated: 0 };
  }

  var lastRow = sheet.getLastRow();
  var existingIndex = {};
  if (lastRow >= 2) {
    var existingRows = sheet.getRange(2, 1, lastRow - 1, rows[0].length).getValues();
    for (var i = 0; i < existingRows.length; i++) {
      existingIndex[evaluacionKey_(existingRows[i])] = i + 2;
    }
  }

  var inserted = 0;
  var updated = 0;

  for (var j = 0; j < rows.length; j++) {
    var row = rows[j];
    var key = evaluacionKey_(row);
    var targetRow = existingIndex[key];

    if (targetRow) {
      sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
      updated += 1;
      continue;
    }

    sheet.appendRow(row);
    inserted += 1;
    existingIndex[key] = sheet.getLastRow();
  }

  return { inserted: inserted, updated: updated };
}

function evaluacionKey_(row) {
  return [row[1], row[2], row[3], row[4]].join('||');
}

function uploadPdf(payload) {
  var folderId = payload.folderId;
  var fileName = payload.fileName || 'Rubrica_UCI.pdf';
  var fileBase64 = payload.fileBase64;
  var mimeType = payload.mimeType || 'application/pdf';

  if (!folderId) {
    throw new Error('Falta folderId.');
  }
  if (!fileBase64) {
    throw new Error('Falta fileBase64.');
  }

  // Soporta payload en formato data URL: data:application/pdf;base64,xxxx
  if (fileBase64.indexOf(',') !== -1) {
    fileBase64 = fileBase64.split(',')[1];
  }

  var bytes = Utilities.base64Decode(fileBase64);

  // Verifica firma PDF (%PDF) para evitar archivos corruptos.
  var header = Utilities.newBlob(bytes.slice(0, 4)).getDataAsString();
  if (header !== '%PDF') {
    throw new Error('El archivo recibido no tiene formato PDF valido.');
  }

  var blob = Utilities.newBlob(bytes, mimeType, fileName);
  var folder = DriveApp.getFolderById(folderId);
  var file = folder.createFile(blob);

  return {
    fileId: file.getId(),
    fileUrl: file.getUrl(),
    byteLength: bytes.length
  };
}

function autorizarServicios() {
  var spreadsheetId = '1PaM-2gpIB-HiA59Uw947bNsEfGjIR-8ZdchMzO6wj8w';
  var folderId = '12uLk5DzHQc6H3r_J6S3e5OiyGAGcGq0g';

  SpreadsheetApp.openById(spreadsheetId).getSheets();
  DriveApp.getFolderById(folderId).getName();

  Logger.log('Autorizacion de Sheets y Drive completada.');
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
