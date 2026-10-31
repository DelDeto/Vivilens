import React,{useState} from 'react';
import {siteConfig} from './site-config';
import {validMeasurementId,initializeAnalytics,trackPage} from './analytics';
export function AnalyticsConsent(){
 const [choice,setChoice]=useState(()=>{try{return localStorage.getItem('vivilens-analytics-consent')||''}catch{return 'no'}});
 if(!validMeasurementId(siteConfig.ga4MeasurementId)||choice||/^\/(admin|account|checkout|order)(\/|$)/.test(window.location.pathname))return null;
 function choose(value){try{localStorage.setItem('vivilens-analytics-consent',value)}catch{}setChoice(value);if(value==='yes'){initializeAnalytics();trackPage(window.location.pathname,document.title)}}
 return <aside className="vv-analytics-consent" aria-label="Tùy chọn đo lường"><strong>Giúp Vivi hiểu trải nghiệm mua sắm</strong><p>Bạn có đồng ý dùng Google Analytics để đo lượt xem và thao tác mua sắm? Vivi không gửi thông tin liên hệ hoặc độ mắt trong các sự kiện đo lường.</p><button onClick={()=>choose('yes')}>Đồng ý</button><button onClick={()=>choose('no')}>Để sau</button><a href="/help/privacy">Thông tin riêng tư</a></aside>;
}

export function AnalyticsPreferences(){
 if(!validMeasurementId(siteConfig.ga4MeasurementId))return null;
 return <section><h2>Lựa chọn đo lường</h2><p>Khi bạn đồng ý, Google Analytics nhận các lượt xem và thao tác mua sắm gồm mẫu lens, giá và số hộp. Các sự kiện do Vivi gửi không chứa thông tin liên hệ, địa chỉ hoặc độ từng mắt.</p><button className="secondary" onClick={()=>{window['ga-disable-'+siteConfig.ga4MeasurementId]=true;try{localStorage.removeItem('vivilens-analytics-consent')}catch{}window.location.reload()}}>Xem lại lựa chọn đo lường</button></section>;
}
