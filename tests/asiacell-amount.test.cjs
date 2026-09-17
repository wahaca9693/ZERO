const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/asiacell-gateway.ts'), 'utf8');
const start = source.indexOf('export async function startTransfer(');
const end = source.indexOf('\nexport async function confirmTransfer', start);
assert.ok(start >= 0 && end > start);
const code = stripTypeScriptTypes(source.slice(start, end).replace('export ', ''));
for (const amount of [1000, 2000, 10000, 0, 250, 500, 1500, -1000, 1000.5, NaN, Infinity]) {
  test(`transfer amount ${amount}: validates denomination and excludes fee from provider amount`, async () => {
    const requests = [], updates = [];
    const context = vm.createContext({
      getCustomerSession: async () => ({ id: 'fixture', access_token: 'synthetic', device_id: 'fixture' }),
      cleanPhone: p => p.replace(/[^0-9]/g, ''),
      ASIACELL_TRANSFER_FEE_IQD: 500, AC_API: 'https://example.invalid',
      authHeaders: () => ({}),
      retryAsiacellFetch: async (url, options) => { requests.push(JSON.parse(options.body)); return { json: { success: true, PID: 'fixture-pid' } }; },
      isSuccessResponse: d => d.success === true,
      stringField: (d, k) => String(d[k] || ''),
      updateCustomerSession: async (id, data) => updates.push(data),
    });
    vm.runInContext(code, context);
    const result = await context.startTransfer(1, 'fixture', amount, { store_phone: '07700000000' });
    const valid = Number.isSafeInteger(amount) && amount >= 1000 && amount % 1000 === 0;
    assert.equal(result.success, valid);
    assert.equal(requests.length, valid ? 1 : 0);
    if (valid) {
      assert.equal(requests[0].amount, amount, 'provider must receive net amount, NOT net plus fee');
      assert.equal(updates[0].amount, amount);
      assert.equal(result.amountIQD, amount);
      assert.equal(result.totalIQD, amount + 500);
    }
  });
}
