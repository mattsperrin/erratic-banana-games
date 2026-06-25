// === DONUT GAME - Noah's Edition ===

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const CX = 300, CY = 300, R = 270;

const DONUT_TYPES = [
  { id:'dirt',    name:'Dirt Donut',       cost:10,  dmg:8,   hp:20,  range:65,  speed:1.2,
    doughColor:'#C4903A', frostingColor:'#7B4A1A', sprinkleColors:null, outerR:18, innerR:7 },
  { id:'wooden',  name:'Wooden Donut',     cost:20,  dmg:15,  hp:35,  range:75,  speed:1.1,
    doughColor:'#DEB887', frostingColor:'#A0522D', sprinkleColors:['#6B3A2A','#8B4513','#3B1F0A'], outerR:19, innerR:7 },
  { id:'stone',   name:'Stone Donut',      cost:30,  dmg:25,  hp:55,  range:85,  speed:1.0,
    doughColor:'#B0B0B0', frostingColor:'#707070', sprinkleColors:['#555','#999','#ccc'], outerR:20, innerR:8 },
  { id:'iron',    name:'Iron Donut',       cost:50,  dmg:40,  hp:80,  range:95,  speed:1.1,
    doughColor:'#D8D8E8', frostingColor:'#9898B8', sprinkleColors:['#777','#bbb','#eee'], outerR:21, innerR:8 },
  { id:'choc',    name:'Choc Chip Donut',  cost:70,  dmg:60,  hp:110, range:105, speed:1.2,
    doughColor:'#C8720A', frostingColor:'#4A2010', sprinkleColors:['#2C1810','#1A0A05','#3A2010'], outerR:21, innerR:8 },
  { id:'diamond', name:'Diamond Donut',    cost:90,  dmg:85,  hp:150, range:120, speed:1.3,
    doughColor:'#E8F8FF', frostingColor:'#7FFFD4', sprinkleColors:['#B0FFFF','#FFFFFF','#87CEEB','#E0FFFF'], outerR:22, innerR:9 },
  { id:'ruby',    name:'Ruby Donut',       cost:100, dmg:110, hp:190, range:130, speed:1.4,
    doughColor:'#FF8080', frostingColor:'#C0192B', sprinkleColors:['#FF0000','#8B0000','#FF69B4','#FF4444'], outerR:22, innerR:9 },
  { id:'cosmic',  name:'Cosmic Donut',     cost:200, dmg:200, hp:350, range:155, speed:1.5,
    doughColor:'#2C1654', frostingColor:'#7B2FBE', sprinkleColors:['#FFD700','#FF69B4','#00FFFF','#7FFF00','#FF8C00'], outerR:24, innerR:10 },
];

// Bases
const BASE_ANGLE        =  Math.PI * 0.5;   // bottom
const BASE_ARC          =  Math.PI * 0.55;
const BASE_TARGET       = { x: CX + Math.cos( Math.PI*0.5)*(R-55), y: CY + Math.sin( Math.PI*0.5)*(R-55) };
const ENEMY_BASE_ANGLE  = -Math.PI * 0.5;   // top
const ENEMY_BASE_ARC    =  Math.PI * 0.55;
const ENEMY_BASE_TARGET = { x: CX + Math.cos(-Math.PI*0.5)*(R-55), y: CY + Math.sin(-Math.PI*0.5)*(R-55) };

let state = {
  coins:30, wave:0, baseHP:100, maxBaseHP:100,
  enemyBaseHP:0, enemyMaxBaseHP:0, waveType:null,
  myDonuts:[], enemies:[], projectiles:[], blocks:[], particles:[], floatingTexts:[],
  waveActive:false, gameOver:false, selectedDonut:null,
};

// ── Drawing helpers ──────────────────────────────────────────────────────────

function generateSprinkles(type) {
  if (!type.sprinkleColors) return [];
  return Array.from({length: 8 + Math.floor(Math.random()*5)}, () => {
    const a  = Math.random()*Math.PI*2;
    const rr = type.innerR + (type.outerR - type.innerR)*(0.25 + Math.random()*0.65);
    return { x:Math.cos(a)*rr, y:Math.sin(a)*rr, rot:Math.random()*Math.PI,
             color:type.sprinkleColors[Math.floor(Math.random()*type.sprinkleColors.length)] };
  });
}

function ringPath(x, y, outerR, innerR) {
  ctx.beginPath();
  ctx.arc(x, y, outerR, 0, Math.PI*2, false);
  ctx.arc(x, y, innerR, 0, Math.PI*2, true);
}

