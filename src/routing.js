// VIVILENS V1.1A: URL navigation and per-page metadata.
const SITE = 'VIVILENS';
const DEFAULT_DESCRIPTION = 'Khám phá kính áp tròng màu VIVILENS theo màu sắc và phong cách của bạn.';

export function routeFromPath(pathname = '/') {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return { page: 'home' };
  if (path === '/shop') return { page: 'catalog' };
  if (path === '/account') return { page: 'account' };
  if (path === '/admin') return { page: 'admin' };
  const product = /^\/products\/([^/]+)$/.exec(path);
  if (product) {
    try {
      const slug = decodeURIComponent(product[1]);
      return slug ? { page: 'detail', slug } : { page: 'notfound' };
    } catch {
      return { page: 'notfound' };
    }
  }
  return { page: 'notfound' };
}

export function pathForPage(page, product) {
  if (page === 'home') return '/';
  if (page === 'catalog') return '/shop';
  if (page === 'account') return '/account';
  if (page === 'admin') return '/admin';
  if (page === 'detail' && product?.slug) return '/products/' + encodeURIComponent(product.slug);
  return '/shop';
}

function ensureMeta(attribute, key) {
  let el = document.head.querySelector('meta[' + attribute + '="' + key + '"]');
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attribute, key);
    document.head.appendChild(el);
  }
  return el;
}

function setMeta(attribute, key, value) {
  ensureMeta(attribute, key).setAttribute('content', value);
}

export function updatePageMetadata(page, selected, pathname = window.location.pathname) {
  let title = SITE + ' — Your Eyes, Your Mood';
  let description = DEFAULT_DESCRIPTION;
  const hidden = page === 'account' || page === 'admin' || page === 'notfound' || (page === 'detail' && !selected);
  if (page === 'catalog') {
    title = 'Bộ sưu tập lens màu | ' + SITE;
    description = 'Khám phá lens Brown, Gray, Pink, Blue của VIVILENS. Chọn màu mắt phù hợp với phong cách bạn yêu thích.';
  } else if (page === 'detail' && selected) {
    title = selected.name + ' | ' + SITE;
    description = (selected.description || selected.name + ' — kính áp tròng màu VIVILENS').trim().slice(0, 155);
  } else if (page === 'account') {
    title = 'Tài khoản | ' + SITE;
  } else if (page === 'admin') {
    title = 'Quản trị | ' + SITE;
  } else if (page === 'notfound') {
    title = 'Không tìm thấy trang | ' + SITE;
  }
  document.title = title;
  setMeta('name', 'description', description);
  setMeta('name', 'robots', hidden ? 'noindex, nofollow' : 'index, follow');
  setMeta('property', 'og:type', page === 'detail' && selected ? 'product' : 'website');
  setMeta('property', 'og:site_name', SITE);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  const canonicalPath = page === 'detail' && selected ? pathForPage('detail', selected) : pathname;
  const canonical = window.location.origin + canonicalPath;
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', canonical);
  setMeta('property', 'og:url', canonical);
  const image = selected?.image_url;
  if (image && /^https?:\/\//i.test(image)) setMeta('property', 'og:image', image);
  else document.head.querySelector('meta[property="og:image"]')?.remove();
}
