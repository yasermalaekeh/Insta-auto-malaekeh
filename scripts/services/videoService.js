const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

function buildReelFromImages({ imagePaths, secondsPerImage = 3 }) {
  return new Promise((resolve, reject) => {
    if (!imagePaths || imagePaths.length === 0) {
      return reject(new Error('حداقل یک عکس برای ساخت ریلز لازم است'));
    }

    if (!fs.existsSync(config.paths.output)) {
      fs.mkdirSync(config.paths.output, { recursive: true });
    }

    const outputId = uuidv4();
    const outputPath = path.join(config.paths.output, `reel-${outputId}.mp4`);
    const fps = 30;
    const width = 1080;
    const height = 1920;

    const command = ffmpeg();
    imagePaths.forEach((imgPath) => {
      command.input(imgPath).loop(secondsPerImage);
    });

    const filters = [];
    const zoomedLabels = [];

    imagePaths.forEach((_, i) => {
      const totalFrames = secondsPerImage * fps;
      filters.push(
        `[${i}:v]scale=${width * 1.15}:${height * 1.15}:force_original_aspect_ratio=increase,` +
          `crop=${width * 1.15}:${height * 1.15},` +
          `zoompan=z='min(zoom+0.0007,1.15)':d=${totalFrames}:s=${width}x${height}:fps=${fps},` +
          `setsar=1[z${i}]`
      );
      zoomedLabels.push(`[z${i}]`);
    });

    let lastLabel = zoomedLabels[0];
    let filterChain = filters.join('; ') + '; ';
    const transitionDuration = 0.5;

    for (let i = 1; i < zoomedLabels.length; i++) {
      const offset = secondsPerImage * i - transitionDuration * i;
      const outLabel = `x${i}`;
      filterChain += `${lastLabel}${zoomedLabels[i]}xfade=transition=fade:duration=${transitionDuration}:offset=${offset}[${outLabel}]; `;
      lastLabel = `[${outLabel}]`;
    }

    filterChain = filterChain.replace(/;\s*$/, '');
    command.complexFilter(filterChain, lastLabel.replace(/[\[\]]/g, ''));

    command
      .outputOptions(['-c:v libx264', '-pix_fmt yuv420p', '-r ' + fps, '-movflags +faststart'])
      .on('start', (cmd) => console.log('FFmpeg شروع شد:', cmd))
      .on('error', (err) => reject(err))
      .on('end', () => resolve(outputPath))
      .save(outputPath);
  });
}

module.exports = { buildReelFromImages };
