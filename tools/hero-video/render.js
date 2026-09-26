// Borda Chaca — illustrated hero loop. Renders a seamless 16s loop at 1920x1080.
// Usage: node render.js --preview <t> out.png   |   node render.js out.mp4 poster.jpg
const { createCanvas } = require('@napi-rs/canvas');
const { spawn } = require('child_process');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');

const W = 1920, H = 1080, FPS = 30, T = 16, FRAMES = FPS * T;
const M = 90; // parallax margin
const LW = W + 2 * M;
const TAU = Math.PI * 2;

// ---------- utils ----------
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const R = rng(20180901);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// periodic noise in [−1,1] that loops exactly every T seconds
function pn(t, seed, ks = [1, 2, 3, 5]) {
  let s = 0, n = 0; const r = rng(seed);
  for (const k of ks) { const a = 1 / k; s += a * Math.sin(TAU * k * t / T + r() * TAU); n += a; }
  return s / n;
}
function valueNoise1D(seed) {
  const r = rng(seed), pts = Array.from({ length: 512 }, r);
  return x => { const i = Math.floor(x), f = x - i, a = pts[((i % 512) + 512) % 512], b = pts[(((i + 1) % 512) + 512) % 512]; const u = f * f * (3 - 2 * f); return lerp(a, b, u); };
}
function fbm(noise, x, oct = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * noise(x * f); a *= 0.5; f *= 2; } return s; }
function layer(w = LW, h = H) { const c = createCanvas(w, h); return [c, c.getContext('2d')]; }
function softSprite(size, color, stops = [[0, 1], [0.45, 0.45], [1, 0]]) {
  const [c, x] = layer(size, size); const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, a] of stops) g.addColorStop(o, `rgba(${color},${a})`);
  x.fillStyle = g; x.fillRect(0, 0, size, size); return c;
}
// ridge path: control points interpolated + fractal roughness
function ridgePoints(ctrl, rough, seed, step = 4) {
  const nz = valueNoise1D(seed), out = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const [x0, y0] = ctrl[i], [x1, y1] = ctrl[i + 1];
    for (let x = x0; x < x1; x += step) { const t = (x - x0) / (x1 - x0); const u = t * t * (3 - 2 * t); out.push([x, lerp(y0, y1, u) + (fbm(nz, x / 90) - 0.5) * rough]); }
  }
  out.push(ctrl[ctrl.length - 1]); return out;
}
function fillRidge(ctx, pts, bottom, fill) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], bottom); for (const [x, y] of pts) ctx.lineTo(x, y); ctx.lineTo(pts[pts.length - 1][0], bottom); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
const yAt = (pts, x) => { for (let i = 1; i < pts.length; i++) if (pts[i][0] >= x) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return lerp(y0, y1, (x - x0) / (x1 - x0 || 1)); } return pts[pts.length - 1][1]; };

// ---------- palette ----------
const P = {
  skyTop: '#0b1122', skyMid: '#1f2745', skyLow: '#5b3f5c', horizon: '#d98b62', glow: '#f4b27a',
  far: '#4a4f72', oroel: '#2b3050', oroelLow: '#1b2036', cliffLit: '#d49a86', cliffDark: '#7b5566',
  hills: '#161d2e', hillsLow: '#10151f', meadow: '#0f1519', warm: '255,170,90', ember: '255,120,40',
};

