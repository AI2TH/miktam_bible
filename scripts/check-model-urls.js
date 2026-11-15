#!/usr/bin/env node
/**
 * Check every model in src/ai/modelCatalog.ts: the download URL must answer
 * HTTP 200 (after redirects) with the recorded size. Exits 1 on any failure.
 *   node scripts/check-model-urls.js
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../src/ai/modelCatalog.ts'), 'utf8');
const entries = [...src.matchAll(/url: '([^']+)',\s*bytes: (\d+)/g)].map((m) => ({ url: m[1], bytes: Number(m[2]) }));

(async () => {
  let failed = 0;
  for (const { url, bytes } of entries) {
    try {
      const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      const size = Number(res.headers.get('x-linked-size') || res.headers.get('content-length'));
      const ok = res.status === 200 && size === bytes;
      if (!ok) failed++;
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${res.status} ${size} (expected ${bytes}) ${url}`);
    } catch (e) {
      failed++;
      console.log(`FAIL ${url}: ${e.message}`);
    }
  }
  process.exit(failed ? 1 : 0);
})();
