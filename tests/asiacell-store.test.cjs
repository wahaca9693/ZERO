const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const routes = [
  '../src/app/api/payments/asiacell/admin/route.ts',
  '../src/app/api/sites/[slug]/admin/asiacell-gateway/route.ts',
];
for (const route of routes) {
  const source = fs.readFileSync(path.join(__dirname, route), 'utf8');
  const code = stripTypeScriptTypes(source.replace(/import[\s\S]*?from\s+["'][^"']+["'];\s*/g, '').replace(/export /g, ''));
  for (const state of ['verified', 'different', 'unauthenticated', 'missing']) {
    test(`${route.includes('/sites/') ? 'branch' : 'main'} store recipient: ${state}`, async () => {
      let writes = 0;
      const phone = '07700000000'; // Synthetic fixture; no network requests.
      const row = state === 'missing' ? null : {
        phone: state === 'different' ? '07700000001' : phone,
        authenticated: state === 'unauthenticated' ? 0 : 1,
        access_token: 'synthetic-test-only',
      };
      const context = vm.createContext({
        NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) },
        requireAdmin: async () => {}, initDb: async () => {},
        requireResellerAdmin: async () => ({ account: { site_id: 7 } }),
        getAdminRow: async () => row, getSiteAdminRow: async () => row,
        setAdminRow: async () => { writes++; }, setSiteAdminRow: async () => { writes++; },
        cleanPhone: p => p.replace(/[^0-9]/g, ''), console,
      });
      vm.runInContext(code, context);
      const result = await context.POST({ json: async () => ({ action: 'set-store-phone', phone }) }, { params: Promise.resolve({ slug: 'fixture' }) });
      assert.equal(writes, state === 'verified' ? 1 : 0);
      assert.equal(result.status, state === 'verified' ? 200 : 409);
      if (state !== 'verified') assert.equal(result.body.requiresVerification, true);
    });
  }
}
