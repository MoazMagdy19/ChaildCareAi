/* ChildCare AI — نموذج تجريبي (Frontend only)
   HTML + CSS + Vanilla JS | localStorage + بيانات تجريبية | لا يوجد ذكاء اصطناعي حقيقي */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     ثوابت
  --------------------------------------------------------- */
  const KEY = 'childcare-ai-v1';
  const DAY = 86400000;

  const DOMAINS = {
    comm:      { name: 'التواصل والكلام',    short: 'التواصل',  en: 'Communication',      icon: '🗣️', warn: 'يحتاج إلى متابعة',    ok: 'مؤشرات إيجابية في البيانات المسجلة' },
    social:    { name: 'التفاعل الاجتماعي',  short: 'التفاعل',  en: 'Social Interaction', icon: '🙂', warn: 'توجد بعض الملاحظات', ok: 'مؤشرات إيجابية' },
    attention: { name: 'التركيز والانتباه',  short: 'التركيز',  en: 'Attention',          icon: '🎯', warn: 'توجد بعض الملاحظات', ok: 'ضمن البيانات المسجلة' },
    motor:     { name: 'المهارات الحركية',   short: 'الحركة',   en: 'Motor Skills',       icon: '🧩', warn: 'توجد بعض الملاحظات', ok: 'ضمن البيانات المسجلة' },
    sensory:   { name: 'الاستجابة للمؤثرات', short: 'الاستجابة', en: 'Sensory Response',  icon: '👂', warn: 'يحتاج إلى متابعة',    ok: 'ضمن البيانات المسجلة' },
    play:      { name: 'اللعب والتفاعل',     short: 'اللعب',    en: 'Play & Engagement',  icon: '🎮', warn: 'توجد بعض الملاحظات', ok: 'مؤشرات إيجابية' }
  };

  const OBS_TYPES = [
    { name: 'التواصل',             domain: 'comm',      icon: '🗣️' },
    { name: 'التفاعل الاجتماعي',   domain: 'social',    icon: '🙂' },
    { name: 'التركيز',             domain: 'attention', icon: '🎯' },
    { name: 'الحركة',              domain: 'motor',     icon: '🧩' },
    { name: 'السلوك',              domain: 'play',      icon: '🎮' },
    { name: 'الاستجابة للأصوات',   domain: 'sensory',   icon: '🔊' },
    { name: 'الاستجابة للمؤثرات',  domain: 'sensory',   icon: '👂' }
  ];
  const ENVS = ['المنزل', 'المدرسة', 'جلسة علاج', 'مكان عام'];

  const NOTIFS = [
    { id: 'n1', ico: '🔔', text: 'حان موعد تسجيل المتابعة الأسبوعية.' },
    { id: 'n2', ico: '🔔', text: 'لم تتم إضافة ملاحظات جديدة منذ 5 أيام.' },
    { id: 'n3', ico: '🔔', text: 'تم تحديث تقرير الطفل.' }
  ];

  const PAGES = ['home', 'profile', 'observations', 'analysis', 'followup', 'report', 'specialist', 'camera', 'settings'];

  // كلمات بسيطة تستخدمها المحاكاة (ليست نموذج ذكاء اصطناعي حقيقي)
  const NEG_WORDS = ['لم يستجب', 'لا يستجيب', 'لم ينظر', 'لا ينظر', 'تشتت', 'شرود', 'انزعج', 'بمفرده', 'يبكي', 'رفض', 'صعوبة', 'تجنب', 'قلق'];
  const POS_WORDS = ['تفاعل', 'استجاب', 'ابتسم', 'نظر', 'شارك', 'جيد', 'قال', 'ردد', 'أمسك', 'قفز', 'ركض', 'رتب', 'أكمل', 'ضحك', 'استخدم', 'تبادل', 'أشار', 'بحماس'];

  /* ---------------------------------------------------------
     أدوات مساعدة
  --------------------------------------------------------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const LOCALE = 'ar-EG-u-nu-latn'; // أشهر عربية بأرقام لاتينية

  const fmtDate = ts => new Date(ts).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' });
  const fmtTime = ts => new Date(ts).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
  const pad = n => String(n).padStart(2, '0');
  const toDateInput = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const toLocalInput = d => toDateInput(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());

  function dayDiff(ts) {
    const a = new Date(ts); const b = new Date();
    a.setHours(0, 0, 0, 0); b.setHours(0, 0, 0, 0);
    return Math.round((b - a) / DAY);
  }
  function relLabel(ts) {
    const d = dayDiff(ts);
    if (d <= 0) return 'اليوم';
    if (d === 1) return 'أمس';
    if (d === 2) return 'منذ يومين';
    if (d <= 10) return 'منذ ' + d + ' أيام';
    return 'منذ ' + d + ' يومًا';
  }
  function ageText(birth) {
    if (!birth) return '—';
    const b = new Date(birth); const n = new Date();
    if (isNaN(b)) return '—';
    let y = n.getFullYear() - b.getFullYear();
    let m = n.getMonth() - b.getMonth();
    if (n.getDate() < b.getDate()) m--;
    if (m < 0) { y--; m += 12; }
    if (y < 0) return '—';
    if (y === 0) return m <= 0 ? 'أقل من شهر' : m === 1 ? 'شهر' : m === 2 ? 'شهران' : m + ' أشهر';
    if (y === 1) return 'سنة';
    if (y === 2) return 'سنتان';
    return y <= 10 ? y + ' سنوات' : y + ' سنة';
  }
  const typeInfo = name => OBS_TYPES.find(t => t.name === name) || OBS_TYPES[0];

  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 3000);
  }

  /* ---------------------------------------------------------
     الحالة + localStorage
  --------------------------------------------------------- */
  function seedState() {
    const now = Date.now();
    const mk = (type, text, env, ago, h, m) => {
      const d = new Date(); d.setDate(d.getDate() - ago); d.setHours(h, m, 0, 0);
      let t = d.getTime();
      if (t > now) t = now - 30 * 60000; // لا نريد وقتًا في المستقبل
      return { id: uid(), type, text, env, time: t };
    };
    const birth = new Date(); birth.setFullYear(birth.getFullYear() - 4); birth.setMonth(birth.getMonth() - 5);
    return {
      profile: { name: 'آدم محمد', birth: toDateInput(birth), notes: 'طفل نشيط ويحب الألعاب الملونة، ويفضّل الروتين اليومي الثابت.' },
      observations: [
        mk('التفاعل الاجتماعي',  'الطفل تفاعل مع والده عند مناداته.',                     'المنزل',      0, 17, 10),
        mk('التفاعل الاجتماعي',  'فضل اللعب بمفرده لمدة قصيرة.',                          'المنزل',      1, 16, 30),
        mk('السلوك',             'استجاب بشكل جيد للتعليمات البسيطة.',                    'المنزل',      3, 18, 5),
        mk('التواصل',            'لم يستجب عند مناداته باسمه أثناء انشغاله باللعب.',      'المدرسة',     2, 10, 20),
        mk('التواصل',            'قال كلمة «ماما» عند رؤية والدته.',                      'المنزل',      4, 15, 45),
        mk('التواصل',            'استخدم الإشارة للتعبير عما يريده.',                     'جلسة علاج',   5, 12, 0),
        mk('التواصل',            'لم ينظر إلى وجه من يكلمه.',                             'مكان عام',    6, 11, 15),
        mk('التفاعل الاجتماعي',  'ابتسم وشارك في لعبة جماعية قصيرة مع طفل آخر.',          'المدرسة',     7, 9, 40),
        mk('التفاعل الاجتماعي',  'تبادل الألعاب مع أخيه.',                                'المنزل',      9, 17, 0),
        mk('التفاعل الاجتماعي',  'ضحك أثناء اللعب مع والدته.',                            'المنزل',      10, 19, 20),
        mk('التركيز',            'تشتت انتباهه بسرعة أثناء النشاط المكتبي.',              'المدرسة',     8, 10, 50),
        mk('التركيز',            'شرود لحظي أثناء قراءة القصة.',                          'المنزل',      11, 20, 0),
        mk('التركيز',            'أكمل لعبة تركيب بسيطة حتى النهاية.',                    'جلسة علاج',   12, 13, 30),
        mk('الحركة',             'ركض وقفز بسهولة في الحديقة.',                           'مكان عام',    13, 16, 40),
        mk('الحركة',             'أمسك القلم ورسم خطوطًا.',                               'المدرسة',     14, 11, 0),
        mk('الحركة',             'رتب المكعبات فوق بعضها.',                               'جلسة علاج',   15, 12, 20),
        mk('الاستجابة للأصوات',  'انزعج من صوت المكنسة الكهربائية.',                      'المنزل',      16, 9, 30),
        mk('الاستجابة للمؤثرات', 'استجاب لضوء الألعاب الملونة بحماس.',                    'المنزل',      17, 18, 15)
      ],
      sessions: 6,
      lastEvalAt: now - 3 * DAY,
      lastFollowup: now - 6 * DAY,
      levels: { comm: 60, social: 72, attention: 55, motor: 80, sensory: 64, play: 70 },
      analysis: null,
      specialistNotes: [],
      clips: [],
      notifRead: {},
      perms: { guardian: true, share: false, camera: false }
    };
  }
  function emptyState() {
    const s = seedState();
    s.profile = { name: '', birth: '', notes: '' };
    s.observations = [];
    s.sessions = 0;
    s.lastEvalAt = null;
    s.lastFollowup = null;
    return s;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.profile && Array.isArray(s.observations) && s.perms) return s;
      }
    } catch (e) { /* تجاهل */ }
    return seedState();
  }
  let state = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* التخزين غير متاح */ }
  }
  save();

  const isComplete = () => !!(state.profile.name && state.profile.birth && state.profile.notes);

  /* ---------------------------------------------------------
     التنقل بين الصفحات
  --------------------------------------------------------- */
  let firstShow = true;
  function showPage(id) {
    if (PAGES.indexOf(id) === -1) id = 'home';
    $$('.page').forEach(p => { p.hidden = p.id !== 'page-' + id; });
    $$('.nav-link').forEach(a => {
      if (a.dataset.nav === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    closeMenu();
    renderPage(id);
    if (!firstShow) {
      window.scrollTo(0, 0);
      const h = $('#page-' + id + ' h1');
      if (h) h.focus({ preventScroll: true });
    }
    firstShow = false;
  }
  function go(id) {
    if (location.hash === '#' + id) showPage(id); else location.hash = id;
  }
  window.addEventListener('hashchange', () => showPage(location.hash.slice(1)));

  const sidebar = $('#sidebar'); const backdrop = $('#backdrop'); const menuBtn = $('#menuBtn');
  function openMenu() { sidebar.classList.add('open'); backdrop.hidden = false; menuBtn.setAttribute('aria-expanded', 'true'); }
  function closeMenu() { sidebar.classList.remove('open'); backdrop.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); }
  menuBtn.addEventListener('click', () => (sidebar.classList.contains('open') ? closeMenu() : openMenu()));
  backdrop.addEventListener('click', closeMenu);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-go]');
    if (b) go(b.dataset.go);
  });

  /* ---------------------------------------------------------
     الرئيسية
  --------------------------------------------------------- */
  function renderHome() {
    const p = state.profile;
    $('#dashName').textContent = p.name || 'لم يتم إنشاء الملف بعد';
    $('#dashAge').textContent = p.birth ? ageText(p.birth) : '—';
    const st = $('#dashStatus');
    if (isComplete()) { st.className = 'badge badge-good'; st.textContent = '🟢 ملف الطفل مكتمل'; }
    else { st.className = 'badge badge-warn'; st.textContent = '🟠 ملف الطفل غير مكتمل'; }

    const obs = state.observations;
    $('#statNotes').textContent = obs.length;
    $('#statSessions').textContent = state.sessions;
    $('#statLast').textContent = state.lastEvalAt ? relLabel(state.lastEvalAt) : 'لا يوجد';
    let level = 'لم يبدأ';
    if (obs.length) {
      const latest = Math.max.apply(null, obs.map(o => o.time));
      level = dayDiff(latest) <= 7 ? 'منتظم' : 'يحتاج إلى انتظام';
    }
    $('#statLevel').textContent = level;

    const steps = [
      ['👨‍👩‍👦', 'ولي الأمر يسجّل ملاحظات الطفل', obs.length > 0],
      ['🗂️', 'التطبيق ينظّم البيانات في سجل زمني', obs.length > 0],
      ['🤖', 'الذكاء الاصطناعي (محاكاة) يحلّل المعلومات المجمّعة', !!state.analysis],
      ['💡', 'التطبيق يقدّم مؤشرات أولية', !!state.analysis],
      ['🩺', 'المختص يراجع المعلومات ويضيف ملاحظاته', state.specialistNotes.length > 0],
      ['⚖️', 'المختص يتخذ القرار السريري الفعلي', 'final']
    ];
    $('#flowSteps').innerHTML = steps.map(s => {
      const cls = s[2] === 'final' ? 'final' : s[2] ? 'done' : '';
      const txt = s[2] === 'final' ? 'بيد المختص' : s[2] ? 'تم' : 'بانتظار';
      return '<li class="' + cls + '"><span class="f-ico" aria-hidden="true">' + s[0] + '</span><span>' + esc(s[1]) + '</span><span class="f-state">' + txt + '</span></li>';
    }).join('');
  }

  /* ---------------------------------------------------------
     ملف الطفل
  --------------------------------------------------------- */
  function devBarsHtml(keys, withEn) {
    return keys.map(k => {
      const d = DOMAINS[k]; const v = state.levels[k];
      return '<li class="dev-item"><div class="dev-top"><span><span aria-hidden="true">' + d.icon + '</span> ' + esc(d.name) +
        (withEn ? ' <small class="muted">· ' + d.en + '</small>' : '') + '</span><span class="dev-pct">' + v + '%</span></div>' +
        '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + v + '" aria-label="' + esc(d.name) + '"><span style="width:' + v + '%"></span></div></li>';
    }).join('');
  }

  function renderProfile() {
    const p = state.profile;
    $('#pfName').textContent = p.name || '—';
    $('#pfAge').textContent = ageText(p.birth);
    $('#pfBirth').textContent = p.birth ? fmtDate(p.birth + 'T00:00:00') : '—';
    $('#pfNotes').textContent = p.notes || '—';
    $('#devList').innerHTML = devBarsHtml(Object.keys(DOMAINS), false);
    // نملأ النموذج فقط إن لم يكن المستخدم يكتب فيه الآن
    if (document.activeElement && document.activeElement.closest && document.activeElement.closest('#profileForm')) return;
    $('#childName').value = p.name;
    $('#birthDate').value = p.birth;
    $('#generalNotes').value = p.notes;
  }

  $('#profileForm').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#childName').value.trim();
    const birth = $('#birthDate').value;
    const err = $('#profileError');
    $('#childName').removeAttribute('aria-invalid'); $('#birthDate').removeAttribute('aria-invalid');
    if (!name || !birth) {
      if (!name) $('#childName').setAttribute('aria-invalid', 'true');
      if (!birth) $('#birthDate').setAttribute('aria-invalid', 'true');
      err.textContent = 'من فضلك أدخل اسم الطفل وتاريخ الميلاد.'; err.hidden = false;
      return;
    }
    if (new Date(birth) > new Date()) {
      $('#birthDate').setAttribute('aria-invalid', 'true');
      err.textContent = 'تاريخ الميلاد لا يمكن أن يكون في المستقبل.'; err.hidden = false;
      return;
    }
    err.hidden = true;
    state.profile = { name, birth, notes: $('#generalNotes').value.trim() };
    save();
    document.activeElement.blur();
    renderAll();
    toast('✅ تم حفظ ملف الطفل');
  });

  /* ---------------------------------------------------------
     إضافة ملاحظة + السجل الزمني
  --------------------------------------------------------- */
  function fillSelects() {
    $('#obsType').innerHTML = '<option value="" disabled selected>اختر نوع الملاحظة</option>' +
      OBS_TYPES.map(t => '<option value="' + esc(t.name) + '">' + t.icon + ' ' + esc(t.name) + '</option>').join('');
    $('#obsEnv').innerHTML = '<option value="" disabled selected>اختر الموقف</option>' +
      ENVS.map(e => '<option value="' + esc(e) + '">' + esc(e) + '</option>').join('');
    $('#timelineFilter').innerHTML = '<option value="">كل الأنواع</option>' +
      OBS_TYPES.map(t => '<option value="' + esc(t.name) + '">' + esc(t.name) + '</option>').join('');
  }

  function resetObsTime() { $('#obsTime').value = toLocalInput(new Date()); }

  function renderTimeline() {
    const filter = $('#timelineFilter').value;
    const list = state.observations
      .filter(o => !filter || o.type === filter)
      .sort((a, b) => b.time - a.time);
    const el = $('#timeline');
    if (!list.length) {
      el.innerHTML = '<li class="empty">' + (state.observations.length ? 'لا توجد ملاحظات من هذا النوع.' : 'لا توجد ملاحظات بعد. ابدأ بإضافة أول ملاحظة من النموذج أعلاه.') + '</li>';
      return;
    }
    el.innerHTML = list.map(o => {
      const t = typeInfo(o.type);
      return '<li class="tl-item"><span class="tl-dot" aria-hidden="true">' + t.icon + '</span>' +
        '<div class="tl-head"><strong>📅 ' + relLabel(o.time) + '</strong><span class="tl-date">' + fmtDate(o.time) + ' · ' + fmtTime(o.time) + '</span></div>' +
        '<div class="tl-card"><div class="tl-meta"><span class="chip">' + esc(o.type) + '</span><span class="chip chip-env">📍 ' + esc(o.env) + '</span></div>' +
        '<p>“' + esc(o.text) + '”</p></div></li>';
    }).join('');
  }
  $('#timelineFilter').addEventListener('change', renderTimeline);

  $('#obsForm').addEventListener('submit', e => {
    e.preventDefault();
    const type = $('#obsType').value; const env = $('#obsEnv').value;
    const text = $('#obsText').value.trim(); const timeVal = $('#obsTime').value;
    const err = $('#obsError');
    ['#obsType', '#obsEnv', '#obsText', '#obsTime'].forEach(s => $(s).removeAttribute('aria-invalid'));
    const missing = [];
    if (!type) missing.push('#obsType');
    if (!text) missing.push('#obsText');
    if (!timeVal || isNaN(new Date(timeVal).getTime())) missing.push('#obsTime');
    if (!env) missing.push('#obsEnv');
    if (missing.length) {
      missing.forEach(s => $(s).setAttribute('aria-invalid', 'true'));
      err.textContent = 'من فضلك أكمل الحقول المطلوبة: نوع الملاحظة، الوصف، الوقت، والموقف.'; err.hidden = false;
      $(missing[0]).focus();
      return;
    }
    err.hidden = true;
    state.observations.push({ id: uid(), type, text, env, time: new Date(timeVal).getTime() });
    save();
    $('#obsText').value = ''; $('#obsType').value = ''; $('#obsEnv').value = '';
    resetObsTime();
    renderAll();
    toast('✅ تم حفظ الملاحظة (' + state.observations.length + ' ملاحظة)');
    $('#timeline').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ---------------------------------------------------------
     التحليل الذكي (محاكاة)
  --------------------------------------------------------- */
  function tone(text) {
    let t = text; let neg = 0; let pos = 0;
    NEG_WORDS.forEach(w => { if (t.indexOf(w) !== -1) { neg++; t = t.split(w).join(' '); } });
    POS_WORDS.forEach(w => { if (t.indexOf(w) !== -1) pos++; });
    return neg > pos ? 'neg' : pos > neg ? 'pos' : 'neutral';
  }

  function computeAnalysis() {
    const obs = state.observations;
    const stats = {};
    Object.keys(DOMAINS).forEach(k => { stats[k] = { total: 0, pos: 0, neg: 0 }; });
    obs.forEach(o => {
      const s = stats[typeInfo(o.type).domain];
      s.total++;
      const t = tone(o.text);
      if (t === 'pos') s.pos++; else if (t === 'neg') s.neg++;
    });

    const results = Object.keys(DOMAINS).map(k => {
      const d = DOMAINS[k]; const s = stats[k];
      let status = 'none'; let label = 'بيانات غير كافية بعد';
      if (s.total >= 3) {
        const toned = s.pos + s.neg;
        const ratio = toned ? s.neg / toned : 0;
        if (ratio >= 0.35) { status = 'warn'; label = d.warn; } else { status = 'ok'; label = d.ok; }
      }
      return { key: k, name: d.short, status, label, total: s.total };
    });

    const suggestions = [
      'قد يكون من المفيد تسجيل المزيد من الملاحظات في مواقف مختلفة.',
      'يمكن مناقشة هذه الملاحظات مع المختص.'
    ];
    const missingEnvs = ENVS.filter(e => !obs.some(o => o.env === e));
    if (missingEnvs.length && obs.length) suggestions.push('لم تُسجَّل ملاحظات في: ' + missingEnvs.join('، ') + ' — تسجيلها يعطي صورة أوضح.');
    const few = results.filter(r => r.status === 'none').map(r => r.name);
    if (few.length && obs.length) suggestions.push('عدد الملاحظات قليل في: ' + few.join('، ') + ' — يمكن توثيق أمثلة إضافية.');
    const warns = results.filter(r => r.status === 'warn').map(r => r.name);
    if (warns.length) suggestions.push('يمكن تجهيز أمثلة محددة من (' + warns.join('، ') + ') لعرضها على المختص.');
    suggestions.push('تذكير: هذه مؤشرات أولية فقط، والقرار السريري يعود إلى المختص.');

    return { at: Date.now(), total: obs.length, results, suggestions };
  }

  function insightsHtml(a) {
    return '<div class="insight-grid">' + a.results.map(r => {
      const dot = r.status === 'ok' ? '🟢' : r.status === 'warn' ? '🟡' : '⚪';
      return '<div class="insight ' + r.status + '"><span class="dot" aria-hidden="true">' + dot + '</span><div>' +
        '<strong>' + esc(r.name) + ':</strong><div>' + esc(r.label) + '</div>' +
        '<small>استنادًا إلى ' + r.total + ' ملاحظة</small></div></div>';
    }).join('') + '</div>';
  }

  function renderAnalysis() {
    const a = state.analysis;
    const box = $('#analysisResult');
    if (!a) { box.hidden = true; return; }
    box.hidden = false;
    $('#analysisMeta').textContent = 'آخر تحليل: ' + relLabel(a.at) + ' — اعتمد على ' + a.total + ' ملاحظة. (نتائج محاكاة)';
    $('#analysisStale').hidden = a.total === state.observations.length;
    $('#insightGrid').innerHTML = insightsHtml(a);
    $('#suggestList').innerHTML = a.suggestions.map(s => '<li>💡 ' + esc(s) + '</li>').join('');
  }

  let analyzing = false;
  $('#analyzeBtn').addEventListener('click', () => {
    if (analyzing) return;
    if (!state.observations.length) { toast('أضف بعض الملاحظات أولًا ثم أعد المحاولة.'); return; }
    analyzing = true;
    const btn = $('#analyzeBtn');
    btn.disabled = true;
    $('#analysisResult').hidden = true;
    $('#analysisLoading').hidden = false;
    setTimeout(() => {
      state.analysis = computeAnalysis();
      state.lastEvalAt = Date.now();
      save();
      $('#analysisLoading').hidden = true;
      btn.disabled = false; analyzing = false;
      renderAll();
      $('#analysisResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast('✅ اكتمل التحليل التجريبي — مؤشرات أولية فقط');
    }, 2300);
  });

  /* ---------------------------------------------------------
     المتابعة + الإشعارات
  --------------------------------------------------------- */
  function renderFollowup() {
    const last = state.lastFollowup;
    $('#followLast').textContent = last ? 'آخر متابعة مسجّلة: ' + relLabel(last) : 'لا توجد متابعة مسجّلة بعد.';
    let next = 'سجّل أول متابعة لبدء الجدول الأسبوعي.';
    if (last) {
      const left = 7 - dayDiff(last);
      next = left <= 0 ? '🔔 حان موعد المتابعة الأسبوعية' : left === 1 ? 'موعد المتابعة القادمة: غدًا' : 'موعد المتابعة القادمة: بعد ' + left + ' أيام';
    }
    $('#followNext').textContent = next;

    $('#notifList').innerHTML = NOTIFS.map(n => {
      const unread = !state.notifRead[n.id];
      return '<li class="' + (unread ? 'unread' : '') + '"><span class="n-ico" aria-hidden="true">' + n.ico + '</span>' +
        '<span>' + esc(n.text) + '<span class="n-time">إشعار تجريبي</span></span>' +
        (unread ? '<button class="btn btn-ghost btn-sm" type="button" data-read="' + n.id + '">تعليم كمقروء</button>' : '') + '</li>';
    }).join('');
    updateBadge();
  }
  function updateBadge() {
    const c = NOTIFS.filter(n => !state.notifRead[n.id]).length;
    const b = $('#notifBadge');
    b.hidden = c === 0; b.textContent = c;
    b.setAttribute('aria-label', c + ' إشعارات جديدة');
  }
  $('#notifList').addEventListener('click', e => {
    const b = e.target.closest('[data-read]');
    if (!b) return;
    state.notifRead[b.dataset.read] = true; save(); renderFollowup();
  });
  $('#markAllRead').addEventListener('click', () => {
    NOTIFS.forEach(n => { state.notifRead[n.id] = true; }); save(); renderFollowup();
  });
  $('#logFollowup').addEventListener('click', () => {
    state.lastFollowup = Date.now(); save(); renderAll(); toast('✅ تم تسجيل المتابعة الأسبوعية');
  });

  /* ---------------------------------------------------------
     التقرير
  --------------------------------------------------------- */
  const REPORT_KEYS = ['comm', 'social', 'attention', 'motor', 'sensory'];
  const CHART_COLORS = ['#1f7a8c', '#4fb3a3', '#f5a84b', '#8e7cc3', '#5b9bd5'];

  function chartSvg() {
    const W = 500; const H = 260; const base = 210; const top = 34; const slot = W / REPORT_KEYS.length;
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="رسم بياني لمستويات النمو الوصفية">';
    s += '<line x1="10" y1="' + base + '" x2="' + (W - 10) + '" y2="' + base + '" stroke="#c9dbe3" stroke-width="2"/>';
    REPORT_KEYS.forEach((k, i) => {
      const v = state.levels[k]; const h = (base - top) * v / 100;
      const cx = W - slot * (i + 0.5); const y = base - h;
      s += '<rect x="' + (cx - 24) + '" y="' + y + '" width="48" height="' + h + '" rx="10" fill="' + CHART_COLORS[i] + '"/>';
      s += '<text x="' + cx + '" y="' + (y - 8) + '" text-anchor="middle" font-size="16" font-weight="700" fill="#1b2a38">' + v + '%</text>';
      s += '<text x="' + cx + '" y="' + (base + 26) + '" text-anchor="middle" font-size="14" fill="#55687a">' + DOMAINS[k].short + '</text>';
    });
    return s + '</svg>';
  }

  function renderReport() {
    $('#rpName').textContent = state.profile.name || '—';
    $('#rpAge').textContent = ageText(state.profile.birth);
    $('#rpDate').textContent = fmtDate(Date.now());
    $('#reportBars').innerHTML = devBarsHtml(REPORT_KEYS, true);
    $('#reportChart').innerHTML = chartSvg();

    const counts = {};
    state.observations.forEach(o => { const k = typeInfo(o.type).domain; counts[k] = (counts[k] || 0) + 1; });
    $('#reportCounts').innerHTML = '<span class="chip">إجمالي الملاحظات: ' + state.observations.length + '</span>' +
      Object.keys(DOMAINS).map(k => '<span class="chip">' + DOMAINS[k].icon + ' ' + esc(DOMAINS[k].short) + ': ' + (counts[k] || 0) + '</span>').join('');

    const a = state.analysis;
    $('#reportAnalysis').innerHTML = a
      ? insightsHtml(a) + '<p class="muted">آخر تحليل: ' + relLabel(a.at) + ' (محاكاة).</p>'
      : 'لم يتم إجراء تحليل بعد. يمكنك تشغيله من صفحة «التحليل».';
  }
  $('#printBtn').addEventListener('click', () => window.print());

  /* ---------------------------------------------------------
     عرض المختص
  --------------------------------------------------------- */
  function renderSpecialist() {
    const shared = state.perms.share;
    $('#specialistLock').hidden = shared;
    $('#specialistContent').hidden = !shared;
    if (!shared) return;

    const p = state.profile;
    $('#spChild').innerHTML =
      '<div><b>اسم الطفل</b>' + esc(p.name || '—') + '</div>' +
      '<div><b>العمر</b>' + esc(ageText(p.birth)) + '</div>' +
      '<div><b>تاريخ الميلاد</b>' + (p.birth ? esc(fmtDate(p.birth + 'T00:00:00')) : '—') + '</div>' +
      '<div><b>ملاحظات عامة</b>' + esc(p.notes || '—') + '</div>';

    const recent = state.observations.slice().sort((a, b) => b.time - a.time).slice(0, 5);
    $('#spObs').innerHTML = recent.length ? recent.map(o =>
      '<li><div class="meta"><strong>📅 ' + relLabel(o.time) + '</strong><span class="chip">' + esc(o.type) + '</span><span class="chip chip-env">📍 ' + esc(o.env) + '</span></div>' +
      '<div>“' + esc(o.text) + '”</div></li>').join('') : '<li class="empty">لا توجد ملاحظات بعد.</li>';

    const a = state.analysis;
    $('#spInsights').innerHTML = a
      ? '<p class="muted">نتائج محاكاة — ' + relLabel(a.at) + '</p>' + insightsHtml(a) + '<p class="disclaimer-box">مؤشرات أولية لا تمثل تشخيصًا طبيًا.</p>'
      : '<p class="empty">لم يتم تشغيل التحليل بعد.</p><div class="btn-row"><button class="btn btn-ghost" type="button" data-go="analysis">🤖 الانتقال إلى التحليل</button></div>';

    $('#spClips').innerHTML = state.clips.length ? state.clips.slice().reverse().map(c =>
      '<li><strong>🎥 مقطع تجريبي</strong> — ' + relLabel(c.at) + ' ' + fmtTime(c.at) + ' · المدة ' + durText(c.seconds) + ' <span class="chip">بانتظار مراجعة المختص</span></li>').join('')
      : '<li class="empty">لا توجد مقاطع مسجلة.</li>';

    renderSpecialistNotes();
  }
  function renderSpecialistNotes() {
    $('#spNotesList').innerHTML = state.specialistNotes.length ? state.specialistNotes.slice().reverse().map(n =>
      '<li><div class="meta"><strong>🩺 ملاحظة المختص</strong><span class="tl-date">' + fmtDate(n.at) + ' · ' + fmtTime(n.at) + '</span></div><div>' + esc(n.text) + '</div></li>').join('') : '';
  }
  $('#spEnableShare').addEventListener('click', () => {
    state.perms.share = true; save(); renderAll(); toast('✅ تم تفعيل المشاركة مع المختص');
  });
  $('#spForm').addEventListener('submit', e => {
    e.preventDefault();
    const text = $('#spNote').value.trim(); const err = $('#spError');
    if (!text) { err.textContent = 'اكتب ملاحظة المختص أولًا.'; err.hidden = false; $('#spNote').setAttribute('aria-invalid', 'true'); return; }
    err.hidden = true; $('#spNote').removeAttribute('aria-invalid');
    state.specialistNotes.push({ id: uid(), text, at: Date.now() });
    save(); $('#spNote').value = '';
    renderAll(); toast('✅ تم حفظ ملاحظات المختص');
  });

  /* ---------------------------------------------------------
     الكاميرا (محاكاة فقط)
  --------------------------------------------------------- */
  const durText = s => pad(Math.floor(s / 60)) + ':' + pad(s % 60);
  let camTimer = null; let camSeconds = 0; let camState = 'idle'; // idle | live | busy

  function renderClips() {
    $('#clipList').innerHTML = state.clips.length ? state.clips.slice().reverse().map(c =>
      '<li><strong>🎥 مقطع تجريبي</strong> — ' + relLabel(c.at) + ' ' + fmtTime(c.at) + ' · المدة ' + durText(c.seconds) + '</li>').join('')
      : '<li class="empty">لا توجد مقاطع محفوظة بعد.</li>';
  }
  function setCamUi(s) {
    camState = s;
    $('#camIdle').hidden = s !== 'idle';
    $('#camLive').hidden = s !== 'live';
    $('#camBusy').hidden = s !== 'busy';
    $('#camStart').disabled = s !== 'idle';
    $('#camAnalyze').disabled = s !== 'live';
  }
  function startCam() {
    if (camState !== 'idle') return;
    if (!state.perms.camera) { $('#camPerm').hidden = false; $('#camEnable').focus(); return; }
    $('#camPerm').hidden = true; $('#camResult').hidden = true;
    camSeconds = 0; $('#camTimer').textContent = durText(0);
    setCamUi('live');
    clearInterval(camTimer);
    camTimer = setInterval(() => { camSeconds++; $('#camTimer').textContent = durText(camSeconds); }, 1000);
  }
  $('#camStart').addEventListener('click', startCam);
  $('#camEnable').addEventListener('click', () => {
    state.perms.camera = true; save(); renderSettings(); $('#camPerm').hidden = true; startCam();
  });
  $('#camAnalyze').addEventListener('click', () => {
    if (camState !== 'live') return;
    clearInterval(camTimer);
    setCamUi('busy');
    setTimeout(() => {
      state.clips.push({ id: uid(), at: Date.now(), seconds: camSeconds });
      save();
      setCamUi('idle');
      $('#camResult').hidden = false;
      renderClips();
      toast('✅ تم تسجيل المقطع بنجاح');
    }, 1500);
  });

  /* ---------------------------------------------------------
     الإعدادات / الخصوصية
  --------------------------------------------------------- */
  function renderSettings() {
    $('#permGuardian').checked = !!state.perms.guardian;
    $('#permShare').checked = !!state.perms.share;
    $('#permCamera').checked = !!state.perms.camera;
  }
  [['#permGuardian', 'guardian'], ['#permShare', 'share'], ['#permCamera', 'camera']].forEach(pair => {
    $(pair[0]).addEventListener('change', e => {
      state.perms[pair[1]] = e.target.checked; save();
      toast(e.target.checked ? '✅ تم تفعيل الصلاحية' : 'تم إيقاف الصلاحية');
    });
  });
  $('#resetDemo').addEventListener('click', () => {
    if (!confirm('سيتم استبدال البيانات الحالية بالبيانات التجريبية. هل تريد المتابعة؟')) return;
    state = seedState(); save(); renderAll(); toast('↩️ تمت استعادة البيانات التجريبية');
  });
  $('#resetEmpty').addEventListener('click', () => {
    if (!confirm('سيتم حذف البيانات الحالية والبدء بملف فارغ. هل تريد المتابعة؟')) return;
    state = emptyState(); save(); renderAll(); go('profile'); toast('🆕 ملف فارغ — ابدأ بإنشاء ملف الطفل');
  });

  /* ---------------------------------------------------------
     عرض الصفحات
  --------------------------------------------------------- */
  function renderChip() { $('#chipName').textContent = state.profile.name || 'ملف جديد'; }

  function renderPage(id) {
    switch (id) {
      case 'home': renderHome(); break;
      case 'profile': renderProfile(); break;
      case 'observations': renderTimeline(); if (!$('#obsTime').value) resetObsTime(); break;
      case 'analysis': renderAnalysis(); break;
      case 'followup': renderFollowup(); break;
      case 'report': renderReport(); break;
      case 'specialist': renderSpecialist(); break;
      case 'camera': renderClips(); break;
      case 'settings': renderSettings(); break;
    }
  }
  function renderAll() {
    renderChip();
    renderHome(); renderProfile(); renderTimeline(); renderAnalysis(); renderFollowup();
    renderReport(); renderSpecialist(); renderClips(); renderSettings();
  }

  /* ---------------------------------------------------------
     تشغيل
  --------------------------------------------------------- */
  fillSelects();
  resetObsTime();
  renderAll();
  showPage(location.hash.slice(1) || 'home');
})();
