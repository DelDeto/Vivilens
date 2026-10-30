export const moodCollections = [
 {id:'everyday',title:'Everyday Natural',label:'Hằng ngày',description:'Makeup nhẹ, đi học hay đi chơi — một chút màu cho ngày thường.',photo:'milk-tea-brown-480.webp',product:'Milk Tea Brown'},
 {id:'kbeauty',title:'Soft K-Beauty',label:'Makeup Hàn',description:'Tông mềm mại cho những layout makeup trong trẻo, ngọt ngào.',photo:'creamy-pink-320.webp',product:'Creamy Pink'},
 {id:'occasion',title:'Photo Moments',label:'Cô dâu & kỷ yếu',description:'Gợi ý phối màu cho ngày chụp ảnh và những khoảnh khắc đáng nhớ.',photo:'fairy-gray-320.webp',product:'Fairy Gray'},
 {id:'statement',title:'Make a Statement',label:'Look nổi bật',description:'Thử xanh, tím hay xanh lá để khám phá một mood mới.',photo:'clear-sky-blue-320.webp',product:'Clear Sky Blue'}
];

export function collectionFromSearch(search='') {
 const id=new URLSearchParams(search).get('style');
 return moodCollections.find(c=>c.id===id)||null;
}
export function collectionPath(id) {
 return moodCollections.some(c=>c.id===id)?'/shop?style='+encodeURIComponent(id):'/shop';
}
