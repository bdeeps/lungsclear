// Chapter 5: lung volumes and spirometry.
// A water spirometer (John Hutchinson's 1846 design, as used for a century): you breathe into an
// upturned bell floating in water; the bell rises as you breathe out, and a pen on the counterweight
// draws your lung volume on a turning drum (a kymograph), breathing in = up.
// Volumes: predicted FVC, FEV1 and RV from the ECCS/ERS 1993 equations (lungs.js → predicted);
// the split of the vital capacity into IRV / TV / ERV follows Guyton & Hall's textbook adult
// (IRV 3.0, TV 0.5, ERV 1.1 of a 4.6 L VC). Dead space ≈150 mL (Guyton & Hall; West ch. 2).
// Forced blow: V(t) = FVC·(1 − e^(−t/τ)), with τ set so FEV1/FVC matches the prediction.
// Less effort slows the blow and shortens it; narrowed airways (as in an asthma attack or COPD)
// make τ longer, so FEV1/FVC falls below about 0.7, the usual cut-off for obstruction (GOLD, ATS/ERS).
import { THREE, M, tube, canvasTexture, clamp, lerp } from '../kit.js';
import { predicted, GUYTON, makeLung, LUNGS } from '../lungs.js';

const LOOP = 28;      // seconds for one full recording
const V0 = 0.5, V1 = 8;          // volume range drawn on the drum (L)
const DY0 = 1.45, DY1 = 3.95;    // drum height range
const volY = (v) => DY0 + ((v - V0) / (V1 - V0)) * (DY1 - DY0);

export function spiro(s) {
  const p = predicted(s.sex, s.h / 100, s.age);
  const eff = clamp(s.effort, 0.2, 1);
  const FVCp = p.FVC, VC = FVCp;
  const RV = Math.max(0.6, p.RV), TLC = RV + VC;
  const ERV = VC * (GUYTON.ERV / GUYTON.VC), TV = GUYTON.TV, IRV = VC - ERV - TV, FRC = RV + ERV;
  const tau0 = -1 / Math.log(1 - clamp(p.ratio, 0.4, 0.95));
  const tau = (tau0 / Math.pow(eff, 0.5)) * (s.narrow ? 2.2 : 1);
  const FVC = FVCp * (0.8 + 0.2 * eff) * (s.narrow ? 0.88 : 1);
  const FEV1 = FVC * (1 - Math.exp(-1 / tau));
  return { p, RV, TLC, VC, ERV, TV, IRV, FRC, tau, FVC, FEV1, ratio: FEV1 / FVC, pef: FVC / tau };
}
// Lung volume during the recording: three quiet breaths, a full breath in, a hard blow out, recovery.
export function recording(t, S) {
  const tb = (u) => S.FRC + S.TV * 0.5 * (1 - Math.cos(2 * Math.PI * u));
  if (t < 12) return { v: tb(t / 4), what: 'Quiet breathing: tidal volume' };
  if (t < 15.5) { const k = (t - 12) / 3.5; return { v: lerp(S.FRC, S.TLC, Math.sin((k * Math.PI) / 2)), what: 'Breathe in as far as you can' }; }
  if (t < 16) return { v: S.TLC, what: 'Hold it…' };
  if (t < 23) { const u = t - 16; return { v: S.TLC - S.FVC * (1 - Math.exp(-u / S.tau)), what: 'Blow out hard and fast!', blow: u }; }
  const end = S.TLC - S.FVC * (1 - Math.exp(-7 / S.tau));
  const k = clamp((t - 23) / 2, 0, 1);
  const v = lerp(end, S.FRC, Math.sin((k * Math.PI) / 2));
  return { v: k < 1 ? v : tb((t - 25) / 4), what: 'Back to normal breathing' };
}

