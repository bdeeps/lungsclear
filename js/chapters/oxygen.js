// Chapter 4: how blood carries oxygen.
// - Haemoglobin: four subunits (2 α, 2 β), each with a haem group whose iron binds one O₂.
//   About 270 million haemoglobin molecules per red cell (a standard textbook figure).
// - Oxygen–haemoglobin dissociation curve: Severinghaus (1979) with his pH, PCO₂ and temperature
//   correction (lungs.js → satO2). P50 ≈ 27 mmHg; S ≈ 97–98% at PO₂ 100 mmHg.
// - Altitude: West (1996) barometric model, alveolar gas equation (lungs.js → altitudeGas).
//   The Everest preset uses West et al. (1983, J Appl Physiol 55:678) summit measurements:
//   alveolar PCO₂ ≈7.5 mmHg, arterial pH above 7.7, alveolar PO₂ ≈35 mmHg, arterial PO₂ ≈28.
// - Pulse oximetry: red (≈660 nm) and infrared (≈940 nm) light; oxygen-rich haemoglobin absorbs
//   less red and more infrared than oxygen-poor haemoglobin. The device takes the pulsing part (AC)
//   over the steady part (DC) at each colour: R = (AC₆₆₀/DC₆₆₀)/(AC₉₄₀/DC₉₄₀), and a calibration
//   curve maps R to SpO₂. A common linear approximation is SpO₂ ≈ 110 − 25 R (R ≈ 1 ↔ 85%,
//   R ≈ 0.5 ↔ 97%); real devices use their own empirical curves.
// - NHS (nhs.uk, "How to look after yourself at home if you have coronavirus / pulse oximeters")
//   gives 95% or above as a usual reading; the US FDA (2021) and NHS England note that pulse
//   oximeters can overestimate oxygen levels in people with darker skin.
import { THREE, M, tube, canvasTexture, clamp, lerp } from '../kit.js';
import { satO2, p50, altitudeGas, o2content, bloodColor, cssBlood, O2C, rng, HB } from '../lungs.js';

const PLACES = [[0, 'sea level (Mumbai)'], [920, 'Bengaluru'], [2276, 'Shimla'], [3524, 'Leh, Ladakh'], [5364, 'Everest Base Camp'], [8849, 'the top of Everest']];
const placeAt = (h) => PLACES.reduce((best, p) => (Math.abs(p[0] - h) < Math.abs(best[0] - h) ? p : best));

// At rest the body takes about 50 mL of O₂ from each litre of blood (250 mL/min from a 5 L/min
// cardiac output: Guyton & Hall), so blood coming back is about 25 percentage points emptier.
export function oxy(s) {
  const cond = { pH: s.pH, PCO2: s.pco2, T: s.temp };
  const g = altitudeGas(s.alt, s.pco2);
  const Sa = satO2(g.PaO2, cond);
  const Sv = Math.max(0.02, Sa - 50 / (1.34 * HB * 10));
  let lo = 1, hi = 100; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (satO2(m, cond) < Sv) lo = m; else hi = m; }
  const R = clamp((110 - Sa * 100) / 25, 0.3, 3.4);
  return { ...g, cond, Sa, Sv, Pv: lo, P50: p50(cond), R, content: o2content(Sa, g.PaO2) * 10, busy: satO2(20, cond) };
}

