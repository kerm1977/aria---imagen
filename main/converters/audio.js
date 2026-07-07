const ffmpeg = require('fluent-ffmpeg');

function convertAudio(inputPath, outputPath, outputFormat, quality, event, fileIndex) {
  return new Promise((resolve, reject) => {
    const bitrateMap = { 'low': '128k', 'medium': '192k', 'high': '320k' };
    const bitrate = bitrateMap[quality] || '192k';

    const codecMap = {
      'mp3': 'libmp3lame', 'wav': 'pcm_s16le', 'ogg': 'libvorbis',
      'flac': 'flac', 'aac': 'aac', 'm4a': 'aac', 'opus': 'libopus', 'wma': 'wmav2'
    };
    const codec = codecMap[outputFormat] || 'libmp3lame';

    let command = ffmpeg(inputPath)
      .output(outputPath)
      .audioCodec(codec)
      .audioBitrate(bitrate);

    if (outputFormat === 'flac') command = command.audioBitrate('lossless');
    if (outputFormat === 'wav') command = command.audioFrequency(44100).audioChannels(2);
    if (outputFormat === 'opus') command = command.outputOptions(['-b:a 192k', '-vbr on']);

    command
      .on('start', (commandLine) => console.log('FFmpeg command:', commandLine))
      .on('progress', (progress) => {
        if (progress.percent) event.sender.send('conversion-progress', { index: fileIndex, progress: Math.round(progress.percent) });
      })
      .on('end', () => { console.log('Audio conversion completed'); resolve(); })
      .on('error', (err) => { console.error('Audio conversion error:', err); reject(err); })
      .run();
  });
}

function extractAudio(inputPath, outputPath, outputFormat, quality, event, fileIndex) {
  return new Promise((resolve, reject) => {
    const bitrateMap = { 'low': '128k', 'medium': '192k', 'high': '320k' };
    const bitrate = bitrateMap[quality] || '192k';

    ffmpeg(inputPath)
      .output(outputPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate(bitrate)
      .on('start', (commandLine) => console.log('FFmpeg command:', commandLine))
      .on('progress', (progress) => {
        if (progress.percent) event.sender.send('conversion-progress', { index: fileIndex, progress: Math.round(progress.percent) });
      })
      .on('end', () => { console.log('Audio extraction completed'); resolve(); })
      .on('error', (err) => { console.error('Audio extraction error:', err); reject(err); })
      .run();
  });
}

module.exports = { convertAudio, extractAudio };
