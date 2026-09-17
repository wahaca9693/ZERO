const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const source = fs.readFileSync(path.join(__dirname, '../src/app/deposit/asiacell/page.tsx'), 'utf8');
const start = source.indexOf('  useEffect(() => {');
const end = source.indexOf('\n  const callGateway', start);
const code = stripTypeScriptTypes(source.slice(start, end));
for (const oldStep of [2, 3, 4, 5]) {
  test(`entering payment page does not restore old step ${oldStep}`, async () => {
    const state = { step: 1, sessionId: '', phone: '', mode: 'transfer' };
    const storage = new Map([['fixture-key', JSON.stringify({ sessionId: 'old-session', phone: '07700000000', step: oldStep, transferAmount: '1000' })]]);
    const timers = [], events = {};
    const context = { initialMode: 'transfer', SESSION_STORAGE_KEY: 'fixture-key',
      window: { sessionStorage: { getItem: k => storage.get(k), removeItem: k => storage.delete(k) },
        setTimeout: fn => { timers.push(fn); return timers.length; }, clearTimeout: () => {},
        addEventListener: (k, fn) => events[k] = fn, removeEventListener: k => delete events[k] },
      useEffect: fn => fn(), fetch: async () => ({ json: async () => ({}) }),
    };
    for (const key of ['step', 'sessionId', 'phone', 'mode', 'otp', 'transferOtp', 'voucher', 'transferAmount', 'credited', 'creditedIqd', 'message', 'loading', 'gatewayStatus', 'exchangeRate']) {
      context['set' + key[0].toUpperCase() + key.slice(1)] = v => state[key] = v;
    }
    vm.runInNewContext(code, context);
    timers.forEach(fn => fn());
    assert.equal(state.step, 1);
    assert.equal(state.sessionId, '');
    assert.equal(state.phone, '');
    assert.equal(storage.has('fixture-key'), false);
    if (events.pageshow) {
      state.step = 4; state.sessionId = 'cached-session';
      events.pageshow({ persisted: true });
      assert.equal(state.step, 1);
      assert.equal(state.sessionId, '');
    }
  });
}
