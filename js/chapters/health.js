// Chapter 6: keeping lungs healthy, and what can go wrong. General facts only, never advice.
// Sources (numbers in the text and readout):
//  - Cilia beat ≈10–15 times a second and sweep mucus towards the throat (the mucociliary
//    escalator); tobacco smoke slows and damages them (NHLBI; American Lung Association; West ch. 10).
//  - Poiseuille's law: airway resistance ∝ 1/r⁴ (West ch. 7), so halving the radius → 16× resistance.
//  - WHO global air quality guidelines (22 Sep 2021): PM2.5 annual mean 5 µg/m³, 24-hour mean 15 µg/m³.
//  - IQAir World Air Quality Report: India's national PM2.5 average ≈50.6 µg/m³ (2024); Delhi's
//    annual mean ≈108 µg/m³ (2024) and ≈100 µg/m³ (2025), about 20 times the WHO guideline.
//  - GATS-2 India (2016–17, MoHFW/WHO): 28.6% of adults use tobacco, 10.7% smoke.
//  - WHO Global Tuberculosis Report 2025: about 10.7 million people fell ill with TB in 2024;
//    India had about 25% of them (≈2.7 million), more than any other country. TB is curable.
//  - Cough: peak air speed ≈8 m/s (Tang et al. 2013, schlieren imaging). Sneeze: the gas cloud can
//    carry droplets 7–8 m (Bourouiba, JAMA 2020).
import { THREE, M, tube, clamp, lerp } from '../kit.js';
import { toast } from '../ui.js';
import { poiseuille, rng } from '../lungs.js';

const R0 = 1.3, X0 = -4.0, X1 = 3.0, Y = 1.5;
const LOOKS = { healthy: 0, smoke: 0.12, asthma: 0.5, pneumonia: 0 };

