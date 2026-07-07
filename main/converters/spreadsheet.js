const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function convertSpreadsheet(inputPath, outputPath, outputFormat, quality, event, fileIndex) {
  return new Promise((resolve, reject) => {
    console.log(`[CALC-CONVERT] Input: ${inputPath}`);
    console.log(`[CALC-CONVERT] Output: ${outputPath}`);
    console.log(`[CALC-CONVERT] Format: ${outputFormat}`);

    event.sender.send('conversion-progress', { index: fileIndex, progress: 20 });

    const tempDir = os.tmpdir();
    const inputBasename = path.basename(inputPath, path.extname(inputPath));
    const tempOutputPath = path.join(tempDir, `${inputBasename}.${outputFormat}`);

    const filterMap = {
      'xlsx': 'MS Excel 2007 XML', 'xls': 'MS Excel 97', 'ods': 'calc8',
      'csv': 'Text - txt - csv (StarCalc)', 'pdf': 'calc_pdf_Export'
    };
    const filter = filterMap[outputFormat] || 'calc8';
    const convertTo = `${outputFormat}:"${filter}"`;

    const finalArgs = ['--headless', '--convert-to', convertTo, '--outdir', tempDir, inputPath];
    console.log(`[CALC-CONVERT] Running: soffice ${finalArgs.join(' ')}`);
    event.sender.send('conversion-progress', { index: fileIndex, progress: 40 });

    execFile('soffice', finalArgs, { timeout: 120000 }, (error, stdout, stderr) => {
      if (stdout) console.log(`[CALC-CONVERT] stdout: ${stdout}`);
      if (stderr) console.log(`[CALC-CONVERT] stderr: ${stderr}`);
      if (error) {
        console.error(`[CALC-CONVERT] CLI error: ${error.message}`);
        reject(new Error(`LibreOffice CLI error: ${error.message}`));
        return;
      }
      event.sender.send('conversion-progress', { index: fileIndex, progress: 80 });
      const src = fs.existsSync(tempOutputPath) ? tempOutputPath : null;
      if (!src) {
        const files = fs.readdirSync(tempDir).filter(f => f.startsWith(inputBasename) && f.endsWith(`.${outputFormat}`));
        if (files.length === 0) { reject(new Error(`Archivo de salida no encontrado`)); return; }
        try { fs.renameSync(path.join(tempDir, files[0]), outputPath); } catch(e) { fs.copyFileSync(path.join(tempDir, files[0]), outputPath); }
      } else {
        try { fs.renameSync(src, outputPath); } catch(e) { fs.copyFileSync(src, outputPath); fs.unlinkSync(src); }
      }
      event.sender.send('conversion-progress', { index: fileIndex, progress: 100 });
      console.log(`[CALC-CONVERT] Conversion completed: ${outputPath}`);
      resolve();
    });
  });
}

module.exports = { convertSpreadsheet };