export default {
  id: 'volumes',
  short: 'Lung volumes',
  title: 'How much air your lungs hold',
  subtitle: 'Blow into a spirometer and see your lung volumes drawn as a line.',
  view: { pos: [-0.3, 4.2, 11.6], target: [-0.1, 3.0, 0] },
  learn: `<p>A <b>spirometer</b> measures how much air you breathe in and out. The old kind is an upturned bell floating in water: breathe out into it and it rises. A pen draws your lung volume on a turning drum, breathing in going up.</p>
    <p>A quiet breath, the <b>tidal volume</b>, is only about <b>500 mL</b>. Breathe in as far as you can and you add the <b>inspiratory reserve</b>, about 3 litres more. Push out as hard as you can and you empty the <b>expiratory reserve</b>, about 1 litre. All of that together is the <b>vital capacity</b>, around <b>4.5 to 5 litres</b> for a young adult man. Even then about <b>1.2 litres</b> stays behind, the <b>residual volume</b>, so your lungs never collapse. The <b>total lung capacity</b> is about 6 litres.</p>
    <p>Doctors often ask you to blow out as hard and fast as you can. The litres out in the first second are the <b>FEV1</b>; the total is the <b>FVC</b>. Healthy lungs push out about 70 to 85% of the total in that first second. If the airways are narrowed, as in asthma or COPD, the air comes out more slowly and the ratio drops.</p>
    <p>Not all the air you breathe is useful. About <b>150 mL</b> of every breath just fills the nose, throat and airways, the <b>dead space</b>, and never reaches the alveoli.</p>
    <p>“Normal” depends on your age, height, sex and ancestry, so a single number means little on its own. Lung tests are read by doctors against the right reference for each person.</p>
    <p class="tip"><b>Try it:</b> lower the effort and watch the blow flatten. Then narrow the airways and see FEV1/FVC fall.</p>`,
  terms: [
    { t: 'Tidal volume', d: 'The air moved in one quiet breath: about 500 mL.' },
    { t: 'Vital capacity', d: 'The most air you can breathe out after breathing in as far as you can: about 4.5 to 5 litres in a young man, less in women and older people.' },
    { t: 'Residual volume', d: 'The air that always stays in your lungs, even after the hardest blow out: about 1.2 litres.' },
    { t: 'FEV1 / FVC', d: 'The share of a hard blow that comes out in the first second. It falls when airways are narrowed.' },
    { t: 'Dead space', d: 'The part of each breath (about 150 mL) that only fills the airways and never reaches the alveoli.' },
  ],
  defaults: { effort: 1, narrow: false, sex: 'm', h: 172, age: 25 },
  controls: [
    { key: 'effort', type: 'range', label: 'How hard you blow', min: 0.2, max: 1, step: 0.01, ends: ['gentle', 'all out'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'narrow', type: 'toggle', label: 'Narrowed airways (like an asthma attack)' },
    { key: 'sex', type: 'seg', label: 'Body', options: [{ v: 'm', label: 'Male' }, { v: 'f', label: 'Female' }] },
    { key: 'h', type: 'range', label: 'Height', min: 150, max: 195, step: 1, fmt: (v) => Math.round(v) + ' cm' },
    { key: 'age', type: 'range', label: 'Age', min: 18, max: 70, step: 1, fmt: (v) => Math.round(v) + ' years', hint: 'The prediction formulas used here are for adults 18 to 70.' },
    { key: 'go', type: 'buttons', label: 'Recording', items: [{ label: 'Start again', act: (s, inst) => inst.restart?.() }, { label: 'Skip to the big blow', act: (s, inst) => inst.restart?.(11.5) }] },
  ],
  quiz: [
    { q: 'What is the tidal volume?', options: ['The air in one quiet breath', 'The most air you can hold', 'The air left after breathing out hard', 'The air in your windpipe'], answer: 0, why: 'A quiet breath moves about 500 mL, like a tide going in and out.' },
    { q: 'Why can you never empty your lungs completely?', options: ['The diaphragm is too weak', 'About 1.2 L of residual volume always stays, holding the airways open', 'Air leaks back in', 'The nose blocks it'], answer: 1, why: 'The chest wall and small airways stop the lungs emptying fully, so a residual volume stays.' },
    { q: 'In a hard blow, what happens to FEV1/FVC when airways are narrowed?', options: ['It rises', 'It falls', 'It stays the same', 'It becomes zero'], answer: 1, why: 'Narrow tubes slow the air, so less comes out in the first second compared with the total.' },
  ],
  reel: [
    { ms: 5600, caption: 'A quiet breath is only half a litre. A full, hard blow can be nearly five.', set: { effort: 1, narrow: false }, act: (s, inst) => inst.restart?.(12.6), view: { pos: [0.4, 3.9, 9.2], target: [-0.6, 2.9, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    let S = spiro(this.defaults);
    const TX = -3.1;
    // ---------------- tank, water and floating bell
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.2, 40, 1, true), M.clear(0xcfe8ff, 0.22)); tank.position.set(TX, 1.1, 0); root.add(tank);
    const tankBase = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.12, 0.08, 40), M.metal(0x9aa3b2)); tankBase.position.set(TX, 0.04, 0); root.add(tankBase);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.06, 1.8, 40), M.plastic(0x3f8dff, { transparent: true, opacity: 0.35, depthWrite: false })); water.position.set(TX, 0.95, 0); root.add(water);
    const bell = new THREE.Group(); root.add(bell);
    const bellMat = M.plastic(0xdfe6ee, { transparent: true, opacity: 0.75, roughness: 0.3, side: THREE.DoubleSide });
    const bellWall = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.0, 40, 1, true), bellMat); bellWall.position.y = 1.0; bell.add(bellWall);
    const bellTop = new THREE.Mesh(new THREE.CircleGeometry(0.9, 40), bellMat); bellTop.rotation.x = -Math.PI / 2; bellTop.position.y = 2.0; bell.add(bellTop);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 8, 16), M.metal()); hook.position.y = 2.1; bell.add(hook);
    // Breathing tube from the mouthpiece, into the tank and up inside the bell.
    const hoseMat = M.plastic(0x5b6475, { roughness: 0.6 });
    root.add(tube([[TX - 1.5, 2.6, 1.6], [TX - 1.4, 1.3, 1.5], [TX - 1.0, 0.35, 0.8], [TX - 0.3, 0.15, 0.1], [TX, 0.3, 0], [TX, 2.1, 0]], 0.08, hoseMat, false, 80));
    const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.45, 20), M.plastic(0x2f6fd6)); mouth.position.set(TX - 1.52, 2.8, 1.62); mouth.rotation.z = 0.1; root.add(mouth);

    // ---------------- pulleys, cord, counterweight with pen, and the drum
    const DX = -0.35, DZ = -0.15, DR = 0.95;
    const PX = DX + DR + 0.12;           // pen touches the right edge of the drum
    const py = 5.3;
    const frame = M.metal(0x7a8394);
    root.add(tube([[TX, py, -0.05], [PX, py, -0.05]], 0.03, frame, false, 4));
    for (const x of [TX, PX]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 8, 24), M.metal(0xb9bec8)); w.position.set(x + (x === TX ? 0.18 : -0.18), py - 0.02, 0); root.add(w); }
    root.add(tube([[DX + 2.2, 0, -0.05], [DX + 2.2, py, -0.05], [PX, py, -0.05]], 0.04, frame, false, 8));
    const cordMat = M.plastic(0xe8e2d0);
    const cordA = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 6), cordMat), cordB = cordA.clone(); root.add(cordA, cordB);
    const topCord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, PX - TX, 6), cordMat); topCord.rotation.z = Math.PI / 2; topCord.position.set((TX + PX) / 2, py + 0.16, 0); root.add(topCord);
    const weight = new THREE.Group(); root.add(weight);
    const wBody = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.5, 20), M.metal(0x5a606c)); wBody.position.y = 0.3; weight.add(wBody);
    const pen = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 10), M.plastic(0xff4757)); pen.rotation.z = Math.PI / 2; pen.position.set(-0.17, 0, 0); weight.add(pen);
    let rec = [];
    const drumTex = canvasTexture(1024, 320, (g, w, h) => {
      g.fillStyle = '#f5f0e2'; g.fillRect(0, 0, w, h);
      const Y = (v) => h - ((v - V0) / (V1 - V0)) * h;
      g.strokeStyle = 'rgba(40,60,90,.18)'; g.lineWidth = 1;
      for (let v = 1; v < V1; v++) { g.beginPath(); g.moveTo(0, Y(v)); g.lineTo(w, Y(v)); g.stroke(); g.fillStyle = 'rgba(40,60,90,.55)'; g.font = '14px sans-serif'; for (let k = 0; k < 4; k++) g.fillText(v + ' L', k * 256 + 4, Y(v) - 3); }
      g.strokeStyle = '#1d3b8f'; g.lineWidth = 3; g.beginPath();
      rec.forEach(([x, v], i) => (i && x > rec[i - 1][0] ? g.lineTo(x * w, Y(v)) : g.moveTo(x * w, Y(v))));
      g.stroke();
      g.strokeStyle = 'rgba(200,40,60,.6)'; g.setLineDash([6, 5]); g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, Y(S.RV)); g.lineTo(w, Y(S.RV)); g.stroke(); g.setLineDash([]);
      g.fillStyle = 'rgba(200,40,60,.85)'; g.font = 'bold 15px sans-serif'; for (let k = 0; k < 4; k++) g.fillText('residual volume: never breathed out', k * 256 + 8, Y(S.RV) + 17);
    });
    drumTex.tex.wrapS = THREE.RepeatWrapping;
    const drumH = DY1 - DY0;
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(DR, DR, drumH, 64, 1, true), new THREE.MeshStandardMaterial({ map: drumTex.tex, roughness: 0.7 }));
    drum.position.set(DX, (DY0 + DY1) / 2, DZ); root.add(drum);   // texture v spans exactly V0…V1, so pen height ↔ volume
    for (const y of [DY0 - 0.03, DY1 + 0.03]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(DR + 0.03, DR + 0.03, 0.06, 64), M.metal(0x4a505c)); cap.position.set(DX, y, DZ); root.add(cap); }
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, drumH + 1.2, 12), M.metal()); axle.position.set(DX, (DY0 + DY1) / 2 - 0.3, DZ); root.add(axle);

    // ---------------- lungs that fill and empty with the recording
    const lungG = new THREE.Group(); lungG.position.set(3.7, 1.25, 1.3); lungG.scale.setScalar(0.36); root.add(lungG);
    // Each lung scales about its own middle; the dark copy inside is the residual volume.
    const pivots = [], cores = [];
    for (const sd of [-1, 1]) {
      for (const core of [false, true]) {
        const P = new THREE.Group(); P.position.set(LUNGS[sd].cx, 0, LUNGS[sd].cz); lungG.add(P);
        const inner = new THREE.Group(); inner.position.set(-LUNGS[sd].cx, -3.4, -LUNGS[sd].cz); P.add(inner);
        const L = makeLung(sd, { seg: core ? 32 : 40 });
        if (core) L.mats.forEach((m) => m.color.set(0x9c3a55)); else L.mats.forEach((m) => { m.opacity = 0.45; m.depthWrite = false; });
        inner.add(L.group); (core ? cores : pivots).push(P);
      }
    }

    // ---------------- board: the volume ladder and the forced blow
    const chart = canvasTexture(560, 520, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(10,12,18,.9)'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#e8eef8'; g.font = 'bold 24px sans-serif'; g.fillText('Your lung volumes', 18, 34);
      // stacked bar
      const bx = 30, bw = 70, by0 = 250, by1 = 60, Y = (v) => by0 - (v / 7.5) * (by0 - by1);
      const seg = [[0, S.RV, '#9c3a55', 'Residual'], [S.RV, S.FRC, '#ffb547', 'Expiratory reserve'], [S.FRC, S.FRC + S.TV, '#5ce1a9', 'Tidal'], [S.FRC + S.TV, S.TLC, '#5ab8ff', 'Inspiratory reserve']];
      seg.forEach(([a, b, c, n]) => {
        g.fillStyle = c; g.fillRect(bx, Y(b), bw, Y(a) - Y(b) - 1);
        g.fillStyle = '#e8eef8'; g.font = '16px sans-serif'; g.fillText(`${n}: ${(b - a).toFixed(1)} L`, bx + bw + 12, (Y(a) + Y(b)) / 2 + 6);
      });
      g.fillStyle = 'rgba(255,255,255,.7)'; g.font = 'bold 16px sans-serif';
      g.fillText(`Total ${S.TLC.toFixed(1)} L`, bx, by1 - 10);
      g.fillText(`Vital capacity ${S.VC.toFixed(1)} L`, bx + bw + 190, by1 + 22);
      // forced blow
      const x0 = 60, x1 = w - 20, y0 = h - 40, y1 = 300;
      const X = (t) => x0 + (t / 6) * (x1 - x0), YV = (v) => y0 - (v / 6) * (y0 - y1);
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, y0); g.lineTo(x1, y0); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '15px sans-serif';
      for (let t = 0; t <= 6; t++) g.fillText(t + ' s', X(t) - 8, y0 + 18);
      for (let v = 0; v <= 6; v += 2) g.fillText(v + ' L', 22, YV(v) + 5);
      const P = S.p, tau0 = -1 / Math.log(1 - clamp(P.ratio, 0.4, 0.95));
      g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 2; g.beginPath();
      for (let i = 0; i <= 60; i++) { const t = i / 10; const v = P.FVC * (1 - Math.exp(-t / tau0)); i ? g.lineTo(X(t), YV(v)) : g.moveTo(X(t), YV(v)); } g.stroke();
      g.strokeStyle = '#ff5a6a'; g.lineWidth = 4; g.beginPath();
      for (let i = 0; i <= 60; i++) { const t = i / 10; const v = S.FVC * (1 - Math.exp(-t / S.tau)); i ? g.lineTo(X(t), YV(v)) : g.moveTo(X(t), YV(v)); } g.stroke();
      g.setLineDash([5, 5]); g.strokeStyle = '#ffb547'; g.beginPath(); g.moveTo(X(1), y0); g.lineTo(X(1), YV(S.FEV1)); g.lineTo(x0, YV(S.FEV1)); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#ffb547'; g.font = 'bold 16px sans-serif'; g.fillText(`FEV1 ${S.FEV1.toFixed(1)} L`, X(1) + 8, YV(S.FEV1) + 18);
      g.fillStyle = '#ff5a6a'; g.fillText(`FVC ${S.FVC.toFixed(1)} L`, X(4.3), YV(S.FVC) - 10);
      g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '14px sans-serif'; g.fillText('The hard blow (grey: predicted)', x0 + 8, y1 + 4);
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.16), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, toneMapped: false }));
    board.position.set(3.9, 4.35, -0.6); board.rotation.y = -0.25; root.add(board);

    stage.label('Blow here', [TX - 1.55, 3.3, 1.65], root);
    const lBell = stage.label('Bell rises as you breathe out', [TX + 0.2, 0.5, 1.5], root);
    stage.label('Pen draws lung volume', [DX + 0.2, DY1 + 0.55, 0.9], root);
    stage.label('Lungs (dark: air that always stays)', [3.7, -0.15, 1.6], root);
    const lWhat = stage.label('', [DX - 0.2, DY0 - 0.65, 1.1], root, 'hot');

    let t = 0, key = '', redraw = 0, lastX = -1;
    const inst = {
      restart(at = 0) { t = at; rec = []; lastX = -1; },
      update(dt, s) {
        dt = Math.max(0, dt);
        const k = `${s.effort}|${s.narrow}|${s.sex}|${s.h}|${s.age}`;
        if (k !== key) { key = k; S = spiro(s); chart.redraw(); }
        t += dt;
        if (t >= LOOP) { t -= LOOP; rec = []; }
        const r = recording(t, S);
        const x = t / LOOP;
        if (x > lastX + 0.001 || x < lastX) { rec.push([x, r.v]); lastX = x; }
        // drum turns so the newest trace sits under the pen at the right edge (texture u = 0.25)
        drumTex.tex.offset.x = x - 0.25;
        redraw += dt; if (redraw > 0.05) { redraw = 0; drumTex.redraw(); }
        const penY = volY(r.v);
        weight.position.set(PX + 0.17, penY - 0.3 + 0.3, DZ);
        wBody.position.y = 0.3;
        pen.position.y = 0;
        // Bell: out of the lungs → into the bell → bell rises (by the same volume).
        const bellY = 0.35 + (S.TLC - r.v) * 0.22;
        bell.position.set(TX, bellY, 0);
        const ta = new THREE.Vector3(TX, bellY + 2.1, 0), tb = new THREE.Vector3(TX, py + 0.16, 0);
        cordA.position.copy(ta).add(tb).multiplyScalar(0.5); cordA.scale.y = tb.y - ta.y;
        const tc = new THREE.Vector3(PX + 0.17, penY + 0.55, DZ), td = new THREE.Vector3(PX + 0.17, py + 0.16, 0);
        cordB.position.copy(tc).add(td).multiplyScalar(0.5); cordB.scale.y = td.y - tc.y;
        // Lungs: grow with volume; the dark core is the residual volume.
        const f = Math.cbrt(r.v / S.TLC), fr = Math.cbrt(S.RV / S.TLC);
        pivots.forEach((P) => P.scale.setScalar(0.72 + 0.35 * f)); cores.forEach((P) => P.scale.setScalar((0.72 + 0.35 * f) * fr * 0.95));
        lWhat.element.textContent = r.what;
        lBell.visible = true;
      },
      readout: (s) => {
        const q = spiro(s);
        return `<div class="big">FEV1/FVC = ${(q.ratio * 100).toFixed(0)}%</div>
          <div class="row"><span>FVC (hard blow, total)</span><b>${q.FVC.toFixed(2)} L</b></div>
          <div class="row"><span>FEV1 (first second)</span><b>${q.FEV1.toFixed(2)} L</b></div>
          <div class="row"><span>Residual volume</span><b>${q.RV.toFixed(1)} L</b></div>
          <div class="row"><span>Total lung capacity</span><b>${q.TLC.toFixed(1)} L</b></div>
          <div class="row"><span>Dead space per breath</span><b>150 mL</b></div>
          <small>Typical values vary with age, height, sex and ancestry.</small>`;
      },
    };
    return inst;
  },
};
