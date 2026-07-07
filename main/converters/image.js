const ffmpeg = require('fluent-ffmpeg');

function convertImage(inputPath, outputPath, outputFormat, quality, event, fileIndex) {
  return new Promise((resolve, reject) => {
    const q = Math.round(31 - (quality / 100 * 30));

    const codecMap = {
      'jpg': 'mjpeg', 'jpeg': 'mjpeg', 'png': 'png', 'webp': 'libwebp',
      'tiff': 'tiff', 'gif': 'gif', 'bmp': 'bmp', 'avif': 'libavif', 'heif': 'libheif'
    };
    const codec = codecMap[outputFormat] || 'mjpeg';

    ffmpeg(inputPath)
      .output(outputPath)
      .videoCodec(codec)
      .outputOptions([`-q:v ${q}`, '-y'])
      .on('start', (commandLine) => console.log('FFmpeg command:', commandLine))
      .on('progress', (progress) => {
        if (progress.percent) event.sender.send('conversion-progress', { index: fileIndex, progress: Math.round(progress.percent) });
      })
      .on('end', () => { console.log('Image conversion completed'); resolve(); })
      .on('error', (err) => { console.error('[FFMPEG-IMAGE] Image conversion error:', err); reject(new Error(`Error de conversión: ${err.message}`)); })
      .run();
  });
}

function compressImage(inputPath, outputPath, outputFormat, quality, event, fileIndex) {
  return new Promise((resolve, reject) => {
    const q = Math.round(31 - (quality / 100 * 30));

    const codecMap = {
      'jpg': 'mjpeg', 'jpeg': 'mjpeg', 'png': 'png', 'webp': 'libwebp',
      'tiff': 'tiff', 'gif': 'gif', 'bmp': 'bmp', 'avif': 'libavif', 'heif': 'libheif'
    };
    const codec = codecMap[outputFormat] || 'mjpeg';

    console.log(`[FFMPEG-COMPRESS] Starting image compression: ${inputPath} -> ${outputFormat}, quality: ${quality} -> ${q}`);

    ffmpeg(inputPath)
      .output(outputPath)
      .videoCodec(codec)
      .outputOptions([`-q:v ${q}`, '-y'])
      .on('start', (commandLine) => console.log('FFmpeg command:', commandLine))
      .on('progress', (progress) => {
        if (progress.percent) event.sender.send('conversion-progress', { index: fileIndex, progress: Math.round(progress.percent) });
      })
      .on('end', () => { console.log('Image compression completed'); resolve(); })
      .on('error', (err) => { console.error('[FFMPEG-COMPRESS] Image compression error:', err); reject(err); })
      .run();
  });
}

module.exports = { convertImage, compressImage };
