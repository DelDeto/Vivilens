import React from 'react';
import {collectionBySlug,guideBySlug} from './seo-content';
import {collectionHtml,guideHtml,journalHtml,productEditorialHtml,publicNavigation} from './seo-render';
import './seo.css';
export function SeoPage({page,products}){
 const slug=window.location.pathname.split('/').filter(Boolean).at(-1);
 const collection=collectionBySlug(slug),guide=guideBySlug(slug);
 const html=page==='collection'&&collection?collectionHtml(collection,products):page==='guide'&&guide?guideHtml(guide):journalHtml();
 return <main className="section vv-seo-page" dangerouslySetInnerHTML={{__html:html}}/>;
}
export function ProductEditorial({product}){return <div dangerouslySetInnerHTML={{__html:productEditorialHtml(product)}}/>}
export function SeoExplore(){return <div className="vv-seo-explore"><span className="eyebrow">TÌM LOOK CỦA BẠN</span><div dangerouslySetInnerHTML={{__html:publicNavigation()}}/></div>}