// ---------- static layers ----------
// Sky (depth .03)
const [sky, sx] = layer();
{
  const g = sx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, P.skyTop); g.addColorStop(0.32, P.skyMid); g.addColorStop(0.55, P.skyLow); g.addColorStop(0.66, P.horizon); g.addColorStop(0.75, P.glow);
  sx.fillStyle = g; sx.fillRect(0, 0, LW, H);
  // warm sunset bloom behind the mountain
  const b = sx.createRadialGradient(LW * 0.42, H * 0.7, 10, LW * 0.42, H * 0.7, 900);
  b.addColorStop(0, 'rgba(255,190,130,.55)'); b.addColorStop(0.4, 'rgba(230,130,110,.18)'); b.addColorStop(1, 'rgba(0,0,0,0)');
  sx.fillStyle = b; sx.fillRect(0, 0, LW, H);
}
// Stars
const stars = Array.from({ length: 320 }, () => { const y = Math.pow(R(), 1.7) * H * 0.55; return { x: R() * LW, y, r: R() < 0.08 ? 1.6 + R() : 0.5 + R() * 0.9, a: (1 - y / (H * 0.58)) * (0.35 + R() * 0.65), k: 1 + Math.floor(R() * 4), ph: R() * TAU }; });
// Moon
const moon = (() => {
  const [c, x] = layer(420, 420); const cx = 210, cy = 210;
  const g = x.createRadialGradient(cx, cy, 20, cx, cy, 210); g.addColorStop(0, 'rgba(255,236,200,.35)'); g.addColorStop(0.25, 'rgba(255,230,190,.10)'); g.addColorStop(1, 'rgba(255,230,190,0)');
  x.fillStyle = g; x.fillRect(0, 0, 420, 420);
  const [m, mx] = layer(80, 80); mx.beginPath(); mx.arc(40, 40, 30, 0, TAU); mx.fillStyle = '#fbeed2'; mx.fill();
  mx.globalCompositeOperation = 'destination-out'; mx.beginPath(); mx.arc(53, 32, 27, 0, TAU); mx.fill();
  x.drawImage(m, cx - 40, cy - 40); return c;
})();
// Clouds: long wispy stratus sprite (tileable horizontally)
function cloudBand(seed, w, h, color, count) {
  const r = rng(seed); const [c, x] = layer(w, h); const puff = softSprite(256, color, [[0, 0.55], [0.5, 0.22], [1, 0]]);
  for (let i = 0; i < count; i++) { const px = r() * w, py = h * 0.5 + (r() - 0.5) * h * 0.35, pw = 180 + r() * 420, ph = 20 + r() * 45;
    for (const off of [-w, 0, w]) x.drawImage(puff, px - pw / 2 + off, py - ph / 2, pw, ph); }
  return c;
}
const cloudsA = cloudBand(7, 2400, 200, '232,170,160', 70);
const cloudsB = cloudBand(11, 2400, 160, '120,110,160', 60);
// Far range (depth .12)
const [far, fx] = layer();
{
  const pts = ridgePoints([[0, 700], [250, 640], [520, 670], [760, 610], [1000, 655], [1300, 600], [1600, 640], [1850, 590], [LW, 650]], 38, 3);
  const g = fx.createLinearGradient(0, 580, 0, 800); g.addColorStop(0, '#6f6784'); g.addColorStop(1, '#3d4262');
  fillRidge(fx, pts, H, g);
}
// Peña Oroel (depth .22)
const [oroel, ox] = layer();
const oroelTop = ridgePoints([[-10, 790], [200, 720], [420, 590], [560, 470], [610, 392], [640, 350], [700, 336], [880, 344], [1060, 356], [1180, 372], [1260, 402], [1340, 470], [1480, 560], [1650, 640], [1900, 700], [LW + 10, 740]], 22, 5, 3);
{
  const g = ox.createLinearGradient(0, 330, 0, 900); g.addColorStop(0, P.oroel); g.addColorStop(1, P.oroelLow);
  fillRidge(ox, oroelTop, H, g);
  // lit cliff band (alpenglow) — clipped to the massif
  ox.save(); ox.beginPath(); ox.moveTo(0, H); for (const [x, y] of oroelTop) ox.lineTo(x, y); ox.lineTo(LW, H); ox.closePath(); ox.clip();
  const nz = valueNoise1D(9);
  ox.beginPath();
  const x0 = 560, x1 = 1330;
  ox.moveTo(x0, yAt(oroelTop, x0));
  for (let x = x0; x <= x1; x += 4) ox.lineTo(x, yAt(oroelTop, x) - 2);
  for (let x = x1; x >= x0; x -= 4) { const edge = Math.sin(clamp((x - x0) / (x1 - x0), 0, 1) * Math.PI); ox.lineTo(x, yAt(oroelTop, x) + 20 + edge * (110 + fbm(nz, x / 40) * 70)); }
  ox.closePath();
  const cg = ox.createLinearGradient(0, 336, 0, 560); cg.addColorStop(0, 'rgba(214,150,128,.95)'); cg.addColorStop(0.35, 'rgba(170,108,116,.75)'); cg.addColorStop(0.75, 'rgba(110,78,104,.35)'); cg.addColorStop(1, 'rgba(60,50,80,0)');
  ox.fillStyle = cg; ox.fill();
  // rock strata
  ox.strokeStyle = 'rgba(70,45,70,.16)'; ox.lineWidth = 1.2;
  for (let i = 0; i < 7; i++) { const oy = 14 + i * 13; ox.beginPath(); for (let x = x0 + 30; x < x1 - 30; x += 6) { const y = yAt(oroelTop, x) + oy + (fbm(nz, x / 25 + i * 7) - 0.5) * 10; x === x0 + 30 ? ox.moveTo(x, y) : ox.lineTo(x, y); } ox.stroke(); }
  // vertical cracks
  ox.strokeStyle = 'rgba(70,40,60,.14)'; ox.lineWidth = 1;
  for (let i = 0; i < 28; i++) { const x = x0 + 40 + R() * (x1 - x0 - 80), y = yAt(oroelTop, x) + 6; ox.beginPath(); ox.moveTo(x, y); ox.lineTo(x + (R() - 0.5) * 8, y + 20 + R() * 45); ox.stroke(); }
  // forest texture on the slopes
  for (let i = 0; i < 2600; i++) {
    const x = R() * LW, top = yAt(oroelTop, x), y = top + 140 + R() * (H - top);
    if (y < top + 60) continue; const s = 3 + R() * 5;
    ox.fillStyle = `rgba(${14 + R() * 12},${20 + R() * 16},${34 + R() * 16},${0.35 + R() * 0.4})`;
    ox.beginPath(); ox.moveTo(x, y - s * 2.2); ox.lineTo(x + s, y); ox.lineTo(x - s, y); ox.closePath(); ox.fill();
  }
  // atmospheric haze toward the base
  const hz = ox.createLinearGradient(0, 560, 0, 860); hz.addColorStop(0, 'rgba(120,100,140,0)'); hz.addColorStop(1, 'rgba(150,110,140,.35)');
  ox.fillStyle = hz; ox.fillRect(0, 0, LW, H);
  ox.restore();
  // rim light on the summit edge
  ox.strokeStyle = 'rgba(255,205,170,.5)'; ox.lineWidth = 1.5; ox.beginPath();
  for (const [x, y] of oroelTop) if (x > 540 && x < 1300) ox.lineTo(x, y + 1); ox.stroke();
}
// Mist band sprite
const mist = cloudBand(21, 2600, 180, '190,160,190', 90);
// Pine helper
function pine(ctx, x, y, h, col) {
  const w = h * 0.36; ctx.fillStyle = col; ctx.beginPath();
  const tiers = 5; ctx.moveTo(x, y - h);
  for (let i = 1; i <= tiers; i++) { const ty = y - h + (h * 0.88) * i / tiers, tw = w * (0.35 + 0.65 * i / tiers); ctx.lineTo(x + tw, ty); ctx.lineTo(x + tw * 0.45, ty - 1); }
  for (let i = tiers; i >= 1; i--) { const ty = y - h + (h * 0.88) * i / tiers, tw = w * (0.35 + 0.65 * i / tiers); ctx.lineTo(x - tw * 0.45, ty - 1); ctx.lineTo(x - tw, ty); }
  ctx.closePath(); ctx.fill(); ctx.fillRect(x - h * 0.03, y - h * 0.13, h * 0.06, h * 0.14);
}
// Mid hills with pines (depth .45)
const [hills, hx] = layer();
const hillsTop = ridgePoints([[-10, 830], [240, 790], [520, 812], [760, 770], [980, 800], [1250, 760], [1500, 790], [1760, 752], [LW + 10, 790]], 16, 13);
{
  const g = hx.createLinearGradient(0, 740, 0, H); g.addColorStop(0, P.hills); g.addColorStop(1, P.hillsLow); fillRidge(hx, hillsTop, H, g);
  for (let x = -10; x < LW; x += 7 + R() * 16) { const y = yAt(hillsTop, x) + 6 + R() * 10; pine(hx, x, y, 26 + R() * 40, `rgb(${16 + R() * 6},${22 + R() * 8},${34 + R() * 8})`); }
  const hz = hx.createLinearGradient(0, 740, 0, 900); hz.addColorStop(0, 'rgba(130,100,130,.18)'); hz.addColorStop(1, 'rgba(0,0,0,0)'); hx.fillStyle = hz; hx.fillRect(0, 700, LW, 300);
}

