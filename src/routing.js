import {socialMetadata} from './social.js';
import {collectionBySlug,guideBySlug} from './seo-content.js';
import {tryOnPath} from './tryon/profiles.js';
// URL navigation and per-page metadata.

export function routeFromPath(pathname = '/') {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return { page: 'home' };
  if (path === '/shop') return { page: 'catalog' };
  if (path === '/try-on') return { page: 'tryon' };
  if(path==='/notes')return {page:'journal'};
  const collection=/^\/collections\/([a-z0-9-]+)$/.exec(path);
  if(collection&&collectionBySlug(collection[1]))return {page:'collection',slug:collection[1]};
  const guide=/^\/notes\/([a-z0-9-]+)$/.exec(path);
  if(guide&&guideBySlug(guide[1]))return {page:'guide',slug:guide[1]};
  if (path === '/account') return { page: 'account' };
  if (path === '/admin') return { page: 'admin' };
  if (path === '/checkout') return { page: 'checkout' };
  const receipt=/^\/order\/(VV-[A-F0-9]{12})$/.exec(path);
  if(receipt)return {page:'receipt',code:receipt[1]};
  const help=/^\/help\/(contact|shipping|returns|lens-care|privacy)$/.exec(path);
  if(help)return {page:'help',topic:help[1]};
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
  if (page === 'tryon') return tryOnPath(product?.slug);
  if (page === 'account') return '/account';
  if (page === 'admin') return '/admin';
  if (page === 'checkout') return '/checkout';
  if (page === 'receipt' && /^VV-[A-F0-9]{12}$/.test(product?.code||'')) return '/order/'+product.code;
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
  const meta=socialMetadata(page,selected,window.location.origin,pathname);
  document.title=meta.title;
  const fields={description:meta.description,robots:meta.hidden?'noindex, nofollow':'index, follow, max-image-preview:large','twitter:card':'summary_large_image','twitter:title':meta.title,'twitter:description':meta.description,'twitter:image':meta.image,'twitter:image:alt':meta.imageAlt};
  for(const [key,value] of Object.entries(fields))setMeta('name',key,value);
  for(const [key,value] of Object.entries({'og:type':meta.type,'og:site_name':'VIVILENS','og:locale':'vi_VN','og:title':meta.title,'og:description':meta.description,'og:url':meta.canonical,'og:image':meta.image,'og:image:secure_url':meta.image,'og:image:alt':meta.imageAlt,'og:image:type':meta.imageType,'og:image:width':meta.width,'og:image:height':meta.height})){
    if(value===null)document.head.querySelector('meta[property="'+key+'"]')?.remove();
    else setMeta('property',key,value);
  }
  let link=document.head.querySelector('link[rel="canonical"]');
  if(!link){link=document.createElement('link');link.rel='canonical';document.head.appendChild(link)}
  link.href=meta.canonical;
}
