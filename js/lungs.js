// LungsClear's shared models: the physiology used by every readout, and the 3D builders
// for the airway, the lungs, the bronchial tree, the rib cage and the diaphragm.
//
// Orientation: like an anatomy atlas, we look at the patient from the front (anterior view).
// So the patient's RIGHT side is on YOUR LEFT. Axes: +x = patient's left, +y = up (towards the
// head), +z = forwards (out of the chest, towards you). One model unit is about 5 cm.
//
// Anatomy follows Gray's Anatomy (42nd ed.), Netter's Atlas of Human Anatomy and NHLBI
// "How the Lungs Work" (nhlbi.nih.gov/health/lungs):
//  - the right lung has three lobes (upper, middle, lower) split by the oblique and horizontal
//    fissures; the left lung has two lobes (upper, lower) and the cardiac notch where the heart sits;
//  - the right main bronchus is shorter (≈2.5 cm), wider and more vertical than the left (≈5 cm),
//    which is why inhaled objects usually end up on the right;
//  - the trachea is ≈11 cm long and ≈2 cm wide, held open by 16–20 C-shaped cartilage rings that
//    are open at the back, where the oesophagus runs;
//  - the right dome of the diaphragm sits a little higher than the left (the liver lies under it);
//  - the lung apex rises 2–3 cm above the clavicle, and the bases reach down into the
//    costophrenic recesses at the back and sides.
import { THREE, M, tube, torus, clamp, lerp, smooth } from './kit.js';

// ================================================================ physiology
// Classic textbook values for a healthy young adult at rest.
//  Tidal volume 500 mL, rate 12–20 breaths/min: NHLBI / MedlinePlus "Rapid shallow breathing";
//  Guyton & Hall, Textbook of Medical Physiology (14th ed.), ch. 38: TV 500 mL, IRV 3,000 mL,
//  ERV 1,100 mL, RV 1,200 mL, VC 4,600 mL, FRC 2,300 mL, TLC 5,800 mL; dead space ≈150 mL.
export const GUYTON = { TV: 0.5, IRV: 3.0, ERV: 1.1, RV: 1.2, VC: 4.6, FRC: 2.3, TLC: 5.8, DEAD: 0.15 };
// Mechanics (West's Respiratory Physiology, 10th ed., ch. 7):
//  intrapleural pressure ≈ −5 cmH₂O at FRC, ≈ −8 at the end of a quiet breath in;
//  lung compliance ≈ 0.2 L/cmH₂O; airway resistance ≈ 2 cmH₂O per L/s;
//  alveolar pressure falls about 1 cmH₂O below atmospheric during a quiet breath in.
export const MECH = { PPL_FRC: -5, C_L: 0.2, R_AW: 2.0, TAU: 0.5, PATM_CMH2O: 1033 };
// Diaphragm: descends ≈1–1.5 cm in a quiet breath, up to 10 cm in a deep one (West, ch. 7).
// We use 1.25 cm (0.25 model units) per 500 mL.
export const DIAPHRAGM_PER_L = 0.5;

// One breathing cycle. t in seconds, rate in breaths/min, VT in litres.
// Inspiration takes a third of the cycle (I:E ≈ 1:2) and follows a half-cosine volume curve.
// Expiration is passive recoil: flow rises quickly then decays with the respiratory time
// constant τ = R·C ≈ 0.5 s, scaled so the lungs are back at FRC as the next breath starts.
export function breath(t, rate = 15, VT = 0.5) {
  const T = 60 / rate, Ti = T / 3, Te = T - Ti;
  const u = ((t % T) + T) % T;
  let v, flow, inhale;
  if (u < Ti) {
    inhale = true;
    v = (VT / 2) * (1 - Math.cos((Math.PI * u) / Ti));
    flow = ((VT * Math.PI) / (2 * Ti)) * Math.sin((Math.PI * u) / Ti);
  } else {
    inhale = false;
    const s = u - Ti, tau = MECH.TAU, a = 0.12, c = 1 / (1 / a + 1 / tau);
    const I = (x) => tau * (1 - Math.exp(-x / tau)) - c * (1 - Math.exp(-x / c));
    const A = VT / I(Te);
    v = VT - A * I(s);
    flow = -A * (1 - Math.exp(-s / a)) * Math.exp(-s / tau);
  }
  const Palv = -MECH.R_AW * flow;                       // flow = (Patm − Palv)/R
  const Ppl = Palv - (-MECH.PPL_FRC + v / MECH.C_L);    // pleural = alveolar − lung recoil
  return { v, flow, inhale, Palv, Ppl, k: u / T, T, Ti };
}

