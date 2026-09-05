import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawnSync } from 'node:child_process';
import { createAppServer } from '../src/server/http.ts';

// Verifies the browser's entire runtime import graph, not just the HTML response.
test('serwer dostarcza index.html i poprawny graf modułów JavaScript ESM', async (t) => {
  const server = createAppServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  );
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;

  const home = await fetch(base);
  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-type') ?? '', /text\/html/);
  const html = await home.text();
  assert.match(html, /type="module"\s+src="\.\/src\/browser\/app.ts"/);
  assert.equal(await (await fetch(`${base}/index.html`)).text(), html);

  const pending = [new URL('/src/browser/app.ts', base).href];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const url = pending.pop();
    assert.ok(url);
    if (visited.has(url)) continue;
    visited.add(url);
    const response = await fetch(url);
    assert.equal(response.status, 200, url);
    assert.match(response.headers.get('content-type') ?? '', /text\/javascript/);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    const javascript = await response.text();
    const syntax = spawnSync(process.execPath, ['--check', '--input-type=module'], {
      input: javascript,
      encoding: 'utf8',
    });
    assert.equal(syntax.status, 0, `${url}: ${syntax.stderr}`);
    for (const match of javascript.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) {
      const specifier = match[1];
      assert.ok(specifier);
      assert.ok(specifier.startsWith('.'), `Import przeglądarki musi być względny: ${specifier}`);
      pending.push(new URL(specifier, url).href);
    }
  }
  assert.ok(visited.has(`${base}/src/core/layout.ts`));
  assert.ok(visited.has(`${base}/src/data/presets.ts`));

  const head = await fetch(`${base}/src/browser/app.ts`, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.equal((await fetch(`${base}/`, { method: 'POST' })).status, 405);
  for (const path of [
    '/server.ts',
    '/src/server/http.ts',
    '/package.json',
    '/.nvmrc',
    '/missing',
    '/%2e%2e/package.json',
  ]) {
    assert.equal((await fetch(`${base}${path}`)).status, 404, path);
  }
  assert.equal((await fetch(`${base}/main.css?version=1`)).status, 200);
});