// Face drawn inside the frosting clip so it stays on the ring
function drawFace(x, y, outerR, evil) {
  const eyeR    = outerR * 0.13;
  const eyeY    = y - outerR * 0.44;
  const eyeX    = outerR * 0.30;
  ctx.save();
  // Eye whites
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - eyeX, eyeY, eyeR, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + eyeX, eyeY, eyeR, 0, Math.PI*2); ctx.fill();
  // Pupils (shifted inward for evil, centred for happy)
  ctx.fillStyle = '#111';
  const ps = evil ? eyeR*0.35 : 0;
  ctx.beginPath(); ctx.arc(x - eyeX + ps, eyeY + eyeR*0.2, eyeR*0.55, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + eyeX + ps, eyeY + eyeR*0.2, eyeR*0.55, 0, Math.PI*2); ctx.fill();
  ctx.lineCap = 'round';
  if (evil) {
    // Angry eyebrows slanting inward
    ctx.strokeStyle = '#bb0000';
    ctx.lineWidth = Math.max(1.5, outerR*0.10);
    ctx.beginPath(); ctx.moveTo(x - eyeX - eyeR*1.1, eyeY - eyeR*1.4); ctx.lineTo(x - eyeX + eyeR*0.7, eyeY - eyeR*0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + eyeX + eyeR*1.1, eyeY - eyeR*1.4); ctx.lineTo(x + eyeX - eyeR*0.7, eyeY - eyeR*0.5); ctx.stroke();
    // Wide evil grin
    ctx.strokeStyle = '#cc0000';
    ctx.lineWidth = Math.max(1.5, outerR*0.09);
    ctx.beginPath();
    ctx.arc(x, y + outerR*0.38, outerR*0.30, 0.05*Math.PI, 0.95*Math.PI, false);
    ctx.stroke();
  } else {
    // Cute smile
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    ctx.lineWidth = Math.max(1.2, outerR*0.08);
    ctx.beginPath();
    ctx.arc(x, y + outerR*0.38, outerR*0.24, 0.15*Math.PI, 0.85*Math.PI, false);
    ctx.stroke();
    // Rosy cheeks
    ctx.fillStyle = 'rgba(255,150,150,0.42)';
    ctx.beginPath(); ctx.ellipse(x - eyeX - eyeR, eyeY + eyeR*1.2, eyeR*0.95, eyeR*0.55, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + eyeX + eyeR, eyeY + eyeR*1.2, eyeR*0.95, eyeR*0.55, 0, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function drawPlayerDonut(d) {
  const { x, y, outerR, innerR, doughColor, frostingColor, currentHP, hp } = d;
  const sel = state.selectedDonut === d;
  ctx.save();
  if (sel) { ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 25; }
  // Dough
  ringPath(x, y, outerR, innerR); ctx.fillStyle = doughColor; ctx.fill();
  // Frosting + face + sprinkles, clipped to ring
  ctx.save();
  ringPath(x, y, outerR, innerR); ctx.clip();
  ctx.beginPath(); ctx.arc(x, y - outerR*0.18, outerR*0.88, 0, Math.PI*2);
  ctx.fillStyle = frostingColor; ctx.fill();
  ctx.beginPath(); ctx.arc(x - outerR*0.22, y - outerR*0.42, outerR*0.22, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill();
  d.sprinkles.forEach(s => {
    ctx.save(); ctx.translate(x+s.x, y+s.y); ctx.rotate(s.rot);
    ctx.fillStyle = s.color; ctx.beginPath(); ctx.ellipse(0,0,3.5,1.5,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
  });
  drawFace(x, y, outerR, false);
  ctx.restore();
  // Edge
  ctx.shadowBlur = 0;
  ringPath(x, y, outerR, innerR); ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.5; ctx.stroke();
  // HP bar
  const f = Math.max(0, currentHP/hp);
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x-outerR, y+outerR+4, outerR*2, 4);
  ctx.fillStyle = f>0.5?'#4CAF50':f>0.25?'#FFC107':'#F44336'; ctx.fillRect(x-outerR, y+outerR+4, outerR*2*f, 4);
  // Selection ring
  if (sel) {
    const p = 0.7+0.3*Math.sin(Date.now()/150);
    ctx.beginPath(); ctx.arc(x, y, outerR+6, 0, Math.PI*2);
    ctx.strokeStyle = `rgba(255,215,0,${p})`; ctx.lineWidth = 2.5;
    ctx.setLineDash([6,3]); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawEnemyDonut(e) {
  const { x, y, r, color, hp, maxHP } = e;
  ctx.save();
  ctx.shadowColor = color; ctx.shadowBlur = 14;
  // Dough
  ringPath(x, y, r, r*0.38); ctx.fillStyle = '#5a0000'; ctx.fill();
  // Frosting + face, clipped
  ctx.save();
  ringPath(x, y, r, r*0.38); ctx.clip();
  ctx.beginPath(); ctx.arc(x, y - r*0.12, r*0.86, 0, Math.PI*2); ctx.fillStyle = color; ctx.fill();
  ctx.beginPath(); ctx.arc(x - r*0.2, y - r*0.4, r*0.2, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(255,180,180,0.2)'; ctx.fill();
  drawFace(x, y, r, true);
  ctx.restore();
  ctx.shadowBlur = 0;
  ringPath(x, y, r, r*0.38); ctx.strokeStyle = 'rgba(255,100,100,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  // HP bar
  const f = Math.max(0, hp/maxHP);
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x-r, y+r+4, r*2, 4);
  ctx.fillStyle = f>0.5?'#4CAF50':f>0.25?'#FFC107':'#F44336'; ctx.fillRect(x-r, y+r+4, r*2*f, 4);
  ctx.restore();
}

// ── Lucky blocks ─────────────────────────────────────────────────────────────

const BLOCK_COST = 5;
const LUCKY_TABLE = [
  { w:28,  fn:()=>({ msg:"Nothing but crumbs 💨", cls:'bad' }) },
  { w:22,  fn:()=>{ const n=3+Math.floor(Math.random()*8);  return { coins:n,  msg:`Got ${n} coins! 💰`, cls:'good' }; } },
  { w:12,  fn:()=>{ const n=15+Math.floor(Math.random()*16);return { coins:n,  msg:`Lucky! ${n} coins! 💰`, cls:'good' }; } },
  { w:14,  fn:()=>({ tier:0, msg:'Got a Dirt Donut! 🟤', cls:'good' }) },
  { w:11,  fn:()=>({ tier:1, msg:'Got a Wooden Donut! 🪵', cls:'good' }) },
  { w:7,   fn:()=>({ tier:2, msg:'Stone Donut! 🪨', cls:'good' }) },
  { w:3,   fn:()=>({ tier:3, msg:'Iron Donut! ⚙️', cls:'good' }) },
  { w:2,   fn:()=>({ tier:4, msg:'Choc Chip Donut! 🍫', cls:'good' }) },
  { w:0.8, fn:()=>({ tier:5, msg:'WOW — Diamond Donut! 💎', cls:'good' }) },
  { w:0.15,fn:()=>({ tier:6, msg:'AMAZING — Ruby Donut! 💎', cls:'good' }) },
  { w:0.05,fn:()=>({ tier:7, msg:'🌌 COSMIC DONUT!! UNBELIEVABLE!', cls:'good' }) },
];
const LUCKY_TOTAL = LUCKY_TABLE.reduce((s,r)=>s+r.w, 0);
function rollBlock() {
  let roll = Math.random()*LUCKY_TOTAL;
  for (const r of LUCKY_TABLE) { roll -= r.w; if (roll<=0) return r.fn(); }
  return LUCKY_TABLE[0].fn();
}

function spawnBlocks() {
  state.blocks = [{x:CX,y:CY},{x:CX-42,y:CY-28},{x:CX+42,y:CY-28},
    {x:CX-22,y:CY+42},{x:CX+22,y:CY+42},{x:CX-52,y:CY+8},{x:CX+52,y:CY+8}]
    .map(p=>({...p, hp:3, maxHP:3, shimmer:Math.random()*Math.PI*2}));
}
spawnBlocks();

function openBlock(b) {
  if (state.coins < BLOCK_COST) { logMsg(`Need ${BLOCK_COST} coins to open a block!`,'bad'); return; }
  state.coins -= BLOCK_COST;
  b.hp--;
  spawnParticles(b.x, b.y, '#f4a43a', 8);
  if (b.hp <= 0) {
    spawnParticles(b.x, b.y, '#FFD700', 18);
    DonutAudio.sfxBlockOpen();
    const r = rollBlock();
    if (r.coins)           { state.coins += r.coins; spawnFloat(b.x, b.y-20, `+${r.coins}💰`); }
    if (r.tier !== undefined) {
      const t = DONUT_TYPES[r.tier];
      const p = defaultPos();
      state.myDonuts.push(mkDonut(t.id, p.x, p.y));
      spawnFloat(b.x, b.y-20, t.name+'!');
    }
    logMsg(r.msg, r.cls);
  } else {
    DonutAudio.sfxBlockHit();
    spawnFloat(b.x, b.y-20, `-${BLOCK_COST}💰`);
    logMsg(`Mining… ${b.hp} hit${b.hp>1?'s':''} left.`,'info');
  }
  updateHUD();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function dist(a,b) { return Math.hypot(a.x-b.x, a.y-b.y); }

function mkDonut(typeId, x, y) {
  const t = DONUT_TYPES.find(d=>d.id===typeId)||DONUT_TYPES[0];
  return {...t, x, y, currentHP:t.hp, attackCooldown:0, sprinkles:generateSprinkles(t)};
}

function defaultPos() {
  const a = BASE_ANGLE + (Math.random()-0.5)*BASE_ARC*0.8;
  const r = R - 55 - Math.random()*30;
  return { x:CX+Math.cos(a)*r, y:CY+Math.sin(a)*r };
}

function spawnParticles(x, y, color, n) {
  for (let i=0;i<n;i++) {
    const a=Math.random()*Math.PI*2, s=1.5+Math.random()*3;
    state.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,color,life:35+Math.random()*20,maxLife:55,r:2+Math.random()*3});
  }
}
function spawnFloat(x, y, text) { state.floatingTexts.push({x,y,text,life:70,maxLife:70}); }

function updateHUD() {
  document.getElementById('hud-coins').textContent = state.coins;
  document.getElementById('hud-wave').textContent  = state.wave;
  document.getElementById('hud-hp').textContent    = Math.max(0,Math.round(state.baseHP));
  document.getElementById('hud-donuts').textContent= state.myDonuts.length;
}
function logMsg(msg, cls='') {
  const log=document.getElementById('log');
  const p=document.createElement('p'); p.textContent=msg; if(cls)p.className=cls;
  log.prepend(p); while(log.children.length>20)log.removeChild(log.lastChild);
}
let bannerTimer=0;
function showBanner(text) {
  const b=document.getElementById('wave-banner');
  b.textContent=text; b.style.opacity='1'; bannerTimer=130;
}

// ── Shop ──────────────────────────────────────────────────────────────────────

function openShop() {
  document.getElementById('shop-coin-count').textContent = state.coins;
  const box = document.getElementById('shop-items');
  box.innerHTML = '';
  DONUT_TYPES.forEach(type => {
    const ok = state.coins >= type.cost;
    const row = document.createElement('div');
    row.className = 'shop-item';
    row.innerHTML = `
      <div class="shop-item-left">
        <canvas width="52" height="52" id="prev-${type.id}"></canvas>
        <div class="shop-item-info">
          <div class="shop-item-name">${type.name}</div>
          <div class="shop-item-stat">⚔️ ${type.dmg} &nbsp;❤️ ${type.hp} HP &nbsp;🎯 ${type.range}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="shop-item-price">💰 ${type.cost}</div>
        <button class="buy-btn" ${ok?'':'disabled'} onclick="buyFromShop('${type.id}')">Buy</button>
      </div>`;
    box.appendChild(row);
    requestAnimationFrame(()=>{
      const pc=document.getElementById(`prev-${type.id}`); if(!pc)return;
      const pctx=pc.getContext('2d'), px=26, py=26;
      const OR=type.outerR*1.3, IR=type.innerR*1.3;
      const sp=generateSprinkles(type);
      pctx.beginPath(); pctx.arc(px,py,OR,0,Math.PI*2,false); pctx.arc(px,py,IR,0,Math.PI*2,true);
      pctx.fillStyle=type.doughColor; pctx.fill();
      pctx.save();
      pctx.beginPath(); pctx.arc(px,py,OR,0,Math.PI*2,false); pctx.arc(px,py,IR,0,Math.PI*2,true);
      pctx.clip();
      pctx.beginPath(); pctx.arc(px,py-OR*0.18,OR*0.88,0,Math.PI*2); pctx.fillStyle=type.frostingColor; pctx.fill();
      sp.forEach(s=>{
        pctx.save(); pctx.translate(px+s.x*1.3,py+s.y*1.3); pctx.rotate(s.rot);
        pctx.fillStyle=s.color; pctx.beginPath(); pctx.ellipse(0,0,3.5,1.5,0,0,Math.PI*2); pctx.fill();
        pctx.restore();
      });
      // mini face
      const eR=OR*0.13, eY=py-OR*0.44, eX=OR*0.30;
      pctx.fillStyle='#fff';
      pctx.beginPath();pctx.arc(px-eX,eY,eR,0,Math.PI*2);pctx.fill();
      pctx.beginPath();pctx.arc(px+eX,eY,eR,0,Math.PI*2);pctx.fill();
      pctx.fillStyle='#111';
      pctx.beginPath();pctx.arc(px-eX,eY+eR*0.2,eR*0.55,0,Math.PI*2);pctx.fill();
      pctx.beginPath();pctx.arc(px+eX,eY+eR*0.2,eR*0.55,0,Math.PI*2);pctx.fill();
      pctx.strokeStyle='rgba(0,0,0,0.65)'; pctx.lineWidth=OR*0.08; pctx.lineCap='round';
      pctx.beginPath(); pctx.arc(px,py+OR*0.38,OR*0.24,0.15*Math.PI,0.85*Math.PI,false); pctx.stroke();
      pctx.restore();
    });
  });
  document.getElementById('shop-overlay').classList.add('open');
}
function buyFromShop(id) {
  const t=DONUT_TYPES.find(d=>d.id===id);
  if(!t||state.coins<t.cost){logMsg('Not enough coins!','bad');return;}
  state.coins-=t.cost;
  const p=defaultPos(); state.myDonuts.push(mkDonut(id,p.x,p.y));
  DonutAudio.sfxBuy();
  logMsg(`Bought ${t.name}! Click it to move it.`,'good');
  updateHUD(); openShop();
}
function closeShop(){document.getElementById('shop-overlay').classList.remove('open');}

// ── Mine button ───────────────────────────────────────────────────────────────

function mineBlocks() {
  if (state.gameOver) return;
  if (state.waveActive){logMsg("Can't mine during a wave!",'bad');return;}
  const b=state.blocks.find(b=>b.hp>0);
  if(!b){logMsg('No blocks left — they respawn next wave.','info');return;}
  openBlock(b);
}

// ── Waves ─────────────────────────────────────────────────────────────────────

function mkEnemies(wave, waveType) {
  const count = 2 + Math.floor(wave * 1.2);
  const tiers = [
    {name:'Tiny Evil',  hp:20+wave*8,   dmg:5+wave*2,  speed:0.50+wave*0.05, reward:3,  color:'#ff5555', r:14},
    {name:'Mean Evil',  hp:40+wave*15,  dmg:10+wave*3, speed:0.40+wave*0.04, reward:6,  color:'#cc2222', r:18},
    {name:'Big Evil',   hp:80+wave*25,  dmg:20+wave*5, speed:0.30+wave*0.03, reward:10, color:'#990000', r:24},
    {name:'Mega Evil',  hp:150+wave*40, dmg:35+wave*7, speed:0.25,           reward:18, color:'#660000', r:30},
  ];
  return Array.from({length:count}, (_,i) => {
    const tier = tiers[Math.min(Math.floor(i/3+(wave>3?1:0)), tiers.length-1)];
    // defend: spawn from top arc; attack: spawn near enemy base
    const aRange = waveType==='defend' ? Math.PI : ENEMY_BASE_ARC*0.8;
    const aBase  = waveType==='defend' ? -Math.PI*0.5 : -Math.PI*0.5;
    const a = aBase + (Math.random()-0.5)*aRange;
    return {...tier, maxHP:tier.hp, active:false, attackCooldown:0, spawnDelay:i*65,
            x:CX+Math.cos(a)*(R-22), y:CY+Math.sin(a)*(R-22)};
  });
}

let spawnIdx=0;
function nextWave() {
  if (state.gameOver){resetGame();return;}
  if (state.waveActive){logMsg('Wave already running!','bad');return;}
  if (state.myDonuts.length===0){logMsg('Buy or mine a donut first!','bad');return;}
  state.wave++;
  state.waveType = state.wave%2===1 ? 'defend' : 'attack';
  state.waveActive=true; spawnIdx=0;
  state.enemies = mkEnemies(state.wave, state.waveType);
  spawnBlocks();
  DonutAudio.startMusic();
  if (state.waveType==='defend') {
    DonutAudio.sfxWaveStart();
    showBanner(`🛡️ Wave ${state.wave} — DEFEND!`);
    logMsg(`Wave ${state.wave}: DEFEND! ${state.enemies.length} evil donuts incoming!`,'bad');
  } else {
    state.enemyMaxBaseHP = 60+state.wave*20;
    state.enemyBaseHP    = state.enemyMaxBaseHP;
    DonutAudio.sfxAttackStart();
    showBanner(`⚔️ Wave ${state.wave} — ATTACK!`);
    logMsg(`Wave ${state.wave}: ATTACK! Your donuts advance — destroy the evil base!`,'info');
  }
  updateHUD();
}

// ── Canvas interaction ────────────────────────────────────────────────────────

canvas.addEventListener('mousemove', e=>{
  const {mx,my}=mxy(e);
  canvas.style.cursor = (state.myDonuts.find(d=>dist(d,{x:mx,y:my})<d.outerR+4)||state.selectedDonut) ? 'pointer':'default';
});
canvas.addEventListener('click', e=>{
  const {mx,my}=mxy(e);
  // Block click
  for (const b of state.blocks) {
    if (b.hp>0 && dist(b,{x:mx,y:my})<16) {
      if (state.waveActive){logMsg("Can't mine during a wave!",'bad');return;}
      openBlock(b); return;
    }
  }
  // Select donut
  const hit = state.myDonuts.find(d=>dist(d,{x:mx,y:my})<d.outerR+4);
  if (hit) { state.selectedDonut = state.selectedDonut===hit ? null : hit; return; }
  // Move selected
  if (state.selectedDonut) {
    if (dist({x:mx,y:my},{x:CX,y:CY}) > R-state.selectedDonut.outerR-5) {
      logMsg("Can't place outside the arena!",'bad'); return;
    }
    DonutAudio.resume(); DonutAudio.sfxMove();
    state.selectedDonut.targetX=mx; state.selectedDonut.targetY=my;
    state.selectedDonut=null; canvas.style.cursor='default';
  }
});
canvas.addEventListener('contextmenu',e=>{e.preventDefault();state.selectedDonut=null;canvas.style.cursor='default';});
function mxy(e){const r=canvas.getBoundingClientRect();return{mx:e.clientX-r.left,my:e.clientY-r.top};}

// ── Update ────────────────────────────────────────────────────────────────────

function update() {
  if (state.gameOver) return;
  if (bannerTimer>0&&--bannerTimer===0) document.getElementById('wave-banner').style.opacity='0';

  // Stagger-spawn enemies
  if (state.waveActive && spawnIdx<state.enemies.length) {
    const n=state.enemies[spawnIdx];
    if (n.spawnDelay<=0){n.active=true;spawnIdx++;}else n.spawnDelay--;
  }
  const live = state.enemies.filter(e=>e.active&&e.hp>0);

  if (state.waveType==='defend') tickDefend(live);
  else if (state.waveType==='attack') tickAttack(live);

  state.myDonuts=state.myDonuts.filter(d=>d.currentHP>0);

  // Smooth manual movement (not during auto-advance attack waves)
  if (!state.waveActive || state.waveType!=='attack') {
    state.myDonuts.forEach(d=>{
      if (d.targetX===undefined) return;
      const dx=d.targetX-d.x, dy=d.targetY-d.y, dd=Math.hypot(dx,dy);
      if (dd<3) { d.x=d.targetX; d.y=d.targetY; delete d.targetX; delete d.targetY; spawnParticles(d.x,d.y,d.frostingColor,6); DonutAudio.sfxArrive(); }
      else { d.x+=(dx/dd)*3.5; d.y+=(dy/dd)*3.5; }
    });
  }
  if (state.selectedDonut&&!state.myDonuts.includes(state.selectedDonut)) state.selectedDonut=null;
  state.particles=state.particles.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vx*=0.91;p.vy*=0.91;return--p.life>0;});
  state.floatingTexts=state.floatingTexts.filter(t=>{t.y-=0.8;return--t.life>0;});
}

function shoot(d, target) {
  state.projectiles.push({x:d.x,y:d.y,target,dmg:d.dmg,speed:4+d.speed,color:d.frostingColor,r:5});
  d.attackCooldown=Math.floor(55/d.speed);
  DonutAudio.sfxShoot();
}

function tickProjectiles() {
  state.projectiles=state.projectiles.filter(p=>{
    if(p.target.hp<=0)return false;
    const dx=p.target.x-p.x,dy=p.target.y-p.y,dd=Math.hypot(dx,dy);
    if(dd<p.speed){
      p.target.hp-=p.dmg;
      spawnParticles(p.target.x,p.target.y,p.color,3);
      DonutAudio.sfxHit();
      if(p.target.hp<=0){
        state.coins+=p.target.reward;
        spawnParticles(p.target.x,p.target.y,'#FFD700',14);
        spawnFloat(p.target.x,p.target.y-20,`+${p.target.reward}💰`);
        logMsg(`Defeated ${p.target.name}! +${p.target.reward} coins`,'good');
        DonutAudio.sfxEnemyDie(); DonutAudio.sfxCoin();
        updateHUD();
      }
      return false;
    }
    p.x+=(dx/dd)*p.speed; p.y+=(dy/dd)*p.speed; return true;
  });
}

function tickDefend(live) {
  // Player donuts shoot, stay put
  state.myDonuts.forEach(d=>{
    if(d.attackCooldown>0){d.attackCooldown--;return;}
    let tgt=null,min=Infinity;
    live.forEach(e=>{const dd=dist(d,e);if(dd<d.range&&dd<min){min=dd;tgt=e;}});
    if(tgt)shoot(d,tgt);
  });
  tickProjectiles();
  // Enemies march toward player donuts / base
  live.forEach(e=>{
    let mt=BASE_TARGET,md=dist(e,BASE_TARGET);
    state.myDonuts.forEach(d=>{if(d.currentHP>0){const dd=dist(e,d);if(dd<md){md=dd;mt=d;}}});
    const dx=mt.x-e.x,dy=mt.y-e.y,dd=Math.hypot(dx,dy);
    const stop=mt.currentHP!==undefined?mt.outerR+e.r-2:28;
    if(dd>stop){e.x+=(dx/dd)*e.speed;e.y+=(dy/dd)*e.speed;}
    else if(e.attackCooldown<=0){
      if(mt.currentHP!==undefined){
        mt.currentHP-=e.dmg*0.5; spawnParticles(mt.x,mt.y,'#ff4444',4);
        if(mt.currentHP<=0)logMsg(`${mt.name} destroyed! 💥`,'bad');
      } else {
        state.baseHP-=e.dmg*0.04; spawnParticles(BASE_TARGET.x,BASE_TARGET.y,'#ff4444',3);
        DonutAudio.sfxBaseHit();
        if(state.baseHP<=0){state.baseHP=0;state.gameOver=true;showBanner('💀 GAME OVER!');logMsg('Base destroyed! Click Next Wave to restart.','bad');DonutAudio.sfxGameOver();DonutAudio.stopMusic();}
      }
      e.attackCooldown=90;
    } else e.attackCooldown--;
  });
  const anySpawnedD = state.enemies.some(e=>e.active);
  if(state.waveActive&&anySpawnedD&&live.length===0){
    state.waveActive=false;
    const b=state.wave*5; state.coins+=b; state.baseHP=Math.min(state.maxBaseHP,state.baseHP+15);
    state.myDonuts.forEach(d=>{ d.currentHP=d.hp; delete d.targetX; delete d.targetY; });
    DonutAudio.sfxWaveWin();
    logMsg(`🛡️ Defended! +${b} coins. Surviving donuts healed! Next: ATTACK!`,'good');
    showBanner(`✅ Defended! Next: ATTACK`);
    updateHUD();
  } else if(state.waveActive&&state.myDonuts.length===0){
    state.waveActive=false;
    DonutAudio.sfxWaveLose();
    logMsg('All your donuts were destroyed — the evil donuts win this wave!','bad');
    showBanner('💀 Wave Lost!');
    updateHUD();
  }
}

function tickAttack(live) {
  // Player donuts auto-advance toward enemy base; stop to fight enemies
  state.myDonuts.forEach(d=>{
    // Move: head toward closest enemy (if within 1.5× range) else toward enemy base
    let moveTgt=ENEMY_BASE_TARGET;
    let best=null,bestD=Infinity;
    live.forEach(e=>{const dd=dist(d,e);if(dd<d.range*1.5&&dd<bestD){bestD=dd;best=e;}});
    if(best)moveTgt=best;
    const dx=moveTgt.x-d.x,dy=moveTgt.y-d.y,dd=Math.hypot(dx,dy);
    const stop=moveTgt===ENEMY_BASE_TARGET?38:moveTgt.r+d.outerR-2;
    if(dd>stop){d.x+=(dx/dd)*d.speed*0.45;d.y+=(dy/dd)*d.speed*0.45;}
    // Shoot enemies in range
    if(d.attackCooldown>0){d.attackCooldown--;return;}
    let tgt=null,min=Infinity;
    live.forEach(e=>{const dd=dist(d,e);if(dd<d.range&&dd<min){min=dd;tgt=e;}});
    if(tgt){shoot(d,tgt);}
    else if(dist(d,ENEMY_BASE_TARGET)<50){
      // Attack the evil base directly
      state.enemyBaseHP=Math.max(0,state.enemyBaseHP-d.dmg*0.08);
      spawnParticles(ENEMY_BASE_TARGET.x,ENEMY_BASE_TARGET.y,'#f4a43a',3);
      d.attackCooldown=55;
    }
  });
  tickProjectiles();
  // Evil donuts intercept player donuts (don't go for player base)
  live.forEach(e=>{
    let tgt=null,min=Infinity;
    state.myDonuts.forEach(d=>{if(d.currentHP>0){const dd=dist(e,d);if(dd<min){min=dd;tgt=d;}}});
    if(!tgt)return;
    const dx=tgt.x-e.x,dy=tgt.y-e.y,dd=Math.hypot(dx,dy);
    const stop=tgt.outerR+e.r-2;
    if(dd>stop){e.x+=(dx/dd)*e.speed;e.y+=(dy/dd)*e.speed;}
    else if(e.attackCooldown<=0){
      tgt.currentHP-=e.dmg*0.5; spawnParticles(tgt.x,tgt.y,'#ff4444',4);
      if(tgt.currentHP<=0)logMsg(`${tgt.name} destroyed! 💥`,'bad');
      e.attackCooldown=90;
    } else e.attackCooldown--;
  });
  if(!state.waveActive)return;
  const anySpawnedA = state.enemies.some(e=>e.active);
  if(state.enemyBaseHP<=0||(anySpawnedA&&live.length===0)){
    state.waveActive=false;
    const b=state.wave*8; state.coins+=b;
    state.myDonuts.forEach(d=>{ d.currentHP=d.hp; delete d.targetX; delete d.targetY; });
    DonutAudio.sfxWaveWin();
    logMsg(`⚔️ Attack success! +${b} coins. Surviving donuts healed! Next: DEFEND!`,'good');
    showBanner(`✅ Attack Success!`);
    updateHUD();
  } else if(state.myDonuts.length===0){
    state.waveActive=false;
    DonutAudio.sfxWaveLose();
    logMsg('All your donuts fell! Attack failed. Buy more, then try again.','bad');
    showBanner('💀 Attack Failed!');
    updateHUD();
  }
}

// ── Draw ──────────────────────────────────────────────────────────────────────

function draw() {
  ctx.clearRect(0,0,600,600);

  // Arena background
  const g=ctx.createRadialGradient(CX,CY,0,CX,CY,R);
  g.addColorStop(0,'#2e1500'); g.addColorStop(1,'#0a0400');
  ctx.beginPath();ctx.arc(CX,CY,R,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();
  ctx.beginPath();ctx.arc(CX,CY,R,0,Math.PI*2);ctx.strokeStyle='#f4a43a66';ctx.lineWidth=3;ctx.stroke();

  // Center zone
  ctx.beginPath();ctx.arc(CX,CY,82,0,Math.PI*2);
  ctx.fillStyle='rgba(244,164,58,0.06)';ctx.fill();
  ctx.strokeStyle='#f4a43a44';ctx.lineWidth=1.5;ctx.stroke();

  // Player base arc (bottom)
  ctx.beginPath();ctx.arc(CX,CY,R-28,BASE_ANGLE-BASE_ARC/2,BASE_ANGLE+BASE_ARC/2);
  ctx.strokeStyle='#4CAF5055';ctx.lineWidth=9;ctx.stroke();
  const bFrac=state.baseHP/state.maxBaseHP;
  ctx.beginPath();ctx.arc(CX,CY,R-28,BASE_ANGLE-BASE_ARC*bFrac/2,BASE_ANGLE+BASE_ARC*bFrac/2);
  ctx.strokeStyle=bFrac>0.5?'#4CAF50':bFrac>0.25?'#FFC107':'#F44336';ctx.lineWidth=5;ctx.stroke();
  ctx.fillStyle='#4CAF50';ctx.font='bold 12px Segoe UI';ctx.textAlign='center';ctx.textBaseline='alphabetic';
  ctx.fillText('YOUR BASE',CX+Math.cos(BASE_ANGLE)*(R-12),CY+Math.sin(BASE_ANGLE)*(R-8));

  // Enemy base arc (top) — always shown
  ctx.beginPath();ctx.arc(CX,CY,R-28,ENEMY_BASE_ANGLE-ENEMY_BASE_ARC/2,ENEMY_BASE_ANGLE+ENEMY_BASE_ARC/2);
  ctx.strokeStyle='#cc000055';ctx.lineWidth=9;ctx.stroke();
  if(state.waveType==='attack'&&state.enemyBaseHP>0){
    const ef=state.enemyBaseHP/state.enemyMaxBaseHP;
    ctx.beginPath();ctx.arc(CX,CY,R-28,ENEMY_BASE_ANGLE-ENEMY_BASE_ARC*ef/2,ENEMY_BASE_ANGLE+ENEMY_BASE_ARC*ef/2);
    ctx.strokeStyle=ef>0.5?'#cc0000':ef>0.25?'#ff6600':'#ff9900';ctx.lineWidth=5;ctx.stroke();
  }
  ctx.fillStyle='#cc0000';ctx.font='bold 12px Segoe UI';ctx.textAlign='center';
  ctx.fillText('EVIL BASE',CX+Math.cos(ENEMY_BASE_ANGLE)*(R-12),CY+Math.sin(ENEMY_BASE_ANGLE)*(R-8));

  // Attack wave: direction arrow
  if(state.waveType==='attack'&&state.waveActive){
    const pulse=0.25+0.15*Math.sin(Date.now()/300);
    ctx.save();ctx.globalAlpha=pulse;
    ctx.strokeStyle='#f4a43a';ctx.lineWidth=2;ctx.setLineDash([8,6]);
    ctx.beginPath();ctx.moveTo(CX,CY+60);ctx.lineTo(CX,CY-60);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#f4a43a';ctx.beginPath();ctx.moveTo(CX,CY-65);ctx.lineTo(CX-7,CY-50);ctx.lineTo(CX+7,CY-50);ctx.closePath();ctx.fill();
    ctx.restore();
  }

  // Lucky blocks
  const t=Date.now()/1000;
  state.blocks.forEach(b=>{
    if(b.hp<=0)return;
    const sh=0.75+0.25*Math.sin(t*2.5+b.shimmer), sz=22;
    ctx.save();ctx.shadowColor='#f4a43a';ctx.shadowBlur=14*sh*(b.hp/b.maxHP);
    ctx.beginPath();ctx.roundRect(b.x-sz/2,b.y-sz/2,sz,sz,5);
    const bg=ctx.createLinearGradient(b.x-sz/2,b.y-sz/2,b.x+sz/2,b.y+sz/2);
    bg.addColorStop(0,`rgba(255,210,0,${sh})`);bg.addColorStop(1,`rgba(200,140,0,${sh})`);
    ctx.fillStyle=bg;ctx.fill();
    ctx.strokeStyle=`rgba(255,240,100,${sh})`;ctx.lineWidth=2;ctx.stroke();
    ctx.shadowBlur=0;
    ctx.fillStyle='#fff';ctx.font='bold 13px Segoe UI';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('?',b.x,b.y);
    ctx.font='9px Segoe UI';ctx.fillStyle='#fff8';ctx.fillText('5💰',b.x,b.y+sz/2+9);
    for(let i=0;i<b.maxHP;i++){ctx.beginPath();ctx.arc(b.x-(b.maxHP-1)*5+i*10,b.y-sz/2-7,3.5,0,Math.PI*2);ctx.fillStyle=i<b.hp?'#FFD700':'#444';ctx.fill();}
    ctx.restore();
  });
  if(state.blocks.some(b=>b.hp>0)){
    ctx.fillStyle='#f4a43a77';ctx.font='bold 10px Segoe UI';ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('LUCKY BLOCKS',CX,CY-64);
  }

  // Move indicator
  if(state.selectedDonut){
    const p=0.3+0.3*Math.sin(Date.now()/200);
    ctx.beginPath();ctx.arc(CX,CY,R-5,0,Math.PI*2);ctx.fillStyle=`rgba(255,215,0,${p*0.08})`;ctx.fill();
    ctx.fillStyle=`rgba(255,215,0,${0.5+p})`;ctx.font='12px Segoe UI';ctx.textAlign='center';
    ctx.fillText('Click to place',CX,CY+100);
    // Range preview
    const d=state.selectedDonut;
    ctx.beginPath();ctx.arc(d.x,d.y,d.range,0,Math.PI*2);
    ctx.strokeStyle='rgba(255,215,0,0.3)';ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.stroke();ctx.setLineDash([]);
  }

  // Player donuts
  state.myDonuts.forEach(d=>{if(d.currentHP>0)drawPlayerDonut(d);});

  // Projectiles (mini donuts)
  state.projectiles.forEach(p=>{
    ctx.save();ctx.shadowColor=p.color;ctx.shadowBlur=8;
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2,false);ctx.arc(p.x,p.y,p.r*0.4,0,Math.PI*2,true);
    ctx.fillStyle=p.color;ctx.fill();ctx.restore();
  });

  // Enemies
  state.enemies.filter(e=>e.active&&e.hp>0).forEach(e=>drawEnemyDonut(e));

  // Particles
  state.particles.forEach(p=>{
    const a=p.life/p.maxLife;
    ctx.beginPath();ctx.arc(p.x,p.y,p.r*a,0,Math.PI*2);
    ctx.fillStyle=p.color;ctx.globalAlpha=a;ctx.fill();ctx.globalAlpha=1;
  });

  // Floating texts
  state.floatingTexts.forEach(ft=>{
    ctx.save();ctx.globalAlpha=ft.life/ft.maxLife;
    ctx.fillStyle='#FFD700';ctx.font='bold 13px Segoe UI';ctx.textAlign='center';
    ctx.shadowColor='#000';ctx.shadowBlur=4;ctx.fillText(ft.text,ft.x,ft.y);ctx.restore();
  });

  // Game over
  if(state.gameOver){
    ctx.fillStyle='rgba(0,0,0,0.65)';ctx.beginPath();ctx.arc(CX,CY,R,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ff4444';ctx.font='bold 36px Segoe UI';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('💀 GAME OVER',CX,CY-22);
    ctx.fillStyle='#fff';ctx.font='17px Segoe UI';ctx.fillText('Click "Next Wave" to restart',CX,CY+20);
    ctx.textBaseline='alphabetic';
  }
}

// ── Reset & boot ──────────────────────────────────────────────────────────────

function resetGame() {
  Object.assign(state,{
    coins:30,wave:0,baseHP:100,maxBaseHP:100,enemyBaseHP:0,enemyMaxBaseHP:0,waveType:null,
    myDonuts:[],enemies:[],projectiles:[],particles:[],floatingTexts:[],
    waveActive:false,gameOver:false,selectedDonut:null,
  });
  spawnIdx=0; spawnBlocks();
  DonutAudio.stopMusic();
  logMsg('New game! Wave 1 = DEFEND. Wave 2 = ATTACK. Alternates each round.','info');
  showBanner('🍩 NEW GAME!'); updateHUD();
}

function toggleMute() {
  const muted = DonutAudio.toggleMute();
  document.getElementById('mute-btn').textContent = muted ? '🔇' : '🔊';
}

function gameLoop(){update();draw();requestAnimationFrame(gameLoop);}

logMsg('Welcome Noah! 🍩  Wave 1 = DEFEND your base. Wave 2 = ATTACK theirs. Alternates!','info');
updateHUD();
gameLoop();
