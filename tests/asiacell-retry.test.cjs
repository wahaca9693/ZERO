const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/lib/asiacell-gateway.ts'), 'utf8');
const start = source.indexOf('export async function retryAsiacellFetch(');
const end = source.indexOf('\nexport function extractAsiacellError', start);
assert.ok(start >= 0 && end > start);
const code = stripTypeScriptTypes(source.slice(start, end).replace('export ', ''));
for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'GET', 'HEAD', undefined]) {
  test(`${method || 'default GET'}: ambiguous response only retries read-only requests`, async () => {
    let calls = 0;
    const response = { response: { status: 502 }, text: '<html>unavailable</html>', json: null };
    const context = vm.createContext({
      asiacellFetch: async () => { calls++; return response; },
      debugAsiacell: () => {},
    });
    vm.runInContext(code, context);
    const result = await context.retryAsiacellFetch('https://example.invalid/payment', method ? { method } : {}, {});
    assert.equal(result, response);
    assert.equal(calls, !method || ['GET', 'HEAD'].includes(method) ? 2 : 1);
  });
}
