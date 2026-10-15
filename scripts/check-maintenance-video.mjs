import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { randomUUID, createHash } from 'node:crypto';
import { resolve } from 'node:path';

const directory = resolve('docs/flagship/media/maintenance');
const evidencePath = resolve(directory, 'video-evidence.json');
const evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
const media = await readFile(resolve(directory, 'maintenance-story.mp4'));
const captions = await readFile(resolve(directory, 'maintenance-story.en.vtt'));
assert.equal(media.length, evidence.bytes, 'Media size must match this recording.');
assert.equal(
  createHash('sha256').update(media).digest('hex'),
  evidence.sha256,
  'Media hash must match this recording before browser verification.',
);
const html = Buffer.from(
  `<!doctype html><html lang="en"><meta charset="utf-8"><title>Local video verification</title><body><h1>Maintenance recording</h1><video tabindex="0" controls playsinline preload="metadata" style="max-width:100%" src="/story.mp4"><track kind="captions" srclang="en" label="English" src="/captions.vtt"></video><p><a href="/story.mp4">Download video</a> · <a href="/captions.vtt">Read captions</a></p></body></html>`,
);
const server = createServer((request, response) => {
  const routes = {
    '/': { bytes: html, type: 'text/html; charset=utf-8' },
    '/story.mp4': { bytes: media, type: 'video/mp4' },
    '/captions.vtt': { bytes: captions, type: 'text/vtt; charset=utf-8' },
  };
  const file = routes[request.url];
  if (!file) {
    response.writeHead(404);
    response.end();
    return;
  }
  const range = /^bytes=(\d+)-(\d*)$/u.exec(request.headers.range ?? '');
  const start = range ? Number(range[1]) : 0;
  const end = range?.[2]
    ? Math.min(Number(range[2]), file.bytes.length - 1)
    : file.bytes.length - 1;
  if (start > end || start >= file.bytes.length) {
    response.writeHead(416, { 'Content-Range': `bytes */${file.bytes.length}` });
    response.end();
    return;
  }
  response.writeHead(range ? 206 : 200, {
    'Content-Type': file.type,
    'Content-Length': end - start + 1,
    'Accept-Ranges': 'bytes',
    ...(range ? { 'Content-Range': `bytes ${start}-${end}/${file.bytes.length}` } : {}),
  });
  response.end(file.bytes.subarray(start, end + 1));
});
await new Promise((done, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', done);
});
const origin = `http://127.0.0.1:${server.address().port}`;

async function check(name, executable) {
  const profile = resolve(`.scratch/maintenance-video/${name}-${randomUUID()}`);
  await mkdir(profile, { recursive: true });
  const browser = spawn(
    executable,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] },
  );
  let socket;
  const pending = new Map();
  try {
    const address = await new Promise((done, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`${name} startup timed out.`)),
        15000,
      );
      browser.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      browser.once('exit', () => {
        clearTimeout(timer);
        reject(new Error(`${name} exited.`));
      });
      browser.stderr.on('data', (chunk) => {
        const match = String(chunk).match(/DevTools listening on (ws:\/\/\S+)/u);
        if (match) {
          clearTimeout(timer);
          done(match[1]);
        }
      });
    });
    socket = new WebSocket(address);
    await new Promise((done, reject) => {
      socket.addEventListener('open', done, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    let serial = 0;
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (!message.id) return;
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      clearTimeout(request.timer);
      if (message.error) request.reject(new Error(`${name} protocol failed.`));
      else request.done(message.result);
    });
    const send = (method, params = {}, sessionId) =>
      new Promise((done, reject) => {
        const id = ++serial;
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`${name} ${method} timed out.`));
        }, 15000);
        pending.set(id, { done, reject, timer });
        socket.send(
          JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }),
        );
      });
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', {
      targetId,
      flatten: true,
    });
    const evaluate = async (expression) => {
      const result = await send(
        'Runtime.evaluate',
        { expression, awaitPromise: true, returnByValue: true, userGesture: true },
        sessionId,
      );
      if (result.exceptionDetails) throw new Error(`${name} playback expression failed.`);
      return result.result.value;
    };
    const wait = async (expression) => {
      for (let attempt = 0; attempt < 100; attempt++) {
        if (await evaluate(expression)) return;
        await new Promise((done) => setTimeout(done, 50));
      }
      throw new Error(`${name} media condition failed: ${expression}`);
    };
    await send('Page.enable', {}, sessionId);
    await send('Page.navigate', { url: origin }, sessionId);
    await wait(
      "!!document.querySelector('video') && document.querySelector('video').readyState >= 1",
    );
    const metadata = await evaluate(
      "(()=>{const v=document.querySelector('video');return {duration:v.duration,width:v.videoWidth,height:v.videoHeight,autoplay:v.autoplay,paused:v.paused,controls:v.controls,canPlay:v.canPlayType('video/mp4')};})()",
    );
    assert.ok(Math.abs(metadata.duration - evidence.durationSeconds) < 0.3);
    assert.equal(metadata.width, 1280);
    assert.equal(metadata.height, 928);
    assert.equal(metadata.autoplay, false);
    assert.equal(metadata.paused, true);
    assert.equal(metadata.controls, true);
    await evaluate("document.querySelector('video').textTracks[0].mode='hidden'");
    await wait("document.querySelector('video').textTracks[0].cues?.length > 0");
    const cueCount = await evaluate(
      "document.querySelector('video').textTracks[0].cues.length",
    );
    assert.equal(cueCount, evidence.captionCues.length);
    const seeks = [];
    for (const time of [3, evidence.durationSeconds / 2, evidence.durationSeconds - 2]) {
      await evaluate(`document.querySelector('video').currentTime=${time}`);
      await wait(
        "!document.querySelector('video').seeking && document.querySelector('video').readyState >= 2",
      );
      const frame = await evaluate(
        "(()=>{const v=document.querySelector('video');return {time:v.currentTime,decoded:v.getVideoPlaybackQuality().totalVideoFrames,error:v.error?.code??null};})()",
      );
      assert.equal(frame.error, null);
      assert.ok(Math.abs(frame.time - time) < 0.3);
      assert.ok(frame.decoded > 0);
      seeks.push(frame);
    }
    await evaluate("document.querySelector('video').currentTime=1");
    await wait("!document.querySelector('video').seeking");
    await evaluate("document.querySelector('video').play()");
    await wait("document.querySelector('video').currentTime > 1.8");
    await evaluate(
      "document.querySelector('video').pause();document.querySelector('video').focus()",
    );
    assert.equal(await evaluate('document.activeElement.tagName'), 'VIDEO');
    await evaluate("document.querySelector('video').src='/missing.mp4'");
    await wait("!!document.querySelector('video').error");
    assert.equal(await evaluate("document.querySelectorAll('a').length"), 2);
    return {
      name,
      version: (await send('Browser.getVersion')).product,
      ...metadata,
      cueCount,
      seeks,
      playbackProgressed: true,
      keyboardFocusable: true,
      unavailableMediaKeepsLinks: true,
    };
  } finally {
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(new Error('Playback checker closed.'));
    }
    socket?.close();
    browser.kill();
  }
}

try {
  const results = [];
  results.push(
    await check(
      'chrome',
      process.env.CAPTURE_CHROME ??
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
    ),
  );
  results.push(
    await check(
      'edge',
      process.env.CAPTURE_EDGE ??
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    ),
  );
  evidence.playbackVerification = {
    checkedAt: new Date().toISOString(),
    environment: 'Local HTTP fixture with native video controls; no autoplay',
    browsers: results,
  };
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence.playbackVerification));
} finally {
  await new Promise((done) => server.close(done));
}
