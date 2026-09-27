// Chapter 1: the respiratory system, from nose to alveoli, inside the rib cage.
// Front (anterior) view: the patient's right is on your left.
import { THREE } from '../kit.js';
import { makeChest, makeAirFlow, makePleura, breath, AIR, LUNGS } from '../lungs.js';

export default {
  id: 'anatomy',
  short: 'Inside the chest',
  title: 'The breathing system',
  subtitle: 'From your nose to 480 million tiny air sacs, in a cage of ribs.',
  view: { pos: [-1.3, 6.9, 16.6], target: [-1.2, 5.9, 0] },
  learn: `<p>Every breath takes the same journey. Air comes in through your <b>nose</b> (or mouth), where it is warmed, wetted and filtered. It passes the <b>pharynx</b> (your throat) and the <b>larynx</b>, your voice box, where a flap called the <b>epiglottis</b> shuts when you swallow, so food goes down the food pipe instead.</p>
    <p>Then comes the <b>trachea</b>, or windpipe: about 11 cm long, held open by C-shaped rings of <b>cartilage</b>. At the <b>carina</b> it splits into two <b>bronchi</b>, and these split again and again, about 23 times, into thinner and thinner <b>bronchioles</b>. At the very ends sit bunches of tiny air sacs, the <b>alveoli</b>. You have about 480 million of them.</p>
    <p>Your two lungs are not twins. The <b>right lung has three lobes</b>. The <b>left lung has two</b>, and a dent called the <b>cardiac notch</b> makes room for your heart (<a href="/heartclear/">see HeartClear</a>). Each lung sits in a slippery two-layer bag, the <b>pleura</b>. Underneath is a dome of muscle, the <b>diaphragm</b>, and all around are the <b>ribs</b> with the <b>intercostal muscles</b> between them.</p>
    <p class="tip"><b>Try it:</b> switch on X-ray to see the branching airway tree, then take the chest apart and count the lobes on each side.</p>`,
  terms: [
    { t: 'Trachea', d: 'The windpipe: a tube about 11 cm long and 2 cm wide, held open by 16 to 20 C-shaped cartilage rings.' },
    { t: 'Bronchus', d: 'One of the two big airways the trachea splits into; they keep branching into smaller bronchi and bronchioles.' },
    { t: 'Alveoli', d: 'Hundreds of millions of tiny air sacs at the ends of the airways, where oxygen passes into the blood.' },
    { t: 'Lobe', d: 'A section of a lung with its own airway. The right lung has three, the left has two.' },
    { t: 'Pleura', d: 'A thin, two-layered bag around each lung, with a slick of fluid between the layers so the lung can glide.' },
    { t: 'Diaphragm', d: 'The dome-shaped sheet of muscle under the lungs. It is the main muscle of breathing.' },
  ],
  defaults: { explode: 0, xray: false, ribs: true, breathing: true },
  controls: [
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'exploded'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'xray', type: 'toggle', label: 'X-ray: see the airway tree', hint: 'Makes the lungs see-through so you can follow the bronchi down to the air sacs.' },
    { key: 'ribs', type: 'toggle', label: 'Show the rib cage' },
    { key: 'breathing', type: 'toggle', label: 'Breathing' },
  ],
  quiz: [
    { q: 'How many lobes does each lung have?', options: ['Two on each side', 'Three on the right, two on the left', 'Two on the right, three on the left', 'One big lobe each'], answer: 1, why: 'The left lung is smaller, with only two lobes, because it shares space with the heart.' },
    { q: 'What stops food going into your windpipe when you swallow?', options: ['The diaphragm', 'The epiglottis', 'The carina', 'The pleura'], answer: 1, why: 'The epiglottis is a flap above the larynx that folds down over the airway as you swallow.' },
    { q: 'Why are the trachea’s cartilage rings open at the back?', options: ['To save weight', 'To let the food pipe behind it bulge when you swallow', 'So air can leak out', 'They are closed rings'], answer: 1, why: 'The oesophagus runs right behind the trachea, and the soft back wall lets a mouthful of food squeeze past.' },
  ],
  reel: [
    { ms: 5600, caption: 'Every breath travels from your nose, down the windpipe, into two lungs.', set: { xray: false, ribs: true, breathing: true, explode: 0 }, view: { pos: [-1.2, 6.9, 17.5], target: [-0.3, 5.7, 0] }, spin: 0.35 },
    { ms: 5600, caption: 'Inside, the airways branch about 23 times, ending in 480 million tiny air sacs.', set: { xray: true, ribs: false, breathing: true }, anim: { explode: [0, 0.55] }, view: { pos: [0.5, 5.2, 11.5], target: [0, 4.0, 0] }, spin: 0.3 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const C = makeChest({ head: true, tree: true, depth: 6, heart: true });
    root.add(C.root);
    const pl = { [-1]: makePleura(-1), [1]: makePleura(1) };
    for (const s of [-1, 1]) C.lungs[s].group.add(pl[s]);
    const air = makeAirFlow(C.tree.tips, 170); root.add(air);

    const L = C.lungs;
    const explodeParts = [
      [L[-1].lobes.upper, [-0.7, 0.9, 0.2]], [L[-1].lobes.middle, [-0.9, -0.1, 1.2]], [L[-1].lobes.lower, [-1.1, -0.6, -1.0]],
      [L[1].lobes.upper, [0.8, 0.9, 0.5]], [L[1].lobes.lower, [1.1, -0.6, -1.0]],
      [pl[-1], [-1.5, 0.3, 0]], [pl[1], [1.5, 0.3, 0]],
      [C.dia, [0, -1.6, 0]], [C.up.group, [0, 1.3, 0]], [C.heart.group, [1.4, -1.0, 1.4]],
    ];
    explodeParts.forEach(([o]) => { o.userData.home = o.position.clone(); });
    const setExplode = (k) => explodeParts.forEach(([o, off]) => o.position.copy(o.userData.home).add(new THREE.Vector3(...off).multiplyScalar(k * k * (3 - 2 * k))));

    // Labels. Minor ones hide on a narrow screen.
    const minor = [], xrayOnly = [];
    const lab = (t, p, parent = root, cls = '', o = {}) => { const l = stage.label(t, p, parent, cls); if (o.minor) minor.push(l); if (o.xray) xrayOnly.push(l); return l; };
    lab('Nose', [1.0, 10.45, 1.5], C.up.group);
    lab('Mouth', [1.0, 9.3, 1.4], C.up.group, '', { minor: true });
    lab('Pharynx (throat)', [-1.25, 9.95, -0.5], C.up.group, '', { minor: true });
    lab('Epiglottis', [-1.0, 8.6, -0.2], C.up.group, '', { minor: true });
    lab('Larynx (voice box)', [1.25, 8.0, 0.1], C.up.group);
    lab('Trachea: C-shaped rings', [1.2, 6.85, 0], C.up.group);
    lab('Oesophagus (food pipe)', [-1.35, 7.3, -0.5], C.up.group, '', { minor: true });
    lab('Carina', [0.05, 4.85, 0.35], root, 'hot', { minor: true, xray: true });
    lab('Right bronchus: short, steep', [-1.15, 4.8, 0.6], root, '', { xray: true, minor: true });
    lab('Left bronchus: longer, flatter', [1.35, 4.15, 0.5], root, '', { xray: true, minor: true });
    lab('Bronchioles', [-1.9, 2.9, 0.4], L[-1].lobes.lower, '', { xray: true });
    lab('Alveolar sacs', [2.1, 2.4, 0.3], L[1].lobes.lower, 'hot', { xray: true, minor: true });
    lab('Upper lobe', [-2.55, 5.0, 0.5], L[-1].lobes.upper, '', { minor: true });
    lab('Middle lobe', [-2.6, 3.4, 0.8], L[-1].lobes.middle, '', { minor: true });
    lab('Lower lobe', [-2.8, 2.05, -0.4], L[-1].lobes.lower, '', { minor: true });
    lab('Upper lobe', [2.6, 4.9, 0.4], L[1].lobes.upper, '', { minor: true });
    lab('Lower lobe', [2.9, 2.1, -0.4], L[1].lobes.lower, '', { minor: true });
    lab('Cardiac notch', [0.95, 3.35, 1.1], L[1].lobes.upper, 'hot');
    lab('Pleura', [-3.35, 4.2, 0], pl[-1], '', { minor: true });
    lab('Diaphragm', [1.7, 1.45, 1.2], C.dia);
    lab('Heart: see HeartClear', [0.3, 2.0, 1.7], C.heart.group, '', { minor: true });
    const ribLab = lab('Ribs and intercostal muscles', [3.4, 3.55, 0.6], root, '', { minor: true });
    const sideL = lab('<b>RIGHT</b> lung · 3 lobes', [-2.2, 6.2, 0.4], root, 'hot');
    const sideR = lab('<b>LEFT</b> lung · 2 lobes', [2.25, 6.15, 0.4], root, 'hot');
    lab('Patient’s right', [-3.3, 0.35, 1.2], root, '', { minor: true });
    lab('Patient’s left', [3.3, 0.35, 1.2], root, '', { minor: true });

    let xr = 0, t = 0, run = 1, wasNarrow = false;
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        run += ((s.breathing ? 1 : 0) - run) * Math.min(1, dt * 3);
        t += dt * (s.breathing ? 1 : 0);
        const b = breath(t, 14, 0.5);
        C.breathe(b.v * run);
        setExplode(s.explode);
        xr += ((s.xray ? 1 : 0) - xr) * Math.min(1, dt * 5);
        C.setXray(xr);
        C.cage.group.visible = s.ribs && s.explode < 0.45;
        C.cage.setXray(Math.max(0.3, xr * 0.6, s.explode));
        const narrow = stage.host.clientWidth < 560;
        minor.forEach((l) => { l.visible = !narrow; });
        xrayOnly.forEach((l) => { l.visible = xr > 0.5 && !(narrow && minor.includes(l)); });
        ribLab.visible = s.ribs && !narrow && s.explode < 0.5;
        const showAir = s.breathing && s.explode < 0.08;
        air.visible = showAir;
        if (showAir) air.step(b.flow * dt * 0.33, b.inhale);
        sideL.visible = sideR.visible = s.explode < 0.3;
        if (narrow !== wasNarrow) { wasNarrow = narrow; sideL.element.innerHTML = narrow ? '<b>RIGHT</b>' : '<b>RIGHT</b> lung · 3 lobes'; sideR.element.innerHTML = narrow ? '<b>LEFT</b>' : '<b>LEFT</b> lung · 2 lobes'; }
      },
      readout: (s) => {
        const b = breath(t, 14, 0.5);
        return `<div class="big">${s.breathing ? (b.inhale ? 'Breathing in' : 'Breathing out') : 'Two lungs, five lobes'}</div>
          <div class="row"><span>Right lung</span><b>3 lobes</b></div>
          <div class="row"><span>Left lung</span><b>2 lobes + cardiac notch</b></div>
          ${stage.host.clientWidth < 560 ? '' : '<div class="row"><span>Times the airways branch</span><b>about 23</b></div>'}
          <div class="row"><span>Alveoli (air sacs)</span><b>about 480 million</b></div>
          ${stage.host.clientWidth < 560 ? '' : `<div class="row"><span>Breaths a day at rest</span><b>about 20,000</b></div>
          <small>Front view: the patient’s right is on your left.</small>`}`;
      },
    };
  },
};
