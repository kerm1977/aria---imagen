const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

let mainWindow;
let activeConversions = new Map(); // Store active conversion processes
let isPaused = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#1a1a2e',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Window control handlers
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// Dialog handler
ipcMain.handle('dialog-open', async (event, options) => {
  return await dialog.showOpenDialog(mainWindow, options);
});

// Folder handler
ipcMain.handle('dialog-open-folder', async (event, options) => {
  return await dialog.showOpenDialog(mainWindow, options);
});

// Read files from folder handler
ipcMain.handle('read-folder-files', async (event, folderPath, extensions) => {
  const fs = require('fs');
  const path = require('path');

  try {
    const files = fs.readdirSync(folderPath).filter(file => {
      const ext = path.extname(file).toLowerCase().replace('.', '');
      return extensions.includes(ext);
    });

    return files.map(file => ({
      path: path.join(folderPath, file),
      name: file
    }));
  } catch (error) {
    return [];
  }
});

// Select output folder handler
ipcMain.handle('dialog-save-folder', async (event, options) => {
  return await dialog.showOpenDialog(mainWindow, options);
});

// Open folder handler
ipcMain.handle('open-folder', async (event, folderPath) => {
  const { shell } = require('electron');
  shell.openPath(folderPath);
  return { success: true };
});

// Pause conversions handler
ipcMain.handle('pause-conversions', async (event) => {
  isPaused = true;
  activeConversions.forEach((process, id) => {
    if (process && process.kill) {
      process.kill('SIGSTOP');
    }
  });
  return { success: true };
});

// Resume conversions handler
ipcMain.handle('resume-conversions', async (event) => {
  isPaused = false;
  activeConversions.forEach((process, id) => {
    if (process && process.kill) {
      process.kill('SIGCONT');
    }
  });
  return { success: true };
});

// Stop conversions handler
ipcMain.handle('stop-conversions', async (event) => {
  isPaused = false;
  activeConversions.forEach((process, id) => {
    if (process && process.kill) {
      process.kill('SIGKILL');
    }
  });
  activeConversions.clear();
  return { success: true };
});

// Open DevTools handler
ipcMain.handle('open-dev-tools', async () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow) {
    focusedWindow.webContents.openDevTools();
  }
  return { success: true };
});

