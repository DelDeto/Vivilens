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

/** Lens power grid: plano, -1.00 to -7.00 by 0.25, then -7.50 and -8.00. */
export const supportedPowers = Object.freeze([
  0,
  ...Array.from({length:25},(_,i)=>-(1+i*0.25)),
  -7.5,-8
]);

export function isSupportedPower(power) {
  return supportedPowers.some(p=>Math.abs(p-Number(power))<0.00001);
}

/** A cart line is exactly one box containing two lenses, one for each eye. */
export function pairCartKey(productId,leftVariantId,rightVariantId) {
  return [String(productId),String(leftVariantId||''),String(rightVariantId||'')].join('::');
}

/** Variant stock counts individual lenses, not sealed pairs or boxes. */
export function availablePairBoxes(leftVariant,rightVariant) {
  if (!leftVariant||!rightVariant||leftVariant.active===false||rightVariant.active===false) return 0;
  if (leftVariant.product_id!==rightVariant.product_id) return 0;
  const left=Math.max(0,Math.floor(Number(leftVariant.stock)||0));
  const right=Math.max(0,Math.floor(Number(rightVariant.stock)||0));
  return leftVariant.id===rightVariant.id?Math.floor(left/2):Math.min(left,right);
}

/** Each box is charged once, regardless of the two selected powers. */
export function boxPrice(product) {
  return Math.max(0, Number(product?.price)||0);
}

/**
 * Maximum boxes that can be added for the selected two powers, after accounting
 * for ALL other selected pairs already in the local cart. Informational only:
 * server-side checkout must recheck this atomically.
 */
export function remainingPairBoxes(cart, variants, productId, leftId, rightId, excludeLineKey = null) {
  const left = variants.find(v=>v.id===leftId&&v.product_id===productId&&v.active);
  const right = variants.find(v=>v.id===rightId&&v.product_id===productId&&v.active);
  if(!left||!right) return 0;
  const required=new Map();
  for(const item of cart) {
    if(item.id!==productId||!item.leftVariantId||!item.rightVariantId)continue;
    const lineKey=pairCartKey(item.id,item.leftVariantId,item.rightVariantId);
    if(lineKey===excludeLineKey)continue;
    const qty=Math.max(0,Math.floor(Number(item.qty)||0));
    required.set(item.leftVariantId,(required.get(item.leftVariantId)||0)+qty);
    required.set(item.rightVariantId,(required.get(item.rightVariantId)||0)+qty);
  }
  const availableL=Math.max(0,Math.floor(Number(left.stock)||0)-(required.get(leftId)||0));
  const availableR=Math.max(0,Math.floor(Number(right.stock)||0)-(required.get(rightId)||0));
  return leftId===rightId?Math.floor(availableL/2):Math.min(availableL,availableR);
}
