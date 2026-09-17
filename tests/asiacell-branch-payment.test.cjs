const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const gateway=fs.readFileSync('src/lib/asiacell-gateway.ts','utf8');
function fn(name){const start=gateway.indexOf(`export async function ${name}(`)>=0?gateway.indexOf(`export async function ${name}(`):gateway.indexOf(`export function ${name}(`);const rest=gateway.slice(start);const next=rest.slice(1).search(/\nexport (?:async )?function /);return rest.slice(0,next<0?undefined:next+1).replace('export ','');}
for(const route of ['deposit','payments/asiacell'])for(const rate of [1666,2000])test(`${route} uses branch recipient, net amount and branch exchange rate ${rate}`,async()=>{
 const siteId=7, accountId=41, writes=[],requests=[];
 const session={id:'fixture',user_id:accountId,device_id:'fixture',access_token:'synthetic',transfer_pid:'fixture-pid',amount:1000,phone:'07700000000'};
 const ctx={process:{env:{}},console,ASIACELL_TRANSFER_FEE_IQD:500,AC_API:'https://example.invalid',
 NextResponse:{json:(body)=>body},initDb:async()=>{},requireSiteAuth:async()=>({ok:true,session:{userId:accountId}}),loadPublicSite:async()=>({site:{id:siteId}}),
 cleanPhone:p=>p.replace(/[^0-9]/g,''),authHeaders:()=>({}),getCustomerSession:async()=>session,updateCustomerSession:async(id,data)=>Object.assign(session,data),deleteCustomerSession:async()=>{},
 stringField:(d,k)=>String(d[k]||''),isSuccessResponse:d=>d.success===true,
 retryAsiacellFetch:async(url,opts)=>{requests.push(JSON.parse(opts.body));return {json:{success:true,PID:'fixture-pid'}};},
 creditUser:async()=>{throw Error('Unexpected credit to main user');},
 db:{execute:async q=>{if(q.sql.includes('SELECT * FROM reseller_asiacell_admin')){assert.equal(q.args[0],siteId);return {rows:[{id:7,authenticated:1,exchange_rate:rate,store_phone:'07700000001',phone:'07700000001'}]};}if(q.sql.includes('SELECT owner_user_id'))return {rows:[]};writes.push(q);return {rows:[],rowsAffected:1};}}
 };
 const context=vm.createContext(ctx);
 vm.runInContext(stripTypeScriptTypes(['getAsiacellExchangeRate','convertIqdToUsd','creditSiteAccount','startTransfer','confirmTransfer'].map(fn).join('\n')),context);
 const code=fs.readFileSync(`src/app/api/sites/[slug]/${route}/route.ts`,'utf8').replace(/import[\s\S]*?from\s+["'][^"']+["'];\s*/g,'').replace(/export /g,'');
 vm.runInContext(stripTypeScriptTypes(code),context);
 const prefix=route==='deposit'?'asiacell-':'';
 const call=action=>context.POST({json:async()=>({action:prefix+action,sessionId:'fixture',amount:1000,otp:'synthetic'})},{params:Promise.resolve({slug:'fixture'})});
 assert.equal((await call('transfer')).success,true);assert.equal(requests[0].amount,1000);assert.equal(requests[0].receiverMsisdn,'07700000001');
 const result=await call('confirm');assert.equal(result.success,true);
 const expected=Math.round(1000/rate*10000)/10000;
 assert.equal(result.credited,expected);
 const credit=writes.find(q=>q.sql.startsWith('UPDATE reseller_accounts'));
 assert.deepEqual(Array.from(credit.args),[expected,accountId,siteId]);
 const ledger=writes.find(q=>q.sql.includes('INSERT INTO reseller_transactions'));
 assert.deepEqual(Array.from(ledger.args).slice(0,3),[siteId,accountId,expected]);
 assert.equal(writes.filter(q=>q.sql.startsWith('UPDATE users')).length,0);
});
