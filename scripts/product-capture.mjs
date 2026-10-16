// Manual local product recording. Never targets or writes to the public deployment.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomInt, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { format, resolveConfig } from 'prettier';
import { createPresentationVideo } from './presentation-video-recorder.mjs';
import { productVideoPlayer } from './product-video-player.mjs';
import { installProductGuidance } from './product-capture-guidance.mjs';

const rehearsal = process.argv.includes('--rehearse');
const origin = 'http://127.0.0.1:5197';
const directory = resolve('.scratch/product-video');
const state = JSON.parse(
  await readFile('.scratch/maintenance-capture/private-runtime.json', 'utf8'),
);
assert.match(state.schema, /^kw_capture_[a-f0-9]{32}$/u);
const connection = new URL(state.databaseUrl);
assert.ok(['postgresql:', 'postgres:'].includes(connection.protocol));
assert.ok(
  ['localhost', '127.0.0.1', '[::1]'].includes(connection.hostname),
  'Recording requires a local database.',
);
assert.equal(connection.searchParams.get('schema'), state.schema);
await mkdir(resolve(directory, 'stills'), { recursive: true });
async function api(path, token, method = 'GET', body, status = 200) {
  const response = await fetch(`${origin}/api/v1${path}`, {
    method,
    signal: AbortSignal.timeout(15000),
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert.equal(response.status, status, `${method} ${path} returned ${response.status}`);
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
let managerId;
try {
  const [{ current }] = await database.$queryRaw`SELECT current_schema() AS current`;
  assert.equal(current, state.schema);
  managerId = (
    await database.user.findUniqueOrThrow({ where: { externalSubject: 'demo:manager' } })
  ).id;
  assert.equal((await api('/access/me', manager.accessToken)).id, managerId);
} finally {
  await database.$disconnect();
}

const video = rehearsal
  ? undefined
  : await createPresentationVideo({
      name: 'product',
      minimumSeconds: 240,
      maximumSeconds: 300,
    });
const suffix = String(randomInt(800000, 899999));
const registry = `KW-${suffix}`;
const crewNumber = `KW-C-${suffix}`;
const qualificationReference = `KW-Q-${suffix}`;
const vesselName = 'MV Demo Tern';
const crewName = 'Avery Demo';
const orderTitle = 'Inspect emergency lighting';
const date = (offset) =>
  new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
const dates = {
  issuedOn: date(-30),
  expiresOn: date(14),
  validFrom: date(-30),
  qualificationExpiry: date(180),
  startsOn: date(1),
  endsOn: date(7),
};
const chrome = spawn(
  process.env.CAPTURE_CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=0',
    `--user-data-dir=${resolve(directory, `chrome-${randomUUID()}`)}`,
    'about:blank',
  ],
  { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] },
);
let socket;
const pending = new Map();
const inFlight = new Map();
const writes = new Map();
const runtimeErrors = [];
let lastActivity = Date.now();
let serial = 0;
let active;
let stillNumber = 0;
let recordingStarted;
const presentationActions = [];
const documentNavigations = [];
try {
  const address = await new Promise((done, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Capture Chrome startup timed out.')),
      15000,
    );
    const failed = () => {
      clearTimeout(timer);
      reject(new Error('Capture Chrome could not start.'));
    };
    chrome.once('error', failed);
    chrome.once('exit', failed);
    chrome.stderr.on('data', (chunk) => {
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
  const send = (method, params = {}, sessionId) =>
    new Promise((done, reject) => {
      const id = ++serial;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Chrome timed out: ${method}`));
      }, 15000);
      pending.set(id, { done, reject, timer });
      socket.send(
        JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }),
      );
    });
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (
      recordingStarted &&
      message.method === 'Page.frameNavigated' &&
      !message.params.frame.parentId
    )
      documentNavigations.push(new URL(message.params.frame.url).pathname);
    video?.onMessage(message, send);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      clearTimeout(request.timer);
      if (message.error)
        request.reject(new Error(`Chrome protocol error: ${message.error.code}`));
      else request.done(message.result);
    }
    const key = `${message.sessionId}:${message.params?.requestId}`;
    if (message.method === 'Runtime.exceptionThrown')
      runtimeErrors.push('Browser runtime exception');
    if (message.method === 'Network.requestWillBeSent') {
      const request = message.params.request;
      const path = new URL(request.url).pathname;
      inFlight.set(key, path);
      lastActivity = Date.now();
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method))
        writes.set(key, { method: request.method, path });
    }
    if (message.method === 'Network.responseReceived' && writes.has(key))
      writes.get(key).status = message.params.response.status;
    if (['Network.loadingFinished', 'Network.loadingFailed'].includes(message.method)) {
      inFlight.delete(key);
      lastActivity = Date.now();
    }
  });
  async function tab() {
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
      if (result.exceptionDetails)
        throw new Error(`Capture browser expression failed: ${expression}`);
      return result.result.value;
    };
    const wait = async (expression) => {
      for (let i = 0; i < 150; i++) {
        if (await evaluate(expression)) return;
        await new Promise((done) => setTimeout(done, 100));
      }
      throw new Error(`UI condition timed out: ${expression}`);
    };
    await cdp('Runtime.enable');
    await cdp('Page.enable');
    await cdp('Network.enable');
    await cdp('Network.setBlockedURLs', { urls: ['https://*'] });
    await cdp('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
    });
    await cdp('Page.bringToFront');
    return { sessionId, cdp, evaluate, wait };
  }
  async function settle() {
    const deadline = Date.now() + 15000;
    while (inFlight.size || Date.now() - lastActivity < 300) {
      if (Date.now() > deadline)
        throw new Error(
          `Unsettled local resources: ${[...inFlight.values()].join(', ')}`,
        );
      await new Promise((done) => setTimeout(done, 50));
    }
    await active.evaluate('document.fonts.ready.then(() => true)');
  }
  async function viewElement(expression, align = 'nearest') {
    await active.wait(`!!(${expression})`);
    await settle();
    await active.evaluate(`(${installProductGuidance.toString()})();true`);
    const before = await active.evaluate('scrollY');
    await active.evaluate(
      `window.keelwatchCaptureGuidance.reveal((${expression}), ${rehearsal}, ${JSON.stringify(align)})`,
    );
    const after = await active.evaluate('scrollY');
    if (Math.abs(after - before) > 2)
      presentationActions.push({ type: 'scroll', from: before, to: after });
  }
  async function view(selector, align = 'nearest') {
    await active.wait(`!!document.querySelector(${JSON.stringify(selector)})`);
    await viewElement(`document.querySelector(${JSON.stringify(selector)})`, align);
    assert.equal(
      await active.evaluate('document.documentElement.scrollWidth > innerWidth'),
      false,
    );
  }
  async function still(label, selector) {
    await active.wait(`!!document.querySelector(${JSON.stringify(selector)})`);
    await settle();
    const { data } = await active.cdp('Page.captureScreenshot', { format: 'png' });
    await writeFile(
      resolve(
        directory,
        'stills',
        `${String(++stillNumber).padStart(2, '0')}-${label}.png`,
      ),
      Buffer.from(data, 'base64'),
    );
  }
  async function navigate(path, selector) {
    await active.cdp('Page.navigate', { url: `${origin}${path}` });
    await active.wait(
      `location.pathname === ${JSON.stringify(path.split('?')[0])} && document.readyState === 'complete' && !!document.querySelector(${JSON.stringify(selector)})`,
    );
    await view(selector);
  }
  async function clickElement(expression) {
    await viewElement(expression);
    const { x, y } = await active.evaluate(
      `window.keelwatchCaptureGuidance.point((${expression}), ${rehearsal})`,
    );
    await active.cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    assert.equal(
      await active.evaluate(
        `(()=>{const target=(${expression});const hit=document.elementFromPoint(${x},${y});return hit===target||target.contains(hit)})()`,
      ),
      true,
      'The recording cursor must hit the actual control before clicking.',
    );
    await active.cdp('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x,
      y,
      button: 'left',
      clickCount: 1,
    });
    await active.cdp('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x,
      y,
      button: 'left',
      clickCount: 1,
    });
    presentationActions.push({ type: 'click' });
    await active.evaluate('window.keelwatchCaptureGuidance.clicked()');
  }
  async function link(href) {
    const before = await active.evaluate('location.pathname');
    await clickElement(`document.querySelector(${JSON.stringify(`a[href="${href}"]`)})`);
    await active.wait(`location.pathname === ${JSON.stringify(href)}`);
    if (before !== href) await view('.page-heading', 'start');
  }
  async function button(text) {
    const expression = `[...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)} && !b.disabled)`;
    await active.wait(`!!(${expression})`);
    await clickElement(expression);
  }
  async function fill(selector, value) {
    await view(selector);
    const expression = `document.querySelector(${JSON.stringify(selector)})`;
    const { x, y } = await active.evaluate(
      `window.keelwatchCaptureGuidance.point(${expression}, ${rehearsal})`,
    );
    await active.cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await active.evaluate(
      `{const e=${expression};e.focus({preventScroll:true});e.select?.()}`,
    );
    const kind = await active.evaluate(
      `document.querySelector(${JSON.stringify(selector)}).type`,
    );
    if (kind === 'date' || kind === 'select-one') {
      // Enter native control values/events; React still validates and submits real HTTP.
      await active.evaluate(
        `{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(${kind === 'date' ? 'HTMLInputElement' : 'HTMLSelectElement'}.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}`,
      );
    } else {
      for (const character of value) {
        await active.cdp('Input.insertText', { text: character });
        if (!rehearsal) await new Promise((done) => setTimeout(done, 35));
      }
    }
    await active.wait(
      `document.querySelector(${JSON.stringify(selector)}).value === ${JSON.stringify(value)}`,
    );
    presentationActions.push({ type: 'input', selector });
    if (!rehearsal) await new Promise((done) => setTimeout(done, 350));
  }
  async function signIn(role) {
    await active.wait(
      `[...document.querySelectorAll('.identity-option__role')].some(e=>e.textContent==='Demo ${role}')`,
    );
    await clickElement(
      `[...document.querySelectorAll('.identity-option__role')].find(e=>e.textContent==='Demo ${role}').closest('button')`,
    );
    await active.wait(
      `document.querySelector('.account-summary')?.textContent.includes('Demo ${role}')`,
    );
    await view('.page-heading');
  }

  const cue = async (text, seconds, chapter, selector) => {
    if (selector) await view(selector);
    if (video) await video.cue(text, seconds * 0.8, chapter);
    else console.log(`Rehearsal: ${text.replaceAll('\n', ' ')}`);
  };
  active = await tab();
  await navigate('/sign-in', '.identity-option__role');
  await video?.select(active);
  recordingStarted = Date.now();
  await cue(
    'Keelwatch connects fleet records, evidence, people and work.\nIndependent full-stack project · real local app · synthetic data.',
    8,
    'Access and product context',
  );
  await signIn('Manager');
  await cue(
    'Demo Manager can perform operational changes.\nThe API resolves the account and enforces its permissions.',
    10,
  );
  await view('.overview-compliance, #fleet-ready-heading');
  await cue(
    'Overview highlights documentary risks and next actions.\nIt is not a dashboard of every business module.',
    6,
  );

  await link('/app/vessels');
  await active.wait('!!document.querySelector(\'a[href="/app/vessels/new"]\')');
  await cue(
    'Start with a fleet record.\nOne vessel will connect the rest of this journey.',
    6,
    'Fleet registration',
  );
  await link('/app/vessels/new');
  await fill('#vessel-name', vesselName);
  await fill('#registry-number', registry);
  await still('register-vessel', '.vessel-form');
  await cue(
    'Register a synthetic vessel with a unique demo registry number.\nThe same workspace will hold evidence, plans and maintenance.',
    6,
  );
  await button('Register vessel');
  await active.wait("document.body.innerText.includes('Vessel registered.')");
  const vesselPage = await api('/vessels?page=1', manager.accessToken);
  const vessel = vesselPage.items.find((item) => item.registryNumber === registry);
  assert.ok(vessel);
  const vesselPath = `/vessels/${vessel.id}`;
  await still('fleet-registered', '.page-heading');
  await cue(
    'The confirmed record now appears in Fleet.\nOpen it to continue the same operational story.',
    7,
  );
  await link(`/app/vessels/${vessel.id}`);
  await view('.compliance-workspace');
  assert.equal(
    (await api(`${vesselPath}/compliance`, manager.accessToken)).status,
    'MISSING',
  );
  await cue(
    'A new vessel starts with missing certificate evidence.\nCompliance state is derived from recorded dates in UTC.',
    7,
    'Compliance and notifications',
  );
  await fill('#new-certificate-referenceNumber', `KW-CERT-${suffix}`);
  await fill('#new-certificate-issuer', 'Demo Maritime Registry');
  await fill('#new-certificate-issuedOn', dates.issuedOn);
  await fill('#new-certificate-expiresOn', dates.expiresOn);
  await still('certificate-entry', '.certificate-form');
  await cue(
    'Record the existing safety-equipment certificate type.\nThis example expires in 14 days; file attachments are disabled.',
    7,
  );
  await button('Record certificate');
  await active.wait(
    "document.querySelector('.compliance-summary')?.dataset.status === 'EXPIRING_SOON'",
  );
  const compliance = await api(`${vesselPath}/compliance`, manager.accessToken);
  assert.equal(compliance.status, 'EXPIRING_SOON');
  assert.equal(compliance.certificates.length, 1);
  await still('certificate-result', '.compliance-workspace');
  await cue(
    'The saved evidence changes the state to Expiring soon.\nThe reason and dates explain why attention is needed.',
    12,
    undefined,
    '.compliance-summary',
  );
  await link('/app/compliance');
  await fill('#compliance-search', registry);
  await button('Apply filters');
  await view('section[aria-labelledby="compliance-results-heading"]', 'start');
  assert.equal(
    await active.evaluate(
      "[...document.querySelectorAll('.compliance-queue-table .compliance-status')].every(e=>e.getClientRects().length===1)",
    ),
    true,
    'Compliance pills must retain a single border box.',
  );
  await still('risk-queue', 'section[aria-labelledby="compliance-results-heading"]');
  await cue(
    'The fleet-wide risk queue can locate this vessel.\nIts dates and derived state lead back to the same record.',
    10,
    undefined,
    '.compliance-queue-register',
  );
  await view('.notification-watch');
  await button('Run expiry check');
  await active.wait("document.body.innerText.includes('Check complete:')");
  const notifications = await api('/compliance/notifications', manager.accessToken);
  assert.equal(notifications.latestRun.status, 'SUCCEEDED');
  assert.ok(
    notifications.items.some(
      (item) => item.vesselId === vessel.id && item.status === 'EXPIRING_SOON',
    ),
  );
  await still('expiry-check', '.notification-watch');
  await cue(
    'The bounded background check reconciles active notifications.\nThis demo delivery log does not send external email.',
    12,
    undefined,
    '.notification-list',
  );

  await link(`/app/vessels/${vessel.id}`);
  await link('/app/crew');
  await view('.page-heading');
  await cue(
    'Create a synthetic crew profile in the fleet-wide registry.\nA CrewMember is not a login account or access role.',
    8,
    'Crew qualifications and planning',
  );
  await fill('#crew-name', crewName);
  await fill('#crew-number', crewNumber);
  await still('crew-profile', 'section[aria-labelledby="crew-create-heading"]');
  await button('Register profile');
  await active.wait(
    `document.body.innerText.includes('Profile ${crewNumber} registered.')`,
  );
  const member = (await api('/crew-members?page=1', manager.accessToken)).items.find(
    (item) => item.crewNumber === crewNumber,
  );
  assert.ok(member);
  await link(`/app/crew/${member.id}`);
  await fill('#qualification-reference', qualificationReference);
  await fill('#qualification-validFrom', dates.validFrom);
  await fill('#qualification-expiresOn', dates.qualificationExpiry);
  await still(
    'qualification-entry',
    'section[aria-labelledby="record-qualification-heading"]',
  );
  await cue(
    'Record dated demo safety familiarization evidence.\nThe ledger explains validity; it does not certify real fitness.',
    8,
  );
  await button('Record qualification');
  await active.wait(
    `document.body.innerText.includes('Qualification ${qualificationReference} recorded.')`,
  );
  const qualifications = await api(
    `/crew-members/${member.id}/qualifications?page=1`,
    manager.accessToken,
  );
  assert.equal(qualifications.items.length, 1);
  assert.equal(qualifications.items[0].status, 'VALID');
  await still('qualification-result', '.qualification-ledger');
  await cue(
    'The qualification is saved with its history and validity dates.\nNext, connect this profile to a plan for the vessel.',
    7,
    undefined,
    '.qualification-ledger',
  );
  await cue(
    'Return through Fleet to the same vessel.\nNext, select the crew profile and prepare its assignment dates.',
    5,
  );
  await link('/app/vessels');
  await link(`/app/vessels/${vessel.id}`);
  await view('.assignment-plans', 'start');
  await active.wait(
    `[...document.querySelectorAll('input[name="assignment-profile"]')].some(e=>e.closest('label').textContent.includes('${crewNumber}'))`,
  );
  const profile = `[...document.querySelectorAll('input[name="assignment-profile"]')].find(e=>e.closest('label').textContent.includes('${crewNumber}')).closest('label')`;
  await viewElement(profile);
  await cue(
    'Choose the crew profile created earlier.\nThe plan connects that profile to this vessel.',
    5,
  );
  await clickElement(profile);
  await fill('#assignment-role', 'DEMO_DECK');
  await fill('#assignment-startsOn', dates.startsOn);
  await fill('#assignment-endsOn', dates.endsOn);
  await cue(
    'The selected deck function and both dates define this plan.\nEvaluate its requirements before deciding to save.',
    6,
  );
  await view('.requirement-preview');
  await button('Evaluate requirements');
  await active.wait(
    "!!document.querySelector('.requirement-preview .requirement-result')",
  );
  await still('requirement-evaluation', '.requirement-preview');
  await cue(
    'Evaluate demo requirements across the whole planned period.\nAny gaps are advisory; this does not approve boarding.',
    12,
    undefined,
    '.requirement-result',
  );
  await button('Create plan');
  await active.wait("document.body.innerText.includes('Plan saved.')");
  const assignments = await api(
    `${vesselPath}/crew-assignments?page=1`,
    manager.accessToken,
  );
  assert.equal(assignments.items.length, 1);
  assert.equal(assignments.items[0].crewMemberId, member.id);
  await still('assignment-result', '.assignment-plans');
  await cue(
    'The dated assignment plan is now attached to the vessel.\nPlanning is separate from actual presence on board.',
    12,
    undefined,
    '.assignment-history',
  );

  await view('.maintenance-workspace');
  await cue(
    'Maintenance work belongs to this same vessel.\nCreate an order, assign an eligible access user and follow progress.',
    7,
    'Maintenance lifecycle',
  );
  await button('New maintenance order');
  await fill('#order-title', orderTitle);
  await fill('#order-date', dates.startsOn);
  const assignees = await api(
    `${vesselPath}/maintenance-orders/assignees?page=1`,
    manager.accessToken,
  );
  const assigneeIndex = assignees.items.findIndex((item) => item.id === managerId);
  assert.ok(assigneeIndex >= 0);
  await clickElement(
    `document.querySelectorAll('input[name="maintenance-assignee"]')[${assigneeIndex + 1}].closest('label')`,
  );
  await still('maintenance-entry', '.maintenance-form');
  await cue(
    'The responsible maintenance user is an access-account user,\nnot the crew profile created earlier. The target date enables planning.',
    7,
    undefined,
    '.maintenance-form',
  );
  await button('Create maintenance order');
  await active.wait(
    `document.body.innerText.includes('Maintenance order saved. ${orderTitle}')`,
  );
  const orders = await api(
    `${vesselPath}/maintenance-orders?page=1`,
    manager.accessToken,
  );
  assert.equal(orders.items.length, 1);
  const order = orders.items[0];
  assert.equal(order.status, 'OPEN');
  await cue(
    'Creation is confirmed: the order is Open.\nOpen the record to act on saved details and inspect its history.',
    7,
    undefined,
    '.maintenance-register',
  );
  await link(`/app/vessels/${vessel.id}/maintenance/${order.id}`);
  await view('.maintenance-lifecycle');
  for (const [action, label, status, text] of [
    [
      'PLAN',
      'Plan order',
      'PLANNED',
      'Planning confirms the saved responsible user and target date.',
    ],
    [
      'START',
      'Start work',
      'IN_PROGRESS',
      'Start work moves the saved order into In progress.',
    ],
    [
      'CLOSE',
      'Close order',
      'CLOSED',
      'Closing completes this order. Its final state and history remain readable.',
    ],
  ]) {
    await fill('#maintenance-action', action);
    await button(label);
    await active.wait(
      `document.querySelector('.page-heading').innerText.includes('${status === 'IN_PROGRESS' ? 'In progress' : status[0] + status.slice(1).toLowerCase()}')`,
    );
    await still(`maintenance-${status.toLowerCase()}`, '.page-heading');
    await cue(text, 7, undefined, '.page-heading');
  }
  const orderPath = `${vesselPath}/maintenance-orders/${order.id}`;
  const finalOrder = await api(orderPath, manager.accessToken);
  assert.equal(finalOrder.status, 'CLOSED');
  assert.equal(finalOrder.revision, 4);
  const history = await api(`${orderPath}/history`, manager.accessToken);
  assert.equal(history.items.length, 4);
  await link(`/app/vessels/${vessel.id}`);
  await view('section[aria-labelledby="vessel-activity-heading"]', 'start');
  const confirmed = await api(vesselPath, manager.accessToken);
  assert.equal(confirmed.activity.length, 7);
  for (const action of [
    'VESSEL_CREATED',
    'CERTIFICATE_CREATED',
    'CREW_ASSIGNMENT_CREATED',
    'MAINTENANCE_ORDER_CREATED',
    'MAINTENANCE_ORDER_TRANSITIONED',
  ])
    assert.ok(confirmed.activity.some((item) => item.action === action));
  assert.ok(confirmed.activity.every((item) => item.actorDisplayName === 'Demo Manager'));
  await still('activity', 'section[aria-labelledby="vessel-activity-heading"]');
  await cue(
    'Activity connects vessel, certificate, crew plan and maintenance changes.\nThe confirmed facts belong to the same vessel workspace.',
    9,
    'Activity and Auditor',
  );
  await cue(
    'History identifies the shared Demo Manager account.\nIt does not identify the individual visitor or browser tab.',
    8,
  );

  await cue(
    'Switch to Demo Auditor to inspect the same records.\nChanging roles clears the previous account session.',
    5,
  );
  await button('Sign out');
  await active.wait("!!document.querySelector('.identity-option__role')");
  await signIn('Auditor');
  await active.wait(`location.pathname === '/app/vessels/${vessel.id}'`);
  await view('.compliance-workspace', 'start');
  assert.equal(
    await active.evaluate(
      "document.querySelectorAll('.certificate-form,.maintenance-form,#assignment-startsOn').length",
    ),
    0,
  );
  await still('auditor-evidence', '.compliance-workspace');
  await cue(
    'Demo Auditor inspects the same vessel and certificate evidence.\nOperational write forms are absent for this read-only role.',
    9,
  );
  await still('auditor-maintenance', '.maintenance-workspace');
  await cue(
    'The same completed order remains readable with its history.\nRead access and write permissions are enforced by the API.',
    8,
    undefined,
    '.maintenance-workspace',
  );
  const auditor = await api(
    '/access/demo/sessions',
    null,
    'POST',
    { role: 'auditor' },
    201,
  );
  await api(
    vesselPath,
    auditor.accessToken,
    'PUT',
    { name: 'Forbidden auditor edit', registryNumber: registry },
    403,
  );
  assert.deepEqual(await api(vesselPath, manager.accessToken), confirmed);
  await cue(
    'A direct Auditor update also returns 403 in the script check.\nThe vessel and its Activity remain unchanged.',
    7,
  );
  await view('.page-heading');
  await cue(
    'Continue with the separate Maintenance conflict/recovery video.\nExplore the case, demo and source; local footage does not prove capacity.',
    Math.max(9, (242 - (Date.now() - recordingStarted) / 1000) / 0.8),
  );
  await settle();
  const browserWrites = [...writes.values()];
  assert.ok(browserWrites.length >= 10);
  assert.ok(browserWrites.every((write) => write.status >= 200 && write.status < 300));
  assert.equal(
    browserWrites.filter((write) => write.path.endsWith('/transitions')).length,
    3,
  );
  assert.deepEqual(runtimeErrors, []);
  assert.deepEqual(
    documentNavigations,
    [],
    'The recorded journey must retain SPA navigation without document reloads.',
  );
  const evidence = {
    applicationSource: state.source,
    preparedAt: state.preparedAt,
    postgres: state.postgres,
    browser: (await send('Browser.getVersion')).product,
    environment: 'Isolated local schema; real app/API/PostgreSQL; no simulated responses',
    preparation:
      'Existing synthetic seeds only; featured vessel, certificate, crew profile, qualification, plan and order created through the recorded UI',
    registryNumber: registry,
    vesselId: vessel.id,
    vesselName,
    crewMemberId: member.id,
    crewNumber,
    qualificationId: qualifications.items[0].id,
    assignmentId: assignments.items[0].id,
    orderId: order.id,
    dates,
    complianceStatus: compliance.status,
    notificationJob: notifications.latestRun.status,
    assignmentStatus: assignments.items[0].status,
    maintenanceStatus: finalOrder.status,
    maintenanceRevision: finalOrder.revision,
    maintenanceEvents: history.items.length,
    vesselActivityEvents: confirmed.activity.length,
    activityActions: confirmed.activity.map((item) => item.action),
    auditorWrite: 403,
    auditorUnchanged: true,
    browserWrites,
    runtimeErrors,
    presentation: {
      scrolls: 'Continuous eased scrolling through the real page',
      pointer: 'Recording-only visible cursor and click ring; real browser mouse events',
      highlights:
        'Recording-only outlines using product colors; underlying records unchanged',
      navigation: 'Real SPA links; no document reload during the recorded scenario',
      assignmentPreparationVisible: true,
      documentNavigations,
      actions: presentationActions,
    },
  };
  if (video) {
    await writeFile(
      resolve(directory, 'scenario-evidence.json'),
      `${JSON.stringify(evidence, null, 2)}\n`,
    );
    const result = await video.finish(evidence);
    await writeFile(
      'docs/flagship/media/product/product-player.html',
      await format(productVideoPlayer(result.chapters), {
        ...(await resolveConfig('docs/flagship/media/product/product-player.html')),
        parser: 'html',
      }),
    );
    console.log(
      JSON.stringify({
        recorded: true,
        seconds: result.durationSeconds,
        bytes: result.bytes,
        chapters: result.chapters.length,
      }),
    );
  } else {
    await writeFile(
      resolve(directory, 'rehearsal-evidence.json'),
      `${JSON.stringify(evidence, null, 2)}\n`,
    );
    console.log(
      JSON.stringify({
        rehearsal: true,
        vessel: registry,
        writes: browserWrites.length,
        maintenanceRevision: 4,
        auditorWrite: 403,
      }),
    );
  }
} finally {
  try {
    await video?.close();
  } finally {
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(new Error('Capture browser closed.'));
    }
    socket?.close();
    chrome.kill();
  }
}
