# Rubrica de evaluacion practica

Web app para evaluar 4 residentes por cada medico de base, con calculo porcentual sobre 100, guardado local y exportacion a PDF.

## Uso

1. Seleccionar medico de base.
2. Completar la rubrica para los 4 residentes.
3. Guardar la rubrica del medico.
4. Exportar a PDF / Imprimir.

## Integracion Google Sheets + Drive (opcional)

1. Abre tu proyecto de Apps Script y pega el contenido de [apps-script/Code.gs](apps-script/Code.gs).
2. Ejecuta una vez la funcion `autorizarServicios` para otorgar permisos.
3. Haz deploy como `Web app` y copia la URL que termina en `/exec`.
4. En la webapp, pega esa URL en el campo `URL Web App de Apps Script`.
5. Usa:
	- `Guardar notas en Google Sheets` para registrar notas.
	- `Generar PDF y enviar a Drive` para subir el PDF.

IDs configurados:

- Spreadsheet: `1PaM-2gpIB-HiA59Uw947bNsEfGjIR-8ZdchMzO6wj8w`
- Drive folder: `12uLk5DzHQc6H3r_J6S3e5OiyGAGcGq0g`