// Get file info handler
ipcMain.handle('get-file-info', async (event, filePath) => {
  try {
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    const extension = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);
    const directory = path.dirname(filePath);

    // Get metadata using FFmpeg for media files
    let metadata = {};
    const mediaExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff'];

    if (mediaExtensions.includes(extension)) {
      try {
        await new Promise((resolve, reject) => {
          ffmpeg(filePath).ffprobe((err, data) => {
            if (err) {
              reject(err);
            } else {
              if (data.streams && data.streams.length > 0) {
                const stream = data.streams[0];
                if (stream.codec_name) metadata.codec = stream.codec_name;
                if (stream.width) metadata.width = stream.width;
                if (stream.height) metadata.height = stream.height;
                if (stream.duration) metadata.duration = Math.round(stream.duration);
                if (stream.bit_rate) metadata.bitrate = Math.round(stream.bit_rate / 1000);
              }
              if (data.format) {
                if (data.format.duration) metadata.duration = Math.round(data.format.duration);
                if (data.format.bit_rate) metadata.bitrate = Math.round(data.format.bit_rate / 1000);
              }
              resolve();
            }
          });
        });
      } catch (probeError) {
        console.log('FFprobe error:', probeError);
        // Continue without metadata
      }
    }

    return {
      success: true,
      info: {
        name: fileName,
        path: filePath,
        directory: directory,
        size: fileSizeMB + ' MB',
        sizeBytes: fileSize,
        extension: extension,
        ...metadata
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Perform conversion handler
ipcMain.handle('perform-conversion', async (event, file, outputFormat, quality, outputFolder, fileIndex, conversionType, resolution, ffmpegSettings) => {
  console.log('[IPC-CONVERT] Received conversion request:');
  console.log('[IPC-CONVERT] File:', file.path);
  console.log('[IPC-CONVERT] Output format:', outputFormat);
  console.log('[IPC-CONVERT] Conversion type:', conversionType);
  console.log('[IPC-CONVERT] Quality:', quality);
  console.log('[IPC-CONVERT] Output folder:', outputFolder);
  console.log('[IPC-CONVERT] File index:', fileIndex);

  // Determine output path
  let outputPath;
  const baseName = path.basename(file.path, path.extname(file.path));
  // Sanitize filename to remove special characters that might cause FFmpeg issues
  const sanitizedName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');

  if (outputFolder) {
    outputPath = path.join(outputFolder, sanitizedName + '.' + outputFormat);
  } else {
    // Output in the same directory as the input file
    const inputDir = path.dirname(file.path);
    outputPath = path.join(inputDir, sanitizedName + '.' + outputFormat);
  }

  console.log('[IPC-CONVERT] Output path:', outputPath);

  // Check if output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    console.error('[IPC-CONVERT] Output directory does not exist:', outputDir);
    return { success: false, error: 'Directorio de salida no existe: ' + outputDir };
  }

  // Disable hardware acceleration by default to avoid compatibility issues
  if (ffmpegSettings) {
    ffmpegSettings.hardwareAccel = false;
  }

  try {
    let result;

    // Normalize conversion type
    const normalizedType = String(conversionType).trim().toLowerCase();
    console.log('[IPC-CONVERT] Normalized type:', normalizedType);

    switch (normalizedType) {
      case 'video':
        result = await convertVideo(file.path, outputPath, outputFormat, quality, event, fileIndex, resolution, ffmpegSettings);
        break;
      case 'audio':
        result = await convertAudio(file.path, outputPath, outputFormat, quality, event, fileIndex);
        break;
      case 'extract-audio':
        result = await extractAudio(file.path, outputPath, outputFormat, quality, event, fileIndex);
        break;
      case 'image':
        result = await convertImage(file.path, outputPath, outputFormat, quality, event, fileIndex);
        break;
      case 'document':
        result = await convertDocument(file.path, outputPath, outputFormat, quality, event, fileIndex);
        break;
      case 'spreadsheet':
        result = await convertSpreadsheet(file.path, outputPath, outputFormat, quality, event, fileIndex);
        break;
      case 'presentation':
        result = await convertPresentation(file.path, outputPath, outputFormat, quality, event, fileIndex);
        break;
      case 'compress':
        result = await compressImage(file.path, outputPath, outputFormat, quality, event, fileIndex);
        break;
      default:
        console.error('[IPC-CONVERT] Unknown conversion type:', normalizedType);
        throw new Error('Tipo de conversión no soportado: ' + normalizedType);
    }

    console.log('[IPC-CONVERT] Conversion completed successfully');
    return { success: true, outputPath };
  } catch (error) {
    console.error('[IPC-CONVERT] Conversion error:', error.message);
    throw error; // Propagate error to renderer so it shows as failure
  }
});

// Video conversion with FFmpeg
function convertVideo(inputPath, outputPath, outputFormat, quality, event, fileIndex, resolution, ffmpegSettings) {
  return new Promise((resolve, reject) => {
    const qualityMap = {
      'low': '28',
      'medium': '23',
      'high': '18'
    };

    const crf = qualityMap[quality] || '23';

    // Resolution mapping
    const resolutionMap = {
      'original': null,
      '432p': '854x480',
      '480p': '854x480',
      '576p': '1024x576',
      '720p': '1280x720',
      '1080p': '1920x1080',
      '1440p': '2560x1440',
      '2160p': '3840x2160',
      '4320p': '7680x4320'
    };

    const targetResolution = resolutionMap[resolution] || null;

    // Codec mapping for different formats
    const codecMap = {
      'mp4': { video: 'libx264', audio: 'aac' },
      'avi': { video: 'libx264', audio: 'mp3' },
      'mkv': { video: 'libx264', audio: 'aac' },
      'mov': { video: 'libx264', audio: 'aac' },
      'webm': { video: 'libvpx-vp9', audio: 'libopus' },
      'flv': { video: 'flv', audio: 'aac' },
      'wmv': { video: 'wmv2', audio: 'wmav2' }
    };

    const codecs = codecMap[outputFormat] || codecMap['mp4'];

    // Use FFmpeg settings
    const preset = ffmpegSettings?.preset || 'medium';
    const threads = ffmpegSettings?.threads || '0';
    const hardwareAccel = ffmpegSettings?.hardwareAccel || false;
    const fastDecode = ffmpegSettings?.fastDecode || false;

    let command = ffmpeg(inputPath)
      .output(outputPath)
      .videoCodec(codecs.video)
      .audioCodec(codecs.audio)
      .outputOptions([
        `-crf ${crf}`,
        `-preset ${preset}`,
        `-threads ${threads}`,
        '-y' // Overwrite output files without asking
      ]);

    // Hardware acceleration - must be input options
    if (hardwareAccel) {
      // Try NVENC (NVIDIA), then QSV (Intel), then VAAPI (Linux)
      command = command.inputOptions(['-hwaccel cuda']);
      command = command.videoCodec('h264_nvenc');
    }

    // Fast decode optimization
    if (fastDecode) {
      command = command.outputOptions(['-tune fastdecode']);
    }

    // Add resolution scaling if specified
    if (targetResolution) {
      command = command.size(targetResolution);
    }

    // Add format-specific options
    if (outputFormat === 'mp4' || outputFormat === 'mov') {
      command = command.outputOptions(['-movflags +faststart']);
    }
    if (outputFormat === 'webm') {
      command = command.outputOptions(['-b:v 0', '-crf 30', '-pix_fmt yuv420p']);
    }

    // Store the ffmpeg command for control
    const conversionId = `${fileIndex}-${Date.now()}`;
    command.on('start', (commandLine) => {
      console.log('FFmpeg command:', commandLine);
      activeConversions.set(conversionId, command);
    });

    command
      .on('progress', (progress) => {
        if (progress.percent) {
          event.sender.send('conversion-progress', {
            index: fileIndex,
            progress: Math.round(progress.percent)
          });
        }
      })
      .on('end', () => {
        console.log('Video conversion completed');
        activeConversions.delete(conversionId);
        resolve();
      })
      .on('error', (err) => {
        console.error('Video conversion error:', err);
        activeConversions.delete(conversionId);
        reject(err);
      })
      .run();
  });
}

// Audio conversion with FFmpeg
function convertAudio(inputPath, outputPath, outputFormat, quality, event, fileIndex) {
  return new Promise((resolve, reject) => {
    const bitrateMap = {
      'low': '128k',
      'medium': '192k',
      'high': '320k'
    };

    const bitrate = bitrateMap[quality] || '192k';

    // Codec mapping for different audio formats
    const codecMap = {
      'mp3': 'libmp3lame',
      'wav': 'pcm_s16le',
      'ogg': 'libvorbis',
      'flac': 'flac',
      'aac': 'aac',
      'm4a': 'aac',
      'opus': 'libopus',
      'wma': 'wmav2'
    };

    const codec = codecMap[outputFormat] || 'libmp3lame';

    let command = ffmpeg(inputPath)
      .output(outputPath)
      .audioCodec(codec)
      .audioBitrate(bitrate);

    // Add format-specific options
    if (outputFormat === 'flac') {
      command = command.audioBitrate('lossless');
    }
    if (outputFormat === 'wav') {
      command = command.audioFrequency(44100).audioChannels(2);
    }
    if (outputFormat === 'opus') {
      command = command.outputOptions(['-b:a 192k', '-vbr on']);
    }

    command
      .on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          event.sender.send('conversion-progress', {
            index: fileIndex,
            progress: Math.round(progress.percent)
          });
        }
      })
      .on('end', () => {
        console.log('Audio conversion completed');
        resolve();
      })
      .on('error', (err) => {
        console.error('Audio conversion error:', err);
        reject(err);
      })
      .run();
  });
}

