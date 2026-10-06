import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const repositoryRoot = process.cwd();
const sourceRoots = ['apps/api/src', 'apps/web/src'];
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);
const findings = [];

async function collectFiles(directory) {
  const entries = await readdir(join(repositoryRoot, directory), { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path)));
    } else if (sourceExtensions.has(extname(entry.name))) {
      files.push(path);
    }
  }

  return files;
}

for (const sourceRoot of sourceRoots) {
  const files = await collectFiles(sourceRoot);
  for (const file of files) {
    const content = await readFile(join(repositoryRoot, file), 'utf8');
    const lineCount = content.split(/\r?\n/u).length;
    const displayPath = relative(repositoryRoot, join(repositoryRoot, file));

    if (!/\.(spec|test)\.[jt]sx?$/u.test(file) && lineCount > 200) {
      findings.push(
        `${displayPath}: ${lineCount} lines exceeds the 200-line review limit.`,
      );
    }

    if (file.startsWith('apps/web/') && /from ['"][^'"]*apps\/api\/src/u.test(content)) {
      findings.push(
        `${displayPath}: frontend imports backend source instead of the HTTP contract.`,
      );
    }

    if (/packages[\\/]contracts/u.test(content)) {
      findings.push(`${displayPath}: manual shared contracts package is not permitted.`);
    }
  }
}

if (findings.length > 0) {
  console.error('Convention audit failed:\n');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log('Convention audit passed.');
}
