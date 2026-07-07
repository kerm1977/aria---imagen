const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function convertPresentation(inputPath, outputPath, outputFormat, quality, event, fileIndex) {
  return new Promise((resolve, reject) => {
    console.log(`[PRES-CONVERT] Input: ${inputPath}`);
    console.log(`[PRES-CONVERT] Output: ${outputPath}`);
    console.log(`[PRES-CONVERT] Format: ${outputFormat}`);

    event.sender.send('conversion-progress', { index: fileIndex, progress: 20 });

    const tempDir = os.tmpdir();
    const inputBasename = path.basename(inputPath, path.extname(inputPath));
    const tempOutputPath = path.join(tempDir, `${inputBasename}.${outputFormat}`);

    const filterMap = {
      'pptx': 'MS PowerPoint 2007 XML', 'ppt': 'MS PowerPoint 97',
      'odp': 'impress8', 'pdf': 'impress_pdf_Export'
    };
    const filter = filterMap[outputFormat] || 'impress8';
    const convertTo = `${outputFormat}:"${filter}"`;

    const finalArgs = ['--headless', '--convert-to', convertTo, '--outdir', tempDir, inputPath];
    console.log(`[PRES-CONVERT] Running: soffice ${finalArgs.join(' ')}`);
    event.sender.send('conversion-progress', { index: fileIndex, progress: 40 });

    execFile('soffice', finalArgs, { timeout: 120000 }, (error, stdout, stderr) => {
      if (stdout) console.log(`[PRES-CONVERT] stdout: ${stdout}`);
      if (stderr) console.log(`[PRES-CONVERT] stderr: ${stderr}`);
      if (error) {
        console.error(`[PRES-CONVERT] CLI error: ${error.message}`);
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
      console.log(`[PRES-CONVERT] Conversion completed: ${outputPath}`);
      resolve();
    });
  });
}

module.exports = { convertPresentation };
