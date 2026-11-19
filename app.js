/* VocalisX — static demo app (no build step). Collar data is simulated: replace connect() with real hardware (Web Bluetooth / WebSocket). */
const T = {
  en:{signal:'Signal',electrode:'Electrode',attached:'Attached',detached:'Detached',disc:'Disconnected',conn:'Connected',connecting:'Connecting…',
      bannerText:'Collar disconnected.',reconnect:'Reconnect now',live:'Live Prediction',idle:'Connect the collar to begin decoding.',listening:'Listening for silent speech…',
      confirm:'Confirm & Send',repeat:'Repeat Message',emergency:'EMERGENCY',history:'Phrase History',viewAll:'View All',addVoice:'Add a voice entry',
      none:'No phrases yet. Decoded and manually added messages will appear here.',close:'Close',confidence:'Confidence',stub:'This page isn’t built yet.',
      nav:['Home','Recognition','Phrases','Contacts','Analysis','Settings']},
  ta:{signal:'சிக்னல்',electrode:'மின்முனை',attached:'இணைந்தது',detached:'பிரிந்தது',disc:'துண்டிக்கப்பட்டது',conn:'இணைக்கப்பட்டது',connecting:'இணைக்கிறது…',
      bannerText:'காலர் துண்டிக்கப்பட்டது.',reconnect:'மீண்டும் இணை',live:'நேரடி கணிப்பு',idle:'டிகோடிங் தொடங்க காலரை இணைக்கவும்.',listening:'அமைதிப் பேச்சைக் கவனிக்கிறது…',
      confirm:'உறுதிசெய்து அனுப்பு',repeat:'செய்தியை மீண்டும் சொல்',emergency:'அவசரம்',history:'சொற்றொடர் வரலாறு',viewAll:'அனைத்தையும் காண்க',addVoice:'குரல் பதிவைச் சேர்',
      none:'இன்னும் சொற்றொடர்கள் இல்லை.',close:'மூடு',confidence:'நம்பகத்தன்மை',stub:'இந்தப் பக்கம் இன்னும் உருவாக்கப்படவில்லை.',
      nav:['முகப்பு','அறிதல்','சொற்றொடர்கள்','தொடர்புகள்','பகுப்பாய்வு','அமைப்புகள்']},
  hi:{signal:'सिग्नल',electrode:'इलेक्ट्रोड',attached:'जुड़ा है',detached:'अलग है',disc:'डिस्कनेक्ट',conn:'कनेक्ट',connecting:'कनेक्ट हो रहा है…',
      bannerText:'कॉलर डिस्कनेक्ट है।',reconnect:'फिर से जोड़ें',live:'लाइव पूर्वानुमान',idle:'डिकोडिंग शुरू करने के लिए कॉलर कनेक्ट करें।',listening:'मौन भाषण सुन रहा है…',
      confirm:'पुष्टि करें और भेजें',repeat:'संदेश दोहराएं',emergency:'आपातकाल',history:'वाक्यांश इतिहास',viewAll:'सभी देखें',addVoice:'वॉइस एंट्री जोड़ें',
      none:'अभी कोई वाक्यांश नहीं।',close:'बंद करें',confidence:'भरोसा',stub:'यह पेज अभी बना नहीं है।',
      nav:['होम','पहचान','वाक्यांश','संपर्क','विश्लेषण','सेटिंग्स']},
  te:{signal:'సిగ్నల్',electrode:'ఎలక్ట్రోడ్',attached:'అమర్చబడింది',detached:'విడిపోయింది',disc:'డిస్‌కనెక్ట్ అయింది',conn:'కనెక్ట్ అయింది',connecting:'కనెక్ట్ అవుతోంది…',
      bannerText:'కాలర్ డిస్‌కనెక్ట్ అయింది.',reconnect:'మళ్లీ కనెక్ట్ చేయండి',live:'లైవ్ అంచనా',idle:'డీకోడింగ్ ప్రారంభించడానికి కాలర్‌ను కనెక్ట్ చేయండి.',listening:'నిశ్శబ్ద ప్రసంగాన్ని వింటోంది…',
      confirm:'నిర్ధారించి పంపండి',repeat:'సందేశాన్ని మళ్లీ చెప్పండి',emergency:'అత్యవసరం',history:'పదబంధాల చరిత్ర',viewAll:'అన్నీ చూడండి',addVoice:'వాయిస్ ఎంట్రీ జోడించండి',
      none:'ఇంకా పదబంధాలు లేవు.',close:'మూసివేయి',confidence:'నమ్మకం',stub:'ఈ పేజీ ఇంకా తయారు కాలేదు.',
      nav:['హోమ్','గుర్తింపు','పదబంధాలు','కాంటాక్ట్స్','విశ్లేషణ','సెట్టింగ్‌లు']}
};

