const ffmpeg = require('fluent-ffmpeg');

function convertVideo(inputPath, outputPath, outputFormat, quality, event, fileIndex, resolution, ffmpegSettings) {
  return new Promise((resolve, reject) => {
    const qualityMap = { 'low': '28', 'medium': '23', 'high': '18' };
    const crf = qualityMap[quality] || '23';

    const resolutionMap = {
      'original': null, '432p': '854x480', '480p': '854x480', '576p': '1024x576',
      '720p': '1280x720', '1080p': '1920x1080', '1440p': '2560x1440', '2160p': '3840x2160', '4320p': '7680x4320'
    };
    const targetResolution = resolutionMap[resolution] || null;

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

    const preset = ffmpegSettings?.preset || 'medium';
    const threads = ffmpegSettings?.threads || '0';
    const hardwareAccel = ffmpegSettings?.hardwareAccel || false;
    const fastDecode = ffmpegSettings?.fastDecode || false;

    let command = ffmpeg(inputPath)
      .output(outputPath)
      .videoCodec(codecs.video)
      .audioCodec(codecs.audio)
      .outputOptions([`-crf ${crf}`, `-preset ${preset}`, `-threads ${threads}`, '-y']);

    if (hardwareAccel) {
      command = command.inputOptions(['-hwaccel cuda']).videoCodec('h264_nvenc');
    }
    if (fastDecode) {
      command = command.outputOptions(['-tune fastdecode']);
    }
    if (targetResolution) {
      command = command.size(targetResolution);
    }
    if (outputFormat === 'mp4' || outputFormat === 'mov') {
      command = command.outputOptions(['-movflags +faststart']);
    }
    if (outputFormat === 'webm') {
      command = command.outputOptions(['-b:v 0', '-crf 30', '-pix_fmt yuv420p']);
    }

    command
      .on('start', (commandLine) => console.log('FFmpeg command:', commandLine))
      .on('progress', (progress) => {
        if (progress.percent) {
          event.sender.send('conversion-progress', { index: fileIndex, progress: Math.round(progress.percent) });
        }
      })
      .on('end', () => {
        console.log('Video conversion completed');
        resolve();
      })
      .on('error', (err) => {
        console.error('Video conversion error:', err);
        reject(err);
      })
      .run();
  });
}

module.exports = { convertVideo };