// Oxygen–haemoglobin dissociation curve: Severinghaus (1979), J Appl Physiol 46:599–602.
// S = 1 / (23400 / (P³ + 150 P) + 1). Gives P50 ≈ 26.9 mmHg and S ≈ 97.5% at 100 mmHg.
// The Bohr shift uses Severinghaus's "virtual PO₂" correction for pH, PCO₂ and temperature:
//   P_virtual = P × 10^(0.024(37 − T) + 0.40(pH − 7.40) + 0.06 log10(40 / PCO₂)).
export function satO2(PO2, { pH = 7.4, PCO2 = 40, T = 37 } = {}) {
  const P = Math.max(0.01, PO2) * Math.pow(10, 0.024 * (37 - T) + 0.4 * (pH - 7.4) + 0.06 * Math.log10(40 / Math.max(5, PCO2)));
  return 1 / (23400 / (P * P * P + 150 * P) + 1);
}
export function p50(cond) {
  let lo = 5, hi = 80;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (satO2(m, cond) < 0.5) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
// Oxygen content (mL O₂ per dL of blood): 1.34 mL per g of haemoglobin (Hüfner's number as used
// by Guyton & Hall), Hb 15 g/dL, plus dissolved O₂ 0.003 mL/dL per mmHg.
export const HB = 15;
export const o2content = (S, PO2) => 1.34 * HB * S + 0.003 * PO2;

// Barometric pressure with altitude: West (1996), J Appl Physiol 81:1850, fitted to measurements
// on high mountains: PB = exp(6.63268 − 0.1112 h − 0.00149 h²), h in km, PB in mmHg.
// Gives 760 at sea level, ≈505 at Leh (3,500 m) and ≈253 on the summit of Everest (8,849 m),
// matching the 253 mmHg West's team measured there in 1981.
export const baro = (hM) => { const h = hM / 1000; return Math.exp(6.63268 - 0.1112 * h - 0.00149 * h * h); };
// Inspired and alveolar oxygen: PiO₂ = 0.2093 (PB − 47) (air warmed and wetted at 37 °C);
// alveolar gas equation PAO₂ = PiO₂ − PaCO₂ / 0.8 (West, ch. 5). Arterial ≈ alveolar − 5 mmHg.
export function altitudeGas(hM, PaCO2 = 40) {
  const PB = baro(hM), PiO2 = 0.2093 * (PB - 47), PAO2 = Math.max(1, PiO2 - PaCO2 / 0.8);
  return { PB, PiO2, PAO2, PaO2: Math.max(1, PAO2 - 5) };
}

// Spirometry prediction equations (ECCS/ERS, Quanjer et al. 1993, Eur Respir J 6 suppl 16):
// height H in metres, age A in years (valid 18–70 y, 1.55–1.95 m men, 1.45–1.80 m women).
// Real clinics now use the GLI-2012 equations, which also account for ethnicity; these older,
// simpler ones are close enough to show how size, age and sex change the numbers.
export function predicted(sex, H, A) {
  const m = sex === 'm';
  const FVC = m ? 5.76 * H - 0.026 * A - 4.34 : 4.43 * H - 0.026 * A - 2.89;
  const FEV1 = m ? 4.30 * H - 0.029 * A - 2.49 : 3.95 * H - 0.025 * A - 2.60;
  const RV = m ? 1.31 * H + 0.022 * A - 1.23 : 1.81 * H + 0.016 * A - 2.0;
  const TLC = m ? 7.99 * H - 7.08 : 6.6 * H - 5.79;
  return { FVC, FEV1, RV, TLC, ratio: FEV1 / FVC };
}

// Airway resistance by Poiseuille's law: R ∝ 1/r⁴, so halving the radius raises it 16 times.
export const poiseuille = (rFrac) => 1 / Math.pow(clamp(rFrac, 0.05, 1), 4);

// ================================================================ colours
export const LUNG = 0xf0a0aa, LUNG_DEEP = 0xd97a8b, CARTILAGE = 0xf1e4d2, MUSCLE = 0xb33a45, BONE = 0xeae3d4;
export const O2C = 0x5ab8ff, CO2C = 0xffa24a, BLUE = 0x4f7bff, RED = 0xff3b4a;
const cA = new THREE.Color(), cB = new THREE.Color();
// Blood colour from oxygen saturation (textbook convention: blue poor, red rich).
export function bloodColor(S, out = new THREE.Color()) { cA.set(BLUE); cB.set(RED); return out.copy(cA).lerp(cB, clamp((S - 0.6) / 0.38, 0, 1)); }
export const cssBlood = (S) => '#' + bloodColor(S).getHexString();

// A seeded random number generator, so the bronchial tree is the same every time.
export function rng(seed = 7) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// A polyline sampled by arc length, so things can travel along it at a steady speed.
export function pathOf(points) {
  const P = points.map((p) => (p.isVector3 ? p.clone() : new THREE.Vector3(...p)));
  const L = [0];
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + P[i].distanceTo(P[i - 1]));
  const total = L[L.length - 1] || 1;
  return {
    points: P, total,
    at(u, out = new THREE.Vector3()) {
      const d = clamp(u, 0, 1) * total;
      let lo = 0, hi = L.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] <= d) lo = m; else hi = m; }
      const k = (d - L[lo]) / Math.max(1e-9, L[hi] - L[lo]);
      return out.copy(P[lo]).lerp(P[hi], k);
    },
  };
}

// Instanced cylinders between point pairs: one draw call for a whole airway tree.
export function segments(list, mat, radial = 8) {
  const m = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, radial, 1), mat, Math.max(1, list.length));
  const o = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3();
  list.forEach(([a, b, r], i) => {
    d.copy(b).sub(a); const len = d.length();
    o.position.copy(a).add(b).multiplyScalar(0.5);
    o.quaternion.setFromUnitVectors(up, d.normalize());
    o.scale.set(r, len + r * 0.6, r); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
  });
  m.count = list.length;
  m.castShadow = true;
  return m;
}

