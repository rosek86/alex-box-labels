import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const output = new URL('dist/', root);

test('build statyczny działa pod ścieżką repozytorium bez serwera TypeScript', async () => {
  const build = spawnSync(process.execPath, ['scripts/build.ts'], {
    cwd: fileURLToPath(root),
    encoding: 'utf8',
  });
  assert.equal(build.status, 0, build.stdout + build.stderr);
  const files = await readdir(output, { recursive: true });
  assert.ok(files.includes('index.html'));
  assert.ok(files.includes('main.css'));
  assert.ok(files.includes('.nojekyll'));
  assert.ok(!files.some((file) => /\.(?:ts|json)$/.test(file)));
  assert.ok(!files.some((file) => file.includes('server') || file.includes('node_modules')));
  assert.ok(!files.some((file) => file.includes('partdb') || file.includes('.env')));

  const base = new URL('https://example.github.io/box-labels/');
  const html = await readFile(new URL('index.html', output), 'utf8');
  assert.doesNotMatch(html, /\.ts["']/);
  const references = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)].map(
    (match) => {
      assert.ok(match[1]);
      return new URL(match[1], base);
    },
  );
  const visited = new Set<string>();
  while (references.length > 0) {
    const url = references.pop();
    assert.ok(url);
    if (visited.has(url.href)) continue;
    visited.add(url.href);
    assert.ok(url.href.startsWith(base.href), `Zasób wychodzi poza katalog repozytorium: ${url}`);
    const relativePath = url.href.slice(base.href.length);
    const content = await readFile(new URL(relativePath, output), 'utf8');
    if (!url.pathname.endsWith('.js')) continue;
    const syntax = spawnSync(process.execPath, ['--check', '--input-type=module'], {
      input: content,
      encoding: 'utf8',
    });
    assert.equal(syntax.status, 0, `${url}: ${syntax.stderr}`);
    for (const match of content.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) {
      assert.ok(match[1]);
      assert.ok(match[1].endsWith('.js'), `Niepoprawny import w ${url}: ${match[1]}`);
      references.push(new URL(match[1], url));
    }
  }
  assert.ok(visited.has(new URL('src/core/layout.js', base).href));
  assert.ok(visited.has(new URL('src/data/presets.js', base).href));
});
