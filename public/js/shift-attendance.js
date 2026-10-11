/* =====================================================================
   حضورِ شیفت و گزارشِ ۲۴ ساعته — صفحه‌ی سوپروایزر بالینی
   ---------------------------------------------------------------------
   جای سه دکمه‌ی «به‌زودی»ی قبلی را می‌گیرد (روسترِ سوپروایزر در app.js).
   بک‌اند: src/routes/api.js بخش «حضورِ شیفتی و گزارشِ ۲۴ ساعته».

   چیدمانِ راست‌به‌چپ — عمدی، نه تصادفی:
   چشمِ فارسی‌خوان اول بالا-راست می‌نشیند، پس مهم‌ترین عددِ صفحه («الان سرِ
   شیفت») همان‌جاست و اعدادِ کم‌اهمیت‌تر به چپ می‌روند. فهرستِ بخش‌ها ستونِ
   راست است (انتخابگر) و جزئیاتِ بخشِ انتخابی سمت چپ — چون کاربر اول
   «کدام بخش» را می‌خواهد، بعد «چه کسی».

   عددِ «ثبت‌نشده» عمداً به‌اندازه‌ی «حاضر» برجسته است: مدیر پرستاری باید
   ببیند کدام بخش هنوز تیک نخورده، وگرنه عددِ حاضر دروغِ خوش‌ظاهر است.
   ===================================================================== */
