const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function convertDocument(inputPath, outputPath, outputFormat, quality, event, fileIndex) {
  return new Promise((resolve, reject) => {
    const inputExt = path.extname(inputPath).toLowerCase().slice(1);

    console.log(`[DOC-CONVERT] Input: ${inputPath}`);
    console.log(`[DOC-CONVERT] Output: ${outputPath}`);
    console.log(`[DOC-CONVERT] Format: ${outputFormat}`);
    console.log(`[DOC-CONVERT] Input extension: ${inputExt}`);

    event.sender.send('conversion-progress', { index: fileIndex, progress: 20 });

    if (inputExt === 'pdf' && (outputFormat === 'docx' || outputFormat === 'doc')) {
      console.log(`[DOC-CONVERT] Using pdf2docx for PDF→${outputFormat}`);
      const pythonScript = `
import sys
from pdf2docx import Converter

try:
    pdf_file = sys.argv[1]
    docx_file = sys.argv[2]
    cv = Converter(pdf_file)
    cv.convert(docx_file)
    cv.close()
    print("SUCCESS")
except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    sys.exit(1)
`;
      const finalArgs = ['-c', pythonScript, inputPath, outputPath];
      console.log(`[DOC-CONVERT] Running: python3 ${finalArgs.slice(2).join(' ')}`);
      event.sender.send('conversion-progress', { index: fileIndex, progress: 40 });

      execFile('python3', finalArgs, { timeout: 120000 }, (error, stdout, stderr) => {
        if (stdout) console.log(`[DOC-CONVERT] stdout: ${stdout}`);
        if (stderr) console.log(`[DOC-CONVERT] stderr: ${stderr}`);
        if (error) {
          console.error(`[DOC-CONVERT] pdf2docx error: ${error.message}`);
          reject(new Error(`pdf2docx error: ${error.message}`));
          return;
        }
        if (!stdout.includes('SUCCESS')) {
          console.error(`[DOC-CONVERT] pdf2docx did not report success`);
          reject(new Error('pdf2docx no reportó éxito'));
          return;
        }
        event.sender.send('conversion-progress', { index: fileIndex, progress: 100 });
        console.log(`[DOC-CONVERT] Conversion completed: ${outputPath}`);
        resolve();
      });
    } else {
      console.log(`[DOC-CONVERT] Using soffice CLI for ${inputExt}→${outputFormat}`);
      convertDocumentSoffice(inputPath, outputPath, outputFormat, quality, event, fileIndex)
        .then(resolve)
        .catch(reject);
    }
  });
}

function convertDocumentSoffice(inputPath, outputPath, outputFormat, quality, event, fileIndex) {
  return new Promise((resolve, reject) => {
    console.log(`[DOC-CONVERT-SOFFICE] Input: ${inputPath}`);
    console.log(`[DOC-CONVERT-SOFFICE] Output: ${outputPath}`);

    event.sender.send('conversion-progress', { index: fileIndex, progress: 20 });

    const tempDir = os.tmpdir();
    const inputBasename = path.basename(inputPath, path.extname(inputPath));
    const tempOutputPath = path.join(tempDir, `${inputBasename}.${outputFormat}`);

    const outputFilterMap = {
      'pdf': 'writer_pdf_Export', 'docx': 'MS Word 2007 XML', 'doc': 'MS Word 97',
      'odt': 'writer8', 'txt': 'Text', 'rtf': 'Rich Text Format', 'html': 'HTML (StarWriter)'
    };
    const outputFilter = outputFilterMap[outputFormat] || 'writer_pdf_Export';
    const convertTo = `${outputFormat}:"${outputFilter}"`;
    const finalArgs = ['--headless', '--convert-to', convertTo, '--outdir', tempDir, inputPath];

    console.log(`[DOC-CONVERT-SOFFICE] Running: soffice ${finalArgs.join(' ')}`);
    event.sender.send('conversion-progress', { index: fileIndex, progress: 40 });

    execFile('soffice', finalArgs, { timeout: 120000 }, (error, stdout, stderr) => {
      if (stdout) console.log(`[DOC-CONVERT-SOFFICE] stdout: ${stdout}`);
      if (stderr) console.log(`[DOC-CONVERT-SOFFICE] stderr: ${stderr}`);
      if (error) {
        console.error(`[DOC-CONVERT-SOFFICE] CLI error: ${error.message}`);
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
      console.log(`[DOC-CONVERT-SOFFICE] Conversion completed: ${outputPath}`);
      resolve();
    });
  });
}

module.exports = { convertDocument };
