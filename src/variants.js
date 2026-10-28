// SKU utilities only; stock and prices shown here are not checkout authority.
export function formatPower(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return number === 0 ? '0.00' : (number > 0 ? '+' : '') + number.toFixed(2);
}

export function variantsForProduct(variants, productId) {
  return (variants || []).filter(v => v.product_id === productId && v.active !== false)
    .sort((a, b) => Number(a.power) - Number(b.power) || a.unit_label.localeCompare(b.unit_label));
}

export function cartLineKey(productId, variantId = null) {
  return String(productId) + '::' + String(variantId || 'standard');
}

export function unitPrice(product, variant) {
  return variant && variant.price_override != null
    ? Number(variant.price_override)
    : Number(product?.price || 0);
}

export function availableUnits(product, variant) {
  return Math.max(0, Number(variant ? variant.stock : product?.stock) || 0);
}
