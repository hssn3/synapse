/**
 * Accreditation Tree & Status Routes
 * Part of Modular Monolith (Clean Architecture) — Project 313
 */
const express = require('express');
const router = express.Router();
const common = require('../common');
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
  canAssignRole,
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

// ===== Accreditation Tree =====
// درخت اعتباربخشی، فیلترشده بر اساس محورهای مجاز نقش کاربر.
// نکته: نقش‌هایی مثل سوپروایزر بالینی/کنترل عفونت مجوز edit_measure_status دارند اما
// view_accreditation_full_tree ندارند؛ پیش از این با ۴۰۳ مواجه می‌شدند و اصلاً نمی‌توانستند
// سنجه‌ای را ببینند یا ویرایش کنند. اکنون درخت را می‌گیرند، ولی فقط در دامنه‌ی محورهای خودشان.
router.get('/accreditation/tree', authRequired,
  requireAnyPermission('view_accreditation_full_tree', 'edit_measure_status', 'view_measure_status_readonly'),
  (req, res) => {
  try {
    const scope = scopeFor(req.user.role_code, req.user.permissions);
    const ov = loadOverrides(req.user.id);
    if (Array.isArray(scope) && scope.length === 0 && ov.grants.size === 0) return res.json({ tree: [] });

      // درختِ سبک: detail_text (۶۴۳KB از ۹۹۸KB پاسخ) حذف شد — بوتِ SPA بدون آن رندر
  // میشود و متن کامل کتاب هنگام رندرِ هر محور تنبل واکشی میشود (measures-full).
  // full=1 برای مصرفکنندههایی که متن کامل میخواهند سرِ جایش است.
  const wantFull = req.query.full === '1';
  const allRows = query('SELECT * FROM accreditation_sections ORDER BY code').rows;
  if (!wantFull) allRows.forEach(r => { delete r.detail_text; });
    const nodes = {};
    const roots = [];
    for (const row of allRows) {
      nodes[row.id] = { ...row, children: [] };
    }
    for (const row of allRows) {
      if (row.parent_id && nodes[row.parent_id]) nodes[row.parent_id].children.push(nodes[row.id]);
      else roots.push(nodes[row.id]);
    }
    // مرتب‌سازی طبیعی، نه الفبایی: با ORDER BY code، «الف-1-10» پیش از
    // «الف-1-2» می‌آمد چون رشته‌ای مقایسه می‌شد. کاربر استاندارد ۱۰ را بعد از
    // ۹ می‌خواهد، نه بعد از ۱. هر بخشِ عددیِ کد به‌صورت عدد مقایسه می‌شود.
    sortTree(roots);
    if (scope === '*' && ov.denies.size === 0) return res.json({ tree: roots });

    // هرس درخت در سطح *سنجه* (نه محور) تا دسترسی‌های موردی هم اعمال شوند:
    // سنجه‌ی grant‌شده در محور خارج از دامنه می‌ماند، سنجه‌ی deny‌شده حتی داخل دامنه حذف می‌شود.
    // گره‌های میانی/محور/فصلِ بدون سنجه‌ی باقی‌مانده حذف می‌شوند.
    const prune = (node) => {
      if (node.level_type === 'measure') return measureAllowed(scope, node, ov) ? node : null;
      node.children = node.children.map(prune).filter(Boolean);
      return node.children.length ? node : null;
    };
    res.json({ tree: roots.map(prune).filter(Boolean) });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// Accreditation status
  // متن کامل کتاب برای شناسههای مشخص — واکشیِ تنبلِ فرانت پس از درخت سبک.
  // محتوای کتاب عمومی است (نه داده بیمارستان) — پس فقط احراز هویت کافی است.
  router.get('/accreditation/measures-full', authRequired, (req, res) => {
    try {
      const ids = String(req.query.ids || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 60);
      if (!ids.length) return res.json({ measures: [] });
      const ph = ids.map(() => '?').join(',');
      const rows = query(`SELECT id, detail_text FROM accreditation_sections WHERE id IN (${ph})`, ids).rows;
      res.json({ measures: rows });
    } catch (err) { console.error('[MeasureFull]', err); res.status(500).json({ error: 'خطای سرور' }); }
  });

// اقلام و زیرمنوهای پرشده و مرتبط با سنجه (خط‌مشی‌ها، روش‌های اجرایی، چک‌لیست‌ها، فرآیندها و شواهد)
router.get('/accreditation/measures/:code/artifacts', authRequired, hospitalScope, (req, res) => {
  try {
    const rawCode = req.params.code;
    const code = String(rawCode || '')
      .replace(/[۰-۹]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])
      .replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
      .replace(/[\u2010-\u2015\u2212]/g, '-')
      .replace(/\s+/g, '')
      .trim();
    const codeFa = code.replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'['0123456789'.indexOf(d)]);
    const numOnly = code.replace(/^[^\d-]+-?/, '');

    const sec = query('SELECT * FROM accreditation_sections WHERE code = ? OR code = ? OR id = ?', [code, codeFa, rawCode]).rows[0];
    if (!sec) {
      return res.status(404).json({ error: 'سنجه یافت نشد' });
    }

    const parent = sec.parent_id ? query('SELECT * FROM accreditation_sections WHERE id = ?', [sec.parent_id]).rows[0] : null;
    const gparent = (parent && parent.parent_id) ? query('SELECT * FROM accreditation_sections WHERE id = ?', [parent.parent_id]).rows[0] : null;

    const secIds = [sec.id];
    if (parent) secIds.push(parent.id);

    // اگر بخش انتخاب‌شده استاندارد یا محور باشد، شناسه‌های فرزندان را نیز اضافه می‌کنیم
    if (sec.level_type === 'standard' || sec.level_type === 'axis') {
      const children = query('SELECT id FROM accreditation_sections WHERE parent_id = ?', [sec.id]).rows;
      children.forEach(c => { if (!secIds.includes(c.id)) secIds.push(c.id); });
    }

    const stopWords = new Set([
      'در','به','و','از','با','بر','تا','یا','که','برای','جهت','صورت','مربوط','شده','است','بود',
      'می‌شود','می‌گردد','می‌باشد','می‌شوند','می‌گردند','می‌باشند','انجام','رعایت',
      'کلیه','تمام','تمامی','بخش','واحد','بخش‌ها','واحد‌ها','بیمارستان','مراکز','مرکز','سیستم',
      'های','ها','یک','دو','سه','چهار','پنج','شش','هفت','هشت','نه','ده',
      'اقدامات','تعیین','اجرا','تسهیل','ارائه','نظارت','ایجاد','پایش','حوزه'
    ]);
    const texts = [sec.statement, sec.title, parent && parent.title, gparent && gparent.title].filter(Boolean).join(' ');
    const keywords = texts
      .replace(/[،؛:«»()0-9۰-۹.-]/g, ' ')
      .split(/\s+/)
      .map(w => w.trim().replace(/^[\u200c\s]+|[\u200c\s]+$/g, ''))
      .filter(w => w.length >= 3 && !stopWords.has(w));
    const uniqueKeywords = [...new Set(keywords)].slice(0, 8);

    // 1. Documents where condition
    const secPlaceholders = secIds.map(() => '?').join(',');
    let docWhere = `(section_id IN (${secPlaceholders}) OR doc_code LIKE ? OR doc_code LIKE ? OR title LIKE ? OR title LIKE ?`;
    let docParams = [req.hospitalId, ...secIds, `%${code}%`, `%${numOnly}%`, `%${code}%`, `%${numOnly}%`];
    uniqueKeywords.forEach(kw => {
      docWhere += ' OR title LIKE ?';
      docParams.push(`%${kw}%`);
    });
    docWhere += ')';

    const policies = query(`
      SELECT id, title, doc_code, doc_type, status, version_no, revision_no, issue_date, responsible_person, updated_at, attachment_name
      FROM controlled_documents
      WHERE hospital_id = ? AND doc_type = 'policy' AND ${docWhere}
      ORDER BY updated_at DESC LIMIT 25
    `, docParams).rows;

    const procedures = query(`
      SELECT id, title, doc_code, doc_type, status, version_no, revision_no, issue_date, responsible_person, updated_at, attachment_name
      FROM controlled_documents
      WHERE hospital_id = ? AND doc_type IN ('procedure', 'instruction') AND ${docWhere}
      ORDER BY updated_at DESC LIMIT 30
    `, docParams).rows;

    // 2. Checklists
    let chkWhere = `(section_id IN (${secPlaceholders}) OR checklist_code LIKE ? OR checklist_code LIKE ? OR title LIKE ? OR title LIKE ?`;
    let chkParams = [req.hospitalId, ...secIds, `%${code}%`, `%${numOnly}%`, `%${code}%`, `%${numOnly}%`];
    uniqueKeywords.forEach(kw => {
      chkWhere += ' OR title LIKE ?';
      chkParams.push(`%${kw}%`);
    });
    chkWhere += ')';

    const checklists = query(`
      SELECT id, title, checklist_code, cadence, status, purpose, created_at,
        (SELECT COUNT(*) FROM checklist_submissions cs WHERE cs.checklist_id = c.id) as submissions_count,
        (SELECT MAX(submitted_at) FROM checklist_submissions cs WHERE cs.checklist_id = c.id) as last_submission_at
      FROM checklists c
      WHERE hospital_id = ? AND ${chkWhere}
      ORDER BY created_at DESC LIMIT 25
    `, chkParams).rows;

    // 3. Completed checklist submissions (موارد چک‌لیست تکمیل‌شده)
    const checklistIds = checklists.map(c => c.id);
    let subWhere = [];
    let subParams = [req.hospitalId];
    if (checklistIds.length > 0) {
      const chkIdPlaceholders = checklistIds.map(() => '?').join(',');
      subWhere.push(`cs.checklist_id IN (${chkIdPlaceholders})`);
      subParams.push(...checklistIds);
    }
    if (uniqueKeywords.length > 0) {
      const refClauses = [];
      uniqueKeywords.forEach(kw => {
        refClauses.push('cs.reference LIKE ?');
        subParams.push(`%${kw}%`);
      });
      subWhere.push(`(${refClauses.join(' OR ')})`);
    }

    let submissions = [];
    if (subWhere.length > 0) {
      submissions = query(`
        SELECT cs.id, cs.checklist_id, cs.reference, cs.score, cs.max_score, cs.note, cs.submitted_at,
               c.title as checklist_title, c.checklist_code,
               u.full_name as submitter_name, r.title_fa as submitter_role
        FROM checklist_submissions cs
        JOIN checklists c ON c.id = cs.checklist_id
        LEFT JOIN users u ON u.id = cs.submitted_by
        LEFT JOIN roles r ON r.id = u.role_id
        WHERE cs.hospital_id = ? AND (${subWhere.join(' OR ')})
        ORDER BY cs.submitted_at DESC LIMIT 30
      `, subParams).rows;
    }

    // 4. Processes / Flowcharts
    let flowWhere = `(section_id IN (${secPlaceholders}) OR process_code LIKE ? OR process_code LIKE ? OR title LIKE ? OR title LIKE ?`;
    let flowParams = [req.hospitalId, ...secIds, `%${code}%`, `%${numOnly}%`, `%${code}%`, `%${numOnly}%`];
    uniqueKeywords.forEach(kw => {
      flowWhere += ' OR title LIKE ?';
      flowParams.push(`%${kw}%`);
    });
    flowWhere += ')';

    const flowcharts = query(`
      SELECT id, title, process_code, domain, status, file_path, file_name, created_at
      FROM processes
      WHERE hospital_id = ? AND ${flowWhere}
      ORDER BY created_at DESC LIMIT 25
    `, flowParams).rows;

    // 5. Evidence files
    const evidence = query(`
      SELECT ef.id, ef.title, ef.file_path, ef.file_name, ef.file_size_bytes, ef.created_at,
             COALESCE(u.full_name, 'ثبت‌کننده شواهد') as uploaded_by,
             r.title_fa as uploader_role
      FROM evidence_files ef
      LEFT JOIN users u ON u.id = ef.uploaded_by
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE ef.hospital_id = ? AND (ef.entity_id IN (${secPlaceholders}) OR ef.title LIKE ? OR ef.title LIKE ?)
      ORDER BY ef.created_at DESC LIMIT 25
    `, [req.hospitalId, ...secIds, `%${code}%`, `%${numOnly}%`]).rows;

    // 6. Measure evaluations (ارزیابی‌های ثبت‌شده سنجه / استاندارد)
    const evaluations = query(`
      SELECT ms.id, ms.measure_id, ms.status, ms.notes, ms.last_reviewed_at, ms.year,
             s.code as measure_code, s.title as measure_title,
             u.full_name as reviewer_name, r.title_fa as reviewer_role
      FROM measure_status ms
      JOIN accreditation_sections s ON s.id = ms.measure_id
      LEFT JOIN users u ON u.id = ms.last_reviewed_by
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE ms.hospital_id = ? AND ms.measure_id IN (${secPlaceholders}) AND ms.status IS NOT NULL
      ORDER BY ms.last_reviewed_at DESC LIMIT 25
    `, [req.hospitalId, ...secIds]).rows;

    // 7. Measure evaluation status (Single active)
    const currentStatus = query(`
      SELECT * FROM measure_status WHERE hospital_id = ? AND measure_id = ?
    `, [req.hospitalId, sec.id]).rows[0] || null;

    res.json({
      measure: {
        id: sec.id,
        code: sec.code,
        title: sec.title,
        statement: sec.statement,
        measure_level: sec.measure_level,
        page: sec.page,
        patient_safety_flag: sec.patient_safety_flag,
        level_type: sec.level_type
      },
      counts: {
        total: policies.length + procedures.length + checklists.length + flowcharts.length + evidence.length + submissions.length + evaluations.length,
        policies: policies.length,
        procedures: procedures.length,
        checklists: checklists.length,
        submissions: submissions.length,
        flowcharts: flowcharts.length,
        evidence: evidence.length,
        evaluations: evaluations.length
      },
      current_status: currentStatus,
      policies,
      procedures,
      checklists,
      submissions,
      flowcharts,
      evidence,
      evaluations
    });
  } catch (err) {
    console.error('[MeasureArtifacts]', err);
    res.status(500).json({ error: 'خطای سرور در واکشی اقلام سنجه' });
  }
});

// همان اتحادِ مجوزِ درخت (خط ۹۷): هر که درخت را می‌بیند، فهرست وضعیت را هم لازم دارد
// (S.statusMap در data-loader از همین ساخته می‌شود) — سنجه‌ی گارد برای این GET جای
// authorize اینجا requireAnyPermission است تا خواندنِ وضعیت برای نقش‌های edit-only
// (سوپروایزر بالینی/کنترل عفونت) نشکند. فقط دو نقشِ بدونِ UIِ درخت ۴۰۳ می‌گیرند که
// لودر آن را swallow می‌کند (canSeeTree=false → درخواست هم زده نمی‌شود).
router.get('/accreditation/status', authRequired,
  requireAnyPermission('view_accreditation_full_tree', 'edit_measure_status', 'view_measure_status_readonly'),
  hospitalScope, (req, res) => {
  try {
    const year = statusYear(req);
    const result = query(`SELECT ms.*, m.code as measure_code, u.full_name as reviewer_name
      FROM measure_status ms JOIN accreditation_sections m ON ms.measure_id = m.id
      LEFT JOIN users u ON ms.last_reviewed_by = u.id
      WHERE ms.hospital_id = ? AND ms.year = ? ORDER BY m.code`, [req.hospitalId, year]);
    res.json({ year, statuses: result.rows });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// Update measure status
router.put('/accreditation/status/:measureId', authRequired, requirePermission('edit_measure_status'), hospitalScope, (req, res) => {
  const { status, notes } = req.body;
  // «غیرقابل ارزیابی» وضعیت پنجم است: سنجه‌ای که این مرکز اصلاً آن خدمت/بخش
  // را ندارد. برخلاف چهار وضعیت دیگر، از مخرجِ کسرِ امتیاز بیرون می‌رود —
  // همان کاری که فرایند رسمی در مرحله‌ی خوداظهاری می‌کند.
  if (!['not_reviewed', 'non_compliant', 'partial', 'full_compliant', 'not_applicable'].includes(status)) return res.status(400).json({ error: 'وضعیت نامعتبر' });
  // دلیل اجباری است چون این یک ادعای قابل‌ممیزی است که ارزیاب بیرونی می‌خواندش،
  // نه راهی برای کنار گذاشتن سنجه‌های سخت.
  const naReason = String(req.body.na_reason || '').trim();
  if (status === 'not_applicable' && naReason.length < 5) {
    return res.status(400).json({ error: 'برای «غیرقابل ارزیابی» ثبت دلیل الزامی است (دست‌کم ۵ نویسه)' });
  }
  try {
    // پیش از این هیچ بررسی دامنه‌ای اینجا نبود: هر نقشی با مجوز edit_measure_status می‌توانست
    // وضعیت *هر* سنجه‌ای را تغییر دهد، حتی خارج از محورهای نقشش. حالا همان قاعده‌ی درخت اعمال می‌شود.
    const m = query('SELECT id, code FROM accreditation_sections WHERE id = ?', [req.params.measureId]).rows[0];
    if (!m) return res.status(404).json({ error: 'سنجه یافت نشد' });
    const scope = scopeFor(req.user.role_code, req.user.permissions);
    if (!measureAllowed(scope, m, loadOverrides(req.user.id))) {
      return res.status(403).json({ error: 'این سنجه خارج از دامنه دسترسی شماست' });
    }
    const year = statusYear(req);
    const existing = query('SELECT id, status FROM measure_status WHERE hospital_id = ? AND measure_id = ? AND year = ?',
      [req.hospitalId, req.params.measureId, year]);
    if (existing.rows.length > 0) {
      const old = existing.rows[0];
      query('UPDATE measure_status SET status = ?, notes = ?, na_reason = ?, last_reviewed_by = ?, last_reviewed_at = ? WHERE id = ?',
        [status, notes||null, status === 'not_applicable' ? naReason : null, req.user.id, new Date().toISOString(), old.id]);
      // تاریخچه تغییرات وضعیت سنجه (مورد ۱۵ چک‌لیست) — ثبت old->new با کاربر و زمان
      try {
        if (old.status !== status) {
          query(`INSERT INTO measure_status_history (id, measure_id, hospital_id, year, old_status, new_status, changed_by, note)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuid(), req.params.measureId, req.hospitalId, year, old.status || null, status, req.user.id, (notes||'').slice(0,500) || null]);
        }
      } catch (e) { console.error('[MeasureHistory-log]', e.message); }
    } else {
      query('INSERT INTO measure_status (id, hospital_id, measure_id, year, status, notes, na_reason, last_reviewed_by, last_reviewed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [uuid(), req.hospitalId, req.params.measureId, year, status, notes||null, status === 'not_applicable' ? naReason : null, req.user.id, new Date().toISOString()]);
      // اولین ثبت هم در تاریخچه می‌آید (old=null)
      try {
        query(`INSERT INTO measure_status_history (id, measure_id, hospital_id, year, old_status, new_status, changed_by, note)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuid(), req.params.measureId, req.hospitalId, year, null, status, req.user.id, (notes||'').slice(0,500) || null]);
      } catch (e) { console.error('[MeasureHistory-log]', e.message); }
    }
    res.json({ status: 'updated', year });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

/* ---------- نمره‌ی ارزیاب داخلی و بیرونی ----------
   سه قضاوت مستقل روی یک سنجه: خودارزیابی بیمارستان (ستون status، همان مسیر
   بالا)، ارزیابی داخلی دانشگاه، و ارزیابی بیرونی وزارت. مهم‌ترین خروجی،
   اختلاف این‌هاست: «کجا خودمان را بالاتر از واقعیت دیده‌ایم؟»

   مجوزش عمداً approve_measure_status است نه edit_measure_status: پرستارِ
   بخش باید بتواند خودارزیابیِ سنجه‌ی خودش را ثبت کند، ولی نمره‌ای که ادعا
   می‌کند «ارزیابِ وزارت این را داده» نه. */
const REVIEW_KINDS = { internal: 'internal', external: 'external' };

router.put('/accreditation/review/:kind/:measureId', authRequired,
  requirePermission('approve_measure_status'), hospitalScope, (req, res) => {
  const kind = REVIEW_KINDS[req.params.kind];
  if (!kind) return res.status(400).json({ error: 'نوع ارزیابی نامعتبر' });
  const { status, note } = req.body;
  // null یعنی «هنوز ارزیابی نشده» و با «بررسی‌نشده»ی خودارزیابی فرق دارد:
  // آن یکی کارِ نکرده‌ی بیمارستان است، این یکی ارزیابی‌ای که هنوز رخ نداده.
  const allowed = ['non_compliant', 'partial', 'full_compliant', 'not_applicable'];
  if (status !== null && status !== '' && !allowed.includes(status)) {
    return res.status(400).json({ error: 'وضعیت نامعتبر' });
  }
  try {
    const m = query('SELECT id, code FROM accreditation_sections WHERE id = ?', [req.params.measureId]).rows[0];
    if (!m) return res.status(404).json({ error: 'سنجه یافت نشد' });
    const scope = scopeFor(req.user.role_code, req.user.permissions);
    if (!measureAllowed(scope, m, loadOverrides(req.user.id))) {
      return res.status(403).json({ error: 'این سنجه خارج از دامنه دسترسی شماست' });
    }
    const year = statusYear(req);
    const val = (status === '' ) ? null : status;
    const row = query('SELECT id FROM measure_status WHERE hospital_id = ? AND measure_id = ? AND year = ?',
      [req.hospitalId, req.params.measureId, year]).rows[0];
    const now = new Date().toISOString();
    if (row) {
      query(`UPDATE measure_status SET ${kind}_status = ?, ${kind}_note = ?, ${kind}_by = ?, ${kind}_at = ? WHERE id = ?`,
        [val, note || null, req.user.id, val ? now : null, row.id]);
    } else {
      // نمره‌ی ارزیاب می‌تواند پیش از خودارزیابی ثبت شود؛ ردیف با خودارزیابیِ
      // «بررسی‌نشده» ساخته می‌شود تا هیچ ادعایی جعل نشود.
      query(`INSERT INTO measure_status (id, hospital_id, measure_id, year, status, ${kind}_status, ${kind}_note, ${kind}_by, ${kind}_at)
             VALUES (?, ?, ?, ?, 'not_reviewed', ?, ?, ?, ?)`,
        [uuid(), req.hospitalId, req.params.measureId, year, val, note || null, req.user.id, val ? now : null]);
    }
    res.json({ status: 'updated', kind, year });
  } catch (err) { console.error('[Review]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

/* گزارش اختلاف: سنجه‌هایی که ادعای بیمارستان از نمره‌ی ارزیاب بالاتر است.
   همان چیزی که مدیر اعتباربخشی پیش از ارزیابی رسمی لازم دارد. */
const SCORE_RANK = { non_compliant: 0, partial: 1, full_compliant: 2 };
router.get('/accreditation/review-gaps', authRequired,
  requireAnyPermission('view_accreditation_full_tree', 'approve_measure_status'), hospitalScope, (req, res) => {
  try {
    const year = statusYear(req);
    const rows = query(`SELECT ms.measure_id, ms.status, ms.internal_status, ms.external_status,
                               ms.internal_note, ms.external_note,
                               m.code, m.statement, m.measure_level, m.patient_safety_flag, m.responsible_role
      FROM measure_status ms JOIN accreditation_sections m ON m.id = ms.measure_id
      WHERE ms.hospital_id = ? AND ms.year = ?
        AND (ms.internal_status IS NOT NULL OR ms.external_status IS NOT NULL)`,
      [req.hospitalId, year]).rows;

    const gaps = [];
    let agreed = 0, reviewed = 0;
    for (const r of rows) {
      const self = SCORE_RANK[r.status];
      // بیرونی بر داخلی مقدم است: هر دو که باشند، بیرونی حرفِ آخر است
      const kind = r.external_status ? 'external' : 'internal';
      const other = SCORE_RANK[kind === 'external' ? r.external_status : r.internal_status];
      if (self === undefined || other === undefined) continue;   // NA یا بررسی‌نشده
      reviewed++;
      if (self === other) { agreed++; continue; }
      gaps.push({
        measure_id: r.measure_id, code: r.code, statement: r.statement,
        measure_level: r.measure_level, patient_safety_flag: r.patient_safety_flag,
        responsible_role: r.responsible_role,
        self_status: r.status, review_kind: kind,
        review_status: kind === 'external' ? r.external_status : r.internal_status,
        review_note: kind === 'external' ? r.external_note : r.internal_note,
        direction: self > other ? 'over' : 'under',   // over = خودمان را بالاتر دیده‌ایم
        distance: Math.abs(self - other),
      });
    }
    gaps.sort((a, b) => (b.direction === 'over') - (a.direction === 'over')
      || b.distance - a.distance
      || b.patient_safety_flag - a.patient_safety_flag);
    res.json({ year, reviewed, agreed, gaps });
  } catch (err) { console.error('[ReviewGaps]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

module.exports = router;
