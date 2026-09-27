// Chapter 2: how we breathe. Boyle's law in a bell jar and in a real chest.
// Model (lungs.js → breath): the diaphragm and intercostals enlarge the chest; the lungs follow
// because the pleural space is sealed; alveolar gas expands, its pressure falls ≈1 cmH₂O below
// atmospheric (Boyle: P₁V₁ = P₂V₂) and air flows in until the pressures match. Breathing out at
// rest is passive: the stretched lungs recoil. Mechanics from West's Respiratory Physiology, ch. 7.
import { THREE, M, tube, canvasTexture, clamp } from '../kit.js';
import { makeChest, breath, MECH, GUYTON, O2C, CO2C, pathOf } from '../lungs.js';

const JX = -4.35;               // bell jar position
const BX = 4.55, BY = 3.7;      // chart board position

export default {
  id: 'breathing',
  short: 'How we breathe',
  title: 'How we breathe: Boyle’s law',
  subtitle: 'Make the chest bigger, the pressure inside drops, and air rushes in.',
  view: { pos: [0.7, 4.6, 13.2], target: [0.35, 4.25, 0] },
  learn: `<p>Your lungs have no muscles of their own. They are stretchy bags that follow the chest wall, because the thin film of fluid in the <b>pleura</b> sticks them to it, like two wet sheets of glass.</p>
    <p>To breathe in, the <b>diaphragm</b> contracts: its dome flattens and moves down. The <b>intercostal muscles</b> lift the ribs up and out, like a bucket handle. The chest gets bigger, so the air inside the lungs has more room. By <b>Boyle’s law</b> (<a href="/gaslawclear/">see the gas laws</a>), a gas given more room has a lower pressure. The pressure in your air sacs drops about <b>1 cmH₂O</b> below the air outside, a change of only 0.1%, and air flows in until the pressures match again.</p>
    <p>Breathing out at rest takes no effort at all. The muscles relax and the stretched lungs <b>recoil</b> like a balloon, squeezing the air back out. The <b>bell jar</b> on the left shows the same idea: pull the rubber sheet down and the balloons inside fill up.</p>
    <p>A quiet breath is about <b>500 mL</b>, the <b>tidal volume</b>. Adults at rest breathe <b>12 to 20 times a minute</b>, so about 6 to 8 litres of air flow in and out every minute.</p>
    <p>About 150 mL of each breath only fills the airways, the <b>dead space</b>, and never reaches the air sacs. So slow, deep breaths refresh the air sacs better than fast, shallow ones.</p>
    <p class="tip"><b>Try it:</b> take a huge breath with the tidal volume slider and watch the pressure dip deeper and the loop on the chart grow.</p>`,
  terms: [
    { t: 'Boyle’s law', d: 'At a fixed temperature, a gas’s pressure times its volume stays the same: more room means lower pressure.' },
    { t: 'Tidal volume', d: 'The air you move in one normal breath, about 500 mL for an adult at rest.' },
    { t: 'Minute ventilation', d: 'Breaths per minute times tidal volume: how much air you breathe each minute.' },
    { t: 'Intrapleural pressure', d: 'The pressure in the thin fluid layer between lung and chest wall. It stays below the air pressure outside, which keeps the lungs stretched open.' },
    { t: 'Elastic recoil', d: 'The lungs’ tendency to spring back to a smaller size, which pushes air out when the muscles relax.' },
  ],
  defaults: { rate: 15, vt: 500, jar: true },
  controls: [
    { key: 'rate', type: 'range', label: 'Breathing rate', min: 8, max: 30, step: 1, fmt: (v) => Math.round(v) + ' breaths/min', hint: 'Adults at rest: 12 to 20.' },
    { key: 'vt', type: 'range', label: 'Size of each breath (tidal volume)', min: 250, max: 2500, step: 10, ends: ['shallow', 'deep'], fmt: (v) => Math.round(v) + ' mL', hint: 'A quiet breath is about 500 mL.' },
    { key: 'jar', type: 'toggle', label: 'Show the bell jar model' },
  ],
  quiz: [
    { q: 'What happens to the pressure in your air sacs when your chest gets bigger?', options: ['It rises', 'It falls below the air outside', 'It stays the same', 'It becomes a vacuum'], answer: 1, why: 'More volume for the same gas means lower pressure (Boyle’s law), so outside air pushes in.' },
    { q: 'Which muscle does most of the work of breathing in at rest?', options: ['The heart', 'The diaphragm', 'The abdominal muscles', 'The lungs themselves'], answer: 1, why: 'The diaphragm flattens as it contracts, making the chest taller. Lungs have no muscles to pull air in.' },
    { q: 'At 15 breaths a minute of 500 mL each, how much air do you breathe per minute?', options: ['0.5 L', '3 L', '7.5 L', '15 L'], answer: 2, why: '15 × 0.5 L = 7.5 L each minute: the minute ventilation.' },
  ],
  reel: [
    { ms: 5400, caption: 'The diaphragm flattens, the chest grows, pressure drops, and air rushes in: Boyle’s law.', set: { rate: 14, jar: true }, anim: { vt: [700, 2000] }, view: { pos: [0.7, 4.6, 13.2], target: [0.35, 4.25, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const C = makeChest({ head: false, tree: true, depth: 4, heart: false });
    root.add(C.root);

    // ---------------- the bell jar: a glass jar, a Y-tube through the stopper, two balloons, a rubber floor
    const jar = new THREE.Group(); jar.position.set(JX, 0.2, 0.6); jar.scale.setScalar(0.85); root.add(jar);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.3, 3.0, 40, 1, true), M.clear(0xcfe8ff, 0.16));
    glass.position.y = 1.9; jar.add(glass);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.04, 8, 48), M.clear(0xcfe8ff, 0.4)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.4; jar.add(rim);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.35, 24), M.plastic(0x5a4a3f)); lid.position.y = 3.55; jar.add(lid);
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(1.25, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2.6), M.clear(0xcfe8ff, 0.16)); shoulder.position.y = 3.3; shoulder.scale.y = 0.3; jar.add(shoulder);
    const pipe = M.plastic(0xd9e2ea, { roughness: 0.3 });
    jar.add(tube([[0, 4.3, 0], [0, 2.9, 0]], 0.07, pipe, false, 8));
    jar.add(tube([[0, 2.9, 0], [-0.5, 2.45, 0]], 0.06, pipe, false, 8));
    jar.add(tube([[0, 2.9, 0], [0.5, 2.45, 0]], 0.06, pipe, false, 8));
    const balloonMat = M.plastic(0xf09aa8, { roughness: 0.35, transparent: true, opacity: 0.9 });
    const balloons = [-1, 1].map((s) => { const b = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), balloonMat); b.position.set(s * 0.55, 2.0, 0); jar.add(b); return b; });
    const sheetG = new THREE.CircleGeometry(1.3, 40, 0, Math.PI * 2); sheetG.rotateX(-Math.PI / 2);
    const sheetBase = sheetG.attributes.position.array.slice();
    const sheet = new THREE.Mesh(sheetG, M.plastic(0xc23b48, { side: THREE.DoubleSide, roughness: 0.7 })); sheet.position.y = 0.4; jar.add(sheet);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 12), M.plastic(0x3b3f4a)); jar.add(knob);
    const knobBall = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), M.plastic(0x3b3f4a)); jar.add(knobBall);
    const jarAirPaths = [-1, 1].map((s) => pathOf([[0, 4.6, 0], [0, 2.9, 0], [s * 0.5, 2.45, 0], [s * 0.55, 2.0, 0]]));
    const jarAir = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), 24);
    jar.add(jarAir);
    const jarU = Array.from({ length: 24 }, (_, i) => i / 24);

    // ---------------- airflow into the real chest: down the trachea into both bronchi
    const tips = C.tree.tips.filter((_, i) => i % 5 === 0);
    const paths = tips.map((t) => pathOf([[0, 8.2, -0.05], ...t.trail]));
    const NP = 90;
    const air = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), NP);
    air.frustumCulled = false; root.add(air);
    const PU = Array.from({ length: NP }, (_, i) => ({ u: (i * 0.618) % 1, p: paths[i % paths.length] }));

    // ---------------- chart board: volume and pressure against time, and the pressure–volume loop
    const hist = [];
    let now = { v: 0, Palv: 0, Ppl: -5, flow: 0 }, vtNow = 0.5;
    const chart = canvasTexture(520, 640, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(10,12,18,.9)'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#e8eef8'; g.font = 'bold 26px sans-serif'; g.fillText('Pressure and volume', 20, 38);
      // top: traces over the last 12 s
      const x0 = 70, x1 = w - 18, yV0 = 250, yV1 = 70;
      const span = 12, tNow = hist.length ? hist[hist.length - 1].t : 0;
      const X = (t) => x1 - ((tNow - t) / span) * (x1 - x0);
      const vMax = Math.max(0.6, vtNow * 1.1);
      const YV = (v) => yV0 - (v / vMax) * (yV0 - yV1);
      const pMax = Math.max(1.5, (MECH.R_AW * vtNow * Math.PI) / 1.2);
      const YP = (p) => (yV0 + yV1) / 2 - (p / pMax) * ((yV0 - yV1) / 2);
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x0, YP(0)); g.lineTo(x1, YP(0)); g.stroke();
      g.font = '16px sans-serif'; g.fillStyle = 'rgba(255,255,255,.55)';
      g.fillText('0', x0 - 22, YP(0) + 5);
      const line = (key, Y, col) => { g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); hist.forEach((q, i) => { const x = X(q.t); if (x < x0) return; i && X(hist[i - 1].t) >= x0 ? g.lineTo(x, Y(q[key])) : g.moveTo(x, Y(q[key])); }); g.stroke(); };
      line('v', YV, '#5ab8ff'); line('Palv', YP, '#ffb547');
      g.font = 'bold 17px sans-serif'; g.fillStyle = '#5ab8ff'; g.fillText('Lung volume (above resting)', x0, yV0 + 26);
      g.fillStyle = '#ffb547'; g.fillText('Alveolar pressure (cmH₂O)', x0, yV0 + 48);
      // bottom: volume against pleural pressure (a loop, because air needs a push to flow)
      const lx0 = 80, lx1 = w - 30, ly0 = h - 60, ly1 = 350;
      const pLo = -5 - vtNow / MECH.C_L - pMax - 0.5, pHi = -3;
      const LX = (p) => lx1 - ((p - pHi) / (pLo - pHi)) * (lx1 - lx0);
      const LY = (v) => ly0 - (v / vMax) * (ly0 - ly1);
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(lx0, ly1); g.lineTo(lx0, ly0); g.lineTo(lx1, ly0); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '16px sans-serif';
      for (let p = Math.ceil(pLo / 2) * 2; p <= pHi; p += 2) { const x = LX(p); g.fillText(String(p), x - 10, ly0 + 20); }
      g.fillText('Pleural pressure (cmH₂O)', lx0 + 60, ly0 + 44);
      g.save(); g.translate(22, ly0 - 10); g.rotate(-Math.PI / 2); g.fillText('Volume', 0, 0); g.restore();
      g.strokeStyle = '#5ce1a9'; g.lineWidth = 3; g.beginPath();
      const loop = hist.slice(-Math.min(hist.length, 400));
      loop.forEach((q, i) => (i ? g.lineTo(LX(q.Ppl), LY(q.v)) : g.moveTo(LX(q.Ppl), LY(q.v)))); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(LX(now.Ppl), LY(now.v), 7, 0, Math.PI * 2); g.fill();
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 3.82), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, toneMapped: false }));
    board.position.set(BX, BY, 0); board.rotation.y = -0.2; root.add(board);

    // ---------------- labels
    const lDia = stage.label('Diaphragm', [1.2, 1.9, 1.6], root);
    stage.label('Ribs lift up and out', [2.4, 6.1, 1.0], root);
    const lPres = stage.label('', [1.6, 7.7, 0], root, 'hot');
    const lJar = stage.label('Rubber sheet = diaphragm', [JX, -0.35, 1.4], root);
    const lJar2 = stage.label('Balloons = lungs', [JX + 1.0, 3.3, 1.2], root);
    const jarLabels = [lJar, lJar2];

    let ph = 0, redraw = 0, T = 0, b = breath(0);
    const o = new THREE.Object3D(), inC = new THREE.Color(O2C), outC = new THREE.Color(CO2C), p = new THREE.Vector3();
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        const Tb = 60 / s.rate, VT = s.vt / 1000;
        ph = (ph + dt / Tb) % 1; T += dt;
        b = breath(ph * Tb, s.rate, VT);
        now = b; vtNow = VT;
        C.breathe(b.v);
        C.cage.setXray(0.45);
        // Jar: the sheet sinks by the volume change; balloons swell by the same volume.
        jar.visible = s.jar; jarLabels.forEach((l) => { l.visible = s.jar; });
        const pull = b.v * 0.28;
        const pa = sheetG.attributes.position;
        for (let i = 0; i < pa.count; i++) { const x = sheetBase[i * 3], z = sheetBase[i * 3 + 2], r2 = (x * x + z * z) / (1.3 * 1.3); pa.setY(i, -pull * (1 - r2)); }
        pa.needsUpdate = true; sheetG.computeVertexNormals();
        knob.position.set(0, 0.4 - pull - 0.25, 0); knobBall.position.set(0, 0.4 - pull - 0.52, 0);
        const r = 0.42 * Math.cbrt(1 + b.v * 0.7);
        balloons.forEach((bl) => bl.scale.setScalar(r));
        const du = (b.flow * dt) / 1.3;
        for (let i = 0; i < 24; i++) {
          jarU[i] = (jarU[i] + du * 2 + 1) % 1;
          jarAirPaths[i % 2].at(jarU[i], p); o.position.copy(p); o.updateMatrix(); jarAir.setMatrixAt(i, o.matrix);
          jarAir.setColorAt(i, b.inhale ? inC : outC);
        }
        jarAir.instanceMatrix.needsUpdate = true; jarAir.instanceColor.needsUpdate = true;
        for (let i = 0; i < NP; i++) {
          const q = PU[i];
          q.u += du * 0.8;
          if (q.u > 1) { q.u -= 1; q.p = paths[(i * 7 + Math.floor(T)) % paths.length]; }
          if (q.u < 0) { q.u += 1; q.p = paths[(i * 3 + Math.floor(T)) % paths.length]; }
          q.p.at(q.u, p); o.position.copy(p); o.updateMatrix(); air.setMatrixAt(i, o.matrix);
          air.setColorAt(i, b.inhale ? inC : outC);
        }
        air.instanceMatrix.needsUpdate = true; air.instanceColor.needsUpdate = true;
        lPres.element.innerHTML = `Air-sac pressure <b>${b.Palv > 0 ? '+' : ''}${b.Palv.toFixed(1)}</b> cmH₂O`;
        lDia.element.textContent = b.inhale ? 'Diaphragm contracts, flattens' : 'Diaphragm relaxes, domes up';
        hist.push({ t: T, v: b.v, Palv: b.Palv, Ppl: b.Ppl });
        while (hist.length && hist[0].t < T - 13) hist.shift();
        redraw += dt; if (redraw > 0.05) { redraw = 0; chart.redraw(); }
      },
      readout: (s) => {
        const VT = s.vt / 1000, mv = s.rate * VT, av = s.rate * Math.max(0, VT - GUYTON.DEAD);
        const pct = Math.abs(b.Palv) / MECH.PATM_CMH2O * 100;
        return `<div class="big">${b.inhale ? 'Breathing in' : 'Breathing out'}</div>
          <div class="row"><span>Rate × tidal volume</span><b>${Math.round(s.rate)} × ${Math.round(s.vt)} mL</b></div>
          <div class="row"><span>Minute ventilation</span><b>${mv.toFixed(1)} L/min</b></div>
          <div class="row"><span>Reaching the air sacs</span><b>${av.toFixed(1)} L/min</b></div>
          <div class="row"><span>Air-sac pressure now</span><b>${b.Palv > 0 ? '+' : ''}${b.Palv.toFixed(1)} cmH₂O</b></div>
          <small>Only ${pct.toFixed(2)}% of the air pressure around you.</small>`;
      },
    };
  },
};
