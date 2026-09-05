import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const output = new URL('dist/', root);
const html = await readFile(new URL('index.html', root), 'utf8');
const entry = 'src="./src/browser/app.ts"';
if (!html.includes(entry)) throw new Error('Entry module not found in index.html.');

// Always rebuild the generated directory so removed modules cannot survive a deployment.
await rm(output, { recursive: true, force: true });
const compilation = spawnSync(
  process.execPath,
  [fileURLToPath(new URL('node_modules/typescript/bin/tsc', root)), '-p', 'tsconfig.build.json'],
  { cwd: fileURLToPath(root), stdio: 'inherit' },
);
if (compilation.error) throw compilation.error;
if (compilation.status !== 0) process.exit(compilation.status ?? 1);

await mkdir(output, { recursive: true });
await Promise.all([
  writeFile(new URL('index.html', output), html.replace(entry, 'src="./src/browser/app.js"')),
  copyFile(new URL('main.css', root), new URL('main.css', output)),
  writeFile(new URL('.nojekyll', output), ''),
]);
console.log('Build ready in dist/: static HTML, CSS and JavaScript ESM modules.');
