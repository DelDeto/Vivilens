// DEMO ONLY: swap for real catalog in Supabase once configured.
export const demoProducts = [
 {id:'demo-1',name:'Milk Tea Brown',slug:'milk-tea-brown',color:'Brown',diameter:'14.5',wear_period:'6 tháng',price:189000,stock:24,featured:true,image_url:'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=900&q=85',description:'Tone nâu trà sữa dịu dàng, dễ phối cùng phong cách trang điểm mỗi ngày.'},
 {id:'demo-2',name:'Fairy Gray',slug:'fairy-gray',color:'Gray',diameter:'14.5',wear_period:'6 tháng',price:199000,stock:12,featured:true,image_url:'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900&q=85',description:'Xám trong trẻo, tạo điểm nhấn tinh tế cho ánh nhìn.'},
 {id:'demo-3',name:'Bubble Brown',slug:'bubble-brown',color:'Brown',diameter:'14.2',wear_period:'3 tháng',price:179000,stock:18,featured:false,image_url:'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=900&q=85',description:'Nâu nhẹ nhàng, phù hợp phong cách tự nhiên.'},
 {id:'demo-4',name:'Mist Blue',slug:'mist-blue',color:'Blue',diameter:'14.5',wear_period:'6 tháng',price:209000,stock:20,featured:true,image_url:'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=900&q=85',description:'Sắc xanh sương khói nổi bật cho những dịp đặc biệt.'},
 {id:'demo-5',name:'Fairy Pink',slug:'fairy-pink',color:'Pink',diameter:'14.5',wear_period:'6 tháng',price:199000,stock:14,featured:false,image_url:'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?w=900&q=85',description:'Hồng nhẹ thanh thoát, cảm hứng K-beauty.'},
 {id:'demo-6',name:'Every Brown',slug:'every-brown',color:'Brown',diameter:'14.2',wear_period:'1 ngày',price:99000,stock:30,featured:false,image_url:'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=900&q=85',description:'Nâu đơn giản cho vẻ đẹp hàng ngày.'}
];
export const money = n => new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(n||0);
