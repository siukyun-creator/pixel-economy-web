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
const safeName = s => String(s || '').replace(/[<>]/g, '').trim().slice(0, 12) || '학생';
const snapshot = () => ({ players: [...players.values()].map(p => ({...p})), market, stocks, stockHistory, companies, properties, news, taxRate });
const broadcast = () => io.to(ROOM).emit('state', snapshot());
const msg = (s, t) => s.emit('notice', t);
function bounded(n, lo, hi) { return Math.max(lo, Math.min(hi, Math.floor(Number(n) || 0))); }
io.on('connection', socket => {
  socket.on('join', data => {
    if (!data || data.room !== ROOM) return msg(socket, '방 코드가 올바르지 않아요.');
    if (players.size >= MAX) return msg(socket, '30명이 모두 입장했어요.');
    const p = { id: socket.id, name: safeName(data.name), x: (Math.random() - 0.5) * 5, z: (Math.random() - 0.5) * 5, jump: false, money: 500, bank: 0, job: '무직', inventory: {apple:0,bread:0,toy:0}, shares: {SKY:0,PIX:0}, property: [], company: null };
    players.set(socket.id, p);
    socket.join(ROOM);
    socket.emit('joined', {id: socket.id});
    broadcast();
    io.to(ROOM).emit('notice', `${p.name} 입장!`);
  });
  socket.on('move3d', d => {
    const p = players.get(socket.id);
    if (!p || !d) return;
    p.x = Math.max(-42, Math.min(42, Number(d.x) || 0));
    p.z = Math.max(-42, Math.min(42, Number(d.z) || 0));
    p.jump = !!d.jump;
    broadcast();
  });
  // 이전 버전 호환용 이동 이벤트
  socket.on('move', d => {
    const p = players.get(socket.id);
    if (!p || !d) return;
    p.x = Math.max(-42, Math.min(42, p.x + Math.max(-1,Math.min(1,Number(d.dx)||0))*0.7));
    p.z = Math.max(-42, Math.min(42, p.z + Math.max(-1,Math.min(1,Number(d.dy)||0))*0.7));
    broadcast();
  });
  socket.on('action', a => {
    const p = players.get(socket.id); if (!p || !a) return;
    const n = bounded(a.amount, 1, 10); const item = String(a.item || '');
    if (a.type === 'work') { p.money += 100; p.job = '마을 아르바이트'; msg(socket,'일해서 100원을 벌었어요!'); }
    else if (a.type === 'buy') { const cost=(market[item]||0)*n; if (!cost || p.money<cost) return msg(socket,'돈이 부족해요.'); p.money-=cost; p.inventory[item]+=n; }
    else if (a.type === 'sell') { if (!p.inventory[item] || p.inventory[item]<n) return msg(socket,'판매할 물건이 부족해요.'); p.inventory[item]-=n; p.money+=Math.floor(market[item]*n*.8); }
    else if (a.type === 'deposit') { const v=n*100; if(p.money<v)return msg(socket,'현금이 부족해요.'); p.money-=v;p.bank+=v; }
    else if (a.type === 'withdraw') { const v=n*100;if(p.bank<v)return msg(socket,'예금이 부족해요.');p.bank-=v;p.money+=v; }
    else if (a.type === 'stockBuy') { const s=stocks[item];if(!s||p.money<s.price*n)return msg(socket,'돈이 부족해요.');p.money-=s.price*n;p.shares[item]+=n; }
    else if (a.type === 'stockSell') { const s=stocks[item];if(!s||p.shares[item]<n)return msg(socket,'보유 주식이 부족해요.');p.shares[item]-=n;p.money+=s.price*n; }
    else if (a.type === 'property') { const q=properties.find(x=>x.id===item);if(!q||q.owner||p.money<q.price)return msg(socket,'구매할 수 없는 부동산이에요.');p.money-=q.price;q.owner=p.name;p.property.push(q.id); }
    else if (a.type === 'startup') {
      const companyName = safeName(a.item);
      if (p.company) return msg(socket, '이미 창업한 회사가 있어요.');
      if (companyName === '학생' || p.money < 300) return msg(socket, '회사 이름을 입력하고 창업 비용 300원을 준비해 주세요.');
      const ticker = 'CO' + String(companies.length + 1).padStart(2, '0');
      p.money -= 300; p.company = ticker; p.shares[ticker] = 10;
      stocks[ticker] = { name: companyName, price: 100, owner: p.name };
      stockHistory[ticker] = [100];
      companies.push({ ticker, name: companyName, owner: p.name, price: 100 });
      msg(socket, companyName + ' 창업 성공! 시작 주식 10주를 받았어요.');
    }
    else if (a.type === 'transfer') { const target=[...players.values()].find(x=>x.name===safeName(item)&&x.id!==p.id);const v=bounded(a.amount,1,500);if(!target||p.money<v)return msg(socket,'친구 이름이나 금액을 확인해 주세요.');p.money-=v;target.money+=v;msg(socket,`${target.name}에게 ${v}원을 보냈어요.`); }
    else return;
    broadcast();
  });
  socket.on('teacherLogin', pin => { if(String(pin)!==TEACHER_PIN)return msg(socket,'교사 PIN이 틀렸어요.');socket.emit('teacherOK',snapshot()); });
  socket.on('teacherCommand', c => {
    if(!c||String(c.pin)!==TEACHER_PIN)return;
    if(c.type==='news')news=String(c.value||'').slice(0,100);
    if(c.type==='bonus'){const v=bounded(c.value,0,1000);players.forEach(p=>p.money+=v);}
    if(c.type==='tax')taxRate=Math.max(0,Math.min(.5,Number(c.value)||0));
    if(c.type==='price'){const item=String(c.item||'');const v=bounded(c.value,1,500);if(market[item])market[item]=v;}
    broadcast();
  });
  socket.on('disconnect',()=>{players.delete(socket.id);broadcast();});
});
setInterval(() => {
  for (const [ticker, stock] of Object.entries(stocks)) {
    stock.price = Math.max(5, stock.price + Math.floor(Math.random() * 11) - 5);
    stockHistory[ticker] ||= [];
    stockHistory[ticker].push(stock.price);
    if (stockHistory[ticker].length > 30) stockHistory[ticker].shift();
    const company = companies.find(c => c.ticker === ticker);
    if (company) company.price = stock.price;
  }
  broadcast();
}, 30000);
server.listen(PORT,'0.0.0.0',()=>console.log('Pixel Economy 3D listening on '+PORT));
