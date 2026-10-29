import test from 'node:test';
import assert from 'node:assert/strict';
import {formatPower,variantsForProduct,cartLineKey,unitPrice,availableUnits,supportedPowers,isSupportedPower,pairCartKey,availablePairBoxes,remainingPairBoxes,boxPrice} from '../src/variants.js';

test('displays optical powers without adding a sign to plano', () => {
  assert.equal(formatPower('-1.25'), '-1.25');
  assert.equal(formatPower(0), '0.00');
  assert.equal(formatPower('2.50'), '+2.50');
  assert.equal(formatPower('n/a'), '—');
});
test('variants are filtered and sorted for the intended product', () => {
  const a = {product_id:'a',power:'-1.25',active:true,unit_label:'1 chiếc'};
  const b = {product_id:'a',power:'0.00',active:true,unit_label:'1 chiếc'};
  const c = {product_id:'b',power:'-3.00',active:true,unit_label:'1 chiếc'};
  assert.deepEqual(variantsForProduct([b,c,a], 'a'), [a,b]);
});
test('cart keys keep different SKU powers distinct', () => {
  assert.notEqual(cartLineKey('prod','left'),cartLineKey('prod','right'));
  assert.equal(unitPrice({price:100000},{price_override:120000}),120000);
  assert.equal(unitPrice({price:100000},{price_override:null}),100000);
  assert.equal(availableUnits({stock:9},{stock:2}),2);
});

test('exactly 28 power values with correct increments and no 0.50', () => {
  assert.equal(supportedPowers.length,28);
  assert.deepEqual(supportedPowers.slice(0,5),[0,-1,-1.25,-1.5,-1.75]);
  assert.deepEqual(supportedPowers.slice(-4),[-6.75,-7,-7.5,-8]);
  assert.equal(isSupportedPower(-.5),false);
  assert.equal(isSupportedPower(-.75),false);
  assert.equal(isSupportedPower(-1.25),true);
});
test('one pair box can contain different prescriptions',()=>{
  const left={id:'power-1',product_id:'p',power:-1,stock:3,active:true};
  const right={id:'power-2',product_id:'p',power:-2,stock:4,active:true};
  assert.equal(availablePairBoxes(left,right),3);
  assert.equal(boxPrice({price:175000}),175000);
  assert.equal(pairCartKey('p',left.id,right.id),'p::power-1::power-2');
  assert.notEqual(pairCartKey('p',left.id,right.id),pairCartKey('p',right.id,left.id));
});
test('same power consumes two individual lenses per box',()=>{
  const sku={id:'same',product_id:'p',stock:5,active:true};
  assert.equal(availablePairBoxes(sku,sku),2);
  assert.equal(availablePairBoxes({...sku,stock:1},{...sku,stock:1}),0);
  assert.equal(availablePairBoxes({...sku,active:false},sku),0);
  assert.equal(availablePairBoxes(sku,{...sku,id:'other',product_id:'other'}),0);
});

test('cart reservations of a diopter are shared between all 2-lens boxes',()=>{
  const skus=[
    {id:'a',product_id:'p',stock:4,active:true},
    {id:'b',product_id:'p',stock:2,active:true},
    {id:'c',product_id:'p',stock:3,active:true}
  ];
  const cart=[{id:'p',leftVariantId:'a',rightVariantId:'b',qty:2}];
  assert.equal(remainingPairBoxes(cart,skus,'p','a','c'),2);
  assert.equal(remainingPairBoxes(cart,skus,'p','a','b'),0);
  assert.equal(remainingPairBoxes(cart,skus,'p','a','b',pairCartKey('p','a','b')),2);
  assert.equal(remainingPairBoxes(cart,skus,'p','a','a'),1);
});
