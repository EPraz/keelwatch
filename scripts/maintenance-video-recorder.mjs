import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { access, mkdir, writeFile, stat, readFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

export async function createMaintenanceVideo() {
  const directory = resolve('.scratch/maintenance-video');
  const destination = resolve('docs/flagship/media/maintenance');
  const ffmpeg = resolve(
    process.env.CAPTURE_FFMPEG ??
      '.scratch/maintenance-video-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe',
  );
  await access(ffmpeg);
  await mkdir(resolve(directory, 'frames'), { recursive: true });
  const frames = [];
  const captions = [];
  const errors = [];
  let started;
  let active;
  let writing = Promise.resolve();
  let stopped = false;
  const elapsed = () => (Date.now() - started) / 1000;
  const timestamp = (seconds, separator = '.') => {
    const milliseconds = Math.round(seconds * 1000);
    return `${String(Math.floor(milliseconds / 3600000)).padStart(2, '0')}:${String(Math.floor(milliseconds / 60000) % 60).padStart(2, '0')}:${String(Math.floor(milliseconds / 1000) % 60).padStart(2, '0')}${separator}${String(milliseconds % 1000).padStart(3, '0')}`;
  };
  return {
    async select(tab) {
      if (active?.sessionId === tab.sessionId) return;
      if (active) await active.cdp('Page.stopScreencast');
      await tab.cdp('Page.bringToFront');
      active = tab;
      started ??= Date.now();
      await tab.cdp('Page.startScreencast', {
        format: 'jpeg',
        quality: 90,
        maxWidth: 1280,
        maxHeight: 800,
        everyNthFrame: 1,
      });
    },
    onMessage(message, send) {
      if (message.method !== 'Page.screencastFrame') return;
      void send(
        'Page.screencastFrameAck',
        { sessionId: message.params.sessionId },
        message.sessionId,
      ).catch(() => errors.push('Screencast acknowledgement failed.'));
      if (stopped || message.sessionId !== active?.sessionId) return;
      const file = `frames/frame-${String(frames.length).padStart(6, '0')}.jpg`;
      frames.push({ file, time: elapsed() });
      writing = writing
        .then(() =>
          writeFile(resolve(directory, file), Buffer.from(message.params.data, 'base64')),
        )
        .catch(() => errors.push('Screencast frame persistence failed.'));
    },
    async cue(text, seconds) {
      captions.push({ start: elapsed(), text });
      console.log(`Video: ${text.replaceAll('\n', ' ')}`);
      await new Promise((done) => setTimeout(done, seconds * 1000));
    },
    async close() {
      stopped = true;
      if (active) await active.cdp('Page.stopScreencast');
      active = undefined;
      await writing;
    },
    async finish(evidence) {
      const duration = elapsed();
      await this.close();
      assert.deepEqual(errors, []);
      assert.ok(duration >= 120 && duration <= 180, 'Video must last 2–3 minutes.');
      assert.ok(frames.length > 20, 'A real screencast must contain the action frames.');
      frames[0].time = 0;
      const list = frames
        .map(
          (frame, index) =>
            `file '${frame.file}'\nduration ${Math.max(0.001, (frames[index + 1]?.time ?? duration) - frame.time).toFixed(6)}`,
        )
        .join('\n');
      await writeFile(
        resolve(directory, 'frames.txt'),
        `${list}\nfile '${frames.at(-1).file}'\n`,
      );
      captions[0].start = 0;
      const cues = captions.map((caption, index) => ({
        ...caption,
        end: captions[index + 1]?.start ?? duration,
      }));
      const vtt = `WEBVTT\n\n${cues.map((cue, index) => `${index + 1}\n${timestamp(cue.start)} --> ${timestamp(cue.end)}\n${cue.text}\n`).join('\n')}`;
      const assTime = (seconds) => timestamp(seconds).slice(1, -1);
      const ass = `[Script Info]\nScriptType: v4.00+\nPlayResX: 1280\nPlayResY: 928\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Arial,26,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,2,36,36,22,1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${cues.map((cue) => `Dialogue: 0,${assTime(cue.start)},${assTime(cue.end)},Default,,0,0,0,,${cue.text.replaceAll('\n', '\\N')}`).join('\n')}\n`;
      await writeFile(resolve(directory, 'captions.ass'), ass);
      // A failed encode must leave the last delivered media package intact.
      const file = resolve(directory, 'maintenance-story.mp4');
      const encoded = spawnSync(
        ffmpeg,
        [
          '-y',
          '-hide_banner',
          '-loglevel',
          'error',
          '-f',
          'concat',
          '-safe',
          '0',
          '-i',
          'frames.txt',
          '-vf',
          'fps=12,pad=1280:928:0:0:black,subtitles=captions.ass',
          '-t',
          duration.toFixed(3),
          '-an',
          '-c:v',
          'libx264',
          '-profile:v',
          'main',
          '-pix_fmt',
          'yuv420p',
          '-crf',
          '24',
          '-preset',
          'medium',
          '-movflags',
          '+faststart',
          '-map_metadata',
          '-1',
          file,
        ],
        { cwd: directory, stdio: 'pipe', timeout: 180_000 },
      );
      await writeFile(resolve(directory, 'encode.log'), encoded.stderr ?? '');
      assert.equal(encoded.status, 0, 'Video encoding failed; see ignored encode.log.');
      const decoded = spawnSync(ffmpeg, ['-v', 'error', '-i', file, '-f', 'null', '-'], {
        stdio: 'pipe',
        timeout: 120_000,
      });
      assert.equal(decoded.status, 0, 'Complete video decode failed.');
      const bytes = (await stat(file)).size;
      assert.ok(
        bytes < 15 * 1024 * 1024,
        'Video exceeds the bounded 15 MiB delivery budget.',
      );
      const version = spawnSync(ffmpeg, ['-version'], { encoding: 'utf8' }).stdout.split(
        /\r?\n/u,
      )[0];
      const summary = {
        ...evidence,
        capturedAt: new Date(started).toISOString(),
        durationSeconds: duration,
        frameEvents: frames.length,
        width: 1280,
        height: 928,
        viewport: { width: 1280, height: 800 },
        fps: 12,
        codec: 'H.264 Main / yuv420p / MP4 faststart',
        audioStreams: 0,
        burnedEnglishCaptions: true,
        captionCues: cues,
        bytes,
        sha256: createHash('sha256')
          .update(await readFile(file))
          .digest('hex'),
        encoder: version,
        fullDecode: true,
        playbackVerification: 'pending',
      };
      await copyFile(file, resolve(destination, 'maintenance-story.mp4'));
      await writeFile(resolve(destination, 'maintenance-story.en.vtt'), vtt);
      await writeFile(
        resolve(destination, 'video-evidence.json'),
        `${JSON.stringify(summary, null, 2)}\n`,
      );
      return summary;
    },
  };
}
