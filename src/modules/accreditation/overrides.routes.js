/**
 * Accreditation Overrides & Period Routes
 * Part of Modular Monolith (Clean Architecture) — Project 313
 */
const express = require('express');
const router = express.Router();
const common = require('../common');
// سینکِ NIST از JSON — هر ویرایشِ نقش سفارشی باید فوراً در role_permissions هم بنشیند،
// وگرنه مسیرِ NIST (my-permissions/authorize) تا بوتِ بعدی نسخه‌ی کهنه را نشان می‌دهد.
const { syncRoleFromJson } = require('../../services/rbac-sync');
const {
  query, db, authRequired, requirePermission, requireAnyPermission,
  hospitalScope, requireFeature, scopeFor, axisCodeOf, measureAllowed,
  jalaliYearRange, jalaliMonthRange, safeYear, toGregorian, toJalali,
  todayJalali, JMONTHS, tehranNow, tehranTodayStr, TEHRAN_OFFSET_MS,
  logAction, uuid, parseJSON, safeArray, buildTrackingCode,
  bcrypt, config,
  applyYearFilter, loadOverrides, evaluatePolicy,
  upload, uploadSingle, uploadMultiple, compressImage,
  path, fs, RULE_TYPES, RULE_TYPE_FA, reminderItemsFor,
  timelineFor, dismissMilestone, snoozeMilestone, setMilestoneState,
  assistantNext, assistantReview, periodProgress,
  getSmartDecisions, myWork, assistantChat,
  extractText, classifyDocument, extractFlowchart,
  crudNormalize,
  crudHasUpdatedAt,
  TIME_RE,
  DATE_RE,
  statusYear,
  codeCmp,
  sortTree,
  hasPerm,
  normFa,
  matchFa,
  truthy,
  MER_EVAL_STATUSES,
  merValidate,
  merInsert,
  originalName,
  storeUploadedFile,
  sendStoredFile,
  LIB_CATEGORIES,
  libSectionId,
  getChecklist,
  saveChecklistMeasurers,
  chkMeasurers,
  itemHasSubmissions,
  BSC_PERSPECTIVES,
  JMONTHS_FA,
  matchPerspective,
  currentJalaliYear,
  bscYear,
  bscData,
  IND_ASPECTS,
  IND_TYPES,
  IND_INTERVALS,
  IND_DESIRABILITY,
  IND_VALUE_STATUS,
  IND_TEXT_FIELDS,
  IND_NUM_FIELDS,
  IND_FLAG_FIELDS,
  indBody,
  nrsCanManage,
  nrsCanView,
  headNurseWardsOf,
  hnAccessWard,
  hnHeadPresentToday,
  SHIFT_STAFF_ORDER,
  SHIFT_STAFF_ORDER_W,
  SHIFT_SETTINGS_DEFAULT,
  shiftCellHours,
  daysInJalaliMonth,
  shiftAccessUnit,
  getWardShiftSettings,
  parseHolidays,
  docCodes,
  signatureImageFor,
  resolveRecipient,
  nrsUserOrNull,
  FMEA_STATUSES,
  fmeaBody,
  fmeaInsert,
  CL_ANSWER_VALUES,
  CL_ANSWER_LABELS,
  CL_NONCONFORMITY,
  isNonConformity,
  indJudge,
  indRow
} = common;

// Helper to bind mountCrud to this module router
const mountCrud = (prefix, ...args) => common.mountCrud(router, prefix, ...args);

// ===== دسترسی موردی کاربر ↔ سنجه (لایه‌ی دوم روی نقش/محور) =====
// الگوی طراحی اولیه حسن (hassan_ANALYSIS.md §۱۲): نقش سازمانی سراسری + تخصیص موردی per-record.