export default {
  id: 'health',
  short: 'Healthy lungs',
  title: 'Keeping lungs healthy',
  subtitle: 'How your airways clean themselves, and what smoke, dirty air and illness do.',
  view: { pos: [0.3, 4.3, 11.2], target: [0.2, 2.7, 0] },
  learn: `<p>Every day you breathe in dust, pollen, germs and soot. Your airways clean themselves. They are lined with sticky <b>mucus</b> that traps particles, and millions of tiny hairs called <b>cilia</b> beat 10 to 15 times a second, sweeping the mucus up to your throat, where you swallow it. This is the <b>mucociliary escalator</b>. A <b>cough</b> blasts out anything stuck, with air rushing out at around 8 m/s; a <b>sneeze</b> can throw droplets 7 to 8 metres, so cover it with your elbow.</p>
    <p><b>Smoking</b> coats the airways in tar and slows and damages the cilia, so dirt and germs stay put. In India about 29% of adults use tobacco in some form (GATS-2, 2016–17). Smoke is the main cause of lung cancer and of <b>COPD</b>, a long-term illness where airways stay narrowed and alveoli are destroyed. Smoke from cooking fires can cause COPD too.</p>
    <p><b>Air pollution</b> matters just as much. The tiniest specks, <b>PM2.5</b>, are 30 times thinner than a hair and reach deep into the lungs. The WHO guideline is a yearly average of <b>5 µg/m³</b>. India’s average is about 50, and Delhi’s is about 100, some 20 times the guideline (IQAir).</p>
    <p>In <b>asthma</b>, airways swell and their muscles squeeze. Because resistance grows with <b>1/r⁴</b> (<a href="/bernoulliclear/">see how fluids flow</a>), halving an airway’s radius makes it 16 times harder to breathe through. In <b>pneumonia</b>, an infection fills alveoli with fluid, so oxygen can’t reach the blood. <b>Tuberculosis (TB)</b> is caused by a germ that spreads through coughs; India has about a quarter of the world’s cases (WHO, 2025). TB is curable, and tests and treatment are free at government health centres in India.</p>
    <p>These are general facts, not medical advice. A cough that lasts more than two weeks, breathlessness, chest pain or coughing blood are reasons to <b>see a doctor</b>. Moving your body helps your lungs and heart work well together (<a href="/energyclear/">see where energy goes</a>).</p>
    <p class="tip"><b>Try it:</b> switch between healthy, smoke, asthma and pneumonia. Crank up the PM2.5 to Delhi’s level, then press Cough.</p>`,
  terms: [
    { t: 'Cilia', d: 'Microscopic hairs lining the airways that beat in waves to move mucus up and out.' },
    { t: 'PM2.5', d: 'Particles smaller than 2.5 micrometres, small enough to reach the alveoli. The WHO yearly guideline is 5 µg/m³.' },
    { t: 'Asthma', d: 'A long-term condition in which the airways become swollen and narrowed, making it hard to breathe out.' },
    { t: 'COPD', d: 'Chronic obstructive pulmonary disease: lasting airway narrowing and alveolar damage, mostly from smoke.' },
    { t: 'Pneumonia', d: 'An infection that fills alveoli with fluid or pus, so less oxygen gets into the blood.' },
    { t: 'Tuberculosis', d: 'A bacterial infection, usually of the lungs, spread by coughing. It is curable with a full course of medicine.' },
  ],
  defaults: { look: 'healthy', narrow: 0, pm: 50 },
  onChange(s, key) { if (key === 'look' || key === null) s.narrow = LOOKS[s.look] ?? 0; },
  controls: [
    { key: 'look', type: 'seg', label: 'Show', options: [{ v: 'healthy', label: 'Healthy' }, { v: 'smoke', label: 'Smoke' }, { v: 'asthma', label: 'Asthma' }, { v: 'pneumonia', label: 'Pneumonia' }] },
    { key: 'narrow', type: 'range', label: 'Airway narrowing', min: 0, max: 0.7, step: 0.01, ends: ['open', 'squeezed'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'pm', type: 'log', label: 'PM2.5 in the air', min: 5, max: 300, fmt: (v) => Math.round(v) + ' µg/m³', hint: '5: WHO guideline · 50: India average · 100: Delhi average.' },
    { key: 'act', type: 'buttons', label: 'Clear the airway', items: [
      { label: 'Cough', act: (s, inst) => inst.cough?.(1) },
      { label: 'Sneeze', act: (s, inst) => inst.cough?.(1.6, true) },
    ] },
  ],
  quiz: [
    { q: 'What do cilia do?', options: ['Carry oxygen into the blood', 'Beat to sweep mucus and trapped dirt up to the throat', 'Make you cough', 'Squeeze the airways shut'], answer: 1, why: 'They form the mucociliary escalator, moving mucus up and out of the lungs.' },
    { q: 'If an airway’s radius halves, how much does its resistance go up?', options: ['2 times', '4 times', '8 times', '16 times'], answer: 3, why: 'Resistance goes as 1/r⁴, and 2⁴ = 16.' },
    { q: 'What is the WHO’s yearly guideline for PM2.5?', options: ['5 µg/m³', '50 µg/m³', '100 µg/m³', '500 µg/m³'], answer: 0, why: 'Since 2021 the WHO guideline is an annual mean of 5 µg/m³; many cities are far above it.' },
  ],
  reel: [
    { ms: 5600, caption: 'Tiny hairs called cilia sweep dirt-trapping mucus out of your lungs.', set: { look: 'healthy', narrow: 0, pm: 120 }, view: { pos: [0.8, 3.0, 7.0], target: [-0.2, 1.7, 0] }, spin: 0 },
    { ms: 5200, caption: 'In asthma the airway squeezes. Half the width means 16 times the resistance.', set: { look: 'asthma', pm: 40 }, anim: { narrow: [0, 0.5] }, view: { pos: [0.4, 3.4, 8.6], target: [0.2, 1.8, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rand = rng(3);
    // The airway runs along x: the throat end is on the left, the lung end (alveoli) on the right.
    const airway = new THREE.Group(); airway.position.set(0, Y, 0); root.add(airway);
    const half = (r, mat) => { const g = new THREE.CylinderGeometry(r, r, X1 - X0, 64, 1, true, Math.PI / 2, Math.PI); g.rotateZ(-Math.PI / 2); const m = new THREE.Mesh(g, mat); m.position.x = (X0 + X1) / 2; return m; };
    const lining = M.plastic(0xf2b8bf, { side: THREE.DoubleSide, roughness: 0.6 });
    const outer = M.plastic(0xd9828f, { side: THREE.DoubleSide, roughness: 0.6 });
    airway.add(half(R0, lining), half(R0 + 0.28, outer));
    // Smooth muscle: rings around the wall that squeeze in asthma.
    const muscleMat = M.plastic(0xb3303e, { roughness: 0.5 });
    const rings = [];
    const ringG = new THREE.TorusGeometry(R0 + 0.34, 0.07, 8, 32, Math.PI); ringG.rotateX(-Math.PI / 2); ringG.rotateZ(Math.PI / 2);   // half ring round the back wall
    for (let x = X0 + 0.4; x < X1; x += 0.6) { const t = new THREE.Mesh(ringG, muscleMat); t.position.x = x; airway.add(t); rings.push(t); }
    // Cilia: a carpet of short hairs on the inner surface.
    const NXc = 44, NAc = 15, NCIL = NXc * NAc;
    const ciliaMat = M.plastic(0xfff1e0, { roughness: 0.5 });
    const cilia = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 5).translate(0, 0.15, 0), ciliaMat, NCIL);
    airway.add(cilia);
    const cil = [];
    for (let i = 0; i < NXc; i++) for (let j = 0; j < NAc; j++) {
      const x = X0 + 0.1 + (i + 0.5) * ((X1 - X0 - 0.2) / NXc), a = Math.PI / 2 + ((j + 0.5) / NAc) * Math.PI;
      cil.push({ x, a });
    }
    // Mucus layer on top of the cilia.
    const mucusMat = M.plastic(0xd8e59a, { transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide, roughness: 0.2 });
    const mucus = half(R0 - 0.34, mucusMat); airway.add(mucus);
    // Tar spots (smoke).
    const tar = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 8, 6), M.plastic(0x3a2a1a, { roughness: 0.9 }), 120);
    const o = new THREE.Object3D();
    for (let i = 0; i < 120; i++) { const x = lerp(X0, X1, rand()), a = Math.PI / 2 + rand() * Math.PI, r = R0 - 0.3; o.position.set(x, -Math.sin(a) * r, Math.cos(a) * r); o.scale.set(1 + rand(), 0.5, 1 + rand()); o.updateMatrix(); tar.setMatrixAt(i, o.matrix); }
    airway.add(tar);
    // Alveoli at the far end; in pneumonia some fill with fluid.
    const alvG = new THREE.Group(); alvG.position.set(X1 + 0.9, Y, 0); root.add(alvG);
    const alvMat = M.plastic(0xf2a0b0, { transparent: true, opacity: 0.55, depthWrite: false, roughness: 0.5 });
    const fluidMat = M.plastic(0xf3ecd2, { roughness: 0.3 });
    const alv = [], fluid = [];
    for (const [x, y, z] of [[0, 0, 0], [0.8, 0.7, -0.2], [0.8, -0.7, -0.2], [1.4, 0, 0.1], [0.3, 1.1, -0.5], [0.3, -1.1, -0.5], [1.5, 1.1, -0.6], [1.5, -1.1, -0.6]]) {
      const a = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 16), alvMat); a.position.set(x, y, z); alvG.add(a); alv.push(a);
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.58, 20, 14), fluidMat); f.position.set(x, y, z); f.scale.setScalar(0.001); alvG.add(f); fluid.push(f);
    }
    // PM2.5 specks and droplets.
    const NP = 140;
    const pm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 6, 5), M.plastic(0x2a2c33, { roughness: 0.8 }), NP);
    pm.frustumCulled = false; root.add(pm);
    const P = Array.from({ length: NP }, () => ({ x: lerp(X0, X1, rand()), y: 0, z: 0, a: 0, stuck: false, dep: lerp(X0 + 1, X1, rand()), r: rand() * 0.7, th: rand() * Math.PI * 2 }));
    P.forEach((q) => { q.y = Math.cos(q.th) * q.r; q.z = Math.sin(q.th) * q.r; });

    const lThroat = stage.label('← to the throat', [X0 + 0.4, Y + R0 + 0.75, 0], root);
    stage.label('To the alveoli →', [X1 + 0.4, Y + R0 + 0.75, 0], root);
    stage.label('Cilia', [X0 + 1.4, Y - R0 - 0.1, -0.2], root);
    stage.label('Mucus', [-0.8, Y + 0.95, -0.3], root);
    const lMus = stage.label('Smooth muscle', [1.6, Y + R0 + 0.45, -0.3], root);
    const lPm = stage.label('● PM2.5 specks', [-0.4, Y - 0.3, 0.9], root);
    const lAlv = stage.label('Alveoli', [X1 + 1.6, Y + 1.7, 0], root);
    const lNote = stage.label('', [0.2, Y - R0 - 0.85, 0.6], root, 'hot');

    let t = 0, beat = 1, narrowNow = 0, cough = 0, fl = 0;
    const UP = new THREE.Vector3(0, 1, 0), inward = new THREE.Vector3(), dir = new THREE.Vector3(), tmp = new THREE.Vector3();
    const inst = {
      cough(k, sneeze) {
        cough = k;
        toast(sneeze ? '<b>Achoo!</b> A sneeze cloud can carry droplets 7 to 8 metres. Sneeze into your elbow.' : '<b>Cough!</b> Air rushes out at around 8 m/s, carrying mucus and dirt with it.');
      },
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        cough = Math.max(0, cough - dt * 0.9);
        const smoke = s.look === 'smoke', pneu = s.look === 'pneumonia';
        narrowNow += (s.narrow - narrowNow) * Math.min(1, dt * 3);
        const sc = 1 - narrowNow;
        airway.scale.set(1, sc, sc);
        beat += ((smoke ? 0.12 : 1) - beat) * Math.min(1, dt * 2);
        // Cilia: a fast forward (power) stroke towards the throat, a slower recovery; neighbours
        // slightly out of step, so waves (metachronal waves) run along the carpet.
        const f = 2.2;   // shown slowed down: real cilia beat 10–15 times a second
        cil.forEach((c, i) => {
          const ph = (t * f - c.x * 0.6) % 1, k = ((ph % 1) + 1) % 1;
          const swing = beat * (k < 0.3 ? lerp(0.7, -0.7, k / 0.3) : lerp(-0.7, 0.7, (k - 0.3) / 0.7));
          const r = R0 - 0.02;
          o.position.set(c.x, -Math.sin(c.a) * r, Math.cos(c.a) * r);           // a point on the back wall
          inward.set(0, Math.sin(c.a), -Math.cos(c.a));                          // pointing to the middle
          dir.copy(inward).multiplyScalar(Math.cos(swing)).add(tmp.set(Math.sin(swing), 0, 0)).normalize();
          o.quaternion.setFromUnitVectors(UP, dir);
          o.scale.setScalar(1); o.updateMatrix(); cilia.setMatrixAt(i, o.matrix);
        });
        cilia.instanceMatrix.needsUpdate = true;
        ciliaMat.color.set(smoke ? 0x8a6a4a : 0xfff1e0);
        tar.visible = smoke;
        const thick = s.look === 'asthma' || smoke ? 1 : 0;
        mucus.scale.set(1, 1 - 0.1 * thick, 1 - 0.1 * thick);
        mucusMat.opacity = 0.38 + 0.25 * thick;
        muscleMat.emissive.set(s.look === 'asthma' ? 0x551010 : 0x000000);
        rings.forEach((r) => { r.scale.setScalar(1 + 0.25 * narrowNow); });
        // Pneumonia: fluid fills some alveoli.
        fl += ((pneu ? 1 : 0) - fl) * Math.min(1, dt * 1.2);
        fluid.forEach((m, i) => m.scale.setScalar(i % 3 === 1 ? 0.001 : Math.max(0.001, fl * (0.85 + 0.15 * Math.sin(i)))));
        // Particles: breathed in, trapped by the mucus, carried back towards the throat.
        const nOn = Math.round(clamp(Math.log(s.pm / 3) / Math.log(100), 0.05, 1) * NP);
        const esc = 0.35 * beat;                                  // escalator speed (shown fast)
        P.forEach((q, i) => {
          if (i >= nOn) { o.position.set(0, -50, 0); o.scale.setScalar(0.001); o.quaternion.identity(); o.updateMatrix(); pm.setMatrixAt(i, o.matrix); return; }
          if (!q.stuck) {
            q.x += dt * (0.9 - cough * 9);
            if (q.x > q.dep && cough < 0.1) { q.stuck = true; q.a = Math.PI / 2 + rand() * Math.PI; }
            if (q.x > X1 + 0.5 || q.x < X0 - 1.2) { q.x = X0; q.stuck = false; q.dep = lerp(X0 + 1, X1, rand()); }
            o.position.set(q.x, Y + q.y * sc, q.z * sc);
          } else {
            q.x -= dt * (esc + cough * 8);
            if (cough > 0.2 && rand() < dt * 3) q.stuck = false;
            if (q.x < X0) { q.x = X0; q.stuck = false; q.dep = lerp(X0 + 1, X1, rand()); }
            const r = (R0 - 0.36) * sc;
            o.position.set(q.x, Y - Math.sin(q.a) * r, Math.cos(q.a) * r);
          }
          o.scale.setScalar(1); o.quaternion.identity(); o.updateMatrix(); pm.setMatrixAt(i, o.matrix);
        });
        pm.instanceMatrix.needsUpdate = true;
        lNote.element.textContent = { healthy: 'Cilia sweep mucus to the throat', smoke: 'Tar: cilia slowed and damaged', asthma: 'Muscles squeeze, lining swells', pneumonia: 'Fluid fills alveoli' }[s.look] || '';
        lMus.visible = true; lPm.visible = nOn > 0; lThroat.visible = true; lAlv.visible = true;
      },
      readout: (s) => {
        const R = poiseuille(1 - s.narrow), times = s.pm / 5;
        return `<div class="big">${{ healthy: 'A healthy airway', smoke: 'A smoker’s airway', asthma: 'An asthma attack', pneumonia: 'Pneumonia' }[s.look]}</div>
          <div class="row"><span>Airway resistance</span><b>${R < 1.05 ? 'normal' : '×' + (R < 10 ? R.toFixed(1) : Math.round(R))}</b></div>
          <div class="row"><span>Airflow for the same effort</span><b>${Math.round(100 / R)}%</b></div>
          <div class="row"><span>PM2.5 vs WHO guideline</span><b>${times < 1.05 ? 'at guideline' : '×' + times.toFixed(times < 10 ? 1 : 0)}</b></div>
          ${s.look === 'pneumonia' ? '<div class="row"><span>Alveoli</span><b>some filled with fluid</b></div>' : `<div class="row"><span>Cilia</span><b>${s.look === 'smoke' ? 'slowed, damaged' : '10–15 beats a second'}</b></div>`}
          <small>General facts only. Struggling to breathe? See a doctor.</small>`;
      },
    };
    return inst;
  },
};