export default {
  id: 'oxygen',
  short: 'Carrying oxygen',
  title: 'How blood carries oxygen',
  subtitle: 'Haemoglobin grabs oxygen in the lungs and lets it go where it is needed.',
  view: { pos: [0.2, 4.0, 10.8], target: [-0.1, 3.3, 0] },
  learn: `<p>Very little oxygen dissolves in blood plasma. Almost all of it rides on <b>haemoglobin</b>, the protein that makes red blood cells red. Each haemoglobin molecule has four parts, and each part holds an iron atom that can grab <b>one O₂ molecule</b>, so four in all. One red cell carries about 270 million haemoglobin molecules.</p>
    <p>Haemoglobin is a team player. Once one oxygen sticks, the others stick more easily. That gives the <b>oxygen–haemoglobin dissociation curve</b> its S shape: at the 100 mmHg in your lungs the blood fills to about <b>97–98%</b>, and half full needs only about <b>27 mmHg</b>, the <b>P50</b>. On the steep middle part, small drops in oxygen let lots of it go, right where your tissues need it.</p>
    <p>Busy muscles are warmer, more acidic and full of CO₂. All three push the curve to the right, so haemoglobin lets go of more oxygen. That is the <b>Bohr effect</b>.</p>
    <p>High up, the air is thinner. At <b>Leh</b> (about 3,500 m) the air pressure is two-thirds of sea level, and on the <b>summit of Everest</b> it is about a third: 253 mmHg. Climbers breathe hard to blow off CO₂, which makes room for more oxygen in the air sacs.</p>
    <p>A <b>pulse oximeter</b> shines red and infrared light through your finger. Oxygen-rich blood absorbs less red light and more infrared, so the ratio of the two pulsing signals tells the saturation, <b>SpO₂</b>. Most healthy people read 95% or more at sea level. Readings can be less accurate on darker skin, cold fingers or nail polish, and they are only part of the picture: if you are worried about your breathing or a reading, see a doctor.</p>
    <p class="tip"><b>Try it:</b> climb to Leh, then to the top of Everest, and watch the saturation slide down the steep part of the curve. Then lower the CO₂ to breathe like a climber.</p>`,
  terms: [
    { t: 'Haemoglobin', d: 'The iron-containing protein in red blood cells; each molecule carries up to four oxygen molecules.' },
    { t: 'Saturation (SpO₂)', d: 'How full of oxygen your haemoglobin is, as a percentage. SpO₂ is the value a pulse oximeter measures.' },
    { t: 'P50', d: 'The oxygen partial pressure at which haemoglobin is half full: about 27 mmHg in a healthy adult.' },
    { t: 'Bohr effect', d: 'Acid, CO₂ and heat make haemoglobin release oxygen more easily, shifting the curve to the right.' },
    { t: 'Pulse oximeter', d: 'A clip that estimates oxygen saturation by comparing how much red and infrared light pulsing blood absorbs.' },
  ],
  defaults: { alt: 0, pH: 7.4, pco2: 40, temp: 37 },
  controls: [
    { key: 'alt', type: 'range', label: 'Altitude', min: 0, max: 8849, step: 1, fmt: (v) => `${Math.round(v).toLocaleString('en-IN')} m`, hint: 'Leh is about 3,500 m; Everest is 8,849 m.' },
    { key: 'pco2', type: 'range', label: 'CO₂ in the blood', min: 7, max: 70, step: 1, ends: ['breathing hard', 'held breath'], fmt: (v) => Math.round(v) + ' mmHg' },
    { key: 'pH', type: 'range', label: 'Blood pH', min: 7.2, max: 7.8, step: 0.01, ends: ['acidic', 'alkaline'], fmt: (v) => v.toFixed(2) },
    { key: 'temp', type: 'range', label: 'Temperature', min: 35, max: 41, step: 0.1, fmt: (v) => v.toFixed(1) + ' °C' },
    { key: 'preset', type: 'buttons', label: 'Try a scene', items: [
      { label: 'Resting', act: (s) => Object.assign(s, { alt: 0, pH: 7.4, pco2: 40, temp: 37 }) },
      { label: 'Hard-working muscle', act: (s) => Object.assign(s, { alt: 0, pH: 7.25, pco2: 55, temp: 39.5 }) },
      { label: 'Climber on Everest', act: (s) => Object.assign(s, { alt: 8849, pH: 7.7, pco2: 8, temp: 37 }) },
    ] },
  ],
  quiz: [
    { q: 'How many oxygen molecules can one haemoglobin molecule carry?', options: ['One', 'Two', 'Four', 'Hundreds'], answer: 2, why: 'It has four subunits, each with an iron-containing haem group that binds one O₂.' },
    { q: 'What does the Bohr effect do in a working muscle?', options: ['Makes haemoglobin hold oxygen tighter', 'Helps haemoglobin release more oxygen', 'Stops blood flow', 'Turns CO₂ into oxygen'], answer: 1, why: 'Acid, CO₂ and heat shift the curve right, so more oxygen is unloaded where it is needed.' },
    { q: 'Why is it harder to get oxygen on a high mountain?', options: ['The air has less than 21% oxygen', 'The air pressure is lower, so oxygen’s partial pressure is lower', 'It is colder', 'The sun uses it up'], answer: 1, why: 'Air is still 21% oxygen, but there is less air pushing on your lungs, so less oxygen diffuses in.' },
  ],
  reel: [
    { ms: 5400, caption: 'Each haemoglobin molecule grabs four oxygen molecules. That turns blood bright red.', set: { alt: 0, pH: 7.4, pco2: 40, temp: 37 }, view: { pos: [0.2, 3.4, 7.2], target: [-0.9, 2.6, 0.3] }, spin: 0.5 },
    { ms: 5600, caption: 'Climb Everest and the air is so thin your blood carries far less oxygen.', set: { pH: 7.4, pco2: 40, temp: 37 }, anim: { alt: [0, 8849], pco2: [40, 8], pH: [7.4, 7.7] }, view: { pos: [0.2, 4.0, 10.8], target: [-0.1, 3.3, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rand = rng(21);
    const HC = new THREE.Vector3(-0.9, 2.55, 0.3);

    // ---------------- a red cell (ghost) around one haemoglobin molecule, drawn much bigger
    const prof = []; for (let i = 0; i <= 24; i++) { const x = i / 24; prof.push(new THREE.Vector2(2.4 * x, 1.2 * Math.sqrt(Math.max(0, 1 - x * x)) * (0.207 + 2.003 * x * x - 1.123 * x ** 4) + 0.02)); }
    const half = new THREE.LatheGeometry(prof, 48);
    const cellMat = new THREE.MeshStandardMaterial({ color: 0xff3b4a, roughness: 0.4, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
    const cell = new THREE.Group(); cell.position.copy(HC); cell.rotation.set(0.45, 0.3, 0.2); root.add(cell);
    const top = new THREE.Mesh(half, cellMat), bot = new THREE.Mesh(half, cellMat); bot.rotation.x = Math.PI; cell.add(top, bot);

    const hb = new THREE.Group(); hb.position.copy(HC); root.add(hb);
    const subs = [];
    const alpha = M.plastic(0xc9a2ff, { roughness: 0.5 }), beta = M.plastic(0x8fd0ff, { roughness: 0.5 });
    const haem = M.plastic(0xc2233a, { roughness: 0.35 }), iron = M.metal(0xff9a4a, { roughness: 0.3 });
    const SUB = [[0.62, 0.5, 0.45, alpha], [-0.62, 0.5, -0.45, alpha], [0.62, -0.5, -0.45, beta], [-0.62, -0.5, 0.45, beta]];
    const o2Mat = M.glow(O2C);
    SUB.forEach(([x, y, z, mat], i) => {
      const g = new THREE.Group(); g.position.set(x, y, z); hb.add(g);
      for (let k = 0; k < 7; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.34 + rand() * 0.12, 20, 14), mat); b.position.set((rand() - 0.5) * 0.45, (rand() - 0.5) * 0.45, (rand() - 0.5) * 0.45); b.castShadow = true; g.add(b); }
      const out = new THREE.Vector3(x, y, z).normalize();
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 20), haem); disc.position.copy(out.clone().multiplyScalar(0.55)); disc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), out); g.add(disc);
      const fe = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), iron); fe.position.copy(disc.position); g.add(fe);
      const mol = new THREE.Group();
      const a1 = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), o2Mat), a2 = a1.clone(); a1.position.x = -0.11; a2.position.x = 0.11; mol.add(a1, a2);
      root.add(mol);
      subs.push({ g, out, site: HC.clone().add(new THREE.Vector3(x, y, z)).add(out.clone().multiplyScalar(0.72)), mol, bound: 0, free: HC.clone().add(out.clone().multiplyScalar(2.6 + rand() * 0.4)).add(new THREE.Vector3(0, (rand() - 0.5) * 0.6, 0)) });
    });

    // ---------------- the pulse oximeter: a finger in a clip
    const ox = new THREE.Group(); ox.position.set(-3.9, 0.8, 1.2); ox.rotation.y = 0.3; root.add(ox);
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 1.9, 8, 20), M.plastic(0xd9a58a, { roughness: 0.6, transparent: true, opacity: 0.75 }));
    finger.rotation.z = Math.PI / 2; finger.position.x = 0.3; ox.add(finger);
    const clipMat = M.plastic(0x2f6fd6, { roughness: 0.4 });
    const upper = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.32, 0.9), clipMat); upper.position.y = 0.5; ox.add(upper);
    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.9), M.plastic(0xe9edf3)); lower.position.y = -0.5; ox.add(lower);
    const ledR = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), M.glow(0xff2a2a)); ledR.position.set(-0.12, 0.33, 0); ox.add(ledR);
    const ledI = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), M.glow(0x8a2be2)); ledI.position.set(0.12, 0.33, 0); ox.add(ledI);
    const beamR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.66, 12), M.ghost(0xff3030, 0.45)); beamR.position.set(-0.12, 0, 0); ox.add(beamR);
    const beamI = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.66, 12), M.ghost(0xb070ff, 0.35)); beamI.position.set(0.12, 0, 0); ox.add(beamI);
    const diode = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.25), M.plastic(0x1b1d24)); diode.position.set(0, -0.33, 0); ox.add(diode);
    let pulse = 0, S = 0.975, info = oxy({ alt: 0, pH: 7.4, pco2: 40, temp: 37 });
    const scr = canvasTexture(320, 200, (g, w, h) => {
      g.fillStyle = '#081018'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#5ce1a9'; g.font = 'bold 22px sans-serif'; g.fillText('SpO₂', 16, 34);
      g.font = 'bold 76px sans-serif'; g.fillText(String(Math.round(S * 100)), 16, 112);
      g.font = 'bold 26px sans-serif'; g.fillText('%', 118, 112);
      g.fillStyle = '#ffb547'; g.font = '18px sans-serif'; g.fillText(`R = ${info.R.toFixed(2)}`, 176, 40);
      g.strokeStyle = '#8ef0ff'; g.lineWidth = 3; g.beginPath();
      for (let i = 0; i <= 60; i++) { const x = 170 + i * 2.3, ph = (pulse - i / 60 * 1.6) % 1, k = ((ph % 1) + 1) % 1; const y = 150 - 40 * (k < 0.18 ? Math.sin((k / 0.18) * Math.PI / 2) : Math.exp(-(k - 0.18) * 4) * (1 + 0.15 * Math.sin((k - 0.18) * 20))); i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,.5)'; g.font = '15px sans-serif'; g.fillText('red 660 nm · IR 940 nm', 16, 186);
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.6), new THREE.MeshBasicMaterial({ map: scr.tex, toneMapped: false }));
    screen.position.set(0, 0.72, 0.46); screen.rotation.x = -0.45; ox.add(screen);

    // ---------------- chart: the S-shaped curve
    const chart = canvasTexture(560, 480, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(10,12,18,.9)'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#e8eef8'; g.font = 'bold 25px sans-serif'; g.fillText('Oxygen–haemoglobin curve', 18, 36);
      const x0 = 70, x1 = w - 20, y0 = h - 64, y1 = 64;
      const X = (p) => x0 + (p / 120) * (x1 - x0), Y = (sv) => y0 - sv * (y0 - y1);
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, y0); g.lineTo(x1, y0); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '16px sans-serif';
      for (const v of [0, 25, 50, 75, 100]) { g.fillText(v + '%', 18, Y(v / 100) + 5); g.strokeStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(x0, Y(v / 100)); g.lineTo(x1, Y(v / 100)); g.stroke(); }
      for (const p of [0, 20, 40, 60, 80, 100, 120]) g.fillText(String(p), X(p) - 10, y0 + 22);
      g.fillText('Oxygen partial pressure (mmHg)', x0 + 100, y0 + 48);
      const curve = (cond, col, wid) => { g.strokeStyle = col; g.lineWidth = wid; g.beginPath(); for (let p = 0; p <= 120; p += 1) { const yy = Y(satO2(p, cond)); p ? g.lineTo(X(p), yy) : g.moveTo(X(p), yy); } g.stroke(); };
      curve({}, 'rgba(255,255,255,.35)', 2);
      curve(info.cond, '#ff5a6a', 4);
      // P50
      g.setLineDash([5, 5]); g.strokeStyle = 'rgba(255,181,71,.8)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x0, Y(0.5)); g.lineTo(X(info.P50), Y(0.5)); g.lineTo(X(info.P50), y0); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#ffb547'; g.font = 'bold 16px sans-serif'; g.fillText(`P50 = ${info.P50.toFixed(0)}`, X(info.P50) + 6, Y(0.5) + 20);
      // arterial and venous points
      const dot = (p, sv, col, text, dy) => { g.fillStyle = col; g.beginPath(); g.arc(X(p), Y(sv), 8, 0, Math.PI * 2); g.fill(); g.font = 'bold 16px sans-serif'; g.fillText(text, Math.min(X(p) - 40, x1 - 150), Y(sv) + dy); };
      dot(info.Pv, info.Sv, cssBlood(info.Sv), `Back from body ${Math.round(info.Sv * 100)}%`, 28);
      dot(info.PaO2, info.Sa, cssBlood(info.Sa), `Lungs ${Math.round(info.Sa * 100)}%`, -14);
      g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '15px sans-serif'; g.fillText('Grey: resting curve', x1 - 150, y0 - 12);
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 3.34), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, toneMapped: false }));
    board.position.set(3.2, 4.0, -0.4); board.rotation.y = -0.22; root.add(board);

    stage.label('Haemoglobin: 4 parts, 4 O₂', [HC.x, HC.y + 1.55, 0.3], root);
    const legend = stage.label('<span style="color:#c9a2ff">●</span> α &nbsp;<span style="color:#8fd0ff">●</span> β &nbsp;<span style="color:#ff5a6a">●</span> haem (iron)', [HC.x, HC.y - 1.75, 0.8], root);
    const lCell = stage.label('Red cell (not to scale)', [HC.x + 2.1, HC.y - 1.2, 0.4], root);
    stage.label('Pulse oximeter', [-3.9, -0.1, 1.6], root);

    let key = '', t = 0, redraw = 0;
    const col = new THREE.Color();
    return {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        const k = `${s.alt}|${s.pH}|${s.pco2}|${s.temp}`;
        if (k !== key) { key = k; info = oxy(s); chart.redraw(); }
        S += (info.Sa - S) * Math.min(1, dt * 2);
        cellMat.color.copy(bloodColor(S, col));
        // Bound sites follow saturation: 4 × S rounded, filling one by one (cooperative binding).
        const nBound = Math.round(S * 4);
        subs.forEach((q, i) => {
          const want = i < nBound ? 1 : 0;
          q.bound += (want - q.bound) * Math.min(1, dt * 3);
          const wob = new THREE.Vector3(Math.sin(t * 1.3 + i), Math.cos(t * 1.1 + i * 2), Math.sin(t * 0.9 + i * 3)).multiplyScalar(0.25 * (1 - q.bound));
          q.mol.position.copy(q.free).lerp(q.site, q.bound).add(wob);
          q.mol.lookAt(HC);
          q.g.rotation.y = 0.12 * (nBound / 4) * (i % 2 ? -1 : 1);   // T → R state: subunits shift as oxygen binds
        });
        hb.rotation.y += dt * 0.25;
        legend.visible = lCell.visible = stage.host.clientWidth >= 560;
        pulse = (pulse + dt * 1.2) % 1;
        const beat = Math.exp(-((pulse % 1) * 6));
        finger.scale.set(1, 1 + 0.03 * beat, 1 + 0.03 * beat);
        beamR.material.opacity = 0.2 + 0.35 * (1 - S) + 0.1 * beat;
        beamI.material.opacity = 0.2 + 0.25 * S;
        redraw += dt; if (redraw > 0.1) { redraw = 0; scr.redraw(); }
      },
      readout: (s) => {
        const q = oxy(s);
        const [, where] = placeAt(s.alt);
        return `<div class="big">Blood ${Math.round(q.Sa * 100)}% full of oxygen</div>
          <div class="row"><span>Where</span><b>${where}</b></div>
          ${stage.host.clientWidth < 560 ? '' : `<div class="row"><span>Air pressure</span><b>${Math.round(q.PB)} mmHg</b></div>`}
          <div class="row"><span>O₂ in the air sacs</span><b>${Math.round(q.PAO2)} mmHg</b></div>
          <div class="row"><span>Half-full point (P50)</span><b>${q.P50.toFixed(0)} mmHg</b></div>
          ${stage.host.clientWidth < 560 ? '' : `<div class="row"><span>O₂ carried per litre of blood</span><b>${Math.round(q.content)} mL</b></div>
          <div class="row"><span>Left at 20 mmHg (busy muscle)</span><b>${Math.round(q.busy * 100)}%</b></div>`}
          <small>General facts only. Worried? See a doctor.</small>`;
      },
    };
  },
};