// جست‌وجوی سنجه برای انتخابگر مدیر (کد یا متن)
router.get('/measures/search', authRequired, requirePermission('manage_users'), (req, res) => {
  try {
    const q = `%${String(req.query.q || '').trim()}%`;
    const rows = query(`SELECT id, code, COALESCE(title, statement, '') AS title FROM accreditation_sections
      WHERE level_type = 'measure' AND (code LIKE ? OR title LIKE ? OR statement LIKE ?)
      ORDER BY code LIMIT 25`, [q, q, q]).rows;
    res.json({ measures: rows });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

/* =====================================================================
   جست‌وجوی سراسری و زنده
   ---------------------------------------------------------------------
   کارفرما: «هر کاربری هرجای سامانه بود، بتواند سرچ کند — مثلاً مدیر پرستاری
   بنویسد پذیرش و همه‌ی موارد مربوط به پذیرش را ببیند، از خط‌مشی تا بقیه».

   تا امروز هر ماژول جست‌وجوی خودش را داشت و کاربر باید *اول* می‌دانست دنبالِ
   چیزی در کدام صفحه بگردد — که دقیقاً همان چیزی است که نمی‌داند.

   دو قاعده‌ی امنیتی که این را از یک SELECT ساده جدا می‌کند:
     • همه‌چیز به hospital_id همان کاربر محدود است.
     • هر گروهِ نتیجه مجوزِ خودش را دارد؛ کسی که «مشاهده‌ی اسناد» ندارد،
       عنوانِ خط‌مشی‌ها را هم در نتایج نمی‌بیند. وگرنه جست‌وجو تبدیل می‌شد
       به دور زدنِ کلِ مدلِ دسترسی.
   ===================================================================== */
const SEARCH_SOURCES = [
  { key: 'measure', fa: 'سنجه', page: 'measures', icon: '◆',
    perms: null,   // درختِ سنجه برای همه‌ی کاربرانِ واردشده قابل دیدن است
    // sub خالی است: نمایشِ level_type («measure») برای کاربر بی‌معنا بود و
    // عنوانِ خودِ گروه («سنجه») همان را می‌گوید.
    sql: `SELECT id, code AS code, COALESCE(NULLIF(title,''), statement, '') AS title, '' AS sub
          FROM accreditation_sections
          WHERE level_type = 'measure' AND (code LIKE ? OR title LIKE ? OR statement LIKE ?)
          ORDER BY code LIMIT 8`,
    params: (q) => [q, q, q] },
  { key: 'document', fa: 'سند کنترل‌شده', page: 'documents', icon: '📄',
    perms: ['view_documents', 'manage_documents'],
    sql: `SELECT id, doc_code AS code, title, COALESCE(doc_type,'') AS sub
          FROM controlled_documents
          WHERE hospital_id = ? AND (title LIKE ? OR doc_code LIKE ? OR purpose LIKE ? OR scope LIKE ?)
          ORDER BY doc_type, title LIMIT 10`,
    params: (q, h) => [h, q, q, q, q] },
  { key: 'process', fa: 'فرآیند', page: 'processes', icon: '⟳',
    perms: ['view_processes', 'manage_processes'],
    sql: `SELECT id, process_code AS code, title, COALESCE(domain,'') AS sub
          FROM processes WHERE hospital_id = ? AND (title LIKE ? OR process_code LIKE ? OR description LIKE ?)
          ORDER BY title LIMIT 6`,
    params: (q, h) => [h, q, q, q] },
  { key: 'checklist', fa: 'چک‌لیست', page: 'checklists', icon: '☑',
    perms: ['view_checklists', 'submit_checklists', 'manage_checklists'],
    sql: `SELECT id, checklist_code AS code, title, '' AS sub
          FROM checklists WHERE hospital_id = ? AND (title LIKE ? OR checklist_code LIKE ? OR purpose LIKE ?)
          ORDER BY title LIMIT 6`,
    params: (q, h) => [h, q, q, q] },
  { key: 'committee', fa: 'کمیته', page: 'committees', icon: '👥',
    perms: ['view_committees', 'manage_committees'],
    sql: `SELECT id, '' AS code, name AS title, COALESCE(committee_type,'') AS sub
          FROM committees WHERE hospital_id = ? AND name LIKE ? ORDER BY name LIMIT 5`,
    params: (q, h) => [h, q] },
  { key: 'indicator', fa: 'شاخص', page: 'indicators', icon: '📈',
    perms: ['view_indicators', 'manage_indicators'],
    sql: `SELECT id, code AS code, title, COALESCE(indicator_type,'') AS sub
          FROM hospital_kpis WHERE hospital_id = ? AND (title LIKE ? OR code LIKE ?
            OR numerator_description LIKE ? OR denominator_description LIKE ?)
          ORDER BY title LIMIT 6`,
    params: (q, h) => [h, q, q, q, q] },
  { key: 'library', fa: 'کتابخانه', page: 'documents', icon: '📚',
    perms: ['view_library', 'manage_library'],
    sql: `SELECT id, '' AS code, title, '' AS sub
          FROM digital_library_items WHERE hospital_id = ? AND (title LIKE ? OR description LIKE ?)
          ORDER BY title LIMIT 5`,
    params: (q, h) => [h, q, q] },
  { key: 'certification', fa: 'گواهینامه', page: 'documents', icon: '🏅',
    perms: ['view_certifications', 'manage_certifications'],
    sql: `SELECT id, '' AS code, title, COALESCE(issuing_body,'') AS sub
          FROM certifications WHERE hospital_id = ? AND (title LIKE ? OR issuing_body LIKE ?)
          ORDER BY title LIMIT 5`,
    params: (q, h) => [h, q, q] },
  { key: 'program', fa: 'برنامه بهبود', page: 'programs', icon: '🎯',
    perms: ['view_programs', 'approve_programs'],
    sql: `SELECT id, '' AS code, title, COALESCE(program_type,'') AS sub
          FROM improvement_programs WHERE hospital_id = ? AND (title LIKE ? OR description LIKE ?)
          ORDER BY title LIMIT 5`,
    params: (q, h) => [h, q, q] },
  { key: 'asset', fa: 'قلم / تجهیز', page: 'assets', icon: '🛠',
    perms: ['view_facility_assets', 'manage_facility_assets'],
    sql: `SELECT id, asset_code AS code, title, COALESCE(category,'') AS sub
          FROM facility_assets WHERE hospital_id = ? AND (title LIKE ? OR asset_code LIKE ? OR location LIKE ?)
          ORDER BY title LIMIT 5`,
    params: (q, h) => [h, q, q, q] },
  { key: 'drug', fa: 'قلم فرمولاری', page: 'pharmacy', icon: '💊',
    perms: ['view_pharmacy', 'manage_pharmacy'],
    sql: `SELECT id, local_code AS code, generic_name AS title, COALESCE(brand_name,'') AS sub
          FROM drug_formulary WHERE hospital_id = ? AND (generic_name LIKE ? OR brand_name LIKE ? OR local_code LIKE ?)
          ORDER BY generic_name LIMIT 5`,
    params: (q, h) => [h, q, q, q] },
  { key: 'ward', fa: 'بخش پرستاری', page: 'nursing', icon: '🏥',
    perms: ['view_nursing', 'manage_nursing'],
    sql: `SELECT id, '' AS code, title, '' AS sub
          FROM nursing_wards WHERE hospital_id = ? AND title LIKE ? ORDER BY title LIMIT 5`,
    params: (q, h) => [h, q] },
  // کیسه‌ی خون با کدش پیدا می‌شود: وقتی سرِ بالین عارضه‌ای رخ می‌دهد، اولین چیزی
  // که پرسیده می‌شود «این کد کیسه مالِ کیست و کجاست» است، نه فهرستِ کلِ موجودی.
  { key: 'bloodbag', fa: 'کیسه‌ی خون', page: 'blood', icon: '🩸',
    perms: ['view_blood', 'manage_blood'],
    sql: `SELECT id, bag_code AS code, (product_type || ' ' || blood_group || rh) AS title,
                 COALESCE(crossmatch_ward, issued_ward, '') AS sub
          FROM blood_bags WHERE hospital_id = ? AND (bag_code LIKE ? OR crossmatch_patient LIKE ?)
          ORDER BY expiry_date LIMIT 5`,
    params: (q, h) => [h, q, q] },
];

router.get('/search', authRequired, hospitalScope, (req, res) => {
  const raw = String(req.query.q || '').trim();
  if (raw.length < 2) return res.json({ q: raw, groups: [], total: 0 });
  const like = '%' + raw + '%';
  const perms = (req.user && req.user.permissions) || [];
  const groups = [];
  for (const src of SEARCH_SOURCES) {
    if (src.perms && !src.perms.some(p => perms.includes(p))) continue;
    try {
      const rows = query(src.sql, src.params(like, req.hospitalId)).rows;
      if (rows.length) {
        groups.push({
          key: src.key, fa: src.fa, page: src.page, icon: src.icon,
          // عنوان بریده می‌شود: متنِ بعضی سنجه‌ها چند بند است و فرستادنِ کاملش
          // هم پهنای باند را می‌خورد هم در فهرستِ نتایج جایی ندارد.
          items: rows.map(r => ({
            id: r.id, code: r.code || '',
            title: String(r.title || '').replace(/\s+/g, ' ').trim().slice(0, 220),
            sub: String(r.sub || '').slice(0, 60),
          })),
        });
      }
    } catch (err) {
      // یک جدولِ نبوده (ماژولی که هنوز مهاجرت نشده) نباید کلِ جست‌وجو را
      // بترکاند — همان گروه رد می‌شود و بقیه جواب می‌دهند.
      console.error('[Search]', src.key, err.message);
    }
  }
  res.json({ q: raw, groups, total: groups.reduce((a, g) => a + g.items.length, 0) });
});

// دسترسی‌های موردی خودِ کاربر جاری — برای اعمال همان قاعده در سمت کلاینت
router.get('/accreditation/my-overrides', authRequired, (req, res) => {
  try {
    const rows = query(`SELECT o.access_type, s.id, s.code FROM user_measure_overrides o
      JOIN accreditation_sections s ON s.id = o.measure_id WHERE o.user_id = ?`, [req.user.id]).rows;
    res.json({
      grants: rows.filter(r => r.access_type === 'grant').map(r => ({ id: r.id, code: r.code })),
      denies: rows.filter(r => r.access_type === 'deny').map(r => ({ id: r.id, code: r.code })),
    });
  } catch (err) { res.json({ grants: [], denies: [] }); }
});

router.get('/users/:userId/measure-overrides', authRequired, requirePermission('manage_users'), hospitalScope, (req, res) => {
  try {
    const rows = query(`SELECT o.id, o.measure_id, o.access_type, o.note, o.created_at,
      s.code AS measure_code, COALESCE(s.title, s.statement, '') AS measure_title, g.full_name AS granted_by_name
      FROM user_measure_overrides o
      JOIN accreditation_sections s ON s.id = o.measure_id
      LEFT JOIN users g ON g.id = o.granted_by
      WHERE o.user_id = ? AND o.hospital_id = ? ORDER BY s.code`, [req.params.userId, req.hospitalId]).rows;
    res.json({ overrides: rows });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/users/:userId/measure-overrides', authRequired, requirePermission('manage_users'), hospitalScope, (req, res) => {
  const { measure_id, access_type, note } = req.body || {};
  if (!measure_id || !['grant', 'deny'].includes(access_type)) return res.status(400).json({ error: 'ورودی نامعتبر' });
  try {
    const u = query('SELECT id FROM users WHERE id = ? AND hospital_id = ?', [req.params.userId, req.hospitalId]).rows[0];
    if (!u) return res.status(404).json({ error: 'کاربر یافت نشد' });
    const m = query("SELECT id FROM accreditation_sections WHERE id = ? AND level_type = 'measure'", [measure_id]).rows[0];
    if (!m) return res.status(404).json({ error: 'سنجه یافت نشد' });
    // یک ردیف به‌ازای هر (کاربر، سنجه): تغییر grant↔deny رکورد را به‌روزرسانی می‌کند
    const ex = query('SELECT id FROM user_measure_overrides WHERE user_id = ? AND measure_id = ?', [req.params.userId, measure_id]).rows[0];
    if (ex) query('UPDATE user_measure_overrides SET access_type = ?, note = ?, granted_by = ?, created_at = ? WHERE id = ?',
      [access_type, note || null, req.user.id, new Date().toISOString(), ex.id]);
    else query(`INSERT INTO user_measure_overrides (id, hospital_id, user_id, measure_id, access_type, note, granted_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [uuid(), req.hospitalId, req.params.userId, measure_id, access_type, note || null, req.user.id, new Date().toISOString()]);
    res.json({ status: 'saved' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.delete('/users/:userId/measure-overrides/:id', authRequired, requirePermission('manage_users'), hospitalScope, (req, res) => {
  try {
    const row = query('SELECT id FROM user_measure_overrides WHERE id = ? AND user_id = ? AND hospital_id = ?',
      [req.params.id, req.params.userId, req.hospitalId]).rows[0];
    if (!row) return res.status(404).json({ error: 'یافت نشد' });
    query('DELETE FROM user_measure_overrides WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]);
    res.json({ status: 'deleted' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.get('/users/roles/list', authRequired, hospitalScope, (req, res) => {
  try {
    // hospital_id لازم است تا رابط کاربری نقش پایه‌ی سیستم را از نقش سفارشیِ همین بیمارستان تشخیص دهد.
    // نقش‌های سفارشیِ بیمارستان‌های دیگر اصلاً برگردانده نمی‌شوند (PUT /roles/:id هم آن‌ها را رد می‌کند).
    const result = query(
      'SELECT id, code, title_fa, permissions, hospital_id FROM roles WHERE hospital_id IS NULL OR hospital_id = ? ORDER BY code',
      [req.hospitalId]);
    res.json({ roles: result.rows });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// فهرست کامل مجوزهای شناخته‌شده (اتحاد همه permissions ثبت‌شده روی نقش‌های موجود) — پایه‌ی ساخت نقش سفارشی
router.get('/roles/permissions/catalog', authRequired, requirePermission('manage_roles'), (req, res) => {
  try {
    const rows = query('SELECT permissions FROM roles').rows;
    const set = new Set();
    rows.forEach(r => { (typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || [])).forEach(p => set.add(p)); });
    const list = [...set].sort();
    const groups = {};
    list.forEach(p => {
      const g = p.split('_').slice(-1)[0] === p ? 'عمومی' : p.replace(/^(manage|view|submit|edit|approve|create|assign|export|review)_/, '');
      (groups[g] = groups[g] || []).push(p);
    });
    res.json({ permissions: list, groups });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/roles', authRequired, requirePermission('manage_roles'), hospitalScope, (req, res) => {
  const { code, title_fa, permissions } = req.body;
  if (!code || !title_fa) return res.status(400).json({ error: 'کد و عنوان نقش الزامی است' });
  if (!Array.isArray(permissions)) return res.status(400).json({ error: 'مجوزها باید فهرست باشند' });
  try {
    const catalogRows = query('SELECT permissions FROM roles').rows;
    const known = new Set();
    catalogRows.forEach(r => { (typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || [])).forEach(p => known.add(p)); });
    const unknown = permissions.filter(p => !known.has(p));
    if (unknown.length) return res.status(400).json({ error: `مجوز نامعتبر: ${unknown.join(', ')}` });
    const existing = query('SELECT id FROM roles WHERE code = ? AND (hospital_id = ? OR hospital_id IS NULL)', [code, req.hospitalId]).rows[0];
    if (existing) return res.status(400).json({ error: 'این کد نقش قبلاً استفاده شده است' });
    const id = uuid();
    query('INSERT INTO roles (id, hospital_id, code, title_fa, permissions) VALUES (?, ?, ?, ?, ?)',
      [id, req.hospitalId, code, title_fa, JSON.stringify(permissions)]);
    // نقش سفارشی = آینه‌ی دقیق در NIST؛ از همان لحظه‌ی ساخت، my-permissions و
    // authorize همان چیزی را می‌بینند که در JSON نشسته است.
    syncRoleFromJson(id, { mirror: true });
    res.status(201).json({ role: { id, code, title_fa, permissions, hospital_id: req.hospitalId } });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.put('/roles/:id', authRequired, requirePermission('manage_roles'), hospitalScope, (req, res) => {
  try {
    const role = query('SELECT id, code, hospital_id FROM roles WHERE id = ?', [req.params.id]).rows[0];
    if (!role) return res.status(404).json({ error: 'نقش یافت نشد' });
    if (role.hospital_id === null) return res.status(403).json({ error: 'نقش‌های پایه سیستم قابل ویرایش نیستند' });
    if (role.hospital_id !== req.hospitalId) return res.status(404).json({ error: 'نقش یافت نشد' });
    const { title_fa, permissions } = req.body;
    if (Array.isArray(permissions)) {
      const catalogRows = query('SELECT permissions FROM roles').rows;
      const known = new Set();
      catalogRows.forEach(r => { (typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || [])).forEach(p => known.add(p)); });
      const unknown = permissions.filter(p => !known.has(p));
      if (unknown.length) return res.status(400).json({ error: `مجوز نامعتبر: ${unknown.join(', ')}` });
      query('UPDATE roles SET permissions = ? WHERE id = ?', [JSON.stringify(permissions), req.params.id]);
      // آینه‌ی کامل: مجوزِ برداشته‌شده هم باید از role_permissions حذف شود، وگرنه
      // سلبِ مجوز در پنل هیچ اثری روی مسیر NIST (authorize/my-permissions) نداشت.
      syncRoleFromJson(req.params.id, { mirror: true });
    }
    if (typeof title_fa === 'string' && title_fa.trim()) query('UPDATE roles SET title_fa = ? WHERE id = ?', [title_fa.trim(), req.params.id]);
    const updated = query('SELECT id, code, title_fa, permissions, hospital_id FROM roles WHERE id = ?', [req.params.id]).rows[0];
    res.json({ role: updated });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// جلوگیری از تشدید امتیاز (privilege escalation): اعطای نقشی با مجوز manage_roles یا نقش admin
// فقط توسط کاربری مجاز است که خودش صاحب مجوز manage_roles باشد؛ صرف داشتن manage_users کافی نیست
function canAssignRole(actor, roleRow) {
  if (!roleRow) return false;
  if (roleRow.code === 'admin') return actor.permissions.includes('manage_roles');
  const rolePerms = typeof roleRow.permissions === 'string' ? JSON.parse(roleRow.permissions) : (roleRow.permissions || []);
  if (rolePerms.includes('manage_roles')) return actor.permissions.includes('manage_roles');
  return true;
}

router.post('/users', authRequired, requirePermission('manage_users'), hospitalScope, (req, res) => {
  const { full_name, username, password, role_id, email, phone, department, gender, title_prefix } = req.body;
  if (!full_name || !username || !password || !role_id) return res.status(400).json({ error: 'نام، نام کاربری، رمز و نقش الزامی است' });
  try {
    const existing = query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'نام کاربری تکراری است' });
    // نقش باید یا سراسری (hospital_id NULL) یا متعلق به همین بیمارستان باشد — وگرنه ادمین یک بیمارستان
    // می‌تواند با حدس/دانستن شناسه‌ی نقش سفارشیِ بیمارستانی دیگر، آن مجوزها را به کاربر خودش بدهد (IDOR)
    const role = query('SELECT id, code, permissions FROM roles WHERE id = ? AND (hospital_id IS NULL OR hospital_id = ?)', [role_id, req.hospitalId]).rows[0];
    if (!role) return res.status(400).json({ error: 'نقش نامعتبر است' });
    if (!canAssignRole(req.user, role)) return res.status(403).json({ error: 'اجازه تخصیص این نقش را ندارید' });
    const hash = bcrypt.hashSync(password, config.bcrypt.rounds);
    const id = uuid();
    query(`INSERT INTO users (id, hospital_id, full_name, username, password_hash, email, phone, role_id, department, gender, title_prefix) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.hospitalId, full_name, username, hash, email||null, phone||null, role_id, department||null, gender||null, title_prefix||null]);
    res.json({ user: { id } });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;
