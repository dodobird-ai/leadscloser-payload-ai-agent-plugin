import test from 'node:test';
import assert from 'node:assert/strict';
import { createAttribution, parseAttribution, withActionAttribution } from '../src/services/attribution.mjs';
const href = 'https://sir.mu/en?utm_source=IG&utm_medium=Paid%20Social&utm_campaign=%20Summer%20&utm_content=A%2BB&utm_term=sea&utm_id=42&gclid=X&gad_source=1&custom_click_id=z';
const memory = () => { const data = new Map(); return { getItem: k => data.get(k), setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k), data }; };
test('raw UTM values and extensible click identifiers; excludes unrelated query keys', () => {
 const a = parseAttribution(href+'&email=private&utm_term=second');
 assert.equal(a.utmSource,'IG'); assert.equal(a.utmMedium,'Paid Social'); assert.equal(a.utmCampaign,' Summer '); assert.equal(a.utmContent,'A+B'); assert.equal(a.utmTerm,'sea'); assert.equal(a.utmId,'42');
 assert.deepEqual(a.clickIds,{gclid:'X',gad_source:'1',custom_click_id:'z'}); assert.equal(a.email,undefined);
});
test('consented first touch survives navigation and reinitialization', () => {
 const storage=memory(), context={landingPage:href,referrerUrl:'https://example.org/',consent:true};
 const first=createAttribution({context,storage}); context.landingPage='https://sir.mu/later';
 assert.equal(first.get('fr').landingPage,href);
 const next=createAttribution({context,storage}); assert.equal(next.get('en').landingPage,href); assert.equal(next.get('en').referrerUrl,'https://example.org/');
});
test('unknown consent writes nothing; denial and withdrawal purge sensitive attribution', () => {
 const storage=memory(), context={landingPage:href,referrerUrl:'https://example.org/',consent:null}; const a=createAttribution({context,storage});
 assert.deepEqual(a.get('fr'),{landingPage:'https://sir.mu/en',languageCode:'fr'}); assert.equal(storage.data.size,0);
 context.consent=true; a.update(); assert.equal(storage.data.size,1);
 context.consent=false; a.update(); assert.equal(storage.data.size,0); assert.deepEqual(a.get('en'),{landingPage:'https://sir.mu/en',languageCode:'en'});
 context.consent=true; assert.equal(a.get('en').utmSource,undefined);
});
test('blocked storage works; unrelated actions unchanged', () => {
 const a=createAttribution({context:{landingPage:href,consent:true},storage:{getItem(){throw Error('blocked')}}}); assert.equal(a.get('en').utmSource,'IG');
 const params={item_identifiers:['1']}; assert.equal(withActionAttribution('send_pdf',params,'en'),params);
});
test('ask-agent action adds attribution inside params without losing property identifiers', () => {
 globalThis.window={leadscloserAttribution:{landingPage:href,referrerUrl:'https://example.org/',consent:true},sessionStorage:memory(),addEventListener(){}};
 const result=withActionAttribution('ask_agent_to_contact_me',{item_identifiers:['RS1']},'fr');
 assert.deepEqual(result.item_identifiers,['RS1']); assert.equal(result.attribution.utmSource,'IG'); assert.equal(result.attribution.languageCode,'fr'); assert.equal(result.attribution.formName,undefined); assert.equal(result.attribution.formSurface,undefined);
 delete globalThis.window;
});