// ================================================================ the diaphragm
// Height of the diaphragm's upper surface at (x, z). Two domes, the right one higher,
// joined by the central tendon under the heart; low at the back (crura) and sides.
// d = how far the domes have been pulled down (model units) as the muscle contracts.
export function domeY(x, z, d = 0) {
  const rim = 0.62 + 0.36 * clamp((z + 2.0) / 3.6, 0, 1);
  const g = (cx, cz, A, sx, sz) => A * Math.exp(-((x - cx) ** 2) / sx - ((z - cz) ** 2) / sz);
  const dR = g(-1.25, -0.25, 1.78, 1.25, 2.2), dL = g(1.3, -0.25, 1.58, 1.2, 2.2), dC = g(0, -0.1, 1.3, 0.9, 2.0);
  const a = 6, top = Math.log(Math.exp(a * dR) + Math.exp(a * dL) + Math.exp(a * dC)) / a;
  const edge = clamp(1 - ((x / 3.0) ** 2 + ((z + 0.2) / 1.95) ** 2), 0, 1);
  return rim + Math.max(0, top - d * smooth(edge * 1.6)) * smooth(edge * 2.2);
}

export function makeDiaphragm() {
  const NX = 44, NZ = 30, verts = [], cols = [], idx = [];
  const tendon = new THREE.Color(0xe8d9cf), muscle = new THREE.Color(MUSCLE), c = new THREE.Color();
  const pts = [];
  for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
    // Polar-ish grid squeezed into an ellipse.
    const a = (i / NX) * Math.PI * 2, r = j / NZ;
    const x = Math.cos(a) * r * 2.95, z = -0.2 + Math.sin(a) * r * 1.9;
    pts.push([x, z]);
    verts.push(x, domeY(x, z), z);
    const t = Math.exp(-(x * x) / 0.7 - ((z + 0.05) ** 2) / 0.5);
    c.copy(muscle).lerp(tendon, clamp(t * 1.4, 0, 1)); cols.push(c.r, c.g, c.b);
  }
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const a = j * (NX + 1) + i, b = a + 1, cc = a + NX + 1, d = cc + 1;
    idx.push(a, cc, b, b, cc, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.92 });
  const mesh = new THREE.Mesh(g, mat); mesh.receiveShadow = true;
  mesh.setDescent = (d) => {
    const p = g.attributes.position;
    for (let k = 0; k < pts.length; k++) p.setY(k, domeY(pts[k][0], pts[k][1], d));
    p.needsUpdate = true; g.computeVertexNormals();
  };
  return mesh;
}

// ================================================================ the lungs
// Each lung starts as a sphere that is squashed into a lung shape: a rounded apex, a broad
// convex outer (costal) surface, a flatter inner (mediastinal) surface, and a base that is
// pressed onto the diaphragm, so it is concave and dips into the recesses at the back and sides.
export const LUNGS = {
  [-1]: { side: -1, cx: -1.5, cz: -0.25, top: 6.0, mid: 3.3, low: 0.5, lat: 1.42, med: 0.72, front: 1.3, back: 1.75 },
  [1]: { side: 1, cx: 1.55, cz: -0.25, top: 5.95, mid: 3.3, low: 0.4, lat: 1.36, med: 0.66, front: 1.22, back: 1.75 },
};

function lungPoint(ux, uy, uz, P, out) {
  const s = P.side;
  const lateral = ux > 0;
  // Blunt, rounded apex: keep the top wider than a plain sphere would.
  const taper = uy > 0 ? (1 - 0.2 * uy) * Math.pow(Math.max(1e-3, 1 - uy * uy), -0.16) : 1;
  let x = P.cx + s * ux * (lateral ? P.lat : P.med) * taper;
  let z = P.cz + uz * (uz > 0 ? P.front : P.back) * taper;
  let y = uy > 0 ? P.mid + uy * (P.top - P.mid) : P.mid + uy * (P.mid - P.low);
  // Mediastinal surface: the heart presses a hollow into both lungs, deeper on the left.
  if (!lateral) {
    const heart = Math.exp(-((y - 3.1) ** 2) / 1.4 - ((z - 0.35) ** 2) / 0.9);
    x += s * heart * (s > 0 ? 0.42 : 0.2) * (-ux);
    // The left lung's cardiac notch: a bite out of the front edge, with the lingula below it.
    if (s > 0) x += 0.55 * Math.exp(-((y - 3.35) ** 2) / 0.35) * clamp(uz, 0, 1) * clamp(-ux + 0.3, 0, 1);
  }
  y = Math.max(y, domeY(x, z) + 0.05);
  return out.set(x, y, z);
}

// Which lobe a point belongs to. Fissures (Gray's; Netter):
//  oblique: from about T4 at the back, down and forwards to the 6th costal cartilage at the front;
//  horizontal (right only): along the 4th costal cartilage, from the front back to the oblique.
export function lobeOf(p, side) {
  const back = -2.0, front = 1.1;
  const yObl = side < 0 ? lerp(5.0, 2.2, (p.z - back) / (front - back)) : lerp(5.25, 2.0, (p.z - back) / (front - back));
  if (p.y < yObl) return 'lower';
  if (side < 0 && p.y < 4.15) return 'middle';
  return 'upper';
}
export const LOBES = { [-1]: ['upper', 'middle', 'lower'], [1]: ['upper', 'lower'] };
const LOBE_COL = { upper: 0xf3a9b2, middle: 0xe98f9e, lower: 0xdc8193 };
const LOBE_NAME = { upper: 'upper', middle: 'middle', lower: 'lower' };

