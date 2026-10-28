import test from 'node:test';
import assert from 'node:assert/strict';
import {formatPower,variantsForProduct,cartLineKey,unitPrice,availableUnits} from '../src/variants.js';

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
