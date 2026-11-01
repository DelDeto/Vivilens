import React,{useState} from 'react';
import {Search,X,Check,ChevronLeft,ChevronRight} from 'lucide-react';
import {colorLabels,filterProfiles,profilePage} from './profiles.js';

export default function ProfilePicker({profiles,slug,onSelect}){
 const [query,setQuery]=useState(''),[color,setColor]=useState('All'),[page,setPage]=useState(()=>Math.floor(Math.max(0,profiles.findIndex(p=>p.slug===slug))/6)+1);
 const filtered=filterProfiles(profiles,query,color),result=profilePage(filtered,page);
 const colors=Object.entries(colorLabels).map(([key,label])=>({key,label,count:profiles.filter(p=>p.color===key).length})).filter(c=>c.count);
 function reset(){setQuery('');setColor('All');setPage(1)}
 function revealSelected(){reset();setPage(Math.floor(Math.max(0,profiles.findIndex(p=>p.slug===slug))/6)+1)}
 return <section className="vv-tryon-browse" aria-label="Chọn mẫu lens để thử">
  <div className="vv-tryon-search"><Search size={16}/><input type="search" aria-label="Tìm mẫu lens để thử" placeholder="Tìm tên mẫu, ví dụ: AI Blue…" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}}/>{query&&<button aria-label="Xóa tên tìm kiếm" onClick={()=>{setQuery('');setPage(1)}}><X size={15}/></button>}</div>
  <div className="vv-tryon-colors" role="group" aria-label="Lọc mẫu lens theo màu"><button aria-pressed={color==='All'} onClick={()=>{setColor('All');setPage(1)}}>Tất cả <span>{profiles.length}</span></button>{colors.map(c=><button key={c.key} aria-pressed={color===c.key} onClick={()=>{setColor(c.key);setPage(1)}}>{c.label} <span>{c.count}</span></button>)}</div>
  <div className="vv-tryon-results"><span role="status" aria-live="polite">{result.total?`${result.start}–${result.end} / ${result.total} mẫu`:'Không tìm thấy mẫu phù hợp'}</span>{!result.items.some(p=>p.slug===slug)&&<button className="textlink" onClick={revealSelected}>Về mẫu đang thử</button>}</div>
  {result.total?<div className="vv-tryon-options">{result.items.map(p=><button key={p.slug} aria-pressed={slug===p.slug} onClick={()=>onSelect(p.slug)}><img src={p.image} alt={'Ảnh sản phẩm thật '+p.name} loading="lazy" width="60" height="60"/><span><strong>{p.name}</strong><small>{colorLabels[p.color]||p.color}</small></span>{slug===p.slug&&<Check size={17}/>}</button>)}</div>:<div className="vv-tryon-no-results"><p>Bạn thử tên ngắn hơn hoặc đổi nhóm màu nhé.</p><button className="secondary" onClick={reset}>Xóa bộ lọc</button></div>}
  <nav className="vv-tryon-pagination" aria-label="Phân trang mẫu thử"><button aria-label="Trang mẫu trước" disabled={result.page<=1} onClick={()=>setPage(result.page-1)}><ChevronLeft size={16}/></button><span>Trang {result.page} / {result.totalPages}</span><button aria-label="Trang mẫu tiếp" disabled={result.page>=result.totalPages} onClick={()=>setPage(result.page+1)}><ChevronRight size={16}/></button></nav>
 </section>;
}