// A lung split into its lobes. Returns { group, lobes: {name: mesh}, mats, center }.
export function makeLung(side, { seg = 72 } = {}) {
  const P = LUNGS[side];
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75));
  const pos = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    lungPoint(pos.getX(i), pos.getY(i), pos.getZ(i), P, v);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  if (side < 0) { // mirrored, so flip the triangle winding to keep normals pointing out
    const ix = g.index.array;
    for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
  }
  g.computeVertexNormals();
  const ng = g.toNonIndexed(); g.dispose();
  const np = ng.attributes.position, nn = ng.attributes.normal;
  const buckets = {};
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t < np.count; t += 3) {
    a.fromBufferAttribute(np, t); b.fromBufferAttribute(np, t + 1); c.fromBufferAttribute(np, t + 2);
    const cen = a.clone().add(b).add(c).multiplyScalar(1 / 3);
    const L = lobeOf(cen, side);
    (buckets[L] ||= { p: [], n: [] });
    for (let k = 0; k < 3; k++) { buckets[L].p.push(np.getX(t + k), np.getY(t + k), np.getZ(t + k)); buckets[L].n.push(nn.getX(t + k), nn.getY(t + k), nn.getZ(t + k)); }
  }
  ng.dispose();
  const group = new THREE.Group(), lobes = {}, mats = [];
  for (const L of LOBES[side]) {
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(buckets[L].p, 3));
    bg.setAttribute('normal', new THREE.Float32BufferAttribute(buckets[L].n, 3));
    const mat = new THREE.MeshStandardMaterial({ color: LOBE_COL[L], roughness: 0.62, metalness: 0, side: THREE.DoubleSide, transparent: true, opacity: 1 });
    mats.push(mat);
    const mesh = new THREE.Mesh(bg, mat); mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData.lobe = L;
    const lg = new THREE.Group(); lg.add(mesh); group.add(lg);
    lobes[L] = lg;
  }
  const setXray = (k) => mats.forEach((m) => { m.opacity = 1 - 0.84 * k; m.depthWrite = k < 0.5; });
  return { group, lobes, mats, setXray, P };
}

