import {siteConfig} from './site-config.js';
export const validMeasurementId=id=>/^G-[A-Z0-9]{5,20}$/.test(id||'');
export function analyticsItem(product,quantity=1){return {item_id:product.slug,item_name:product.name,item_brand:'VIVILENS',item_category:product.color,price:Number(product.price),quantity:Number(quantity)}}
export function ecommercePayload(products){const items=products.map(({product,quantity=1})=>analyticsItem(product,quantity));return {currency:'VND',value:items.reduce((n,i)=>n+i.price*i.quantity,0),items}}
export function analyticsAllowed(){try{return validMeasurementId(siteConfig.ga4MeasurementId)&&localStorage.getItem('vivilens-analytics-consent')==='yes'}catch{return false}}
export function initializeAnalytics(){
 if(!analyticsAllowed()||window.__viviAnalytics)return;
 window.__viviAnalytics=true;window.dataLayer=window.dataLayer||[];
 window.gtag=function(){window.dataLayer.push(arguments)};
 window.gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
 window.gtag('js',new Date());window.gtag('config',siteConfig.ga4MeasurementId,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,page_location:siteConfig.origin+window.location.pathname,page_referrer:safeReferrer()});
 const s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+siteConfig.ga4MeasurementId;document.head.appendChild(s);
}
export function track(name,params={}){
 if(typeof window==='undefined'||!analyticsAllowed())return;
 initializeAnalytics();window.gtag('event',name,params);
}
function safeReferrer(){try{return document.referrer?new URL(document.referrer).origin+'/':''}catch{return ''}}
export function trackPage(path,title){
 if(/^\/(admin|account|checkout|order)(\/|$)/.test(path))return;
 track('page_view',{page_location:siteConfig.origin+path.split('?')[0],page_referrer:safeReferrer(),page_title:title});
}
