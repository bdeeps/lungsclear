// Chapter 3: gas exchange in the alveoli.
// Numbers:
//  - about 480 million alveoli (Ochs et al. 2004, Am J Respir Crit Care Med 169:120, range 274–790 million);
//  - gas-exchange surface ≈70 m² (West's Respiratory Physiology, ch. 1: "50 to 100 m²"; morphometry
//    by Gehr & Weibel gives up to ≈130 m²). A doubles badminton court is 13.4 × 6.1 m = 82 m².
//  - blood–gas barrier ≈0.3–0.5 µm thick in most places (West, ch. 1; Weibel).
//  - alveolar PO₂ ≈100 mmHg, mixed venous 40; PCO₂ 40 vs 46 (West, ch. 3; Guyton & Hall ch. 41).
//  - a red cell spends ≈0.75 s in the capillary at rest and ≈0.25 s in hard exercise; at rest its
//    PO₂ reaches the alveolar value in about a third of that time (West, ch. 3, fig. 3.3).
// Model: blood PO₂ rises towards alveolar PO₂ exponentially, P(t) = PA − (PA − Pv)·e^(−t/τ), with
// τ = 0.05 s for a normal 0.5 µm barrier, growing in proportion to thickness (Fick's law: flux ∝
// A·ΔP/T). A teaching simplification: real uptake also depends on haemoglobin's binding curve.
// Surfactant: Laplace's law P = 2T/r (West, ch. 7). Surface tension of a water-like film ≈50 mN/m;
// surfactant lowers it to a few mN/m, and more so as the alveolus shrinks.
import { THREE, M, tube, canvasTexture, clamp, lerp } from '../kit.js';
import { satO2, bloodColor, O2C, CO2C, pathOf, rng } from '../lungs.js';

const CEN = new THREE.Vector3(0.3, 2.5, 0), R = 2.2;
const PA = 100, PV = 40, PCO2V = 46, PCO2A = 40;
const LX = -4.5, LY = 0.5;               // Laplace demo
export function capillary(thick, exercise) {
  const tau = 0.05 * (thick / 0.5), transit = exercise ? 0.25 : 0.75;
  const P = (t) => PA - (PA - PV) * Math.exp(-t / tau);
  const tauC = tau / 20 * 1.2;           // CO₂ crosses ≈20 times more easily (higher solubility)
  const Pc = (t) => PCO2A + (PCO2V - PCO2A) * Math.exp(-t / Math.max(0.004, tauC));
  const end = P(transit);
  return { tau, transit, P, Pc, end, endCO2: Pc(transit), S: satO2(end) };
}
// Laplace pressures (cmH₂O) for an alveolus of radius r (µm) with or without surfactant.
export function laplace(r, surf) {
  const T = surf ? lerp(2, 25, clamp((r - 40) / 80, 0, 1)) : 50;   // mN/m
  return (2 * T * 1e-3) / (r * 1e-6) / 98.07;
}

