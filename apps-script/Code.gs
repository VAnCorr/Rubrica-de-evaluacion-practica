function doPost(e) {
	try {
		if (!e) {
			return jsonResponse({ ok: false, message: 'Solicitud vacia.' });
		}

		var raw = '';
		if (e.postData && e.postData.contents) {
			raw = e.postData.contents;
		}

		// Fallback for form-urlencoded requests: payload={json}
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

function doGet() {
	return jsonResponse({
		ok: true,
		message: 'Web App activa. Usa POST para saveScores/uploadPdf.'
	});
}

function autorizarServicios() {
	var spreadsheetId = '14D6Fnkyhr9MOxvDeGFcke3P7Um39eYT8628bwei64AU';
	var folderId = '12uLk5DzHQc6H3r_J6S3e5OiyGAGcGq0g';

	SpreadsheetApp.openById(spreadsheetId).getSheets();
	DriveApp.getFolderById(folderId).getName();

	Logger.log('Autorizacion de Sheets y Drive completada.');
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

	if (sheet.getLastRow() === 0) {
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

	if (rows.length > 0) {
		var startRow = sheet.getLastRow() + 1;
		sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
	}

	return { message: 'Se registraron ' + rows.length + ' filas en Evaluaciones.', rows: rows.length };
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

	var bytes = Utilities.base64Decode(fileBase64);
	var blob = Utilities.newBlob(bytes, mimeType, fileName);
	var folder = DriveApp.getFolderById(folderId);
	var file = folder.createFile(blob);

	return {
		fileId: file.getId(),
		fileUrl: file.getUrl()
	};
}

function jsonResponse(obj) {
	return ContentService
		.createTextOutput(JSON.stringify(obj))
		.setMimeType(ContentService.MimeType.JSON);
}
