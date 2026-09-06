import { isRecord } from '../core/validation.ts';

export type ApiObject = Record<string, unknown>;

/** Read-only client. Relations and pagination may never send credentials to another origin. */
export class PartDbClient {
  private readonly base: URL;
  private readonly token: string;
  private readonly fetcher: typeof fetch;
  private readonly cache = new Map<string, Promise<ApiObject>>();

  constructor(baseUrl: string, token: string, fetcher: typeof fetch = fetch) {
    this.token = token;
    this.fetcher = fetcher;
    this.base = new URL(baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
    if (
      !['http:', 'https:'].includes(this.base.protocol) ||
      this.base.username ||
      this.base.password ||
      this.base.search ||
      this.base.hash
    ) {
      throw new Error(
        'PARTDB_URL must be an HTTP(S) installation URL without credentials, query or fragment.',
      );
    }
    if (!token.trim()) throw new Error('PARTDB_TOKEN is required.');
  }

  private url(path: string): URL {
    const url = new URL(path, this.base);
    if (
      url.origin !== this.base.origin ||
      !url.pathname.startsWith(`${this.base.pathname}api/`) ||
      url.username ||
      url.password
    ) {
      throw new Error('PART-DB returned a link outside its API.');
    }
    return url;
  }

  async get(path: string): Promise<ApiObject> {
    const url = this.url(path);
    const cached = this.cache.get(url.href);
    if (cached) return cached;
    const request = (async () => {
      const response = await this.fetcher(url, {
        headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/ld+json' },
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
      }).catch((error: unknown) => {
        const cause = error instanceof Error ? error.cause : undefined;
        const code = isRecord(cause) && typeof cause.code === 'string' ? cause.code : '';
        if (
          [
            'DEPTH_ZERO_SELF_SIGNED_CERT',
            'SELF_SIGNED_CERT_IN_CHAIN',
            'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
            'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
          ].includes(code)
        ) {
          throw new Error(
            `PART-DB TLS: ${code}. Trust your certificate with NODE_EXTRA_CA_CERTS=/path/to/ca.pem before starting Node. See the README HTTPS section.`,
          );
        }
        if (code === 'ERR_TLS_CERT_ALTNAME_INVALID') {
          throw new Error(
            'PART-DB TLS: certificate hostname mismatch. Use a PARTDB_URL hostname listed in the certificate.',
          );
        }
        if (code === 'CERT_HAS_EXPIRED') {
          throw new Error(
            'PART-DB TLS: the certificate has expired. Renew the server certificate.',
          );
        }
        // Print only a diagnostic code, never arbitrary server messages or credentials.
        const diagnostic = /^[A-Z0-9_]+$/.test(code) ? ` (${code})` : '';
        throw new Error(
          `PART-DB connection failed${diagnostic}. Check the server address, network and TLS certificate.`,
        );
      });
      if (!response.ok) throw new Error(`PART-DB HTTP ${response.status} at ${url.pathname}.`);
      const value: unknown = await response.json();
      if (!isRecord(value)) throw new Error('Expected an API object from PART-DB.');
      return value;
    })();
    this.cache.set(url.href, request);
    return request;
  }

  async resolve(value: unknown): Promise<ApiObject | null> {
    if (value == null) return null;
    if (typeof value === 'string') return this.get(value);
    if (isRecord(value)) {
      if (
        typeof value['@id'] === 'string' &&
        Object.keys(value).every((key) => key.startsWith('@'))
      )
        return this.get(value['@id']);
      return value;
    }
    throw new Error('Invalid PART-DB relation.');
  }

  async collection(path: string): Promise<ApiObject[]> {
    const result: ApiObject[] = [];
    const visited = new Set<string>();
    let next: string | undefined = path;
    while (next) {
      const url = this.url(next).href;
      if (visited.has(url)) throw new Error('PART-DB pagination loop detected.');
      visited.add(url);
      const page = await this.get(next);
      const members = page['hydra:member'] ?? page.member;
      if (!Array.isArray(members) || !members.every(isRecord))
        throw new Error('Expected a JSON-LD collection from PART-DB.');
      result.push(...members);
      if (result.length > 5000 || visited.size > 5000)
        throw new Error('Export exceeds the 5000 part limit. Narrow the selection.');
      const view = page['hydra:view'] ?? page.view;
      const link = isRecord(view) ? (view['hydra:next'] ?? view.next) : undefined;
      if (link != null && typeof link !== 'string') throw new Error('Invalid pagination link.');
      next = link || undefined;
    }
    return result;
  }
}
