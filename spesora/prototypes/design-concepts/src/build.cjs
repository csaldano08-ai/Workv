/*
 * Genera le pagine dei quattro concept (src/concept-*.html): per ognuno Home, Settimana e Spesa,
 * schermi iPhone 390×844 con contenuti, immagini e Mina reali di Spesora. Solo prototipi: nessun file dell'app.
 *   node src/build.cjs
 */
const fs = require('fs');
const path = require('path');
const { IMG, MINA, DAYS, MEALS, SHOP, SHOP_TOTAL, SHOP_DONE, SHOP_URGENT } = require('./data.cjs');
const { I, CAT, ITEM, SPRIG, TYPE_ICON } = require('./icons.cjs');
const icon = (i) => (ITEM[i.name] || CAT[i.icon]).replace('<svg', '<svg class="cat"');

const status = () => `<div class="status"><span>9:41</span><span class="ic"><svg width="18" height="11" viewBox="0 0 18 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="6" rx="1"/><rect x="10" y="2.5" width="3" height="8.5" rx="1"/><rect x="15" y="0" width="3" height="11" rx="1"/></svg><svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M1 4a10 10 0 0 1 14 0M3.5 6.6a6.5 6.5 0 0 1 9 0"/><circle cx="8" cy="9.3" r="1.2" fill="currentColor" stroke="none"/></svg><svg width="26" height="12" viewBox="0 0 26 12" fill="none"><rect x=".75" y=".75" width="22" height="10.5" rx="3" stroke="currentColor" stroke-width="1.2" opacity=".5"/><rect x="2.5" y="2.5" width="17" height="7" rx="1.6" fill="currentColor"/><rect x="24" y="4" width="1.6" height="4" rx=".8" fill="currentColor" opacity=".5"/></svg></span></div>`;
const TABS = [['Oggi', I.sun], ['Settimana', I.cal], ['Spesa', I.basket], ['Dispensa', I.pantry], ['Ricette', I.book]];
const tabbar = (on, cls = '') => `<nav class="tabbar ${cls}">${TABS.map(([l, ic]) => `<div class="tab ${l === on ? 'on' : ''}">${ic}<span>${l}</span></div>`).join('')}</nav>`;
const LOGO = (s = 30) => `<svg width="${s}" height="${s}" viewBox="0 0 64 64"><rect x="4" y="8" width="56" height="52" rx="14" fill="#386E55"/><rect x="4" y="8" width="56" height="14" rx="7" fill="#2B5643"/><rect x="16" y="3" width="5" height="12" rx="2.5" fill="#E6A46D"/><rect x="43" y="3" width="5" height="12" rx="2.5" fill="#E6A46D"/><circle cx="32" cy="40" r="14" fill="#F6F3EA"/><circle cx="32" cy="40" r="9" fill="none" stroke="#E6A46D" stroke-width="2.5"/><path d="M29 40 l2.5 2.5 l5 -5.5" stroke="#386E55" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const screen = (id, inner) => `<section class="screen" id="${id}">${status()}${inner}</section>`;
const meals = MEALS[17];
const next = meals[0];
const items = SHOP.flatMap((c) => c.items.map((i) => ({ ...i, cat: c.cat, icon: c.icon })));

/* ============================== A — EDITORIALE BOTANICO ============================== */
const A = {
  title: 'Editoriale Botanico',
  css: `
  .A { --bg:#F7F2E7; --ink:#24332C; --muted:#6B776F; --green:#2F6B4F; --green2:#1F4F3A; --sage:#DCE7DA; --peach:#E6A46D; --peachSoft:#F7E3CF; --paper:#FFFCF5; --line:rgba(36,51,44,.85); --tabbg:#FFFCF5; --tabborder:1.5px solid rgba(36,51,44,.85); }
  .A .serif { font-family: Fraunces, Georgia, serif; letter-spacing:-.01em; }
  .A .pad { padding: 0 20px; }
  .A .card { background: var(--paper); border:1.5px solid var(--line); border-radius: 22px; box-shadow: 0 6px 0 rgba(36,51,44,.08); }
  .A .sprig { position:absolute; width:64px; opacity:.9; }
  .A .eyebrow { font: 700 11px Inter; letter-spacing:.14em; text-transform:uppercase; color: var(--green); }
  .A .tag { display:inline-flex; align-items:center; gap:6px; padding:5px 11px; border-radius:99px; font:600 12px Inter; }
  .A .btn { display:flex; align-items:center; justify-content:center; gap:8px; height:50px; border-radius:99px; background:var(--green); color:#fff; font:700 16px Inter; border:1.5px solid var(--line); border-bottom-width:4px; }
  .A .round { width:46px; height:46px; border-radius:50%; background:var(--green); color:#fff; display:flex; align-items:center; justify-content:center; border:1.5px solid var(--line); }
  .A .round svg { width:22px; height:22px; }
  .A .meta { display:flex; gap:14px; font:500 13px Inter; color:var(--muted); }
  .A .meta span { display:flex; align-items:center; gap:5px; } .A .meta svg { width:15px; height:15px; }
  .A .days { display:flex; gap:6px; }
  .A .day { flex:1; height:62px; border-radius:16px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; font:500 11px Inter; color:var(--muted); background:var(--paper); border:1.5px solid rgba(36,51,44,.2); position:relative; }
  .A .day b { font: 600 19px Fraunces, serif; color: var(--ink); }
  .A .day.on { background: var(--green); border-color: var(--line); color:#E4EFE7; } .A .day.on b { color:#fff; }
  .A .day .dot { position:absolute; bottom:-7px; width:16px; height:16px; border-radius:50%; background:var(--peach); border:1.5px solid var(--line); display:flex; align-items:center; justify-content:center; }
  .A .day .dot svg { width:10px; height:10px; color: var(--ink); }
  .A .meal { display:flex; height:118px; overflow:hidden; }
  .A .meal .txt { flex:1; padding:14px 12px 12px 16px; display:flex; flex-direction:column; justify-content:space-between; min-width:0; }
  .A .meal .pic { width:132px; flex:none; border-left:1.5px solid var(--line); }
  .A .t-Colazione { background:var(--peachSoft); color:#8A4F1F; } .A .t-Pranzo { background:var(--sage); color:var(--green2); } .A .t-Cena { background:#2F4A3C; color:#F1EBDD; }
  .A .tag svg { width:14px; height:14px; }
  .A .seg { display:flex; padding:4px; border-radius:99px; background: var(--sage); border:1.5px solid var(--line); }
  .A .seg div { flex:1; height:38px; border-radius:99px; display:flex; align-items:center; justify-content:center; font:600 13.5px Inter; color: var(--green2); }
  .A .seg .on { background: var(--green); color:#fff; }
  .A .cat { padding: 12px 14px 6px; }
  .A .cat .hd { display:flex; align-items:center; gap:10px; margin-bottom:4px; }
  .A .cat .hd svg { width:34px; height:34px; }
  .A .it { display:flex; align-items:center; gap:11px; padding:9px 0; border-top:1px dashed rgba(36,51,44,.18); }
  .A .box { width:22px; height:22px; border-radius:7px; border:1.8px solid var(--line); flex:none; display:flex; align-items:center; justify-content:center; background:#fff; }
  .A .box.on { background: var(--green); } .A .box svg { width:15px; height:15px; color:#fff; }
  .A .urg { font:700 10.5px Inter; color:#8A4F1F; background:var(--peachSoft); padding:3px 8px; border-radius:99px; border:1px solid rgba(138,79,31,.35); }
  `,
  home: () => `<div class="body">
    <div class="sprig" style="right:-14px;top:-8px;transform:rotate(200deg)">${SPRIG()}</div>
    <div class="pad" style="padding-top:6px;position:relative">
      <div class="row" style="justify-content:space-between"><span class="eyebrow">Martedì 17 novembre</span><span style="color:var(--green);width:24px">${I.gear}</span></div>
      <div class="row" style="gap:6px;margin-top:6px">
        <div class="grow"><h1 class="serif" style="font-size:31px;line-height:1.08;font-weight:600">Buongiorno.<br/><span style="color:var(--green)">Oggi si mangia bene.</span></h1></div>
        <img class="mina" src="${MINA('wave')}" style="width:104px;height:104px;margin-right:-10px"/>
      </div>
    </div>
    <div class="pad" style="margin-top:10px">
      <div class="card" style="overflow:hidden">
        <div style="height:226px;position:relative;border-bottom:1.5px solid var(--line)"><img class="dish" src="${IMG(next.id)}"/>
          <span class="tag t-Colazione" style="position:absolute;left:14px;top:14px;border:1px solid var(--line)">${I.dawn} Colazione · 07:30</span></div>
        <div style="padding:14px 16px 16px" class="col">
          <div class="row" style="gap:12px"><h2 class="serif grow" style="font-size:24px;line-height:1.12;font-weight:600">${next.name}</h2><div class="round">${I.right}</div></div>
          <div class="meta" style="margin-top:10px"><span>${I.clock}12 min</span><span>${I.users}2 persone</span><span style="color:#8A4F1F">${I.basket}0/3 in casa</span></div>
        </div>
      </div>
    </div>
    <div class="pad" style="margin-top:14px">
      <div class="card row" style="padding:12px 12px 12px 14px;gap:12px;background:var(--peachSoft)">
        <div style="width:40px;height:40px;border-radius:12px;background:var(--peach);border:1.5px solid var(--line);display:flex;align-items:center;justify-content:center;color:var(--ink)"><span style="width:22px">${I.basket}</span></div>
        <div class="grow"><div style="font:700 15px Inter">Oggi è giorno di spesa</div><div style="font:500 13px Inter;color:var(--muted)">${SHOP_TOTAL} prodotti · ${SHOP_URGENT} servono oggi</div></div>
        <div style="font:700 13px Inter;color:var(--green2);display:flex;align-items:center;gap:2px">Apri<span style="width:16px">${I.right}</span></div>
      </div>
    </div>
    <div class="pad" style="margin-top:16px"><div class="row" style="justify-content:space-between;margin-bottom:8px"><span class="serif" style="font-size:19px;font-weight:600">Poi, oggi</span><span style="font:600 13px Inter;color:var(--green)">Settimana</span></div>
      <div class="row" style="gap:10px">${meals.slice(1).map((m) => `<div class="card grow row" style="padding:7px;gap:9px;border-radius:18px"><div style="width:52px;height:52px;border-radius:12px;overflow:hidden;border:1.5px solid var(--line);flex:none"><img class="dish" src="${IMG(m.id)}"/></div><div class="grow"><div style="font:600 11px Inter;color:var(--muted)">${m.type} · ${m.time}</div><div style="font:600 13px Inter;line-height:1.2">${m.name}</div></div></div>`).join('')}</div>
    </div>
  </div>${tabbar('Oggi')}`,
  week: () => `<div class="body">
    <div class="sprig" style="left:-18px;top:30px;transform:rotate(-20deg) scaleX(-1);width:58px">${SPRIG()}</div>
    <div class="pad" style="padding-top:6px;text-align:center;position:relative">
      <span class="eyebrow">16 – 22 novembre</span>
      <h1 class="serif" style="font-size:30px;font-weight:600;margin-top:4px">La tua settimana</h1>
      <div style="font:500 13.5px Inter;color:var(--muted);margin-top:2px">21 pasti · 2 giorni di spesa</div>
    </div>
    <div class="pad days" style="margin-top:16px" id="days">${DAYS.map((d) => `<div class="day ${d.today ? 'on' : ''}" data-n="${d.n}"><span>${d.d}</span><b>${d.n}</b>${d.shop ? `<span class="dot">${I.basket}</span>` : ''}</div>`).join('')}</div>
    <div class="pad row" style="margin-top:20px;gap:8px"><span class="serif grow" style="font-size:19px;font-weight:600" id="dayTitle">Martedì 17 · oggi</span><span class="tag" style="background:var(--peachSoft);color:#8A4F1F;border:1px solid rgba(138,79,31,.35)"><span style="width:14px">${I.basket}</span>Giorno di spesa</span></div>
    <div class="pad col" style="gap:10px;margin-top:10px" id="mealList">${meals.map((m) => A.mealCard(m)).join('')}</div>
    <div class="pad row" style="gap:8px;margin-top:12px;justify-content:center;color:var(--green);font:600 13px Inter"><span style="width:16px">${I.down}</span>Dettagli del giorno: ingredienti e spesa</div>
  </div>${tabbar('Settimana')}`,
  mealCard: (m) => `<div class="card meal"><div class="txt"><span class="tag t-${m.type}" style="align-self:flex-start">${TYPE_ICON[m.type]}${m.type} · ${m.time}</span><div style="font:600 16.5px Fraunces,serif;line-height:1.18">${m.name}</div><div class="meta"><span>${I.clock}${m.min} min</span></div></div><div class="pic"><img class="dish" src="${IMG(m.id)}"/></div></div>`,
  shop: () => `<div class="body">
    <div class="pad" style="padding-top:6px"><span class="eyebrow">Oggi · martedì 17</span>
      <div class="row" style="gap:10px"><h1 class="serif grow" style="font-size:30px;font-weight:600">La spesa</h1><img class="mina" src="${MINA('shopping')}" style="width:74px;height:74px;margin:-6px -6px -10px 0"/></div>
    </div>
    <div class="pad" style="margin-top:6px"><div class="seg"><div class="on">Da comprare · ${SHOP_TOTAL - SHOP_DONE}</div><div>Nel carrello · ${SHOP_DONE}</div></div></div>
    <div class="pad row" style="gap:8px;margin-top:10px;font:600 12.5px Inter;color:var(--muted)"><span style="width:16px;color:#8A4F1F">${I.alert}</span>${SHOP_URGENT} prodotti servono già oggi · prossima spesa sabato 21</div>
    <div class="pad col" style="gap:10px;margin-top:10px">${SHOP.slice(0, 3).map((c) => `<div class="card cat"><div class="hd">${CAT[c.icon]}<div class="grow"><div style="font:600 17px Fraunces,serif">${c.cat}</div><div style="font:500 12px Inter;color:var(--muted)">${c.items.length} prodotti</div></div>${c.items.some((i) => i.urgent) ? '<span class="urg">Serve oggi</span>' : ''}</div>${c.items.map((i) => `<div class="it"><span class="box ${i.done ? 'on' : ''}">${i.done ? I.check : ''}</span><div class="grow"><div style="font:600 14.5px Inter;${i.done ? 'text-decoration:line-through;color:var(--muted)' : ''}">${i.name}</div></div><span style="font:600 14px Inter">${i.qty}</span><span style="width:18px;color:var(--muted)">${I.info}</span></div>`).join('')}</div>`).join('')}</div>
    <div class="fadecta" style="--fb:var(--bg)"></div><div style="position:absolute;left:20px;right:20px;bottom:12px"><div class="btn">${`<span style="width:20px">${I.check}</span>`}Conferma ${SHOP_DONE} nel carrello</div></div>
  </div>${tabbar('Spesa')}`,
};

/* ============================== B — MINA INTERATTIVA ============================== */
const B = {
  title: 'Mina Interattiva',
  css: `
  .B { --bg:#F5F1E5; --ink:#24332C; --muted:#5F6B64; --green:#3B7A57; --green2:#245C40; --sage:#D7E6D6; --peach:#E6A46D; --peachSoft:#FBE3CC; --paper:#FFFDF7; --tabbg:#FFFDF7; --tabborder:2px solid #24332C; }
  .B, .B * { font-family: Nunito, Inter, sans-serif; }
  .B .pad { padding: 0 18px; }
  .B .card { background: var(--paper); border:2px solid var(--ink); border-radius: 26px; }
  .B .hill { position:absolute; left:-40px; right:-40px; height:220px; border-radius:50%; background: var(--sage); border-top:2px solid var(--ink); }
  .B .bubble { position:relative; background:#fff; border:2px solid var(--ink); border-radius:22px; padding:10px 14px; }
  .B .bubble:after { content:''; position:absolute; left:-9px; bottom:18px; width:14px; height:14px; background:#fff; border-left:2px solid var(--ink); border-bottom:2px solid var(--ink); transform: rotate(45deg); }
  .B .h { font-weight:900; letter-spacing:-.01em; }
  .B .btn { display:inline-flex; align-items:center; gap:8px; height:44px; padding:0 18px; border-radius:99px; background:var(--peach); color:var(--ink); font-weight:900; font-size:15px; border:2px solid var(--ink); border-bottom-width:4px; }
  .B .btn svg { width:18px; height:18px; }
  .B .tabbar .tab.on { background: var(--green); color:#fff; border-radius:16px; border:2px solid var(--ink); padding:4px 0; margin-top:-2px; }
  .B .tabbar .tab, .B .tabbar .tab * { font-family: Nunito; font-weight:800; }
  .B .chip { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:99px; border:2px solid var(--ink); font-weight:800; font-size:12px; background:#fff; }
  .B .chip svg { width:14px; height:14px; }
  .B .days { display:flex; gap:5px; }
  .B .day { flex:1; height:58px; border-radius:18px; border:2px solid var(--ink); background:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; font-weight:800; font-size:11px; color:var(--muted); position:relative; }
  .B .day b { font-size:19px; color:var(--ink); font-weight:900; }
  .B .day.on { background: var(--green); color:#DDEEDF; transform: translateY(-4px); box-shadow: 0 4px 0 var(--ink); } .B .day.on b { color:#fff; }
  .B .day .sh { position:absolute; top:-9px; right:-6px; width:20px; height:20px; border-radius:50%; background: var(--peach); border:2px solid var(--ink); display:flex; align-items:center; justify-content:center; }
  .B .day .sh svg { width:11px; height:11px; }
  .B .tl { display:flex; gap:12px; align-items:stretch; }
  .B .tl .rail { width:30px; display:flex; flex-direction:column; align-items:center; }
  .B .tl .dot { width:30px; height:30px; border-radius:50%; border:2px solid var(--ink); display:flex; align-items:center; justify-content:center; background:#fff; }
  .B .tl .dot svg { width:16px; height:16px; }
  .B .tl .line { flex:1; width:2px; background: repeating-linear-gradient(var(--ink) 0 4px, transparent 4px 8px); }
  .B .tile { flex:1; border:2px solid var(--ink); border-radius:20px; background:#fff; padding:10px 8px 8px; display:flex; flex-direction:column; align-items:center; gap:4px; position:relative; }
  .B .tile svg.cat { width:44px; height:44px; }
  .B .tile .ck { width:26px; height:26px; border-radius:9px; border:2px solid var(--ink); display:flex; align-items:center; justify-content:center; background:#fff; }
  .B .tile .ck.on { background: var(--green); } .B .tile .ck svg { width:17px; height:17px; color:#fff; }
  .B .li { display:flex; align-items:center; gap:10px; padding:8px 0; }
  .B .li svg.cat { width:30px; height:30px; }
  .B .bx { width:24px; height:24px; border-radius:8px; border:2px solid var(--ink); background:#fff; display:flex; align-items:center; justify-content:center; }
  .B .bx.on { background: var(--green); } .B .bx svg { width:16px; height:16px; color:#fff; }
  .B .ring { width:64px; height:64px; border-radius:50%; background: conic-gradient(var(--green) 0 25%, #E7E1D2 25% 100%); border:2px solid var(--ink); display:flex; align-items:center; justify-content:center; }
  .B .ring div { width:44px; height:44px; border-radius:50%; background: var(--paper); border:2px solid var(--ink); display:flex; align-items:center; justify-content:center; font-weight:900; font-size:14px; }
  `,
  home: () => `<div class="body">
    <div class="hill" style="top:150px"></div>
    <div class="pad row" style="justify-content:space-between;padding-top:4px;position:relative"><div class="row" style="gap:8px">${LOGO(28)}<span class="h" style="font-size:21px;color:var(--green)">Spesora</span></div><span style="width:24px;color:var(--green)">${I.gear}</span></div>
    <div class="pad row" style="position:relative;margin-top:6px;align-items:flex-end;gap:4px" id="minaScene">
      <img class="mina" id="minaB" src="${MINA('shopping')}" style="width:150px;height:150px;margin-left:-14px"/>
      <div class="bubble grow" id="bubbleB" style="margin-bottom:22px"><div class="h" style="font-size:19px">Ho preparato la spesa!</div><div style="font-weight:700;font-size:14px;color:var(--muted)">${SHOP_TOTAL} prodotti · ${SHOP_URGENT} servono oggi</div><div class="btn" style="margin-top:8px;height:38px;font-size:14px">${I.basket} Apri la lista</div></div>
    </div>
    <div class="pad" style="position:relative;margin-top:-6px">
      <div class="row" style="gap:8px;margin-bottom:8px"><span class="h" style="font-size:20px">Oggi si cucina</span><span class="chip" style="background:var(--peachSoft)">${I.dawn} 07:30</span></div>
      <div class="card" style="overflow:hidden;position:relative">
        <div style="height:198px;border-bottom:2px solid var(--ink)"><img class="dish" src="${IMG(next.id)}"/></div>
        <img class="mina" src="${MINA('recipe')}" style="position:absolute;right:-8px;top:120px;width:96px;height:96px"/>
        <div style="padding:12px 16px 14px"><div class="h" style="font-size:21px;line-height:1.15;padding-right:70px">${next.name}</div>
          <div class="row" style="gap:6px;margin-top:9px"><span class="chip">${I.clock}12 min</span><span class="chip">${I.users}2</span><span class="chip" style="background:var(--peachSoft)">${I.basket}manca tutto</span></div></div>
      </div>
      <div class="row" style="gap:8px;margin-top:12px">${meals.map((m, i) => `<div class="grow row" style="gap:6px;padding:6px;border:2px solid var(--ink);border-radius:16px;background:${i ? '#fff' : 'var(--green)'};color:${i ? 'var(--ink)' : '#fff'}"><div style="width:34px;height:34px;border-radius:10px;overflow:hidden;border:2px solid var(--ink)"><img class="dish" src="${IMG(m.id)}"/></div><div style="font-weight:800;font-size:11.5px;line-height:1.1">${m.type}<br/><span style="opacity:.75">${m.time}</span></div></div>`).join('')}</div>
    </div>
  </div>${tabbar('Oggi')}`,
  week: () => `<div class="body">
    <div class="pad row" style="gap:10px;padding-top:6px"><span style="width:22px">${I.left}</span><div class="grow" style="text-align:center"><div class="h" style="font-size:24px">La tua settimana</div><div style="font-weight:700;font-size:13px;color:var(--muted)">16 – 22 novembre</div></div><span style="width:22px">${I.right}</span></div>
    <div class="pad days" style="margin-top:16px" id="days">${DAYS.map((d) => `<div class="day ${d.today ? 'on' : ''}" data-n="${d.n}"><span>${d.d}</span><b>${d.n}</b>${d.shop ? `<span class="sh">${I.basket}</span>` : ''}</div>`).join('')}</div>
    <div class="pad row" style="margin-top:14px;align-items:flex-end;gap:4px">
      <img class="mina" src="${MINA('calendar')}" style="width:112px;height:112px;margin-left:-10px"/>
      <div class="bubble grow" style="margin-bottom:16px"><div class="h" style="font-size:16px">Martedì: 3 pasti e la spesa.</div><div style="font-weight:700;font-size:13px;color:var(--muted)">Tutto pronto entro le 20:00</div></div>
    </div>
    <div class="pad col" style="gap:0;margin-top:2px" id="mealList">${meals.map((m, i) => `<div class="tl"><div class="rail"><div class="dot" style="background:${['var(--peachSoft)', 'var(--sage)', '#2F4A3C'][i]};color:${i === 2 ? '#fff' : 'var(--ink)'}">${TYPE_ICON[m.type]}</div>${i < 2 ? '<div class="line"></div>' : ''}</div><div class="card grow row" style="gap:10px;padding:8px;margin-bottom:10px;border-radius:22px"><div style="width:72px;height:72px;border-radius:16px;overflow:hidden;border:2px solid var(--ink);flex:none"><img class="dish" src="${IMG(m.id)}"/></div><div class="grow"><div style="font-weight:800;font-size:12px;color:var(--muted)">${m.type} · ${m.time} · ${m.min} min</div><div class="h" style="font-size:16px;line-height:1.15">${m.name}</div></div><span style="width:20px;color:var(--muted)">${I.right}</span></div></div>`).join('')}</div>
  </div>${tabbar('Settimana')}`,
  shop: () => `<div class="body">
    <div class="pad row" style="gap:12px;padding-top:6px"><div class="grow"><div class="h" style="font-size:26px">La spesa di oggi</div><div style="font-weight:700;font-size:13.5px;color:var(--muted)">Martedì 17 · poi sabato 21</div></div><div class="ring" id="ring"><div id="ringTxt">${SHOP_DONE}/${SHOP_TOTAL}</div></div></div>
    <div class="pad row" style="margin-top:10px;align-items:flex-end;gap:4px">
      <img class="mina" id="minaShop" src="${MINA('shopping')}" style="width:104px;height:104px;margin-left:-10px"/>
      <div class="bubble grow" style="margin-bottom:14px"><div class="h" style="font-size:16px">Prima questi ${SHOP_URGENT}: servono oggi!</div></div>
    </div>
    <div class="pad"><div class="card" style="padding:12px;background:var(--peachSoft)">
      <div class="h row" style="gap:6px;font-size:16px;margin-bottom:10px"><span style="width:18px;color:#B4552E">${I.spark}</span>Da prendere oggi</div>
      <div class="row" style="gap:8px" id="tiles">${items.filter((i) => i.urgent).slice(0, 3).map((i) => `<div class="tile">${icon(i)}<div style="font-weight:800;font-size:12.5px;text-align:center;line-height:1.1;min-height:28px">${i.name}</div><div style="font-weight:700;font-size:11.5px;color:var(--muted)">${i.qty}</div><div class="ck ${i.done ? 'on' : ''}">${i.done ? I.check : ''}</div></div>`).join('')}</div>
      <div style="font-weight:800;font-size:12.5px;color:var(--green2);text-align:center;margin-top:8px">+ altri ${SHOP_URGENT - 3} per oggi</div>
    </div></div>
    <div class="pad" style="margin-top:12px"><div class="h" style="font-size:17px;margin-bottom:2px">Il resto della lista</div>
      ${items.filter((i) => !i.urgent && !i.qb).slice(0, 4).map((i) => `<div class="li"><span class="bx"></span>${icon(i)}<div class="grow"><div style="font-weight:800;font-size:14.5px">${i.name}</div><div style="font-weight:700;font-size:12px;color:var(--muted)">${i.for}</div></div><span style="font-weight:900;font-size:14px">${i.qty}</span></div>`).join('')}
    </div>
  </div>${tabbar('Spesa')}`,
};

/* ============================== C — RICETTARIO A SCHEDE ============================== */
const C = {
  title: 'Ricettario a Schede',
  css: `
  .C { --bg:#EFE7D6; --ink:#24332C; --muted:#6A6455; --green:#386E55; --green2:#2B5643; --sage:#C9DAC3; --peach:#E6A46D; --peachSoft:#F5DCC0; --paper:#FBF6EA; --tabbg:#FBF6EA; --tabborder:2px solid #24332C; }
  .C .hand { font-family: Caveat, cursive; }
  .C .pad { padding: 0 18px; }
  .C .page { background: var(--paper); border:2px solid var(--ink); border-radius: 18px; position:relative; box-shadow: 5px 5px 0 #D9CDB4, 5px 5px 0 2px var(--ink); }
  .C .rings { position:absolute; top:-13px; left:24px; right:24px; display:flex; justify-content:space-between; }
  .C .rings i { width:12px; height:24px; border-radius:7px; border:2.2px solid var(--ink); background: #D8B24F; display:block; }
  .C .tape { position:absolute; width:76px; height:24px; background: rgba(230,164,109,.75); border:1.5px solid rgba(36,51,44,.4); transform: rotate(-6deg); }
  .C .title { font: 800 26px Inter; letter-spacing:-.02em; }
  .C .tabs { display:flex; gap:4px; padding-left:16px; }
  .C .tabs div { padding:7px 14px 10px; border:2px solid var(--ink); border-bottom:none; border-radius:12px 12px 0 0; font:700 13px Inter; background:#E2D7BF; color:var(--muted); margin-bottom:-2px; }
  .C .tabs .on { background: var(--paper); color: var(--ink); position:relative; z-index:2; }
  .C .dayrow { display:flex; align-items:center; gap:10px; padding:7px 10px; border-top:1.5px dashed rgba(36,51,44,.25); }
  .C .dtab { width:48px; height:48px; border-radius:12px; border:2px solid var(--ink); display:flex; flex-direction:column; align-items:center; justify-content:center; font:700 10.5px Inter; color:var(--muted); background:#fff; flex:none; }
  .C .dtab b { font:800 18px Inter; color:var(--ink); line-height:1; }
  .C .dtab.on { background: var(--green); color:#DDEEDF; } .C .dtab.on b { color:#fff; }
  .C .thumbs { display:flex; gap:5px; }
  .C .th { width:46px; height:46px; border-radius:11px; overflow:hidden; border:1.8px solid var(--ink); position:relative; }
  .C .th i { position:absolute; left:2px; top:2px; width:14px; height:14px; border-radius:50%; border:1.5px solid var(--ink); }
  .C .lab { font: 700 16px Caveat, cursive; padding:1px 8px; border-radius:6px; border:1.5px solid var(--ink); }
  .C .acc { border:2px solid var(--ink); border-radius:14px; background:#fff; }
  .C .acc .hd { display:flex; align-items:center; gap:10px; padding:9px 12px; }
  .C .acc .hd svg.cat { width:30px; height:30px; }
  .C .it { display:flex; align-items:center; gap:10px; padding:7px 12px; border-top:1.5px dashed rgba(36,51,44,.22); }
  .C .bx { width:22px; height:22px; border-radius:6px; border:2px solid var(--ink); background:#fff; display:flex; align-items:center; justify-content:center; }
  .C .bx.on { background: var(--green); } .C .bx svg { width:15px; height:15px; color:#fff; }
  .C .btn { display:flex; align-items:center; justify-content:center; gap:8px; height:48px; border-radius:99px; background:var(--green); color:#fff; font:800 15px Inter; border:2px solid var(--ink); border-bottom-width:4px; }
  .C .btn svg { width:18px; height:18px; }
  `,
  home: () => `<div class="body">
    <div class="pad row" style="justify-content:space-between;padding-top:4px"><div class="row" style="gap:8px">${LOGO(30)}<span style="font:800 23px Inter;color:var(--green);letter-spacing:-.02em">Spesora</span></div><span style="width:24px;color:var(--green)">${I.gear}</span></div>
    <div class="pad row" style="gap:6px;margin-top:6px;align-items:center">
      <img class="mina" src="${MINA('explaining')}" style="width:96px;height:96px;margin-left:-10px"/>
      <div class="grow" style="background:var(--peachSoft);border:2px solid var(--ink);border-radius:6px 18px 18px 18px;padding:8px 12px;transform:rotate(-1.5deg)"><div class="hand" style="font-size:24px;line-height:1;font-weight:700">Oggi c'è la spesa!</div><div style="font:600 12.5px Inter;color:var(--muted)">${SHOP_TOTAL} prodotti · ${SHOP_URGENT} servono oggi</div></div>
    </div>
    <div class="pad" style="margin-top:14px"><div class="page" style="padding:22px 14px 12px">
      <div class="rings">${'<i></i>'.repeat(5)}</div>
      <div class="row" style="justify-content:space-between"><span class="hand" style="font-size:26px;font-weight:700">Martedì 17</span><span class="lab" style="background:var(--peachSoft)">giorno di spesa</span></div>
      <div class="row" style="gap:10px;margin-top:8px">
        <div style="width:150px;height:150px;border-radius:14px;overflow:hidden;border:2px solid var(--ink);flex:none;transform:rotate(-2deg);box-shadow:3px 3px 0 var(--ink)"><img class="dish" src="${IMG(next.id)}"/></div>
        <div class="grow col" style="gap:6px"><span class="lab" style="align-self:flex-start;background:var(--peachSoft)">colazione 07:30</span><div style="font:800 18px Inter;line-height:1.15">${next.name}</div><div style="font:600 12.5px Inter;color:var(--muted)">12 min · 2 persone</div><div class="btn" style="height:38px;font-size:13.5px">Cucina ${I.right}</div></div>
      </div>
      <div class="row" style="gap:8px;margin-top:12px;padding-top:10px;border-top:1.5px dashed rgba(36,51,44,.3)">${meals.slice(1).map((m) => `<div class="grow row" style="gap:8px"><div class="th" style="width:42px;height:42px"><img class="dish" src="${IMG(m.id)}"/></div><div style="font:600 11.5px Inter;line-height:1.15"><span style="color:var(--muted)">${m.type}</span><br/>${m.name}</div></div>`).join('')}</div>
    </div></div>
    <div class="pad row" style="gap:10px;margin-top:16px">
      ${[[I.cal, 'La settimana', '21 pasti'], [I.book, 'Il ricettario', '500 ricette']].map(([ic, t, s2], i) => `<div class="grow" style="background:${i ? 'var(--sage)' : 'var(--peachSoft)'};border:2px solid var(--ink);border-radius:16px;padding:12px;position:relative"><span style="width:26px;display:block;color:var(--green2)">${ic}</span><div style="font:800 15px Inter;margin-top:6px">${t}</div><div class="hand" style="font-size:18px;color:var(--muted)">${s2}</div></div>`).join('')}
    </div>
  </div>${tabbar('Oggi')}`,
  week: () => `<div class="body">
    <div class="pad row" style="justify-content:space-between;padding-top:4px"><span class="title">La tua settimana</span><span style="width:24px;color:var(--green)">${I.refresh}</span></div>
    <div class="pad" style="margin-top:14px"><div class="page" id="agenda" style="padding:20px 0 4px">
      <div class="rings">${'<i></i>'.repeat(6)}</div>
      <div class="row" style="justify-content:center;gap:16px;padding-bottom:6px"><span style="width:20px">${I.left}</span><span class="hand" style="font-size:24px;font-weight:700">16 – 22 novembre</span><span style="width:20px">${I.right}</span></div>
      <div class="row" style="gap:16px;padding:0 0 6px 70px;font:700 10px Inter;color:var(--muted);letter-spacing:.06em"><span style="width:46px;text-align:center">COLAZ.</span><span style="width:46px;text-align:center">PRANZO</span><span style="width:46px;text-align:center">CENA</span></div>
      ${DAYS.map((d) => {
        const ms = MEALS[d.n];
        return `<div class="dayrow" style="${d.today ? 'background:rgba(201,218,195,.55)' : ''}"><div class="dtab ${d.today ? 'on' : ''}"><span>${d.d}</span><b>${d.n}</b></div><div class="thumbs">${ms.map((m, i) => `<div class="th"><img class="dish" src="${IMG(m.id)}"/><i style="background:${['#F5DCC0', '#C9DAC3', '#2F4A3C'][i]}"></i></div>`).join('')}</div><div class="grow"></div>${d.shop ? `<span class="lab" style="background:var(--peachSoft);font-size:15px;display:flex;gap:3px;align-items:center"><span style="width:14px">${I.basket}</span>spesa</span>` : ''}</div>`;
      }).join('')}
    </div></div>
    <div class="pad" style="margin-top:10px;font:600 12px Inter;color:var(--muted);text-align:center">Tocca un giorno per aprire la sua scheda</div>
  </div>${tabbar('Settimana')}`,
  shop: () => `<div class="body">
    <div class="pad row" style="justify-content:space-between;padding-top:4px"><span class="title">La lista della spesa</span><img class="mina" src="${MINA('shopping')}" style="width:56px;height:56px;margin:-8px -4px -8px 0"/></div>
    <div class="tabs" style="margin-top:12px;padding-left:28px"><div class="on">Oggi · mar 17</div><div>Sab 21</div></div>
    <div class="pad"><div class="page" style="padding:22px 12px 12px;border-radius:4px 18px 18px 18px">
      <div class="tape" style="right:-10px;top:-12px;transform:rotate(12deg)"></div>
      <div class="row" style="gap:8px;margin-bottom:10px"><span class="hand grow" style="font-size:22px;font-weight:700">${SHOP_TOTAL - SHOP_DONE} da comprare, ${SHOP_DONE} già presi</span><span class="lab" style="background:#F4C7B2;font-size:15px">${SHOP_URGENT} per oggi</span></div>
      <div class="col" style="gap:8px">
        <div class="acc"><div class="hd">${CAT.veg.replace('<svg', '<svg class="cat"')}<span class="grow" style="font:800 15px Inter">Frutta e verdura</span><span style="font:700 12px Inter;color:var(--muted)">4</span><span style="width:18px">${I.down}</span></div>
          ${SHOP[0].items.map((i) => `<div class="it"><span class="bx ${i.done ? 'on' : ''}">${i.done ? I.check : ''}</span><span class="grow" style="font:600 14px Inter;${i.done ? 'text-decoration:line-through;color:var(--muted)' : ''}">${i.name}${i.urgent && !i.done ? ' <span class="hand" style="color:#B4552E;font-size:16px;font-weight:700">· oggi</span>' : ''}</span><span style="font:700 13.5px Inter">${i.qty}</span></div>`).join('')}
        </div>
        ${SHOP.slice(1).map((c) => `<div class="acc"><div class="hd">${CAT[c.icon].replace('<svg', '<svg class="cat"')}<span class="grow" style="font:800 15px Inter">${c.cat}</span><span style="font:700 12px Inter;color:var(--muted)">${c.items.length}</span><span style="width:18px;transform:rotate(-90deg)">${I.down}</span></div></div>`).join('')}
      </div>
    </div></div>
    <div class="fadecta"></div><div style="position:absolute;left:18px;right:18px;bottom:10px"><div class="btn"><span style="width:18px">${I.check}</span>Conferma ${SHOP_DONE} acquisti</div></div>
  </div>${tabbar('Spesa')}`,
};

/* ============================== D — MODERNO ILLUSTRATO ============================== */
const D = {
  title: 'Moderno Illustrato',
  css: `
  .D { --bg:#F4F2EA; --ink:#1F2E27; --muted:#68746D; --green:#2E6B4E; --green2:#1E4F38; --sage:#DCE8DF; --peach:#E6A46D; --peachSoft:#FBE7D4; --paper:#FFFFFF; --tabbg:#FFFFFF; --tabborder:1px solid #E3E0D6; }
  .D, .D * { font-family: Manrope, Inter, sans-serif; }
  .D .pad { padding: 0 20px; }
  .D .h { font-weight:800; letter-spacing:-.02em; }
  .D .card { background: var(--paper); border-radius: 22px; box-shadow: 0 1px 0 rgba(31,46,39,.06), 0 8px 24px rgba(31,46,39,.07); }
  .D .pill { display:inline-flex; align-items:center; gap:6px; padding:7px 12px; border-radius:99px; font-weight:700; font-size:13px; }
  .D .pill svg { width:15px; height:15px; }
  .D .tabbar .tab.on { color: var(--green); } .D .tabbar .tab.on svg { background: var(--sage); border-radius:10px; padding:2px; width:30px; height:26px; }
  .D .days { display:flex; justify-content:space-between; position:relative; }
  .D .day { width:44px; height:64px; border-radius:16px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; font-weight:600; font-size:11.5px; color:var(--muted); position:relative; z-index:2; }
  .D .day b { font-size:18px; color:var(--ink); font-weight:800; }
  .D .day.on { color:#D5EADB; } .D .day.on b { color:#fff; }
  .D .day i { width:5px; height:5px; border-radius:50%; background: transparent; }
  .D .day.shop i { background: var(--peach); }
  .D .sel { position:absolute; top:0; width:44px; height:64px; border-radius:16px; background: var(--green); z-index:1; }
  .D .meal { display:flex; align-items:center; gap:12px; padding:9px; }
  .D .meal .pic { width:66px; height:66px; border-radius:16px; overflow:hidden; flex:none; }
  .D .ty { display:inline-flex; align-items:center; gap:5px; font-weight:700; font-size:12px; }
  .D .ty svg { width:14px; height:14px; }
  .D .seg { display:flex; gap:8px; }
  .D .seg div { flex:1; height:46px; border-radius:16px; display:flex; align-items:center; justify-content:center; gap:8px; font-weight:700; font-size:14px; background:#fff; color:var(--ink); box-shadow: inset 0 0 0 1px #E3E0D6; }
  .D .seg .on { background: var(--green); color:#fff; box-shadow:none; }
  .D .seg svg { width:18px; height:18px; }
  .D .grp { overflow:hidden; }
  .D .grp .hd { display:flex; align-items:center; gap:10px; padding:11px 14px; background: var(--sage); font-weight:800; font-size:14.5px; }
  .D .grp .hd svg.cat { width:24px; height:24px; }
  .D .it { display:flex; align-items:center; gap:12px; padding:11px 14px; border-top:1px solid #EEEBE2; }
  .D .bx { width:22px; height:22px; border-radius:7px; border:1.8px solid #B9C3BC; display:flex; align-items:center; justify-content:center; }
  .D .bx.on { background: var(--green); border-color: var(--green); } .D .bx svg { width:15px; height:15px; color:#fff; }
  .D .btn { display:flex; align-items:center; justify-content:center; gap:8px; height:54px; border-radius:18px; background:var(--green); color:#fff; font-weight:800; font-size:16px; }
  .D .btn svg { width:20px; height:20px; }
  `,
  home: () => `<div class="body">
    <div class="pad row" style="padding-top:8px;gap:8px">
      <div class="grow"><div style="font-weight:600;font-size:14px;color:var(--muted)">Ciao, sono Mina!</div><div class="h" style="font-size:29px;line-height:1.1">Cosa cuciniamo<br/>oggi?</div></div>
      <img class="mina" src="${MINA('neutral')}" style="width:96px;height:96px;margin-right:-8px"/>
    </div>
    <div class="pad" style="margin-top:12px">
      <div class="card" style="height:330px;overflow:hidden;position:relative">
        <img class="dish" src="${IMG(next.id)}"/>
        <div style="position:absolute;inset:auto 0 0 0;height:190px;background:linear-gradient(transparent, rgba(20,34,27,.82))"></div>
        <span class="pill" style="position:absolute;left:14px;top:14px;background:rgba(255,255,255,.92)">${I.dawn} Colazione · 07:30</span>
        <span class="pill" style="position:absolute;right:14px;top:14px;background:rgba(255,255,255,.92)">${I.clock} 12 min</span>
        <div style="position:absolute;left:18px;right:18px;bottom:16px;color:#fff"><div class="h" style="font-size:25px;line-height:1.12">${next.name}</div>
          <div class="row" style="gap:8px;margin-top:12px"><div class="btn grow" style="height:46px;background:#fff;color:var(--green2);font-size:15px">Apri la ricetta</div><div style="width:46px;height:46px;border-radius:16px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center"><span style="width:22px">${I.heart}</span></div></div></div>
      </div>
    </div>
    <div class="pad row" style="gap:8px;margin-top:12px">
      <span class="pill" style="background:var(--peachSoft);color:#8A4F1F;flex:1;justify-content:center;height:42px">${I.basket} Spesa oggi · ${SHOP_TOTAL}</span>
      <span class="pill" style="background:var(--sage);color:var(--green2);flex:1;justify-content:center;height:42px">${I.pantry} In casa 0/3</span>
    </div>
    <div class="pad" style="margin-top:14px"><div class="row" style="justify-content:space-between"><span class="h" style="font-size:17px">Più tardi</span><span style="width:20px;color:var(--muted)">${I.right}</span></div>
      <div class="row" style="gap:10px;margin-top:8px">${meals.slice(1).map((m) => `<div class="grow"><div style="height:84px;border-radius:16px;overflow:hidden"><img class="dish" src="${IMG(m.id)}"/></div><div style="font-weight:700;font-size:12px;color:var(--muted);margin-top:5px">${m.type} · ${m.time}</div><div style="font-weight:800;font-size:13.5px;line-height:1.15">${m.name}</div></div>`).join('')}</div>
    </div>
  </div>${tabbar('Oggi', 'D')}`,
  week: () => `<div class="body">
    <div class="pad row" style="padding-top:8px"><div class="grow"><div class="h" style="font-size:27px">Settimana</div><div style="font-weight:600;font-size:13.5px;color:var(--muted)">16 – 22 novembre · 21 pasti</div></div><span style="width:24px;color:var(--green)">${I.refresh}</span></div>
    <div class="pad" style="margin-top:14px"><div class="card" style="padding:8px 10px"><div class="days" id="days"><div class="sel" id="sel" style="left:${(390 - 40 - 20 - 44) / 6 * 1}px"></div>${DAYS.map((d) => `<div class="day ${d.today ? 'on' : ''} ${d.shop ? 'shop' : ''}" data-n="${d.n}"><span>${d.d}</span><b>${d.n}</b><i></i></div>`).join('')}</div></div></div>
    <div class="pad row" style="gap:8px;margin-top:14px"><span class="h grow" style="font-size:18px" id="dayTitle">Oggi, martedì 17</span><span class="pill" style="background:var(--peachSoft);color:#8A4F1F">${I.basket} Spesa</span></div>
    <div class="pad col" style="gap:10px;margin-top:10px" id="mealList">${meals.map((m) => D.mealRow(m)).join('')}</div>
    <div class="pad" style="margin-top:14px"><div class="card row" style="padding:12px 14px;gap:10px;background:var(--sage);box-shadow:none"><img class="mina" src="${MINA('calendar')}" style="width:46px;height:46px"/><div class="grow" style="font-weight:700;font-size:13.5px">Sabato 21 c'è la prossima spesa</div><span style="width:18px">${I.right}</span></div></div>
  </div>${tabbar('Settimana', 'D')}`,
  mealRow: (m) => `<div class="card meal"><div class="pic"><img class="dish" src="${IMG(m.id)}"/></div><div class="grow"><span class="ty" style="color:${{ Colazione: '#A45E26', Pranzo: '#2E6B4E', Cena: '#3D4F86' }[m.type]}">${TYPE_ICON[m.type]}${m.type} · ${m.time}</span><div style="font-weight:800;font-size:15.5px;line-height:1.18;margin-top:2px">${m.name}</div><div style="font-weight:600;font-size:12px;color:var(--muted);margin-top:2px">${m.min} min</div></div><span style="width:20px;color:#A7B0AA">${I.right}</span></div>`,
  shop: () => `<div class="body">
    <div class="pad row" style="padding-top:8px"><div class="grow"><div class="h" style="font-size:27px">Spesa di oggi</div><div style="font-weight:600;font-size:13.5px;color:var(--muted)">Martedì 17 · prossima sabato 21</div></div><img class="mina" src="${MINA('shopping')}" style="width:62px;height:62px;margin-right:-6px"/></div>
    <div class="pad seg" style="margin-top:12px"><div class="on">${I.basket}<span id="todo">${SHOP_TOTAL - SHOP_DONE}</span> da comprare</div><div>${I.check}<span id="done">${SHOP_DONE}</span> presi</div></div>
    <div class="pad col" style="gap:12px;margin-top:12px" id="groups">${SHOP.slice(0, 2).map((c) => `<div class="card grp"><div class="hd">${CAT[c.icon].replace('<svg', '<svg class="cat"')}<span class="grow">${c.cat}</span><span style="font-size:13px;color:var(--muted)">${c.items.length}</span></div>${c.items.map((i) => `<div class="it" data-name="${i.name}"><span class="bx ${i.done ? 'on' : ''}">${i.done ? I.check : ''}</span><div class="grow"><div class="nm" style="font-weight:700;font-size:15px;${i.done ? 'text-decoration:line-through;color:var(--muted)' : ''}">${i.name}</div>${i.urgent && !i.done ? '<div style="font-weight:700;font-size:11.5px;color:#B4552E">Serve oggi</div>' : ''}</div><span style="font-weight:800;font-size:14px">${i.qty}</span></div>`).join('')}</div>`).join('')}</div>
    <div class="fadecta"></div><div style="position:absolute;left:20px;right:20px;bottom:12px"><div class="btn">${I.check}Conferma acquisti</div></div>
  </div>${tabbar('Spesa', 'D')}`,
};

/* ---------- micro-animazioni (Web Animations API: solo per i video di prova) ---------- */
const ANIMS = {
  A: `window.anims = {
    async a1() { // cambio giorno: la pillola passa a Mer 18 e i pasti scorrono
      await wait(500);
      const days=[...document.querySelectorAll('#week .day')]; const on=days[1], nx=days[2];
      nx.animate([{transform:'scale(1)'},{transform:'scale(.9)'},{transform:'scale(1)'}],{duration:240});
      on.classList.remove('on'); nx.classList.add('on');
      nx.animate([{transform:'translateY(0)'},{transform:'translateY(-6px)'},{transform:'translateY(0)'}],{duration:420,easing:'cubic-bezier(.3,1.6,.5,1)'});
      const list=document.querySelector('#week #mealList'); await list.animate([{opacity:1,transform:'translateX(0)'},{opacity:0,transform:'translateX(-40px)'}],{duration:220,fill:'forwards'}).finished;
      list.innerHTML = MEALS18; document.querySelector('#week #dayTitle').textContent='Mercoledì 18';
      [...list.children].forEach((c,i)=>c.animate([{opacity:0,transform:'translateX(40px)'},{opacity:1,transform:'none'}],{duration:380,delay:i*70,easing:'cubic-bezier(.2,.9,.3,1.2)',fill:'backwards'}));
      list.animate([{opacity:1}],{duration:1,fill:'forwards'});
      await wait(1600);
    },
    async a2() { // perché serve: la riga della spesa si espande con la spiegazione
      await wait(500);
      const it=document.querySelectorAll('#shop .it')[1];
      const box=document.createElement('div'); box.style.cssText='overflow:hidden;height:0;background:#F7E3CF;border-radius:12px;margin:0 0 6px;font:500 12.5px Inter;color:#5a4a3c;padding:0 12px;border:1px solid rgba(138,79,31,.3)';
      box.innerHTML='<div style="padding:8px 0"><b>Per: Pasta funghi e salsiccia · stasera 20:00</b><br/>Servono 250 g. Non è in dispensa.</div>';
      it.after(box); it.querySelector('span:last-child').animate([{transform:'rotate(0)'},{transform:'rotate(180deg)'}],{duration:300,fill:'forwards'});
      await box.animate([{height:'0px'},{height:'58px'}],{duration:360,easing:'cubic-bezier(.2,.9,.3,1.15)',fill:'forwards'}).finished;
      await wait(1700);
    } };`,
  B: `window.anims = {
    async a1() { // Mina presenta il messaggio
      const m=document.querySelector('#minaB'), b=document.querySelector('#bubbleB');
      m.style.opacity=0; b.style.opacity=0; await wait(400);
      m.style.opacity=1; await m.animate([{transform:'translateY(60px) scale(.6,1.3)'},{transform:'translateY(-10px) scale(1.08,.92)'},{transform:'none'}],{duration:620,easing:'cubic-bezier(.3,1.5,.5,1)'}).finished;
      b.style.opacity=1; b.style.transformOrigin='0% 80%'; await b.animate([{transform:'scale(.2)',opacity:0},{transform:'scale(1.06)',opacity:1},{transform:'scale(1)'}],{duration:420,easing:'ease-out'}).finished;
      m.animate([{transform:'rotate(0)'},{transform:'rotate(-5deg)'},{transform:'rotate(5deg)'},{transform:'rotate(0)'}],{duration:700});
      await wait(1700);
    },
    async a2() { // spunta in tessera: rimbalzo, anello che si riempie, Mina festeggia
      await wait(500);
      const tiles=[...document.querySelectorAll('#shop .tile .ck')];
      let n=${SHOP_DONE};
      for (const ck of tiles.filter(c=>!c.classList.contains('on'))) {
        ck.classList.add('on'); ck.innerHTML=CHECK; ck.animate([{transform:'scale(.4)'},{transform:'scale(1.25)'},{transform:'scale(1)'}],{duration:380,easing:'cubic-bezier(.3,1.6,.5,1)'});
        ck.parentElement.animate([{transform:'translateY(0)'},{transform:'translateY(-6px)'},{transform:'none'}],{duration:380});
        n++; const pct=n/${SHOP_TOTAL}*100; document.querySelector('#ring').style.background='conic-gradient(var(--green) 0 '+pct+'%, #E7E1D2 '+pct+'% 100%)'; document.querySelector('#ringTxt').textContent=n+'/${SHOP_TOTAL}';
        await wait(450);
      }
      const m=document.querySelector('#minaShop'); m.src=MINA_SUCCESS;
      await m.animate([{transform:'translateY(0) scale(1)'},{transform:'translateY(-22px) scale(.95,1.08)'},{transform:'translateY(0) scale(1.06,.94)'},{transform:'none'}],{duration:620,easing:'ease-out'}).finished;
      await wait(1400);
    } };`,
  C: `window.anims = {
    async a1() { // cambio settimana: la pagina dell'agenda si gira
      await wait(500);
      const p=document.querySelector('#week #agenda'); p.style.transformOrigin='50% 0%';
      await p.animate([{transform:'none'},{transform:'scaleY(.02) skewX(-8deg)',opacity:.6}],{duration:320,easing:'ease-in',fill:'forwards'}).finished;
      p.querySelector('.hand').textContent='23 – 29 novembre';
      [...p.querySelectorAll('.dtab b')].forEach((b,i)=>b.textContent=23+i);
      [...p.querySelectorAll('.dayrow')].forEach(r=>r.style.background='');
      await p.animate([{transform:'scaleY(.02) skewX(8deg)',opacity:.6},{transform:'scaleY(1.03)'},{transform:'none',opacity:1}],{duration:420,easing:'ease-out',fill:'forwards'}).finished;
      await wait(1500);
    },
    async a2() { // apertura della scheda ricetta: la foto si solleva e si ingrandisce
      await wait(500);
      const ph=document.querySelector('#home .page div[style*="rotate(-2deg)"]'); const r=ph.getBoundingClientRect(); const s=document.querySelector('#home').getBoundingClientRect();
      const clone=ph.cloneNode(true); clone.style.cssText+=';position:absolute;z-index:9;left:'+(r.left-s.left)+'px;top:'+(r.top-s.top)+'px;margin:0'; document.querySelector('#home').appendChild(clone);
      ph.style.visibility='hidden';
      await clone.animate([{transform:'rotate(-2deg)'},{transform:'rotate(3deg) translateY(-14px)'}],{duration:240,fill:'forwards'}).finished;
      await clone.animate([{left:(r.left-s.left)+'px',top:(r.top-s.top)+'px',width:'150px',height:'150px',transform:'rotate(3deg) translateY(-14px)'},{left:'0px',top:'0px',width:'390px',height:'330px',transform:'none',borderRadius:'0px'}],{duration:480,easing:'cubic-bezier(.2,.9,.3,1)',fill:'forwards'}).finished;
      await wait(1400);
    } };`,
  D: `window.anims = {
    async a1() { // cambio giorno: l'indicatore scorre, i pasti entrano sfalsati
      await wait(500);
      const sel=document.querySelector('#week #sel'); const days=[...document.querySelectorAll('#week .day')];
      const x2=days[2].offsetLeft; const x1=days[1].offsetLeft;
      days[1].classList.remove('on');
      await sel.animate([{left:x1+'px'},{left:x2+'px'}],{duration:340,easing:'cubic-bezier(.3,1.3,.5,1)',fill:'forwards'}).finished; sel.style.left=x2+'px';
      days[2].classList.add('on');
      const list=document.querySelector('#week #mealList'); list.innerHTML=MEALS18D; document.querySelector('#week #dayTitle').textContent='Mercoledì 18';
      [...list.children].forEach((c,i)=>c.animate([{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}],{duration:360,delay:i*80,easing:'ease-out',fill:'backwards'}));
      await wait(1700);
    },
    async a2() { // spunta: casella che si riempie, testo barrato, contatori aggiornati
      await wait(500);
      for (const name of ['Funghi champignon','Fontina']) {
        const it=document.querySelector('#shop .it[data-name="'+name+'"]'); const bx=it.querySelector('.bx');
        bx.classList.add('on'); bx.innerHTML=CHECK; bx.animate([{transform:'scale(.5)'},{transform:'scale(1.2)'},{transform:'scale(1)'}],{duration:320,easing:'cubic-bezier(.3,1.6,.5,1)'});
        const nm=it.querySelector('.nm'); nm.style.color='#68746D'; nm.style.textDecoration='line-through'; const u=nm.nextElementSibling; if(u&&u.textContent.includes('Serve')) u.remove();
        it.animate([{background:'#E4F0E8'},{background:'#fff'}],{duration:700});
        const t=document.querySelector('#shop #todo'), d=document.querySelector('#shop #done'); t.textContent=+t.textContent-1; d.textContent=+d.textContent+1;
        d.parentElement.animate([{transform:'scale(1)'},{transform:'scale(1.08)'},{transform:'scale(1)'}],{duration:300});
        await wait(650);
      }
      await wait(1300);
    } };`,
};

const page = (key, c) => {
  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"/><title>Spesora · Concept ${key} — ${c.title}</title>
<link rel="stylesheet" href="common.css"/><style>${c.css}
.wrap{display:flex;gap:40px;padding:40px;}</style></head>
<body class="${key}"><div class="wrap">${screen('home', c.home())}${screen('week', c.week())}${screen('shop', c.shop())}</div>
<script>const wait=(ms)=>new Promise(r=>setTimeout(r,ms));const CHECK=${JSON.stringify(I.check)};const MINA_SUCCESS=${JSON.stringify(MINA('success'))};
const MEALS18=${JSON.stringify(key === 'A' ? MEALS[18].map((m) => A.mealCard(m)).join('') : '')};const MEALS18D=${JSON.stringify(key === 'D' ? MEALS[18].map((m) => D.mealRow(m)).join('') : '')};
${ANIMS[key]}
const sel=document.querySelector('#sel'); if(sel){const d=document.querySelectorAll('#week .day')[1]; sel.style.left=d.offsetLeft+'px';}</script></body></html>`;
  fs.writeFileSync(path.join(__dirname, `concept-${key}.html`), html);
};
page('A', A);
page('B', B);
page('C', C);
page('D', D);
console.log('Pagine generate: src/concept-A..D.html');
