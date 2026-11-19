/* VocalisX — Data Analysis page. Shows the backend's exploratory data analysis (report section 5.3) in the dashboard.
   Needs the backend running:  cd vocalisx_backend && uvicorn main:app --reload
   Loaded BEFORE app.js; it uses helpers from app.js ($, esc, ic) only when a function is called. */
const API = (() => {
  try { const o = localStorage.getItem('vx-api'); if (o) return o; } catch (e) {}
  return location.port === '8000' ? '' : 'http://127.0.0.1:8000';      // '' = same origin when served by uvicorn at /app
})();
const COLORS = ['#3cb59e', '#e8a044', '#5b9bf0', '#ef6b6b', '#b48cf0', '#8fd14f'];
const A = {tab: 'overview', cache: {}, feature: 'rms', phrase: 'Help me', sample: null, recog: null, thr: 0.9};
const TABS = [['overview', 'Overview'], ['stats', 'Statistics'], ['explorer', 'Feature explorer'], ['signal', 'Signal'],
              ['relations', 'Relations & outliers'], ['figures', 'Figures'], ['model', 'Model']];
const CAPTIONS = {
  'class-distribution': 'Windows per phrase. Unequal bars = class imbalance, handled with balanced class weights.',
  'signal-examples': 'One raw (grey) and filtered (colour) window per phrase.',
  'feature-boxplots': 'Spread of four key features per phrase. Boxes that do not overlap separate easily.',
  'feature-histograms': 'Distribution shape (skew and spread) of six features.',
  'correlation-heatmap': 'Pearson correlation between features. Strong red/blue pairs carry the same information.',
  'psd-by-phrase': 'Average power spectrum per phrase. Different curves = frequency content separates phrases.',
  'pca-scatter': 'Features squeezed to 2 dimensions. Overlapping clusters = phrases the model will confuse.',
  'confusion-matrix': 'Rows = true phrase, columns = prediction. Off-diagonal cells are mistakes.',
  'feature-importance': 'Which features the model relies on most (drop in macro-F1 when shuffled).',
  'model-comparison': 'Random Forest vs SVM vs k-NN under 5-fold cross-validation.'
};
const FEATURE_HELP = {
  mean: 'average signal value (should be ~0 after DC removal)', variance: 'spread of the signal around its mean', std: 'square root of variance',
  rms: 'Root Mean Square: effective signal strength', mav: 'mean absolute value', zero_crossings: 'times the signal crosses zero',
  slope_sign_changes: 'times the slope changes direction', waveform_length: 'total path length of the waveform', peak_amplitude: 'largest absolute value',
  skewness: 'asymmetry of the amplitude distribution', kurtosis: 'peakedness / heavy tails', total_power: 'sum of spectral power',
  mean_freq: 'power-weighted average frequency (Hz)', median_freq: 'frequency splitting the power in half (Hz)', peak_freq: 'frequency with most power (Hz)'
};