// ---------- the borda (depth .8) ----------
const BX = 1180 + M, BW = 400, BASE = 905, EAVE = 680, PEAK = 505, CX = BX + BW / 2; // main gable house
const LX0 = 985 + M; // lean-to porch start (x)
const [borda, bx] = layer();
const meadowTop = ridgePoints([[-10, 915], [300, 900], [700, 895], [1000, 900], [1300, 905], [1700, 895], [LW + 10, 880]], 10, 17);
function stoneWall(ctx, x, y, w, h, seed) {
  const r = rng(seed); ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = '#4a443e'; ctx.fillRect(x, y, w, h);
  let cy = y + h; while (cy > y - 30) { const ch = 14 + r() * 12; let cx = x - r() * 30; while (cx < x + w) { const sw = 22 + r() * 40; const t = 120 + r() * 50, wr = 0.9 + r() * 0.1;
    ctx.fillStyle = `rgb(${t * wr + 10 | 0},${t * 0.93 * wr | 0},${t * 0.82 * wr | 0})`; ctx.beginPath(); ctx.roundRect(cx + 1.5, cy - ch + 1.5, sw - 3, ch - 3, 4 + r() * 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,220,.07)'; ctx.fillRect(cx + 3, cy - ch + 2, sw - 8, 2); cx += sw; } cy -= ch; }
  // dusk grade
  ctx.globalCompositeOperation = 'multiply'; const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#6f6f95'); g.addColorStop(1, '#3b3d5c'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.restore();
}
{
  // ground
  const g = bx.createLinearGradient(0, 880, 0, H); g.addColorStop(0, '#18211f'); g.addColorStop(1, '#0a0e10'); fillRidge(bx, meadowTop, H, g);
  // lean-to porch (comedor/terraza cubierta)
  const px0 = LX0, px1 = BX, pTopL = 800, pTopR = 740;
  bx.fillStyle = '#1a1511'; bx.fillRect(px0 + 6, pTopL, px1 - px0 - 6, BASE - pTopL); // interior back
  const ig = bx.createLinearGradient(0, pTopL, 0, BASE); ig.addColorStop(0, 'rgba(255,170,90,.55)'); ig.addColorStop(1, 'rgba(255,140,60,.25)'); bx.fillStyle = ig; bx.fillRect(px0 + 6, pTopL + 8, px1 - px0 - 6, BASE - pTopL - 8);
  bx.fillStyle = '#1b120c'; for (const x of [px0 + 40, px0 + 140]) { bx.beginPath(); bx.ellipse(x, BASE - 58, 26, 5, 0, 0, TAU); bx.fill(); bx.beginPath(); bx.arc(x - 30, BASE - 70, 9, 0, TAU); bx.fill(); bx.fillRect(x - 38, BASE - 62, 16, 24); bx.beginPath(); bx.arc(x + 30, BASE - 72, 9, 0, TAU); bx.fill(); bx.fillRect(x + 22, BASE - 64, 16, 26); }
  bx.strokeStyle = '#1b120c'; bx.lineWidth = 1.5; for (const x of [px0 + 40, px0 + 140]) { bx.beginPath(); bx.moveTo(x, pTopL - 12 + (x - px0) * -0.3); bx.lineTo(x, 836); bx.stroke(); bx.fillStyle = '#ffd08a'; bx.beginPath(); bx.arc(x, 840, 6, Math.PI, 0); bx.fill(); }
  stoneWall(bx, px0, BASE - 38, px1 - px0, 38, 4); // low parapet
  // posts
  bx.fillStyle = '#2a1d14'; for (const x of [px0, px0 + 95]) bx.fillRect(x, pTopL - 4, 10, BASE - pTopL);
  // porch roof
  bx.beginPath(); bx.moveTo(px0 - 26, pTopL + 4); bx.lineTo(px1 + 4, pTopR - 20); bx.lineTo(px1 + 4, pTopR - 6); bx.lineTo(px0 - 26, pTopL + 18); bx.closePath(); bx.fillStyle = '#23252e'; bx.fill();
  bx.strokeStyle = 'rgba(160,170,210,.35)'; bx.lineWidth = 1.5; bx.beginPath(); bx.moveTo(px0 - 26, pTopL + 4); bx.lineTo(px1 + 4, pTopR - 20); bx.stroke();
  // main walls
  stoneWall(bx, BX, EAVE, BW, BASE - EAVE, 1);
  bx.save(); bx.beginPath(); bx.moveTo(BX + 6, EAVE + 1); bx.lineTo(CX, PEAK + 22); bx.lineTo(BX + BW - 6, EAVE + 1); bx.closePath(); bx.clip(); stoneWall(bx, BX, PEAK, BW, EAVE - PEAK + 2, 2); bx.restore();
  // corner quoins
  for (const qx of [BX, BX + BW - 26]) for (let y = BASE - 30, i = 0; y > EAVE; y -= 30, i++) { bx.fillStyle = 'rgba(150,145,160,.55)'; bx.fillRect(qx + (i % 2 ? 0 : (qx === BX ? 0 : -10)), y, i % 2 ? 26 : 36, 26); }
  // roof (steep, slate)
  const ov = 34;
  bx.beginPath(); bx.moveTo(BX - ov, EAVE + 16); bx.lineTo(CX, PEAK - 18); bx.lineTo(BX + BW + ov, EAVE + 16); bx.lineTo(BX + BW + ov - 8, EAVE + 26); bx.lineTo(CX, PEAK - 4); bx.lineTo(BX - ov + 8, EAVE + 26); bx.closePath();
  bx.fillStyle = '#1d1f27'; bx.fill();
  // visible roof plane on right side (perspective hint)
  bx.beginPath(); bx.moveTo(CX, PEAK - 18); bx.lineTo(CX + 150, PEAK - 44); bx.lineTo(BX + BW + ov + 140, EAVE - 6); bx.lineTo(BX + BW + ov, EAVE + 16); bx.closePath();
  const rg = bx.createLinearGradient(CX, PEAK, BX + BW + 150, EAVE); rg.addColorStop(0, '#3a3f55'); rg.addColorStop(1, '#262a3a'); bx.fillStyle = rg; bx.fill();
  bx.save(); bx.clip();
  bx.strokeStyle = 'rgba(10,12,20,.55)'; bx.lineWidth = 1.2;
  for (let i = 0; i < 16; i++) { const t = i / 15; bx.beginPath(); bx.moveTo(lerp(CX, BX + BW + ov, t), lerp(PEAK - 18, EAVE + 16, t)); bx.lineTo(lerp(CX + 150, BX + BW + ov + 140, t), lerp(PEAK - 44, EAVE - 6, t)); bx.stroke();
    for (let s = 0; s < 14; s++) { const u = (s + (i % 2) * 0.5) / 14; const ax = lerp(lerp(CX, BX + BW + ov, t), lerp(CX + 150, BX + BW + ov + 140, t), u), ay = lerp(lerp(PEAK - 18, EAVE + 16, t), lerp(PEAK - 44, EAVE - 6, t), u); bx.beginPath(); bx.moveTo(ax, ay); bx.lineTo(ax - 2, ay - 12); bx.stroke(); } }
  bx.restore();
  // moonlit rim on ridge + fascia boards
  bx.strokeStyle = 'rgba(190,200,235,.55)'; bx.lineWidth = 2; bx.beginPath(); bx.moveTo(CX, PEAK - 18); bx.lineTo(CX + 150, PEAK - 44); bx.stroke();
  bx.strokeStyle = '#3a2618'; bx.lineWidth = 7; bx.beginPath(); bx.moveTo(BX - ov + 4, EAVE + 20); bx.lineTo(CX, PEAK - 10); bx.lineTo(BX + BW + ov - 4, EAVE + 20); bx.stroke();
  // beam ends under the eaves
  bx.fillStyle = '#4a3322'; for (let i = 0; i < 5; i++) { const t = (i + 0.5) / 5; const x = lerp(BX + 10, CX - 20, t), y = lerp(EAVE + 6, PEAK + 26, t); bx.beginPath(); bx.arc(x, y + 14, 6, 0, TAU); bx.fill(); const x2 = 2 * CX - x; bx.beginPath(); bx.arc(x2, y + 14, 6, 0, TAU); bx.fill(); }
  // Aragonese troncoconic chimney
  const chx = CX + 100, chB = PEAK - 20;
  bx.save(); bx.beginPath(); bx.moveTo(chx - 40, chB + 40); bx.lineTo(chx - 26, chB - 92); bx.lineTo(chx + 26, chB - 92); bx.lineTo(chx + 40, chB + 40); bx.closePath(); bx.clip();
  stoneWall(bx, chx - 40, chB - 92, 80, 132, 31);
  const chg = bx.createLinearGradient(chx - 40, 0, chx + 40, 0); chg.addColorStop(0, 'rgba(160,170,210,.18)'); chg.addColorStop(0.4, 'rgba(0,0,0,0)'); chg.addColorStop(1, 'rgba(0,0,10,.45)'); bx.fillStyle = chg; bx.fillRect(chx - 40, chB - 92, 80, 132); bx.restore();
  bx.fillStyle = '#23232e'; bx.beginPath(); bx.moveTo(chx - 34, chB - 90); bx.lineTo(chx, chB - 116); bx.lineTo(chx + 34, chB - 90); bx.closePath(); bx.fill(); // cap slab
  bx.fillStyle = '#34323f'; bx.fillRect(chx - 3, chB - 132, 6, 18); bx.beginPath(); bx.arc(chx, chB - 136, 6, 0, TAU); bx.fill(); // espantabrujas
  // windows & door frames (glass drawn per frame)
  bx.fillStyle = '#6d6570';
  for (const [x, y, w, h] of WINDOWS()) { bx.fillRect(x - 7, y - 7, w + 14, h + 14); }
  const [dx, dy, dw, dh] = DOOR(); bx.beginPath(); bx.moveTo(dx - 8, dy + dh); bx.lineTo(dx - 8, dy + 26); bx.arc(dx + dw / 2, dy + 26, dw / 2 + 8, Math.PI, 0); bx.lineTo(dx + dw + 8, dy + dh); bx.closePath(); bx.fill();
  // shutters
  bx.fillStyle = '#3b2415';
  for (const [x, y, w, h] of WINDOWS()) { bx.fillRect(x - 7 - w * 0.5, y - 4, w * 0.5 - 2, h + 8); bx.fillRect(x + w + 9, y - 4, w * 0.5 - 2, h + 8);
    bx.strokeStyle = 'rgba(0,0,0,.35)'; bx.lineWidth = 1; for (let k = 1; k < 5; k++) { bx.beginPath(); bx.moveTo(x - 7 - w * 0.5, y - 4 + k * (h + 8) / 5); bx.lineTo(x - 9, y - 4 + k * (h + 8) / 5); bx.moveTo(x + w + 9, y - 4 + k * (h + 8) / 5); bx.lineTo(x + w + 7 + w * 0.5, y - 4 + k * (h + 8) / 5); bx.stroke(); } }
  // wooden bench by door
  bx.fillStyle = '#2d1e14'; bx.fillRect(BX + 40, BASE - 36, 80, 8); bx.fillRect(BX + 46, BASE - 28, 6, 28); bx.fillRect(BX + 108, BASE - 28, 6, 28);
  // wine barrel
  bx.fillStyle = '#3a2416'; bx.beginPath(); bx.ellipse(BX + BW - 40, BASE - 30, 22, 32, 0, 0, TAU); bx.fill(); bx.strokeStyle = '#1a120c'; bx.lineWidth = 3; for (const o of [-16, 16]) { bx.beginPath(); bx.moveTo(BX + BW - 60, BASE - 30 + o); bx.lineTo(BX + BW - 20, BASE - 30 + o); bx.stroke(); }
}
function WINDOWS() { return [[BX + 50, 760, 58, 72], [BX + BW - 108, 760, 58, 72], [CX - 24, 605, 48, 56]]; }
function DOOR() { return [CX - 36, 770, 72, BASE - 770]; }

// Terrace: tables, stone asador (grill) (depth .8, drawn onto borda layer)
const GRILL = { x: 820 + M, y: 902 };
{
  const b = bx;
  // tables & chairs silhouettes on the lawn
  const tables = [[560 + M, 930], [700 + M, 945], [1080 + M, 928]];
  for (const [x, y] of tables) {
    b.fillStyle = '#0d0f12'; b.beginPath(); b.ellipse(x, y - 38, 34, 7, 0, 0, TAU); b.fill(); b.fillRect(x - 3, y - 38, 6, 38); b.fillRect(x - 16, y - 2, 32, 4);
    for (const s of [-1, 1]) { const cx = x + s * 50; b.fillRect(cx - 13, y - 28, 26, 4); b.fillRect(cx + s * 11 - 2, y - 56, 4, 30); b.fillRect(cx - 12, y - 26, 3, 26); b.fillRect(cx + 9, y - 26, 3, 26); }
    b.fillStyle = 'rgba(255,190,120,.8)'; b.beginPath(); b.arc(x, y - 44, 3.5, 0, TAU); b.fill(); // candle
  }
  // umbrella over first table
  b.fillStyle = '#8f7f72'; b.globalAlpha = .9; b.beginPath(); b.moveTo(560 + M - 80, 850); b.quadraticCurveTo(560 + M, 790, 560 + M + 80, 850); b.closePath(); b.fill(); b.globalAlpha = 1;
  b.fillStyle = '#0d0f12'; b.fillRect(560 + M - 2, 818, 4, 110);
  // stone asador
  const { x, y } = GRILL; stoneWall(b, x - 60, y - 70, 120, 70, 9);
  b.fillStyle = '#16161c'; b.fillRect(x - 66, y - 76, 132, 8); // grill top
  b.strokeStyle = '#2c2c34'; b.lineWidth = 2; for (let i = -56; i <= 56; i += 9) { b.beginPath(); b.moveTo(x + i, y - 76); b.lineTo(x + i, y - 70); b.stroke(); }
  b.fillStyle = '#0c0c10'; b.fillRect(x - 46, y - 52, 92, 26); // firebox mouth
}
// Festoon light anchor posts
const POSTS = [[420 + M, 790], [LX0 - 22, 812]];
{
  bx.fillStyle = '#0c0d10'; bx.fillRect(POSTS[0][0] - 3, POSTS[0][1] - 4, 6, 120);
}

// Foreground (depth 1.25): framing tree left + fence right + grass
const [fg, gx] = layer(W + 2 * M + 200, H);
{
  // tree trunk & foliage
  gx.fillStyle = '#07090c';
  gx.beginPath(); gx.moveTo(40, H); gx.bezierCurveTo(110, 800, 70, 560, 150, 330); gx.lineTo(185, 335); gx.bezierCurveTo(130, 560, 190, 800, 170, H); gx.closePath(); gx.fill();
  gx.beginPath(); gx.moveTo(150, 520); gx.bezierCurveTo(230, 450, 330, 420, 410, 300); gx.lineTo(420, 310); gx.bezierCurveTo(350, 440, 250, 480, 170, 560); gx.closePath(); gx.fill();
  const leaf = (x, y, r) => { gx.beginPath(); gx.arc(x, y, r, 0, TAU); gx.fill(); };
  for (let i = 0; i < 420; i++) { const a = R() * TAU, d = Math.pow(R(), 0.6); const x = 170 + Math.cos(a) * 330 * d, y = 150 + Math.sin(a) * 220 * d; if (y < -60) continue; gx.fillStyle = `rgb(${6 + R() * 6},${9 + R() * 8},${12 + R() * 8})`; leaf(x, y, 16 + R() * 34); }
  for (let i = 0; i < 160; i++) { const x = 380 + R() * 140, y = 180 + R() * 180; gx.fillStyle = '#080a0d'; leaf(x, y, 8 + R() * 16); }
  // fence (picket) bottom right
  const fx0 = 1180, fy = H - 40;
  for (let x = fx0; x < W + 2 * M + 200; x += 34) { const h = 118 + (x % 3) * 2; gx.fillStyle = '#1a1410'; gx.beginPath(); gx.moveTo(x, fy); gx.lineTo(x, fy - h); gx.lineTo(x + 11, fy - h - 12); gx.lineTo(x + 22, fy - h); gx.lineTo(x + 22, fy); gx.closePath(); gx.fill();
    gx.fillStyle = 'rgba(255,170,100,.10)'; gx.fillRect(x, fy - h, 3, h); }
  gx.fillStyle = '#15100c'; gx.fillRect(fx0 - 10, fy - 94, W + 2 * M + 200, 14); gx.fillRect(fx0 - 10, fy - 36, W + 2 * M + 200, 14);
  // ground strip
  const gg = gx.createLinearGradient(0, H - 70, 0, H); gg.addColorStop(0, 'rgba(6,8,9,0)'); gg.addColorStop(0.4, '#06080a'); gx.fillStyle = gg; gx.fillRect(0, H - 70, W + 2 * M + 200, 70);
}
const grass = Array.from({ length: 520 }, () => ({ x: R() * (W + 2 * M + 200), h: 14 + R() * 46, w: 2 + R() * 3, ph: R() * TAU, k: 1 + Math.floor(R() * 3), lean: (R() - 0.5) * 10 }));

// Sprites
const glowWarm = softSprite(256, P.warm, [[0, .9], [0.3, .35], [1, 0]]);
const glowEmber = softSprite(256, P.ember, [[0, 1], [0.25, .45], [1, 0]]);
const smokeSprite = softSprite(128, '150,150,175', [[0, .6], [0.5, .25], [1, 0]]);
const bulb = softSprite(64, '255,214,150', [[0, 1], [0.2, .8], [0.5, .18], [1, 0]]);
const firefly = softSprite(48, '220,255,150', [[0, 1], [0.25, .6], [1, 0]]);

// Vignette & grain
const [vig, vx] = layer(W, H);
{ const g = vx.createRadialGradient(W * 0.55, H * 0.55, H * 0.35, W * 0.55, H * 0.55, H * 1.15); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(4,4,10,.62)'); vx.fillStyle = g; vx.fillRect(0, 0, W, H); }
const grains = Array.from({ length: 6 }, () => { const [c, x] = layer(W / 2, H / 2); const id = x.createImageData(W / 2, H / 2); for (let i = 0; i < id.data.length; i += 4) { const v = R() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } x.putImageData(id, 0, 0); return c; });

// ---------- frame ----------
const out = createCanvas(W, H), ctx = out.getContext('2d');
function frame(t) {
  const ph = t / T; const cam = 34 * Math.sin(TAU * ph); const camY = 6 * Math.sin(TAU * ph * 2);
  const put = (img, depth, dy = 0, extraX = 0) => ctx.drawImage(img, -M - cam * depth + extraX, camY * depth + dy);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  put(sky, 0.03);
  // stars
  for (const s of stars) { const a = s.a * (0.65 + 0.35 * Math.sin(TAU * s.k * ph + s.ph)); ctx.fillStyle = `rgba(255,245,225,${a})`; ctx.beginPath(); ctx.arc(s.x - M - cam * 0.03, s.y, s.r, 0, TAU); ctx.fill(); }
  ctx.drawImage(moon, 1480 - 210 - cam * 0.05, 150 - 210);
  // clouds drift (seamless: one tile width per loop)
  ctx.globalAlpha = 0.55; const ca = (ph * 2400) % 2400; ctx.drawImage(cloudsA, -ca - cam * .08, 360); ctx.drawImage(cloudsA, 2400 - ca - cam * .08, 360);
  ctx.globalAlpha = 0.45; const cb = (ph * 2400 * 2) % 2400; ctx.drawImage(cloudsB, cb - 2400 - cam * .1, 250); ctx.drawImage(cloudsB, cb - cam * .1, 250);
  ctx.globalAlpha = 1;
  // birds (cross during 2..12s)
  if (t > 2 && t < 12) { const u = (t - 2) / 10; const bxp = lerp(-80, W + 80, u), byp = 300 - u * 90 + Math.sin(u * 7) * 10;
    ctx.strokeStyle = 'rgba(20,18,30,.75)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    [[0, 0], [-26, 12], [-22, -14], [-50, 22], [-48, -24]].forEach(([ox, oy], i) => { const f = Math.sin(t * 9 + i) * 6, s = 9 - i * 0.6; ctx.beginPath(); ctx.moveTo(bxp + ox - s, byp + oy - f); ctx.quadraticCurveTo(bxp + ox - s / 2, byp + oy - 3, bxp + ox, byp + oy); ctx.quadraticCurveTo(bxp + ox + s / 2, byp + oy - 3, bxp + ox + s, byp + oy - f); ctx.stroke(); }); }
  put(far, 0.12);
  put(oroel, 0.22);
  // alpenglow breathing
  ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.18 + 0.06 * pn(t, 3, [1]); ctx.drawImage(glowEmber, 200 - cam * .22, 100, 1500, 700); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // mist
  ctx.globalAlpha = 0.33; const mo = (ph * 2600) % 2600; ctx.drawImage(mist, -mo - cam * .3, 690); ctx.drawImage(mist, 2600 - mo - cam * .3, 690); ctx.globalAlpha = 0.22; ctx.drawImage(mist, mo - 2600 - cam * .35, 760); ctx.drawImage(mist, mo - cam * .35, 760); ctx.globalAlpha = 1;
  put(hills, 0.45);
  put(borda, 0.8);
  const ox = -M - cam * 0.8, oy = camY * 0.8; // borda layer offset
  // festoon lights
  const [p0, p1] = POSTS; const sway = 4 * Math.sin(TAU * ph * 2);
  ctx.strokeStyle = 'rgba(10,10,12,.9)'; ctx.lineWidth = 1.4;
  const chain = [[p0[0], p0[1]], [p1[0], p1[1]], [BX, 745]]; const bulbs = [];
  for (let s = 0; s < chain.length - 1; s++) { const [ax, ay] = chain[s], [bx2, by2] = chain[s + 1]; ctx.beginPath();
    for (let i = 0; i <= 40; i++) { const u = i / 40, x = lerp(ax, bx2, u) + ox, y = lerp(ay, by2, u) + Math.sin(u * Math.PI) * (46 + sway) + oy; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); if (i % 4 === 2) bulbs.push([x, y + 5, s * 50 + i]); } ctx.stroke(); }
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, i] of bulbs) { const a = 0.75 + 0.25 * Math.sin(TAU * ph * (1 + (i % 3)) + i); ctx.globalAlpha = a; ctx.drawImage(bulb, x - 16, y - 16, 32, 32); }
  ctx.globalAlpha = 1;
  // windows light
  const flick = 0.85 + 0.15 * pn(t, 77, [3, 5, 8, 13]);
  ctx.globalCompositeOperation = 'source-over';
  for (const [x, y, w, h] of WINDOWS()) { const g = ctx.createLinearGradient(0, y + oy, 0, y + h + oy); g.addColorStop(0, '#ffd99a'); g.addColorStop(1, '#f08a36'); ctx.fillStyle = g; ctx.fillRect(x + ox, y + oy, w, h);
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(x + ox + w / 2 - 2, y + oy, 4, h); ctx.fillRect(x + ox, y + oy + h * 0.45, w, 4); }
  const [dx, dy, dw, dh] = DOOR(); { const g = ctx.createLinearGradient(0, dy + oy, 0, dy + dh + oy); g.addColorStop(0, '#ffcf88'); g.addColorStop(1, '#e27a2c'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(dx + ox, dy + dh + oy); ctx.lineTo(dx + ox, dy + 26 + oy); ctx.arc(dx + dw / 2 + ox, dy + 26 + oy, dw / 2, Math.PI, 0); ctx.lineTo(dx + dw + ox, dy + dh + oy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3a2314'; ctx.beginPath(); ctx.moveTo(dx + ox, dy + dh + oy); ctx.lineTo(dx + ox, dy + 22 + oy); ctx.lineTo(dx + ox + dw * 0.32, dy + 34 + oy); ctx.lineTo(dx + ox + dw * 0.32, dy + dh + 6 + oy); ctx.closePath(); ctx.fill(); }
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, w, h] of WINDOWS()) { ctx.globalAlpha = 0.55 * flick; ctx.drawImage(glowWarm, x + ox + w / 2 - 110, y + oy + h / 2 - 110, 220, 220); }
  ctx.globalAlpha = 0.5 * flick; ctx.drawImage(glowWarm, dx + ox + dw / 2 - 200, BASE + oy - 170, 400, 260); // door spill
  ctx.globalAlpha = 0.45 * flick; ctx.drawImage(glowWarm, LX0 + ox - 40, 760 + oy, (BX - LX0) + 120, 220); // porch interior
  // grill fire
  const gxp = GRILL.x + ox, gyp = GRILL.y + oy - 76; const fl = 0.8 + 0.2 * pn(t, 5, [4, 7, 11]);
  ctx.globalAlpha = 0.85 * fl; ctx.drawImage(glowEmber, gxp - 260, gyp - 220, 520, 440);
  ctx.globalAlpha = 0.4 * fl; ctx.drawImage(glowEmber, gxp - 520, gyp - 260, 1040, 560);
  ctx.globalAlpha = 1;
  for (let i = 0; i < 9; i++) { const bx0 = gxp - 48 + i * 12; const h = (38 + 26 * (0.5 + 0.5 * pn(t, 100 + i, [5, 8, 13]))) * (i === 0 || i === 8 ? 0.55 : 1); const sw = 7 * pn(t, 200 + i, [6, 9]);
    const g = ctx.createLinearGradient(0, gyp, 0, gyp - h); g.addColorStop(0, 'rgba(255,240,190,.95)'); g.addColorStop(0.35, 'rgba(255,160,60,.8)'); g.addColorStop(1, 'rgba(220,60,20,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(bx0 - 9, gyp); ctx.quadraticCurveTo(bx0 - 8 + sw * 0.3, gyp - h * 0.5, bx0 + sw, gyp - h); ctx.quadraticCurveTo(bx0 + 8 + sw * 0.3, gyp - h * 0.5, bx0 + 9, gyp); ctx.closePath(); ctx.fill(); }
  // firebox glow
  ctx.globalAlpha = 0.9 * fl; ctx.fillStyle = 'rgba(255,120,40,.9)'; ctx.fillRect(GRILL.x - 46 + ox, GRILL.y - 52 + oy, 92, 26); ctx.globalAlpha = 1;
  // sparks
  for (let i = 0; i < 26; i++) { const r = rng(900 + i); const life = 1 / (2 + Math.floor(r() * 3)); const age = ((ph / life) + r()) % 1; const x = gxp + (r() - 0.5) * 80 + Math.sin(age * 9 + i) * 18 + age * 30, y = gyp - age * (180 + r() * 160);
    const a = Math.sin(age * Math.PI) * (0.6 + r() * 0.4); ctx.globalAlpha = a; ctx.drawImage(glowEmber, x - 5, y - 5, 10, 10); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // chimney smoke (periodic stream)
  const chx = CX + 100 + ox, chy = PEAK - 20 - 108 + oy;
  for (let i = 0; i < 70; i++) { const r = rng(3000 + i); const age = ((ph * 4) + i / 70) % 1; const x = chx + age * 90 + 160 * age * age + Math.sin(age * 6 + r() * TAU) * 30 * age, y = chy - age * 300 - r() * 10; const s = 26 + age * 190 * (0.7 + r() * 0.6); ctx.globalAlpha = 0.16 * Math.min(1, age * 6) * Math.pow(1 - age, 1.3); ctx.drawImage(smokeSprite, x - s / 2, y - s / 2, s, s); }
  ctx.globalAlpha = 1;
  // fireflies
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 34; i++) { const r = rng(500 + i); const bxf = r() * W, byf = 830 + r() * 200; const x = bxf + 40 * Math.sin(TAU * ph * (1 + (i % 2)) + r() * TAU), y = byf + 18 * Math.sin(TAU * ph * (2 + (i % 3)) + r() * TAU);
    const a = Math.max(0, Math.sin(TAU * ph * (3 + (i % 4)) + r() * TAU)); ctx.globalAlpha = a * 0.9; ctx.drawImage(firefly, x - 12, y - 12, 24, 24); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // foreground
  const fxo = -M - 100 - cam * 1.25;
  ctx.drawImage(fg, fxo, camY * 1.25);
  ctx.strokeStyle = '#06080a'; ctx.lineCap = 'round';
  for (const g of grass) { const s = 5 * Math.sin(TAU * ph * g.k + g.ph) + g.lean; const x = g.x + fxo, y = H + 4; if (x < -40 || x > W + 40) continue; ctx.lineWidth = g.w; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + s * 0.3, y - g.h * 0.6, x + s, y - g.h); ctx.stroke(); }
  // grade: warm bottom light, vignette, grain
  ctx.globalCompositeOperation = 'soft-light'; const wg = ctx.createLinearGradient(0, H * 0.6, 0, H); wg.addColorStop(0, 'rgba(255,150,80,0)'); wg.addColorStop(1, 'rgba(255,150,80,.35)'); ctx.fillStyle = wg; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(vig, 0, 0);
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.07; ctx.drawImage(grains[Math.floor(t * FPS) % grains.length], 0, 0, W, H);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

// ---------- main ----------
(async () => {
  const args = process.argv.slice(2);
  if (args[0] === '--preview') { frame(parseFloat(args[1])); fs.writeFileSync(args[2], out.toBuffer('image/png')); return; }
  const [mp4, poster, webm] = args;
  const ff = spawn(ffmpeg, ['-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', `${FPS}`, '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = 0; f < FRAMES; f++) {
    frame(f / FPS);
    if (f === 0 && poster) fs.writeFileSync(poster, out.toBuffer('image/jpeg', 86));
    const buf = Buffer.from(ctx.getImageData(0, 0, W, H).data.buffer);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 60 === 0) console.error(`frame ${f}/${FRAMES} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  if (webm) await new Promise(r => spawn(ffmpeg, ['-y', '-i', mp4, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '38', '-row-mt', '1', '-an', webm], { stdio: 'inherit' }).on('close', r));
  console.error('done');
})();