// The pleura: a thin see-through sac hugging each lung.
export function makePleura(side) {
  const P = LUNGS[side], g = new THREE.SphereGeometry(1, 48, 36), pos = g.attributes.position, v = new THREE.Vector3();
  const C = new THREE.Vector3(P.cx, 3.4, P.cz);
  for (let i = 0; i < pos.count; i++) {
    lungPoint(pos.getX(i), pos.getY(i), pos.getZ(i), P, v);
    v.sub(C).multiplyScalar(1.045).add(C);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return new THREE.Mesh(g, M.ghost(0x9fd8ff, 0.1));
}

// Random points inside one lobe (for growing the airway tree into it).
function lobePoints(side, lobe, n, rand) {
  const P = LUNGS[side], C = new THREE.Vector3(P.cx + side * 0.1, 3.4, P.cz), out = [], S = new THREE.Vector3();
  let guard = 0;
  while (out.length < n && guard++ < n * 60) {
    let x, y, z; do { x = rand() * 2 - 1; y = rand() * 2 - 1; z = rand() * 2 - 1; } while (x * x + y * y + z * z > 1);
    const r = Math.hypot(x, y, z) || 1;
    lungPoint(x / r, y / r, z / r, P, S);
    const p = C.clone().lerp(S, r * 0.9);
    if (lobeOf(p, side) === lobe) out.push(p);
  }
  return out;
}

// Airway radius by generation (Weibel 1963, "Morphometry of the Human Lung"): the trachea
// (generation 0) is ≈1.8 cm across and each generation is ≈0.79 = 2^(−1/3) times narrower
// (Murray's law for branching tubes). 1 model unit = 5 cm.
export const airR = (gen) => Math.max(0.011, 0.18 * Math.pow(0.79, gen));

function principal(pts, c) {
  let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;
  for (const p of pts) { const x = p.x - c.x, y = p.y - c.y, z = p.z - c.z; xx += x * x; xy += x * y; xz += x * z; yy += y * y; yz += y * z; zz += z * z; }
  let v = new THREE.Vector3(1, 0.7, 0.3).normalize();
  for (let i = 0; i < 12; i++) v = new THREE.Vector3(xx * v.x + xy * v.y + xz * v.z, xy * v.x + yy * v.y + yz * v.z, xz * v.x + yz * v.y + zz * v.z).normalize();
  return v;
}

// Key points of the central airway (model units).
export const AIR = {
  nostril: new THREE.Vector3(0, 10.05, 1.5), mouth: new THREE.Vector3(0, 9.35, 1.35),
  nasoph: new THREE.Vector3(0, 10.35, -0.55), oroph: new THREE.Vector3(0, 9.45, -0.5),
  glottis: new THREE.Vector3(0, 7.85, -0.05), trachTop: new THREE.Vector3(0, 7.35, -0.05),
  carina: new THREE.Vector3(0, 5.0, -0.2),
  rMain: new THREE.Vector3(-0.42, 4.58, -0.3), lMain: new THREE.Vector3(0.78, 4.38, -0.35),
};

// The bronchial tree: main bronchi → lobar bronchi → a space-filling tree grown into each lobe.
// It splits the lobe's sample points in two again and again (like real dichotomous branching),
// aiming each branch at the middle of the air space it serves. Shown to ~8 generations; the real
// tree goes on to about 23 (Weibel), ending in the alveolar sacs.
export function makeTree({ depth = 6, pts = 200, seed = 11 } = {}) {
  const rand = rng(seed);
  const trunk = [], lobeSegs = {}, tips = [];
  const up = [AIR.trachTop, AIR.carina];
  trunk.push([AIR.trachTop, AIR.carina, airR(0)]);
  trunk.push([AIR.carina, AIR.rMain, airR(1) * 1.05]);
  trunk.push([AIR.carina, AIR.lMain, airR(1) * 0.9]);
  // Right: the upper-lobe bronchus leaves almost at once; the bronchus intermedius continues down.
  const rInter = new THREE.Vector3(-0.62, 4.05, -0.3);
  trunk.push([AIR.rMain, rInter, airR(2)]);
  const lobarStart = {
    '-1upper': [AIR.rMain, [AIR.trachTop, AIR.carina, AIR.rMain]],
    '-1middle': [rInter, [AIR.trachTop, AIR.carina, AIR.rMain, rInter]],
    '-1lower': [rInter, [AIR.trachTop, AIR.carina, AIR.rMain, rInter]],
    '1upper': [AIR.lMain, [AIR.trachTop, AIR.carina, AIR.lMain]],
    '1lower': [AIR.lMain, [AIR.trachTop, AIR.carina, AIR.lMain]],
  };
  for (const side of [-1, 1]) for (const lobe of LOBES[side]) {
    const key = side + lobe, [start, trail] = lobarStart[key];
    const n = lobe === 'lower' ? pts * 1.4 : lobe === 'middle' ? pts * 0.6 : pts;
    const P = lobePoints(side, lobe, Math.round(n), rand);
    const segs = (lobeSegs[key] = []);
    const grow = (a, set, gen, trailNow, maxGen) => {
      const c = set.reduce((acc, p) => acc.add(p), new THREE.Vector3()).multiplyScalar(1 / set.length);
      if (gen >= maxGen || set.length < 3) {
        segs.push([a, c, airR(gen)]);
        tips.push({ side, lobe, at: c, trail: [...trailNow, a, c], gen });
        return;
      }
      const f = gen < 4 ? 0.42 : 0.55;
      const e = a.clone().lerp(c, f);
      segs.push([a, e, airR(gen)]);
      const ax = principal(set, c);
      const A = [], B = [];
      for (const p of set) ((p.x - c.x) * ax.x + (p.y - c.y) * ax.y + (p.z - c.z) * ax.z < 0 ? A : B).push(p);
      grow(e, A, gen + 1, [...trailNow, a], maxGen);
      grow(e, B, gen + 1, [...trailNow, a], maxGen);
    };
    grow(start, P, 2, trail.slice(0, -1), 2 + depth);
  }
  return { trunk, lobeSegs, tips, up };
}

// ================================================================ ribs, spine, sternum
// Twelve pairs of ribs. Each leaves its vertebra at the back, curves out and round, sloping down
// towards the front. Ribs 1–7 ("true") reach the sternum by their own costal cartilage, 8–10
// ("false") join the cartilage above, 11–12 ("floating") stop short.
const RIB_A = [1.35, 2.0, 2.45, 2.72, 2.88, 2.98, 3.04, 3.06, 3.02, 2.92, 2.7, 2.42];
const RIB_B = [1.05, 1.35, 1.55, 1.7, 1.8, 1.85, 1.86, 1.86, 1.84, 1.8, 1.75, 1.65];
export const vertY = (k) => 6.35 - (k - 1) * 0.44;       // thoracic vertebra k (T1 … T12)
const sternY = (k) => 5.8 - (k - 1) * 0.46;              // where costal cartilage k meets the sternum
const ZC = -0.15;
export function ribCurve(k, side) {
  const a = RIB_A[k - 1], b = RIB_B[k - 1], yb = vertY(k);
  const floating = k >= 11, falseRib = k >= 8 && k <= 10;
  const thB = floating ? (k === 11 ? 0.55 : 0.45) * Math.PI : (k === 1 ? 0.78 : 0.72 - (k > 7 ? 0.02 * (k - 7) : 0)) * Math.PI;
  const yEnd = falseRib ? sternY(7) - 0.3 * (k - 7) : sternY(Math.min(k, 7));
  const yBone = floating ? yb - 0.9 : Math.min(yEnd - 0.12 * k * 0.2, yb - 0.4 - 0.12 * k);
  const bone = [], cart = [];
  const at = (th, y) => new THREE.Vector3(side * (0.3 + (a - 0.3) * Math.sin(th)), y, ZC - b * Math.cos(th));
  for (let i = 0; i <= 18; i++) { const th = 0.06 + (thB - 0.06) * (i / 18); bone.push(at(th, lerp(yb, yBone, smooth(th / thB)))); }
  if (!floating) {
    const thE = falseRib ? 0.86 * Math.PI - 0.02 * (k - 8) : Math.PI - 0.04;
    for (let i = 0; i <= 8; i++) { const th = thB + (thE - thB) * (i / 8); cart.push(at(th, lerp(yBone, yEnd, smooth(i / 8)))); }
    if (!falseRib) cart[cart.length - 1].x = side * 0.3;
  }
  return { bone, cart, back: bone[0].clone(), front: (cart.length ? cart[cart.length - 1] : bone[bone.length - 1]).clone() };
}

// A rib cage whose ribs swing up (pump handle at the front, bucket handle at the sides) as you breathe in.
export function makeRibCage({ intercostal = true } = {}) {
  const group = new THREE.Group(), ribs = [], boneMat = M.plastic(BONE, { roughness: 0.55, transparent: true, opacity: 1 });
  const cartMat = M.plastic(0xcfe2e8, { roughness: 0.4, transparent: true, opacity: 0.85 });
  const icMat = new THREE.MeshStandardMaterial({ color: MUSCLE, roughness: 0.7, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  const curves = {};
  for (const side of [-1, 1]) for (let k = 1; k <= 12; k++) curves[side + ':' + k] = ribCurve(k, side);
  for (const side of [-1, 1]) for (let k = 1; k <= 12; k++) {
    const C = curves[side + ':' + k];
    const pivot = new THREE.Group(); pivot.position.copy(C.back); group.add(pivot);
    const inner = new THREE.Group(); pivot.add(inner);
    const holder = new THREE.Group(); holder.position.copy(C.back).negate(); inner.add(holder);
    const r = k === 1 ? 0.055 : 0.07;
    holder.add(tube(C.bone, r, boneMat, false, 60));
    if (C.cart.length) holder.add(tube([C.bone[C.bone.length - 1], ...C.cart], r * 0.8, cartMat, false, 30));
    // Intercostal muscles: a band filling the gap to the next rib down.
    if (intercostal && k < 11) {
      const D = curves[side + ':' + (k + 1)], n = Math.min(C.bone.length, D.bone.length), pos = [], idx = [];
      for (let i = 2; i < n; i++) { const p = C.bone[i], q = D.bone[i]; pos.push(p.x, p.y - r, p.z, q.x, q.y + r, q.z); }
      for (let i = 0; i < n - 3; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      holder.add(new THREE.Mesh(g, icMat));
    }
    // Bucket-handle axis: from the back end of the rib to its front end.
    const axis = C.front.clone().sub(C.back).normalize();
    const mid = C.bone[12].clone().sub(C.back);
    const test = mid.clone().applyAxisAngle(axis, 0.1);
    const bucketSign = test.y > mid.y ? 1 : -1;
    ribs.push({ pivot, inner, axis, bucketSign, k, side });
  }
  // Spine: vertebral bodies from C3 to L2, with discs.
  const spine = new THREE.Group(); group.add(spine);
  const vMat = M.plastic(BONE, { roughness: 0.6 }), dMat = M.plastic(0x9fb6c9, { roughness: 0.5 });
  for (let k = -4; k <= 14; k++) {
    const y = vertY(k), r = k < 1 ? 0.26 : 0.3 + 0.012 * k;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.32, 20), vMat); body.position.set(0, y - 0.05, -2.2 + (k < 1 ? 0.25 : 0)); spine.add(body);
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.55), vMat); sp.position.set(0, y - 0.12, -2.65 + (k < 1 ? 0.25 : 0)); sp.rotation.x = 0.5; spine.add(sp);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.95, r * 0.95, 0.1, 20), dMat); disc.position.set(0, y + 0.17, -2.2 + (k < 1 ? 0.25 : 0)); spine.add(disc);
  }
  // Sternum: manubrium, body and xiphoid, joined to the true ribs' cartilages.
  const sternum = new THREE.Group(); group.add(sternum);
  const sMat = M.plastic(BONE, { roughness: 0.55, transparent: true, opacity: 1 });
  const zS = ZC + 1.86;
  const man = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.14), sMat); man.position.set(0, 5.55, zS - 0.12); man.rotation.x = -0.18;
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.5, 0.14), sMat); body.position.set(0, 3.85, zS); body.rotation.x = -0.08;
  const xi = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.45, 12), sMat); xi.position.set(0, 2.45, zS + 0.05); xi.rotation.x = Math.PI;
  sternum.add(man, body, xi);
  sternum.userData.home = sternum.position.clone();
  const mats = [boneMat, cartMat, sMat];
  return {
    group, spine, sternum, ribs, icMat,
    // lift 0 → 1: rib angle at full inspiration (≈4° pump handle, ≈5° bucket handle).
    setLift(q) {
      for (const R of ribs) {
        const w = R.k / 12;
        R.pivot.rotation.set(-(0.07 - 0.03 * w) * q, 0, 0);
        R.inner.quaternion.setFromAxisAngle(R.axis, R.bucketSign * (0.03 + 0.07 * w) * q);
      }
      sternum.position.set(0, 0.18 * q, 0.14 * q);
    },
    setXray(k) { mats.forEach((m) => { m.opacity = 1 - 0.75 * k; m.depthWrite = k < 0.5; }); icMat.opacity = 0.35 * (1 - 0.7 * k); },
  };
}

