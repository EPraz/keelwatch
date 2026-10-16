// Manual local presentation capture; never targets the public deployment.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createPresentationVideo } from './presentation-video-recorder.mjs';
import { installProductGuidance } from './product-capture-guidance.mjs';

const origin = 'http://127.0.0.1:5197';
const directory = resolve('.scratch/maintenance-capture');
const videoMode = process.argv.includes('--video');
const video = videoMode
  ? await createPresentationVideo({
      name: 'maintenance',
      minimumSeconds: 120,
      maximumSeconds: 180,
    })
  : undefined;
const assets = resolve(
  videoMode ? '.scratch/maintenance-video/stills' : 'docs/flagship/media/maintenance',
);
const state = JSON.parse(
  await readFile(resolve(directory, 'private-runtime.json'), 'utf8'),
);
assert.match(state.schema, /^kw_capture_[a-f0-9]{32}$/u);
assert.equal(new URL(state.databaseUrl).searchParams.get('schema'), state.schema);
const chromePath =
  process.env.CAPTURE_CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = resolve(directory, `chrome-${randomUUID()}`);
await mkdir(assets, { recursive: true });

async function api(path, token, method = 'GET', body, expected = 200) {
  const response = await fetch(`${origin}/api/v1${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(
    response.status,
    expected,
    `Unexpected local HTTP status for ${method} ${path}`,
  );
  return response.json();
}

await api('/health/ready');
const manager = await api(
  '/access/demo/sessions',
  null,
  'POST',
  { role: 'manager' },
  201,
);
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');
const database = new PrismaClient({ datasources: { db: { url: state.databaseUrl } } });
try {
  const [{ current }] = await database.$queryRaw`SELECT current_schema() AS current`;
  assert.equal(current, state.schema);
  const expected = await database.user.findUniqueOrThrow({
    where: { externalSubject: 'demo:manager' },
  });
  const actor = await api('/access/me', manager.accessToken);
  assert.equal(
    actor.id,
    expected.id,
    'API must use the prepared isolated access directory before operational writes.',
  );
} finally {
  await database.$disconnect();
}
const vesselId = '5eed0001-0000-4000-8000-000000000001';
const collection = `/vessels/${vesselId}/maintenance-orders`;
const originalTitle = 'Inspect emergency bilge pump';
const firstTitle = 'Inspect bilge pump and discharge line';
const draftTitle = 'Inspect bilge pump before departure';
const created = await api(
  collection,
  manager.accessToken,
  'POST',
  {
    title: originalTitle,
    category: 'INSPECTION',
    priority: 'NORMAL',
    assigneeId: null,
    targetDate: null,
  },
  201,
);
assert.equal(created.revision, 1);
const orderPath = `${collection}/${created.id}`;
const pageUrl = `${origin}/app/vessels/${vesselId}/maintenance/${created.id}`;

const chrome = spawn(
  chromePath,
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
try {
  const websocket = await new Promise((done, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Local Chrome startup timed out.')),
      15_000,
    );
    chrome.once('error', reject);
    chrome.once('exit', () => {
      clearTimeout(timer);
      reject(new Error('Local Chrome exited.'));
    });
    chrome.stderr.on('data', (chunk) => {
      const match = String(chunk).match(/DevTools listening on (ws:\/\/\S+)/u);
      if (match) {
        clearTimeout(timer);
        done(match[1]);
      }
    });
  });
  socket = new WebSocket(websocket);
  await new Promise((done, reject) => {
    socket.addEventListener('open', done, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  const pending = new Map();
  const requests = [];
  const responses = [];
  const runtimeErrors = [];
  const presentationActions = [];
  const documentNavigations = [];
  let recordingSession;
  const inFlight = new Map();
  const documentLoaders = new Map();
  const lastNetworkActivity = new Map();
  let serial = 0;
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Page.frameNavigated' && !message.params.frame.parentId)
      documentLoaders.set(message.sessionId, message.params.frame.loaderId);
    if (
      message.sessionId === recordingSession &&
      message.method === 'Page.frameNavigated' &&
      !message.params.frame.parentId
    )
      documentNavigations.push(new URL(message.params.frame.url).pathname);
    video?.onMessage(message, send);
    if (message.method === 'Network.requestWillBeSent') {
      inFlight.set(`${message.sessionId}:${message.params.requestId}`, {
        session: message.sessionId,
        loader: message.params.loaderId,
        path: new URL(message.params.request.url).pathname,
      });
      lastNetworkActivity.set(message.sessionId, Date.now());
    }
    if (['Network.loadingFinished', 'Network.loadingFailed'].includes(message.method)) {
      inFlight.delete(`${message.sessionId}:${message.params.requestId}`);
      lastNetworkActivity.set(message.sessionId, Date.now());
    }
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      clearTimeout(request.timer);
      if (message.error)
        request.reject(new Error(`Chrome protocol error: ${message.error.code}`));
      else request.done(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown')
      runtimeErrors.push('Browser runtime exception');
    if (message.method === 'Network.requestWillBeSent') {
      const request = message.params.request;
      if (request.method === 'PUT' && request.url.endsWith(orderPath))
        requests.push({
          session: message.sessionId,
          expectedRevision: JSON.parse(request.postData).expectedRevision,
        });
    }
    if (
      message.method === 'Network.responseReceived' &&
      message.params.response.url.endsWith(orderPath)
    )
      responses.push(message.params.response.status);
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((done, reject) => {
      const id = ++serial;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Chrome timed out: ${method}`));
      }, 15_000);
      pending.set(id, { done, reject, timer });
      socket.send(
        JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }),
      );
    });
  async function tab(role) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', {
      targetId,
      flatten: true,
    });
    const cdp = (method, params = {}) => send(method, params, sessionId);
    const evaluate = async (expression) => {
      const result = await cdp('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (result.exceptionDetails) throw new Error('Browser expression failed.');
      return result.result.value;
    };
    const wait = async (expression) => {
      for (let attempt = 0; attempt < 150; attempt++) {
        if (await evaluate(expression)) return;
        await new Promise((done) => setTimeout(done, 100));
      }
      throw new Error(`UI condition timed out: ${expression}`);
    };
    const view = async (expression, align = 'nearest') => {
      await wait(`!!(${expression})`);
      await evaluate(`(${installProductGuidance.toString()})();true`);
      const before = await evaluate('scrollY');
      await evaluate(
        `window.keelwatchCaptureGuidance.reveal((${expression}), false, ${JSON.stringify(align)})`,
      );
      const after = await evaluate('scrollY');
      if (Math.abs(after - before) > 2)
        presentationActions.push({ type: 'scroll', from: before, to: after });
    };
    const clickElement = async (expression) => {
      if (!video) return evaluate(`(${expression}).click()`);
      await view(expression);
      const { x, y } = await evaluate(
        `window.keelwatchCaptureGuidance.point((${expression}))`,
      );
      assert.equal(
        await evaluate(
          `(()=>{const target=(${expression});const hit=document.elementFromPoint(${x},${y});return hit===target||target.contains(hit)})()`,
        ),
        true,
        'The recording cursor must hit the actual control.',
      );
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      for (const type of ['mousePressed', 'mouseReleased'])
        await cdp('Input.dispatchMouseEvent', {
          type,
          x,
          y,
          button: 'left',
          clickCount: 1,
        });
      presentationActions.push({ type: 'click' });
      await evaluate('window.keelwatchCaptureGuidance.clicked()');
    };
    const click = async (text) => {
      await wait(
        `[...document.querySelectorAll('button')].some(b => b.textContent.trim() === ${JSON.stringify(text)} && !b.disabled)`,
      );
      await clickElement(
        `[...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)})`,
      );
    };
    await cdp('Runtime.enable');
    await cdp('Page.enable');
    await cdp('Network.enable');
    await cdp('Network.setBlockedURLs', { urls: ['https://*'] });
    await cdp('Emulation.setDeviceMetricsOverride', {
      width: videoMode ? 1280 : 1440,
      height: videoMode ? 800 : 1100,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await cdp('Page.navigate', { url: `${origin}/sign-in` });
    const name = role === 'manager' ? 'Demo Manager' : 'Demo Auditor';
    await wait(
      `[...document.querySelectorAll('button .identity-option__role')].some(e => e.textContent === '${name}')`,
    );
    await evaluate(
      `[...document.querySelectorAll('button .identity-option__role')].find(e => e.textContent === '${name}').closest('button').click()`,
    );
    await wait(
      "!!document.querySelector('.app-shell') || !!document.querySelector('a[href=\"/app/vessels\"]')",
    );
    await cdp('Page.navigate', { url: pageUrl });
    await wait(
      "!!document.querySelector('#maintenance-record-heading') && document.querySelectorAll('.maintenance-history ol > li').length > 0",
    );
    await evaluate('document.fonts.ready.then(() => true)');
    if (video) await view("document.querySelector('.page-heading')", 'start');
    return { cdp, evaluate, wait, click, clickElement, view, sessionId };
  }
  const images = [];
  async function capture(tab, file, selector) {
    if (video) await select(tab);
    // A background headless tab can suspend animation frames indefinitely.
    await tab.cdp('Page.bringToFront');
    // Let sections above Activity finish loading before choosing the scroll position.
    // Cancelled requests from another document/tab cannot settle the visible view.
    const currentRequests = () =>
      [...inFlight.values()].filter(
        (request) =>
          request.session === tab.sessionId &&
          request.loader === documentLoaders.get(tab.sessionId),
      );
    const deadline = Date.now() + 15_000;
    while (
      currentRequests().length > 0 ||
      Date.now() - (lastNetworkActivity.get(tab.sessionId) ?? 0) < 300
    ) {
      if (Date.now() > deadline) {
        console.error(
          'Pending capture resources:',
          currentRequests().map((r) => r.path),
        );
        throw new Error('Capture requires settled local requests.');
      }
      await new Promise((done) => setTimeout(done, 50));
    }
    await tab.evaluate('document.fonts.ready.then(() => true)');
    if (selector && video)
      await tab.view(`document.querySelector(${JSON.stringify(selector)})`, 'start');
    else if (selector)
      await tab.evaluate(
        `document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start'})`,
      );
    else if (!video) await tab.evaluate('window.scrollTo(0,0)');
    await tab.cdp('Runtime.evaluate', {
      expression:
        'new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))',
      awaitPromise: true,
    });
    assert.equal(
      await tab.evaluate('document.documentElement.scrollWidth > innerWidth'),
      false,
    );
    const { data } = await tab.cdp('Page.captureScreenshot', { format: 'png' });
    const bytes = Buffer.from(data, 'base64');
    await writeFile(resolve(assets, file), bytes);
    images.push({
      file,
      bytes: bytes.length,
      width: videoMode ? 1280 : 1440,
      height: videoMode ? 800 : 1100,
    });
    console.log(`Captured ${file}`);
  }
  async function inputTitle(tab, value) {
    if (video) await tab.clickElement("document.querySelector('#order-title')");
    await tab.evaluate(
      "document.querySelector('#order-title').focus(); document.querySelector('#order-title').select()",
    );
    if (video) {
      for (const character of value) {
        await tab.cdp('Input.insertText', { text: character });
        await new Promise((done) => setTimeout(done, 45));
      }
    } else await tab.cdp('Input.insertText', { text: value });
    await tab.wait(
      `document.querySelector('#order-title').value === ${JSON.stringify(value)}`,
    );
  }
  async function select(tab) {
    await video.select(tab);
    recordingSession = tab.sessionId;
  }
  async function cue(text, seconds) {
    await video?.cue(text, seconds * 0.8);
  }
  const first = await tab('manager');
  const second = await tab('manager');
  for (const editor of [first, second])
    assert.match(
      await editor.evaluate("document.querySelector('.page-heading').textContent"),
      /revision 1/u,
    );
  if (video) {
    await select(first);
    await cue(
      'Keelwatch · A deliberate maintenance edit.\nReal local app, API and PostgreSQL; synthetic data.',
      8,
    );
    await cue(
      'Editor A has reviewed revision 1.\nA second Manager has opened the same order.',
      8,
    );
    await select(second);
    await cue(
      'Editor B also holds revision 1.\nBoth tabs use the shared Demo Manager account.',
      8,
    );
    await cue('Editor B drafts a different maintenance title.', 1);
  }
  await inputTitle(second, draftTitle);
  await capture(second, '01-retained-editor.png');
  await cue('Editor B keeps this title as an unsaved draft.', 8);
  if (video) {
    await select(first);
    await cue('Back to Editor A: prepare a different title.', 1);
  }
  await inputTitle(first, firstTitle);
  if (video) {
    await first.view(
      "[...document.querySelectorAll('button')].find(b => b.textContent === 'Save maintenance changes')",
    );
    await cue('Editor A chooses Save maintenance changes.', 4);
  }
  await first.click('Save maintenance changes');
  await first.wait(
    "document.querySelector('.page-heading').textContent.includes('revision 2')",
  );
  if (video) await first.view("document.querySelector('.page-heading')", 'start');
  await capture(first, '02-first-save.png');
  await cue(
    'The first write is confirmed at revision 2.\nEditor B still holds a revision-1 draft.',
    12,
  );
  assert.equal((await api(orderPath, manager.accessToken)).title, firstTitle);
  const beforeConflict = await api(`${orderPath}/history`, manager.accessToken);
  if (video) {
    await select(second);
    await second.view(
      "[...document.querySelectorAll('button')].find(b => b.textContent === 'Save maintenance changes')",
    );
    await cue('Editor B tries to save the older reviewed revision.', 4);
  }
  await second.click('Save maintenance changes');
  await second.wait(
    "!!document.querySelector('#maintenance-review-heading') && !document.querySelector('.maintenance-form fieldset').disabled",
  );
  assert.equal(
    await second.evaluate("document.querySelector('#order-title').value"),
    draftTitle,
  );
  assert.match(
    await second.evaluate("document.querySelector('.maintenance-review').textContent"),
    /Current revision: 2/u,
  );
  assert.equal((await api(orderPath, manager.accessToken)).revision, 2);
  assert.deepEqual(
    await api(`${orderPath}/history`, manager.accessToken),
    beforeConflict,
  );
  await capture(
    second,
    '03-stale-write-review.png',
    video ? '.maintenance-review' : '.maintenance-form',
  );
  assert.ok(
    responses.includes(409),
    'The recorded conflict must be an actual stale-write rejection.',
  );
  await cue(
    'The stale save is rejected. The draft is retained.\nThe server remains at revision 2.',
    10,
  );
  if (video) {
    await second.clickElement("document.querySelector('.toast--error .toast__close')");
    await second.view("document.querySelector('.maintenance-review')", 'start');
  }
  await cue(
    'Review the previous title, current title and draft.\nLeave the draft unchanged to keep your intended title.',
    12,
  );
  const writesBeforeReview = requests.length;
  if (video) {
    const reviewed =
      "[...document.querySelectorAll('button')].find(b => b.textContent === 'Continue with reviewed values')";
    await second.view(reviewed);
    await second.evaluate(`window.keelwatchCaptureGuidance.point((${reviewed}))`);
  }
  await second.evaluate(
    "[...document.querySelectorAll('button')].find(b => b.textContent === 'Continue with reviewed values').focus()",
  );
  await second.cdp('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Enter',
    code: 'Enter',
    windowsVirtualKeyCode: 13,
    text: '\r',
  });
  await second.cdp('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Enter',
    code: 'Enter',
    windowsVirtualKeyCode: 13,
  });
  await second.wait(
    "!document.querySelector('.maintenance-review') && ![...document.querySelectorAll('button')].find(b => b.textContent === 'Save maintenance changes').disabled",
  );
  assert.equal((await api(orderPath, manager.accessToken)).revision, 2);
  assert.equal(requests.length, writesBeforeReview);
  await capture(second, '04-reviewed-draft.png', '.maintenance-form');
  if (video) {
    await second.view(
      "[...document.querySelectorAll('button')].find(b => b.textContent === 'Save maintenance changes')",
    );
    await cue(
      'Continue accepts the reviewed revision without writing.\nSaving is a separate, deliberate action.',
      12,
    );
  }
  await second.click('Save maintenance changes');
  await second.wait(
    "document.querySelector('.page-heading').textContent.includes('revision 3') && document.querySelectorAll('.maintenance-history ol > li').length === 3",
  );
  const saved = await api(orderPath, manager.accessToken);
  assert.equal(saved.title, draftTitle);
  assert.equal(saved.revision, 3);
  if (video) {
    await second.view("document.querySelector('.page-heading')", 'start');
    await cue(
      'The deliberate save succeeds at revision 3.\nThe title now reflects Editor B’s reviewed decision.',
      12,
    );
  }
  const history = await api(`${orderPath}/history`, manager.accessToken);
  assert.equal(history.items.length, 3);
  assert.equal(
    history.items.filter((event) => event.action === 'MAINTENANCE_ORDER_UPDATED').length,
    2,
  );
  assert.ok(history.items.every((event) => event.actorDisplayName === 'Demo Manager'));
  const vessel = await api(`/vessels/${vesselId}`, manager.accessToken);
  assert.ok(
    history.items.every((event) => vessel.activity.some((item) => item.id === event.id)),
  );
  if (video)
    await second.clickElement(
      `document.querySelector('a[href="/app/vessels/${vesselId}"]')`,
    );
  else await second.cdp('Page.navigate', { url: `${origin}/app/vessels/${vesselId}` });
  await second.wait(
    "!!document.querySelector('#vessel-activity-heading') && document.querySelectorAll('.vessel-activity ol > li').length >= 3",
  );
  await capture(
    second,
    '05-confirmed-history.png',
    'section[aria-labelledby="vessel-activity-heading"]',
  );
  await cue(
    'Activity records creation and the two confirmed changes.\nThe rejected save adds no successful event.',
    12,
  );
  await cue(
    'Activity identifies the shared Demo Manager account,\nnot the individual visitor or browser tab.',
    10,
  );
  // Preparing the Auditor happens offscreen; only its settled real view is selected.
  recordingSession = undefined;
  const auditor = await tab('auditor');
  assert.equal(
    await auditor.evaluate("document.querySelectorAll('.maintenance-form').length"),
    0,
  );
  assert.match(
    await auditor.evaluate('document.body.innerText'),
    /Read-only maintenance view/u,
  );
  assert.match(
    await auditor.evaluate("document.querySelector('.page-heading').textContent"),
    /revision 3/u,
  );
  await capture(auditor, '06-auditor.png');
  await cue(
    'Demo Auditor reads the same final title and revision 3.\nThe edit form is replaced by a read-only view.',
    14,
  );
  const issuedAuditor = await api(
    '/access/demo/sessions',
    null,
    'POST',
    { role: 'auditor' },
    201,
  );
  await api(
    orderPath,
    issuedAuditor.accessToken,
    'PUT',
    {
      title: 'Forbidden auditor edit',
      category: 'INSPECTION',
      priority: 'NORMAL',
      expectedRevision: 3,
    },
    403,
  );
  assert.equal((await api(orderPath, manager.accessToken)).revision, 3);
  assert.deepEqual(await api(`${orderPath}/history`, manager.accessToken), history);
  await cue(
    'A direct Auditor write also returned 403.\nRevision and history remain unchanged.',
    10,
  );
  if (video) {
    await cue(
      'Explore the case, six contextual captures and source.\nThis local recording does not establish public availability or capacity.',
      8,
    );
    assert.deepEqual(
      requests.map((request) => request.expectedRevision),
      [1, 1, 2],
    );
    assert.deepEqual(runtimeErrors, []);
    assert.deepEqual(documentNavigations, []);
    const summary = await video.finish({
      applicationSource: state.source,
      postgres: state.postgres,
      browser: (await send('Browser.getVersion')).product,
      preparedAt: state.preparedAt,
      environment:
        'Isolated local schema; real app, API and PostgreSQL; no simulated responses',
      orderId: created.id,
      vesselId,
      expectedRevisions: requests.map((request) => request.expectedRevision),
      finalRevision: saved.revision,
      successfulOrderEvents: history.items.length,
      retainedDraft: true,
      reviewWrites: requests.length - writesBeforeReview - 1,
      staleWrite: 409,
      auditorWrite: 403,
      vesselActivityIncludesOrderEvents: true,
      runtimeErrors,
      presentation: {
        scroll: 'Continuous eased scroll between sections',
        annotations: 'Local recording-only cursor, target outline and click ring',
        actions: presentationActions,
        documentNavigations,
        editorSwitches:
          'Explicit switches between two real Manager tabs and the settled Auditor tab',
        reviewActivation: 'keyboard Enter',
      },
    });
    console.log(
      JSON.stringify({
        video: true,
        duration: summary.durationSeconds,
        bytes: summary.bytes,
        frameEvents: summary.frameEvents,
      }),
    );
  } else {
    const responsive = [];
    for (const width of [320, 375, 768, 1024, 1440]) {
      await auditor.cdp('Emulation.setDeviceMetricsOverride', {
        width,
        height: 1100,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await auditor.evaluate(
        'new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))',
      );
      const layout =
        await auditor.evaluate(`({width:innerWidth, scrollWidth:document.documentElement.scrollWidth,
      overflowing:[...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,5).map(e=>e.className)})`);
      if (layout.scrollWidth > layout.width) {
        const { data } = await auditor.cdp('Page.captureScreenshot', { format: 'png' });
        await writeFile(
          resolve(directory, `auditor-${width}.png`),
          Buffer.from(data, 'base64'),
        );
      }
      responsive.push(layout);
    }
    assert.deepEqual(
      requests.map((request) => request.expectedRevision),
      [1, 1, 2],
    );
    assert.ok(responses.includes(409));
    assert.deepEqual(runtimeErrors, []);
    const summary = {
      capturedAt: new Date().toISOString(),
      applicationSource: state.source,
      postgres: state.postgres,
      browser: (await send('Browser.getVersion')).product,
      environment:
        'Isolated local schema; real app, API and PostgreSQL; no simulated responses',
      orderId: created.id,
      vesselId,
      expectedRevisions: [1, 1, 2],
      finalRevision: 3,
      successfulOrderEvents: history.items.length,
      staleWrite: 409,
      auditorWrite: 403,
      reviewWrites: 0,
      reviewActivation: 'keyboard Enter',
      vesselActivityIncludesOrderEvents: true,
      retainedDraft: true,
      responsiveAuditorWidths: responsive,
      runtimeErrors,
      images,
    };
    await writeFile(
      resolve(assets, 'capture-evidence.json'),
      `${JSON.stringify(summary, null, 2)}\n`,
    );
    console.log(JSON.stringify(summary));
  }
} finally {
  try {
    await video?.close();
  } finally {
    socket?.close();
    chrome.kill();
  }
}
