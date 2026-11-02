/**
 * مسیر یادگیری سنجه‌های نسل ششم
 * پیشرفت مطالعه سمت مرورگر است و هیچ رکورد رسمی سنجه را تغییر نمی‌دهد.
 */

const LRN = {
  path: null,
  pathKey: '',
  pathPromise: null,
  pathError: null,
  view: 'catalog',
  measureId: null,
  lesson: null,
  lessonKey: '',
  lessonUserKey: '',
  lessonPromise: null,
  lessonError: null,
  stage: 0,
  filters: { q: '', axis: 'all', status: 'all', related: false, safety: false },
  searchTimer: null,
  noteTimer: null,
  reader: null,
  readerKeyHandler: null,
};

const LRN_STORE_PREFIX = 'learn_v6_progress_v1_';
const LRN_STAGE_LABELS = ['خواندن سنجه', 'گام‌های اجرایی', 'شرط احراز و تکمیل', 'جمع‌بندی و ثبت'];
const LRN_CONFIDENCE = ['انتخاب نشده', 'خیلی کم', 'کم', 'متوسط', 'خوب', 'مسلط'];

function lrnUserKey() {
  const u = (typeof S !== 'undefined' && S.user) || {};
  return [u.id || 'anon', u.role_code || '', u.department || ''].join('|');
}

function lrnStoreKey() {
  const u = (typeof S !== 'undefined' && S.user) || {};
  return LRN_STORE_PREFIX + (u.id || 'anon');
}

function lrnReadStore() {
  try {
    const raw = localStorage.getItem(lrnStoreKey());
    const data = raw ? JSON.parse(raw) : null;
    if (!data || typeof data !== 'object') return { measures: {} };
    if (!data.measures || typeof data.measures !== 'object') data.measures = {};
    return data;
  } catch (e) {
    return { measures: {} };
  }
}

function lrnWriteStore(store) {
  try {
    localStorage.setItem(lrnStoreKey(), JSON.stringify(store));
    return true;
  } catch (e) {
    if (typeof toast === 'function') toast('ذخیره‌سازی محلی ممکن نشد؛ حافظه مرورگر پر یا مسدود است.', true);
    return false;
  }
}

function lrnRecord(id, create) {
  const store = lrnReadStore();
  let rec = store.measures[id];
  if (!rec && create) {
    rec = {
      steps: {}, done_steps: {}, statement_read: false, extras_read: false,
      confidence: 0, note: '', visited_at: null, completed_at: null,
    };
    store.measures[id] = rec;
    lrnWriteStore(store);
  }
  if (!rec) return null;
  if (!rec.steps || typeof rec.steps !== 'object') rec.steps = {};
  if (!rec.done_steps || typeof rec.done_steps !== 'object') rec.done_steps = {};
  return rec;
}

function lrnSaveRecord(id, rec) {
  const store = lrnReadStore();
  store.measures[id] = rec;
  return lrnWriteStore(store);
}

function lrnTouch(id) {
  if (!id) return;
  const store = lrnReadStore();
  const rec = store.measures[id] || {
    steps: {}, done_steps: {}, statement_read: false, extras_read: false,
    confidence: 0, note: '', visited_at: null, completed_at: null,
  };
  if (!rec.visited_at) {
    rec.visited_at = new Date().toISOString();
    store.measures[id] = rec;
    lrnWriteStore(store);
  }
}

function lrnAllMeasures() {
  if (!LRN.path || !Array.isArray(LRN.path.chapters)) return [];
  const out = [];
  for (const ch of LRN.path.chapters) {
    for (const ax of (ch.axes || [])) {
      for (const std of (ax.standards || [])) {
        for (const m of (std.measures || [])) {
          out.push({ ...m, _chapter: ch, _axis: ax, _std: std });
        }
      }
    }
  }
  return out;
}

function lrnMeasureById(id) {
  return lrnAllMeasures().find(m => m.id === id) || null;
}

function lrnReadStepCount(m) {
  const total = Number(m.step_count) || 0;
  if (!total) return 0;
  const rec = lrnRecord(m.id, false);
  if (!rec) return 0;
  if (rec.completed_at) return total;
  let n = 0;
  for (let i = 1; i <= total; i++) if (rec.steps[String(i)]) n++;
  return n;
}

function lrnPctOf(m) {
  const total = Number(m.step_count) || 0;
  const rec = lrnRecord(m.id, false);
  if (rec && rec.completed_at) return 100;
  if (!total) return rec && rec.statement_read ? 100 : 0;
  return Math.round(lrnReadStepCount(m) * 100 / total);
}

function lrnStatusOf(m) {
  const rec = lrnRecord(m.id, false);
  if (rec && rec.completed_at) return 'done';
  if (!rec) return 'todo';
  if (rec.visited_at || rec.statement_read || Object.keys(rec.steps || {}).length) return 'doing';
  return 'todo';
}

function lrnStatusLabel(status) {
  if (status === 'done') return 'تکمیل‌شده';
  if (status === 'doing') return 'در حال یادگیری';
  return 'شروع نشده';
}

function lrnStats() {
  const all = lrnAllMeasures();
  let steps = 0;
  let readSteps = 0;
  let safety = 0;
  let related = 0;
  let completed = 0;
  let started = 0;
  for (const m of all) {
    const total = Number(m.step_count) || 0;
    steps += total;
    readSteps += lrnReadStepCount(m);
    if (m.safety) safety += 1;
    if ((m.unit_steps || 0) + (m.role_steps || 0) + (m.team_steps || 0) > 0) related += 1;
    const st = lrnStatusOf(m);
    if (st === 'done') completed += 1;
    if (st !== 'todo') started += 1;
  }
  const pct = steps ? Math.round(readSteps * 100 / steps) : (all.length ? Math.round(completed * 100 / all.length) : 0);
  return { total: all.length, steps, readSteps, safety, related, completed, started, pct };
}

function lrnRecommendation() {
  const all = lrnAllMeasures();
  if (!all.length) return null;
  const active = all.find(m => {
    const rec = lrnRecord(m.id, false);
    return rec && !rec.completed_at && (rec.visited_at || rec.statement_read || Object.keys(rec.steps || {}).length);
  });
  if (active) return active;
  const relatedTodo = all.find(m => {
    const rec = lrnRecord(m.id, false);
    return !(rec && rec.completed_at) && (m.unit_steps || m.role_steps || m.team_steps);
  });
  if (relatedTodo) return relatedTodo;
  const todo = all.find(m => {
    const rec = lrnRecord(m.id, false);
    return !(rec && rec.completed_at);
  });
  return todo || all[0];
}

function lrnFaDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) {
    return '';
  }
}

function lrnSourceLabel(source) {
  if (source === 'role') return 'محور سمت';
  if (source === 'head') return 'محور سرپرستاری';
  if (source === 'ward') return 'محور نوع بخش';
  if (source === 'role-extra') return 'محور آموزشی تخصصی';
  return 'دسترسی موردی';
}