// ================================================================ the upper airway
// Nose → nasal cavity → pharynx → larynx (voice box, with the epiglottis lid) → trachea.
// The oesophagus (food pipe) runs behind the trachea: the epiglottis steers food into it.
export function makeUpperAirway() {
  const g = new THREE.Group();
  const wall = M.plastic(0xe7a2a2, { roughness: 0.5, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  const nasal = tube([AIR.nostril, [0, 10.4, 1.2], [0, 10.6, 0.6], [0, 10.55, -0.1], AIR.nasoph], 0.26, wall, false, 60); nasal.scale.x = 0.55;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.6, 3), M.plastic(0xe0a792, { roughness: 0.6 })); nose.position.set(0, 10.25, 1.55); nose.rotation.x = 0.4;
  // Turbinates: three curled shelves that warm and wet the air.
  for (let i = 0; i < 3; i++) {
    const t = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.9, 4, 8), M.plastic(0xd98c8c)); t.rotation.x = Math.PI / 2 + 0.15; t.position.set(0, 10.35 + i * 0.12, 0.45); g.add(t);
  }
  const oral = tube([AIR.mouth, [0, 9.45, 0.8], [0, 9.55, 0.15], AIR.oroph], 0.2, wall, false, 40); oral.scale.x = 1.3;
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.35, 20, 14), M.plastic(0xd66b78, { roughness: 0.5 })); tongue.scale.set(1.1, 0.5, 1.7); tongue.position.set(0, 9.2, 0.55);
  const pharynx = tube([[0, 10.55, -0.45], AIR.nasoph, AIR.oroph, [0, 8.6, -0.35], [0, 8.05, -0.3]], 0.24, wall, false, 60); pharynx.scale.x = 1.25;
  g.add(nasal, nose, oral, tongue, pharynx);
  // Larynx: the thyroid cartilage (the "Adam's apple") shields the vocal folds.
  const lx = new THREE.Group(); lx.position.set(0, 7.75, -0.05); g.add(lx);
  const cart = M.plastic(CARTILAGE, { roughness: 0.5, side: THREE.DoubleSide });
  const thy = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.5, 24, 1, true, -Math.PI * 0.62, Math.PI * 1.24), cart); thy.position.y = 0.22; thy.scale.z = 1.25; lx.add(thy);
  const crico = torus(0.22, 0.05, cart, 32); crico.rotation.x = Math.PI / 2; crico.position.y = -0.12; lx.add(crico);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 20, 1, true), wall); inner.position.y = 0.15; lx.add(inner);
  const folds = new THREE.Group(); folds.position.y = 0.12; lx.add(folds);
  for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.38), M.plastic(0xf7f0ea)); f.position.x = s * 0.1; f.rotation.y = s * 0.18; folds.add(f); }
  const epi = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.4), cart); epi.scale.set(1, 1.5, 0.5); epi.position.set(0, 0.62, -0.18); epi.rotation.x = -0.35; lx.add(epi);
  // Trachea with 18 C-shaped rings, open at the back.
  const trach = new THREE.Group(); g.add(trach);
  trach.add(tube([AIR.trachTop, AIR.carina], 0.17, wall, false, 8));
  const gap = 0.33 * Math.PI, ringG = new THREE.TorusGeometry(0.185, 0.03, 8, 32, Math.PI * 2 - gap);
  ringG.rotateX(Math.PI / 2); ringG.rotateY(-(1.5 * Math.PI + gap / 2));
  const rings = new THREE.InstancedMesh(ringG, cart, 18), o = new THREE.Object3D();
  for (let i = 0; i < 18; i++) { o.position.lerpVectors(AIR.trachTop, AIR.carina, (i + 0.5) / 18.6); o.updateMatrix(); rings.setMatrixAt(i, o.matrix); }
  trach.add(rings);
  // Oesophagus behind it.
  const oes = tube([[0, 8.05, -0.4], [0, 6.5, -0.55], [0.05, 4.5, -0.75], [0.25, 2.3, -0.7], [0.45, 1.6, -0.35]], 0.13, M.plastic(0xc98f7a, { roughness: 0.6, transparent: true, opacity: 0.45, depthWrite: false }), false, 60);
  g.add(oes);
  return { group: g, larynx: lx, trachea: trach, oes, epi, wall };
}