export default {
  id: 'alveoli',
  short: 'Gas exchange',
  title: 'Swapping gases in the alveoli',
  subtitle: 'Oxygen slips into the blood, carbon dioxide slips out, all by diffusion.',
  view: { pos: [0.1, 4.6, 12.6], target: [-0.3, 3.8, 0] },
  learn: `<p>At the end of every airway is a bunch of tiny bubbles, the <b>alveoli</b>. Each is about a fifth of a millimetre across, and you have around 480 million. Spread flat, their walls would cover about <b>70 m²</b>, most of a badminton court, all folded into your chest.</p>
    <p>Each alveolus is wrapped in a net of <b>capillaries</b>, blood vessels so narrow that red blood cells pass in single file. Between air and blood lies a wall only about <b>0.5 µm</b> thick, a hundred times thinner than a sheet of paper.</p>
    <p>No pump pushes the gases across. They <b>diffuse</b>, spreading from where there is more to where there is less (<a href="/osmosisclear/">see diffusion and osmosis</a>). Air in the alveoli has an oxygen <b>partial pressure</b> of about 100 mmHg; blood arriving from the body has only 40. So oxygen moves into the blood. Carbon dioxide goes the other way, from 46 in the blood to 40 in the air. <b>Fick’s law</b> says the flow grows with the area and the pressure difference, and shrinks as the wall gets thicker.</p>
    <p>The inside of each alveolus is wet, and a wet bubble wants to collapse. Your lungs make <b>surfactant</b>, a soapy film that lowers the surface tension. By <b>Laplace’s law</b>, P = 2T/r, small bubbles need more pressure to stay open, so without surfactant small alveoli would empty into big ones.</p>
    <p class="tip"><b>Try it:</b> thicken the barrier, then switch on exercise. Watch the red cells leave before they have filled with oxygen. Then switch off the surfactant.</p>`,
  terms: [
    { t: 'Diffusion', d: 'The spreading of molecules from where they are crowded to where they are sparse, with no pump needed.' },
    { t: 'Partial pressure', d: 'The share of a gas mixture’s pressure due to one gas. Gases diffuse from high partial pressure to low.' },
    { t: 'Fick’s law', d: 'Gas flow through a sheet grows with its area and the pressure difference, and falls as the sheet gets thicker.' },
    { t: 'Capillary', d: 'The narrowest blood vessel, just wide enough for red blood cells to pass one at a time.' },
    { t: 'Surfactant', d: 'A soapy mix of fats and proteins that lines the alveoli and lowers surface tension so they don’t collapse.' },
  ],
  defaults: { thick: 0.5, area: 70, exercise: false, surf: true },
  controls: [
    { key: 'thick', type: 'range', label: 'Air–blood barrier', min: 0.3, max: 3, step: 0.05, ends: ['thin (healthy)', 'thick'], fmt: (v) => v.toFixed(2) + ' µm', hint: 'Fluid or scarring can thicken it.' },
    { key: 'area', type: 'range', label: 'Surface area', min: 15, max: 100, step: 1, ends: ['damaged', 'large'], fmt: (v) => Math.round(v) + ' m²' },
    { key: 'exercise', type: 'toggle', label: 'Hard exercise (blood rushes through)' },
    { key: 'surf', type: 'toggle', label: 'Surfactant' },
  ],
  quiz: [
    { q: 'What moves oxygen from the air sacs into the blood?', options: ['A tiny pump in each alveolus', 'Diffusion, from high partial pressure to low', 'The heart sucking it in', 'The diaphragm pushing it'], answer: 1, why: 'Alveolar air has an oxygen partial pressure near 100 mmHg, incoming blood about 40, so oxygen diffuses in.' },
    { q: 'By Fick’s law, which change slows gas exchange?', options: ['A bigger surface area', 'A thicker barrier', 'A bigger pressure difference', 'More alveoli'], answer: 1, why: 'Flow is proportional to area times pressure difference, divided by thickness.' },
    { q: 'What does surfactant do?', options: ['Kills germs', 'Lowers surface tension so alveoli don’t collapse', 'Carries oxygen', 'Makes mucus'], answer: 1, why: 'By Laplace’s law, P = 2T/r. Lowering T keeps small alveoli open.' },
  ],
  reel: [
    { ms: 5600, caption: 'Oxygen diffuses into the blood across a wall just half a micrometre thick.', set: { thick: 0.5, area: 70, exercise: false, surf: true }, view: { pos: [1.0, 3.3, 7.4], target: [0.3, 2.5, 0.5] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rand = rng(5);

    // ---------------- the alveolus, cut open at the front, and its neighbours
    stage.floor.visible = false;
    const wallMat = M.plastic(0xf29aaa, { roughness: 0.55, side: THREE.DoubleSide, transparent: true, opacity: 0.62, depthWrite: false });
    const alv = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32, Math.PI * 0.8, Math.PI * 1.4, 0.3, Math.PI - 0.3), wallMat);
    alv.position.copy(CEN); root.add(alv);
    // Rims along the cut edges, so you can see it is open at the front.
    const rimMat = M.plastic(0xd9707f, { roughness: 0.5 });
    for (const ph of [Math.PI * 0.8, Math.PI * 2.2]) {
      const pts = [];
      for (let i = 0; i <= 24; i++) { const th = 0.3 + (Math.PI - 0.6) * (i / 24); pts.push(CEN.clone().add(new THREE.Vector3(-Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th)).multiplyScalar(R))); }
      root.add(tube(pts, 0.045, rimMat, false, 48));
    }
    const nbMat = M.plastic(0xf4b5bf, { roughness: 0.5, transparent: true, opacity: 0.16, depthWrite: false });
    const nbs = [];
    for (const [x, y, z, r] of [[-3.0, 3.6, -2.4, 1.5], [3.3, 3.4, -2.6, 1.5], [-2.4, 0.8, -2.6, 1.3], [2.7, 0.7, -2.3, 1.3]]) {
      const n = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), nbMat); n.position.set(x, y, z); root.add(n); nbs.push(n);
    }
    // Alveolar duct leading up to the bronchiole.
    root.add(tube([[CEN.x, CEN.y + R - 0.2, 0], [CEN.x - 0.2, CEN.y + R + 1.2, -0.3], [CEN.x - 0.6, CEN.y + R + 2.4, -0.6]], 0.55, M.plastic(0xf1d6c8, { transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }), false, 30));

    // ---------------- capillary hugging the back of the alveolus
    const cap = [];
    for (let i = 0; i <= 40; i++) {
      const a = lerp(-1.9, 1.9, i / 40);
      const dir = new THREE.Vector3(Math.sin(a), 0.35 * Math.sin(a * 1.6), -Math.cos(a) * 0.9).normalize();
      cap.push(CEN.clone().addScaledVector(dir, R + 0.28));
    }
    const pre = cap[0].clone().add(new THREE.Vector3(-1.6, -0.6, 0.6)), post = cap[cap.length - 1].clone().add(new THREE.Vector3(1.6, -0.5, 0.6));
    const capPts = [pre, ...cap, post];
    const capPath = pathOf(capPts);
    root.add(tube(capPts, 0.26, M.plastic(0xd04a5a, { transparent: true, opacity: 0.32, depthWrite: false, roughness: 0.4 }), false, 160));
    // Second, side capillaries (static) for the net look.
    for (let k = 0; k < 4; k++) {
      const pts = [];
      for (let i = 0; i <= 20; i++) { const a = lerp(-1.4, 1.4, i / 20), e = -0.9 + k * 0.6; pts.push(CEN.clone().addScaledVector(new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)).normalize(), R + 0.2)); }
      root.add(tube(pts, 0.13, M.plastic(0xb84455, { transparent: true, opacity: 0.35, depthWrite: false }), false, 60));
    }
    // Red blood cells: biconcave discs (a lathed dumbbell profile), single file.
    const prof = []; for (let i = 0; i <= 16; i++) { const r = (i / 16) * 0.2; const x = r / 0.2; prof.push(new THREE.Vector2(r, 0.5 * 0.2 * Math.sqrt(Math.max(0, 1 - x * x)) * (0.2 + 2 * x * x - 1.12 * x ** 4) + 0.004)); }
    const half = new THREE.LatheGeometry(prof, 24);
    const NR = 16;
    const rbc = new THREE.InstancedMesh(half, new THREE.MeshStandardMaterial({ roughness: 0.4, side: THREE.DoubleSide }), NR * 2);
    for (let i = 0; i < NR * 2; i++) rbc.setColorAt(i, new THREE.Color(0xffffff));
    root.add(rbc);
    const rbcU = Array.from({ length: NR }, (_, i) => i / NR);

    // ---------------- gas molecules
    const NO = 46, NC = 34;
    const o2 = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 10, 8), M.glow(O2C), NO);
    const co2 = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 10, 8), M.glow(CO2C), NC);
    o2.frustumCulled = co2.frustumCulled = false;
    root.add(o2, co2);
    const randIn = () => { let v; do { v = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1); } while (v.lengthSq() > 1); return CEN.clone().addScaledVector(v, R * 0.8); };
    const mk = () => ({ t: -rand() * 3, start: randIn(), u: 0.5 });
    const O = Array.from({ length: NO }, mk), CC = Array.from({ length: NC }, mk);

    // ---------------- Laplace demo: two bubbles joined by a tube
    const lap = new THREE.Group(); lap.position.set(LX, LY, 0.6); root.add(lap);
    const bubMat = M.plastic(0xf4b5bf, { roughness: 0.3, transparent: true, opacity: 0.8 });
    const bs = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), bubMat), bl = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), bubMat);
    bs.position.x = -0.85; bl.position.x = 0.95; lap.add(bs, bl);
    lap.add(tube([[-0.85, -0.55, 0], [-0.85, -0.85, 0], [0.95, -0.85, 0], [0.95, -0.55, 0]], 0.07, M.plastic(0xf1d6c8), false, 20));
    const lLap = stage.label('', [0.05, -1.35, 0], lap);

    // ---------------- chart: blood PO₂ along the capillary
    let C = capillary(0.5, false);
    const chart = canvasTexture(520, 440, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(10,12,18,.9)'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#e8eef8'; g.font = 'bold 25px sans-serif'; g.fillText('Oxygen in a passing red cell', 18, 36);
      const x0 = 62, x1 = w - 20, y0 = h - 70, y1 = 70;
      const X = (t) => x0 + (t / 0.75) * (x1 - x0), Y = (p) => y0 - ((p - 30) / 80) * (y0 - y1);
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, y0); g.lineTo(x1, y0); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '16px sans-serif';
      for (const p of [40, 60, 80, 100]) { g.fillText(String(p), 22, Y(p) + 5); g.strokeStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.moveTo(x0, Y(p)); g.lineTo(x1, Y(p)); g.stroke(); }
      for (const t of [0, 0.25, 0.5, 0.75]) g.fillText(t.toFixed(2) + ' s', X(t) - 16, y0 + 22);
      g.fillText('Time in the capillary', x0 + 120, y0 + 46);
      g.setLineDash([8, 6]); g.strokeStyle = '#5ab8ff'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, Y(PA)); g.lineTo(x1, Y(PA)); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#5ab8ff'; g.fillText('Air in the alveolus: 100 mmHg', x0 + 150, Y(PA) - 8);
      const N0 = capillary(0.5, false);
      g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 2; g.beginPath();
      for (let i = 0; i <= 60; i++) { const t = (i / 60) * 0.75; i ? g.lineTo(X(t), Y(N0.P(t))) : g.moveTo(X(t), Y(N0.P(t))); } g.stroke();
      g.strokeStyle = '#ff5a6a'; g.lineWidth = 4; g.beginPath();
      for (let i = 0; i <= 60; i++) { const t = (i / 60) * C.transit; i ? g.lineTo(X(t), Y(C.P(t))) : g.moveTo(X(t), Y(C.P(t))); } g.stroke();
      g.fillStyle = '#ff5a6a'; g.beginPath(); g.arc(X(C.transit), Y(C.end), 7, 0, Math.PI * 2); g.fill();
      g.font = 'bold 17px sans-serif'; g.fillText(`Leaves at ${Math.round(C.end)} mmHg`, Math.min(X(C.transit) - 70, x1 - 190), Y(C.end) + 30);
      g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '15px sans-serif'; g.fillText('Grey line: a healthy lung at rest', x0 + 8, y0 - 10);
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.88), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, toneMapped: false }));
    board.position.set(4.3, 5.35, -0.6); board.rotation.y = -0.25; root.add(board);

    const lIn = stage.label('Oxygen-poor blood in', [pre.x + 0.2, pre.y + 0.5, pre.z], root);
    const lOut = stage.label('Oxygen-rich blood out', [post.x + 0.3, post.y - 0.35, post.z], root, 'hot');
    stage.label('Alveolus (cut open)', [CEN.x - 2.3, CEN.y + 1.2, 0.9], root);
    stage.label('From the bronchiole', [CEN.x + 0.9, CEN.y + R + 2.2, -0.6], root);
    const lBar = stage.label('', [CEN.x + 2.3, CEN.y + 0.6, -0.9], root);
    stage.label('<span style="color:#5ab8ff">●</span> O₂ &nbsp; <span style="color:#ffa24a">●</span> CO₂', [CEN.x - 1.6, CEN.y - R - 0.3, 1.0], root);
    stage.label('Capillary', [cap[6].x - 0.5, cap[6].y + 0.5, cap[6].z], root);

    let key = '', rs = 70, rl = 70;
    const o = new THREE.Object3D(), p = new THREE.Vector3(), q = new THREE.Vector3(), col = new THREE.Color();
    const place = (m, i, pos, s = 1) => { o.position.copy(pos); o.rotation.set(0, 0, 0); o.scale.setScalar(s); o.updateMatrix(); m.setMatrixAt(i, o.matrix); };
    return {
      dispose() { stage.floor.visible = true; },
      update(dt, s) {
        dt = Math.max(0, dt);
        const k = `${s.thick}|${s.exercise}`;
        if (k !== key) { key = k; C = capillary(s.thick, s.exercise); chart.redraw(); lBar.element.innerHTML = `Barrier <b>${s.thick.toFixed(2)} µm</b>`; }
        const vis = s.exercise ? 3 : 1;            // blood speed, as shown
        // Red cells: colour follows their oxygen level at that point along the capillary.
        for (let i = 0; i < NR; i++) {
          rbcU[i] = (rbcU[i] + dt * 0.1 * vis) % 1;
          const u = rbcU[i];
          capPath.at(u, p); capPath.at(Math.min(1, u + 0.01), q);
          const ahead = q.clone().sub(p).normalize();
          o.position.copy(p); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), ahead); o.scale.setScalar(1); o.updateMatrix();
          rbc.setMatrixAt(i * 2, o.matrix);
          o.rotateX(Math.PI); o.updateMatrix(); rbc.setMatrixAt(i * 2 + 1, o.matrix);
          const f = clamp((u - 0.1) / 0.8, 0, 1);
          bloodColor(satO2(C.P(f * C.transit)), col);
          rbc.setColorAt(i * 2, col); rbc.setColorAt(i * 2 + 1, col);
        }
        rbc.instanceMatrix.needsUpdate = true; rbc.instanceColor.needsUpdate = true;
        // O₂: drift to the wall, cross the barrier (slower when thick), ride the blood out.
        // Where along the capillary it crosses follows the gradient: mostly near the start.
        const cross = 0.25 * (s.thick / 0.5), rideSpeed = 0.1 * vis;
        const rate = clamp(s.area / 70, 0.2, 1.5);
        const tauFrac = C.tau / C.transit;
        const step = (P, i, mesh, inward) => {
          P.t += dt * (inward ? rate : 1);
          if (P.t < 0) { place(mesh, i, P.start, 0.001); return; }
          if (P.t < dt * 1.5 || !P.cap) {
            const f = Math.min(0.95, -tauFrac * Math.log(1 - rand() * 0.98));
            P.u = inward ? 0.1 + 0.8 * f : 0.1 + 0.8 * Math.min(0.9, rand() * 0.25);
            P.cap = capPath.at(P.u).clone();
            P.wall = CEN.clone().add(P.cap.clone().sub(CEN).setLength(R - 0.02));
            P.start = randIn();
          }
          const tA = 1.0, tB = tA + cross;
          if (inward) {
            if (P.t < tA) place(mesh, i, p.copy(P.start).lerp(P.wall, P.t / tA));
            else if (P.t < tB) place(mesh, i, p.copy(P.wall).lerp(P.cap, (P.t - tA) / cross));
            else {
              const u = P.u + (P.t - tB) * rideSpeed;
              if (u >= 1) { P.t = -rand() * 0.8 / rate; P.cap = null; place(mesh, i, P.start, 0.001); return; }
              place(mesh, i, capPath.at(u, p), 0.8);
            }
          } else {
            // CO₂: from the blood, across the wall, then out of the alveolus up the duct.
            const tC = 0.3 * cross / 0.25 * 0.3 + 0.15;
            if (P.t < 0.4) place(mesh, i, capPath.at(Math.max(0, P.u - (0.4 - P.t) * rideSpeed), p), 0.8);
            else if (P.t < 0.4 + tC) place(mesh, i, p.copy(P.cap).lerp(P.wall, (P.t - 0.4) / tC));
            else {
              const k2 = (P.t - 0.4 - tC) / 2.2;
              if (k2 >= 1) { P.t = -rand() * 0.8; P.cap = null; place(mesh, i, P.start, 0.001); return; }
              const exit = new THREE.Vector3(CEN.x - 0.4, CEN.y + R + 1.8, -0.4);
              const mid = CEN.clone().add(new THREE.Vector3((rand() - 0.5) * 0.02, 0, 0));
              place(mesh, i, k2 < 0.5 ? p.copy(P.wall).lerp(mid, k2 * 2) : p.copy(mid).lerp(exit, (k2 - 0.5) * 2));
            }
          }
        };
        O.forEach((P, i) => step(P, i, o2, true));
        CC.forEach((P, i) => step(P, i, co2, false));
        o2.instanceMatrix.needsUpdate = true; co2.instanceMatrix.needsUpdate = true;
        // Laplace: without surfactant the small bubble empties into the big one.
        const target = s.surf ? [70, 70] : [18, 88];
        rs += (target[0] - rs) * Math.min(1, dt * 0.8); rl += (target[1] - rl) * Math.min(1, dt * 0.8);
        bs.scale.setScalar(0.18 + rs / 140); bl.scale.setScalar(0.18 + rl / 140);
        bs.position.y = bs.scale.x - 0.55; bl.position.y = bl.scale.x - 0.55;
        lLap.element.innerHTML = s.surf ? 'Surfactant: both stay open' : 'No surfactant: the small one collapses';
        lIn.visible = lOut.visible = true;
      },
      readout: (s) => {
        const c = capillary(s.thick, s.exercise);
        const fick = (s.area / 70) * (0.5 / s.thick);
        const Ps = laplace(50, s.surf), Pl = laplace(100, s.surf);
        return `<div class="big">Blood leaves at ${Math.round(c.end)} mmHg</div>
          <div class="row"><span>Oxygen saturation leaving</span><b>${(c.S * 100).toFixed(0)}%</b></div>
          <div class="row"><span>Diffusing power (Fick)</span><b>${fick >= 0.995 && fick <= 1.005 ? 'normal' : (fick * 100).toFixed(0) + '% of normal'}</b></div>
          <div class="row"><span>Time in the capillary</span><b>${c.transit.toFixed(2)} s</b></div>
          <div class="row"><span>CO₂ in blood</span><b>46 → ${c.endCO2.toFixed(0)} mmHg</b></div>
          <div class="row"><span>Pressure to hold open (Laplace)</span><b>${Ps.toFixed(0)} vs ${Pl.toFixed(0)} cmH₂O</b></div>
          <small>Laplace: a 50 µm and a 100 µm alveolus${s.surf ? ', with surfactant' : ', with no surfactant'}.</small>`;
      },
    };
  },
};