const VOICE = {en:'en-IN', ta:'ta-IN', hi:'hi-IN', te:'te-IN'};
const LN = {en:'English', ta:'Tamil', hi:'Hindi', te:'Telugu'};
const PAGES = ['home','recognition','phrases','contacts','analysis','settings'];
const NAVI = ['home','wave','msg','users','chart','gear'];
const TITLES = {analysis:'Data Analysis', recognition:'Recognition', phrases:'My Phrases', contacts:'Caregiver Contacts', settings:'Settings', history:'Phrase History'};
const IC = {
  home:'<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  wave:'<path d="M2 10v3M6 6v11M10 3v18M14 8v7M18 5v13M22 10v3"/>',
  msg:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M7 8h10M7 12h6"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  chart:'<path d="M3 3v18h18"/><path d="M7 15v3M11 10v8M15 13v5M19 6v12"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  sliders:'<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  edit:'<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  trash:'<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  send:'<path d="m22 2-7 20-4-9-9-4zM22 2 11 13"/>'
};
const ic = (n, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch(e){ return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} };

/* ---------- state ---------- */
const DEF_S = {vol:93, th:76, auto:true, rep:10, low:24, aLow:true, aDisc:true, aFail:true, font:'Default', theme:'Dark', hc:false, rm:false};
const DEF_PH = ['Help me','Call an ambulance','I need a doctor'].map((text, i) => ({id:i+1, text, lang:'en', emg:true, cal:false}));
let lang = 'en'; try { lang = localStorage.getItem('vx-lang') || 'en'; } catch(e){}
let history = load('vx-history', []), phrases = load('vx-phrases', DEF_PH), contacts = load('vx-contacts', []);
let S = Object.assign({}, DEF_S, load('vx-settings', {}));
let status = 'off', pred = null, lastSent = null, timers = [];
const ui = {tab:'emg', q:''}, stats = {decoded:0, sent:0, sum:0};
const t = k => T[lang][k];
const ph = id => phrases.find(p => p.id === id);
const nextId = () => Math.max(0, ...phrases.map(p => p.id)) + 1;