(function (global) {
  'use strict';
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s));
  const I = (n, c) => (typeof ic === 'function' ? ic(n, c) : '');
  const F = n => (typeof fa === 'function' ? fa(n) : String(n));
  const D = iso => (typeof faDateISO === 'function' ? faDateISO(iso) : String(iso || ''));
  const T = (m, e2) => { if (typeof toast === 'function') toast(m, e2); else BTN.alert(m); };

  const STATE_STYLE = {
    'حاضر': { cls: 'sa-ok', icon: '✔' },
    'غایب': { cls: 'sa-no', icon: '✖' },
    'تأخیر': { cls: 'sa-late', icon: '◷' },
    'جانشین': { cls: 'sa-sub', icon: '⇄' },
  };

  const SA = { ctx: null, data: null, ward: null, tab: 'att', report: null, list: null,
    date: null, shift: null, busy: false };

  global.renderShiftAttendance = async function () {
    $('ptitle').textContent = 'حضور شیفت و گزارش ۲۴ ساعته';
    $('content').innerHTML = '<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
    try {
      SA.ctx = await API.saContext();
      if (!SA.date) { SA.date = SA.ctx.current.date; SA.shift = SA.ctx.current.shift; }
      await saLoad();
    } catch (err) {
      $('content').innerHTML = `<div class="panel g"><div class="empty">${E(err.message)}</div></div>`;
    }
  };

  async function saLoad() {
    SA.data = await API.saRoster(SA.date, SA.shift, null);
    if (!SA.ward || !SA.data.wards.some(w => w.ward === SA.ward)) {
      SA.ward = SA.data.wards.length ? SA.data.wards[0].ward : null;
    }
    saDraw();
  }

  global.saSelectTab = async function (t) {
    SA.tab = t;
    if (t === 'report' && !SA.report) { try { SA.report = await API.saReport(SA.date, SA.shift); } catch (e2) { T(e2.message, true); } }
    if (t === 'list' && !SA.list) { try { SA.list = await API.saReportList({}); } catch (e2) { T(e2.message, true); } }
    saDraw();
  };
  global.saSelectWard = function (w) { SA.ward = w; saDraw(); };
  global.saSetShift = async function (s) { SA.shift = s; SA.report = null; await saLoad(); };
  global.saSetDate = async function (v) { if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return; SA.date = v; SA.report = null; await saLoad(); };
  // خوانش تاریخ از سه select شمسی داخلی (جایگزین input میلادی) — با onchange هر select صدا زده می‌شود.
  global.saSetJalaliDate = async function () {
    try {
      const v = (typeof readJalaliDateInputOpt==='function') ? readJalaliDateInputOpt('saDate') : '';
      if (!v) return; SA.date = v; SA.report = null; await saLoad();
    } catch (e) { /* اگر تقویم داخلی در دسترس نباشد، همان تاریخ قبلی می‌ماند */ }
  };
  global.saGoNow = async function () { SA.date = SA.ctx.current.date; SA.shift = SA.ctx.current.shift; SA.report = null; await saLoad(); };

  function saDraw() {
    const d = SA.data, c = SA.ctx;
    $('content').innerHTML = `
    ${saHeaderHtml(c, d)}
    <div class="panel g noprint" style="margin-bottom:16px"><div class="pbody" style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn ${SA.tab === 'att' ? 'btn-g' : 'btn-o'} btn-sm" onclick="saSelectTab('att')">${I('users')} حضور شیفت</button>
      <button class="btn ${SA.tab === 'report' ? 'btn-g' : 'btn-o'} btn-sm" onclick="saSelectTab('report')">${I('docs')} گزارش ۲۴ ساعته</button>
      <button class="btn ${SA.tab === 'list' ? 'btn-g' : 'btn-o'} btn-sm" onclick="saSelectTab('list')">${I('list')} بایگانی گزارش‌ها</button>
    </div></div>
    ${SA.tab === 'att' ? saAttHtml() : (SA.tab === 'report' ? saReportHtml() : saListHtml())}`;
  }

  /* ---------- سربرگ: شیفتِ جاری، انتخابگر تاریخ/شیفت، سه عدد ---------- */
  function saHeaderHtml(c, d) {
    const t = d.totals;
    const live = d.is_current_window;
    return `<div class="panel g ${live ? 'gold' : ''}" style="margin-bottom:16px">
      <div class="phd">
        <div class="abadge">${live ? '◉' : '◷'}</div>
        <div style="flex:1">
          <h3>شیفت ${E(d.shift_fa)} — ${D(d.date)}</h3>
          <div class="sub">${live
            ? `شیفتِ جاری است؛ ثبتِ حضور باز است${c.supervisor_slot ? ' — ' + E(c.supervisor_slot.label) : ''}`
            : `شیفتِ جاری «${E(c.current_shift_fa)}ِ ${D(c.current.date)}» است؛ این شیفت ${d.can_edit ? 'با دسترسیِ نظارتی قابل ویرایش' : 'فقط‌خواندنی'} است`}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          ${(c.shifts || []).map(s => `<button class="tgl ${s.code === d.shift ? 'on prim' : ''}"
            onclick="saSetShift('${s.code}')">${E(s.title)} <b style="direction:ltr">${s.code}</b></button>`).join('')}
          <span onchange="saSetJalaliDate()">${(typeof jalaliDateInputHtml==='function'?jalaliDateInputHtml('saDate',{value:d.date}):`<input type="date" class="sel" style="direction:ltr" value="${E(d.date)}" onchange="saSetDate(this.value)">`)}</span>
          ${live ? '' : `<button class="btn btn-o btn-sm" onclick="saGoNow()">برو به شیفتِ جاری</button>`}
        </div>
      </div>
      <div class="pbody" style="padding-top:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px">
        ${saStat('الان سرِ شیفت', t.on_duty, 'sa-big sa-ok', `از ${F(t.expected)} نفرِ برنامه`)}
        ${saStat('غایب', t['غایب'], 'sa-no')}
        ${saStat('تأخیر', t['تأخیر'], 'sa-late')}
        ${saStat('جانشین', t['جانشین'], 'sa-sub')}
        ${saStat('ثبت‌نشده', t['ثبت‌نشده'], 'sa-unset', 'هنوز تیک نخورده')}
      </div>
    </div>`;
  }
  function saStat(label, n, cls, sub) {
    return `<div class="st g sa-stat ${cls}">
      <div class="l">${E(label)}</div>
      <div class="v">${F(n)}</div>
      ${sub ? `<div class="sub">${E(sub)}</div>` : ''}
    </div>`;
  }

  /* ---------- تب حضور: بخش‌ها راست، نفراتِ بخشِ انتخابی چپ ---------- */
  function saAttHtml() {
    const d = SA.data;
    if (!d.wards.length) {
      return `<div class="panel g"><div class="empty"><div class="ei">◷</div>
        برای شیفت ${E(d.shift_fa)}ِ ${D(d.date)} هیچ‌کس در برنامه‌ی شیفت چیده نشده است.
        اول از «پرسنل و برنامه‌ی شیفت» برنامه‌ی این ماه را پر کنید.</div></div>`;
    }
    const cur = d.wards.find(w => w.ward === SA.ward) || d.wards[0];
    return `<div class="sa-split">
      <div class="panel g sa-wardlist">
        <div class="phd"><div class="abadge">☰</div><div><h3>بخش‌ها</h3>
          <div class="sub">${F(d.wards.length)} بخش در این شیفت برنامه دارد</div></div></div>
        <div class="pbody" style="padding-top:0">
          ${d.wards.map(w => {
            const done = w.staff.length - w.counts['ثبت‌نشده'];
            const pct = w.staff.length ? Math.round(done / w.staff.length * 100) : 0;
            return `<button class="sa-wardbtn ${w.ward === cur.ward ? 'on' : ''}" onclick="saSelectWard('${E(w.ward).replace(/'/g, '&#39;')}')">
              <span class="sa-wardname">${E(w.ward)}</span>
              <span class="sa-wardnums">
                <b class="sa-ok">${F(w.counts['حاضر'] + w.counts['تأخیر'] + w.counts['جانشین'])}</b>
                <i>/</i><span>${F(w.staff.length)}</span>
                ${w.counts['ثبت‌نشده'] ? `<em class="sa-unset">${F(w.counts['ثبت‌نشده'])} ثبت‌نشده</em>` : '<em class="sa-ok">کامل</em>'}
              </span>
              <span class="sa-bar"><i style="width:${pct}%"></i></span>
            </button>`;
          }).join('')}
        </div>
      </div>
      <div class="panel g sa-wardbody">
        <div class="phd"><div class="abadge">✔</div><div style="flex:1"><h3>${E(cur.ward)}</h3>
          <div class="sub">${d.can_edit ? 'روی وضعیتِ هر نفر بزنید؛ دوباره زدن آن را برمی‌دارد' : 'فقط‌خواندنی'}</div></div>
          ${d.can_edit ? `<button class="btn btn-o btn-sm" onclick="saMarkAllPresent()">همه حاضر</button>` : ''}
        </div>
        <div class="pbody" style="padding-top:0">
          <div class="tbl-wrap"><table><thead><tr>
            <th>نام و نام‌خانوادگی</th><th>سمت</th><th style="width:56px">شیفت</th>
            <th style="min-width:230px">وضعیت</th><th>یادداشت</th><th>ثبت‌کننده</th>
          </tr></thead><tbody>
          ${cur.staff.map(s => saStaffRow(cur.ward, s, d.can_edit)).join('')}
          </tbody></table></div>
        </div>
      </div>
    </div>`;
  }

  function saStaffRow(ward, s, canEdit) {
    const wq = E(ward).replace(/'/g, '&#39;');
    return `<tr class="${s.state ? '' : 'sa-row-unset'}">
      <td>${E(s.full_name)}</td>
      <td>${E(s.position || '—')}</td>
      <td><span class="sa-code ss-${E(s.codes)}">${E(s.codes)}</span></td>
      <td class="mctl">
        ${Object.keys(STATE_STYLE).map(st => `<button class="tgl sa-t ${STATE_STYLE[st].cls} ${s.state === st ? 'on' : ''}"
          ${canEdit ? `onclick="saMark('${wq}','${s.staff_id}','${st}')"` : 'disabled'}
          >${STATE_STYLE[st].icon} ${E(st)}</button>`).join('')}
      </td>
      <td><input value="${E(s.note || '')}" placeholder="—" ${canEdit ? '' : 'disabled'}
        onchange="saNote('${wq}','${s.staff_id}',this.value)"></td>
      <td class="sub">${s.marked_by_name ? E(s.marked_by_name) : '—'}</td>
    </tr>`;
  }

  global.saMark = async function (ward, staffId, state) {
    if (SA.busy) return;
    const w = SA.data.wards.find(x => x.ward === ward);
    const s = w && w.staff.find(x => x.staff_id === staffId);
    // دوباره‌زدنِ همان وضعیت آن را برمی‌دارد — تیکِ اشتباه بدون دکمه‌ی جدا پاک می‌شود
    const next = s && s.state === state ? null : state;
    SA.busy = true;
    try {
      await API.saMark({ ward, date: SA.date, shift: SA.shift, staff_id: staffId, state: next, note: s ? s.note : null });
      await saLoad();
    } catch (err) { T(err.message, true); }
    finally { SA.busy = false; }
  };

  global.saNote = async function (ward, staffId, note) {
    const w = SA.data.wards.find(x => x.ward === ward);
    const s = w && w.staff.find(x => x.staff_id === staffId);
    try {
      await API.saMark({ ward, date: SA.date, shift: SA.shift, staff_id: staffId, state: (s && s.state) || 'حاضر', note });
      await saLoad();
    } catch (err) { T(err.message, true); }
  };

  global.saMarkAllPresent = async function () {
    const w = SA.data.wards.find(x => x.ward === SA.ward);
    if (!w) return;
    const todo = w.staff.filter(s => !s.state);
    if (!todo.length) return T('همه‌ی نفراتِ این بخش قبلاً ثبت شده‌اند');
    if (!await BTN.confirm(`${todo.length} نفرِ ثبت‌نشده‌ی «${w.ward}» حاضر ثبت شوند؟`)) return;
    SA.busy = true;
    try {
      for (const s of todo) {
        await API.saMark({ ward: w.ward, date: SA.date, shift: SA.shift, staff_id: s.staff_id, state: 'حاضر' });
      }
      T('ثبت شد');
      await saLoad();
    } catch (err) { T(err.message, true); }
    finally { SA.busy = false; }
  };

  /* ---------- تب گزارش ۲۴ ساعته — سنجه‌ی الف‑۴‑۳‑۱ ---------- */
  function saReportHtml() {
    const r = SA.report;
    if (!r) return '<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
    const rep = r.report || {};
    const hc = r.headcount || {};
    const locked = rep.status === 'بررسی‌شده' || !r.can_write;
    return `<div class="panel g" style="margin-bottom:16px">
      <div class="phd"><div class="abadge">۲۴</div><div style="flex:1">
        <h3>گزارش ۲۴ ساعته — شیفت ${E(r.shift_fa)}ِ ${D(r.date)}</h3>
        <div class="sub">سنجه‌ی الف‑۴‑۳‑۱: گزارش روزانه‌ی سوپروایزر، بررسی‌شده توسط تیم رهبری با اقدام اصلاحی</div></div>
        <span class="badge ${rep.status === 'بررسی‌شده' ? 'ok' : (rep.status === 'ثبت‌شده' ? 'warn' : '')}">${E(rep.status || 'هنوز شروع نشده')}</span>
      </div>
      <div class="pbody">
        <div class="sd-note" style="margin-bottom:12px">${I('info')}<div>
          سرشماریِ این شیفت خودکار از فهرستِ حضور خوانده شد:
          <b>${F(hc.on_duty || 0)}</b> سرِ شیفت از <b>${F(hc.expected || 0)}</b> نفرِ برنامه
          (غایب ${F(hc['غایب'] || 0)} · تأخیر ${F(hc['تأخیر'] || 0)} · جانشین ${F(hc['جانشین'] || 0)} · ثبت‌نشده ${F(hc['ثبت‌نشده'] || 0)}).
          ${rep.status && rep.status !== 'پیش‌نویس' ? 'این عدد در لحظه‌ی ثبت قفل شده است.' : 'با ثبتِ گزارش این عدد قفل می‌شود.'}
        </div></div>
        <div class="fg"><label>شرح رویدادهای شیفت</label>
          <textarea id="sa_events" rows="4" ${locked ? 'disabled' : ''}
            placeholder="حوادث، مشکلات بخش‌ها، کمبود نیرو یا تجهیزات، موارد بحرانی بیماران…">${E(rep.events || '')}</textarea></div>
        <div class="fg"><label>اقدامات انجام‌شده در همین شیفت</label>
          <textarea id="sa_actions" rows="3" ${locked ? 'disabled' : ''}
            placeholder="چه کاری برای هر رویداد انجام شد و با چه کسی هماهنگ شد">${E(rep.actions || '')}</textarea></div>
        <div class="fg"><label>موارد تحویلی به شیفت بعد</label>
          <textarea id="sa_handover" rows="3" ${locked ? 'disabled' : ''}
            placeholder="کارهای نیمه‌تمام و پیگیری‌هایی که شیفت بعد باید ادامه دهد">${E(rep.handover || '')}</textarea></div>
        ${locked ? '' : `<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
          <button class="btn btn-o btn-sm" onclick="saSaveReport(false)">${I('edit')} ذخیره‌ی پیش‌نویس</button>
          <button class="btn btn-g btn-sm" onclick="saSaveReport(true)">${I('check')} ثبتِ نهایی و ارسال به تیم رهبری</button>
        </div>`}
      </div>
    </div>
    ${rep.id ? saReviewBoxHtml(r, rep) : ''}`;
  }

  function saReviewBoxHtml(r, rep) {
    const done = rep.status === 'بررسی‌شده';
    if (!r.can_review && !done) {
      return `<div class="panel g"><div class="pbody sub">در انتظار بررسی تیم رهبری و مدیریت.</div></div>`;
    }
    return `<div class="panel g">
      <div class="phd"><div class="abadge">✍</div><div><h3>بررسی تیم رهبری و مدیریت</h3>
        <div class="sub">${done ? `بررسی‌شده توسط ${E(rep.reviewed_by_name || '—')} — ${D(rep.reviewed_at)}` : 'بند دومِ سنجه: بررسی روزانه و اقدام اصلاحی'}</div></div></div>
      <div class="pbody">
        <div class="fg"><label>نظر بررسی‌کننده</label>
          <textarea id="sa_rvnote" rows="2" ${done || !r.can_review ? 'disabled' : ''}>${E(rep.review_note || '')}</textarea></div>
        <div class="fg"><label>اقدام اصلاحی لازم</label>
          <textarea id="sa_rvact" rows="2" ${done || !r.can_review ? 'disabled' : ''}
            placeholder="اگر لازم نیست، صریح بنویسید «اقدام اصلاحی لازم نبود» — خالی‌گذاشتن مدرک نیست">${E(rep.corrective_action || '')}</textarea></div>
        ${done || !r.can_review ? '' : `<button class="btn btn-g btn-sm" style="margin-top:8px"
          onclick="saReviewReport('${rep.id}')">${I('check')} ثبت بررسی</button>`}
      </div>
    </div>`;
  }

  global.saSaveReport = async function (submit) {
    if (submit && !await BTN.confirmDanger('گزارش ثبتِ نهایی شود؟ بعد از بررسی تیم رهبری دیگر قابل ویرایش نیست.')) return;
    try {
      await API.saReportSave({
        date: SA.date, shift: SA.shift, submit,
        events: $('sa_events').value, actions: $('sa_actions').value, handover: $('sa_handover').value,
      });
      T(submit ? 'گزارش ثبت شد' : 'پیش‌نویس ذخیره شد');
      SA.report = await API.saReport(SA.date, SA.shift);
      SA.list = null;
      saDraw();
    } catch (err) { T(err.message, true); }
  };

  global.saReviewReport = async function (id) {
    try {
      await API.saReportReview(id, { review_note: $('sa_rvnote').value, corrective_action: $('sa_rvact').value });
      T('بررسی ثبت شد');
      SA.report = await API.saReport(SA.date, SA.shift);
      SA.list = null;
      saDraw();
    } catch (err) { T(err.message, true); }
  };

  /* ---------- تب بایگانی ---------- */
  function saListHtml() {
    const l = SA.list;
    if (!l) return '<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
    return `<div class="panel g">
      <div class="phd"><div class="abadge">${I('list')}</div><div style="flex:1"><h3>بایگانی گزارش‌های ۲۴ ساعته</h3>
        <div class="sub">${l.pending_review ? `${F(l.pending_review)} گزارش در انتظار بررسی تیم رهبری` : 'همه‌ی گزارش‌های ثبت‌شده بررسی شده‌اند'}</div></div>
      </div>
      <div class="pbody" style="padding-top:0">
        ${!l.items.length ? '<div class="empty">هنوز گزارشی ثبت نشده است</div>' : `
        <div class="tbl-wrap"><table><thead><tr>
          <th>تاریخ</th><th>شیفت</th><th>سوپروایزر</th><th>سرِ شیفت</th><th>غایب</th>
          <th>وضعیت</th><th>بررسی‌کننده</th><th style="width:80px"></th>
        </tr></thead><tbody>
        ${l.items.map(r => `<tr>
          <td>${D(r.report_date)}</td>
          <td>${E(r.shift_fa)} <b style="direction:ltr">${E(r.shift_code)}</b></td>
          <td>${E(r.supervisor_name || '—')}</td>
          <td>${F((r.headcount && r.headcount.on_duty) || 0)}</td>
          <td>${F((r.headcount && r.headcount['غایب']) || 0)}</td>
          <td><span class="badge ${r.status === 'بررسی‌شده' ? 'ok' : (r.status === 'ثبت‌شده' ? 'warn' : '')}">${E(r.status)}</span></td>
          <td>${E(r.reviewed_by_name || '—')}</td>
          <td><button class="btn btn-o btn-sm" onclick="saOpenReport('${E(r.report_date)}','${E(r.shift_code)}')">باز کردن</button></td>
        </tr>`).join('')}
        </tbody></table></div>`}
      </div>
    </div>`;
  }

  global.saOpenReport = async function (date, shift) {
    SA.date = date; SA.shift = shift; SA.report = null;
    await saLoad();
    await saSelectTab('report');
  };
})(window);
