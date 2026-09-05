import { createServer, type Server } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

const PROJECT_ROOT = new URL('../../', import.meta.url);
// Only browser assets are public. Server code, tooling and future credentials stay private.
const PUBLIC_FILES = new Set([
  'index.html',
  'main.css',
  'src/browser/app.ts',
  'src/browser/language.ts',
  'src/core/errors.ts',
  ...(await readdir(new URL('src/i18n/', PROJECT_ROOT)))
    .filter((file) => file.endsWith('.ts'))
    .map((file) => `src/i18n/${file}`),
  'src/browser/dom.ts',
  'src/browser/settings-form.ts',
  'src/browser/render.ts',
  'src/browser/project-files.ts',
  'src/browser/storage.ts',
  'src/core/constants.ts',
  'src/core/types.ts',
  'src/core/validation.ts',
  'src/core/settings.ts',
  'src/core/labels.ts',
  'src/core/layout.ts',
  'src/core/text.ts',
  'src/core/project.ts',
  'src/data/presets.ts',
]);

export function createAppServer(): Server {
  return createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end();
      return;
    }
    const pathname = (request.url ?? '/').split('?')[0] ?? '/';
    const file = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (!PUBLIC_FILES.has(file)) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    try {
      const source = await readFile(new URL(file, PROJECT_ROOT), 'utf8');
      const isTypeScript = file.endsWith('.ts');
      // Browsers receive executable ESM; Node runs the same .ts sources directly.
      const content = isTypeScript
        ? stripTypeScriptTypes(source, { mode: 'strip', sourceUrl: pathname })
        : source;
      const contentType = isTypeScript
        ? 'text/javascript'
        : file.endsWith('.css')
          ? 'text/css'
          : 'text/html';
      response.writeHead(200, {
        'Content-Type': `${contentType}; charset=utf-8`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch (error) {
      console.error(`Could not serve ${file}:`, error);
      response.writeHead(500);
      response.end('Could not read the file');
    }
  });
}