/* ---------- helpers ---------- */
function speak(text, lg = lang){
  if(!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.lang = VOICE[lg] || 'en-IN'; u.volume = S.vol / 100;
  speechSynthesis.speak(u);
}
function logHist(text, lg){ history.unshift({text, lang:lg, at:Date.now()}); history = history.slice(0, 100); save('vx-history', history); }
function sendPhrase(p){ lastSent = p; logHist(p.text, p.lang); speak(p.text, p.lang); stats.sent++; }
function applyPrefs(){
  const d = document.documentElement;
  d.style.fontSize = {'Default':'16px','Large':'18px','Extra large':'20px'}[S.font] || '16px';
  d.dataset.theme = String(S.theme).toLowerCase();
  d.classList.toggle('hc', !!S.hc); d.classList.toggle('rm', !!S.rm);
}
function openForm(title, fields, done){
  const f = $('dlgForm');
  f.innerHTML = `<h3>${title}</h3>` + fields.map(x =>
    x.type === 'select' ? `<label>${x.l}<select name="${x.k}">${x.o.map(([v, n]) => `<option value="${v}" ${v === x.v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`
    : x.type === 'checkbox' ? `<label class="sw"><input type="checkbox" name="${x.k}" ${x.v ? 'checked' : ''}>${x.l}</label>`
    : `<label>${x.l}<input name="${x.k}" type="${x.type || 'text'}" value="${esc(x.v)}" ${x.req ? 'required' : ''}></label>`).join('')
    + `<div class="rw"><button type="button" class="btn out grow" id="dc">Cancel</button><button class="btn grow">Save</button></div>`;
  $('dc').onclick = () => $('dlg').close();
  f.onsubmit = e => {
    e.preventDefault(); const d = new FormData(f), o = {};
    fields.forEach(x => o[x.k] = x.type === 'checkbox' ? d.has(x.k) : d.get(x.k));
    done(o); $('dlg').close();
  };
  $('dlg').showModal();
}

/* ---------- render ---------- */
function render(soft){
  applyPrefs();
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-t]').forEach(el => el.textContent = t(el.dataset.t));
  document.querySelectorAll('#langs button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === lang));
  const on = status === 'on', page = location.hash.slice(1) || 'home';
  $('pill').className = 'pill ' + (on ? 'on' : status === 'busy' ? 'busy' : '');
  $('pillText').textContent = on ? t('conn') : status === 'busy' ? t('connecting') : t('disc');
  $('title').textContent = TITLES[page] || '';
  $('view-home').classList.toggle('on', on);
  $('banner').hidden = on || status === 'busy';
  $('el').textContent = on ? t('attached') : t('detached');
  $('elStat').className = $('sigStat').className = 'stat ' + (on ? 'good' : 'bad');
  if(!on) $('sig').textContent = '—';
  if(pred && !ph(pred.id)) pred = null;
  const ro = $('readout');
  ro.classList.toggle('idle', !pred);
  ro.textContent = pred ? ph(pred.id).text : (on ? t('listening') : t('idle'));
  $('conf').textContent = pred ? t('confidence') + ': ' + pred.conf + '%' : '';
  $('confirm').disabled = !pred; $('repeat').disabled = !lastSent;
  $('emRow').innerHTML = '';
  phrases.filter(p => p.emg).forEach(p => { const b = document.createElement('button'); b.textContent = p.text; b.onclick = () => emergency(p); $('emRow').appendChild(b); });
  $('list').innerHTML = history.slice(0, 5).map(h => `<li><div>${esc(h.text)}<time>${new Date(h.at).toLocaleString()}</time></div><button class="play" data-say="${esc(h.text)}" data-lg="${h.lang || 'en'}">▶</button></li>`).join('');
  $('empty').textContent = t('none'); $('empty').style.display = history.length ? 'none' : 'block';
  $('nav').innerHTML = PAGES.map((p, n) => `<a href="#${p}" ${page === p ? 'aria-current="page"' : ''}>${ic(NAVI[n])}<span>${T[lang].nav[n]}</span></a>`).join('');
  document.querySelector('main').classList.toggle('wide', page === 'analysis');
  $('fab').hidden = !['phrases', 'contacts'].includes(page);
  $('view-home').style.display = page === 'home' ? 'flex' : 'none';
  $('view-page').style.display = page === 'home' ? 'none' : 'flex';
  if(page !== 'home' && !soft) renderPage(page);
}

/* ---------- collar simulation ---------- */
const wave = $('wave');
for(let i = 0; i < 24; i++) wave.appendChild(document.createElement('i'));
function makePred(id, conf){
  const others = phrases.filter(p => p.id !== id).sort(() => Math.random() - .5).slice(0, 2);
  return { id, conf, alts: others.map((p, n) => ({ id: p.id, conf: Math.max(5, conf - 15 - n*12 - Math.round(Math.random()*8)) })) };
}
function tick(){
  if(!phrases.length) return;
  const c = 55 + Math.round(Math.random()*43), p = phrases[Math.floor(Math.random()*phrases.length)];
  stats.decoded++; stats.sum += c;
  if(S.auto && c >= S.th){ sendPhrase(p); pred = null; } else pred = makePred(p.id, c);
  render(true); updateRecog();
}
function connect(){
  if(status !== 'off') return;
  status = 'busy'; render();
  setTimeout(() => {
    status = 'on'; render();
    timers.push(setInterval(() => {
      $('sig').textContent = (82 + Math.round(Math.random()*14)) + '%';
      wave.childNodes.forEach(b => b.style.height = (6 + Math.random()*38) + 'px');
      document.querySelectorAll('.ch i').forEach(b => b.style.width = (30 + Math.random()*65) + '%');
    }, 140));
    timers.push(setInterval(tick, 4500));
  }, 1200);
}
function disconnect(){
  timers.forEach(clearInterval); timers = []; status = 'off'; pred = null;
  wave.childNodes.forEach(b => b.style.height = '6px'); render();
}
function updateRecog(){
  if(!$('rc-text')) return;
  $('rc-state').textContent = t('conn');
  $('rc-text').textContent = pred && ph(pred.id) ? ph(pred.id).text : t('listening');
  $('rc-alts').innerHTML = pred ? pred.alts.filter(a => ph(a.id)).map(a => `<li><span>${esc(ph(a.id).text)} <small>${a.conf}%</small></span><button class="play" data-a="alt" data-n="${a.id}" data-c="${a.conf}">Use</button></li>`).join('') : '';
  $('rc-stats').textContent = `Decoded: ${stats.decoded}. Sent: ${stats.sent}. Average confidence: ${stats.decoded ? Math.round(stats.sum / stats.decoded) : 0}%.`;
}
function emergency(p){
  $('ovPhrase').textContent = p.text;
  $('ovContacts').innerHTML = contacts.filter(c => c.emg).map(c => `<a href="tel:${c.phone.replace(/[^\d+]/g, '')}">${esc(c.name)}</a>`).join('');
  $('overlay').classList.add('open'); speak(p.text, p.lang); $('ovClose').focus();
}

/* ---------- pages ---------- */
const pg = $('view-page');
const sec = (title, body) => `<section class="card"><h4>${title}</h4>${body}</section>`;
const rng = (id, l, min, max, v) => `<div class="fld"><div class="rw"><span>${l}</span><output id="s-${id}-v">${v}%</output></div><input type="range" id="s-${id}" min="${min}" max="${max}" value="${v}"></div>`;
const chk = (id, l, v) => `<label class="fld row"><span>${l}</span><input type="checkbox" id="s-${id}" ${v ? 'checked' : ''}></label>`;
const sel = (id, l, opts, v) => `<div class="fld"><span>${l}</span><select id="s-${id}">${opts.map(([o, n]) => `<option value="${o}" ${String(o) === String(v) ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`;

function drawPhrases(){
  const q = ui.q.toLowerCase();
  const rows = phrases.filter(p => (ui.tab === 'all' || p.emg) && p.text.toLowerCase().includes(q));
  $('p-list').innerHTML = rows.map(p => `<div class="item"><div><div class="t">${esc(p.text)}</div><div class="chips"><span class="chip">${LN[p.lang] || p.lang}</span>${p.emg ? '<span class="chip emg">Emergency</span>' : ''}<span class="chip ${p.cal ? 'ok' : 'warn'}">${p.cal ? 'Calibrated' : 'Not calibrated'}</span></div></div>
    <div class="rw"><button class="ib tl" data-a="cal" data-n="${p.id}" aria-label="Calibrate">${ic('sliders')}</button><button class="ib" data-a="pedit" data-n="${p.id}" aria-label="Edit">${ic('edit')}</button><button class="ib red" data-a="pdel" data-n="${p.id}" aria-label="Delete">${ic('trash')}</button></div></div>`).join('') || '<p class="empty">No phrases found.</p>';
}
function drawHist(q = ''){
  const rows = history.map((h, n) => ({h, n})).filter(r => r.h.text.toLowerCase().includes(q.toLowerCase()));
  $('h-list').innerHTML = rows.map(r => `<li><div>${esc(r.h.text)}<time>${new Date(r.h.at).toLocaleString()}</time></div><span class="rw"><button class="play" data-a="hsay" data-n="${r.n}">▶</button><button class="play" data-a="hdel" data-n="${r.n}">✕</button></span></li>`).join('') || `<p class="empty">${t('none')}</p>`;
}
function renderPage(p){
  let h = '';
  if(p === 'recognition'){
    h = status === 'on'
      ? `<div class="card"><div class="rw"><b id="rc-state"></b><button class="btn out" data-a="toggle">Stop decoding</button></div><div class="readout" id="rc-text"></div><ul class="list" id="rc-alts"></ul></div>
         <div class="card"><b>Electrode channels</b>${[1,2,3,4].map(n => `<div class="ch"><span>CH${n}</span><div class="bar"><i></i></div></div>`).join('')}</div><div class="card" id="rc-stats"></div>`
      : `<div class="card mid"><h2>No sensor signal</h2><p class="mut">Check that the collar sits snugly against the neck and that the sensors are clean.</p></div><button class="btn out" data-a="toggle">Connect collar (demo)</button>`;
  } else if(p === 'phrases'){
    h = `<div class="seg"><button data-a="tab" data-v="emg" class="${ui.tab === 'emg' ? 'on' : ''}">Emergency Phrases</button><button data-a="tab" data-v="all" class="${ui.tab === 'all' ? 'on' : ''}">All Phrases</button></div>
      <div class="search">${ic('search')}<input id="p-q" placeholder="Search phrases" aria-label="Search phrases" value="${esc(ui.q)}"></div><div class="col" id="p-list"></div>`;
  } else if(p === 'contacts'){
    h = contacts.map((c, n) => `<article class="card"><div class="rw"><b style="font-size:22px">${esc(c.name)}</b>${c.primary ? '<span class="chip pri">Primary</span>' : ''}</div>
      <p class="mut">${esc(c.rel)}</p><div class="mono">${esc(c.phone)}</div>
      <div class="chips">${c.emg ? '<span class="chip">Emergency</span>' : ''}${c.low ? '<span class="chip">Low Battery</span>' : ''}${c.disc ? '<span class="chip">Disconnection</span>' : ''}</div>
      <div class="rw"><button class="btn out grow" data-a="ctest" data-n="${n}">${ic('send', 18)} Send Test Alert</button><button class="ib sq" data-a="cedit" data-n="${n}" aria-label="Edit">${ic('edit', 20)}</button><button class="ib sq red" data-a="cdel" data-n="${n}" aria-label="Delete">${ic('trash', 20)}</button></div></article>`).join('')
      || '<p class="empty">No caregiver contacts yet. Tap + to add one. Contacts with emergency alerts appear on the emergency screen.</p>';
  } else if(p === 'settings'){
    h = sec('Device', `<div class="rw"><b>VocalisX-Pro</b><button class="link" data-a="toggle" style="font-size:12px">Pair New Device</button></div>${rng('vol', 'Speaker volume', 0, 100, S.vol)}`)
      + sec('Recognition', `${rng('th', 'Confidence threshold', 50, 99, S.th)}${chk('auto', 'Auto-send above threshold', S.auto)}${sel('rep', 'Repeat interval', [5, 10, 15, 30].map(v => [v, v + ' seconds']), S.rep)}`)
      + sec('Notifications', `${rng('low', 'Low battery threshold', 5, 50, S.low)}${chk('aLow', 'Low battery alerts', S.aLow)}${chk('aDisc', 'Disconnection alerts', S.aDisc)}${chk('aFail', 'Recognition failure alerts', S.aFail)}`)
      + sec('Language & Accessibility', `${sel('lang', 'Default output language', Object.entries(LN), lang)}${sel('font', 'Font size', ['Default', 'Large', 'Extra large'].map(v => [v, v]), S.font)}${sel('theme', 'Theme', [['Dark', 'Dark'], ['Light', 'Light']], S.theme)}${chk('hc', 'High contrast mode', S.hc)}${chk('rm', 'Reduced motion', S.rm)}`)
      + sec('Privacy & Data', `<button class="btn out" data-a="export">Export My Data</button><button class="btn danger" data-a="wipe">Delete All My Data</button>`)
      + sec('Account', `<div class="rw"><span></span><button class="link" data-a="acct" style="font-size:12px">Edit</button></div><button class="btn danger" data-a="acct">Sign Out</button><div class="ver">VocalisX v1.0.0</div>`);
  } else if(p === 'history'){
    h = `<div class="search">${ic('search')}<input id="h-q" type="search" placeholder="Search phrases" aria-label="Search phrases"></div><ul class="list" id="h-list"></ul><button class="btn out" data-a="clearh">Clear all</button>`;
  }
  pg.innerHTML = h;
  if(p === 'analysis') return renderAnalysis(pg);
  if(p === 'phrases') drawPhrases();
  if(p === 'history') drawHist();
  if(p === 'recognition') updateRecog();
}

/* ---------- forms ---------- */
function phraseForm(p){
  openForm(p ? 'Edit phrase' : 'Add phrase', [
    {k:'text', l:'Phrase', v:p?.text, req:1},
    {k:'lang', l:'Language', type:'select', v:p?.lang || lang, o:Object.entries(LN)},
    {k:'emg', l:'Emergency phrase', type:'checkbox', v:p ? p.emg : ui.tab === 'emg'}],
  o => {
    const d = {text:o.text.trim(), lang:o.lang, emg:o.emg};
    if(p) Object.assign(p, d); else phrases.push({id:nextId(), ...d, cal:false});
    save('vx-phrases', phrases); render();
  });
}
function contactForm(c){
  openForm(c ? 'Edit contact' : 'Add contact', [
    {k:'name', l:'Name', v:c?.name, req:1}, {k:'rel', l:'Relationship', v:c?.rel},
    {k:'phone', l:'Phone number', type:'tel', v:c?.phone, req:1},
    {k:'emg', l:'Emergency alerts', type:'checkbox', v:c ? c.emg : true},
    {k:'low', l:'Low battery alerts', type:'checkbox', v:c ? c.low : true},
    {k:'disc', l:'Disconnection alerts', type:'checkbox', v:c ? c.disc : true},
    {k:'primary', l:'Primary contact', type:'checkbox', v:c ? c.primary : !contacts.length}],
  o => {
    const d = {name:o.name.trim(), rel:o.rel.trim(), phone:o.phone.trim(), emg:o.emg, low:o.low, disc:o.disc, primary:o.primary};
    if(d.primary) contacts.forEach(x => x.primary = false);
    if(c) Object.assign(c, d); else contacts.push(d);
    if(!contacts.some(x => x.primary)) contacts[0].primary = true;
    save('vx-contacts', contacts); render();
  });
}

/* ---------- events ---------- */
document.body.addEventListener('click', e => {
  const say = e.target.closest('[data-say]');
  if(say) return speak(say.dataset.say, say.dataset.lg);
  const b = e.target.closest('[data-a]'); if(!b) return;
  const a = b.dataset.a, n = +b.dataset.n;
  if(a === 'tab'){ ui.tab = b.dataset.v; renderPage('phrases'); }
  else if(a === 'cal'){ const p = ph(n); p.cal = !p.cal; save('vx-phrases', phrases); drawPhrases(); }
  else if(a === 'pedit') phraseForm(ph(n));
  else if(a === 'pdel'){ phrases = phrases.filter(p => p.id !== n); save('vx-phrases', phrases); render(); }
  else if(a === 'ctest'){ const c = contacts[n]; location.href = 'sms:' + c.phone.replace(/[^\d+]/g, '') + '?body=' + encodeURIComponent('VocalisX test alert: this is a test message.'); }
  else if(a === 'cedit') contactForm(contacts[n]);
  else if(a === 'cdel'){ contacts.splice(n, 1); if(contacts.length && !contacts.some(x => x.primary)) contacts[0].primary = true; save('vx-contacts', contacts); render(); }
  else if(a === 'hsay') speak(history[n].text, history[n].lang);
  else if(a === 'hdel'){ history.splice(n, 1); save('vx-history', history); drawHist($('h-q').value); }
  else if(a === 'clearh'){ history = []; save('vx-history', history); render(); }
  else if(a === 'toggle') status === 'on' ? disconnect() : connect();
  else if(a === 'alt'){ pred = makePred(n, +b.dataset.c); render(true); updateRecog(); }
  else if(a === 'export'){
    const url = URL.createObjectURL(new Blob([JSON.stringify({history, phrases, contacts, settings:S}, null, 2)], {type:'application/json'}));
    const l = document.createElement('a'); l.href = url; l.download = 'vocalisx-data.json'; l.click(); URL.revokeObjectURL(url);
  }
  else if(a === 'wipe' && confirm('Delete all phrases, contacts, history and settings from this browser?')){
    try { localStorage.clear(); } catch(err){}
    history = []; phrases = JSON.parse(JSON.stringify(DEF_PH)); contacts = []; S = Object.assign({}, DEF_S); lang = 'en'; render();
  }
  else if(a === 'acct') alert('There is no account in this offline demo. Connect a backend (for example Supabase) to add sign-in.');
});
pg.addEventListener('input', e => {
  const id = e.target.id;
  if(id === 'p-q'){ ui.q = e.target.value; return drawPhrases(); }
  if(id === 'h-q') return drawHist(e.target.value);
  if(!id.startsWith('s-')) return;
  const k = id.slice(2), el = e.target;
  if(k === 'lang'){ lang = el.value; try { localStorage.setItem('vx-lang', lang); } catch(err){} return render(); }
  S[k] = el.type === 'range' ? +el.value : el.type === 'checkbox' ? el.checked : (isNaN(el.value) ? el.value : +el.value);
  if(el.type === 'range') $(id + '-v').textContent = el.value + '%';
  save('vx-settings', S); applyPrefs();
});
$('fab').innerHTML = ic('plus', 28);
$('fab').onclick = () => (location.hash.slice(1) === 'contacts' ? contactForm() : phraseForm());
$('logo').innerHTML = ic('wave', 24);
$('reconnect').onclick = connect;
$('pill').onclick = () => status === 'on' ? disconnect() : connect();
$('confirm').onclick = () => { if(!pred || !ph(pred.id)) return; sendPhrase(ph(pred.id)); pred = null; render(); };
$('repeat').onclick = () => lastSent && speak(lastSent.text, lastSent.lang);
$('ovClose').onclick = () => { $('overlay').classList.remove('open'); if('speechSynthesis' in window) speechSynthesis.cancel(); };
$('viewAll').onclick = () => { location.hash = '#history'; };
$('addBtn').onclick = () => { $('addForm').hidden = !$('addForm').hidden; if(!$('addForm').hidden) $('addInput').focus(); };
$('addForm').onsubmit = e => {
  e.preventDefault(); const v = $('addInput').value.trim(); if(!v) return;
  lastSent = {text:v, lang}; logHist(v, lang); $('addInput').value = ''; render();
};
$('mic').onclick = () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return alert('Speech recognition is not supported in this browser.');
  const r = new SR(); r.lang = VOICE[lang]; r.onresult = ev => { $('addInput').value = ev.results[0][0].transcript; }; r.start();
};
document.querySelectorAll('#langs button').forEach(b => b.onclick = () => { lang = b.dataset.lang; try { localStorage.setItem('vx-lang', lang); } catch(err){} render(); });
window.addEventListener('hashchange', () => render());
render();
