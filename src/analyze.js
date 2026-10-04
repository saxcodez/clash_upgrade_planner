// Core analyzer v1.1: account JSON + game data -> rows, per-level steps, queues, resources
function analyze(acc, G, opt) {
  opt = opt || {};
  const TH = (acc.buildings || []).find(b => b.data === 1000001)?.lvl || 18;
  const BH = (acc.buildings2 || []).find(b => b.data === 1000034)?.lvl || 10;
  const rows = [], steps = [], unknown = [];
  const queue = { builder: 0, lab: 0, pet: 0, bbBuilder: 0, bbLab: 0 };
  const res = {};
  const addRes = (r, n) => { if (!n) return; r = r || 'Other'; res[r] = (res[r] || 0) + n; };
  const ore = { shiny_ore: 0, glowy_ore: 0, starry_ore: 0 };
  const LAB = ['Troops', 'Spells', 'Siege Machines'];
  const maxLevelFor = (it, cap) => { let m = 0; it.L.forEach((l, i) => { if (!cap || l[0] <= cap) m = i + 1; }); return m; };
  const queueOf = (cat, bb) => LAB.includes(cat) ? (bb ? 'bbLab' : 'lab') : cat === 'Pets' ? 'pet' : cat === 'Equipment' ? 'smith' : (bb ? 'bbBuilder' : 'builder');

  function addRow(row, lvSteps, scSteps) {
    const ri = rows.length;
    row.time = 0; row.cost = 0; row.scTime = 0; row.scCost = 0; row.ore = { shiny_ore: 0, glowy_ore: 0, starry_ore: 0 };
    for (const s of lvSteps) {
      row.time += s.t * row.cnt; row.cost += (s.cost || 0) * row.cnt;
      if (s.ore) for (const k in s.ore) row.ore[k] += (s.ore[k] || 0) * row.cnt;
      steps.push({ ri, t: s.t, cost: s.cost || 0, res: s.res, n: row.cnt, lvl: s.lvl, running: !!s.running, sc: false });
    }
    if (opt.supercharges !== false) for (const s of scSteps || []) {
      row.scTime += s.t * row.cnt; row.scCost += s.cost * row.cnt;
      steps.push({ ri, t: s.t, cost: s.cost, res: s.res, n: row.cnt, lvl: s.lvl, sc: true });
    }
    const first = lvSteps[0] || (opt.supercharges !== false && (scSteps || [])[0]);
    row.next = first ? { t: first.t, cost: first.cost || 0, ore: first.ore, res: first.res } : null;
    if (row.queue && row.queue !== 'smith') queue[row.queue] += row.time + row.scTime;
    if (row.isWall) addRes('Wall ' + (row.village === 'Home' ? 'Gold/Elixir' : 'BB'), row.cost); else addRes(row.res, row.cost);
    addRes(row.scRes, row.scCost);
    for (const k in ore) ore[k] += row.ore[k];
    rows.push(row);
    return row;
  }

  function push(id, cur, cnt, timer, extra, bb) {
    const it = G.items[id];
    if (!it) { unknown.push({ id, lvl: cur }); return; }
    let max = maxLevelFor(it, bb ? null : TH);
    const absMax = it.L.length;
    if (cur > max) max = cur;
    const lv = [];
    for (let l = cur + 1; l <= Math.min(max, absMax); l++) {
      const s = it.L[l - 1], running = l === cur + 1 && !!timer;
      const isOre = typeof s[2] === 'object';
      lv.push({ lvl: l, t: running ? timer : s[1], cost: isOre || running ? 0 : s[2], ore: isOre ? s[2] : null, res: it.r, running });
    }
    const sc = [];
    let scMax = 0;
    const scCur = extra.supercharge || 0;
    if (it.sc && !bb && max === absMax) {
      scMax = it.sc.length;
      for (let s = scCur; s < scMax; s++) sc.push({ lvl: s + 1, t: it.sc[s][0], cost: it.sc[s][1], res: it.scr });
    }
    return addRow({
      id, name: it.n, cat: it.c, type: it.t, village: bb ? 'Builder Base' : 'Home', cur, max, absMax, cnt, res: it.r,
      upgrading: !!timer, timer: timer || 0, scCur, scMax, scRes: it.scr, hero: it.h, rarity: it.rar,
      queue: queueOf(it.c, bb), steps: Math.max(0, max - cur) * cnt, isWall: it.n === 'Wall'
    }, lv, sc);
  }

  const sections = [['buildings', false], ['traps', false], ['units', false], ['siege_machines', false], ['spells', false],
    ['heroes', false], ['pets', false], ['guardians', false], ['equipment', false],
    ['buildings2', true], ['traps2', true], ['units2', true], ['heroes2', true]];
  const owned = { home: {}, bb: {} };
  for (const [sec, bb] of sections) for (const e of acc[sec] || []) {
    if (e.data === 1000097 && e.types) continue;
    const cnt = e.cnt || 1, k = bb ? 'bb' : 'home';
    owned[k][e.data] = (owned[k][e.data] || 0) + cnt;
    push(e.data, e.lvl || 0, cnt, e.timer || 0, e, bb);
  }
  // merged defenses consume their source buildings
  const oh = owned.home, used = {};
  used[1000008] = 2 * (oh[1000085] || 0) + (oh[1000079] || 0);
  used[1000009] = 2 * (oh[1000084] || 0) + (oh[1000079] || 0);
  used[1000011] = 2 * (oh[1000102] || 0);
  if (TH >= 17) used[1000031] = 1;
  const missing = [];
  if (opt.missing !== false) for (const [maxMap, bb] of [[G.maxHome, false], [G.maxBB, true]]) for (const id in maxMap) {
    const need = maxMap[id] - (owned[bb ? 'bb' : 'home'][id] || 0) - (bb ? 0 : (used[id] || 0));
    if (need > 0 && G.items[id]) {
      missing.push({ id: +id, name: G.items[id].n, n: need, village: bb ? 'Builder Base' : 'Home' });
      const r = push(+id, 0, need, 0, {}, bb); if (r) r.missing = true;
    }
  }
  const craft = (acc.buildings || []).find(b => b.data === 1000097 && b.types);
  if (craft) for (const t of craft.types) {
    const ct = G.craft[t.data];
    for (const m of t.modules || []) {
      const mod = ct && ct.m[m.data];
      if (!mod) { unknown.push({ id: m.data, lvl: m.lvl }); continue; }
      const lv = [];
      for (let l = m.lvl + 1; l <= mod.L.length; l++) { const s = mod.L[l - 1], running = l === m.lvl + 1 && !!m.timer; lv.push({ lvl: l, t: running ? m.timer : s[1], cost: running ? 0 : s[2], res: mod.r, running }); }
      addRow({ id: m.data, name: ct.n + ': ' + mod.n.replace(/^.*? (HP|Atk|Attack|Damage|Range|Speed)/, '$1'), cat: 'Crafted Defense', village: 'Home', cur: m.lvl, max: mod.L.length, absMax: mod.L.length, cnt: 1, res: mod.r, upgrading: !!m.timer, timer: m.timer || 0, scCur: 0, scMax: 0, queue: 'builder', steps: mod.L.length - m.lvl }, lv, []);
    }
  }
  const helpers = {}; (acc.helpers || []).forEach(h => helpers[h.data] = h.lvl || 0);
  return { TH, BH, rows, steps, unknown, queue, res, ore, missing, helpers, boosts: acc.boosts || {}, tag: acc.tag, timestamp: acc.timestamp };
}
if (typeof module !== 'undefined') module.exports = analyze;