// Extract audio from video
function extractAudio(inputPath, outputPath, outputFormat, quality, event, fileIndex) {
  return new Promise((resolve, reject) => {
    const bitrateMap = {
      'low': '128k',
      'medium': '192k',
      'high': '320k'
    };

    const bitrate = bitrateMap[quality] || '192k';

    ffmpeg(inputPath)
      .output(outputPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate(bitrate)
      .on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          event.sender.send('conversion-progress', {
            index: fileIndex,
            progress: Math.round(progress.percent)
          });
        }
      })
      .on('end', () => {
        console.log('Audio extraction completed');
        resolve();
      })
      .on('error', (err) => {
        console.error('Audio extraction error:', err);
        reject(err);
      })
      .run();
  });
}

// Image conversion with FFmpeg (more stable than Sharp)
function convertImage(inputPath, outputPath, outputFormat, quality, event, fileIndex) {
  return new Promise((resolve, reject) => {
    const ffmpeg = require('fluent-ffmpeg');

    // Quality is now a number from 1-100 (from slider)
    // Convert to FFmpeg quality scale (1-31, where 1 is highest quality)
    const q = Math.round(31 - (quality / 100 * 30)); // Convert 1-100 to 1-31

    console.log(`[FFMPEG-IMAGE] Starting image conversion: ${inputPath} -> ${outputFormat}, quality: ${quality} -> ${q}`);

    // FFmpeg codec mapping for images
    const codecMap = {
      'jpg': 'mjpeg',
      'jpeg': 'mjpeg',
      'png': 'png',
      'webp': 'libwebp',
      'tiff': 'tiff',
      'gif': 'gif',
      'bmp': 'bmp'
    };

    const codec = codecMap[outputFormat] || 'mjpeg';

    let command = ffmpeg(inputPath)
      .output(outputPath)
      .videoCodec(codec)
      .outputOptions([
        '-q:v', q.toString(), // Quality parameter
        '-y' // Overwrite output
      ]);

    // Add format-specific options
    if (outputFormat === 'webp') {
      command = command.outputOptions(['-compression_level', '4']);
    }
    if (outputFormat === 'png') {
      command = command.outputOptions(['-compression_level', '6']);
    }

    command
      .on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine);
        event.sender.send('conversion-progress', {
          index: fileIndex,
          progress: 25
        });
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          event.sender.send('conversion-progress', {
            index: fileIndex,
            progress: Math.min(75, Math.round(progress.percent))
          });
        }
      })
      .on('end', () => {
        console.log('[FFMPEG-IMAGE] Image conversion completed');
        event.sender.send('conversion-progress', {
          index: fileIndex,
          progress: 100
        });
        resolve();
      })
      .on('error', (err) => {
        console.error('[FFMPEG-IMAGE] Image conversion error:', err);
        reject(new Error(`Error de conversión: ${err.message}`));
      })
      .run();
  });
}

