import test from 'node:test';
import assert from 'node:assert/strict';
import {recommendProducts,toggleCompare,validInquiry,normalizePhone,matchesStyle} from '../src/discovery.js';
const p=(slug,color,period='6 tháng')=>({id:slug,slug,name:slug,color,wear_period:period,image_url:'https://example.com/'+slug+'.webp',price:220000});
const products=[p('brown','Brown'),p('gray','Gray'),p('blue','Blue'),p('pink','Pink'),p('daily-brown','Brown','1 ngày')];
test('quiz respects a matching color, style and cycle instead of displaying unrelated products',()=>{
 const {results,relaxed}=recommendProducts(products,{style:'everyday',color:'Brown',period:'1 ngày'});
 assert.equal(relaxed,false);assert.deepEqual(results.map(x=>x.product.slug),['daily-brown']);
 assert.ok(results[0].reasons.some(x=>x.includes('1 ngày')));
});
test('conflicting answers are labeled as closest matches, with honest individual reasons',()=>{
 const {results,relaxed}=recommendProducts(products,{style:'everyday',color:'Gray',period:'1 ngày'});
 assert.equal(relaxed,true);assert.equal(results[0].product.color,'Gray');
 assert.ok(!results[0].reasons.some(x=>x.includes('1 ngày')));
});
test('quiz excludes placeholders and empty photos; comparison never exceeds three unique products',()=>{
 assert.equal(recommendProducts([...products,{...p('fake','Brown'),image_url:'https://images.unsplash.com/fake'}]).results.some(x=>x.product.slug==='fake'),false);
 assert.deepEqual(toggleCompare(['a','b'],'a').ids,['b']);
 assert.deepEqual(toggleCompare(['a','b'],'c').ids,['a','b','c']);
 assert.equal(toggleCompare(['a','b','c'],'d').full,true);
 assert.equal(matchesStyle(p('blue','Blue'),'everyday'),false);
});
test('consultation requires explicit consent, valid phone and bounded personal fields',()=>{
 const valid={name:'Khách kiểm thử',phone:'0000 000 000',message:'Kiểm thử',consent:true};
 assert.equal(normalizePhone(valid.phone),'0000000000');assert.equal(validInquiry(valid),true);
 assert.equal(validInquiry({...valid,consent:false}),false);assert.equal(validInquiry({...valid,phone:'123'}),false);
 assert.equal(validInquiry({...valid,name:'x'}),false);assert.equal(validInquiry({...valid,message:'x'.repeat(1001)}),false);
 assert.equal(validInquiry({...valid,phone:'+84 000 000 000'}),true);
});
