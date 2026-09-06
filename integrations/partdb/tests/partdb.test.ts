import test from 'node:test';
import assert from 'node:assert/strict';
import { PartDbClient } from '../src/partdb/client.ts';
import { makeLabels } from '../src/partdb/export.ts';
import { parseConfig } from '../src/partdb/config.ts';
import { selectParts } from '../src/partdb/selection.ts';
import { parseProject } from '../src/core/project.ts';

test('connection errors explain TLS failures without revealing credentials', async () => {
  for (const [code, message] of [
    ['DEPTH_ZERO_SELF_SIGNED_CERT', /NODE_EXTRA_CA_CERTS/],
    ['ERR_TLS_CERT_ALTNAME_INVALID', /hostname mismatch/],
    ['CERT_HAS_EXPIRED', /expired/],
    ['ECONNREFUSED', /ECONNREFUSED/],
  ] as const) {
    const fetcher: typeof fetch = async () => {
      throw new TypeError('fetch failed secret-token', {
        cause: { code, message: 'secret-token' },
      });
    };
    const client = new PartDbClient('https://partdb.test/', 'secret-token', fetcher);
    await assert.rejects(client.get('api/parts/1'), (error: Error) => {
      assert.match(error.message, message);
      assert.doesNotMatch(error.message, /secret-token/);
      return true;
    });
  }
});

function fixture(routes: Record<string, unknown>) {
  const calls: string[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    calls.push(url.pathname + url.search);
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer test-token');
    assert.equal(init?.redirect, 'error');
    const data = routes[url.pathname + url.search];
    return new Response(JSON.stringify(data ?? {}), { status: data ? 200 : 404 });
  };
  return { client: new PartDbClient('http://partdb.test/db/', 'test-token', fetcher), calls };
}

const part = {
  id: 1,
  name: 'Timer',
  manufacturer_product_number: 'NE555P',
  manufacturer: '/db/api/manufacturers/1',
  orderdetails: [
    { supplier: { name: 'Mouser Electronics' }, supplierpartnr: '595-NE555P', obsolete: false },
    { supplier: { name: 'Digi Key' }, supplierpartnr: 'TEST-D', obsolete: true },
    { supplier: { name: 'LCSC' }, supplierpartnr: 'C123', obsolete: false },
  ],
};

test('paginated selection fetches full parts and caches linked manufacturers', async () => {
  const { client, calls } = fixture({
    '/db/api/parts?order%5Bid%5D=asc&itemsPerPage=100&category=12&storage_location=7': {
      'hydra:member': [{ '@id': '/db/api/parts/1' }],
      'hydra:view': { 'hydra:next': '/db/api/parts?page=2' },
    },
    '/db/api/parts?page=2': { member: [{ '@id': '/db/api/parts/2' }], view: {} },
    '/db/api/parts/1': part,
    '/db/api/parts/2': { ...part, id: 2 },
    '/db/api/manufacturers/1': { name: 'Texas Instruments' },
  });
  const parts = await selectParts(client, { category: '12', location: '7' });
  const result = await makeLabels(client, parts, parseConfig({}));
  assert.deepEqual(result.labels, ['TI\nNE555P\nM:595-NE555P', 'TI\nNE555P\nM:595-NE555P']);
  assert.equal(result.warnings.length, 2);
  assert.equal(calls.filter((path) => path.includes('manufacturers')).length, 1);
  assert.deepEqual(
    parseProject({ version: 1, settings: {}, labels: result.labels }).labels,
    result.labels,
  );
});

test('explicit supplier, alias overrides, missing fields and obsolete offers', async () => {
  const { client } = fixture({ '/db/api/manufacturers/1': { name: 'Texas Instruments' } });
  const config = parseConfig({
    manufacturers: { 'texas instruments': 'TEX' },
    supplierPriority: ['L', 'M'],
  });
  assert.deepEqual((await makeLabels(client, [part], config)).labels, ['TEX\nNE555P\nL:C123']);
  assert.deepEqual((await makeLabels(client, [part], config, 'M')).labels, [
    'TEX\nNE555P\nM:595-NE555P',
  ]);
  const missing = await makeLabels(
    client,
    [{ id: 3, name: '10k 0603', orderdetails: [] }],
    config,
    'T',
  );
  assert.deepEqual(missing.labels, ['10k 0603']);
  assert.equal(missing.warnings.length, 3);
  assert.match((await makeLabels(client, [part], config, 'D')).warnings[0]!, /no active supplier/);
  await assert.rejects(makeLabels(client, [{ name: 'X' }], config), /orderdetails missing/);
});

test('resolves offer and supplier IRIs and preserves exact supplier numbers', async () => {
  const { client } = fixture({
    '/db/api/orderdetails/1': { supplier: '/db/api/suppliers/1', supplierpartnr: '001-ABC/TR' },
    '/db/api/suppliers/1': { name: 'Digi-Key' },
  });
  const result = await makeLabels(
    client,
    [{ name: 'ABC', orderdetails: ['/db/api/orderdetails/1'] }],
    parseConfig({}),
  );
  assert.deepEqual(result.labels, ['ABC\nD:001-ABC/TR']);
});

test('untrusted API links, pagination loops, malformed data and HTTP errors fail clearly', async () => {
  const { client, calls } = fixture({
    '/db/api/loop': { member: [], view: { next: '/db/api/loop' } },
    '/db/api/bad': { unexpected: [] },
    '/db/api/external': { member: [], view: { next: 'https://evil.test/api/parts' } },
  });
  await assert.rejects(client.get('https://evil.test/api/parts'), /outside/);
  await assert.rejects(client.get('/admin'), /outside/);
  assert.equal(calls.length, 0);
  await assert.rejects(client.collection('api/loop'), /loop/);
  await assert.rejects(client.collection('api/bad'), /collection/);
  await assert.rejects(client.collection('api/external'), /outside/);
  await assert.rejects(client.get('api/missing'), /HTTP 404/);
  assert.throws(() => parseConfig({ suppliers: { X: 3 } }), /dictionary/);
  assert.throws(() => parseConfig({ supplierPriority: 'M' }), /supplierPriority/);
  assert.throws(() => parseConfig({ typo: {} }), /Unknown/);
});
