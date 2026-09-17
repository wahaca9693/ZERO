const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const source=fs.readFileSync('src/app/sites/[slug]/(portal)/deposit/PortalDeposit.tsx','utf8');
function setup(response={success:true,credited:0.6002}) {
 const state={step:'ready',otp:'synthetic-login-code'}, calls=[];
 const ctx={asiPhone:'07700000000',asiSession:'fixture',asiOtp:'synthetic-code',asiTransferOtp:'synthetic-transfer-code',asiVoucher:'synthetic-voucher',asiAmount:'1000',asiStep:'ready',asiLoading:false,
 callAsi:async body=>{calls.push(body);return response;},refresh:async()=>{},window:{dispatchEvent:()=>{},confirm:()=>true},Event:class{},};
 for(const k of ['Session','Phone','Otp','TransferOtp','Voucher','Amount','Step','Msg','Err']) ctx['setAsi'+k]=v=>state[k.toLowerCase()]=v;
 const code=source.slice(source.indexOf('  const asiLogin ='),source.indexOf('  // ── كريبتو ──',source.indexOf('  const asiLogin =')));
 vm.runInNewContext(stripTypeScriptTypes(code)+'\nglobalThis.handlers={asiVerify,asiTransfer,asiConfirm,asiTopup,resetAsi};',ctx);
 return {state,calls,ctx,h:ctx.handlers};
}
test('branch login verification clears first OTP',async()=>{const x=setup();await x.h.asiVerify();assert.equal(x.state.otp,'');});
test('branch transfer advances to separate confirmation',async()=>{const x=setup();await x.h.asiTransfer();assert.equal(x.calls[0].amount,1000);assert.equal(x.state.step,'confirm');assert.equal(x.state.transferotp,'');});
test('branch rejects fractional denomination without gateway call',async()=>{const x=setup();x.ctx.asiAmount='1500';await x.h.asiTransfer();assert.equal(x.calls.length,0);});
test('branch confirmation uses second OTP and resets after success',async()=>{const x=setup();await x.h.asiConfirm();assert.equal(x.calls[0].otp,'synthetic-transfer-code');assert.equal(x.state.session,null);assert.equal(x.state.step,'idle');assert.match(x.state.msg,/0.6002/);});
test('branch failed confirmation is not cleared or credited',async()=>{const x=setup({success:false});await x.h.asiConfirm();assert.equal(x.state.session,undefined);});
test('branch successful voucher clears old session',async()=>{const x=setup();await x.h.asiTopup();assert.equal(x.state.step,'idle');assert.equal(x.state.session,null);});
