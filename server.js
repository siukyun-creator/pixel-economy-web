const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static('public'));
const PORT = process.env.PORT || 3000;
const TEACHER_PIN = process.env.TEACHER_PIN;
if (!TEACHER_PIN) throw new Error('TEACHER_PIN environment variable must be set.');
const DONATION_CAUSES = ['community', 'disability', 'seniors', 'inclusiveEmployment'];
const emptyDonations = () => ({ community: 0, disability: 0, seniors: 0, inclusiveEmployment: 0 });
const MARKET_DAYS = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const COMPANY_PRODUCTS = {
  electronics: { name: '전자기기', productId: 'smartphone', productName: '픽셀 스마트폰', unitCost: 20000, unitPrice: 30000 },
  food: { name: '식품', productId: 'snack', productName: '픽셀 에너지바', unitCost: 5000, unitPrice: 8000 },
  toys: { name: '장난감·학용품', productId: 'robotKit', productName: '픽셀 로봇 조립 키트', unitCost: 10000, unitPrice: 16000 }
};
const roomCodeMap = new Map();
function makeRoomCode() {
  let code;
  do { code = String(Math.floor(1000 + Math.random() * 9000)); } while (roomCodeMap.has(code));
  return code;
}
function createClassroom(roomCode) {
  let ROOM = roomCode;
  const roomIo = io.of('/classrooms/' + roomCode);
  roomCodeMap.set(roomCode, roomIo);
const MAX = 30;
const MAX_STORE_EMPLOYEES = 3;
const monthlyPeriod = () => {
  const date = new Date();
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};
const players = new Map();
const market = { apple: 1000, bread: 3500, toy: 15000 };
const stocks = {};
const companies = [];
const stores = [];
let wholesaleShop = null;
const ingredientCosts={milk_bread:1200,croissant:1400,cake:2600,coffee:900,donut:1000,cookie:700,pizza:3200,burger:2400,fries:900,orange_juice:1100,strawberry_smoothie:1800,lemonade:1000,steak:6500,samgyeopsal:4800,galbi:6200};
const retailPrices={milk_bread:3500,croissant:3800,cake:6500,coffee:4500,donut:3000,cookie:2500,pizza:15000,burger:6500,fries:3500,orange_juice:4000,strawberry_smoothie:5500,lemonade:4500,steak:19000,samgyeopsal:15000,galbi:18000};
const foods = { bread:{name:'베이커리',emoji:'🥐'}, cafe:{name:'카페',emoji:'☕'}, pizza:{name:'피자·분식',emoji:'🍕'}, juice:{name:'음료 가게',emoji:'🧃'}, meat:{name:'고깃집',emoji:'🥩'} };
const STORE_EQUIPMENT = {
  bread: [
    {id:'oven',label:'오븐',options:[{id:'oven_basic',name:'소형 오븐',cost:0,boost:0},{id:'oven_pro',name:'컨벡션 오븐',cost:18000,boost:0.10},{id:'oven_premium',name:'대형 데크 오븐',cost:35000,boost:0.18}]},
    {id:'display',label:'진열대',options:[{id:'display_basic',name:'기본 진열장',cost:0,boost:0},{id:'display_cool',name:'냉장 쇼케이스',cost:12000,boost:0.07},{id:'display_premium',name:'프리미엄 쇼케이스',cost:25000,boost:0.12}]},
    {id:'seating',label:'손님 공간',options:[{id:'seat_basic',name:'작은 테이블',cost:0,boost:0},{id:'seat_comfort',name:'편안한 좌석',cost:10000,boost:0.05},{id:'seat_lounge',name:'넓은 베이커리 라운지',cost:22000,boost:0.10}]}
  ],
  cafe: [
    {id:'machine',label:'커피 머신',options:[{id:'machine_basic',name:'기본 커피 머신',cost:0,boost:0},{id:'machine_pro',name:'에스프레소 머신',cost:22000,boost:0.12},{id:'machine_premium',name:'프로 바리스타 머신',cost:42000,boost:0.20}]},
    {id:'ice',label:'제빙·냉장',options:[{id:'ice_basic',name:'소형 냉장고',cost:0,boost:0},{id:'ice_pro',name:'대형 제빙기',cost:16000,boost:0.08},{id:'ice_premium',name:'업소용 제빙 시스템',cost:30000,boost:0.14}]},
    {id:'seating',label:'손님 공간',options:[{id:'cafe_seat_basic',name:'기본 테이블',cost:0,boost:0},{id:'cafe_seat_pro',name:'감성 테이블 세트',cost:12000,boost:0.06},{id:'cafe_seat_premium',name:'넓은 카페 라운지',cost:26000,boost:0.12}]}
  ],
  pizza: [
    {id:'oven',label:'조리 기계',options:[{id:'pizza_basic',name:'기본 오븐',cost:0,boost:0},{id:'pizza_pro',name:'전문 피자 오븐',cost:20000,boost:0.11},{id:'pizza_premium',name:'대형 화덕 오븐',cost:40000,boost:0.19}]},
    {id:'prep',label:'조리 설비',options:[{id:'prep_basic',name:'기본 조리대',cost:0,boost:0},{id:'prep_pro',name:'자동 튀김기',cost:14000,boost:0.07},{id:'prep_premium',name:'멀티 조리 시스템',cost:28000,boost:0.13}]},
    {id:'seating',label:'손님 공간',options:[{id:'pizza_seat_basic',name:'기본 의자',cost:0,boost:0},{id:'pizza_seat_pro',name:'4인 테이블',cost:11000,boost:0.05},{id:'pizza_seat_premium',name:'패밀리 좌석',cost:24000,boost:0.10}]}
  ],
  juice: [
    {id:'blender',label:'음료 기계',options:[{id:'blend_basic',name:'기본 믹서기',cost:0,boost:0},{id:'blend_pro',name:'고속 블렌더',cost:15000,boost:0.10},{id:'blend_premium',name:'업소용 블렌딩 머신',cost:30000,boost:0.18}]},
    {id:'fridge',label:'냉장 설비',options:[{id:'fridge_basic',name:'소형 냉장고',cost:0,boost:0},{id:'fridge_pro',name:'음료 쇼케이스',cost:13000,boost:0.07},{id:'fridge_premium',name:'대형 냉장 시스템',cost:26000,boost:0.13}]},
    {id:'seating',label:'손님 공간',options:[{id:'juice_seat_basic',name:'기본 스툴',cost:0,boost:0},{id:'juice_seat_pro',name:'바 테이블',cost:9000,boost:0.05},{id:'juice_seat_premium',name:'테라스 좌석',cost:20000,boost:0.10}]}
  ],
  meat: [
    {id:'grill',label:'고기 구이 기계',options:[{id:'grill_basic',name:'기본 불판',cost:0,boost:0},{id:'grill_pro',name:'연기 흡입 로스터',cost:22000,boost:0.12},{id:'grill_premium',name:'프리미엄 자동 로스터',cost:42000,boost:0.20}]},
    {id:'vent',label:'환기 설비',options:[{id:'vent_basic',name:'기본 환풍기',cost:0,boost:0},{id:'vent_pro',name:'강력 환기 시스템',cost:18000,boost:0.08},{id:'vent_premium',name:'저소음 공조 시스템',cost:32000,boost:0.14}]},
    {id:'seating',label:'손님 공간',options:[{id:'meat_seat_basic',name:'기본 테이블',cost:0,boost:0},{id:'meat_seat_pro',name:'편안한 고깃집 좌석',cost:13000,boost:0.06},{id:'meat_seat_premium',name:'프리미엄 룸 좌석',cost:27000,boost:0.12}]}
  ]
};
const foodProducts={milk_bread:{category:'bread',name:'우유 식빵'},croissant:{category:'bread',name:'초코 크루아상'},cake:{category:'bread',name:'딸기 케이크'},coffee:{category:'cafe',name:'아이스 아메리카노'},donut:{category:'cafe',name:'딸기 도넛'},cookie:{category:'cafe',name:'초코 쿠키'},pizza:{category:'pizza',name:'치즈 피자'},burger:{category:'pizza',name:'치즈 버거'},fries:{category:'pizza',name:'감자튀김'},orange_juice:{category:'juice',name:'오렌지 주스'},strawberry_smoothie:{category:'juice',name:'딸기 스무디'},lemonade:{category:'juice',name:'레몬 에이드'},steak:{category:'meat',name:'직화 스테이크'},samgyeopsal:{category:'meat',name:'삼겹살 구이'},galbi:{category:'meat',name:'양념 갈비'}};
const stockHistory = {};
const stockOrders = {};
let marketClock = { dayIndex: 0, day: MARKET_DAYS[0], time: '09:00', marketOpen: true, turnMinutes: 30 };
const turnConfig = { durationMinutes: 3, totalTurns: 6 };
let turnState = { turnNumber: 1, endsAt: null, remainingMs: null, summary: null, baseline: {}, initialAssets: {} };
let finalAwards = null;
const properties = [
  { id: 'house1', name: '작은 집', price: 50000000, owner: null },
  { id: 'shop1', name: '상점 건물', price: 90000000, owner: null },
  { id: 'house2', name: '강변 집', price: 120000000, owner: null }
];
let news = '마을 경제가 시작됐어요!';
let newsFeed = [];
let taxRate = 0.05;
let gameStatus = 'waiting'; // waiting, running, paused, ended
function randomSeat() {
  const cells=[];
  for(let x=-20;x<=20;x+=4) for(let z=-6;z<=6;z+=3) cells.push({x,z});
  for(let i=cells.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
  return cells.find(c=>![...players.values()].some(p=>Math.abs(p.x-c.x)<2.2&&Math.abs(p.z-c.z)<2.2)) || {x:0,z:0};
}
function credit(p,gross){const amount=Math.max(0,Math.floor(gross));const rawTax=Math.floor(amount*taxRate);const relief=Math.min(rawTax,Math.max(0,Math.floor(p.taxRelief||0)));p.taxRelief=Math.max(0,(p.taxRelief||0)-relief);const tax=rawTax-relief;p.money+=amount-tax;p.taxPaid=(p.taxPaid||0)+tax;p.earnedTotal=(p.earnedTotal||0)+(amount-tax);return {amount,tax,relief,net:amount-tax};}
function processAutomaticPayroll(){const period=monthlyPeriod();let changed=false;for(const st of stores){if(!st.employees?.length)continue;if(!st.payrollMonth){st.payrollMonth=period;continue;}if(st.payrollMonth===period)continue;const owner=players.get(st.ownerId);const total=st.employees.reduce((sum,e)=>sum+(Number(e.salary)||0),0);if(!owner||owner.money<total)continue;owner.money-=total;for(const e of st.employees){const employee=players.get(e.playerId);if(employee)credit(employee,e.salary);}st.payrollMonth=period;changed=true;}for(const company of companies){if(!company.employees?.length)continue;if(!company.payrollMonth){company.payrollMonth=period;continue;}if(company.payrollMonth===period)continue;const owner=players.get(company.ownerId);const total=company.employees.reduce((sum,e)=>sum+(Number(e.salary)||0),0);if(!owner||owner.money<total)continue;owner.money-=total;for(const e of company.employees){const employee=players.get(e.playerId);if(employee)credit(employee,e.salary);}company.payrollMonth=period;changed=true;}return changed;}
const safeName = s => String(s || '').replace(/[<>]/g, '').trim().slice(0, 12) || '학생';
let shopsEnabled = true;
let startingMoney = 200000;
let storeFee = 30000;
let storeCustomerRate = 50;
const snapshot = () => ({ serverTime: Date.now(), players: [...players.values()].map(p => ({...p})), market, stocks, stockHistory, companies, stores, wholesaleShop, properties, news, newsFeed, taxRate, gameStatus, shopsEnabled, startingMoney, storeFee, storeCustomerRate, marketClock, turnConfig, turnState, finalAwards });
const broadcast = () => roomIo.emit('state', snapshot());
const broadcastEmployment = () => broadcast();
const msg = (s, t) => s.emit('notice', t);
function bounded(n, lo, hi) { return Math.max(lo, Math.min(hi, Math.floor(Number(n) || 0))); }
function marketIsOpen(time = marketClock.time) {
  const [hours, minutes] = String(time).split(':').map(Number);
  const value = hours * 60 + minutes;
  return value >= 540 && value < 930;
}
function setMarketClock(dayIndex, time, turnMinutes = marketClock.turnMinutes) {
  if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex >= MARKET_DAYS.length ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time)) ||
      !Number.isInteger(turnMinutes) || turnMinutes < 5 || turnMinutes > 180) return false;
  marketClock = { dayIndex, day: MARKET_DAYS[dayIndex], time, marketOpen: marketIsOpen(time), turnMinutes };
  return true;
}
function advanceMarket() {
  if (!marketClock.marketOpen) return false;
  let [hours, minutes] = marketClock.time.split(':').map(Number);
  let total = hours * 60 + minutes + marketClock.turnMinutes;
  let dayIndex = marketClock.dayIndex;
  const closesOnSaturday = dayIndex === MARKET_DAYS.length - 1 && total >= 930;
  if (total >= 930) {
    updateStockPrices();
    if (closesOnSaturday) {
      setMarketClock(dayIndex, '15:30');
      gameStatus = 'ended';
      finalAwards = calculateFinalAwards();
      return true;
    }
    dayIndex = Math.min(dayIndex + 1, MARKET_DAYS.length - 1);
    total = 540;
  } else {
    updateStockPrices();
  }
  const time = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  setMarketClock(dayIndex, time);
  return true;
}
function updateStockPrices() {
  for (const [ticker, stock] of Object.entries(stocks)) {
    const orders = stockOrders[ticker] || { buys: 0, sells: 0 };
    const totalOrders = orders.buys + orders.sells;
    const orderPressure = totalOrders ? (orders.buys - orders.sells) / totalOrders : 0;
    const company = companies.find(value => value.ticker === ticker);
    const profitRatio = company ? Math.max(-1, Math.min(1, company.operatingProfit / Math.max(50000, company.costs))) : 0;
    const randomNews = Math.random() * 0.02 - 0.01;
    const rate = Math.max(-0.06, Math.min(0.06, orderPressure * 0.025 + profitRatio * 0.01 + randomNews * 0.5));
    const previous = stock.price;
    const change = Math.sign(rate) * Math.max(100, Math.round(Math.abs(previous * rate) / 100) * 100);
    stock.price = Math.max(1000, Math.min(500000, previous + change));
    stock.lastChange = stock.price - previous;
    stock.lastChangeRate = previous ? stock.lastChange / previous : 0;
    stock.lastReason = totalOrders ? (orderPressure > 0 ? '매수세 우위' : orderPressure < 0 ? '매도세 우위' : '거래 균형') : '시장 기대와 기업 실적';
    orders.buys = 0;
    orders.sells = 0;
    stockOrders[ticker] = orders;
    stockHistory[ticker] ||= [];
    stockHistory[ticker].push(stock.price);
    if (stockHistory[ticker].length > 60) stockHistory[ticker].shift();
    if (company) company.price = stock.price;
  }
  return true;
}
function applyImmediateStockMove(ticker, rate, reason) {
  const stock = stocks[ticker];
  if (!stock) return;
  const previous = stock.price;
  const change = Math.max(10, Math.round(Math.abs(previous * rate) / 10) * 10) * Math.sign(rate);
  stock.price = Math.max(1000, Math.min(500000, previous + change));
  stock.lastChange = stock.price - previous;
  stock.lastChangeRate = previous ? stock.lastChange / previous : 0;
  stock.lastReason = reason;
  const history = stockHistory[ticker] ||= [];
  history.push(stock.price);
  if (history.length > 60) history.shift();
  const company = companies.find(value => value.ticker === ticker);
  if (company) company.price = stock.price;
}
const COMPANY_NEWS = {
  good: [
    ['신제품 출시 대성공', '새 제품이 큰 관심을 받으며 주문 문의가 늘었어요.'],
    ['품질 인증 획득', '제품 품질을 인정받아 소비자 신뢰가 높아졌어요.'],
    ['유명 매장과 납품 계약', '새로운 판매처가 생겨 고객 방문이 늘어날 전망이에요.'],
    ['친환경 생산 호평', '환경을 생각하는 생산 방식이 좋은 평가를 받았어요.'],
    ['고객 만족도 상승', '친절한 서비스와 좋은 품질로 단골 고객이 늘었어요.']
  ],
  bad: [
    ['제품 결함 논란', '일부 제품의 품질 문제가 알려져 고객 관심이 줄었어요.'],
    ['원재료 가격 급등', '생산 비용 부담이 커져 수익 전망이 나빠졌어요.'],
    ['배송 지연 발생', '배송이 늦어져 고객 불만이 늘었어요.'],
    ['경쟁사 신제품 등장', '강력한 경쟁 상품이 등장해 고객이 분산되고 있어요.'],
    ['광고 논란 발생', '홍보 내용에 대한 논란으로 소비자 신뢰가 낮아졌어요.']
  ]
};
function generateCompanyNews() {
  if (!companies.length) {
    news = '📰 오늘의 마을 소식: 새로운 기업이 생기면 기업 뉴스가 시작돼요.';
    return null;
  }
  const company = companies[Math.floor(Math.random() * companies.length)];
  const positive = Math.random() < 0.5;
  const item = (positive ? COMPANY_NEWS.good : COMPANY_NEWS.bad)[Math.floor(Math.random() * 5)];
  const demandChange = positive ? 20 : -25;
  company.customerDemand = Math.max(30, Math.min(180, (company.customerDemand || 100) + demandChange));
  const stockRate = positive ? 0.05 : -0.06;
  applyImmediateStockMove(company.ticker, stockRate, positive ? '호재 뉴스' : '악재 뉴스');
  const entry = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    ticker: company.ticker, company: company.name, type: positive ? 'good' : 'bad',
    headline: item[0], detail: item[1], demand: company.customerDemand,
    stockPrice: stocks[company.ticker]?.price || company.price || 0, createdAt: Date.now()
  };
  company.lastNews = entry.headline;
  newsFeed.unshift(entry);
  newsFeed = newsFeed.slice(0, 12);
  news = (positive ? '🟢 호재' : '🔴 악재') + ' · ' + company.name + ': ' + item[0];
  return entry;
}
function simulateCompanyCustomers() {
  let changed = false;
  for (const company of companies) {
    const demand = Math.max(30, Math.min(180, Number(company.customerDemand) || 100));
    const expected = Math.random() < demand / 180 ? 1 : 0;
    const customers = expected && Number(company.inventory) > 0 ? 1 : 0;
    company.lastTurnExpectedCustomers = (company.lastTurnExpectedCustomers || 0) + expected;
    company.lastTurnCustomers = (company.lastTurnCustomers || 0) + customers;
    company.lastTurnSalesRate = company.lastTurnExpectedCustomers
      ? Math.round(company.lastTurnCustomers / company.lastTurnExpectedCustomers * 100) : 0;
    if (customers) {
      const revenue = customers * Number(company.unitPrice || 0);
      company.inventory -= customers;
      company.soldUnits = (company.soldUnits || 0) + customers;
      company.customerCount = (company.customerCount || 0) + customers;
      company.revenue = (company.revenue || 0) + revenue;
      company.operatingProfit = company.revenue - (company.costs || 0);
      const owner = players.get(company.ownerId);
      if (owner) {
        owner.money += revenue;
        owner.earnedTotal = (owner.earnedTotal || 0) + revenue;
      }
      changed = true;
    }
    const salesRate = company.lastTurnSalesRate;
    const stock = stocks[company.ticker];
    if (stock && company.lastTurnExpectedCustomers > 0) {
      if (salesRate < 30) applyImmediateStockMove(company.ticker, -0.001, '실시간 판매율 저조 (' + salesRate + '%)');
      else if (salesRate >= 90) applyImmediateStockMove(company.ticker, 0.001, '실시간 판매 호조 (' + salesRate + '%)');
      else stock.lastReason = '실시간 판매율 ' + salesRate + '%';
      changed = true;
    }
  }
  // A store gets at most one virtual-customer opportunity per minute.
  // Premium equipment gives only a small capped chance bonus; it cannot multiply sales rapidly.
  for (const store of stores) {
    const now = Date.now();
    if (now < Number(store.nextCustomerAt || 0)) continue;
    store.nextCustomerAt = now + 60000;
    store.lastTurnExpectedVisitors = (store.lastTurnExpectedVisitors || 0) + 1;
    const equipmentBonus = Math.min(0.10, Math.max(0, Number(store.customerBoost) || 0) * 0.25);
    const visitChance = Math.min(100, storeCustomerRate * (1 + equipmentBonus));
    if (Math.random() * 100 >= visitChance) continue;
    store.visitorCount = (store.visitorCount || 0) + 1;
    store.lastTurnVisitors = (store.lastTurnVisitors || 0) + 1;
    changed = true;
    const productId = String(store.productId || '');
    const item = store.products?.[productId];
    if (!item || Number(item.stock) <= 0) continue;
    const price = Math.max(0, Math.floor(Number(item.price || store.price) || 0));
    item.stock = Math.max(0, Number(item.stock) - 1);
    if (productId === store.productId) store.stock = item.stock;
    store.customerCount = (store.customerCount || 0) + 1;
    store.soldUnits = (store.soldUnits || 0) + 1;
    store.revenue = (store.revenue || 0) + price;
    store.salesHistory = store.salesHistory || [];
    store.salesHistory.push({ at: Date.now(), amount: price, quantity: 1, source: 'virtualCustomer' });
    if (store.salesHistory.length > 100) store.salesHistory.shift();
    const owner = players.get(store.ownerId);
    if (owner) {
      owner.money += price;
      owner.earnedTotal = (owner.earnedTotal || 0) + price;
    }
  }
  return changed;
}
function playerAssetValue(player) {
  const sharesValue = Object.entries(player.shares || {}).reduce((sum, [ticker, quantity]) => sum + (stocks[ticker]?.price || 0) * Math.max(0, Number(quantity) || 0), 0);
  return Math.round((player.money || 0) + (player.bank || 0) - (player.loan || 0) + sharesValue);
}
function playerResult(player, baseline) {
  const totalAssets = playerAssetValue(player);
  const change = totalAssets - (Number.isFinite(baseline) ? baseline : totalAssets);
  const initial = Number.isFinite(turnState.initialAssets[player.name]) ? turnState.initialAssets[player.name] : totalAssets;
  const sharesValue = Object.entries(player.shares || {}).reduce((sum, [ticker, quantity]) => sum + (stocks[ticker]?.price || 0) * Math.max(0, Number(quantity) || 0), 0);
  return { name: player.name, totalAssets, cash: player.money || 0, bank: player.bank || 0, loan: player.loan || 0, earnedTotal: player.earnedTotal || 0, sharesValue, turnChange: change, turnProfit: Math.max(0, change), turnLoss: Math.max(0, -change), profit: Math.max(0, totalAssets - initial), loss: Math.max(0, initial - totalAssets) };
}
function captureTurnBaseline() {
  turnState.baseline = {};
  for (const player of players.values()) {
    const value = playerAssetValue(player);
    turnState.baseline[player.name] = value;
    if (!Object.prototype.hasOwnProperty.call(turnState.initialAssets, player.name)) turnState.initialAssets[player.name] = value;
  }
}
function beginTurn() {
  captureTurnBaseline();
  turnState.endsAt = Date.now() + turnConfig.durationMinutes * 60 * 1000;
  turnState.remainingMs = null;
}
function finishTurn() {
  if (gameStatus !== 'running') return;
  const endedTurn = turnState.turnNumber;
  updateStockPrices();
  const todayNews = generateCompanyNews();
  companies.forEach(company => { company.lastTurnCustomers = 0; company.lastTurnExpectedCustomers = 0; company.lastTurnSalesRate = 0; });
  stores.forEach(store => { store.lastTurnVisitors = 0; store.lastTurnExpectedVisitors = 0; });
  const results = [...players.values()].map(player => playerResult(player, turnState.baseline[player.name]));
  turnState.summary = { turnNumber: endedTurn, day: marketClock.day, totalTurns: turnConfig.totalTurns, endedAt: Date.now(), news: todayNews, results };
  turnState.turnNumber = endedTurn + 1;
  if (endedTurn >= turnConfig.totalTurns) {
    gameStatus = 'ended'; turnState.endsAt = null; turnState.remainingMs = null;
    setMarketClock(Math.min(endedTurn - 1, 5), '15:30', marketClock.turnMinutes);
    finalAwards = calculateFinalAwards();
  } else {
    setMarketClock(Math.min(endedTurn, 5), '09:00', marketClock.turnMinutes);
    beginTurn();
  }
  broadcast();
}
function calculateFinalAwards() {
  const companyStats = companies.map(company => ({
    ...company,
    marketValue: (stocks[company.ticker]?.price || company.price || 0) * 10,
    score: (stocks[company.ticker]?.price || company.price || 0) * 10 + (company.operatingProfit || 0)
  }));
  const storeStats = stores.map(store => ({
    ...store, revenue: (store.salesHistory || []).reduce((sum, sale) => sum + (Number(sale.amount) || 0), 0),
    employeeCount: (store.employees || []).length
  }));
  const awards = [];
  const best = (rows, score) => rows.slice().sort((a,b)=>score(b)-score(a))[0] || null;
  const ceo = best(companyStats, row => row.score);
  if (ceo) awards.push({ title: '최고의 CEO상', emoji: '👑', winner: ceo.owner, detail: ceo.name + ' · 기업 가치와 영업이익' });
  const bestCompanySales = best(companyStats, row => Number(row.revenue) || 0);
  if (bestCompanySales && bestCompanySales.revenue > 0) awards.push({ title: '기업 매출왕', emoji: '📈', winner: bestCompanySales.owner, detail: bestCompanySales.name + ' · 매출 ' + bestCompanySales.revenue.toLocaleString('ko-KR') + '원' });
  const bestStore = best(storeStats, row => row.revenue);
  if (bestStore && bestStore.revenue > 0) awards.push({ title: '인기 가게상', emoji: '🏪', winner: bestStore.owner, detail: bestStore.name + ' · 매출 ' + bestStore.revenue.toLocaleString('ko-KR') + '원' });
  const employers = [
    ...companyStats.map(row => ({ owner: row.owner, name: row.name, count: (row.employees || []).length })),
    ...storeStats.map(row => ({ owner: row.owner, name: row.name, count: row.employeeCount }))
  ];
  const bestEmployer = best(employers, row => row.count);
  if (bestEmployer && bestEmployer.count > 0) awards.push({ title: '일자리 창출상', emoji: '🤝', winner: bestEmployer.owner, detail: bestEmployer.name + ' · 직원 ' + bestEmployer.count + '명' });
  const studentRows = [...players.values()];
  const donor = best(studentRows, row => Number(row.socialDonated) || 0);
  if (donor && (donor.socialDonated || 0) > 0) awards.push({ title: '나눔 실천상', emoji: '💛', winner: donor.name, detail: '사회공헌 ' + donor.socialDonated.toLocaleString('ko-KR') + '원' });
  const investor = best(studentRows, row => Number(row.realizedStockProfit) || 0);
  if (investor && (investor.realizedStockProfit || 0) > 0) awards.push({ title: '현명한 투자상', emoji: '💹', winner: investor.name, detail: '주식 실현손익 +' + Math.round(investor.realizedStockProfit).toLocaleString('ko-KR') + '원' });
  const saver = best(studentRows, row => Number(row.bank) || 0);
  if (saver && (saver.bank || 0) > 0) awards.push({ title: '저축 습관상', emoji: '🏦', winner: saver.name, detail: '은행 예금 ' + saver.bank.toLocaleString('ko-KR') + '원' });
  const popular = best(companyStats, row => Number(row.customerCount) || 0);
  if (popular && (popular.customerCount || 0) > 0) awards.push({ title: '고객 사랑상', emoji: '❤️', winner: popular.owner, detail: popular.name + ' · 고객 ' + popular.customerCount + '명' });
  return { awards, companies: companyStats, students: studentRows.map(player => playerResult(player, turnState.initialAssets[player.name])), ceo };
}
roomIo.on('connection', socket => {
  socket.on('join', (data, ack) => {
    const reply = (ok, message) => { if (typeof ack === 'function') ack({ok, message}); if (!ok) msg(socket, message); };
    if (!data || data.room !== ROOM) return reply(false, '방 코드가 올바르지 않아요. 선생님이 알려준 최신 코드를 확인해 주세요.');
    const name = safeName(data.name);
    if (!String(data.name || '').trim()) return reply(false, '이름을 입력해 주세요.');
    const saved = [...players.values()].find(v => v.name.toLocaleLowerCase('ko-KR') === name.toLocaleLowerCase('ko-KR'));
    if (saved && saved.connected) return reply(false, '같은 이름의 학생이 이미 접속 중이에요.');
    if (!saved && players.size >= MAX) return reply(false, '등록된 학생이 30명이에요. 선생님께 문의해 주세요.');
    let p;
    if (saved) {
      const oldId = saved.id;
      players.delete(oldId);
      saved.id = socket.id;
      saved.connected = true;
      saved.insideStore = null;
      saved.insideWholesale = false;
      p = saved;
      stores.forEach(st => {
        if (st.ownerId === oldId) st.ownerId = socket.id;
        (st.employees||[]).forEach(employee=>{if(employee.playerId===oldId)employee.playerId=socket.id;});
        (st.employmentApplications||[]).forEach(application=>{if(application.playerId===oldId)application.playerId=socket.id;});
      });
      companies.forEach(company=>{
        if(company.ownerId===oldId)company.ownerId=socket.id;
        (company.employees||[]).forEach(employee=>{if(employee.playerId===oldId)employee.playerId=socket.id;});
        (company.employmentApplications||[]).forEach(application=>{if(application.playerId===oldId)application.playerId=socket.id;});
      });
      if (wholesaleShop && wholesaleShop.ownerId === oldId) wholesaleShop.ownerId = socket.id;
      if (wholesaleShop && wholesaleShop.owner === name) wholesaleShop.ownerId = socket.id;
    } else {
      const seat = randomSeat();
      p = { id: socket.id, name, connected: true, x: seat.x, z: seat.z, jump: false, money: startingMoney, bank: 0, taxPaid: 0, loan:0, earnedTotal:0, socialDonated:0, donations:emptyDonations(), taxRelief:0, job: '무직', employerStoreId: null, inventory: {apple:0,bread:0,toy:0}, companyGoods: {}, shares: {}, shareCostBasis: {}, property: [], company: null, storeId: null, insideStore: null, insideWholesale: false };
    }
    players.set(socket.id, p);
    if (gameStatus === 'running' && !Object.prototype.hasOwnProperty.call(turnState.baseline, p.name)) { const value = playerAssetValue(p); turnState.baseline[p.name] = value; turnState.initialAssets[p.name] ??= value; }
    socket.join(ROOM);
    reply(true, '입장 성공');
    socket.emit('joined', {id: socket.id, resumed: !!saved});
    broadcast();
    roomIo.emit('notice', saved ? `${p.name} 다시 입장! 이전 기록을 불러왔어요.` : `${p.name} 입장!`);
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
  socket.on('enterWholesale',()=>{const p=players.get(socket.id);if(!p)return;if(gameStatus!=='running')return msg(socket,'수업이 시작된 뒤 이용할 수 있어요.');if(Math.hypot(p.x+22,p.z-17)>11)return msg(socket,'도매상 입구까지 걸어와 주세요.');p.insideWholesale=true;p.insideStore=null;p.x=-22;p.z=17;socket.emit('wholesaleEntered');broadcast()});
  socket.on('exitWholesale',()=>{const p=players.get(socket.id);if(!p)return;p.insideWholesale=false;socket.emit('wholesaleExited');broadcast()});
  socket.on('action', a => {
    const p=players.get(socket.id);if(!p||!a)return;
    if(a.type==='employmentApply'){
      const st=stores.find(value=>value.id===String(a.storeId));
      if(gameStatus!=='running')return msg(socket,'수업이 시작된 뒤 일자리에 지원할 수 있어요.');
      if(!st)return msg(socket,'지원할 가게를 찾을 수 없어요.');
      if(st.ownerId===socket.id)return msg(socket,'내 가게에는 지원할 수 없어요.');
      if(p.employerStoreId)return msg(socket,'이미 다른 가게에서 일하고 있어요.');
      st.employmentApplications=st.employmentApplications||[];
      if(st.employmentApplications.some(value=>value.playerId===socket.id)||st.employees?.some(value=>value.playerId===socket.id))return msg(socket,'이미 지원했거나 근무 중이에요.');
      if((st.employees||[]).length>=(MAX_STORE_EMPLOYEES))return msg(socket,'이 가게의 채용 인원이 가득 찼어요.');
      st.employmentApplications.push({playerId:socket.id,name:p.name});
      msg(socket,st.name+'의 포용 고용 일자리에 지원했어요.');
      broadcastEmployment();return;
    }
    if(a.type==='hireEmployee'){
      const st=stores.find(value=>value.id===String(a.storeId));
      if(!st||st.ownerId!==socket.id)return msg(socket,'가게 주인만 지원자를 채용할 수 있어요.');
      if(gameStatus!=='running')return msg(socket,'수업이 시작된 뒤 채용할 수 있어요.');
      st.employees=st.employees||[];st.employmentApplications=st.employmentApplications||[];
      if(st.employees.length>=MAX_STORE_EMPLOYEES)return msg(socket,'직원은 최대 3명까지 채용할 수 있어요.');
      const application=st.employmentApplications.find(value=>value.playerId===String(a.employeeId));
      const employee=players.get(String(a.employeeId));
      const salary=Number(a.salary);
      if(!application||!employee)return msg(socket,'지원자 정보를 확인할 수 없어요.');
      if(employee.employerStoreId||st.employees.some(value=>value.playerId===employee.id))return msg(socket,'지원자가 이미 다른 곳에서 근무 중이에요.');
      if(!Number.isInteger(salary)||salary<1000||salary>100000||salary%1000!==0)return msg(socket,'월급은 1,000원 단위로 1,000~100,000원 사이에서 정해 주세요.');
      st.employees.push({playerId:employee.id,name:employee.name,salary});
      st.employmentApplications=st.employmentApplications.filter(value=>value.playerId!==employee.id);
      employee.employerStoreId=st.id;employee.job='포용 고용 · '+st.name;
      msg(socket,employee.name+' 학생을 월급 '+salary.toLocaleString('ko-KR')+'원으로 채용했어요.');
      roomIo.to(employee.id).emit('notice',st.name+'에 채용됐어요. 월급을 확인해 주세요.');
      broadcastEmployment();return;
    }
    if(a.type==='setEmployeeSalary'){
      const st=stores.find(value=>value.id===String(a.storeId));
      if(!st||st.ownerId!==socket.id)return msg(socket,'가게 주인만 직원 월급을 정할 수 있어요.');
      const employee=(st.employees||[]).find(value=>value.playerId===String(a.employeeId));
      const salary=Number(a.salary);
      if(!employee)return msg(socket,'직원 정보를 확인할 수 없어요.');
      if(!Number.isInteger(salary)||salary<1000||salary>100000||salary%1000!==0)return msg(socket,'월급은 1,000원 단위로 1,000~100,000원 사이에서 정해 주세요.');
      employee.salary=salary;
      msg(socket,employee.name+' 학생의 월급을 '+salary.toLocaleString('ko-KR')+'원으로 변경했어요.');
      broadcastEmployment();return;
    }
    if(a.type==='removeEmployee'){
      const st=stores.find(value=>value.id===String(a.storeId));
      if(!st||st.ownerId!==socket.id)return msg(socket,'가게 주인만 직원을 내보낼 수 있어요.');
      const [employee]= (st.employees||[]).filter(value=>value.playerId===String(a.employeeId));
      if(!employee)return msg(socket,'직원 정보를 확인할 수 없어요.');
      st.employees=st.employees.filter(value=>value.playerId!==employee.playerId);
      const employeePlayer=players.get(employee.playerId);
      if(employeePlayer){employeePlayer.employerStoreId=null;employeePlayer.job='무직';}
      msg(socket,employee.name+' 학생의 근무를 종료했어요.');
      broadcastEmployment();return;
    }
    if(a.type==='payroll'){
      const st=stores.find(value=>value.id===String(a.storeId));
      if(!st||st.ownerId!==socket.id)return msg(socket,'가게 주인만 월급을 지급할 수 있어요.');
      if(gameStatus!=='running')return msg(socket,'수업이 시작된 뒤 월급을 지급할 수 있어요.');
      if(!st.employees?.length)return msg(socket,'월급을 지급할 직원이 없어요.');
      if(st.payrollMonth===monthlyPeriod())return msg(socket,'이번 달 월급은 이미 지급했어요.');
      const total=st.employees.reduce((sum,value)=>sum+value.salary,0);
      if(p.money<total)return msg(socket,'월급 지급액 '+total.toLocaleString('ko-KR')+'원이 필요해요. 현재 현금은 '+p.money.toLocaleString('ko-KR')+'원이에요.');
      p.money-=total;
      st.employees.forEach(value=>{
        const employee=players.get(value.playerId);
        if(employee){employee.money+=value.salary;employee.earnedTotal=(employee.earnedTotal||0)+value.salary;}
      });
      st.payrollMonth=monthlyPeriod();
      msg(socket,'이번 달 월급 '+total.toLocaleString('ko-KR')+'원을 직원 '+st.employees.length+'명에게 지급했어요.');
      broadcastEmployment();return;
    }
    if(a.type==='createStore'){
      if(gameStatus==='paused'||gameStatus==='ended')return msg(socket,'지금은 가게를 만들 수 없어요.');
      if(!shopsEnabled)return msg(socket,'선생님이 가게 만들기를 잠시 꺼 두셨어요.');
      const storeName=String(a.name||'').trim().slice(0,16), sign=String(a.sign||storeName).trim().slice(0,20), food=String(a.food||'bread'), product=foodProducts[String(a.productId||'')];
      const equipmentOptions=STORE_EQUIPMENT[food]||[];
      const equipment=(Array.isArray(a.equipment)?a.equipment:[]).map(value=>String(value));
      const selectedEquipment=equipmentOptions.map(category=>{const option=category.options.find(item=>item.id===equipment.find(id=>category.options.some(candidate=>candidate.id===id)))||category.options[0];return {category:category.id,label:category.label,id:option.id,name:option.name,cost:option.cost,boost:option.boost};});
      const equipmentCost=selectedEquipment.reduce((sum,item)=>sum+item.cost,0);
      const customerBoost=selectedEquipment.reduce((sum,item)=>sum+item.boost,0);
      if(p.storeId)return msg(socket,'이미 가게를 운영하고 있어요.');
      if(p.company)return msg(socket,'회사 또는 다른 사업을 창업한 학생은 추가로 가게를 만들 수 없어요.');
      if(wholesaleShop&&wholesaleShop.ownerId===socket.id)return msg(socket,'이미 도매상을 운영하고 있어요. 가게와 도매상 중 하나만 운영할 수 있어요.');
      if(!foods[food]||!product||product.category!==food)return msg(socket,'선택한 업종에 맞는 음식을 골라 주세요.');
      if(p.money<storeFee+equipmentCost)return msg(socket,'가게 개설비와 설비 구매비로 '+(storeFee+equipmentCost).toLocaleString('ko-KR')+'원이 필요해요.');
      const index=stores.length, slot=index<15?{x:-16-7.5*index,z:-15,face:1}:index<30?{x:-33-7.5*(index-15),z:15,face:-1}:{x:-16-7.5*((index-30)%15),z:-25,face:1}, x=slot.x, z=slot.z, face=slot.face;
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
      const pixelArtProductId=String(a.pixelArtProductId||'')===String(a.productId)?String(a.productId):null;
      const st={id:'store-'+socket.id+'-'+Date.now(),ownerId:socket.id,owner:p.name,name:storeName,sign,food,productId:String(a.productId),productName:product.name,pixelArt:pixels,pixelArtProductId,price:20,stock:10,products:{[String(a.productId)]:{stock:10,price:20,ingredients:0}},employees:[],employmentApplications:[],payrollMonth:null,setupCost:storeFee+equipmentCost,totalCosts:storeFee+equipmentCost,equipment:selectedEquipment,customerBoost,createdAt:Date.now(),nextCustomerAt:Date.now(),salesHistory:[],visitorCount:0,lastTurnVisitors:0,lastTurnExpectedVisitors:0,customerCount:0,soldUnits:0,revenue:0,color,wallColor,signColor,signStyle,awningStyle,decor,x,z,face};
      p.money-=storeFee+equipmentCost;p.storeId=st.id;st.price=retailPrices[st.productId]||3500;st.products[st.productId].price=st.price;stores.push(st);
      socket.emit('storeCreated',{ok:true,store:st,money:p.money});
      msg(socket,'🏪 가게 개설 성공! '+storeName+' · '+product.name+' 10개 준비 · 잔액 '+p.money+'원');
      broadcast();return;
    }
    if(a.type==='createWholesale'){
       if(gameStatus==='paused'||gameStatus==='ended')return msg(socket,'지금은 도매상을 창업할 수 없어요.');
       if(wholesaleShop)return msg(socket,'이미 도매상이 운영 중이에요.');
        if(p.storeId)return msg(socket,'이미 가게를 운영하고 있어요. 가게와 도매상 중 하나만 운영할 수 있어요.');
       if(p.company)return msg(socket,'이미 다른 사업을 운영하고 있어요. 한 학생은 한 가지 사업만 선택할 수 있어요.');
       const name=String(a.name||'').trim().slice(0,16);if(!name)return msg(socket,'도매상 이름을 입력해 주세요.');
       const fee=80000;if(p.money<fee)return msg(socket,'도매상 창업에는 80,000원이 필요해요.');
       const inventory={};Object.keys(foodProducts).forEach(id=>{const cost=ingredientCosts[id]||1000;inventory[id]={stock:0,cost,price:Math.ceil(cost*1.3/100)*100};});
       p.money-=fee;wholesaleShop={id:'wholesale-'+socket.id+'-'+Date.now(),ownerId:socket.id,owner:p.name,name,inventory,x:-22,z:17};
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
       if(!p.insideWholesale||Math.hypot(p.x+22,p.z-17)>11)return msg(socket,'도매상 안에서 결제해 주세요.');
       if(!wholesaleShop)return msg(socket,'아직 운영 중인 도매상이 없어요.');
       if(wholesaleShop.ownerId===socket.id)return msg(socket,'내 도매상에서는 직접 구매할 수 없어요.');
       const st=stores.find(v=>v.ownerId===socket.id);if(!st)return msg(socket,'재료를 구매하려면 먼저 식품 가게를 만들어 주세요.');
       if(!Array.isArray(a.items)||!a.items.length||a.items.length>15)return msg(socket,'장바구니 상품을 확인해 주세요.');
       const lines=[];let total=0;
       for(const row of a.items){const id=String(row?.productId||''),qty=Number(row?.amount),product=foodProducts[id],item=wholesaleShop.inventory[id];if(!product||product.category!==st.food||!item||!Number.isInteger(qty)||qty<1||qty>99)return msg(socket,'상품 또는 수량을 다시 확인해 주세요.');if(item.stock<qty)return msg(socket,product.name+' 재고가 부족해요. 현재 '+item.stock+'개 있어요.');lines.push({productId:id,name:product.name,quantity:qty,unitPrice:item.price,subtotal:item.price*qty});total+=item.price*qty;}
       if(p.money<total)return msg(socket,'결제 금액이 부족해요. '+total.toLocaleString('ko-KR')+'원 필요 · 보유 '+p.money.toLocaleString('ko-KR')+'원');
       lines.forEach(line=>{wholesaleShop.inventory[line.productId].stock-=line.quantity;st.products=st.products||{};st.products[line.productId]=st.products[line.productId]||{stock:0,price:retailPrices[line.productId]||3500,ingredients:0};st.products[line.productId].ingredients=(st.products[line.productId].ingredients||0)+line.quantity;});
       p.money-=total;st.totalCosts=(st.totalCosts||st.setupCost||0)+total;st.purchaseHistory=st.purchaseHistory||[];st.purchaseHistory.push({at:Date.now(),amount:total,items:lines.map(line=>({productId:line.productId,quantity:line.quantity}))});const seller=players.get(wholesaleShop.ownerId);if(seller){seller.money+=total;seller.earnedTotal=(seller.earnedTotal||0)+total;}
       socket.emit('receiptIssued',{receiptNo:'PT-'+Date.now().toString().slice(-8),date:new Date().toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}),seller:wholesaleShop.name,buyer:p.name,lines,total,payment:'현금',balance:p.money});
       msg(socket,'🧾 결제 완료! '+total.toLocaleString('ko-KR')+'원 · 영수증을 발급했어요.');broadcast();return;
     }
     if(a.type==='wholesaleBuy')return msg(socket,'새 장바구니 결제 기능을 이용해 주세요.');
      if(a.type==='cook'){
      const st=stores.find(v=>v.ownerId===socket.id);if(!st)return msg(socket,'내 가게 주방에서만 요리할 수 있어요.');
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
      p.money-=cost;item.stock-=qty;if(productId===st.productId)st.stock=item.stock;st.salesHistory=st.salesHistory||[];st.salesHistory.push({at:Date.now(),amount:cost});if(st.salesHistory.length>30)st.salesHistory.shift();const owner=players.get(st.ownerId);if(owner){owner.money+=cost;owner.earnedTotal=(owner.earnedTotal||0)+cost;}msg(socket,'🛍️ '+product.name+' '+qty+'개 구매 성공! -'+cost.toLocaleString('ko-KR')+'원 · 잔액 '+p.money.toLocaleString('ko-KR')+'원 · 남은 재고 '+item.stock+'개');socket.emit('storePurchaseResult',{store:st});socket.emit('receiptIssued',{receiptNo:'PT-'+Date.now().toString().slice(-8),date:new Date().toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}),seller:st.name,buyer:p.name,lines:[{productId,name:product.name,quantity:qty,unitPrice:item.price,subtotal:cost}],total:cost,payment:'현금',balance:p.money});
    }
        else if(a.type==='storeRestock'){
      const st=stores.find(v=>v.id===String(a.storeId));
      if(!st||st.ownerId!==p.id)return msg(socket,'내 가게에서만 재고를 채울 수 있어요.');
      const cost=5000;if(p.money<cost)return msg(socket,'재고 5개 준비에는 5,000원이 필요해요.');
      p.money-=cost;st.totalCosts=(st.totalCosts||st.setupCost||0)+cost;st.stock+=5;msg(socket,'📦 재고 보충! '+foods[st.food].name+' 5개 추가 · 잔액 '+p.money+'원');
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
    else if(a.type==='loan'){const v=Number(a.amount);if(!Number.isInteger(v)||v<10000||v>100000||v%10000!==0)return msg(socket,'대출은 10,000원 단위로 10,000~100,000원까지 신청할 수 있어요.');if((p.loan||0)+v>200000)return msg(socket,'대출 한도는 총 200,000원이에요.');p.loan=(p.loan||0)+v;p.money+=v;msg(socket,`🏦 대출 완료! ${v.toLocaleString('ko-KR')}원 · 갚을 돈 ${p.loan.toLocaleString('ko-KR')}원`);}
    else if(a.type==='repayLoan'){const v=Number(a.amount);if(!Number.isInteger(v)||v<1000||v>200000)return msg(socket,'상환 금액을 확인해 주세요.');const pay=Math.min(v,p.loan||0);if(!pay)return msg(socket,'갚을 대출금이 없어요.');if(p.money<pay)return msg(socket,'현금이 부족해요.');p.money-=pay;p.loan-=pay;msg(socket,`🏦 대출 상환! ${pay.toLocaleString('ko-KR')}원 · 남은 빚 ${p.loan.toLocaleString('ko-KR')}원`);}
    else if(a.type==='donate'){const v=Number(a.amount),cause=DONATION_CAUSES.includes(a.cause)?a.cause:'community';if(!Number.isInteger(v)||v<1000||v>100000)return msg(socket,'기부는 1,000~100,000원 사이로 입력해 주세요.');if(p.money<v)return msg(socket,'기부할 현금이 부족해요.');p.money-=v;p.socialDonated=(p.socialDonated||0)+v;p.donations||=emptyDonations();p.donations[cause]=(p.donations[cause]||0)+v;const relief=Math.floor(v*.1);p.taxRelief=(p.taxRelief||0)+relief;const causeName={community:'지역사회',disability:'장애인 지원',seniors:'어르신 지원',inclusiveEmployment:'장애인 고용 지원'}[cause];msg(socket,`💛 ${causeName}에 ${v.toLocaleString('ko-KR')}원 기부 · 앞으로 낼 세금 ${relief.toLocaleString('ko-KR')}원 감면권 획득`);}
    else if(a.type==='stockBuy'){const st=stocks[item];if(!st)return msg(socket,'❌ 해당 주식을 찾을 수 없어요.');if(!marketClock.marketOpen)return msg(socket,'주식 시장은 월~토 09:00~15:30에 열려요. 선생님이 거래 시간을 조정해 주세요.');const cost=st.price*n;if(p.money<cost)return msg(socket,`❌ 매수 실패: 돈이 부족해요. 필요 ${cost}원 · 보유 ${p.money}원`);p.money-=cost;p.shareCostBasis ||= {};p.shareCostBasis[item]=(p.shareCostBasis[item]||0)+cost;p.shares[item]=(p.shares[item]||0)+n;stockOrders[item] ||= { buys: 0, sells: 0 };stockOrders[item].buys += n;applyImmediateStockMove(item,Math.min(.02,.005*n),'실시간 매수세 반영');msg(socket,`📈 매수 성공! ${st.name} ${n}주 · 총 ${cost}원 · 보유 ${p.shares[item]}주 · 잔액 ${p.money}원`);}
    else if(a.type==='stockSell'){const st=stocks[item];if(!st)return msg(socket,'❌ 해당 주식을 찾을 수 없어요.');if(!marketClock.marketOpen)return msg(socket,'주식 시장은 월~토 09:00~15:30에 열려요. 선생님이 거래 시간을 조정해 주세요.');if((p.shares[item]||0)<n)return msg(socket,`📉 매도 실패: 보유 주식이 부족해요. 현재 ${p.shares[item]||0}주`);const held=p.shares[item]||0,averageCost=(p.shareCostBasis?.[item]||0)/Math.max(1,held),realized=(st.price-averageCost)*n;p.shareCostBasis ||= {};p.shareCostBasis[item]=Math.max(0,(p.shareCostBasis[item]||0)-averageCost*n);p.shares[item]-=n;stockOrders[item] ||= { buys: 0, sells: 0 };stockOrders[item].sells += n;applyImmediateStockMove(item,-Math.min(.02,.005*n),'실시간 매도세 반영');const paid=credit(p,st.price*n);p.realizedStockProfit=(p.realizedStockProfit||0)+realized;msg(socket,`📉 매도 성공! ${st.name} ${n}주 · 세금 ${paid.tax}원 · 받은 돈 ${paid.net}원 · 남은 주식 ${p.shares[item]}주`);}
    else if(a.type==='property'){const q=properties.find(x=>x.id===item);if(!q||q.owner||p.money<q.price)return msg(socket,'❌ 구매 실패: 이미 주인이 있거나 돈이 부족해요.');p.money-=q.price;q.owner=p.name;p.property.push(q.id);msg(socket,`🏠 구매 성공! ${q.name} 소유 · 잔액 ${p.money}원`);}
    else if(a.type==='startup'){const companyName=safeName(a.item);if(p.company)return msg(socket,'이미 창업한 회사가 있어요.');if(p.storeId||(wholesaleShop&&wholesaleShop.ownerId===socket.id))return msg(socket,'이미 다른 사업을 운영하고 있어요. 한 학생은 한 가지 사업만 선택할 수 있어요.');if(companyName==='학생'||p.money<100000)return msg(socket,'회사 이름을 입력하고 창업 비용 100,000원을 준비해 주세요.');const ticker='CO'+String(companies.length+1).padStart(2,'0');p.money-=100000;p.company=ticker;p.shares[ticker]=10;p.shareCostBasis ||= {};p.shareCostBasis[ticker]=0;stocks[ticker]={name:companyName,price:10000,owner:p.name};stockHistory[ticker]=[10000];companies.push({ticker,name:companyName,owner:p.name,price:10000});msg(socket,`🏭 창업 성공! ${companyName} · 주식 10주 지급 · 잔액 ${p.money}원`);}
    else if(a.type==='transfer'){const target=[...players.values()].find(x=>x.name===safeName(item)&&x.id!==p.id);const v=bounded(a.amount,1,1000000);if(!target||p.money<v)return msg(socket,'친구 이름이나 금액을 확인해 주세요.');p.money-=v;target.money+=v;msg(socket,`송금 성공! ${target.name}에게 ${v}원 · 잔액 ${p.money}원`);}
    else return;
    broadcast();
  });
  socket.on('action', a => {
    const player = players.get(socket.id);
    if (!player || !a) return;
    if (a.type === 'createCompany') {
      const companyName = safeName(a.item);
      const sector = String(a.sector || '');
      const product = COMPANY_PRODUCTS[sector];
      if (gameStatus !== 'running') return msg(socket, '수업을 시작한 뒤 회사를 창업할 수 있어요.');
      if (!product) return msg(socket, '회사 제품 분야를 선택해 주세요.');
      if (player.company || player.storeId || (wholesaleShop && wholesaleShop.ownerId === socket.id)) return msg(socket, '한 학생은 사업 하나만 운영할 수 있어요.');
      if (companyName === '학생') return msg(socket, '회사 이름을 입력해 주세요.');
      if (player.money < 100000) return msg(socket, '회사 창업에는 현금 100,000원이 필요해요.');
      const ticker = 'CO' + String(companies.length + 1).padStart(2, '0');
      player.money -= 100000;
      player.company = ticker;
      player.shares[ticker] = 10;
      player.shareCostBasis ||= {}; player.shareCostBasis[ticker] = 0;
      stocks[ticker] = { name: companyName, price: 10000, owner: player.name, sector };
      stockHistory[ticker] = [10000];
      stockOrders[ticker] = { buys: 0, sells: 0 };
      companies.push({ ticker, name: companyName, owner: player.name, ownerId: socket.id, sector, sectorName: product.name, productId: product.productId, productName: product.productName, unitCost: product.unitCost, unitPrice: product.unitPrice, inventory: 0, producedUnits: 0, soldUnits: 0, revenue: 0, costs: 0, operatingProfit: 0, price: 10000, customerDemand: 100, customerCount: 0, lastTurnCustomers: 0, lastNews: '', employees: [], employmentApplications: [], payrollMonth: null });
      msg(socket, `🏭 ${product.name} 회사 ${companyName} 창업 성공! 주식 10주 지급 · 잔액 ${player.money.toLocaleString('ko-KR')}원`);
      broadcast();
      return;
    }
    if (a.type === 'companyEmploymentApply') {
      const company = companies.find(value => value.ticker === String(a.ticker || ''));
      if (gameStatus !== 'running') return msg(socket, '수업을 시작한 뒤 회사 일자리에 지원할 수 있어요.');
      if (!company) return msg(socket, '지원할 회사를 찾을 수 없어요.');
      if (company.ownerId === socket.id) return msg(socket, '내 회사에는 지원할 수 없어요.');
      if (player.employerStoreId) return msg(socket, '이미 다른 사업장에서 일하고 있어요.');
      company.employees ||= [];
      company.employmentApplications ||= [];
      if (company.employmentApplications.some(value => value.playerId === socket.id) || company.employees.some(value => value.playerId === socket.id)) return msg(socket, '이미 지원했거나 근무 중이에요.');
      if (company.employees.length >= MAX_STORE_EMPLOYEES) return msg(socket, '이 회사의 채용 인원이 가득 찼어요.');
      company.employmentApplications.push({ playerId: socket.id, name: player.name });
      msg(socket, company.name + '의 회사 일자리에 지원했어요.');
      broadcastEmployment();
      return;
    }
    if (a.type === 'companyHireEmployee') {
      const company = companies.find(value => value.ticker === String(a.ticker || ''));
      if (!company || company.ownerId !== socket.id) return msg(socket, '회사 대표만 지원자를 채용할 수 있어요.');
      if (gameStatus !== 'running') return msg(socket, '수업을 시작한 뒤 채용할 수 있어요.');
      company.employees ||= [];
      company.employmentApplications ||= [];
      if (company.employees.length >= MAX_STORE_EMPLOYEES) return msg(socket, '직원은 최대 3명까지 채용할 수 있어요.');
      const application = company.employmentApplications.find(value => value.playerId === String(a.employeeId));
      const employee = players.get(String(a.employeeId));
      const salary = Number(a.salary);
      if (!application || !employee) return msg(socket, '지원자 정보를 확인할 수 없어요.');
      if (employee.employerStoreId || company.employees.some(value => value.playerId === employee.id)) return msg(socket, '지원자가 이미 다른 곳에서 근무 중이에요.');
      if (!Number.isInteger(salary) || salary < 1000 || salary > 100000 || salary % 1000 !== 0) return msg(socket, '월급은 1,000원 단위로 1,000~100,000원 사이에서 정해 주세요.');
      company.employees.push({ playerId: employee.id, name: employee.name, salary });
      company.employmentApplications = company.employmentApplications.filter(value => value.playerId !== employee.id);
      employee.employerStoreId = 'company-' + company.ticker;
      employee.job = '회사 직원 · ' + company.name;
      msg(socket, employee.name + ' 학생을 월급 ' + salary.toLocaleString('ko-KR') + '원으로 채용했어요.');
      roomIo.to(employee.id).emit('notice', company.name + '에 채용됐어요. 월급을 확인해 주세요.');
      broadcastEmployment();
      return;
    }
    if (a.type === 'setCompanyEmployeeSalary') {
      const company = companies.find(value => value.ticker === String(a.ticker || ''));
      if (!company || company.ownerId !== socket.id) return msg(socket, '회사 대표만 직원 월급을 정할 수 있어요.');
      const employee = (company.employees || []).find(value => value.playerId === String(a.employeeId));
      const salary = Number(a.salary);
      if (!employee) return msg(socket, '직원 정보를 확인할 수 없어요.');
      if (!Number.isInteger(salary) || salary < 1000 || salary > 100000 || salary % 1000 !== 0) return msg(socket, '월급은 1,000원 단위로 1,000~100,000원 사이에서 정해 주세요.');
      employee.salary = salary;
      msg(socket, employee.name + ' 학생의 월급을 ' + salary.toLocaleString('ko-KR') + '원으로 변경했어요.');
      broadcastEmployment();
      return;
    }
    if (a.type === 'removeCompanyEmployee') {
      const company = companies.find(value => value.ticker === String(a.ticker || ''));
      if (!company || company.ownerId !== socket.id) return msg(socket, '회사 대표만 직원을 내보낼 수 있어요.');
      const [employee] = (company.employees || []).filter(value => value.playerId === String(a.employeeId));
      if (!employee) return msg(socket, '직원 정보를 확인할 수 없어요.');
      company.employees = company.employees.filter(value => value.playerId !== employee.playerId);
      const employeePlayer = players.get(employee.playerId);
      if (employeePlayer) {
        employeePlayer.employerStoreId = null;
        employeePlayer.job = '무직';
      }
      msg(socket, employee.name + ' 학생의 회사 근무를 종료했어요.');
      broadcastEmployment();
      return;
    }
    if (a.type === 'companyPayroll') {
      const company = companies.find(value => value.ticker === String(a.ticker || ''));
      if (!company || company.ownerId !== socket.id) return msg(socket, '회사 대표만 월급을 지급할 수 있어요.');
      const employees = company.employees || [];
      if (!employees.length) return msg(socket, '월급을 지급할 직원이 없어요.');
      if (company.payrollMonth === monthlyPeriod()) return msg(socket, '이번 달 회사 월급은 이미 지급했어요.');
      const total = employees.reduce((sum, employee) => sum + employee.salary, 0);
      if (player.money < total) return msg(socket, '직원 월급 지급에 필요한 현금이 부족해요.');
      player.money -= total;
      employees.forEach(value => {
        const employee = players.get(value.playerId);
        if (employee) {
          employee.money += value.salary;
          employee.earnedTotal = (employee.earnedTotal || 0) + value.salary;
        }
      });
      company.payrollMonth = monthlyPeriod();
      msg(socket, '회사 월급 ' + total.toLocaleString('ko-KR') + '원을 직원 ' + employees.length + '명에게 지급했어요.');
      broadcastEmployment();
      return;
    }
    if (a.type === 'startup') {
      const company = companies.find(value => value.ticker === player.company);
      if (!company) return;
      const product = COMPANY_PRODUCTS[String(a.sector || 'electronics')] || COMPANY_PRODUCTS.electronics;
      Object.assign(company, {
        ownerId: socket.id,
        sector: String(a.sector || 'electronics') in COMPANY_PRODUCTS ? String(a.sector) : 'electronics',
        sectorName: product.name,
        productId: product.productId,
        productName: product.productName,
        unitCost: product.unitCost,
        unitPrice: product.unitPrice,
        inventory: 0,
        producedUnits: 0,
        soldUnits: 0,
        revenue: 0,
        costs: 0,
        operatingProfit: 0
      });
      stocks[company.ticker].sector = company.sector;
      stockOrders[company.ticker] = { buys: 0, sells: 0 };
      broadcast();
      return;
    }
    if (a.type === 'produceCompanyGoods') {
      const company = companies.find(value => value.ticker === player.company);
      const quantity = Number(a.amount);
      if (gameStatus !== 'running') return msg(socket, '수업을 시작한 뒤 제품을 생산할 수 있어요.');
      if (!company || company.ownerId !== socket.id) return msg(socket, '회사 대표만 제품을 생산할 수 있어요.');
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) return msg(socket, '생산 수량은 1~10개로 입력해 주세요.');
      const cost = company.unitCost * quantity;
      if (player.money < cost) return msg(socket, `생산 비용 ${cost.toLocaleString('ko-KR')}원이 필요해요.`);
      player.money -= cost;
      company.costs += cost;
      company.inventory += quantity;
      company.producedUnits += quantity;
      msg(socket, `${company.productName} ${quantity}개 생산 · 생산비 ${cost.toLocaleString('ko-KR')}원`);
      broadcast();
      return;
    }
    if (a.type === 'buyCompanyGoods') {
      const company = companies.find(value => value.ticker === String(a.ticker || ''));
      const quantity = Number(a.amount);
      if (gameStatus !== 'running') return msg(socket, '수업을 시작한 뒤 제품을 구매할 수 있어요.');
      if (!company) return msg(socket, '구매할 회사 제품을 찾을 수 없어요.');
      if (company.ownerId === socket.id) return msg(socket, '내 회사 제품은 구매할 수 없어요.');
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5) return msg(socket, '구매 수량은 1~5개로 입력해 주세요.');
      if (company.inventory < quantity) return msg(socket, '회사 재고가 부족해요.');
      const total = company.unitPrice * quantity;
      if (player.money < total) return msg(socket, `구매에는 ${total.toLocaleString('ko-KR')}원이 필요해요.`);
      const owner = players.get(company.ownerId);
      if (!owner) return msg(socket, '회사 대표가 현재 교실에 없어요.');
      player.money -= total;
      owner.money += total;
      owner.earnedTotal = (owner.earnedTotal || 0) + total;
      company.inventory -= quantity;
      company.soldUnits += quantity;
      company.revenue += total;
      company.operatingProfit = company.revenue - company.costs;
      player.companyGoods ||= {};
      player.companyGoods[company.productId] = (player.companyGoods[company.productId] || 0) + quantity;
      msg(socket, `${company.productName} ${quantity}개 구매 완료 · ${total.toLocaleString('ko-KR')}원`);
      broadcast();
    }
  });
  socket.on('sync',()=>socket.emit('state',snapshot()));
  socket.on('teacherLogin', (pin, ack) => { if(String(pin)!==TEACHER_PIN){if(typeof ack==='function')ack({ok:false,message:'교사 PIN이 틀렸어요. Render의 TEACHER_PIN 설정을 확인해 주세요.'});return msg(socket,'교사 PIN이 틀렸어요.');}socket.join(ROOM);if(typeof ack==='function')ack({ok:true});socket.emit('teacherOK',{...snapshot(),roomCode:ROOM}); });
  socket.on('teacherCommand', (c, ack) => {
    if(!c||String(c.pin)!==TEACHER_PIN){if(typeof ack==='function')ack({ok:false,type:c?.type||'',message:'교사 인증이 만료됐어요.'});return;}
    console.log('[PIXEL TOWN] teacherCommand received:',c.type,JSON.stringify(c.value));

    if(c.type==='rotateRoom') {
      const previousRoom = ROOM;
      let nextRoom;
      do { nextRoom = String(Math.floor(1000 + Math.random() * 9000)); } while (roomCodeMap.has(nextRoom));
      ROOM = nextRoom;
      roomCodeMap.delete(previousRoom);
      roomCodeMap.set(ROOM, roomIo);
      socket.emit('roomCodeUpdated', { roomCode: ROOM });
      broadcast();
      console.log('[PIXEL TOWN] Classroom room code changed: ' + previousRoom + ' -> ' + ROOM);
    }
    if(c.type==='shops')shopsEnabled=!!c.value;
    if(c.type==='storeCustomerRate')storeCustomerRate=bounded(c.value,0,100);
    if(c.type==='marketTime'){
      if(!setMarketClock(Number(c.value?.dayIndex),String(c.value?.time||''),Number(c.value?.turnMinutes)))msg(socket,'요일·시각 또는 한 턴 가상 시각을 확인해 주세요.');
    }
    let commandResult={ok:true,type:c.type};
    if(c.type==='turnSettings'){
      const duration=Number(c.value?.durationMinutes),total=Number(c.value?.totalTurns);
      if(!Number.isInteger(duration)||duration<1||duration>60||!Number.isInteger(total)||total<1||total>6){
        commandResult={ok:false,type:c.type,message:'한 턴은 1~60분, 전체 턴은 1~6일로 설정해 주세요.'};
        msg(socket,commandResult.message);
      } else {
        turnConfig.durationMinutes=duration;turnConfig.totalTurns=total;
        if(gameStatus==='running')turnState.endsAt=Date.now()+duration*60000;
        else if(gameStatus==='paused')turnState.remainingMs=duration*60000;
        commandResult={ok:true,type:c.type,turnConfig:{...turnConfig},turnState:{...turnState}};
        console.log('[PIXEL TOWN] turnSettings saved:',JSON.stringify(commandResult));
      }
    }
    if(c.type==='advanceMarket'){
      if(gameStatus!=='running')msg(socket,'수업을 시작한 뒤 거래 시점을 진행할 수 있어요.');
      else if(advanceMarket())msg(socket,gameStatus==='ended'?`🏁 토요일 장 마감! ${marketClock.time} · 주가를 확정하고 최고의 CEO상을 선정했어요.`:`📈 ${marketClock.day} ${marketClock.time} 거래 완료 · 매수·매도와 기업 실적을 반영했어요.`);
      else msg(socket,`🕘 ${marketClock.day} ${marketClock.time} · 장이 열리지 않아 시각만 진행했어요.`);
    }
    if(c.type==='clearStores'){stores.forEach(st=>(st.employees||[]).forEach(employee=>{const player=players.get(employee.playerId);if(player){player.employerStoreId=null;player.job='무직';}}));stores.splice(0,stores.length);players.forEach(p=>p.storeId=null);}
    if(c.type==='giveMoney'||c.type==='takeMoney'){const target=players.get(String(c.value?.id||''));const amount=bounded(c.value?.amount,1000,500000);if(target)target.money=Math.max(0,target.money+(c.type==='giveMoney'?amount:-amount));}
    if(c.type==='removeStudent'){const targetId=String(c.value?.id||'');const targetSocket=roomIo.sockets.get(targetId);if(targetSocket)targetSocket.disconnect(true);}
    if(c.type==='shopPrice'){const price=bounded(c.value,500,50000);stores.forEach(st=>{st.price=price;st.products[st.productId].price=price;});}
    if(c.type==='startingMoney'){startingMoney=bounded(c.value,0,5000000);players.forEach(p=>p.money=startingMoney);}
    if(c.type==='storeFee'){storeFee=bounded(c.value,0,500000);}
    if(c.type==='resetEconomy'){newsFeed=[];news='마을 경제가 시작됐어요!';players.forEach(p=>{p.money=200000;p.bank=0;p.taxPaid=0;p.loan=0;p.earnedTotal=0;p.socialDonated=0;p.donations=emptyDonations();p.taxRelief=0;p.inventory={apple:0,bread:0,toy:0};p.shares={};p.company=null;p.storeId=null;p.employerStoreId=null;p.job='무직';p.insideStore=null;p.insideWholesale=false;});stores.splice(0,stores.length);wholesaleShop=null;for(const ticker of Object.keys(stocks)){delete stocks[ticker];delete stockHistory[ticker];delete stockOrders[ticker];}companies.splice(0,companies.length);taxRate=.05;shopsEnabled=true;startingMoney=200000;storeFee=30000;}
    if(c.type==='news')news=String(c.value||'').slice(0,100);
    if(c.type==='bonus'){const v=bounded(c.value,0,1000000);players.forEach(p=>p.money+=v);}
    if(c.type==='tax')taxRate=Math.max(0,Math.min(.5,Number(c.value)||0));
    if(c.type==='start' && (gameStatus==='waiting'||gameStatus==='paused'||gameStatus==='ended')){const restarting=gameStatus==='ended';gameStatus='running';finalAwards=null;newsFeed=[];news='마을 경제가 시작됐어요!';setMarketClock(0,'09:00',marketClock.turnMinutes);turnState.turnNumber=1;turnState.summary=null;turnState.initialAssets={};beginTurn();}
    if(c.type==='pause' && gameStatus==='running'){turnState.remainingMs=Math.max(0,(turnState.endsAt||Date.now())-Date.now());turnState.endsAt=null;gameStatus='paused';}
    if(c.type==='resume' && gameStatus==='paused'){gameStatus='running';turnState.endsAt=Date.now()+(turnState.remainingMs??turnConfig.durationMinutes*60000);turnState.remainingMs=null;}
    if(c.type==='end'){gameStatus='ended';turnState.endsAt=null;turnState.remainingMs=null;finalAwards=calculateFinalAwards();}
    if(c.type==='reset'){gameStatus='waiting';turnState.endsAt=null;turnState.remainingMs=null;turnState.turnNumber=1;turnState.summary=null;turnState.baseline={};turnState.initialAssets={};finalAwards=null;}
    if(c.type==='resetEconomy'){
      setMarketClock(0,'09:00',30);finalAwards=null;turnState.turnNumber=1;turnState.endsAt=null;turnState.remainingMs=null;turnState.summary=null;turnState.baseline={};turnState.initialAssets={};
      players.forEach(player=>{player.companyGoods={};player.shareCostBasis={};player.realizedStockProfit=0;});
    }
    if(c.type==='randomize'){
      const cells=[];for(let x=-24;x<=24;x+=4)for(let z=-6;z<=6;z+=3)cells.push({x,z});
      for(let i=cells.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
      [...players.values()].forEach((p,i)=>{p.x=cells[i%cells.length].x;p.z=cells[i%cells.length].z;p.jump=false;});
    }
    if(c.type==='price'){const item=String(c.item||'');const v=bounded(c.value,1,500);if(market[item])market[item]=v;}
    broadcast();
    const result={...commandResult,gameStatus,news,shopsEnabled,turnConfig:{...turnConfig},turnState:{...turnState}};
    socket.emit('teacherCommandResult',result);
    if(typeof ack==='function')ack(result);
  });
  socket.on('disconnect',()=>{const p=players.get(socket.id);if(p){p.connected=false;p.insideStore=null;p.insideWholesale=false;broadcast();}});
});
  const salesTimer = setInterval(() => {
    if (gameStatus === 'running' && simulateCompanyCustomers()) broadcast();
  }, 5000);
  salesTimer.unref?.();
  const turnTimer = setInterval(() => { if (gameStatus === 'running' && turnState.endsAt && Date.now() >= turnState.endsAt) finishTurn(); }, 500);
  turnTimer.unref?.();
  return roomIo;
}
const initialCode = /^\d{4}$/.test(String(process.env.ROOM_CODE || '').trim()) ? String(process.env.ROOM_CODE).trim() : makeRoomCode();
createClassroom(initialCode);
io.on('connection', socket => {
  socket.on('openClassroom', (data, ack) => {
    const code = String(data?.roomCode || '').trim();
    const room = roomCodeMap.get(code);
    if (!/^\d{4}$/.test(code) || !room) {
      if (typeof ack === 'function') ack({ok:false, message:'교실 코드를 찾을 수 없어요. 선생님에게 새 교실 코드를 확인해 주세요.'});
      return;
    }
    if (typeof ack === 'function') ack({ok:true, namespace:room.name, roomCode:code});
  });
  socket.on('createClassroom', (data, ack) => {
    if (String(data?.pin || '') !== TEACHER_PIN) {
      if (typeof ack === 'function') ack({ok:false, message:'교사 PIN이 틀렸어요.'});
      return;
    }
    if (roomCodeMap.size >= 9000) {
      if (typeof ack === 'function') ack({ok:false, message:'만들 수 있는 교실 코드가 모두 사용 중이에요.'});
      return;
    }
    const code = makeRoomCode();
    const room = createClassroom(code);
    console.log('[PIXEL TOWN] New classroom created: ' + code);
    if (typeof ack === 'function') ack({ok:true, roomCode:code, namespace:room.name});
  });
});
server.listen(PORT,'0.0.0.0',()=>{
  console.log('Pixel Economy multi-classroom server listening on '+PORT);
  console.log('[PIXEL TOWN] Initial classroom code: '+initialCode);
});
