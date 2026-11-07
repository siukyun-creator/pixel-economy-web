const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static('public'));
const PORT = process.env.PORT || 3000;
const ROOM = process.env.ROOM_CODE || 'TOWN123';
const TEACHER_PIN = process.env.TEACHER_PIN || '2468';
const MAX = 30;
const players = new Map();
const market = { apple: 1000, bread: 3500, toy: 15000 };
const stocks = { SKY: { name: '하늘항공', price: 50000 }, PIX: { name: '픽셀상사', price: 35000 } };
const companies = [];
const stores = [];
let wholesaleShop = null;
const ingredientCosts={milk_bread:1200,croissant:1400,cake:2600,coffee:900,donut:1000,cookie:700,pizza:3200,burger:2400,fries:900,orange_juice:1100,strawberry_smoothie:1800,lemonade:1000,steak:6500,samgyeopsal:4800,galbi:6200};
const retailPrices={milk_bread:3500,croissant:3800,cake:6500,coffee:4500,donut:3000,cookie:2500,pizza:15000,burger:6500,fries:3500,orange_juice:4000,strawberry_smoothie:5500,lemonade:4500,steak:19000,samgyeopsal:15000,galbi:18000};
const foods = { bread:{name:'베이커리',emoji:'🥐'}, cafe:{name:'카페',emoji:'☕'}, pizza:{name:'피자·분식',emoji:'🍕'}, juice:{name:'음료 가게',emoji:'🧃'}, meat:{name:'고깃집',emoji:'🥩'} };
const foodProducts={milk_bread:{category:'bread',name:'우유 식빵'},croissant:{category:'bread',name:'초코 크루아상'},cake:{category:'bread',name:'딸기 케이크'},coffee:{category:'cafe',name:'아이스 아메리카노'},donut:{category:'cafe',name:'딸기 도넛'},cookie:{category:'cafe',name:'초코 쿠키'},pizza:{category:'pizza',name:'치즈 피자'},burger:{category:'pizza',name:'치즈 버거'},fries:{category:'pizza',name:'감자튀김'},orange_juice:{category:'juice',name:'오렌지 주스'},strawberry_smoothie:{category:'juice',name:'딸기 스무디'},lemonade:{category:'juice',name:'레몬 에이드'},steak:{category:'meat',name:'직화 스테이크'},samgyeopsal:{category:'meat',name:'삼겹살 구이'},galbi:{category:'meat',name:'양념 갈비'}};
const stockHistory = { SKY: [50000], PIX: [35000] };
const properties = [
  { id: 'house1', name: '작은 집', price: 50000000, owner: null },
  { id: 'shop1', name: '상점 건물', price: 90000000, owner: null },
  { id: 'house2', name: '강변 집', price: 120000000, owner: null }
];
let news = '마을 경제가 시작됐어요!';
let taxRate = 0.05;
let gameStatus = 'waiting'; // waiting, running, paused, ended
function randomSeat() {
  const cells=[];
  for(let x=-40;x<=-8;x+=4) for(let z=-24;z<=-8;z+=4) cells.push({x,z});
  for(let i=cells.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
  return cells.find(c=>![...players.values()].some(p=>Math.abs(p.x-c.x)<2.2&&Math.abs(p.z-c.z)<2.2)) || {x:0,z:0};
}
function credit(p,gross){const amount=Math.max(0,Math.floor(gross));const tax=Math.floor(amount*taxRate);p.money+=amount-tax;p.taxPaid=(p.taxPaid||0)+tax;return {amount,tax,net:amount-tax};}
const safeName = s => String(s || '').replace(/[<>]/g, '').trim().slice(0, 12) || '학생';
let shopsEnabled = true;
let startingMoney = 200000;
let storeFee = 30000;
const snapshot = () => ({ players: [...players.values()].map(p => ({...p})), market, stocks, stockHistory, companies, stores, wholesaleShop, properties, news, taxRate, gameStatus, shopsEnabled, startingMoney, storeFee });
const broadcast = () => io.to(ROOM).emit('state', snapshot());
const msg = (s, t) => s.emit('notice', t);
function bounded(n, lo, hi) { return Math.max(lo, Math.min(hi, Math.floor(Number(n) || 0))); }
io.on('connection', socket => {
  socket.on('join', data => {
    if (!data || data.room !== ROOM) return msg(socket, '방 코드가 올바르지 않아요.');
    if (players.size >= MAX) return msg(socket, '30명이 모두 입장했어요.');
    const seat = randomSeat();
    const p = { id: socket.id, name: safeName(data.name), x: seat.x, z: seat.z, jump: false, money: startingMoney, bank: 0, taxPaid: 0, job: '무직', inventory: {apple:0,bread:0,toy:0}, shares: {SKY:0,PIX:0}, property: [], company: null, storeId: null, insideStore: null, insideWholesale: false };
    players.set(socket.id, p);if(wholesaleShop&&wholesaleShop.owner===p.name)wholesaleShop.ownerId=socket.id;
    socket.join(ROOM);
    socket.emit('joined', {id: socket.id});
    broadcast();
    io.to(ROOM).emit('notice', `${p.name} 입장!`);
  });
  socket.on('move3d', d => {
    const p = players.get(socket.id);
    if (!p || !d || gameStatus !== 'running') return;
    p.x = Math.max(-140, Math.min(140, Number(d.x) || 0));
    p.z = Math.max(-140, Math.min(140, Number(d.z) || 0));
    p.jump = !!d.jump;
    broadcast();
  });
  // 이전 버전 호환용 이동 이벤트
  socket.on('move', d => {
    const p = players.get(socket.id);
    if (!p || !d || gameStatus !== 'running') return;
    p.x = Math.max(-140, Math.min(140, p.x + Math.max(-1,Math.min(1,Number(d.dx)||0))*0.7));
    p.z = Math.max(-140, Math.min(140, p.z + Math.max(-1,Math.min(1,Number(d.dy)||0))*0.7));
    broadcast();
  });
  socket.on('enterStore', storeId => {
    const p=players.get(socket.id), st=stores.find(v=>v.id===String(storeId));
    if(!p||!st)return msg(socket,'가게를 찾을 수 없어요.');
    if(gameStatus!=='running')return msg(socket,'수업이 시작된 뒤 이용할 수 있어요.');
    if(Math.hypot(p.x-st.x,p.z-st.z)>10)return msg(socket,'가게 입구까지 걸어와 주세요.');
    p.insideStore=st.id;p.x=st.x;p.z=st.z;socket.emit('storeEntered',{...st});broadcast();
  });
  socket.on('exitStore',()=>{const p=players.get(socket.id);if(!p)return;p.insideStore=null;socket.emit('storeExited');broadcast()});
  socket.on('enterWholesale',()=>{const p=players.get(socket.id);if(!p)return;if(gameStatus!=='running')return msg(socket,'수업이 시작된 뒤 이용할 수 있어요.');if(Math.hypot(p.x-35,p.z-22)>11)return msg(socket,'도매상 입구까지 걸어와 주세요.');p.insideWholesale=true;p.insideStore=null;p.x=35;p.z=22;socket.emit('wholesaleEntered');broadcast()});
  socket.on('exitWholesale',()=>{const p=players.get(socket.id);if(!p)return;p.insideWholesale=false;socket.emit('wholesaleExited');broadcast()});
  socket.on('action', a => {
    const p=players.get(socket.id);if(!p||!a)return;
    if(a.type==='createStore'){
      if(gameStatus==='paused'||gameStatus==='ended')return msg(socket,'지금은 가게를 만들 수 없어요.');
      if(!shopsEnabled)return msg(socket,'선생님이 가게 만들기를 잠시 꺼 두셨어요.');
      const storeName=String(a.name||'').trim().slice(0,16), sign=String(a.sign||storeName).trim().slice(0,20), food=String(a.food||'bread'), product=foodProducts[String(a.productId||'')];
      if(p.storeId)return msg(socket,'이미 가게를 운영하고 있어요.');
      if(!foods[food]||!product||product.category!==food)return msg(socket,'선택한 업종에 맞는 음식을 골라 주세요.');
      if(p.money<storeFee)return msg(socket,'가게 개설에는 '+storeFee+'원이 필요해요.');
      const index=stores.length, x=-48+(index%7)*6, z=-12+Math.floor(index/7)*6;
      const palette=['#e5a84b','#67b7d8','#d9859b','#8fc27a','#a58bd5','#e0c76a'];
      const color=palette.includes(String(a.color))?String(a.color):palette[index%palette.length];
      const wallPalette=['#f4e3c1','#d8e8f5','#f3d6df','#d9ebd1','#d9d1ef','#e6dcae'];
      const signPalette=['#fff4d6','#263b59','#f7d66b','#f7a8bd','#b7e7ff','#202020'];
      const wallColor=wallPalette.includes(String(a.wallColor))?String(a.wallColor):'#f4e3c1';
      const signColor=signPalette.includes(String(a.signColor))?String(a.signColor):'#fff4d6';
      const signStyle=['classic','wood','neon'].includes(String(a.signStyle))?String(a.signStyle):'classic';
      const awningStyle=['stripe','solid','scallop'].includes(String(a.awningStyle))?String(a.awningStyle):'stripe';
      const decor=['none','plant','flower','lamp'].includes(String(a.decor))?String(a.decor):'plant';
      const pixels=Array.isArray(a.pixelArt)&&a.pixelArt.length===144?a.pixelArt.map(v=>/^#[0-9a-fA-F]{6}$/.test(String(v))?String(v):'#fff0cf'):Array(144).fill('#fff0cf');
      const st={id:'store-'+socket.id+'-'+Date.now(),ownerId:socket.id,owner:p.name,name:storeName,sign,food,productId:String(a.productId),productName:product.name,price:20,stock:10,products:{[String(a.productId)]:{stock:10,price:20,ingredients:0}},color,wallColor,signColor,signStyle,awningStyle,decor,x,z};
      p.money-=storeFee;p.storeId=st.id;st.price=retailPrices[st.productId]||3500;st.products[st.productId].price=st.price;stores.push(st);
      socket.emit('storeCreated',{ok:true,store:st,money:p.money});
      msg(socket,'🏪 가게 개설 성공! '+storeName+' · '+product.name+' 10개 준비 · 잔액 '+p.money+'원');
      broadcast();return;
    }
    if(a.type==='createWholesale'){
       if(gameStatus==='paused'||gameStatus==='ended')return msg(socket,'지금은 도매상을 창업할 수 없어요.');
       if(wholesaleShop)return msg(socket,'이미 도매상이 운영 중이에요.');
       const name=String(a.name||'').trim().slice(0,16);if(!name)return msg(socket,'도매상 이름을 입력해 주세요.');
       const fee=80000;if(p.money<fee)return msg(socket,'도매상 창업에는 80,000원이 필요해요.');
       const inventory={};Object.keys(foodProducts).forEach(id=>{const cost=ingredientCosts[id]||1000;inventory[id]={stock:0,cost,price:Math.ceil(cost*1.3/100)*100};});
       p.money-=fee;wholesaleShop={id:'wholesale-'+socket.id+'-'+Date.now(),ownerId:socket.id,owner:p.name,name,inventory,x:35,z:22};
       socket.emit('wholesaleBusinessCreated',{ok:true,shop:wholesaleShop});msg(socket,'📦 '+name+' 창업 완료! 창업비 80,000원 · 잔액 '+p.money.toLocaleString('ko-KR')+'원');broadcast();return;
     }
     if(gameStatus!=='running')return msg(socket,gameStatus==='paused'?'⏸ 수업이 잠시 멈췄어요.':'⏳ 선생님이 수업을 시작할 때까지 기다려 주세요.');
    const n=bounded(a.amount,1,10),item=String(a.item||'');

    if(a.type==='wholesaleStockUp'){
       if(!wholesaleShop||wholesaleShop.ownerId!==socket.id||!p.insideWholesale)return msg(socket,'내 도매상 안에서만 재고를 들여올 수 있어요.');
       const id=String(a.productId||''),product=foodProducts[id],qty=Number(a.amount),item=wholesaleShop.inventory[id];
       if(!product||!item)return msg(socket,'상품을 확인해 주세요.');
       if(!Number.isInteger(qty)||qty<1||qty>100)return msg(socket,'입고 수량은 1~100개로 입력해 주세요.');
       const cost=item.cost*qty;if(p.money<cost)return msg(socket,'입고 비용이 부족해요. 총 '+cost.toLocaleString('ko-KR')+'원이 필요해요.');
       p.money-=cost;item.stock+=qty;msg(socket,'📦 '+product.name+' '+qty+'개 입고 완료 · 입고비 '+cost.toLocaleString('ko-KR')+'원');socket.emit('wholesaleAdminResult',wholesaleShop);broadcast();return;
     }
     if(a.type==='setWholesalePrice'){
       if(!wholesaleShop||wholesaleShop.ownerId!==socket.id)return msg(socket,'도매상 주인만 가격을 바꿀 수 있어요.');
       const id=String(a.productId||''),item=wholesaleShop.inventory[id],price=Number(a.amount);
       if(!item||!Number.isInteger(price)||price<500||price>50000)return msg(socket,'판매 가격은 500~50,000원 사이로 입력해 주세요.');
       item.price=price;msg(socket,'🏷️ 도매 판매 가격을 '+price.toLocaleString('ko-KR')+'원으로 바꿨어요.');socket.emit('wholesaleAdminResult');broadcast();return;
     }
     if(a.type==='wholesaleCheckout'){
       if(!p.insideWholesale||Math.hypot(p.x-35,p.z-22)>11)return msg(socket,'도매상 안에서 결제해 주세요.');
       if(!wholesaleShop)return msg(socket,'아직 운영 중인 도매상이 없어요.');
       if(wholesaleShop.ownerId===socket.id)return msg(socket,'내 도매상에서는 직접 구매할 수 없어요.');
       const st=stores.find(v=>v.ownerId===socket.id);if(!st)return msg(socket,'재료를 구매하려면 먼저 식품 가게를 만들어 주세요.');
       if(!Array.isArray(a.items)||!a.items.length||a.items.length>15)return msg(socket,'장바구니 상품을 확인해 주세요.');
       const lines=[];let total=0;
       for(const row of a.items){const id=String(row?.productId||''),qty=Number(row?.amount),product=foodProducts[id],item=wholesaleShop.inventory[id];if(!product||product.category!==st.food||!item||!Number.isInteger(qty)||qty<1||qty>99)return msg(socket,'상품 또는 수량을 다시 확인해 주세요.');if(item.stock<qty)return msg(socket,product.name+' 재고가 부족해요. 현재 '+item.stock+'개 있어요.');lines.push({productId:id,name:product.name,quantity:qty,unitPrice:item.price,subtotal:item.price*qty});total+=item.price*qty;}
       if(p.money<total)return msg(socket,'결제 금액이 부족해요. '+total.toLocaleString('ko-KR')+'원 필요 · 보유 '+p.money.toLocaleString('ko-KR')+'원');
       lines.forEach(line=>{wholesaleShop.inventory[line.productId].stock-=line.quantity;st.products=st.products||{};st.products[line.productId]=st.products[line.productId]||{stock:0,price:retailPrices[line.productId]||3500,ingredients:0};st.products[line.productId].ingredients=(st.products[line.productId].ingredients||0)+line.quantity;});
       p.money-=total;const seller=players.get(wholesaleShop.ownerId);if(seller)seller.money+=total;
       socket.emit('receiptIssued',{receiptNo:'PT-'+Date.now().toString().slice(-8),date:new Date().toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}),seller:wholesaleShop.name,buyer:p.name,lines,total,payment:'현금',balance:p.money});
       msg(socket,'🧾 결제 완료! '+total.toLocaleString('ko-KR')+'원 · 영수증을 발급했어요.');broadcast();return;
     }
     if(a.type==='wholesaleBuy')return msg(socket,'새 장바구니 결제 기능을 이용해 주세요.');
      if(a.type==='cook'){
      const st=stores.find(v=>v.ownerId===socket.id);if(!st||p.storeId!==st.id)return msg(socket,'먼저 내 가게를 만들어 주세요.');
      const productId=String(a.productId||st.productId),product=foodProducts[productId];if(!product||product.category!==st.food)return msg(socket,'이 가게에서 만들 수 없는 메뉴예요.');
      const score=bounded(a.score,0,100);
      st.products=st.products||{[st.productId]:{stock:st.stock||0,price:st.price||20,ingredients:0}};st.products[productId]=st.products[productId]||{stock:0,price:retailPrices[productId]||3500,ingredients:0};const recipe=st.products[productId];recipe.ingredients=Number(recipe.ingredients)||0;if(recipe.ingredients<1)return msg(socket,'🥕 재료가 없어요! 도매상에서 재료를 먼저 구매해 주세요.');recipe.ingredients--;if(score<35)msg(socket,'🍳 요리가 아쉬워요! '+score+'점 · 재료 1개 사용');else{const made=Math.max(1,Math.floor(score/20));recipe.stock+=made;if(productId===st.productId)st.stock=recipe.stock;msg(socket,'✨ '+product.name+' '+made+'개 완성! 재고 '+recipe.stock+'개 · 남은 재료 '+recipe.ingredients+'개');}broadcast();return;
    }
    if(a.type==='setStorePrice'){
      const st=stores.find(v=>v.ownerId===socket.id);if(!st)return msg(socket,'내 가게를 먼저 만들어 주세요.');
      const productId=String(a.productId||st.productId),product=foodProducts[productId];if(!product||product.category!==st.food)return msg(socket,'메뉴를 확인해 주세요.');
      st.products=st.products||{[st.productId]:{stock:st.stock||0,price:st.price||20,ingredients:0}};st.products[productId]=st.products[productId]||{stock:0,price:retailPrices[productId]||3500,ingredients:0};st.products[productId].price=bounded(a.amount,500,50000);if(productId===st.productId)st.price=st.products[productId].price;msg(socket,'🏷️ '+product.name+' 가격을 '+st.products[productId].price+'원으로 변경!');broadcast();return;
    }
    if(a.type==='storeBuy'){
      const st=stores.find(v=>v.id===String(a.storeId));if(!st||p.insideStore!==st.id)return msg(socket,'가게 안에 들어가야 구매할 수 있어요.');if(st.ownerId===p.id)return msg(socket,'내 가게에서는 내 물건을 살 수 없어요.');
      const productId=String(a.productId||st.productId),product=foodProducts[productId];if(!product||product.category!==st.food)return msg(socket,'판매 메뉴를 찾을 수 없어요.');
      st.products=st.products||{[st.productId]:{stock:st.stock||0,price:st.price||20,ingredients:0}};st.products[productId]=st.products[productId]||{stock:0,price:retailPrices[productId]||3500,ingredients:0};const item=st.products[productId],qty=bounded(a.amount,1,10),cost=item.price*qty;
      if(!Number.isInteger(Number(a.amount))||Number(a.amount)<1||Number(a.amount)>10)return msg(socket,'구매 수량은 1~10개로 입력해 주세요.');if(item.stock<qty)return msg(socket,'재고가 부족해요. 현재 '+item.stock+'개 있어요.');if(p.money<cost)return msg(socket,'돈이 부족해요. 필요 '+cost+'원 · 보유 '+p.money+'원');
      p.money-=cost;item.stock-=qty;if(productId===st.productId)st.stock=item.stock;const owner=players.get(st.ownerId);if(owner)owner.money+=cost;msg(socket,'🛍️ '+product.name+' '+qty+'개 구매 성공! -'+cost.toLocaleString('ko-KR')+'원 · 잔액 '+p.money.toLocaleString('ko-KR')+'원 · 남은 재고 '+item.stock+'개');socket.emit('storePurchaseResult',{store:st});socket.emit('receiptIssued',{receiptNo:'PT-'+Date.now().toString().slice(-8),date:new Date().toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}),seller:st.name,buyer:p.name,lines:[{productId,name:product.name,quantity:qty,unitPrice:item.price,subtotal:cost}],total:cost,payment:'현금',balance:p.money});
    }
        else if(a.type==='storeRestock'){
      const st=stores.find(v=>v.id===String(a.storeId));
      if(!st||st.ownerId!==p.id)return msg(socket,'내 가게에서만 재고를 채울 수 있어요.');
      const cost=5000;if(p.money<cost)return msg(socket,'재고 5개 준비에는 5,000원이 필요해요.');
      p.money-=cost;st.stock+=5;msg(socket,'📦 재고 보충! '+foods[st.food].name+' 5개 추가 · 잔액 '+p.money+'원');
    }
    else if(a.type==='work'){const paid=credit(p,10000);p.job='마을 아르바이트';msg(socket,`✅ 일하기 성공! +10,000원 · 세금 ${paid.tax.toLocaleString('ko-KR')}원 · 실제 수령 ${paid.net.toLocaleString('ko-KR')}원 · 잔액 ${p.money.toLocaleString('ko-KR')}원`);}
    else if(a.type==='buy'||a.type==='sell'){
      if(Math.hypot(p.x+13,p.z+12)>9)return msg(socket,'🏪 상점 앞까지 직접 걸어와야 거래할 수 있어요.');
      if(!Object.prototype.hasOwnProperty.call(market,item)||!Object.prototype.hasOwnProperty.call(p.inventory,item))return msg(socket,'상품을 찾을 수 없어요.');
      if(a.type==='buy'){const cost=market[item]*n;if(p.money<cost)return msg(socket,`❌ 돈이 부족해요. 필요 ${cost}원 · 보유 ${p.money}원`);p.money-=cost;p.inventory[item]+=n;msg(socket,`🛍️ 구매 성공! ${item==='apple'?'사과':item==='bread'?'빵':'장난감'} ${n}개 · -${cost}원 · 잔액 ${p.money}원`);}
      else{if(p.inventory[item]<n)return msg(socket,'❌ 판매할 물건이 부족해요.');p.inventory[item]-=n;const paid=credit(p,Math.floor(market[item]*n*.8));msg(socket,`💰 판매 성공! ${n}개 판매 · 세금 ${paid.tax}원 · 받은 돈 ${paid.net}원 · 잔액 ${p.money}원`);}
    }
    else if(a.type==='deposit'){const v=n*10000;if(p.money<v)return msg(socket,'❌ 현금이 부족해요.');p.money-=v;p.bank+=v;msg(socket,`🏦 예금 성공! ${v}원 입금 · 현금 ${p.money}원 · 예금 ${p.bank}원`);}
    else if(a.type==='withdraw'){const v=n*10000;if(p.bank<v)return msg(socket,'❌ 예금이 부족해요.');p.bank-=v;p.money+=v;msg(socket,`🏦 출금 성공! ${v}원 출금 · 현금 ${p.money}원 · 예금 ${p.bank}원`);}
    else if(a.type==='stockBuy'){const st=stocks[item];if(!st)return msg(socket,'❌ 해당 주식을 찾을 수 없어요.');const cost=st.price*n;if(p.money<cost)return msg(socket,`❌ 매수 실패: 돈이 부족해요. 필요 ${cost}원 · 보유 ${p.money}원`);p.money-=cost;p.shares[item]=(p.shares[item]||0)+n;msg(socket,`📈 매수 성공! ${st.name} ${n}주 · 총 ${cost}원 · 보유 ${p.shares[item]}주 · 잔액 ${p.money}원`);}
    else if(a.type==='stockSell'){const st=stocks[item];if(!st)return msg(socket,'❌ 해당 주식을 찾을 수 없어요.');if((p.shares[item]||0)<n)return msg(socket,`❌ 매도 실패: 보유 주식이 부족해요. 현재 ${p.shares[item]||0}주`);p.shares[item]-=n;const paid=credit(p,st.price*n);msg(socket,`📉 매도 성공! ${st.name} ${n}주 · 세금 ${paid.tax}원 · 받은 돈 ${paid.net}원 · 남은 주식 ${p.shares[item]}주`);}
    else if(a.type==='property'){const q=properties.find(x=>x.id===item);if(!q||q.owner||p.money<q.price)return msg(socket,'❌ 구매 실패: 이미 주인이 있거나 돈이 부족해요.');p.money-=q.price;q.owner=p.name;p.property.push(q.id);msg(socket,`🏠 구매 성공! ${q.name} 소유 · 잔액 ${p.money}원`);}
    else if(a.type==='startup'){const companyName=safeName(a.item);if(p.company)return msg(socket,'이미 창업한 회사가 있어요.');if(companyName==='학생'||p.money<100000)return msg(socket,'회사 이름을 입력하고 창업 비용 100,000원을 준비해 주세요.');const ticker='CO'+String(companies.length+1).padStart(2,'0');p.money-=100000;p.company=ticker;p.shares[ticker]=10;stocks[ticker]={name:companyName,price:10000,owner:p.name};stockHistory[ticker]=[10000];companies.push({ticker,name:companyName,owner:p.name,price:10000});msg(socket,`🏭 창업 성공! ${companyName} · 주식 10주 지급 · 잔액 ${p.money}원`);}
    else if(a.type==='transfer'){const target=[...players.values()].find(x=>x.name===safeName(item)&&x.id!==p.id);const v=bounded(a.amount,1,1000000);if(!target||p.money<v)return msg(socket,'친구 이름이나 금액을 확인해 주세요.');p.money-=v;target.money+=v;msg(socket,`송금 성공! ${target.name}에게 ${v}원 · 잔액 ${p.money}원`);}
    else return;
    broadcast();
  });
  socket.on('sync',()=>{if(players.has(socket.id)||socket.rooms.has(ROOM))socket.emit('state',snapshot());});
  socket.on('teacherLogin', pin => { if(String(pin)!==TEACHER_PIN)return msg(socket,'교사 PIN이 틀렸어요.');socket.join(ROOM);socket.emit('teacherOK',snapshot()); });
  socket.on('teacherCommand', c => {
    if(!c||String(c.pin)!==TEACHER_PIN)return;

    if(c.type==='shops')shopsEnabled=!!c.value;
    if(c.type==='clearStores'){stores.splice(0,stores.length);players.forEach(p=>p.storeId=null);}
    if(c.type==='giveMoney'||c.type==='takeMoney'){const target=players.get(String(c.value?.id||''));const amount=bounded(c.value?.amount,1000,500000);if(target)target.money=Math.max(0,target.money+(c.type==='giveMoney'?amount:-amount));}
    if(c.type==='removeStudent'){const targetId=String(c.value?.id||'');const targetSocket=io.sockets.sockets.get(targetId);if(targetSocket)targetSocket.disconnect(true);}
    if(c.type==='shopPrice'){const price=bounded(c.value,500,50000);stores.forEach(st=>{st.price=price;st.products[st.productId].price=price;});}
    if(c.type==='startingMoney'){startingMoney=bounded(c.value,0,5000000);players.forEach(p=>p.money=startingMoney);}
    if(c.type==='storeFee'){storeFee=bounded(c.value,0,500000);}
    if(c.type==='resetEconomy'){players.forEach(p=>{p.money=200000;p.bank=0;p.taxPaid=0;p.inventory={apple:0,bread:0,toy:0};p.storeId=null;p.insideStore=null;p.insideWholesale=false;});stores.splice(0,stores.length);wholesaleShop=null;companies.splice(0,companies.length);taxRate=.05;shopsEnabled=true;startingMoney=200000;storeFee=30000;}
    if(c.type==='news')news=String(c.value||'').slice(0,100);
    if(c.type==='bonus'){const v=bounded(c.value,0,1000000);players.forEach(p=>p.money+=v);}
    if(c.type==='tax')taxRate=Math.max(0,Math.min(.5,Number(c.value)||0));
    if(c.type==='start' && (gameStatus==='waiting'||gameStatus==='paused'||gameStatus==='ended'))gameStatus='running';
    if(c.type==='pause' && gameStatus==='running')gameStatus='paused';
    if(c.type==='resume' && gameStatus==='paused')gameStatus='running';
    if(c.type==='end')gameStatus='ended';
    if(c.type==='reset')gameStatus='waiting';
    if(c.type==='randomize'){
      const cells=[];for(let x=-20;x<=20;x+=4)for(let z=-20;z<=20;z+=4)cells.push({x,z});
      for(let i=cells.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
      [...players.values()].forEach((p,i)=>{p.x=cells[i%cells.length].x;p.z=cells[i%cells.length].z;p.jump=false;});
    }
    if(c.type==='price'){const item=String(c.item||'');const v=bounded(c.value,1,500);if(market[item])market[item]=v;}
    broadcast();
    socket.emit('teacherCommandResult',{ok:true,gameStatus,news,shopsEnabled});
  });
  socket.on('disconnect',()=>{players.delete(socket.id);broadcast();});
});
setInterval(() => {
  for (const [ticker, stock] of Object.entries(stocks)) {
    stock.price = Math.max(1000, stock.price + (Math.floor(Math.random() * 2001) - 1000));
    stockHistory[ticker] ||= [];
    stockHistory[ticker].push(stock.price);
    if (stockHistory[ticker].length > 60) stockHistory[ticker].shift();
    const company = companies.find(c => c.ticker === ticker);
    if (company) company.price = stock.price;
  }
  broadcast();
}, 10000);
server.listen(PORT,'0.0.0.0',()=>console.log('Pixel Economy 3D listening on '+PORT));