function lrnNorm(value) {
  return String(value == null ? '' : value)
    .replace(/[۰-۹]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])
    .replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
    .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک')
    .replace(/[\u200c\u200e\u200f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function lrnMeasureRelated(m) {
  return (m.unit_steps || 0) + (m.role_steps || 0) + (m.team_steps || 0);
}

function lrnFilteredChapters() {
  if (!LRN.path) return [];
  const q = lrnNorm(LRN.filters.q);
  const axisFilter = LRN.filters.axis;
  const statusFilter = LRN.filters.status;
  const relatedOnly = LRN.filters.related;
  const safetyOnly = LRN.filters.safety;
  const out = [];
  for (const ch of (LRN.path.chapters || [])) {
    const chOut = { code: ch.code, title: ch.title, axes: [] };
    for (const ax of (ch.axes || [])) {
      if (axisFilter !== 'all' && ax.code !== axisFilter) continue;
      const axOut = { code: ax.code, title: ax.title, source: ax.source, standards: [] };
      for (const std of (ax.standards || [])) {
        const measures = (std.measures || []).filter(m => {
          if (statusFilter !== 'all' && lrnStatusOf(m) !== statusFilter) return false;
          if (relatedOnly && !lrnMeasureRelated(m)) return false;
          if (safetyOnly && !m.safety) return false;
          if (!q) return true;
          const hay = [m.code, m.statement, (m.owners || []).join(' '), std.title, ax.title].join(' ');
          return lrnNorm(hay).includes(q);
        });
        if (measures.length) axOut.standards.push({ code: std.code, title: std.title, measures });
      }
      if (axOut.standards.length) chOut.axes.push(axOut);
    }
    if (chOut.axes.length) out.push(chOut);
  }
  return out;
}

async function lrnEnsurePath() {
  const key = lrnUserKey();
  if (LRN.path && LRN.pathKey === key) return true;
  if (LRN.pathPromise) return LRN.pathPromise;
  LRN.pathPromise = (async () => {
    try {
      const data = await API.learningPath();
      if (lrnUserKey() !== key) return false;
      LRN.path = data;
      LRN.pathKey = key;
      LRN.pathError = null;
      return true;
    } catch (err) {
      LRN.pathError = err;
      return false;
    } finally {
      LRN.pathPromise = null;
    }
  })();
  return LRN.pathPromise;
}

async function renderMeasureLearning() {
  const box = $('content');
  if (!box) return;
  $('ptitle').textContent = 'آموزش سنجه‌های نسل ششم';

  if (LRN.view === 'lesson' && LRN.measureId) {
    await lrnRenderLesson();
    return;
  }

  if (!LRN.path || LRN.pathKey !== lrnUserKey()) {
    box.innerHTML = lrnLoadingHtml();
    const ok = await lrnEnsurePath();
    if (S.page !== 'learn') return;
    if (!ok) {
      box.innerHTML = lrnPathErrorHtml();
      return;
    }
  }
  box.innerHTML = lrnCatalogHtml();
  lrnRenderList();
}

function lrnLoadingHtml() {
  return `<div class="panel g lrn-loading" aria-label="در حال بارگذاری">
    <div class="lrn-skel w40"></div>
    <div class="lrn-skel w85"></div>
    <div class="lrn-skel w60"></div>
  </div>`;
}

function lrnPathErrorHtml() {
  const msg = (LRN.pathError && LRN.pathError.message) || 'دریافت مسیر آموزشی ممکن نشد.';
  return `<div class="panel g lrn-error">
    <p>${esc(msg)}</p>
    <button type="button" class="btn btn-g btn-sm" onclick="lrnReload()">تلاش دوباره</button>
  </div>`;
}

function lrnReload() {
  LRN.path = null;
  LRN.pathKey = '';
  LRN.pathError = null;
  LRN.lesson = null;
  LRN.lessonKey = '';
  LRN.lessonError = null;
  renderMeasureLearning();
}

function lrnCatalogHtml() {
  const p = LRN.path;
  const u = p.user || {};
  const st = lrnStats();
  const sc = p.scope || {};
  const rec = lrnRecommendation();
  const recText = rec ? `${rec.code} · ${rec.statement}` : '';
  const allDone = st.total && st.completed === st.total;
  const actionLabel = allDone ? 'مرور از ابتدا' : (st.started ? 'ادامه یادگیری' : 'شروع مسیر');
  const axisChips = (sc.axes || []).map(a => `
    <span class="lrn-chip src-${esc(a.source || 'none')}" title="${esc(lrnSourceLabel(a.source))}">
      ${esc(a.code)} · ${esc(a.title)}
      <small>${esc(lrnSourceLabel(a.source))}</small>
    </span>`).join('');
  const wardChips = (u.wards || []).map(w => `<span class="lrn-chip src-ward">${esc(w.title)}</span>`).join('');
  const unitCount = (p.stats && p.stats.unit_measures) || 0;
  const teamCount = (p.stats && p.stats.team_measures) || 0;

  return `<div class="lrn-page">
    <section class="panel g lrn-hero" aria-labelledby="lrnPositionTitle">
      <div>
        <div class="lrn-eyebrow">${ic('graduation')} مسیر یادگیری نقش‌محور · نسل ششم</div>
        <h3 class="lrn-pos-title" id="lrnPositionTitle">${esc(u.position_title || u.role_title || 'سمت شما')}</h3>
        <div class="lrn-pos-sub">
          ${esc(u.role_title || '')}${u.department ? ' · ' + esc(u.department) : ''}
          <br>مسیر بر اساس محورهای پاسخ‌گویی این سمت ساخته شده است. متن سنجه‌ها و گام‌ها بدون تغییر از کتاب استانداردهای ملی اعتباربخشی، ویرایش ششم، خوانده می‌شود.
        </div>
        <div class="lrn-scope-chips">
          <span class="lrn-scope-label">دامنهٔ آموزشی این سمت</span>
          <div class="lrn-chips">${axisChips}${wardChips}</div>
        </div>
      </div>
      <div class="lrn-hero-side">
        <div class="lrn-pct-line"><b class="lrn-pct-big">${fa(st.pct)}٪</b><span class="lrn-pct-label">از گام‌های مسیر</span></div>
        <div class="bar"><i class="bf-ok" style="width:${st.pct}%"></i></div>
        <div class="lrn-side-note">${fa(st.readSteps)} از ${fa(st.steps)} گام خوانده شده · ${fa(st.completed)} سنجه تکمیل‌شده</div>
        ${rec ? `<div class="lrn-hero-actions">
          <button type="button" class="btn btn-g btn-sm" onclick="lrnStart(${rec ? `'${esc(rec.id)}'` : ''})">${ic('play')} ${esc(actionLabel)}</button>
          <span class="lrn-pct-label" style="align-self:center">${esc(rec.code)}</span>
        </div>` : ''}
      </div>
    </section>

    <div class="lrn-stats">
      <div class="lrn-stat"><span class="lrn-stat-ic">${ic('book')}</span><div class="lrn-stat-tx"><b class="lrn-stat-v">${fa(st.total)}</b><span class="lrn-stat-l">سنجه در این مسیر</span></div></div>
      <div class="lrn-stat"><span class="lrn-stat-ic">${ic('list')}</span><div class="lrn-stat-tx"><b class="lrn-stat-v">${fa(st.steps)}</b><span class="lrn-stat-l">گام اجرایی کتاب</span></div></div>
      <div class="lrn-stat accent"><span class="lrn-stat-ic">${ic('shield')}</span><div class="lrn-stat-tx"><b class="lrn-stat-v">${fa(st.safety)}</b><span class="lrn-stat-l">سنجه ایمنی بیمار</span></div></div>
      <div class="lrn-stat"><span class="lrn-stat-ic">${ic('target')}</span><div class="lrn-stat-tx"><b class="lrn-stat-v">${fa(st.related)}</b><span class="lrn-stat-l">سنجه مرتبط با سمت یا بخش</span></div></div>
    </div>

    <div class="lrn-scope-note">${ic('info')}
      <div>${esc(sc.note || 'این مسیر از محورهای سمت شما ساخته شده است.')}
      ${unitCount ? ` در ${fa(unitCount)} سنجه، گام‌هایی هست که کتاب صریحاً به واحد شما داده است.` : ''}
      ${teamCount ? ` در ${fa(teamCount)} سنجه، گام‌هایی به تیم پرستاری نسبت داده شده است.` : ''}
      <br>پیشرفت مطالعه فقط در همین مرورگر ذخیره می‌شود و وضعیت رسمی سنجه را تغییر نمی‌دهد.</div>
    </div>

    <div class="lrn-toolbar" role="search">
      <div class="lrn-search">
        ${ic('search')}
        <input id="lrnSearch" type="search" value="${esc(LRN.filters.q)}" placeholder="جستجو در کد، متن سنجه یا مسئول گام" autocomplete="off" oninput="lrnOnSearch(this.value)">
      </div>
      <div class="lrn-filter-group">
        <div class="lrn-select">
          <span class="lrn-field-label">وضعیت یادگیری</span>
          <select id="lrnStatusFilter" aria-label="فیلتر وضعیت یادگیری" onchange="lrnSetFilter('status', this.value)">
            <option value="all"${LRN.filters.status === 'all' ? ' selected' : ''}>همه وضعیت‌ها</option>
            <option value="todo"${LRN.filters.status === 'todo' ? ' selected' : ''}>شروع نشده</option>
            <option value="doing"${LRN.filters.status === 'doing' ? ' selected' : ''}>در حال یادگیری</option>
            <option value="done"${LRN.filters.status === 'done' ? ' selected' : ''}>تکمیل‌شده</option>
          </select>
        </div>
        <label class="lrn-toggle"><input type="checkbox" ${LRN.filters.related ? 'checked' : ''} onchange="lrnSetFilter('related', this.checked)"> فقط مرتبط با سمت یا بخش من</label>
        <label class="lrn-toggle"><input type="checkbox" ${LRN.filters.safety ? 'checked' : ''} onchange="lrnSetFilter('safety', this.checked)"> فقط سنجه‌های ایمنی بیمار</label>
      </div>
      <span class="lrn-visible" id="lrnVisible"></span>
    </div>

    <div class="lrn-axes-wrap">
      <div class="lrn-axes-head">
        <span>مرور بر اساس محور</span>
        <small>محور را انتخاب کنید تا فهرست سنجه‌ها باریک‌تر شود.</small>
      </div>
      <div class="lrn-axes-bar" role="group" aria-label="فیلتر محور">
        <button type="button" class="lrn-axis-chip${LRN.filters.axis === 'all' ? ' on' : ''}" onclick="lrnSetAxis('all')">همه محورها<b>${fa(st.total)}</b></button>
        ${(sc.axes || []).map(a => `<button type="button" class="lrn-axis-chip${LRN.filters.axis === a.code ? ' on' : ''}" title="${esc(lrnSourceLabel(a.source))}" onclick="lrnSetAxis('${esc(a.code)}')">${esc(a.code)} · ${esc(a.title)}<b>${fa(a.measures || 0)}</b></button>`).join('')}
      </div>
    </div>

    <div id="lrnList"></div>
  </div>`;
}

function lrnMeasureRow(m, axis, std) {
  const status = lrnStatusOf(m);
  const pct = lrnPctOf(m);
  const stateClass = status === 'done' ? 'done' : (status === 'doing' ? 'doing' : '');
  const tags = [];
  if (m.safety) tags.push('<span class="lrn-mtag sf">ایمنی بیمار</span>');
  if (m.step_count) tags.push(`<span class="lrn-mtag">${fa(m.step_count)} گام</span>`);
  if (m.extra_count) tags.push(`<span class="lrn-mtag">${fa(m.extra_count)} بخش تکمیلی</span>`);
  if (m.page) tags.push(`<span class="lrn-mtag">صفحه ${fa(m.page)} کتاب</span>`);
  if (m.unit_steps) tags.push(`<span class="lrn-mtag unit">${fa(m.unit_steps)} گام واحد شما</span>`);
  if (m.role_steps) tags.push(`<span class="lrn-mtag role">${fa(m.role_steps)} گام سمت شما</span>`);
  if (m.team_steps) tags.push(`<span class="lrn-mtag team">${fa(m.team_steps)} گام تیم شما</span>`);
  const ownerTags = (m.owners || []).slice(0, 3).map(o => `<span class="lrn-mtag">${esc(o)}</span>`).join('');
  const moreOwners = (m.owners || []).length > 3 ? `<span class="lrn-mtag">+${fa((m.owners || []).length - 3)}</span>` : '';
  const aria = `${m.code}، ${m.statement}، ${lrnStatusLabel(status)}`;
  return `<button type="button" class="lrn-mrow" onclick="lrnOpenMeasure('${esc(m.id)}')" aria-label="${esc(aria)}">
    <span class="lrn-mcode">${esc(m.code)}</span>
    <span class="lrn-mbody">
      <span class="lrn-mtitle">${esc(m.statement)}</span>
      <span class="lrn-mmeta">${tags.slice(0, 4).join('')}${ownerTags}${moreOwners}</span>
      <span class="lrn-mbar"><i class="${status === 'done' ? 'done' : ''}" style="width:${pct}%"></i></span>
    </span>
    <span class="lrn-mstate">
      <span class="lrn-state-badge ${stateClass}">${lrnStatusLabel(status)}</span>
      <span class="lrn-mpct">${fa(pct)}٪</span>
    </span>
  </button>`;
}

function lrnRenderList() {
  const list = $('lrnList');
  if (!list) return;
  const chapters = lrnFilteredChapters();
  const count = chapters.reduce((n, ch) => n + ch.axes.reduce((k, ax) => k + ax.standards.reduce((z, s) => z + s.measures.length, 0), 0), 0);
  const vis = $('lrnVisible');
  if (vis) vis.textContent = `${fa(count)} سنجه`;
  if (!count) {
    list.innerHTML = `<div class="lrn-empty"><b>سنجه‌ای با این فیلتر پیدا نشد.</b>جستجو یا فیلترها را تغییر دهید.</div>`;
    return;
  }
  const filtering = !!(LRN.filters.q || LRN.filters.status !== 'all' || LRN.filters.related || LRN.filters.safety || LRN.filters.axis !== 'all');
  let opened = 0;
  list.innerHTML = chapters.map(ch => {
    const chCount = ch.axes.reduce((k, ax) => k + ax.standards.reduce((z, s) => z + s.measures.length, 0), 0);
    const axes = ch.axes.map(ax => {
      const axCount = ax.standards.reduce((z, s) => z + s.measures.length, 0);
      const read = ax.standards.reduce((z, s) => z + s.measures.reduce((y, m) => y + lrnReadStepCount(m), 0), 0);
      const steps = ax.standards.reduce((z, s) => z + s.measures.reduce((y, m) => y + (Number(m.step_count) || 0), 0), 0);
      const pct = steps ? Math.round(read * 100 / steps) : 0;
      const open = filtering || opened < 2;
      if (open) opened += 1;
      const standards = ax.standards.map(std => {
        const rows = std.measures.map(m => lrnMeasureRow(m, ax, std)).join('');
        return `<div class="lrn-std">
          <div class="lrn-std-head">
            <div class="lrn-std-kicker">
              <span class="lrn-std-code">${esc(std.code)}</span>
              <span class="lrn-std-count">${fa(std.measures.length)} سنجه</span>
            </div>
            <div class="lrn-std-title">${esc(std.title)}</div>
          </div>
          ${rows}
        </div>`;
      }).join('');
      return `<details class="lrn-axis"${open ? ' open' : ''}>
        <summary>
          <span class="lrn-axis-code">${esc(ax.code)}</span>
          <span class="lrn-axis-title">${esc(ax.title)}</span>
          <span class="lrn-axis-meta">${fa(axCount)} سنجه · ${fa(read)} از ${fa(steps)} گام</span>
          <span class="lrn-axis-pct">${fa(pct)}٪</span>
          <span class="lrn-axis-chev">${ic('chevron')}</span>
        </summary>
        <div class="lrn-axis-body">${standards}</div>
      </details>`;
    }).join('');
    const chRead = ch.axes.reduce((k, ax) => k + ax.standards.reduce((z, s) => z + s.measures.reduce((y, m) => y + lrnReadStepCount(m), 0), 0), 0);
    const chSteps = ch.axes.reduce((k, ax) => k + ax.standards.reduce((z, s) => z + s.measures.reduce((y, m) => y + (Number(m.step_count) || 0), 0), 0), 0);
    const chPct = chSteps ? Math.round(chRead * 100 / chSteps) : 0;
    return `<section class="lrn-chapter">
      <div class="lrn-chapter-h">
        <span class="lrn-chapter-code">${esc(ch.code || '')}</span>
        <div class="lrn-chapter-copy">
          <h3>${esc(ch.title)}</h3>
          <span class="lrn-chapter-meta">${fa(ch.axes.length)} محور · ${fa(chCount)} سنجه</span>
        </div>
        <div class="lrn-chapter-prog">
          <b>${fa(chPct)}٪</b>
          <span class="lrn-chapter-bar"><i style="width:${chPct}%"></i></span>
          <small>${fa(chRead)} از ${fa(chSteps)} گام</small>
        </div>
      </div>
      ${axes}
    </section>`;
  }).join('');
}

function lrnStart(id) {
  const m = id ? lrnMeasureById(id) : lrnRecommendation();
  if (!m) return;
  lrnOpenMeasure(m.id);
}

function lrnOpenMeasure(id) {
  LRN.view = 'lesson';
  LRN.measureId = id;
  LRN.stage = 0;
  LRN.lesson = null;
  LRN.lessonKey = '';
  LRN.lessonError = null;
  go('learn');
}

function openLearning() {
  LRN.view = 'catalog';
  LRN.measureId = null;
  LRN.lesson = null;
  LRN.lessonKey = '';
  LRN.lessonError = null;
  LRN.stage = 0;
  go('learn');
}

function lrnBackToPath() {
  LRN.view = 'catalog';
  LRN.measureId = null;
  LRN.lesson = null;
  LRN.lessonKey = '';
  LRN.stage = 0;
  go('learn');
}

function lrnSetAxis(code) {
  LRN.filters.axis = code || 'all';
  document.querySelectorAll('.lrn-axis-chip').forEach(el => {
    const on = (el.getAttribute('onclick') || '').includes(`lrnSetAxis('${LRN.filters.axis}')`);
    el.classList.toggle('on', on);
  });
  lrnRenderList();
}

function lrnSetFilter(key, value) {
  if (key === 'related' || key === 'safety') LRN.filters[key] = !!value;
  else LRN.filters[key] = value;
  lrnRenderList();
}

function lrnOnSearch(value) {
  LRN.filters.q = value || '';
  clearTimeout(LRN.searchTimer);
  LRN.searchTimer = setTimeout(() => lrnRenderList(), 140);
}

async function lrnRenderLesson() {
  const box = $('content');
  if (!box) return;
  $('ptitle').textContent = 'یادگیری سنجه';
  const wanted = LRN.measureId;

  if (LRN.lesson && LRN.lessonKey === wanted && LRN.lessonUserKey === lrnUserKey()) {
    lrnPaintLesson();
    return;
  }

  box.innerHTML = lrnLoadingHtml();
  const ok = await lrnEnsurePath();
  if (!ok) {
    if (S.page === 'learn') box.innerHTML = lrnPathErrorHtml();
    return;
  }

  try {
    const data = await API.learningMeasure(wanted);
    if (S.page !== 'learn' || LRN.measureId !== wanted) return;
    LRN.lesson = data;
    LRN.lessonKey = data.measure.id;
    LRN.lessonUserKey = lrnUserKey();
    LRN.lessonError = null;
    LRN.measureId = data.measure.id;
    lrnTouch(data.measure.id);
    if (location.hash.indexOf(data.measure.id) === -1 && location.hash.indexOf(encodeURIComponent(data.measure.id)) === -1) {
      syncRouteHash('learn', { replaceState: true, skipHashUpdate: false });
    }
    lrnPaintLesson();
  } catch (err) {
    if (S.page !== 'learn' || LRN.measureId !== wanted) return;
    LRN.lessonError = err;
    box.innerHTML = `<div class="lrn-page">
      <div class="panel g lrn-error">
        <p>${esc(err.message || 'دریافت متن سنجه ممکن نشد.')}</p>
        <button type="button" class="btn btn-o btn-sm" onclick="lrnBackToPath()">بازگشت به مسیر</button>
        <button type="button" class="btn btn-g btn-sm" onclick="lrnOpenMeasure('${esc(wanted)}')">تلاش دوباره</button>
      </div>
    </div>`;
  }
}

function lrnCurrentMeasure() {
  return LRN.lesson && LRN.lesson.measure ? LRN.lesson.measure : null;
}

function lrnAllStepsRead() {
  const m = lrnCurrentMeasure();
  if (!m) return false;
  if (!m.step_count) return true;
  const rec = lrnRecord(m.id, false) || { steps: {} };
  for (let i = 1; i <= m.step_count; i++) if (!rec.steps[String(i)]) return false;
  return true;
}

function lrnReadCountNow() {
  const m = lrnCurrentMeasure();
  if (!m) return 0;
  const rec = lrnRecord(m.id, false) || { steps: {} };
  let n = 0;
  for (let i = 1; i <= (m.step_count || 0); i++) if (rec.steps[String(i)]) n++;
  return n;
}

function lrnOwnerClass(step) {
  if (step.in_unit) return 'rel-unit';
  if (step.in_role) return 'rel-role';
  if (step.in_team) return 'rel-team';
  return '';
}

function lrnOwnerBadges(step) {
  const out = [];
  if (step.in_unit) out.push('<span class="lrn-mtag unit">واحد شما</span>');
  if (step.in_role) out.push('<span class="lrn-mtag role">سمت شما</span>');
  if (step.in_team) out.push('<span class="lrn-mtag team">تیم شما</span>');
  return out.join('');
}

function lrnStepperHtml(m) {
  const rec = lrnRecord(m.id, false) || { steps: {} };
  const stepsDone = lrnAllStepsRead();
  const extrasDone = !(LRN.lesson.extras || []).length || !!rec.extras_read;
  const doneFlags = [!!rec.statement_read, stepsDone, extrasDone, !!rec.completed_at];
  return `<div class="lrn-stepper" role="tablist" aria-label="مراحل یادگیری">
    ${LRN_STAGE_LABELS.map((label, i) => `
      <button type="button" id="lrnStageBtn-${i}" class="lrn-stage${LRN.stage === i ? ' on' : ''}${doneFlags[i] ? ' ok' : ''}"
        role="tab" aria-selected="${LRN.stage === i ? 'true' : 'false'}" onclick="lrnGoStage(${i})">
        <span class="lrn-stage-n"><span>${fa(i + 1)}</span></span>
        <span class="lrn-stage-t">${esc(label)}</span>
      </button>`).join('')}
  </div>`;
}

function lrnStageReadHtml(m) {
  const rec = lrnRecord(m.id, true);
  const words = String(m.statement || '').trim().split(/\s+/).filter(Boolean).length;
  const simple = LRN.lesson.simple || null;
  return `<div class="lrn-stage-body" id="lrnStageBody">
    <div class="lrn-stage-h">
      <div><h4>متن سنجه و توضیح ساده</h4><p>اول متن رسمی را کامل بخوانید؛ بعد توضیح ساده و مثال را ببینید تا اجرای همین سنجه در بخش روشن شود.</p></div>
      <div class="lrn-stage-tools"><span class="lrn-mtag">${fa(words)} واژه در متن رسمی</span></div>
    </div>
    <div class="lrn-readblock lrn-official">
      <div class="lrn-readblock-label">
        <span class="lrn-readblock-kicker">${ic('book')} متن رسمی سنجه · ${esc(m.code)}</span>
        <span class="lrn-readblock-page">صفحه ${m.page ? fa(m.page) : 'نامشخص'} کتاب</span>
      </div>
      <div class="lrn-readblock-text">${esc(m.statement)}</div>
      <div class="lrn-read-actions">
        <button type="button" class="btn btn-o btn-sm" onclick="lrnOpenReader('statement', 0)">${ic('book')} خواندن کلمه‌به‌کلمه</button>
        <button type="button" id="lrnStatementToggle" class="lrn-read-toggle${rec.statement_read ? ' done' : ''}" onclick="lrnToggleStatement()">
          ${ic('check')} <span id="lrnStatementToggleText">${rec.statement_read ? 'متن سنجه خوانده شد' : 'متن سنجه را خواندم'}</span>
        </button>
      </div>
    </div>
    ${simple ? `<div class="lrn-simple" id="lrnSimpleCard">
      <div class="lrn-simple-head">
        <span class="lrn-simple-badge">${ic('sparkle')} به زبان ساده</span>
        <span class="lrn-simple-tag">توضیح آموزشی؛ جایگزین متن رسمی نیست</span>
      </div>
      <p class="lrn-simple-text">${esc(simple.simple)}</p>
      <div class="lrn-simple-example">
        <div class="lrn-simple-example-h">${ic('help')} مثال از اجرا در بخش</div>
        <p>${esc(simple.example)}</p>
      </div>
    </div>` : ''}
    <div class="lrn-scope-note" style="margin-top:14px">${ic('info')}
      <div>اگر واژه‌ای مبهم بود، حالت کلمه‌به‌کلمه را باز کنید و واژه‌ها را یکی‌یکی با صدای فارسی بشنوید. توضیح «به زبان ساده» و مثال آن فقط برای درک بهتر است و جایگزین متن رسمی نمی‌شود.</div>
    </div>
  </div>`;
}

function lrnStageStepsHtml(m) {
  const rec = lrnRecord(m.id, true);
  const steps = LRN.lesson.steps || [];
  const read = lrnReadCountNow();
  if (!steps.length) {
    return `<div class="lrn-stage-body" id="lrnStageBody">
      <div class="lrn-stage-h"><div><h4>گام‌های اجرایی</h4><p>برای این سنجه در کتاب گام اجرایی جداگانه‌ای ثبت نشده است.</p></div></div>
      <div class="lrn-empty"><b>متن سنجه را خواندید؛ به مرحله بعد بروید.</b>هر شرط یا توضیح تکمیلی در مرحله سوم نمایش داده می‌شود.</div>
    </div>`;
  }
  return `<div class="lrn-stage-body" id="lrnStageBody">
    <div class="lrn-stage-h">
      <div><h4>گام‌های اجرایی را خط‌به‌خط بخوانید</h4><p>هر گام را جداگانه بخوانید و پس از فهمیدن، آن را علامت بزنید. مالک هر گام همان است که در کتاب نوشته شده است.</p></div>
      <div class="lrn-stage-tools">
        <button type="button" class="btn btn-o btn-sm" onclick="lrnOpenReader('steps', ${Math.max(0, steps.findIndex(s => !(rec.steps[String(s.n)])))})">${ic('book')} خواندن خط‌به‌خط</button>
        <button type="button" class="btn btn-o btn-sm" onclick="lrnMarkAllSteps()">علامت‌زدن همه</button>
      </div>
    </div>
    <div class="lrn-steps-toolbar">
      <span><b id="lrnStepsReadCount">${fa(read)}</b> از ${fa(steps.length)} گام خوانده شده</span>
      <span>برای شنیدن یا دنبال‌کردن واژه‌ها، دکمه خواندن هر گام را بزنید.</span>
    </div>
    <div class="lrn-steps">
      ${steps.map((s, idx) => {
        const isRead = !!rec.steps[String(s.n)];
        return `<div class="lrn-step${isRead ? ' is-read' : ''}" id="lrnStep-${s.n}">
          <label class="lrn-step-check" title="این گام را خواندم">
            <input type="checkbox" ${isRead ? 'checked' : ''} onchange="lrnToggleStep(${s.n}, this.checked)" aria-label="گام ${fa(s.n)} را خواندم">
          </label>
          <div class="lrn-step-body">
            <div class="lrn-step-head">
              <span class="lrn-step-n">گام ${fa(s.n)}</span>
              ${s.owner ? `<span class="lrn-owner ${lrnOwnerClass(s)}">${esc(s.owner)}</span>` : ''}
              ${lrnOwnerBadges(s)}
            </div>
            <div class="lrn-step-text">${esc(s.text)}</div>
          </div>
          <button type="button" class="lrn-read-line" onclick="lrnOpenReader('steps', ${idx})" title="خواندن کلمه‌به‌کلمه" aria-label="خواندن کلمه‌به‌کلمه گام ${fa(s.n)}">${ic('play')}</button>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function lrnStageExtrasHtml(m) {
  const rec = lrnRecord(m.id, true);
  const extras = LRN.lesson.extras || [];
  return `<div class="lrn-stage-body" id="lrnStageBody">
    <div class="lrn-stage-h">
      <div><h4>شرط احراز و توضیح تکمیلی</h4><p>این متن‌ها بخش‌های پایانیِ سنجه در کتاب هستند و شرط یا توضیح بیشتری می‌دهند.</p></div>
      <div class="lrn-stage-tools">
        ${extras.length ? `<button type="button" class="lrn-read-toggle${rec.extras_read ? ' done' : ''}" id="lrnExtrasToggle" onclick="lrnToggleExtras()">${ic('check')} <span id="lrnExtrasToggleText">${rec.extras_read ? 'خوانده شد' : 'خواندم'}</span></button>` : ''}
      </div>
    </div>
    ${extras.length ? extras.map((x, i) => `<div class="lrn-extra">
      <div class="lrn-extra-h">${ic('info')} بخش تکمیلی ${fa(i + 1)}</div>
      <p>${esc(x.text)}</p>
      <div class="lrn-read-actions">
        <button type="button" class="btn btn-o btn-sm" onclick="lrnOpenReader('extras', ${i})">${ic('book')} خواندن کلمه‌به‌کلمه</button>
      </div>
    </div>`).join('') : `<div class="lrn-empty"><b>بخش تکمیلی جداگانه‌ای در کتاب نیامده است.</b>متن سنجه و گام‌ها را خوانده‌اید؛ به جمع‌بندی بروید.</div>`}
  </div>`;
}

function lrnStageFinishHtml(m) {
  const rec = lrnRecord(m.id, true);
  const steps = LRN.lesson.steps || [];
  const read = lrnReadCountNow();
  const related = steps.filter(s => s.in_unit || s.in_role || s.in_team);
  const doneCount = related.filter(s => rec.done_steps[String(s.n)]).length;
  const completed = !!rec.completed_at;
  const missing = [];
  if (!rec.statement_read) missing.push('خواندن متن سنجه');
  if (!lrnAllStepsRead()) missing.push('خواندن همه گام‌ها');
  const canFinish = rec.statement_read && lrnAllStepsRead();
  const worksheet = related.length ? related.map(s => {
    const done = !!rec.done_steps[String(s.n)];
    return `<div class="lrn-worksheet-row${done ? ' is-done' : ''}" id="lrnDoneRow-${s.n}">
      <input type="checkbox" ${done ? 'checked' : ''} onchange="lrnToggleDone(${s.n}, this.checked)" aria-label="اجرای گام ${fa(s.n)} را ثبت کردم">
      <div><span class="lrn-ws-text">${esc(s.text)}</span>
      <div class="lrn-mmeta" style="margin-top:3px"><span class="lrn-owner ${lrnOwnerClass(s)}">${esc(s.owner || 'بدون مالک مشخص')}</span>${lrnOwnerBadges(s)}</div></div>
    </div>`;
  }).join('') : '<div class="lrn-empty" style="padding:20px 14px"><b>گام مرتبط با سمت یا واحد شما در این سنجه ثبت نشده است.</b>همه گام‌ها را خوانده‌اید؛ این سنجه را می‌توانید تکمیل کنید.</div>';

  return `<div class="lrn-stage-body" id="lrnStageBody">
    <div class="lrn-stage-h">
      <div><h4>جمع‌بندی و ثبت یادگیری</h4><p>پیشرفت فقط در همین مرورگر می‌ماند و جایگزین ثبت رسمی سنجه نیست.</p></div>
      <div class="lrn-stage-tools"><span class="lrn-mtag">${fa(read)} از ${fa(steps.length)} گام</span></div>
    </div>
    ${completed ? `<div class="lrn-success"><b>${ic('check')} این سنجه را تکمیل کردید.</b><span>تاریخ ثبت: ${fa(lrnFaDate(rec.completed_at))}${rec.confidence ? ' · میزان تسلط: ' + esc(LRN_CONFIDENCE[rec.confidence] || '') : ''}</span></div>` : ''}
    <div class="lrn-finish-grid">
      <div class="lrn-fcard"><b>${fa(read)}</b><span>گام خوانده‌شده</span></div>
      <div class="lrn-fcard"><b>${fa(related.length)}</b><span>گام مرتبط با سمت یا بخش</span></div>
      <div class="lrn-fcard"><b>${fa(doneCount)}</b><span>گام اجراشده در کاربرگ</span></div>
    </div>
    <div class="lrn-worksheet">
      <div class="lrn-worksheet-h"><b>کاربرگ اجرای گام‌های مرتبط</b><span>این کاربرگ برای پیگیری شخصی است و وضعیت رسمی سنجه را تغییر نمی‌دهد. هر گامی را که در بخش اجرا کردید، علامت بزنید.</span></div>
      ${worksheet}
    </div>
    <div class="lrn-rate">
      <span class="lrn-rate-label">میزان تسلط شما</span>
      <div class="lrn-stars" id="lrnStars" role="radiogroup" aria-label="میزان تسلط">
        ${[1, 2, 3, 4, 5].map(v => `<button type="button" class="lrn-star${rec.confidence >= v ? ' on' : ''}" role="radio" aria-checked="${rec.confidence === v ? 'true' : 'false'}" aria-label="${esc(LRN_CONFIDENCE[v])}" title="${esc(LRN_CONFIDENCE[v])}" onclick="lrnSetConfidence(${v})">${ic('star')}</button>`).join('')}
      </div>
      <span class="lrn-rate-val" id="lrnRateVal">${esc(LRN_CONFIDENCE[rec.confidence] || LRN_CONFIDENCE[0])}</span>
    </div>
    <label class="lrn-note-label" for="lrnNote">یادداشت من (اختیاری)</label>
    <textarea class="lrn-note" id="lrnNote" placeholder="مثلاً: گام ۳ را باید با فرم بخش هماهنگ کنم." oninput="lrnNoteInput(this.value)">${esc(rec.note || '')}</textarea>
    <div class="lrn-finish-actions">
      ${completed
        ? `<button type="button" class="btn btn-g btn-sm" onclick="lrnNextMeasure()">سنجه بعدی</button>
           <button type="button" class="btn btn-o btn-sm" onclick="lrnBackToPath()">بازگشت به مسیر</button>`
        : `<button type="button" class="btn btn-g btn-sm" id="lrnFinishBtn" ${canFinish ? '' : 'disabled'} onclick="lrnComplete()">${ic('check')} ثبت پایان یادگیری</button>
           <span class="lrn-finish-hint" id="lrnFinishHint">${canFinish ? 'همه گام‌ها خوانده شده‌اند؛ می‌توانید یادگیری را ثبت کنید.' : 'برای ثبت پایان، این کارها باقی مانده است: ' + esc(missing.join(' و ')) + '.'}</span>`}
    </div>
  </div>`;
}

function lrnPaintLesson() {
  const box = $('content');
  if (!box || !LRN.lesson) return;
  const data = LRN.lesson;
  const m = data.measure;
  const rec = lrnRecord(m.id, true);
  const pct = lrnPctOf({ ...m, step_count: m.step_count });
  const status = rec.completed_at ? 'done' : 'doing';
  const chapter = data.chapter || {};
  const axis = data.axis || {};
  const std = data.standard || {};
  const idx = lrnAllMeasures().findIndex(x => x.id === m.id);
  const all = lrnAllMeasures();
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;
  const ownerChips = (m.owners || []).map(o => `<span class="lrn-owner">${esc(o)}</span>`).join('');
  const stageHtml = [lrnStageReadHtml, lrnStageStepsHtml, lrnStageExtrasHtml, lrnStageFinishHtml][LRN.stage](m);

  box.innerHTML = `<div class="lrn-page lrn-lesson" id="lrnLessonRoot">
    <section class="panel g lrn-lhead" aria-labelledby="lrnLessonTitle">
      <button type="button" class="lrn-back" onclick="lrnBackToPath()">${ic('chevron')} بازگشت به مسیر یادگیری</button>
      <div class="lrn-lhead-top">
        <span class="lrn-lcode">${esc(m.code)}</span>
        <div class="lrn-ltitle">
          <h3 id="lrnLessonTitle">${esc(m.statement)}</h3>
          <div class="lrn-lpath">${esc(chapter.title || '')}${axis.title ? ' › ' + esc(axis.title) : ''}${std.code ? ' › استاندارد ' + esc(std.code) : ''}</div>
          <div class="lrn-lmeta">
            ${m.safety ? '<span class="lrn-mtag sf">ایمنی بیمار</span>' : ''}
            <span class="lrn-mtag">سطح ${fa(m.level || 1)}</span>
            <span class="lrn-mtag">وزن ${fa(m.weight == null ? 1 : m.weight)}</span>
            ${m.step_count ? `<span class="lrn-mtag">${fa(m.step_count)} گام</span>` : ''}
            ${m.extra_count ? `<span class="lrn-mtag">${fa(m.extra_count)} بخش تکمیلی</span>` : ''}
            ${m.page ? `<span class="lrn-mtag">صفحه ${fa(m.page)} کتاب</span>` : ''}
            <span class="lrn-state-badge ${status === 'done' ? 'done' : 'doing'}">${lrnStatusLabel(status)}</span>
          </div>
        </div>
        <div class="lrn-lactions">
          <button type="button" class="btn btn-o btn-sm" onclick="lrnPrevMeasure()" ${prev ? '' : 'disabled'}>${ic('chevron')} قبلی</button>
          <button type="button" class="btn btn-o btn-sm" onclick="lrnNextMeasure()" ${next ? '' : 'disabled'}>بعدی ${ic('chevron')}</button>
        </div>
      </div>
    </section>

    <div class="lrn-layout">
      <main class="panel g lrn-lmain">
        ${lrnStepperHtml(m)}
        ${stageHtml}
        <div class="lrn-pager">
          <button type="button" class="btn btn-o btn-sm" onclick="lrnPrevMeasure()" ${prev ? '' : 'disabled'}>${ic('chevron')} سنجه قبلی</button>
          <button type="button" class="btn btn-o btn-sm" onclick="lrnBackToPath()">فهرست سنجه‌ها</button>
          <button type="button" class="btn btn-o btn-sm" onclick="lrnNextMeasure()" ${next ? '' : 'disabled'}>سنجه بعدی ${ic('chevron')}</button>
        </div>
      </main>

      <aside class="lrn-lside" aria-label="اطلاعات سنجه">
        <div class="lrn-side-card">
          <div class="lrn-side-h">پیشرفت این سنجه</div>
          <div class="lrn-side-pct"><b id="lrnSidePct">${fa(pct)}٪</b><span id="lrnSideState">${lrnStatusLabel(status)}</span></div>
          <div class="bar"><i class="bf-ok" id="lrnSideBar" style="width:${pct}%"></i></div>
          <div class="lrn-side-row"><span>گام خوانده‌شده</span><b id="lrnSideRead">${fa(lrnReadCountNow())} از ${fa(m.step_count || 0)}</b></div>
          <div class="lrn-side-row"><span>بخش‌های تکمیلی</span><b>${fa((data.extras || []).length)}</b></div>
          <div class="lrn-side-row"><span>مالک گام‌ها در کتاب</span><b>${fa((m.owners || []).length)} عنوان</b></div>
          ${ownerChips ? `<div class="lrn-side-owners" style="margin-top:7px">${ownerChips}</div>` : ''}
        </div>
        <div class="lrn-side-card">
          <div class="lrn-side-h">نوع بخش در مسیر</div>
          <div class="lrn-side-row"><span>سمت</span><b>${esc(data.user.position_title || data.user.role_title || '')}</b></div>
          ${(data.scope && data.scope.ward_axes && data.scope.ward_axes.length) ? `<div class="lrn-side-row"><span>محور نوع بخش</span><b>${esc((data.scope.ward_axes || []).join('، '))}</b></div>` : ''}
          ${(data.scope && data.scope.ward_labels && data.scope.ward_labels.length) ? `<div class="lrn-side-note" style="margin-top:6px">${esc((data.scope.ward_labels || []).join('، '))}</div>` : ''}
          <div class="lrn-side-note" style="margin-top:7px">این محورها برای نزدیک‌کردن مسیر به نوع بخش افزوده شده‌اند و محتوای کتاب را تغییر نمی‌دهند.</div>
        </div>
        <div class="lrn-side-card">
          <div class="lrn-side-h">منبع</div>
          <div class="lrn-side-note">${esc(data.note || 'متن از کتاب استانداردهای ملی اعتباربخشی، ویرایش ششم.')}</div>
          <div class="lrn-side-note" style="margin-top:6px">پیشرفت مطالعه در همین مرورگر است و به وضعیت رسمی سنجه نوشته نمی‌شود.</div>
        </div>
      </aside>
    </div>
  </div>`;
}

function lrnGoStage(i) {
  LRN.stage = Math.max(0, Math.min(3, Number(i) || 0));
  lrnPaintLesson();
}

function lrnToggleStatement() {
  const m = lrnCurrentMeasure();
  if (!m) return;
  const rec = lrnRecord(m.id, true);
  rec.statement_read = !rec.statement_read;
  lrnSaveRecord(m.id, rec);
  const btn = $('lrnStatementToggle');
  if (btn) {
    btn.classList.toggle('done', !!rec.statement_read);
    const t = $('lrnStatementToggleText');
    if (t) t.textContent = rec.statement_read ? 'متن سنجه خوانده شد' : 'متن سنجه را خواندم';
  }
  const stage0 = $('lrnStageBtn-0');
  if (stage0) stage0.classList.toggle('ok', !!rec.statement_read);
  lrnUpdateFinishUI();
}

function lrnToggleExtras() {
  const m = lrnCurrentMeasure();
  if (!m) return;
  const rec = lrnRecord(m.id, true);
  rec.extras_read = !rec.extras_read;
  lrnSaveRecord(m.id, rec);
  const btn = $('lrnExtrasToggle');
  if (btn) {
    btn.classList.toggle('done', !!rec.extras_read);
    const t = $('lrnExtrasToggleText');
    if (t) t.textContent = rec.extras_read ? 'خوانده شد' : 'خواندم';
  }
  const stage2 = $('lrnStageBtn-2');
  if (stage2) stage2.classList.toggle('ok', !!rec.extras_read || !(LRN.lesson.extras || []).length);
}

function lrnToggleStep(n, checked) {
  const m = lrnCurrentMeasure();
  if (!m) return;
  const rec = lrnRecord(m.id, true);
  if (checked) rec.steps[String(n)] = true; else delete rec.steps[String(n)];
  lrnSaveRecord(m.id, rec);
  const row = $('lrnStep-' + n);
  if (row) row.classList.toggle('is-read', !!checked);
  const count = $('lrnStepsReadCount');
  if (count) count.textContent = fa(lrnReadCountNow());
  const stage1 = $('lrnStageBtn-1');
  if (stage1) stage1.classList.toggle('ok', lrnAllStepsRead());
  lrnUpdateProgressChrome();
  lrnUpdateFinishUI();
}

function lrnMarkAllSteps() {
  const m = lrnCurrentMeasure();
  if (!m) return;
  const rec = lrnRecord(m.id, true);
  for (const s of (LRN.lesson.steps || [])) rec.steps[String(s.n)] = true;
  lrnSaveRecord(m.id, rec);
  lrnPaintLesson();
}

function lrnToggleDone(n, checked) {
  const m = lrnCurrentMeasure();
  if (!m) return;
  const rec = lrnRecord(m.id, true);
  if (checked) rec.done_steps[String(n)] = true; else delete rec.done_steps[String(n)];
  lrnSaveRecord(m.id, rec);
  const row = $('lrnDoneRow-' + n);
  if (row) row.classList.toggle('is-done', !!checked);
  const fcard = document.querySelectorAll('.lrn-fcard b')[2];
  if (fcard) {
    const related = (LRN.lesson.steps || []).filter(s => s.in_unit || s.in_role || s.in_team);
    fcard.textContent = fa(related.filter(s => rec.done_steps[String(s.n)]).length);
  }
}

function lrnSetConfidence(v) {
  const m = lrnCurrentMeasure();
  if (!m) return;
  const rec = lrnRecord(m.id, true);
  rec.confidence = Number(v) || 0;
  lrnSaveRecord(m.id, rec);
  document.querySelectorAll('#lrnStars .lrn-star').forEach((el, i) => {
    el.classList.toggle('on', rec.confidence >= i + 1);
    el.setAttribute('aria-checked', rec.confidence === i + 1 ? 'true' : 'false');
  });
  const label = $('lrnRateVal');
  if (label) label.textContent = LRN_CONFIDENCE[rec.confidence] || LRN_CONFIDENCE[0];
}

function lrnNoteInput(value) {
  const m = lrnCurrentMeasure();
  if (!m) return;
  clearTimeout(LRN.noteTimer);
  LRN.noteTimer = setTimeout(() => {
    const rec = lrnRecord(m.id, true);
    rec.note = String(value || '').slice(0, 2000);
    lrnSaveRecord(m.id, rec);
  }, 280);
}

function lrnUpdateProgressChrome() {
  const m = lrnCurrentMeasure();
  if (!m) return;
  const rec = lrnRecord(m.id, false) || { steps: {} };
  const pct = lrnPctOf(m);
  const pctEl = $('lrnSidePct');
  if (pctEl) pctEl.textContent = fa(pct) + '٪';
  const bar = $('lrnSideBar');
  if (bar) bar.style.width = pct + '%';
  const read = $('lrnSideRead');
  if (read) read.textContent = `${fa(lrnReadCountNow())} از ${fa(m.step_count || 0)}`;
  const state = $('lrnSideState');
  if (state) state.textContent = rec.completed_at ? 'تکمیل‌شده' : 'در حال یادگیری';
}

function lrnUpdateFinishUI() {
  const m = lrnCurrentMeasure();
  if (!m) return;
  const rec = lrnRecord(m.id, false) || { steps: {} };
  const stage1 = $('lrnStageBtn-1');
  if (stage1) stage1.classList.toggle('ok', lrnAllStepsRead());
  const stage0 = $('lrnStageBtn-0');
  if (stage0) stage0.classList.toggle('ok', !!rec.statement_read);
  const btn = $('lrnFinishBtn');
  if (btn) {
    const can = !!rec.statement_read && lrnAllStepsRead();
    btn.disabled = !can;
    const hint = $('lrnFinishHint');
    if (hint) {
      if (can) hint.textContent = 'همه گام‌ها خوانده شده‌اند؛ می‌توانید یادگیری را ثبت کنید.';
      else {
        const missing = [];
        if (!rec.statement_read) missing.push('خواندن متن سنجه');
        if (!lrnAllStepsRead()) missing.push('خواندن همه گام‌ها');
        hint.textContent = 'برای ثبت پایان، این کارها باقی مانده است: ' + missing.join(' و ') + '.';
      }
    }
  }
  lrnUpdateProgressChrome();
}

function lrnComplete() {
  const m = lrnCurrentMeasure();
  if (!m) return;
  const rec = lrnRecord(m.id, true);
  if (!rec.statement_read) {
    if (typeof toast === 'function') toast('ابتدا متن سنجه را در مرحله اول بخوانید.', true);
    return;
  }
  if (!lrnAllStepsRead()) {
    if (typeof toast === 'function') toast('برای ثبت پایان، همه گام‌ها را بخوانید.', true);
    return;
  }
  rec.completed_at = new Date().toISOString();
  lrnSaveRecord(m.id, rec);
  if (typeof toast === 'function') toast('یادگیری این سنجه ثبت شد.');
  lrnPaintLesson();
}

function lrnPrevMeasure() {
  const all = lrnAllMeasures();
  const i = all.findIndex(m => m.id === LRN.measureId);
  if (i > 0) lrnOpenMeasure(all[i - 1].id);
}

function lrnNextMeasure() {
  const all = lrnAllMeasures();
  const i = all.findIndex(m => m.id === LRN.measureId);
  if (i >= 0 && i < all.length - 1) lrnOpenMeasure(all[i + 1].id);
}

/* ---------- خواندن کلمه‌به‌کلمه ---------- */
function lrnReaderLines(kind) {
  const data = LRN.lesson;
  if (!data) return [];
  if (kind === 'statement') return [{ label: 'متن سنجه', text: data.measure.statement || '' }];
  if (kind === 'steps') return (data.steps || []).map(s => ({ label: 'گام ' + fa(s.n), text: s.text, owner: s.owner }));
  if (kind === 'extras') return (data.extras || []).map((x, i) => ({ label: 'بخش تکمیلی ' + fa(i + 1), text: x.text }));
  return [];
}

function lrnReaderOpen(kind, startLine) {
  const lines = lrnReaderLines(kind).filter(x => String(x.text || '').trim());
  if (!lines.length) return;
  const line = Math.max(0, Math.min(Number(startLine) || 0, lines.length - 1));
  LRN.reader = {
    lines,
    line,
    word: 0,
    returnFocus: document.activeElement,
    overlay: null,
  };
  lrnReaderPaint(true);
  if (typeof lrnSpeak === 'function') {
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
  }
}

function lrnReaderWords() {
  if (!LRN.reader) return [];
  const line = LRN.reader.lines[LRN.reader.line] || { text: '' };
  return String(line.text || '').trim().split(/\s+/).filter(Boolean);
}

function lrnReaderPaint(fresh) {
  if (!LRN.reader) return;
  const words = lrnReaderWords();
  if (LRN.reader.word >= words.length) LRN.reader.word = Math.max(0, words.length - 1);
  const current = words[LRN.reader.word] || '';
  const lineObj = LRN.reader.lines[LRN.reader.line] || {};
  const isLastLine = LRN.reader.line >= LRN.reader.lines.length - 1;
  const isLastWord = LRN.reader.word >= words.length - 1;
  let overlay = LRN.reader.overlay || document.getElementById('lrnReaderOvl');
  const scrollTop = overlay ? (overlay.querySelector('.lrn-reader') || {}).scrollTop || 0 : 0;

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'lrnReaderOvl';
    overlay.className = 'lrn-reader-ovl';
    overlay.tabIndex = -1;
    document.body.appendChild(overlay);
    LRN.reader.overlay = overlay;
    const app = document.getElementById('app');
    if (app) app.inert = true;
    document.body.style.overflow = 'hidden';
    LRN.readerKeyHandler = (e) => lrnReaderKey(e);
    document.addEventListener('keydown', LRN.readerKeyHandler, true);
  }

  overlay.innerHTML = `<div class="lrn-reader" role="dialog" aria-modal="true" aria-labelledby="lrnReaderTitle">
    <div class="lrn-reader-h">
      <div><h4 id="lrnReaderTitle">خواندن کلمه‌به‌کلمه · ${esc(LRN.lesson.measure.code)}</h4><span>${esc(lineObj.label || '')}${lineObj.owner ? ' · مالک در کتاب: ' + esc(lineObj.owner) : ''}</span></div>
      <button type="button" class="lrn-reader-close" onclick="lrnReaderClose()" aria-label="بستن">${ic('close')}</button>
    </div>
    <div class="lrn-reader-meta">
      <span>خط <b>${fa(LRN.reader.line + 1)}</b> از <b>${fa(LRN.reader.lines.length)}</b></span>
      <span>واژه <b>${fa(LRN.reader.word + 1)}</b> از <b>${fa(words.length)}</b></span>
    </div>
    <div class="lrn-reader-line" id="lrnReaderLine">${words.map((w, i) => `<button type="button" class="lrn-rw${i === LRN.reader.word ? ' on' : ''}" data-w="${i}" onclick="lrnReaderGotoWord(${i})">${esc(w)}</button>`).join(' ')}</div>
    <div class="lrn-reader-wordbox"><span>واژه فعلی</span><b id="lrnReaderCurrent">${esc(current)}</b></div>
    <div class="lrn-reader-controls">
      <button type="button" class="btn btn-o btn-sm" onclick="lrnReaderWord(-1)" ${LRN.reader.word <= 0 ? 'disabled' : ''}>${ic('chevron')} کلمه قبلی</button>
      <button type="button" class="btn btn-o btn-sm" onclick="lrnReaderWord(1)" ${isLastWord ? 'disabled' : ''}>کلمه بعدی ${ic('chevron')}</button>
      <button type="button" class="btn btn-o btn-sm" onclick="lrnReaderSpeakWord()">${ic('play')} خواندن کلمه</button>
      <button type="button" class="btn btn-o btn-sm" onclick="lrnReaderSpeakLine()">${ic('book')} خواندن خط</button>
      <button type="button" class="btn btn-o btn-sm" onclick="lrnReaderLine(-1)" ${LRN.reader.line <= 0 ? 'disabled' : ''}>خط قبلی</button>
      <button type="button" class="btn btn-o btn-sm" onclick="lrnReaderLine(1)" ${isLastLine ? 'disabled' : ''}>خط بعدی</button>
    </div>
    <div class="lrn-reader-hint">کلید <kbd>→</kbd> کلمه قبلی، <kbd>←</kbd> کلمه بعدی، <kbd>↑</kbd> و <kbd>↓</kbd> خط قبلی و بعدی، و <kbd>Esc</kbd> برای بستن. خواندن صوتی به صدای فارسی نصب‌شده روی دستگاه شما وابسته است.</div>
    <div class="lrn-sr" aria-live="polite" id="lrnReaderLive">${esc(current)}</div>
  </div>`;

  const modal = overlay.querySelector('.lrn-reader');
  if (modal && !fresh) modal.scrollTop = scrollTop;
  const wordEl = overlay.querySelector('.lrn-rw.on');
  if (wordEl && typeof wordEl.scrollIntoView === 'function') {
    try { wordEl.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {}
  }
  const live = overlay.querySelector('#lrnReaderLive');
  if (live) live.textContent = current;
  if (fresh) {
    overlay.focus({ preventScroll: true });
  }
}

function lrnReaderGotoWord(i) {
  if (!LRN.reader) return;
  const words = lrnReaderWords();
  LRN.reader.word = Math.max(0, Math.min(Number(i) || 0, words.length - 1));
  lrnReaderPaint(false);
}

function lrnReaderWord(delta) {
  if (!LRN.reader) return;
  lrnReaderGotoWord(LRN.reader.word + Number(delta || 0));
}

function lrnReaderLine(delta) {
  if (!LRN.reader) return;
  const next = Math.max(0, Math.min(LRN.reader.line + Number(delta || 0), LRN.reader.lines.length - 1));
  if (next === LRN.reader.line) return;
  LRN.reader.line = next;
  LRN.reader.word = 0;
  lrnReaderPaint(false);
}

function lrnReaderSpeakWord() {
  if (!LRN.reader) return;
  const words = lrnReaderWords();
  lrnSpeak(words[LRN.reader.word] || '');
}

function lrnReaderSpeakLine() {
  if (!LRN.reader) return;
  const line = LRN.reader.lines[LRN.reader.line] || { text: '' };
  lrnSpeak(line.text || '');
}

function lrnSpeak(text) {
  const clean = String(text || '').replace(/[«»؛،.:!?؟()\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return;
  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    if (typeof toast === 'function') toast('خواندن صوتی در این مرورگر پشتیبانی نمی‌شود؛ واژه‌ها را روی صفحه دنبال کنید.', true);
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'fa-IR';
    u.rate = 0.9;
    const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
    const fa = voices.find(v => /^fa/i.test(v.lang || ''));
    if (fa) u.voice = fa;
    window.speechSynthesis.speak(u);
  } catch (e) {
    if (typeof toast === 'function') toast('خواندن صوتی انجام نشد.', true);
  }
}

function lrnReaderKey(e) {
  if (!LRN.reader) return;
  const tag = (e.target && e.target.tagName) || '';
  if (e.key === 'Escape') { e.preventDefault(); lrnReaderClose(); return; }
  if (e.key === 'ArrowRight') { e.preventDefault(); lrnReaderWord(-1); return; }
  if (e.key === 'ArrowLeft') { e.preventDefault(); lrnReaderWord(1); return; }
  if (e.key === 'ArrowUp') { e.preventDefault(); lrnReaderLine(-1); return; }
  if (e.key === 'ArrowDown') { e.preventDefault(); lrnReaderLine(1); return; }
  if (e.key === ' ' && tag !== 'BUTTON' && tag !== 'TEXTAREA' && tag !== 'INPUT') {
    e.preventDefault();
    lrnReaderSpeakLine();
  }
}

function lrnReaderClose() {
  if (!LRN.reader) return;
  const state = LRN.reader;
  setSpeechIdle();
  if (state.overlay) state.overlay.remove();
  if (LRN.readerKeyHandler) document.removeEventListener('keydown', LRN.readerKeyHandler, true);
  const app = document.getElementById('app');
  if (app) app.inert = false;
  document.body.style.overflow = '';
  LRN.reader = null;
  LRN.readerKeyHandler = null;
  if (state.returnFocus && typeof state.returnFocus.focus === 'function') {
    try { state.returnFocus.focus({ preventScroll: true }); } catch (e) {}
  }
}

function setSpeechIdle() {
  try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
}

window.openLearning = openLearning;
window.renderMeasureLearning = renderMeasureLearning;
window.lrnReload = lrnReload;
window.lrnSetAxis = lrnSetAxis;
window.lrnSetFilter = lrnSetFilter;
window.lrnOnSearch = lrnOnSearch;
window.lrnOpenMeasure = lrnOpenMeasure;
window.lrnBackToPath = lrnBackToPath;
window.lrnStart = lrnStart;
window.lrnGoStage = lrnGoStage;
window.lrnToggleStatement = lrnToggleStatement;
window.lrnToggleExtras = lrnToggleExtras;
window.lrnToggleStep = lrnToggleStep;
window.lrnToggleDone = lrnToggleDone;
window.lrnMarkAllSteps = lrnMarkAllSteps;
window.lrnSetConfidence = lrnSetConfidence;
window.lrnNoteInput = lrnNoteInput;
window.lrnComplete = lrnComplete;
window.lrnPrevMeasure = lrnPrevMeasure;
window.lrnNextMeasure = lrnNextMeasure;
window.lrnOpenReader = lrnReaderOpen;
window.lrnReaderGotoWord = lrnReaderGotoWord;
window.lrnReaderWord = lrnReaderWord;
window.lrnReaderLine = lrnReaderLine;
window.lrnReaderSpeakWord = lrnReaderSpeakWord;
window.lrnReaderSpeakLine = lrnReaderSpeakLine;
window.lrnReaderClose = lrnReaderClose;
