import test from 'node:test';
import assert from 'node:assert/strict';
import { routeFromPath, pathForPage } from '../src/routing.js';

test('primary storefront URLs', () => {
  assert.deepEqual(routeFromPath('/'), { page: 'home' });
  assert.deepEqual(routeFromPath('/shop/'), { page: 'catalog' });
  assert.deepEqual(routeFromPath('/account'), { page: 'account' });
  assert.deepEqual(routeFromPath('/admin'), { page: 'admin' });
});
test('product routes can be shared and decoded', () => {
  const product = { slug: 'milk-tea-brown' };
  assert.equal(pathForPage('detail', product), '/products/milk-tea-brown');
  assert.deepEqual(routeFromPath('/products/milk-tea-brown'), { page: 'detail', slug: 'milk-tea-brown' });
});
test('unknown and invalid URL segments do not crash', () => {
  assert.deepEqual(routeFromPath('/unknown'), { page: 'notfound' });
  assert.deepEqual(routeFromPath('/products/%E0%A4%A'), { page: 'notfound' });
  assert.deepEqual(routeFromPath('/products/a/b'), { page: 'notfound' });
});
