/* =====================================================================
   پرسنل بخش و برنامه‌ی ماهانه‌ی شیفت
   ---------------------------------------------------------------------
   منبع: فایل اکسلی که کارفرما خودش برای شیفت‌بندی می‌ساخت. منطق محاسبه
   (M=صبح, E=عصر, N=شب, H=مرخصی؛ ساعتِ هر حرف و اضافه/کسری‌کار) دقیقاً از
   فرمول‌های همان فایل کپی شده — توضیح کامل در src/routes/api.js بخش
   «پرسنل بخش و برنامه‌ی ماهانه‌ی شیفت».

   سه تب: «پرسنل» (افزودن/ویرایش کارمند)، «برنامه‌ی شیفت» (گرید ماهانه با
   تنظیمِ ساعتِ هر شیفت و تعطیلات دستی)، و چاپِ یک‌صفحه‌ای A4 افقی با آرم و
   امضاها — قالبِ چاپ (کد فرم، یادآوری‌ها، برچسبِ امضاها، تماس‌ها) از تب
   «تنظیمات بیمارستان» (سطح hospital، manage_hospital_settings) قابل‌تغییر
   است، هرجا کاربر بخواهد صدایش بزند؛ این‌جا هم یک میان‌بر برایش گذاشته شده
   تا لازم نباشد صفحه عوض شود.

   دسترسی از همان مدل سرپرستار/جانشین بخش استفاده می‌کند — چیزی که
   super-devchat.js/super-docs.js هم برایش کردند: فایل جدا تا app.js
   بیشتر باد نکند.
   ===================================================================== */
