export const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const definitions=[
 {id:'right',center:468,iris:[469,470,471,472],corners:[33,133],top:159,bottom:145,contour:[33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246]},
 {id:'left',center:473,iris:[474,475,476,477],corners:[362,263],top:386,bottom:374,contour:[362,382,381,380,374,373,390,249,263,466,388,387,386,385,384,398]},
];
export function eyesFromLandmarks(landmarks,width,height){
 if(!Array.isArray(landmarks)||landmarks.length<478||!width||!height)return [];
 const point=i=>({x:landmarks[i]?.x*width,y:landmarks[i]?.y*height});
 return definitions.flatMap(d=>{
  const center=point(d.center),corners=d.corners.map(point),iris=d.iris.map(point),contour=d.contour.map(point);
  if([center,...corners,...iris,...contour].some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return [];
  const angle=Math.atan2(corners[1].y-corners[0].y,corners[1].x-corners[0].x);
  const co=Math.cos(angle),si=Math.sin(angle);
  const rx=Math.max(...iris.map(p=>Math.abs((p.x-center.x)*co+(p.y-center.y)*si)));
  const ry=Math.max(...iris.map(p=>Math.abs(-(p.x-center.x)*si+(p.y-center.y)*co)));
  const eyeWidth=distance(...corners),opening=distance(point(d.top),point(d.bottom));
  // Suppress closed/very small eyes and implausible detections rather than
  // leaving a floating lens over an eyelid or outside the photograph.
  if(rx<2||ry<2||rx>eyeWidth*.65||opening<ry*.36||center.x<rx||center.y<ry||center.x>width-rx||center.y>height-ry)return [];
  return [{id:d.id,cx:center.x,cy:center.y,rx,ry,angle,contour}];
 });
}
export function sourcePoint(clientX,clientY,rect,width,height,mirror=false){
 const scale=Math.min(rect.width/width,rect.height/height);
 const x=(clientX-rect.left-(rect.width-width*scale)/2)/scale;
 const y=(clientY-rect.top-(rect.height-height*scale)/2)/scale;
 if(x<0||y<0||x>width||y>height)return null;
 return {x:mirror?width-x:x,y};
}
export function manualEye(point,radius,id){
 return {id,cx:point.x,cy:point.y,rx:radius,ry:radius,angle:0,contour:null};
}
export function smoothEyes(previous,next,amount=.65){
 return next.map(eye=>{
  const old=previous.find(p=>p.id===eye.id);
  if(!old||Math.hypot(old.cx-eye.cx,old.cy-eye.cy)>eye.rx*2)return eye;
  return {...eye,cx:old.cx+(eye.cx-old.cx)*amount,cy:old.cy+(eye.cy-old.cy)*amount,rx:old.rx+(eye.rx-old.rx)*amount,ry:old.ry+(eye.ry-old.ry)*amount};
 });
}
