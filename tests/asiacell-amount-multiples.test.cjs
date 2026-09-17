const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const gateway=fs.readFileSync('src/lib/asiacell-gateway.ts','utf8');
function fn(name){const start=gateway.indexOf(`export async function ${name}(`);const rest=gateway.slice(start);const next=rest.slice(1).search(/\nexport (?:async )?function /);return rest.slice(0,next<0?undefined:next+1).replace('export ','');}
const exchange=[1000,1666,2000].map(rate=>test(`any net multiple of 1000 IQD is accepted at rate ${rate}`,async()=>{
 const requests=[],session={id:'f',device_id:'f',access_token:'s',amount:0,phone:'07700000000',transfer_pid:''};
 const ctx=vm.createContext({getCustomerSession:async()=>session,cleanPhone:p=>p,ASIACELL_TRANSFER_FEE_IQD:500,AC_API:'https://x.invalid',authHeaders:()=>({}),stringField:(d,k)=>String(d[k]||''),isSuccessResponse:d=>d.success===true,updateCustomerSession:async(i,d)=>Object.assign(session,d),retryAsiacellFetch:async(u,o)=>{requests.push(JSON.parse(o.body));return {json:{success:true,PID:'p'}};}});
 vm.runInContext(stripTypeScriptTypes(fn('startTransfer')),ctx);
 for(const usd of [1,2,3,4,5,6,7,8]){
  const amount=usd*rate;const r=await ctx.startTransfer(1,'f',amount,{store_phone:'07700000001'});
  if(usd*rate%1000===0){assert.equal(r.success,true);assert.equal(requests.at(-1).amount,usd*rate);assert.equal(requests.at(-1).receiverMsisdn,'07700000001');}
 }
}));
test('rate 1666 yields non-multiples rejected client-side',async()=>{
 const session={id:'f',device_id:'f',access_token:'s',amount:0,phone:'07700000000',transfer_pid:''};
 const ctx=vm.createContext({getCustomerSession:async()=>session,cleanPhone:p=>p,ASIACELL_TRANSFER_FEE_IQD:500,AC_API:'https://x.invalid',authHeaders:()=>({}),stringField:(d,k)=>String(d[k]||''),isSuccessResponse:d=>d.success===true,updateCustomerSession:async(i,d)=>Object.assign(session,d),retryAsiacellFetch:async()=>({json:{success:true,PID:'p'}})});
 vm.runInContext(stripTypeScriptTypes(fn('startTransfer')),ctx);
 const r=await ctx.startTransfer(1,'f',1666,{store_phone:'07700000001'});
 assert.equal(r.success,false);assert.match(r.error,/1000/);
});