(function (global) {
  'use strict';
  const e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const I = (n, c) => (typeof ic === 'function' ? ic(n, c) : '');
  const F = n => (typeof fa === 'function' ? fa(n) : String(n));
  const JM = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  const WEEKDAY_FA = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
  const WEEKDAY_SHORT = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'];
  // ردیف‌های شمارشِ نفرات — دقیقاً مثل ردیف‌های ۳۰/۳۱/۳۲ اکسل کارفرما که برای
  // هر شیفت یک ردیفِ جدا داشت، نه یک ردیفِ درهمِ «M/E/N». مرخصی هم اضافه شد
  // چون سرپرستار موقع چیدن برنامه لازم دارد بداند آن روز چند نفر مرخصی‌اند.
  const SHIFT_COUNT_ROWS = [
    { k: 'M', label: 'تعداد نفراتِ شیفت صبح (M)' },
    { k: 'E', label: 'تعداد نفراتِ شیفت عصر (E)' },
    { k: 'N', label: 'تعداد نفراتِ شیفت شب (N)' },
    { k: 'H', label: 'تعداد نفراتِ مرخصی (H)' },
  ];
  // حروف همیشه لاتین‌اند (خواسته‌ی صریح کارفرما) و ترتیب بر اساس ساعتِ کار است، نه
  // الفبا — سرپرستار موقع چیدن برنامه به «چقدر کار» فکر می‌کند، نه به حرف. ساعتِ
  // کنارِ هر گزینه از تنظیماتِ همان بخش خوانده می‌شود، نه عددِ ثابت، چون
  // shift_ward_settings برای هر بخش جداست.
  const SHIFT_PRESETS = [
    { k: 'M', label: 'M — صبح', hours: s => s.hour_m },
    { k: 'E', label: 'E — عصر', hours: s => s.hour_e },
    { k: 'N', label: 'N — شب', hours: s => s.hour_n },
    { k: 'ME', label: 'ME — لانگ (صبح+عصر)', hours: s => s.hour_m + s.hour_e },
    { k: 'EN', label: 'EN — عصر+شب', hours: s => s.hour_e + s.hour_n },
    { k: 'MN', label: 'MN — صبح+شب', hours: s => s.hour_m + s.hour_n },
    { k: 'MEN', label: 'MEN — ۲۴ ساعته (فول)', hours: s => s.hour_m + s.hour_e + s.hour_n },
    { k: 'H', label: 'H — مرخصی', hours: s => s.hour_h },
  ];

  const SS = { wards: [], wardTitle: null, tab: 'staff', year: null, month: null,
    staff: [], sched: null, settings: null, canEdit: false, showSettings: false, showPrintCfg: false, printCfg: null,
    showCustomRows: false, showUnits: false, canManageUnits: false, units: [] };

  function todayJ() {
    if (typeof todayJalali === 'function') return todayJalali();
    return { jy: 1404, jm: 1, jd: 1 };
  }
  function weekdayOf(jy, jm, jd) {
    if (typeof toGregorian !== 'function') return '';
    const g = toGregorian(jy, jm, jd);
    return new Date(Date.UTC(g.gy, g.gm - 1, g.gd)).getUTCDay();
  }
  const canManageHospitalSettings = () => ((S.user && S.user.permissions) || []).includes('manage_hospital_settings');

  async function loadWards() {
    const wards = new Map();
    try {
      const mine = await API.hnMyWards();
      (mine.wards || []).forEach(w => wards.set(w.title, w));
    } catch (e2) { /* سرپرستار/جانشین هیچ بخشی نیست — طبیعی است */ }
    const perms = (S.user && S.user.permissions) || [];
    if (perms.includes('manage_nursing_hierarchy') || perms.includes('view_nursing_hierarchy')) {
      try {
        const all = await API.nursingHierarchy();
        (all.wards || []).forEach(w => wards.set(w.title, w));
      } catch (e2) { /* دسترسی ندارد — نادیده گرفته می‌شود */ }
    }
    // واحدهای دلخواه (خدمات، تأسیسات، نگهبانی، آشپزخانه…) — برنامه‌ی شیفت فقط
    // مالِ پرستاری نیست؛ کارفرما خواست برای کارکنان پشتیبانی هم کار کند.
    try {
      const u = await API.shiftUnits();
      SS.canManageUnits = !!u.can_manage;
      (u.units || []).forEach(x => wards.set(x.title, { id: x.id, title: x.title, kind: x.kind, custom: true }));
    } catch (e2) { /* بدون واحد دلخواه هم بخش‌های پرستاری کار می‌کنند */ }
    return [...wards.values()];
  }

  global.renderShiftSchedule = async function () {
    $('ptitle').textContent = 'پرسنل و برنامه‌ی شیفت';
    $('content').innerHTML = '<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
    try {
      SS.wards = await loadWards();
      if (!SS.wards.length) {
        $('content').innerHTML = '<div class="panel g"><div class="empty">شما سرپرستار/جانشین هیچ بخشی نیستید و دسترسی نظارتی هم ندارید.</div></div>';
        return;
      }
      if (!SS.wardTitle || !SS.wards.some(w => w.title === SS.wardTitle)) SS.wardTitle = SS.wards[0].title;
      if (!SS.year) { const t = todayJ(); SS.year = t.jy; SS.month = t.jm; }
      await ssLoadAll();
    } catch (err) { $('content').innerHTML = `<div class="panel g"><div class="empty">${e(err.message)}</div></div>`; }
  };

  global.ssSelectWard = async function (title) { SS.wardTitle = title; await ssLoadAll(); };
  global.ssSelectTab = function (t) { SS.tab = t; ssDraw(); };
  global.ssChangeMonth = async function (delta) {
    let m = SS.month + delta, y = SS.year;
    if (m < 1) { m = 12; y--; } else if (m > 12) { m = 1; y++; }
    SS.year = y; SS.month = m;
    await ssLoadAll();
  };

  async function ssLoadAll() {
    const [staffRes, schedRes] = await Promise.all([
      API.shiftStaffList(SS.wardTitle),
      API.shiftSchedule(SS.wardTitle, SS.year, SS.month),
    ]);
    SS.staff = staffRes.staff || [];
    SS.canEdit = !!staffRes.can_edit;
    SS.sched = schedRes;
    SS.settings = schedRes.settings;
    ssDraw();
  }

  function ssDraw() {
    $('content').innerHTML = `
    <div class="panel g noprint" style="margin-bottom:16px">
      <div class="phd">${I('users', 'lg')}<div><h3>بخش‌ها</h3><div class="sub">پرسنل و برنامه‌ی شیفت بخش انتخابی</div></div></div>
      <div class="pbody" style="display:flex;gap:8px;flex-wrap:wrap">
        ${SS.wards.map(w => `<button class="btn ${w.title === SS.wardTitle ? 'btn-g' : 'btn-o'} btn-sm" onclick="ssSelectWard('${e(w.title)}')">${e(w.title)}</button>`).join('')}
      </div>
      <div class="pbody" style="padding-top:0;display:flex;gap:8px">
        <button class="btn ${SS.tab === 'staff' ? 'btn-g' : 'btn-o'} btn-sm" onclick="ssSelectTab('staff')">${I('user')} پرسنل</button>
        <button class="btn ${SS.tab === 'grid' ? 'btn-g' : 'btn-o'} btn-sm" onclick="ssSelectTab('grid')">${I('calendar')} برنامه‌ی شیفت</button>
      </div>
    </div>
    ${SS.tab === 'staff' ? ssStaffHtml() : ssGridHtml()}
`;
  }

  /* ---------------- تب پرسنل ---------------- */
  function ssStaffHtml() {
    return `<div class="panel g noprint">
      <div class="phd">${I('user', 'lg')}<div style="flex:1"><h3>پرسنل بخش «${e(SS.wardTitle)}»</h3>
        <div class="sub">این افراد لزوماً کاربر سامانه نیستند — فقط برای برنامه‌ی شیفت ثبت می‌شوند</div></div>
        ${SS.canEdit ? `<button class="btn btn-g btn-sm" onclick="ssOpenStaffForm()">${I('plus')} پرسنل تازه</button>` : ''}
      </div>
      <div class="pbody" style="padding-top:0">
        <div id="ssStaffForm"></div>
        ${!SS.staff.length ? '<div class="empty">هنوز پرسنلی ثبت نشده</div>' : `
        <div class="tbl-wrap"><table><thead><tr>
          <th>نام و نام‌خانوادگی</th><th>جنسیت</th><th>کد پرسنلی</th><th>موبایل</th><th>سمت</th>
          <th>سابقه (سال)</th><th>سقف ساعت ماهانه</th><th style="width:120px"></th>
        </tr></thead><tbody>
        ${SS.staff.map(s => `<tr>
          <td>${e(s.first_name)} ${e(s.last_name)}</td>
          <td>${e(s.gender)}</td>
          <td style="direction:ltr;text-align:left">${e(s.personnel_code || '—')}</td>
          <td style="direction:ltr;text-align:left">${e(s.mobile || '—')}</td>
          <td>${e(s.position || '—')}</td>
          <td>${s.years_experience == null ? '—' : F(s.years_experience)}</td>
          <td>${F(s.monthly_hour_quota)}</td>
          <td style="white-space:nowrap">
            ${SS.canEdit ? `<button class="btn btn-o btn-sm" onclick="ssOpenStaffForm('${s.id}')" aria-label="ویرایش">${I('edit')}</button>
            <button class="btn btn-o btn-sm" onclick="ssDeleteStaff('${s.id}')" aria-label="حذف">${I('trash')}</button>` : ''}
          </td>
        </tr>`).join('')}
        </tbody></table></div>`}
      </div>
    </div>`;
  }

  global.ssOpenStaffForm = function (id) {
    const st = id ? SS.staff.find(s => s.id === id) : null;
    const info = st ? (st.extra_info || {}) : {};
    document.getElementById('ssStaffForm').innerHTML = `
    <div class="panel g" style="margin-bottom:16px;background:var(--bg)">
      <div class="pbody">
        <div class="docgrid">
          <div class="fg"><label>نام</label><input id="ss_fn" value="${e(st ? st.first_name : '')}"></div>
          <div class="fg"><label>نام‌خانوادگی</label><input id="ss_ln" value="${e(st ? st.last_name : '')}"></div>
          <div class="fg"><label>جنسیت</label>
            <select id="ss_gender"><option value="زن" ${(!st || st.gender === 'زن') ? 'selected' : ''}>زن</option>
              <option value="مرد" ${st && st.gender === 'مرد' ? 'selected' : ''}>مرد</option></select></div>
          <div class="fg"><label>کد پرسنلی</label><input id="ss_code" style="direction:ltr" value="${e(st ? st.personnel_code || '' : '')}"></div>
          <div class="fg"><label>شماره موبایل</label><input id="ss_mobile" style="direction:ltr" value="${e(st ? st.mobile || '' : '')}"></div>
          <div class="fg"><label>سمت</label><input id="ss_position" value="${e(st ? st.position || '' : '')}"></div>
          <div class="fg"><label>تاریخ استخدام (شمسی، اختیاری)</label><input id="ss_hire" placeholder="مثلاً 1401-05-01" style="direction:ltr" value="${e(st ? st.hire_date || '' : '')}"></div>
          <div class="fg"><label>سابقه‌ی کار (سال)</label><input id="ss_exp" type="number" min="0" max="60" value="${st && st.years_experience != null ? st.years_experience : ''}"></div>
          <div class="fg"><label>سقف ساعت کاری ماهانه</label><input id="ss_quota" type="number" value="${st ? st.monthly_hour_quota : 169}"></div>
        </div>
        <details style="margin-top:10px"><summary style="cursor:pointer;font-size:12.5px;color:var(--gdl)">اطلاعات بیشتر (اختیاری)</summary>
          <div class="docgrid" style="margin-top:8px">
            <div class="fg"><label>کد ملی</label><input id="ss_x_nid" style="direction:ltr" value="${e(info.national_id || '')}"></div>
            <div class="fg"><label>مدرک تحصیلی</label><input id="ss_x_edu" value="${e(info.education || '')}"></div>
            <div class="fg"><label>وضعیت تأهل</label><input id="ss_x_marital" value="${e(info.marital_status || '')}"></div>
            <div class="fg" style="grid-column:span 2"><label>آدرس</label><input id="ss_x_address" value="${e(info.address || '')}"></div>
            <div class="fg" style="grid-column:span 2"><label>یادداشت آزاد</label><textarea id="ss_x_note" rows="2">${e(info.note || '')}</textarea></div>
          </div>
        </details>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-g btn-sm" onclick="ssSaveStaff(${st ? `'${st.id}'` : 'null'})">${I('check')} ذخیره</button>
          <button class="btn btn-o btn-sm" onclick="document.getElementById('ssStaffForm').innerHTML=''">انصراف</button>
        </div>
      </div>
    </div>`;
  };

  global.ssSaveStaff = async function (id) {
    const body = {
      ward: SS.wardTitle,
      first_name: document.getElementById('ss_fn').value.trim(),
      last_name: document.getElementById('ss_ln').value.trim(),
      gender: document.getElementById('ss_gender').value,
      personnel_code: document.getElementById('ss_code').value.trim(),
      mobile: document.getElementById('ss_mobile').value.trim(),
      position: document.getElementById('ss_position').value.trim(),
      hire_date: document.getElementById('ss_hire').value.trim(),
      monthly_hour_quota: document.getElementById('ss_quota').value,
      years_experience: document.getElementById('ss_exp').value === '' ? null : document.getElementById('ss_exp').value,
      extra_info: {
        national_id: document.getElementById('ss_x_nid').value.trim(),
        education: document.getElementById('ss_x_edu').value.trim(),
        marital_status: document.getElementById('ss_x_marital').value.trim(),
        address: document.getElementById('ss_x_address').value.trim(),
        note: document.getElementById('ss_x_note').value.trim(),
      },
    };
    try {
      if (id) await API.shiftStaffUpdate(id, body); else await API.shiftStaffAdd(body);
      if (typeof toast === 'function') toast('ذخیره شد');
      await ssLoadAll();
    } catch (err) { if (typeof toast === 'function') toast(err.message, true); else BTN.alert(err.message); }
  };

  global.ssDeleteStaff = async function (id) {
    if (!await BTN.confirmDanger('این پرسنل حذف شود؟ (از سطل بازیافت سوپرادمین قابل بازگردانی است)')) return;
    try { await API.shiftStaffDelete(id); await ssLoadAll(); }
    catch (err) { if (typeof toast === 'function') toast(err.message, true); else BTN.alert(err.message); }
  };

  /* ---------------- تب برنامه‌ی شیفت ---------------- */
  function ssGridHtml() {
    const sc = SS.sched.schedule, days = sc.days, st = SS.settings;
    const holidays = new Set(sc.holidays || []);
    const hc = SS.sched.headcount;
    // SS.staff (تب پرسنل) فقط روستر خام است؛ سلول‌ها و کارکرد/اضافه‌کارِ محاسبه‌شده
    // فقط در پاسخِ endpoint برنامه هست (SS.sched.staff) — دو منبع را قاطی نکنیم.
    const gridStaff = SS.sched.staff || [];
    const dayCols = Array.from({ length: days }, (_, i) => i + 1);
    return `<div class="panel g noprint" style="margin-bottom:16px">
      <div class="phd">${I('calendar', 'lg')}<div style="flex:1"><h3>برنامه‌ی ${JM[SS.month - 1]} ${F(SS.year)} — بخش «${e(SS.wardTitle)}»</h3>
        <div class="sub">روی هر خانه کلیک کنید تا شیفت را تنظیم کنید؛ روی شماره‌ی روز کلیک کنید تا تعطیل دستی شود</div></div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <!-- در راست‌به‌چپ «قبل» به راست اشاره می‌کند و «بعد» به چپ — برعکسِ LTR -->
          <button class="btn btn-o btn-sm" onclick="ssChangeMonth(-1)">▸ ماه قبل</button>
          <button class="btn btn-o btn-sm" onclick="ssChangeMonth(1)">ماه بعد ◂</button>
          ${SS.canEdit ? `<button class="btn btn-o btn-sm" onclick="ssToggleSettings()">${I('settings')} ساعتِ شیفت</button>` : ''}
          ${SS.canEdit ? `<button class="btn btn-o btn-sm" onclick="ssToggleCustomRows()">${I('plus')} سطر دلخواه</button>` : ''}
          ${SS.canManageUnits ? `<button class="btn btn-o btn-sm" onclick="ssToggleUnits()">${I('grid')} واحدها</button>` : ''}
          ${canManageHospitalSettings() ? `<button class="btn btn-o btn-sm" onclick="ssTogglePrintCfg()">${I('edit')} قالب چاپ</button>` : ''}
          <button class="btn btn-g btn-sm" onclick="ssPrint()">${I('print')} چاپ یک‌صفحه‌ای</button>
        </div>
      </div>
      <div class="pbody" style="padding-top:0">
        <div id="ssSettingsPanel">${SS.showSettings ? ssSettingsHtml() : ''}</div>
        <div id="ssPrintCfgPanel">${SS.showPrintCfg ? (SS.printCfg ? ssPrintCfgHtml() : '<div class="empty">در حال بارگذاری…</div>') : ''}</div>
        <div id="ssCustomRowsPanel">${SS.showCustomRows ? ssCustomRowsHtml() : ''}</div>
        <div id="ssUnitsPanel">${SS.showUnits ? ssUnitsHtml() : ''}</div>
        <div class="docgrid">
          <div class="fg"><label>یادداشت بالای برنامه (مثلاً «۲۶ روز کاری»)</label>
            <input id="ssNote" value="${e(sc.note || '')}" ${SS.canEdit ? '' : 'disabled'}
              onchange="ssSaveNote(this.value)"></div>
          <div class="fg"><label>توضیحاتِ زیر برگه‌ی چاپی (اختیاری، مخصوصِ همین ماه)</label>
            <textarea id="ssDesc" rows="2" ${SS.canEdit ? '' : 'disabled'}
              onchange="ssSaveDescription(this.value)"
              placeholder="هر توضیحی که باید پای برنامه‌ی همین ماه چاپ شود">${e(sc.description || '')}</textarea></div>
        </div>
        ${!gridStaff.length ? '<div class="empty">اول از تب «پرسنل» چند نفر اضافه کنید</div>' : `
        <div class="tbl-wrap ss-grid-wrap"><table class="ss-grid">
          <thead>
          <tr><th class="ss-sticky" colspan="5">روز هفته</th>
            ${dayCols.map(d => `<th style="font-size:9.5px;font-weight:400">${WEEKDAY_SHORT[weekdayOf(SS.year, SS.month, d)] || ''}</th>`).join('')}
            <th colspan="3"></th></tr>
          <tr>
            <th class="ss-sticky ss-c-num">ردیف</th>
            <th class="ss-c-name">نام و نام‌خانوادگی</th>
            <th class="ss-c-pos">سمت</th>
            <th class="ss-c-code">کد پرسنلی</th>
            <th class="ss-c-exp">سابقه</th>
            ${dayCols.map(d => `<th class="${holidays.has(d) ? 'ss-holiday' : ''}" ${SS.canEdit ? `onclick="ssToggleHoliday(${d})" style="cursor:pointer"` : ''}
              title="${holidays.has(d) ? 'تعطیل — برای برداشتن کلیک کنید' : 'برای تعطیل‌کردن این روز کلیک کنید'}">${F(d)}</th>`).join('')}
            <th>کارکرد کل</th><th>سقف</th><th>اضافه/کسری‌کار</th>
          </tr></thead>
          <tbody>
          ${gridStaff.map((s, i) => `<tr>
            <td class="ss-sticky ss-c-num">${F(i + 1)}</td>
            <td class="ss-c-name">${e(s.first_name)} ${e(s.last_name)}</td>
            <td class="ss-c-pos">${e(s.position || '')}</td>
            <td class="ss-c-code">${e(s.personnel_code || '')}</td>
            <td class="ss-c-exp">${s.years_experience == null ? '' : F(s.years_experience)}</td>
            ${dayCols.map(d => {
              const code = (s.cells && s.cells[d]) || '';
              return `<td class="ss-cell ${code ? 'ss-' + code : ''}${holidays.has(d) ? ' ss-holiday-col' : ''}" onclick="ssEditCell('${s.id}',${d},'${e(code)}')" title="${code || 'خالی'}">${e(code)}</td>`;
            }).join('')}
            <td><b>${F(s.total_hours)}</b></td>
            <td>${F(s.monthly_hour_quota)}</td>
            <td class="${s.overtime > 0 ? 'ss-pos' : (s.overtime < 0 ? 'ss-neg' : '')}">${s.overtime > 0 ? '+' : ''}${F(s.overtime)}</td>
          </tr>`).join('')}
          ${SHIFT_COUNT_ROWS.map(r => `<tr class="ss-hc-row ss-hc-${r.k}">
            <td class="ss-sticky" colspan="5">${e(r.label)}</td>
            ${dayCols.map(d => `<td>${F(hc[d][r.k])}</td>`).join('')}
            <td colspan="3"></td></tr>`).join('')}
          </tbody>
        </table></div>
        <div class="sd-note" style="margin-top:12px">${I('info')}
          <div>M=صبح (${F(st.hour_m)}ساعت، ${e(st.clock_m)})، E=عصر (${F(st.hour_e)}ساعت، ${e(st.clock_e)})،
          N=شب (${F(st.hour_n)}ساعت، ${e(st.clock_n)})، H=مرخصی (${F(st.hour_h)}ساعت بستانکار).
          ترکیب‌های رایج: <b>ME</b> لانگ (${F(st.hour_m + st.hour_e)}س)، <b>EN</b> عصر+شب (${F(st.hour_e + st.hour_n)}س)،
          <b>MEN</b> بیست‌وچهار ساعته (${F(st.hour_m + st.hour_e + st.hour_n)}س).
          H با شیفت دیگری در یک روز ترکیب نمی‌شود.
          سقف ساعت ماهانه‌ی هر نفر از تب «پرسنل» قابل‌تغییر است.</div></div>`}
      </div>
    </div>`;
  }

  /* ---- تنظیمِ ساعتِ هر شیفت — معادلِ ردیف‌های AG30:AJ32 اکسل ---- */
  function ssSettingsHtml() {
    const st = SS.settings;
    return `<div class="panel g" style="margin-bottom:16px;background:var(--bg)">
      <div class="pbody">
        <div class="docgrid">
          <div class="fg"><label>ساعتِ شیفت صبح (M)</label><input id="ss_hm" type="number" min="0" max="24" value="${st.hour_m}"></div>
          <div class="fg"><label>بازه‌ی ساعت صبح (نمایشی)</label><input id="ss_cm" style="direction:ltr" value="${e(st.clock_m)}"></div>
          <div class="fg"><label>ساعتِ شیفت عصر (E)</label><input id="ss_he" type="number" min="0" max="24" value="${st.hour_e}"></div>
          <div class="fg"><label>بازه‌ی ساعت عصر (نمایشی)</label><input id="ss_ce" style="direction:ltr" value="${e(st.clock_e)}"></div>
          <div class="fg"><label>ساعتِ شیفت شب (N)</label><input id="ss_hn" type="number" min="0" max="24" value="${st.hour_n}"></div>
          <div class="fg"><label>بازه‌ی ساعت شب (نمایشی)</label><input id="ss_cn" style="direction:ltr" value="${e(st.clock_n)}"></div>
          <div class="fg"><label>ساعتِ بستانکارِ مرخصی (H)</label><input id="ss_hh" type="number" min="0" max="24" value="${st.hour_h}"></div>
        </div>
        <button class="btn btn-g btn-sm" style="margin-top:8px" onclick="ssSaveSettings()">${I('check')} ذخیره‌ی ساعتِ شیفت این بخش</button>
      </div>
    </div>`;
  }
  global.ssToggleSettings = function () { SS.showSettings = !SS.showSettings; ssDraw(); };
  global.ssSaveSettings = async function () {
    try {
      const r = await API.shiftSetSettings({
        ward: SS.wardTitle,
        hour_m: document.getElementById('ss_hm').value, clock_m: document.getElementById('ss_cm').value,
        hour_e: document.getElementById('ss_he').value, clock_e: document.getElementById('ss_ce').value,
        hour_n: document.getElementById('ss_hn').value, clock_n: document.getElementById('ss_cn').value,
        hour_h: document.getElementById('ss_hh').value,
      });
      SS.settings = r.settings;
      if (typeof toast === 'function') toast('ساعتِ شیفت ذخیره شد');
      await ssLoadAll();
    } catch (err) { if (typeof toast === 'function') toast(err.message, true); else BTN.alert(err.message); }
  };

  /* ---- قالب چاپ (کد فرم، یادآوری‌ها، امضاها، تماس‌ها) ---- */
  global.ssTogglePrintCfg = async function () {
    SS.showPrintCfg = !SS.showPrintCfg;
    if (SS.showPrintCfg && !SS.printCfg) {
      try { SS.printCfg = (await API.shiftGetPrintConfig()).config; } catch (e2) { /* اگر نشد، پیش‌فرض در سرور است */ }
    }
    ssDraw();
  };
  // «این یک فرم سازمانی است، پس باید کد دفترچه مثل سایر کدها بخورد» — سرور سندِ
  // کنترل‌شده را می‌سازد (یا همان قبلی را برمی‌گرداند) و کدش را در قالبِ چاپ می‌نشاند.
  window.ssRegisterForm = async function () {
    try {
      const r = await API.shiftRegisterForm();
      SS.printCfg = r.config;
      toast('کد فرم در دفترچه مدارک ثبت شد: ' + r.document.doc_code);
      const box = document.getElementById('ssPrintCfgPanel');
      if (box) box.innerHTML = ssPrintCfgHtml();
    } catch (err) { toast(err.message, true); }
  };

  function ssPrintCfgHtml() {
    const c = SS.printCfg || { form_code: '', revision_date: '', reminders: [], signatures: ['', '', ''], contacts: [] };
    return `<div class="panel g" style="margin-bottom:16px;background:var(--bg)">
      <div class="pbody">
        <div class="sub" style="margin-bottom:8px">این قالب سراسریِ همان بیمارستان است و روی برگه‌ی چاپیِ همه‌ی بخش‌ها اثر می‌گذارد.</div>
        <div class="docgrid">
          <div class="fg"><label>کد فرم</label>
            <input id="ss_pc_code" style="direction:ltr" value="${e(c.form_code)}">
            <div style="margin-top:6px">
              <button class="btn btn-o btn-sm" onclick="ssRegisterForm()">${c.document_id ? 'ثبت‌شده در دفترچه کد ✔ — گرفتن مجدد' : 'گرفتن کد از دفترچه مدارک'}</button>
              <span class="sub" style="margin-right:6px">این برگه یک فرم سازمانی است؛ با این دکمه به‌عنوان «فرم» در دفترچه کد ثبت می‌شود و کد استانداردش این‌جا می‌نشیند.</span>
            </div></div>
          <div class="fg"><label>تاریخ آخرین بازنگری</label><input id="ss_pc_rev" style="direction:ltr" placeholder="1405/01/01" value="${e(c.revision_date)}"></div>
        </div>
        <div class="fg"><label>یادآوری‌ها (هر خط یک یادآوری)</label>
          <textarea id="ss_pc_rem" rows="3">${e((c.reminders || []).join('\n'))}</textarea></div>
        <div class="docgrid">
          <div class="fg"><label>برچسبِ امضای ۱</label><input id="ss_pc_sig0" value="${e((c.signatures || [])[0] || '')}"></div>
          <div class="fg"><label>برچسبِ امضای ۲</label><input id="ss_pc_sig1" value="${e((c.signatures || [])[1] || '')}"></div>
          <div class="fg"><label>برچسبِ امضای ۳</label><input id="ss_pc_sig2" value="${e((c.signatures || [])[2] || '')}"></div>
        </div>
        <div class="fg"><label>اطلاعات تماس (هر خط یک سطر)</label>
          <textarea id="ss_pc_contacts" rows="3">${e((c.contacts || []).join('\n'))}</textarea></div>
        <button class="btn btn-g btn-sm" onclick="ssSavePrintCfg()">${I('check')} ذخیره‌ی قالب چاپ</button>
      </div>
    </div>`;
  }
  global.ssSavePrintCfg = async function () {
    const lines = id => document.getElementById(id).value.split('\n').map(s => s.trim()).filter(Boolean);
    try {
      const r = await API.shiftSetPrintConfig({
        form_code: document.getElementById('ss_pc_code').value.trim(),
        revision_date: document.getElementById('ss_pc_rev').value.trim(),
        reminders: lines('ss_pc_rem'),
        signatures: [document.getElementById('ss_pc_sig0').value.trim(), document.getElementById('ss_pc_sig1').value.trim(), document.getElementById('ss_pc_sig2').value.trim()],
        contacts: lines('ss_pc_contacts'),
      });
      SS.printCfg = r.config;
      if (typeof toast === 'function') toast('قالب چاپ ذخیره شد');
      ssDraw();
    } catch (err) { if (typeof toast === 'function') toast(err.message, true); else BTN.alert(err.message); }
  };

  /* ---- سطرهای دلخواهِ سربرگ/پاورقی — «دقیقاً مثل اکسل» ----
     هر سطر روی کلِ عرضِ جدول مرج می‌شود؛ کارفرما همین را خواست: بتواند خودش
     متن اضافه کند، بالای جدول یا پایینش، وسط‌چین یا راست‌چین، پررنگ یا ساده. */
  global.ssToggleCustomRows = function () { SS.showCustomRows = !SS.showCustomRows; ssDraw(); };
  function ssCustomRowsHtml() {
    const rows = (SS.sched.schedule.custom_rows || []);
    return `<div class="panel g" style="margin-bottom:16px;background:var(--bg)">
      <div class="pbody">
        <div class="sub" style="margin-bottom:8px">هر سطر روی تمام عرضِ جدول مرج می‌شود و بالای (سربرگ) یا پایینِ (پاورقی) برنامه چاپ می‌شود.</div>
        <div id="ssCrList">
          ${rows.map((r, i) => ssCustomRowFields(r, i)).join('') || '<div class="empty">هنوز سطری اضافه نشده</div>'}
        </div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn btn-o btn-sm" onclick="ssAddCustomRow()">${I('plus')} سطر تازه</button>
          <button class="btn btn-g btn-sm" onclick="ssSaveCustomRows()">${I('check')} ذخیره‌ی سطرها</button>
        </div>
      </div>
    </div>`;
  }
  function ssCustomRowFields(r, i) {
    return `<div class="ss-cr-row" data-i="${i}">
      <select class="ss-cr-area">
        <option value="header" ${r.area !== 'footer' ? 'selected' : ''}>سربرگ (بالای جدول)</option>
        <option value="footer" ${r.area === 'footer' ? 'selected' : ''}>پاورقی (زیر جدول)</option>
      </select>
      <input class="ss-cr-text" value="${e(r.text || '')}" placeholder="متنِ سطر">
      <select class="ss-cr-align">
        <option value="center" ${r.align !== 'right' && r.align !== 'left' ? 'selected' : ''}>وسط</option>
        <option value="right" ${r.align === 'right' ? 'selected' : ''}>راست</option>
        <option value="left" ${r.align === 'left' ? 'selected' : ''}>چپ</option>
      </select>
      <label class="ss-cr-bold"><input type="checkbox" class="ss-cr-b" ${r.bold ? 'checked' : ''}> پررنگ</label>
      <button class="btn btn-o btn-sm" onclick="this.closest('.ss-cr-row').remove()">${I('trash')}</button>
    </div>`;
  }
  global.ssAddCustomRow = function () {
    const list = document.getElementById('ssCrList');
    if (list.querySelector('.empty')) list.innerHTML = '';
    list.insertAdjacentHTML('beforeend', ssCustomRowFields({ area: 'header', text: '', align: 'center', bold: 0 }, list.children.length));
  };
  global.ssSaveCustomRows = async function () {
    const rows = [...document.querySelectorAll('#ssCrList .ss-cr-row')].map(el => ({
      area: el.querySelector('.ss-cr-area').value,
      text: el.querySelector('.ss-cr-text').value.trim(),
      align: el.querySelector('.ss-cr-align').value,
      bold: el.querySelector('.ss-cr-b').checked ? 1 : 0,
    })).filter(r => r.text);
    try {
      const r = await API.shiftSetCustomRows({ ward: SS.wardTitle, year: SS.year, month: SS.month, rows });
      SS.sched.schedule.custom_rows = r.rows;
      if (typeof toast === 'function') toast('سطرها ذخیره شد');
      ssDraw();
    } catch (err) { if (typeof toast === 'function') toast(err.message, true); else BTN.alert(err.message); }
  };

  /* ---- واحدهای دلخواه (کارکنان پشتیبانی) ---- */
  global.ssToggleUnits = function () { SS.showUnits = !SS.showUnits; ssDraw(); };
  function ssUnitsHtml() {
    const custom = SS.wards.filter(w => w.custom);
    return `<div class="panel g" style="margin-bottom:16px;background:var(--bg)">
      <div class="pbody">
        <div class="sub" style="margin-bottom:8px">برنامه‌ی شیفت فقط برای بخش‌های پرستاری نیست — واحدهای پشتیبانی (خدمات، تأسیسات، نگهبانی، آشپزخانه و…) را این‌جا تعریف کنید.</div>
        ${custom.length ? `<div class="tbl-wrap"><table><thead><tr><th>نام واحد</th><th>نوع</th><th style="width:90px"></th></tr></thead><tbody>
          ${custom.map(u => `<tr><td>${e(u.title)}</td><td>${e(u.kind || 'پشتیبانی')}</td>
            <td><button class="btn btn-o btn-sm" onclick="ssDeleteUnit('${u.id}')">${I('trash')}</button></td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty">هنوز واحد دلخواهی تعریف نشده</div>'}
        <div class="docgrid" style="margin-top:10px">
          <div class="fg"><label>نام واحد تازه</label><input id="ss_unit_title" placeholder="مثلاً واحد خدمات"></div>
          <div class="fg"><label>نوع</label><input id="ss_unit_kind" value="پشتیبانی"></div>
        </div>
        <button class="btn btn-g btn-sm" onclick="ssAddUnit()">${I('plus')} افزودن واحد</button>
      </div>
    </div>`;
  }
  global.ssAddUnit = async function () {
    const title = document.getElementById('ss_unit_title').value.trim();
    const kind = document.getElementById('ss_unit_kind').value.trim();
    if (!title) return;
    try {
      await API.shiftUnitAdd({ title, kind });
      SS.wards = await loadWards();
      if (typeof toast === 'function') toast('واحد اضافه شد');
      ssDraw();
    } catch (err) { if (typeof toast === 'function') toast(err.message, true); else BTN.alert(err.message); }
  };
  global.ssDeleteUnit = async function (id) {
    if (!await BTN.confirmDanger('این واحد حذف شود؟')) return;
    try {
      await API.shiftUnitDelete(id);
      SS.wards = await loadWards();
      if (SS.wardTitle && !SS.wards.some(w => w.title === SS.wardTitle)) SS.wardTitle = SS.wards[0] && SS.wards[0].title;
      await ssLoadAll();
    } catch (err) { if (typeof toast === 'function') toast(err.message, true); else BTN.alert(err.message); }
  };

  global.ssSaveNote = async function (v) {
    try {
      await API.shiftSetNote({ ward: SS.wardTitle, year: SS.year, month: SS.month, note: v });
      SS.sched.schedule.note = v;
    } catch (err) { if (typeof toast === 'function') toast(err.message, true); }
  };

  global.ssSaveDescription = async function (v) {
    try {
      await API.shiftSetNote({ ward: SS.wardTitle, year: SS.year, month: SS.month,
        note: SS.sched.schedule.note, description: v });
      SS.sched.schedule.description = v;
      if (typeof toast === 'function') toast('توضیحات ذخیره شد');
    } catch (err) { if (typeof toast === 'function') toast(err.message, true); }
  };

  global.ssToggleHoliday = async function (day) {
    if (!SS.canEdit) return;
    const holidays = new Set(SS.sched.schedule.holidays || []);
    if (holidays.has(day)) holidays.delete(day); else holidays.add(day);
    try {
      await API.shiftSetNote({ ward: SS.wardTitle, year: SS.year, month: SS.month, note: SS.sched.schedule.note, holidays: [...holidays] });
      await ssLoadAll();
    } catch (err) { if (typeof toast === 'function') toast(err.message, true); }
  };

  global.ssEditCell = function (staffId, day, current) {
    const letters = ['M', 'E', 'N', 'H'];
    const chosen = new Set(current.split('').filter(c => letters.includes(c)));
    const box = document.createElement('div');
    box.className = 'ss-popover';
    box.innerHTML = `<div class="ss-pop-inner">
      <div style="font-size:12px;color:var(--td);margin-bottom:8px">روز ${fa ? fa(day) : day}</div>
      <div class="ss-pop-presets">
        ${SHIFT_PRESETS.map(p => `<button type="button" class="btn btn-o btn-sm" data-preset="${p.k}">${e(p.label)}<i>${
          F(p.hours(SS.settings))} ساعت</i></button>`).join('')}
      </div>
      <div style="height:1px;background:var(--bd);margin:8px 0"></div>
      ${letters.map(l => `<label class="ss-pop-opt"><input type="checkbox" value="${l}" ${chosen.has(l) ? 'checked' : ''}> ${
        { M: 'M — صبح', E: 'E — عصر', N: 'N — شب', H: 'H — مرخصی' }[l]}</label>`).join('')}
      <div style="display:flex;gap:6px;margin-top:10px">
        <button class="btn btn-g btn-sm" id="ssPopSave">ذخیره</button>
        <button class="btn btn-o btn-sm" id="ssPopClear">پاک‌کردن</button>
        <button class="btn btn-o btn-sm" id="ssPopCancel">بستن</button>
      </div>
    </div>`;
    document.body.appendChild(box);
    const close = () => box.remove();
    box.querySelector('#ssPopCancel').onclick = close;
    box.addEventListener('click', ev => { if (ev.target === box) close(); });
    box.querySelectorAll('[data-preset]').forEach(btn => {
      btn.onclick = () => {
        const want = new Set(btn.dataset.preset.split(''));
        letters.forEach(l => { box.querySelector(`input[value="${l}"]`).checked = want.has(l); });
      };
    });
    box.querySelector('#ssPopClear').onclick = async () => { await ssSubmitCell(staffId, day, ''); close(); };
    box.querySelector('#ssPopSave').onclick = async () => {
      const codes = [...box.querySelectorAll('input:checked')].map(i => i.value).join('');
      await ssSubmitCell(staffId, day, codes); close();
    };
  };

  async function ssSubmitCell(staffId, day, codes) {
    try {
      await API.shiftSetCell({ ward: SS.wardTitle, year: SS.year, month: SS.month, staff_id: staffId, day, codes });
      await ssLoadAll();
    } catch (err) { if (typeof toast === 'function') toast(err.message, true); else BTN.alert(err.message); }
  }

  /* ------------------------------------------------------------------
     چاپِ یک‌صفحه‌ای A4 افقی
     ---------------------------------------------------------------------
     ترفند: محتوا با اندازه‌ی طبیعی‌اش رندر می‌شود، بعد با اندازه‌گیریِ واقعیِ
     مرورگر (نه یک عدد ثابتِ حدسی) نسبت به فضای واقعیِ چاپِ A4 افقی مقیاس
     می‌گیرد — همان کاری که برای فلوچارت (fcsheet) با بودجه‌ی ثابت انجام شد،
     ولی این‌جا چون تعداد پرسنل هر بخش متفاوت است، بودجه‌ی ثابت جواب نمی‌داد؛
     پس مقیاس در لحظه، از رویِ اندازه‌ی واقعیِ رندرشده، حساب می‌شود.
     ------------------------------------------------------------------ */
  function ssMeasureMm(mm) {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;width:${mm}mm;height:0`;
    document.body.appendChild(probe);
    const px = probe.offsetWidth;
    probe.remove();
    return px;
  }

  global.ssPrint = async function () {
    if (!SS.printCfg) {
      try { SS.printCfg = (await API.shiftGetPrintConfig()).config; } catch (e2) { SS.printCfg = null; }
    }
    const cfg = SS.printCfg || { form_code: '', revision_date: '', reminders: [], signatures: ['تأیید مدیریت پرستاری:', 'نام و نام‌خانوادگی/مهر و امضاء سوپروایزر بالینی:', 'نام و نام‌خانوادگی/مهر و امضاء سرپرستار:'], contacts: [] };
    // ظرفِ چاپ عمداً بخشی از مارک‌آپِ صفحه نیست و روی درخواست ساخته می‌شود.
    // قبلاً داخلِ #content رندر می‌شد و ssPrint آن را زیر <body> می‌برد؛ دفعه‌ی
    // بعد که صفحه دوباره رسم می‌شد یک ظرفِ تازه با همان id ساخته می‌شد و ظرفِ
    // قبلی با برگه‌های کهنه‌اش زیر body می‌ماند. نتیجه روی PDF واقعی دیده شد:
    // چاپِ دومِ یک بخشِ ۲ صفحه‌ای، ۴ صفحه بیرون می‌داد — دو صفحه‌ی آن مالِ بخشِ
    // قبلی بود.
    let root = document.getElementById('ssPrintRoot');
    if (!root) { root = document.createElement('div'); root.id = 'ssPrintRoot'; }
    if (root.parentNode !== document.body) document.body.appendChild(root);
    // اول همه‌ی پرسنل روی «یک» برگه رندر می‌شوند — این رندر برای دیدن نیست،
    // برای اندازه‌گیری است (توضیحِ کامل پایین‌تر، کنارِ محاسبه‌ی ظرفیت).
    root.innerHTML = ssPrintSheetHtml(cfg, 1e6);
    // برگه از دلِ اپ بیرون کشیده و مستقیم زیرِ <body> می‌رود، و body کلاسِ
    // ss-printing می‌گیرد تا در چاپ کلِ #root پنهان شود. بدون این کار، ارتفاعِ
    // خودِ صفحه‌ی اپ (که min-height دارد) یک صفحه‌ی دومِ خالی می‌ساخت — روی
    // خروجی واقعی PDF دیده شد، نه حدس.
    document.body.classList.add('ss-printing');
    if (typeof setLandscape === 'function') setLandscape(true);
    requestAnimationFrame(() => {
      // برگه ممکن است چند صفحه باشد (بخش‌های پرپرسنل)، پس هر صفحه جدا
      // اندازه‌گیری و مقیاس می‌شود؛ یک مقیاسِ مشترک باعث می‌شد صفحه‌ی کوتاه‌تر
      // بی‌دلیل کوچک شود.
      // کارفرما گزارش داد «مارجین دیفالت برنامه‌ی پرستاری مشکل دارد».
      // ریشه‌اش این بود که بودجه‌ی کاغذ به حاشیه‌ی @page گره خورده بود، و آن
      // حاشیه همان جایی است که مرورگر عنوان صفحه و ساعت را می‌کشد. حالا
      // @page حاشیه ندارد (سربرگ/پاورقیِ مرورگر حذف می‌شود) و کلِ کاغذ در
      // اختیار ماست؛ جعبه دقیقاً به اندازه‌ی کاغذ می‌شود و حاشیه‌ی واقعی را
      // همین‌جا با PAD می‌گذاریم. مزیتش این است که دیگر به تنظیمِ «حاشیه» در
      // پنجره‌ی چاپِ کاربر وابسته نیست — «پیش‌فرض» و «هیچ» یک نتیجه می‌دهند.
      // ۱mm از هر بُعدِ کاغذ کم می‌شود تا گِردکردنِ زیرپیکسلی صفحه‌ی خالیِ
      // اضافه نسازد.
      const PAD = ssMeasureMm(9);
      const pageW = ssMeasureMm(296), pageH = ssMeasureMm(209);
      const availW = pageW - 2 * PAD, availH = pageH - 2 * PAD;

      /* تعدادِ ردیفِ هر صفحه از روی اندازه‌گیری، نه از روی عددِ ثابت.
         با عددِ ثابتِ ۱۶، بخشِ ۲۵ نفره دو صفحه‌ی ۱۳ ردیفی می‌شد و روی PDF واقعی
         دیده شد که هر صفحه فقط حدود ۶۰٪ کاغذ را می‌گیرد و یک‌سومِ پایین سفید
         می‌ماند — دقیقاً همان «کاملاً تمام صفحه» که کارفرما خواسته بود و نمی‌شد.
         علتش این است که مقیاس را *عرضِ* جدول تعیین می‌کند (۳۱ ستونِ روز)، نه
         ارتفاعش؛ پس با همان مقیاس، ارتفاع جا دارد و فقط ردیف کم است.
         روش: یک‌بار همه‌ی پرسنل روی یک برگه رندر می‌شوند تا ارتفاعِ ثابتِ برگه
         (سربرگ، شمارش نفرات، راهنما، امضاها) و ارتفاعِ یک ردیف اندازه گرفته
         شود؛ بعد ظرفیتِ واقعیِ یک صفحه حساب و برگه دوباره ساخته می‌شود. */
      const probe = root.querySelector('.ss-print-inner');
      if (probe) {
        const wScale = Math.min(1.8, availW / probe.scrollWidth);
        const rows = [...probe.querySelectorAll('tr.ss-staff-row')];
        const rowsH = rows.reduce((a, r) => a + r.offsetHeight, 0);
        const rowH = rows.length ? rowsH / rows.length : 0;
        const furniture = probe.scrollHeight - rowsH;
        if (rowH > 0 && wScale > 0) {
          // یک ردیف ذخیره نگه داشته می‌شود: صفحه‌های غیرآخر خطِ «ادامه در صفحه‌ی
          // بعد» را هم دارند، پس ارتفاعشان کمی از این نمونه بیشتر است.
          const cap = Math.max(1, Math.floor((availH / wScale - furniture) / rowH) - 1);
          if (cap < rows.length) {
            const pages = Math.ceil(rows.length / cap);
            root.innerHTML = ssPrintSheetHtml(cfg, Math.ceil(rows.length / pages));
          }
        }
      }

      root.querySelectorAll('.ss-print-fit').forEach(outer => {
        const inner = outer.querySelector('.ss-print-inner');
        if (!inner) return;
        const natW = inner.scrollWidth, natH = inner.scrollHeight;
        // بدون سقفِ ۱: کارفرما خواست برگه «کاملاً تمام صفحه» باشد. با سقفِ ۱،
        // بخشِ کم‌پرسنل یک نوارِ کوچک بالای کاغذ می‌شد و دوسومِ صفحه سفید
        // می‌ماند. چون SVG/جدول برداری‌اند، بزرگ‌کردن کیفیت را خراب نمی‌کند.
        // سقفِ ۱٫۸ فقط جلوی درشت‌شدنِ مضحکِ یک بخشِ سه‌نفره را می‌گیرد.
        const scale = Math.min(1.8, availW / natW, availH / natH);
        inner.style.transform = `scale(${scale})`;
        inner.style.transformOrigin = 'top right';
        // جعبه به اندازه‌ی کاغذ، محتوا به اندازه‌ی کاغذ منهای حاشیه. جای محتوا
        // با top/right ست می‌شود نه با padding، چون عنصرِ داخلی absolute است و
        // مبنایش padding box والد است — یعنی padding را نادیده می‌گرفت.
        outer.style.width = pageW + 'px';
        outer.style.height = pageH + 'px';
        inner.style.top = PAD + 'px';
        inner.style.right = PAD + 'px';
        outer.dataset.scale = String(scale);
      });
      // پاکسازی روی afterprint، نه یک تایمرِ کور: در کروم window.print() تا بسته‌شدن
      // پنجره‌ی چاپ بلوکه می‌کند ولی در بعضی مرورگرها نه — تایمر فقط تورِ ایمنی است.
      let done = false;
      const cleanup = () => {
        if (done) return;
        done = true;
        if (typeof setLandscape === 'function') setLandscape(false);
        document.body.classList.remove('ss-printing');
        if (root.dataset.keep !== '1') root.innerHTML = '';
      };
      window.addEventListener('afterprint', cleanup, { once: true });
      window.print();
      setTimeout(cleanup, 3000);
    });
  };

  // تعدادِ ردیفِ هر صفحه ثابت نیست: در ssPrint از روی ارتفاعِ واقعیِ رندرشده
  // حساب می‌شود (بخشِ «اندازه‌گیری» آن‌جا). این مقدار فقط تورِ ایمنی است، برای
  // وقتی که اندازه‌گیری به هر دلیلی جواب ندهد.
  const SS_ROWS_PER_PAGE = 16;

  function ssPrintSheetHtml(cfg, perPageOverride) {
    const staff = SS.sched.staff || [];
    const limit = perPageOverride && perPageOverride > 0 ? perPageOverride : SS_ROWS_PER_PAGE;
    // تقسیمِ متعادل: با ۱۸ نفر، دو صفحه‌ی ۹ و ۹ بهتر از ۱۶ و ۲ است.
    const pageCount = Math.max(1, Math.ceil(staff.length / limit));
    const perPage = Math.ceil(staff.length / pageCount) || 1;
    const pages = [];
    for (let i = 0; i < pageCount; i++) {
      pages.push(ssPrintPageHtml(cfg, staff.slice(i * perPage, (i + 1) * perPage),
        i * perPage, i + 1, pageCount));
    }
    return pages.join('');
  }

  // یک صفحه از برگه. سربرگ و پاورقی — شامل شمارش نفرات، راهنما، توضیحات،
  // یادآوری‌ها، امضاها و تماس‌ها — روی «هر» صفحه یکسان تکرار می‌شوند؛ خواسته‌ی
  // صریح کارفرما بود. تنها تفاوت صفحه‌ها شماره‌ی صفحه و خطِ «ادامه در صفحه‌ی
  // بعد» است.
  function ssPrintPageHtml(cfg, pageStaff, rowOffset, pageNo, pageCount) {
    const sc = SS.sched.schedule, st = SS.settings, days = sc.days;
    const holidays = new Set(sc.holidays || []);
    const hc = SS.sched.headcount;
    const dayCols = Array.from({ length: days }, (_, i) => i + 1);
    const hospitalName = (S.user && S.user.hospital_name) || '';
    const custom = sc.custom_rows || [];
    const isLast = pageNo === pageCount;
    // ستون‌های ثابتِ سمت راست (ردیف/نام/سمت/کد/سابقه) + ستون‌های سمت چپ (کارکرد/سقف/±)
    const LEAD = 5, TRAIL = 3, totalCols = LEAD + days + TRAIL;
    const customRow = r => `<tr class="ss-cust-row"><td colspan="${totalCols}"
      style="text-align:${r.align};${r.bold ? 'font-weight:800;' : ''}">${e(r.text)}</td></tr>`;
    return `<div class="ss-print-fit${isLast ? '' : ' ss-page-break'}">
      <div class="ss-print-inner">
        <div class="ss-print-hd">
          ${(S.user && S.user.hospital_has_logo) ? '<img src="/api/hospital/logo" alt="" onerror="this.remove()">' : ''}
          <div class="ss-print-hd-mid">
            <b>${e(hospitalName)}</b>
            <span>برنامه‌ی ${JM[SS.month - 1]} ماه سال ${F(SS.year)} — بخش/واحد: ${e(sc.ward)}</span>
          </div>
          <div class="ss-print-hd-meta">
            ${pageCount > 1 ? `<span class="ss-pageno">صفحه ${F(pageNo)} از ${F(pageCount)}</span>` : ''}
            ${sc.note ? `<span>${e(sc.note)}</span>` : ''}
            ${cfg.form_code ? `<span>کد فرم: ${e(cfg.form_code)}</span>` : ''}
            ${cfg.revision_date ? `<span>تاریخ آخرین بازنگری: ${e(cfg.revision_date)}</span>` : ''}
          </div>
        </div>
        <table class="ss-grid ss-print-table">
          <thead>
            ${custom.filter(r => r.area === 'header').map(customRow).join('')}
            <tr><td colspan="${LEAD}"></td>
              ${dayCols.map(d => `<td class="${holidays.has(d) ? 'ss-holiday' : ''}">${WEEKDAY_SHORT[weekdayOf(SS.year, SS.month, d)] || ''}</td>`).join('')}
              <td colspan="${TRAIL}"></td></tr>
            <tr>
              <td class="ss-c-num">ردیف</td>
              <td class="ss-c-name">نام و نام‌خانوادگی</td>
              <td class="ss-c-pos">سمت</td>
              <td class="ss-c-code">کد پرسنلی</td>
              <td class="ss-c-exp">سابقه</td>
              ${dayCols.map(d => `<td class="${holidays.has(d) ? 'ss-holiday' : ''}">${F(d)}</td>`).join('')}
              <td>کارکرد</td><td>سقف</td><td>+/-</td></tr>
          </thead>
          <tbody>
          ${pageStaff.map((s, i) => `<tr class="ss-staff-row">
            <td class="ss-c-num">${F(rowOffset + i + 1)}</td>
            <td class="ss-c-name">${e(s.first_name)} ${e(s.last_name)}</td>
            <td class="ss-c-pos">${e(s.position || '')}</td>
            <td class="ss-c-code">${e(s.personnel_code || '')}</td>
            <td class="ss-c-exp">${s.years_experience == null ? '' : F(s.years_experience)}</td>
            ${dayCols.map(d => {
              const code = (s.cells && s.cells[d]) || '';
              // کلاسِ رنگِ همان کد روی برگه‌ی چاپی هم می‌آید — کارفرما چاپِ رنگی خواست
              return `<td class="ss-shiftcell ${code ? 'ss-' + code : ''}${holidays.has(d) ? ' ss-holiday-col' : ''}">${e(code)}</td>`;
            }).join('')}
            <td><b>${F(s.total_hours)}</b></td><td>${F(s.monthly_hour_quota)}</td>
            <td>${s.overtime > 0 ? '+' : ''}${F(s.overtime)}</td>
          </tr>`).join('')}
          ${SHIFT_COUNT_ROWS.map(r => `<tr class="ss-hc-row ss-hc-${r.k}">
            <td colspan="${LEAD}">${e(r.label)}</td>
            ${dayCols.map(d => `<td>${F(hc[d][r.k])}</td>`).join('')}
            <td colspan="${TRAIL}"></td></tr>`).join('')}
          ${custom.filter(r => r.area === 'footer').map(customRow).join('')}
          </tbody>
        </table>
        <div class="ss-print-legend">
          <span class="ss-lg-M">M=صبح ${F(st.hour_m)}س (${e(st.clock_m)})</span>
          <span class="ss-lg-E">E=عصر ${F(st.hour_e)}س (${e(st.clock_e)})</span>
          <span class="ss-lg-N">N=شب ${F(st.hour_n)}س (${e(st.clock_n)})</span>
          <span class="ss-lg-H">H=مرخصی ${F(st.hour_h)}س</span>
          <span class="ss-lg-EN">EN=عصر+شب ${F(st.hour_e + st.hour_n)}س</span>
          <span class="ss-lg-MEN">MEN=۲۴ساعته ${F(st.hour_m + st.hour_e + st.hour_n)}س</span>
          <span class="ss-lg-HD">■ تعطیل رسمی</span>
        </div>
        ${sc.description ? `<div class="ss-print-desc"><b>توضیحات:</b> ${e(sc.description)}</div>` : ''}
        ${cfg.reminders && cfg.reminders.length ? `<div class="ss-print-reminders">${cfg.reminders.map(r => `<div>${e(r)}</div>`).join('')}</div>` : ''}
        <div class="ss-print-sign">
          ${(cfg.signatures || []).map(x => `<div class="ss-sign-cell"><span>${e(x)}</span><i></i></div>`).join('')}
        </div>
        ${cfg.contacts && cfg.contacts.length ? `<div class="ss-print-contacts">${cfg.contacts.map(c => `<span>${e(c)}</span>`).join('')}</div>` : ''}
        ${isLast ? '' : `<div class="ss-print-contd">ادامه در صفحه‌ی ${F(pageNo + 1)}</div>`}
      </div>
    </div>`;
  }
})(window);