// A faint head-and-neck outline so you can see where the nose and mouth are.
export function makeHeadGhost() {
  const g = new THREE.Group(), mat = M.ghost(0xcfe0ff, 0.06);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), mat); head.scale.set(1.05, 1.3, 1.25); head.position.set(0, 10.55, 0.15);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 2.2, 24, 1, true), mat); neck.position.set(0, 8.1, -0.3);
  g.add(head, neck);
  return g;
}

// A ghost of the heart in the cardiac notch, and the pulmonary vessels that carry blood to and
// from the lungs (see HeartClear for the pump itself).
export function makeHeartGhost() {
  const g = new THREE.Group();
  const heart = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), M.plastic(0xa3404b, { transparent: true, opacity: 0.55, roughness: 0.5, depthWrite: false }));
  heart.scale.set(0.85, 1.12, 0.75); heart.position.set(0.3, 3.2, 0.5); heart.rotation.set(-0.35, 0, 0.75);
  g.add(heart);
  const art = M.plastic(BLUE, { roughness: 0.4 }), vein = M.plastic(RED, { roughness: 0.4 });
  g.add(tube([[0.35, 3.6, 0.8], [0.45, 4.3, 0.4], [0.35, 4.55, -0.05], [0.95, 4.5, -0.3], [1.3, 4.35, -0.35]], 0.1, art, false, 40));
  g.add(tube([[0.35, 4.55, -0.05], [-0.4, 4.35, -0.15], [-0.95, 4.2, -0.2]], 0.09, art, false, 30));
  // Four pulmonary veins bring oxygen-rich blood back to the left atrium, at the back of the heart.
  for (const [x, y] of [[-1.05, 3.9], [-1.0, 3.45], [1.15, 3.95], [1.1, 3.5]]) g.add(tube([[x, y, -0.45], [x * 0.6, y - 0.08, -0.42], [x * 0.25, 3.55, -0.3]], 0.06, vein, false, 16));
  return { group: g, heart };
}

