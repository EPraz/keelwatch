import { measureReads } from './demo-performance-runner.mjs';

function options(args) {
  const values = {
    '--api-base': 'https://keelwatch-api.onrender.com/api/v1',
    '--role': 'auditor',
    '--rounds': '6',
    '--duration-ms': '180000',
    '--request-timeout-ms': '60000',
  };
  for (let index = 0; index < args.length; index += 2) {
    if (!Object.hasOwn(values, args[index]) || !args[index + 1])
      throw Error('Invalid option.');
    values[args[index]] = args[index + 1];
  }
  const target = new URL(values['--api-base']);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname);
  if (
    target.username ||
    target.password ||
    target.search ||
    target.hash ||
    target.pathname.replace(/\/$/u, '') !== '/api/v1' ||
    (target.protocol !== 'https:' && !(local && target.protocol === 'http:'))
  )
    throw Error('Invalid API origin.');
  const integer = (key, maximum) => {
    if (!/^\d+$/u.test(values[key])) throw Error('Invalid budget.');
    const value = Number(values[key]);
    if (value < 1 || value > maximum) throw Error('Invalid budget.');
    return value;
  };
  if (!['manager', 'auditor'].includes(values['--role'])) throw Error('Invalid role.');
  return {
    apiBase: target.href.replace(/\/$/u, ''),
    role: values['--role'],
    rounds: integer('--rounds', 6),
    durationMs: integer('--duration-ms', 180000),
    requestTimeoutMs: integer('--request-timeout-ms', 60000),
  };
}

try {
  const selected = options(process.argv.slice(2));
  console.error(
    `Budget chosen before requests: concurrency 1, at most 30 requests, ${selected.durationMs} ms; no retries.`,
  );
  const report = await measureReads(selected);
  console.log(JSON.stringify(report, null, 2));
  if (report.summary.failed || report.stopReason !== 'completed') process.exitCode = 1;
} catch {
  console.error(
    'Measurement could not run. Check options and API reachability. No credentials or internal error details emitted.',
  );
  process.exitCode = 1;
}