const aget = async (path, opts) => {
  const r = await fetch(API + path, opts);
  if (!r.ok) throw new Error((await r.text().catch(() => '')).slice(0, 120) || r.status);
  return r.json();
};
const cached = (path) => A.cache[path] || (A.cache[path] = aget(path).catch(e => { delete A.cache[path]; throw e; }));
const num = (v, d = 4) => v === null || v === undefined || isNaN(v) ? '–' : (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString() : (+Number(v).toPrecision(d)).toString());
const tbl = (head, rows) => `<div class="scroll"><table class="dt"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const stat = (k, v, hint = '') => `<div class="stat"><small>${esc(k)}</small><strong>${esc(v)}</strong>${hint ? `<small>${esc(hint)}</small>` : ''}</div>`;
const note = (txt) => `<p class="mut sm">${txt}</p>`;

/* ---------- entry point called from app.js ---------- */
function renderAnalysis(root) {
  root.innerHTML = `<div class="seg tabs" id="a-tabs">${TABS.map(([k, n]) => `<button data-vx="tab" data-v="${k}" class="${A.tab === k ? 'on' : ''}">${n}</button>`).join('')}</div><div id="a-body" class="col"><p class="empty">Loading analysis…</p></div>`;
  drawTab();
}

async function drawTab() {
  const body = $('a-body'); if (!body) return;
  document.querySelectorAll('#a-tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === A.tab));
  const tab = A.tab;
  try {
    const html = await TAB_RENDER[tab]();
    if (A.tab !== tab || !$('a-body')) return;               // user switched tabs while loading
    $('a-body').innerHTML = html;
    if (TAB_AFTER[tab]) TAB_AFTER[tab]();
  } catch (e) {
    if (!$('a-body')) return;
    $('a-body').innerHTML = `<div class="card mid"><h2>Backend not reachable</h2>
      <p class="mut">The analysis is computed by the Python backend. Start it, then reload this page:</p>
      <pre class="code">cd vocalisx_backend\npip install -r requirements.txt\nuvicorn main:app --reload</pre>
      <p class="mut sm">Looking for it at <b>${esc(API || location.origin)}</b>. (${esc(e.message)})</p>
      <button class="btn" data-vx="retry">Retry</button></div>`;
  }
}

/* ---------- tabs ---------- */
const TAB_RENDER = {
  async overview() {
    const [s, ev, out] = await Promise.all([cached('/api/eda/summary'), cached('/api/model/evaluation'), cached('/api/eda/outliers')]);
    const d = s.dataset, cd = s.class_distribution, max = Math.max(...Object.values(cd.counts));
    const bars = Object.keys(cd.counts).map((k, i) => `<div class="hb"><span>${esc(k)}</span><div class="bar"><i style="width:${cd.counts[k] / max * 100}%;background:${COLORS[i % 6]}"></i></div><b>${cd.counts[k]} <small>(${cd.percent[k]}%)</small></b></div>`).join('');
    return `${d.is_synthetic ? '<p class="warnbox">These results come from a <b>synthetic dataset</b> generated by the backend, not a real collar. Report them as such.</p>' : ''}
      <div class="grid2">${stat('Windows', d.n_windows, '1 s each @ ' + d.sampling_rate_hz + ' Hz')}${stat('Features', d.n_features)}${stat('Imbalance ratio', cd.imbalance_ratio + '×', cd.majority_class + ' vs ' + cd.minority_class)}
        ${stat('Missing values', s.missing_values.total_missing)}${stat('Test accuracy', (ev.test_accuracy * 100).toFixed(1) + '%', ev.best_model)}${stat('Macro-F1', (ev.macro_f1 * 100).toFixed(1) + '%')}</div>
      <section class="card"><h4>Samples per phrase (class balance)</h4>${bars}
        ${note(cd.is_imbalanced ? `Dataset is <b>imbalanced</b> (${cd.imbalance_ratio}×). Handled by: ${esc(cd.handled_by)}.` : 'Classes are roughly balanced.')}</section>
      <section class="card"><h4>Outliers (IQR rule, inside each phrase)</h4>
        <p>${out.windows_with_extreme_outlier} windows (${out.percent_of_windows}%) have at least one extreme feature value, usually motion artefacts or poor electrode contact.</p></section>`;
  },

  async stats() {
    const [s, f, cm] = await Promise.all([cached('/api/eda/summary'), cached('/api/eda/statistics'), cached('/api/eda/class-means')]);
    const a = s.amplitude_statistics, cols = ['mean', 'median', 'variance', 'std', 'min', 'max'];
    const amp = tbl(['Group', ...cols], [['All phrases', ...cols.map(c => num(a.overall[c]))], ...Object.keys(a.per_phrase).map(k => [k, ...cols.map(c => num(a.per_phrase[k][c]))])]);
    const sc = ['mean', 'median', 'variance', 'std', 'min', 'max', 'skewness', 'kurtosis'];
    const feat = tbl(['Feature', ...sc], Object.keys(f).map(k => [k, ...sc.map(c => num(f[k][c]))]));
    const kc = Object.keys(Object.values(cm)[0]);
    const means = tbl(['Phrase', ...kc], Object.keys(cm).map(p => [p, ...kc.map(c => num(cm[p][c]))]));
    return `<section class="card"><h4>Raw signal amplitude (mV): mean, median, variance, standard deviation</h4>${amp}
        ${note('Mean ≈ 0 and median ≈ 0 because muscle signals swing both ways around zero. Variance and std show how strong the activity is.')}</section>
      <section class="card"><h4>Extracted features: descriptive statistics</h4>${feat}
        ${note('Mean vs median gap and skewness show which features are skewed. Large variance across windows means the feature changes a lot between phrases.')}</section>
      <section class="card"><h4>Average of key features per phrase</h4>${means}</section>`;
  },

  async explorer() {
    const info = await cached('/api/dataset/info');
    const d = await cached('/api/eda/feature/' + A.feature);
    const cols = ['mean', 'median', 'variance', 'std', 'min', 'max'];
    const rows = [['All phrases', ...cols.map(c => num(d.overall[c]))], ...Object.keys(d.per_phrase).map(k => [k, ...cols.map(c => num(d.per_phrase[k][c]))])];
    return `<section class="card"><div class="fld"><span>Choose a feature</span><select id="a-feat">${info.feature_names.map(n => `<option ${n === A.feature ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        ${note(esc(FEATURE_HELP[A.feature] || (A.feature.startsWith('bp_') ? 'share of signal power in this frequency band (Hz)' : '')))}</section>
      <section class="card"><h4>Distribution of ${esc(A.feature)} by phrase</h4><div id="a-hist"></div><div class="legend">${Object.keys(d.per_phrase).map((k, i) => `<span><i style="background:${COLORS[i % 6]}"></i>${esc(k)}</span>`).join('')}</div>
        ${note('Stacked histogram. If the colours sit in different places along the axis, this feature separates the phrases well.')}</section>
      <section class="card"><h4>Statistics of ${esc(A.feature)}</h4>${tbl(['Group', ...cols], rows)}</section>`;
  },

  async signal() {
    if (!A.sample || A.sample.phrase !== A.phrase) A.sample = await aget('/api/signal/sample?phrase=' + encodeURIComponent(A.phrase));
    const info = await cached('/api/dataset/info'), f = A.sample.features;
    const phrases = Object.keys((await cached('/api/eda/summary')).class_distribution.counts);
    const keys = ['mean', 'variance', 'std', 'rms', 'mav', 'zero_crossings', 'waveform_length', 'peak_amplitude', 'mean_freq', 'median_freq'];
    const r = A.recog;
    return `<section class="card"><div class="fld"><span>Phrase to simulate</span><select id="a-phrase">${phrases.map(p => `<option ${p === A.phrase ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></div>
        <div class="rw"><button class="btn out grow" data-vx="newsig">New window</button><button class="btn grow" data-vx="recog">Recognise it</button></div></section>
      <section class="card"><h4>sEMG window: raw vs filtered (1 s, ${info.sampling_rate_hz} Hz)</h4><canvas id="a-wave" height="180"></canvas>
        <div class="legend"><span><i style="background:#7f8c99"></i>raw (noise, 50 Hz hum)</span><span><i style="background:#3cb59e"></i>filtered (20–450 Hz band-pass + notch)</span></div></section>
      <section class="card"><h4>Features of this window</h4>${tbl(['Feature', 'Value'], keys.map(k => [k, num(f[k])]))}</section>
      ${r ? `<section class="card"><h4>Recognition result</h4><div class="readout">${esc(r.phrase)}</div><p class="mut">Confidence ${num(r.confidence, 3)}% · ${num(r.inference_ms, 3)} ms · ${r.phrase === A.phrase ? '✓ correct' : '✗ intended: ' + esc(A.phrase)}</p>
        ${tbl(['Top 3', 'Probability %'], r.top3.map(t => [t.phrase, num(t.confidence ?? t.probability, 3)]))}</section>` : ''}`;
  },

  async relations() {
    const [c, o] = await Promise.all([cached('/api/eda/correlations?threshold=' + A.thr), cached('/api/eda/outliers')]);
    const pairs = c.highly_correlated_pairs;
    return `<section class="card"><h4>Highly correlated feature pairs</h4>
        <div class="fld"><div class="rw"><span>Threshold |r| ≥</span><output>${A.thr}</output></div><input type="range" id="a-thr" min="0.5" max="1" step="0.05" value="${A.thr}"></div>
        ${pairs.length ? tbl(['Feature A', 'Feature B', 'r'], pairs.slice(0, 25).map(p => [p.a, p.b, num(p.r, 3)])) : '<p class="empty">No pairs above this threshold.</p>'}
        ${note(`${pairs.length} pair(s). Pairs near ±1 are redundant (e.g. std and rms). Tree models like Random Forest tolerate this.`)}</section>
      <section class="card"><h4>Correlation heatmap</h4><img class="fig" src="${API}/api/plots/correlation-heatmap" alt="Correlation heatmap"></section>
      <section class="card"><h4>Outliers by feature (${esc(o.method)})</h4>
        ${tbl(['Feature', 'Mild (1.5×IQR)', 'Extreme (3×IQR)'], Object.keys(o.mild_outliers_by_feature).map(k => [k, o.mild_outliers_by_feature[k], o.extreme_outliers_by_feature[k]]))}
        ${note(`${o.windows_with_extreme_outlier} windows (${o.percent_of_windows}%) contain an extreme value.`)}</section>`;
  },

  async figures() {
    const p = await cached('/api/plots');
    return Object.entries(p.plots).map(([n, u]) => `<figure class="card"><img class="fig" loading="lazy" src="${API}${u}" alt="${esc(n)}"><figcaption><b>${esc(n)}</b>. ${esc(CAPTIONS[n] || '')}</figcaption></figure>`).join('');
  },

  async model() {
    const ev = await cached('/api/model/evaluation');
    const cmp = ev.comparison, imp = ev.importance.slice(0, 8), mx = Math.max(...imp.map(i => i.importance), 1e-9);
    return `<div class="grid2">${stat('Best model', ev.best_model)}${stat('Test accuracy', (ev.test_accuracy * 100).toFixed(1) + '%', ev.n_test + ' test windows')}${stat('Macro-F1', (ev.macro_f1 * 100).toFixed(1) + '%')}${stat('Weighted-F1', (ev.weighted_f1 * 100).toFixed(1) + '%')}</div>
      <section class="card"><h4>Model comparison (5-fold cross-validation)</h4>${tbl(['Model', 'Accuracy', 'Macro-F1'], Object.keys(cmp).map(k => [k, num(cmp[k].cv_accuracy_mean, 3) + ' ± ' + num(cmp[k].cv_accuracy_std, 2), num(cmp[k].cv_f1_macro_mean, 3)]))}</section>
      <section class="card"><h4>Per-phrase results (held-out test set)</h4>${tbl(['Phrase', 'Precision', 'Recall', 'F1', 'n'], ev.classes.map(c => { const p = ev.per_class[c]; return [c, num(p.precision, 3), num(p.recall, 3), num(p['f1-score'], 3), p.support]; }))}</section>
      <section class="card"><h4>Most important features</h4>${imp.map(i => `<div class="hb"><span>${esc(i.feature)}</span><div class="bar"><i style="width:${Math.max(0, i.importance) / mx * 100}%"></i></div><b>${num(i.importance, 2)}</b></div>`).join('')}</section>
      <section class="card"><h4>Confusion matrix</h4><img class="fig" src="${API}/api/plots/confusion-matrix" alt="Confusion matrix"></section>`;
  }
};

/* ---------- after-render drawing (canvas / SVG) ---------- */
const TAB_AFTER = {
  explorer() { cached('/api/eda/feature/' + A.feature).then(d => { if ($('a-hist')) $('a-hist').innerHTML = stackedHist(d); }); },
  signal() { drawWave(); }
};

function stackedHist(d) {
  const names = Object.keys(d.histogram_by_phrase), n = d.bin_edges.length - 1, W = 600, H = 200, pad = 22, bw = (W - pad) / n;
  const tot = Array.from({length: n}, (_, i) => names.reduce((s, k) => s + d.histogram_by_phrase[k][i], 0)), top = Math.max(...tot, 1);
  let bars = '';
  for (let i = 0; i < n; i++) {
    let y = H - pad;
    names.forEach((k, j) => { const h = d.histogram_by_phrase[k][i] / top * (H - pad - 6); y -= h; if (h > 0) bars += `<rect x="${pad + i * bw + 1}" y="${y}" width="${bw - 2}" height="${h}" fill="${COLORS[j % 6]}"><title>${esc(k)}: ${d.histogram_by_phrase[k][i]}</title></rect>`; });
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Histogram of ${esc(d.feature)}">${bars}<line x1="${pad}" x2="${W}" y1="${H - pad}" y2="${H - pad}" stroke="currentColor" opacity=".4"/>
    <text x="${pad}" y="${H - 6}" font-size="11" fill="currentColor" opacity=".7">${num(d.bin_edges[0], 3)}</text><text x="${W}" y="${H - 6}" font-size="11" text-anchor="end" fill="currentColor" opacity=".7">${num(d.bin_edges[n], 3)}</text>
    <text x="${pad + 4}" y="12" font-size="11" fill="currentColor" opacity=".7">max ${top} windows</text></svg>`;
}

function drawWave() {
  const cv = $('a-wave'); if (!cv || !A.sample) return;
  const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = 180;
  cv.width = w * dpr; cv.height = h * dpr; const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const all = A.sample.raw.concat(A.sample.filtered), m = Math.max(...all.map(Math.abs)) || 1;
  const line = (arr, col, lw) => { g.beginPath(); g.strokeStyle = col; g.lineWidth = lw; arr.forEach((v, i) => { const x = i / (arr.length - 1) * w, y = h / 2 - v / m * (h / 2 - 6); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); };
  g.strokeStyle = '#7f8c9944'; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
  line(A.sample.raw, '#7f8c99aa', 1); line(A.sample.filtered, '#3cb59e', 1.4);
}

/* ---------- events ---------- */
document.body.addEventListener('click', async e => {
  const b = e.target.closest('[data-vx]'); if (!b) return;
  const a = b.dataset.vx;
  if (a === 'tab') { A.tab = b.dataset.v; drawTab(); }
  else if (a === 'retry') { A.cache = {}; drawTab(); }
  else if (a === 'newsig') { A.sample = null; A.recog = null; drawTab(); }
  else if (a === 'recog') {
    try { A.recog = await aget('/api/recognize', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({signal: A.sample.raw})}); }
    catch (err) { alert('Recognition failed: ' + err.message); }
    drawTab();
  }
});
document.body.addEventListener('change', e => {
  if (e.target.id === 'a-feat') { A.feature = e.target.value; drawTab(); }
  else if (e.target.id === 'a-phrase') { A.phrase = e.target.value; A.sample = null; A.recog = null; drawTab(); }
  else if (e.target.id === 'a-thr') { A.thr = +e.target.value; drawTab(); }
});
window.addEventListener('resize', () => { if (A.tab === 'signal') drawWave(); });