// ================================================================ air particles
// Dots that ride the airway paths in with each breath and back out again.
export function makeAirFlow(tips, count = 150, { nose = true } = {}) {
  const rand = rng(99);
  const head = nose ? [AIR.nostril, [0, 10.4, 1.2], [0, 10.6, 0.6], [0, 10.55, -0.1], AIR.nasoph, AIR.oroph, [0, 8.6, -0.3], AIR.glottis] : [];
  const paths = tips.filter((_, i) => i % 3 === 0).map((t) => pathOf([...head, ...t.trail]));
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), count);
  const inC = new THREE.Color(O2C), outC = new THREE.Color(CO2C);
  for (let i = 0; i < count; i++) mesh.setColorAt(i, inC);
  const P = Array.from({ length: count }, () => ({ path: paths[Math.floor(rand() * paths.length)], u: rand(), dir: 1 }));
  const o = new THREE.Object3D(), p = new THREE.Vector3();
  mesh.frustumCulled = false;
  mesh.step = (du, inhale) => {
    for (let i = 0; i < count; i++) {
      const q = P[i];
      q.u += du * (0.7 + 0.6 * ((i * 0.618) % 1));
      if (q.u > 1) { q.u -= 1; q.path = paths[Math.floor(rand() * paths.length)]; }
      if (q.u < 0) { q.u += 1; q.path = paths[Math.floor(rand() * paths.length)]; }
      q.path.at(q.u, p);
      o.position.copy(p); o.scale.setScalar(1); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i, inhale ? inC : outC);
    }
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
  };
  return mesh;
}

// ================================================================ a whole chest
// Lungs, airway tree, rib cage and diaphragm, with a breathe(v) call that moves them together.
export function makeChest({ head = true, tree = true, depth = 6, heart = true, pleura = false } = {}) {
  const root = new THREE.Group();
  const lungs = { [-1]: makeLung(-1), [1]: makeLung(1) };
  const lungWrap = {};
  for (const s of [-1, 1]) {
    // Each lung scales about its apex when it inflates.
    const w = new THREE.Group(); w.position.set(LUNGS[s].cx, LUNGS[s].top, LUNGS[s].cz);
    const inner = new THREE.Group(); inner.position.set(-LUNGS[s].cx, -LUNGS[s].top, -LUNGS[s].cz);
    w.add(inner); inner.add(lungs[s].group); root.add(w); lungWrap[s] = w;
  }
  const T = tree ? makeTree({ depth }) : null;
  const treeMat = M.plastic(CARTILAGE, { roughness: 0.45 });
  const sacMat = M.plastic(0xff8fa3, { roughness: 0.5, transparent: true, opacity: 0.9 });
  const trees = {};
  if (T) {
    for (const s of [-1, 1]) for (const L of LOBES[s]) {
      const segs = segments(T.lobeSegs[s + L], treeMat);
      const tipList = T.tips.filter((t) => t.side === s && t.lobe === L);
      const sacs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), sacMat, tipList.length * 3);
      const o = new THREE.Object3D(), r = rng(s * 10 + L.length);
      tipList.forEach((t, i) => { for (let k = 0; k < 3; k++) { o.position.copy(t.at).add(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.09)); o.updateMatrix(); sacs.setMatrixAt(i * 3 + k, o.matrix); } });
      lungs[s].lobes[L].add(segs, sacs);
      trees[s + L] = { segs, sacs };
    }
    root.add(segments(T.trunk.slice(1), treeMat, 14));
  }
  const cage = makeRibCage();
  const dia = makeDiaphragm();
  root.add(cage.group, dia);
  const pleurae = pleura ? [makePleura(-1), makePleura(1)] : [];
  pleurae.forEach((p, i) => lungWrap[i ? 1 : -1].children[0].add(p));
  const up = head ? makeUpperAirway() : null;
  if (up) root.add(up.group);
  else if (T) { const tr = makeUpperAirway(); root.add(tr.trachea); }
  const hg = head ? makeHeadGhost() : null; if (hg) root.add(hg);
  const hh = heart ? makeHeartGhost() : null; if (hh) root.add(hh.group);
  const setXray = (k) => { lungs[-1].setXray(k); lungs[1].setXray(k); };
  return {
    root, lungs, lungWrap, tree: T, trees, cage, dia, up, headGhost: hg, heart: hh, pleurae, setXray, sacMat,
    // v = litres above FRC. Diaphragm down, ribs up and out, lungs grow to fill the space.
    breathe(v) {
      const d = Math.max(-0.4, v) * DIAPHRAGM_PER_L;
      dia.setDescent(d);
      cage.setLift(clamp(v / 3.5, -0.3, 1));
      for (const s of [-1, 1]) {
        const sy = 1 + d / (LUNGS[s].top - 2.4), sxz = 1 + 0.035 * clamp(v / 3.5, -0.3, 1);
        lungWrap[s].scale.set(sxz, sy, sxz);
      }
    },
  };
}
