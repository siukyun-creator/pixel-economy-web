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
const market = { apple: 10, bread: 20, toy: 35 };
const stocks = { SKY: { name: '하늘항공', price: 50 }, PIX: { name: '픽셀상사', price: 35 } };
const companies = [];
const stockHistory = { SKY: [50], PIX: [35] };
const properties = [
  { id: 'house1', name: '작은 집', price: 500, owner: null },
  { id: 'shop1', name: '상점 건물', price: 900, owner: null },
  { id: 'house2', name: '강변 집', price: 1200, owner: null }
];
let news = '마을 경제가 시작됐어요!';
let taxRate = 0.05;
let gameStatus = 'waiting'; // waiting, running, paused, ended
function randomSeat() {
  const cells=[];
  for(let x=-20;x<=20;x+=4) for(let z=-20;z<=20;z+=4) cells.push({x,z});
  for(let i=cells.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
  return cells.find(c=>![...players.values()].some(p=>Math.abs(p.x-c.x)<2.2&&Math.abs(p.z-c.z)<2.2)) || {x:0,z:0};
}
function credit(p,gross){const amount=Math.max(0,Math.floor(gross));const tax=Math.floor(amount*taxRate);p.money+=amount-tax;p.taxPaid=(p.taxPaid||0)+tax;return {amount,tax,net:amount-tax};}
const safeName = s => String(s || '').replace(/[<>]/g, '').trim().slice(0, 12) || '학생';
const snapshot = () => ({ players: [...players.values()].map(p => ({...p})), market, stocks, stockHistory, companies, properties, news, taxRate, gameStatus });
const broadcast = () => io.to(ROOM).emit('state', snapshot());
const msg = (s, t) => s.emit('notice', t);
function bounded(n, lo, hi) { return Math.max(lo, Math.min(hi, Math.floor(Number(n) || 0))); }
io.on('connection', socket => {
  socket.on('join', data => {
    if (!data || data.room !== ROOM) return msg(socket, '방 코드가 올바르지 않아요.');
    if (players.size >= MAX) return msg(socket, '30명이 모두 입장했어요.');
    const seat = randomSeat();
    const p = { id: socket.id, name: safeName(data.name), x: seat.x, z: seat.z, jump: false, money: 500, bank: 0, taxPaid: 0, job: '무직', inventory: {apple:0,bread:0,toy:0}, shares: {SKY:0,PIX:0}, property: [], company: null };
    players.set(socket.id, p);
    socket.join(ROOM);
    socket.emit('joined', {id: socket.id});
    broadcast();
    io.to(ROOM).emit('notice', `${p.name} 입장!`);
  });
  socket.on('move3d', d => {
    const p = players.get(socket.id);
    if (!p || !d || gameStatus !== 'running') return;
    p.x = Math.max(-42, Math.min(42, Number(d.x) || 0));
    p.z = Math.max(-42, Math.min(42, Number(d.z) || 0));
    p.jump = !!d.jump;
    broadcast();
  });
  // 이전 버전 호환용 이동 이벤트
  socket.on('move', d => {
    const p = players.get(socket.id);
    if (!p || !d || gameStatus !== 'running') return;
    p.x = Math.max(-42, Math.min(42, p.x + Math.max(-1,Math.min(1,Number(d.dx)||0))*0.7));
    p.z = Math.max(-42, Math.min(42, p.z + Math.max(-1,Math.min(1,Number(d.dy)||0))*0.7));
    broadcast();
  });
  socket.on('action', a => {
    const p=players.get(socket.id);if(!p||!a)return;
    if(gameStatus!=='running')return msg(socket,gameStatus==='paused'?'⏸ 수업이 잠시 멈췄어요.':'⏳ 선생님이 수업을 시작할 때까지 기다려 주세요.');
    const n=bounded(a.amount,1,10),item=String(a.item||'');
    if(a.type==='work'){const paid=credit(p,100);p.job='마을 아르바이트';msg(socket,`✅ 일하기 성공! +100원 · 세금 ${paid.tax}원 · 실제 수령 ${paid.net}원 · 잔액 ${p.money}원`);}
    else if(a.type==='buy'||a.type==='sell'){
      if(Math.hypot(p.x+13,p.z+12)>9)return msg(socket,'🏪 상점 앞까지 직접 걸어와야 거래할 수 있어요.');
      if(!Object.prototype.hasOwnProperty.call(market,item)||!Object.prototype.hasOwnProperty.call(p.inventory,item))return msg(socket,'상품을 찾을 수 없어요.');
      if(a.type==='buy'){const cost=market[item]*n;if(p.money<cost)return msg(socket,`❌ 돈이 부족해요. 필요 ${cost}원 · 보유 ${p.money}원`);p.money-=cost;p.inventory[item]+=n;msg(socket,`🛍️ 구매 성공! ${item==='apple'?'사과':item==='bread'?'빵':'장난감'} ${n}개 · -${cost}원 · 잔액 ${p.money}원`);}
      else{if(p.inventory[item]<n)return msg(socket,'❌ 판매할 물건이 부족해요.');p.inventory[item]-=n;const paid=credit(p,Math.floor(market[item]*n*.8));msg(socket,`💰 판매 성공! ${n}개 판매 · 세금 ${paid.tax}원 · 받은 돈 ${paid.net}원 · 잔액 ${p.money}원`);}
    }
    else if(a.type==='deposit'){const v=n*100;if(p.money<v)return msg(socket,'❌ 현금이 부족해요.');p.money-=v;p.bank+=v;msg(socket,`🏦 예금 성공! ${v}원 입금 · 현금 ${p.money}원 · 예금 ${p.bank}원`);}
    else if(a.type==='withdraw'){const v=n*100;if(p.bank<v)return msg(socket,'❌ 예금이 부족해요.');p.bank-=v;p.money+=v;msg(socket,`🏦 출금 성공! ${v}원 출금 · 현금 ${p.money}원 · 예금 ${p.bank}원`);}
    else if(a.type==='stockBuy'){const st=stocks[item];if(!st)return msg(socket,'❌ 해당 주식을 찾을 수 없어요.');const cost=st.price*n;if(p.money<cost)return msg(socket,`❌ 매수 실패: 돈이 부족해요. 필요 ${cost}원 · 보유 ${p.money}원`);p.money-=cost;p.shares[item]=(p.shares[item]||0)+n;msg(socket,`📈 매수 성공! ${st.name} ${n}주 · 총 ${cost}원 · 보유 ${p.shares[item]}주 · 잔액 ${p.money}원`);}
    else if(a.type==='stockSell'){const st=stocks[item];if(!st)return msg(socket,'❌ 해당 주식을 찾을 수 없어요.');if((p.shares[item]||0)<n)return msg(socket,`❌ 매도 실패: 보유 주식이 부족해요. 현재 ${p.shares[item]||0}주`);p.shares[item]-=n;const paid=credit(p,st.price*n);msg(socket,`📉 매도 성공! ${st.name} ${n}주 · 세금 ${paid.tax}원 · 받은 돈 ${paid.net}원 · 남은 주식 ${p.shares[item]}주`);}
    else if(a.type==='property'){const q=properties.find(x=>x.id===item);if(!q||q.owner||p.money<q.price)return msg(socket,'❌ 구매 실패: 이미 주인이 있거나 돈이 부족해요.');p.money-=q.price;q.owner=p.name;p.property.push(q.id);msg(socket,`🏠 구매 성공! ${q.name} 소유 · 잔액 ${p.money}원`);}
    else if(a.type==='startup'){const companyName=safeName(a.item);if(p.company)return msg(socket,'이미 창업한 회사가 있어요.');if(companyName==='학생'||p.money<300)return msg(socket,'회사 이름을 입력하고 창업 비용 300원을 준비해 주세요.');const ticker='CO'+String(companies.length+1).padStart(2,'0');p.money-=300;p.company=ticker;p.shares[ticker]=10;stocks[ticker]={name:companyName,price:100,owner:p.name};stockHistory[ticker]=[100];companies.push({ticker,name:companyName,owner:p.name,price:100});msg(socket,`🏭 창업 성공! ${companyName} · 주식 10주 지급 · 잔액 ${p.money}원`);}
    else if(a.type==='transfer'){const target=[...players.values()].find(x=>x.name===safeName(item)&&x.id!==p.id);const v=bounded(a.amount,1,500);if(!target||p.money<v)return msg(socket,'친구 이름이나 금액을 확인해 주세요.');p.money-=v;target.money+=v;msg(socket,`송금 성공! ${target.name}에게 ${v}원 · 잔액 ${p.money}원`);}
    else return;
    broadcast();
  });
  socket.on('sync',()=>{if(players.has(socket.id)||socket.rooms.has(ROOM))socket.emit('state',snapshot());});
  socket.on('teacherLogin', pin => { if(String(pin)!==TEACHER_PIN)return msg(socket,'교사 PIN이 틀렸어요.');socket.join(ROOM);socket.emit('teacherOK',snapshot()); });
  socket.on('teacherCommand', c => {
    if(!c||String(c.pin)!==TEACHER_PIN)return;
    if(c.type==='news')news=String(c.value||'').slice(0,100);
    if(c.type==='bonus'){const v=bounded(c.value,0,1000);players.forEach(p=>p.money+=v);}
    if(c.type==='tax')taxRate=Math.max(0,Math.min(.5,Number(c.value)||0));
    if(c.type==='start' && gameStatus==='waiting')gameStatus='running';
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
  });
  socket.on('disconnect',()=>{players.delete(socket.id);broadcast();});
});
setInterval(() => {
  for (const [ticker, stock] of Object.entries(stocks)) {
    stock.price = Math.max(5, stock.price + Math.floor(Math.random() * 5) - 2);
    stockHistory[ticker] ||= [];
    stockHistory[ticker].push(stock.price);
    if (stockHistory[ticker].length > 60) stockHistory[ticker].shift();
    const company = companies.find(c => c.ticker === ticker);
    if (company) company.price = stock.price;
  }
  broadcast();
}, 10000);
server.listen(PORT,'0.0.0.0',()=>console.log('Pixel Economy 3D listening on '+PORT));