// Document conversion using pdf2docx for PDF→DOCX/DOC, soffice CLI for others
function convertDocument(inputPath, outputPath, outputFormat, quality, event, fileIndex) {
  return new Promise((resolve, reject) => {
    const { execFile } = require('child_process');
    const inputExt = path.extname(inputPath).toLowerCase().slice(1);

    console.log(`[DOC-CONVERT] Input: ${inputPath}`);
    console.log(`[DOC-CONVERT] Output: ${outputPath}`);
    console.log(`[DOC-CONVERT] Format: ${outputFormat}`);
    console.log(`[DOC-CONVERT] Input extension: ${inputExt}`);

    event.sender.send('conversion-progress', { index: fileIndex, progress: 20 });

    // Use pdf2docx for PDF→DOCX/DOC conversions
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
      // Use soffice CLI for other conversions
      console.log(`[DOC-CONVERT] Using soffice CLI for ${inputExt}→${outputFormat}`);
      convertDocumentSoffice(inputPath, outputPath, outputFormat, quality, event, fileIndex)
        .then(resolve)
        .catch(reject);
    }
  });
}

// Fallback: LibreOffice CLI (for non-PDF conversions)
function convertDocumentSoffice(inputPath, outputPath, outputFormat, quality, event, fileIndex) {
  return new Promise((resolve, reject) => {
    const { execFile } = require('child_process');
    const os = require('os');

    console.log(`[DOC-CONVERT-SOFFICE] Input: ${inputPath}`);
    console.log(`[DOC-CONVERT-SOFFICE] Output: ${outputPath}`);

    event.sender.send('conversion-progress', { index: fileIndex, progress: 20 });

    const tempDir = os.tmpdir();
    const inputBasename = path.basename(inputPath, path.extname(inputPath));
    const tempOutputPath = path.join(tempDir, `${inputBasename}.${outputFormat}`);

    const outputFilterMap = {
      'pdf': 'writer_pdf_Export',
      'docx': 'MS Word 2007 XML',
      'doc': 'MS Word 97',
      'odt': 'writer8',
      'txt': 'Text',
      'rtf': 'Rich Text Format',
      'html': 'HTML (StarWriter)'
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

// Spreadsheet conversion using LibreOffice CLI
function convertSpreadsheet(inputPath, outputPath, outputFormat, quality, event, fileIndex) {
  return new Promise((resolve, reject) => {
    const { execFile } = require('child_process');
    const os = require('os');

    console.log(`[CALC-CONVERT] Input: ${inputPath}`);
    console.log(`[CALC-CONVERT] Output: ${outputPath}`);
    console.log(`[CALC-CONVERT] Format: ${outputFormat}`);

    event.sender.send('conversion-progress', { index: fileIndex, progress: 20 });

    const tempDir = os.tmpdir();
    const inputBasename = path.basename(inputPath, path.extname(inputPath));
    const tempOutputPath = path.join(tempDir, `${inputBasename}.${outputFormat}`);

    const filterMap = {
      'xlsx': 'MS Excel 2007 XML',
      'xls': 'MS Excel 97',
      'ods': 'calc8',
      'csv': 'Text - txt - csv (StarCalc)',
      'pdf': 'calc_pdf_Export'
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

// Presentation conversion using LibreOffice CLI
function convertPresentation(inputPath, outputPath, outputFormat, quality, event, fileIndex) {
  return new Promise((resolve, reject) => {
    const { execFile } = require('child_process');
    const os = require('os');

    console.log(`[PRES-CONVERT] Input: ${inputPath}`);
    console.log(`[PRES-CONVERT] Output: ${outputPath}`);
    console.log(`[PRES-CONVERT] Format: ${outputFormat}`);

    event.sender.send('conversion-progress', { index: fileIndex, progress: 20 });

    const tempDir = os.tmpdir();
    const inputBasename = path.basename(inputPath, path.extname(inputPath));
    const tempOutputPath = path.join(tempDir, `${inputBasename}.${outputFormat}`);

    const filterMap = {
      'pptx': 'MS PowerPoint 2007 XML',
      'ppt': 'MS PowerPoint 97',
      'odp': 'impress8',
      'pdf': 'impress_pdf_Export'
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

// Image compression with FFmpeg (more stable than Sharp)
function compressImage(inputPath, outputPath, outputFormat, quality, event, fileIndex) {
  return new Promise((resolve, reject) => {
    const ffmpeg = require('fluent-ffmpeg');

    // Quality is now a number from 1-100 (from slider)
    // Convert to FFmpeg quality scale (1-31, where 1 is highest quality)
    const q = Math.round(31 - (quality / 100 * 30)); // Convert 1-100 to 1-31

    console.log(`[FFMPEG-COMPRESS] Starting image compression: ${inputPath} -> ${outputFormat}, quality: ${quality} -> ${q}`);

    // FFmpeg codec mapping for images
    const codecMap = {
      'jpg': 'mjpeg',
      'jpeg': 'mjpeg',
      'png': 'png',
      'webp': 'libwebp',
      'tiff': 'tiff',
      'gif': 'gif',
      'bmp': 'bmp'
    };

    const codec = codecMap[outputFormat] || 'mjpeg';

    let command = ffmpeg(inputPath)
      .output(outputPath)
      .videoCodec(codec)
      .outputOptions([
        '-q:v', q.toString(), // Quality parameter
        '-y' // Overwrite output
      ]);

    // Add format-specific options
    if (outputFormat === 'webp') {
      command = command.outputOptions(['-compression_level', '4']);
    }
    if (outputFormat === 'png') {
      command = command.outputOptions(['-compression_level', '6']);
    }

    command
      .on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine);
        event.sender.send('conversion-progress', {
          index: fileIndex,
          progress: 25
        });
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          event.sender.send('conversion-progress', {
            index: fileIndex,
            progress: Math.min(75, Math.round(progress.percent))
          });
        }
      })
      .on('end', () => {
        console.log('[FFMPEG-COMPRESS] Image compression completed');
        event.sender.send('conversion-progress', {
          index: fileIndex,
          progress: 100
        });
        resolve();
      })
      .on('error', (err) => {
        console.error('[FFMPEG-COMPRESS] Image compression error:', err);
        reject(new Error(`Error de compresión: ${err.message}`));
      })
      .run();
  });
}
