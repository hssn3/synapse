/**
 * Accreditation Learning Routes
 * مسیر یادگیری نقش‌محور برای سنجه‌های نسل ششم.
 *
 * این ماژول فقط «آموزش» است: هیچ رکوردی در measure_status نمی‌نویسد و متن
 * کتاب را دست‌کاری نمی‌کند. دامنهٔ آموزشی از محورهای نقش (و برای سرپرستار و
 * جانشین سرپرستار بخش، محورهای سرپرستاری) می‌آید؛ پیشرفت مطالعه سمت مرورگر
 * نگه داشته می‌شود.
 */
const express = require('express');
const router = express.Router();
const {
  query, authRequired, scopeFor, axisCodeOf, measureAllowed,
  loadOverrides, headNurseWardsOf, codeCmp,
} = require('../common');
const { ROLE_AXES } = require('../../config/role-axes');

const SEP = '\uf0a7';

// لایهٔ آموزشی «به زبان ساده» به‌صورت ثابت و بیرون از دیتابیس نگه داشته می‌شود.
// این متن جایگزین متن رسمی نیست و فقط برای فهم بهتر همان سنجه در مرحلهٔ مطالعه می‌آید.
let simpleLessons = {};
try {
  const pack = require('../../data/learning-simple.json');
  simpleLessons = (pack && pack.items) || {};
} catch (err) {
  console.warn('[LearningSimple] بارگذاری متن ساده ممکن نشد:', err.message);
}

// نقش‌هایی که در نگاشت دسترسیِ درخت نیستند یا برای آموزش محورهای بیشتری لازم دارند.
// این جدول فقط دامنهٔ «آموزش» را می‌سازد و هیچ مجوز ثبت/مشاهدهٔ رسمی را تغییر نمی‌دهد.
const LEARNING_EXTRA_AXES = {
  patient_safety_officer: ['الف-1', 'ب-1'],
  medical_equipment_engineer: ['الف-7'],
  it_manager: ['الف-5'],
  medical_records_manager: ['الف-5'],
  logistics_manager: ['الف-2', 'الف-6', 'ج-1'],
  nursing_office_assistant: ['الف-3', 'الف-4', 'ب-1'],
  nurse: ['ب-1', 'ب-5'],
  supervisor_clinical: ['ب-1', 'ب-2', 'ب-3', 'ب-8', 'ب-9'],
};

// مالک گام‌ها در کتاب با عنوان واحد/سمت نوشته شده است، نه با کد نقش.
// «سمت شما» فقط وقتی به کار می‌رود که عنوان کتاب واقعاً همان سمت باشد؛
// عنوان‌های ستادیِ تیم پرستاری جداگانه به‌عنوان «تیم شما» علامت می‌خورند.
const ROLE_OWNER_ALIASES = {
  nursing_director: ['مدیر پرستاری'],
  education_supervisor: ['سوپروایزر آموزش'],
  quality_control_manager: ['بهبود کیفیت'],
  accreditation_manager: ['بهبود کیفیت'],
  patient_safety_officer: ['کارشناس هماهنگ کننده ایمنی بیمار', 'بهبود کیفیت'],
  infection_control_supervisor: ['کنترل عفونت'],
  environmental_health_officer: ['بهداشت محیط'],
  occupational_health_officer: ['بهداشت حرفه ای'],
  nutrition_manager: ['تغذیه'],
  financial_manager: ['مدیر مالی', 'اقتصاد درمان'],
  accounting_manager: ['مدیر مالی', 'اقتصاد درمان'],
  hr_manager: ['مدیر اداری'],
  technical_officer: ['مدیر درمان'],
  medical_equipment_engineer: ['تجهیزات پزشکی'],
  it_manager: ['IT'],
  medical_records_manager: ['مدارک پزشکی'],
  social_worker: ['مدد کاری'],
  logistics_manager: ['خدمات', 'انبار', 'تاسیسات'],
  breastfeeding_specialist: ['کارشناس شیر مادر', 'بلوک زایمان'],
  hospital_president: ['مدیر بیمارستان'],
  admin: ['مدیر بیمارستان', 'مدیر اداری', 'بهبود کیفیت'],
};

// گام‌هایی که کتاب به دفتر/ستاد پرستاری داده است، برای سرپرستار و سوپروایزر
// «تیم شما» هستند، نه وظیفهٔ مستقیم همان سمت.
const TEAM_OWNER_ALIASES = {
  nursing_office_assistant: ['مدیر پرستاری'],
  clinical_supervisor: ['مدیر پرستاری'],
  head_nurse: ['مدیر پرستاری'],
  staff_nurse: ['مدیر پرستاری'],
  nurse: ['مدیر پرستاری'],
  education_supervisor: ['مدیر پرستاری'],
};

// محور مرتبط با نوع بخش، فقط برای مرتب‌سازی و پیشنهاد آموزشی — نه تغییر وظیفه.
// کتاب بخش‌های عمومی (اورژانس، ICU، اتاق عمل…) را در محور مراقبتی متناظر می‌بیند.
const WARD_AXIS_HINTS = [
  { re: /اورژانس|تریاژ/, axes: ['ب-2'], label: 'مراقبت‌های حاد و اورژانس' },
  { re: /(?<![A-Za-z])ICU|CCU|قلب|مراقبت‌های ویژه(?!\s*نوزادان)/, axes: ['ب-2'], label: 'مراقبت‌های حاد و اورژانس' },
  { re: /اتاق عمل|ریکاوری|جراحی|ارتوپدی/, axes: ['ب-3'], label: 'مراقبت‌های جراحی و بیهوشی' },
  { re: /NICU|نوزادان|زایمان|زنان|مامایی/, axes: ['ب-4'], label: 'مراقبت‌های مادر و نوزاد' },
];

// عنوان واحدی که باید با مالک گام‌های کتاب تطبیق داده شود (علاوه بر خود عنوان بخش).
const WARD_OWNER_ALIAS_HINTS = [
  { re: /NICU|نوزادان/, keys: ['NICU'] },
  { re: /ICU|مراقبت‌های ویژه/, keys: ['ICU'] },
  { re: /اتاق عمل/, keys: ['اتاق عمل'] },
  { re: /زایمان|زنان|مامایی/, keys: ['بلوک زایمان'] },
  { re: /CCU/, keys: ['CCU'] },
];

function unique(list) {
  return [...new Set((list || []).filter(Boolean))];
}

function normalizeFa(value) {
  return String(value == null ? '' : value)
    .replace(/[\u064A\u0649]/g, 'ی')
    .replace(/\u0643/g, 'ک')
    .replace(/[\u200c\u200e\u200f]/g, ' ')
    .replace(/[()\[\]{}«»"'،؛:.,\/\\\-–—_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function parseOwners(raw) {
  if (Array.isArray(raw)) return raw.map(x => (x == null ? null : String(x)));
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.map(x => (x == null ? null : String(x))) : [];
  } catch (e) { return []; }
}

function splitDetail(text) {
  return String(text || '').split(SEP).map(x => x.trim()).filter(Boolean);
}

// گام‌ها هم‌طول آرایهٔ مالکان‌اند؛ هر بخش اضافه (معمولاً توضیح یا شرط احراز) مالک گام نیست.
function splitSteps(measure) {
  const owners = parseOwners(measure.step_owners);
  const segments = splitDetail(measure.detail_text);
  const stepCount = owners.length ? Math.min(owners.length, segments.length) : segments.length;
  const steps = segments.slice(0, stepCount).map((text, i) => ({
    n: i + 1,
    text,
    owner: owners[i] || null,
  }));
  const extras = segments.slice(stepCount).map((text, i) => ({ n: i + 1, text }));
  return { owners, steps, extras };
}

function wardInfoOf(user) {
  const wards = headNurseWardsOf(user.hospital_id, user.id) || [];
  return wards.map(w => ({
    id: w.id,
    title: w.title,
    icon: w.icon || null,
    role: w.head_nurse_id === user.id ? 'head'
      : (w.deputy1_id === user.id || w.deputy2_id === user.id ? 'deputy' : 'member'),
  }));
}

function axesOfRole(roleCode) {
  const rows = query(
    "SELECT code FROM accreditation_sections WHERE level_type = 'measure' AND responsible_role = ?",
    [roleCode]
  ).rows;
  return unique(rows.map(r => axisCodeOf(r.code)));
}

function wardAxesOf(wards) {
  const codes = [];
  for (const w of wards) {
    for (const hint of WARD_AXIS_HINTS) {
      if (hint.re.test(w.title || '')) codes.push(...hint.axes);
    }
  }
  return { codes: unique(codes), labels: unique(wards.flatMap(w => WARD_AXIS_HINTS
    .filter(h => h.re.test(w.title || '')).map(h => h.label))) };
}

function learningScope(user, wards) {
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];
  const base = scopeFor(user.role_code, permissions);
  if (base === '*') {
    return { axes: '*', sources: {}, wardAxes: [], wardLabels: [] };
  }

  const sources = {};
  for (const code of base) sources[code] = 'role';

  const known = Object.prototype.hasOwnProperty.call(ROLE_AXES, user.role_code);
  const fallback = known ? [] : axesOfRole(user.role_code);
  for (const code of (LEARNING_EXTRA_AXES[user.role_code] || []).concat(fallback)) {
    if (!sources[code]) sources[code] = 'role-extra';
  }

  const ward = wardAxesOf(wards);
  for (const code of ward.codes) {
    if (!sources[code]) sources[code] = 'ward';
  }

  // سرپرستار و جانشین سرپرستار بخش در دیتابیس نقش staff_nurse دارند؛
  // محورهای سرپرستاری فقط برای همین دو نفر به دامنهٔ آموزشی اضافه می‌شود.
  if (wards.length) {
    for (const code of ROLE_AXES.head_nurse) {
      if (!sources[code]) sources[code] = 'head';
    }
  }

  return {
    axes: Object.keys(sources),
    sources,
    wardAxes: ward.codes.filter(code => sources[code] === 'ward'),
    wardLabels: ward.labels,
  };
}

function makeMatcher(user, wards) {
  const unitKeys = new Set();
  const roleKeys = new Set();
  const teamKeys = new Set();

  const addUnit = (value) => {
    const n = normalizeFa(value);
    if (n.length >= 3) unitKeys.add(n);
  };

  const department = user.department || '';
  const parts = String(department).split(/\s*-\s*/).map(x => x.trim()).filter(Boolean);
  if (parts.length > 1) parts.slice(1).forEach(addUnit);
  else if (parts[0] && !['پرستاری', 'مدیریت'].includes(parts[0])) addUnit(parts[0]);
  if (/زنان و زایمان/.test(department)) addUnit('بلوک زایمان');

  for (const w of wards) {
    addUnit(w.title);
    const plain = String(w.title).replace(/\([^)]*\)/g, ' ');
    addUnit(plain);
    const latin = String(w.title).match(/[A-Za-z]{2,}/g) || [];
    latin.forEach(t => unitKeys.add(t.toLowerCase()));
    for (const hint of WARD_OWNER_ALIAS_HINTS) {
      if (hint.re.test(w.title || '')) hint.keys.forEach(addUnit);
    }
  }

  const roleAliases = (ROLE_OWNER_ALIASES[user.role_code] || []).slice();
  roleAliases.forEach(x => {
    const n = normalizeFa(x);
    if (n) roleKeys.add(n);
  });

  const teamAliases = (TEAM_OWNER_ALIASES[user.role_code] || []).slice();
  teamAliases.forEach(x => {
    const n = normalizeFa(x);
    if (n) teamKeys.add(n);
  });

  function hit(key, owner) {
    if (!key || !owner) return false;
    if (key === owner) return true;
    const asciiKey = /^[a-z0-9 ]+$/.test(key);
    const asciiOwner = /^[a-z0-9 ]+$/.test(owner);
    if (asciiKey || asciiOwner) {
      const kt = key.split(' ').filter(Boolean);
      const ot = owner.split(' ').filter(Boolean);
      return kt.some(t => t.length >= 2 && ot.includes(t));
    }
    return key.length >= 4 && (key.includes(owner) || owner.includes(key));
  }

  return function match(owner) {
    const o = normalizeFa(owner);
    if (!o) return { unit: false, role: false, team: false };
    let unit = false;
    let role = false;
    let team = false;
    for (const k of unitKeys) { if (hit(k, o)) { unit = true; break; } }
    for (const k of roleKeys) { if (hit(k, o)) { role = true; break; } }
    for (const k of teamKeys) { if (hit(k, o)) { team = true; break; } }
    return { unit, role, team };
  };
}

function positionOf(user, wards) {
  const heads = wards.filter(w => w.role === 'head');
  const deputies = wards.filter(w => w.role === 'deputy');
  if (heads.length) {
    return {
      kind: 'head',
      title: `سرپرستار بخش ${heads.map(w => w.title).join('، ')}`,
      ward_titles: heads.map(w => w.title),
    };
  }
  if (deputies.length) {
    return {
      kind: 'deputy',
      title: `جانشین سرپرستار بخش ${deputies.map(w => w.title).join('، ')}`,
      ward_titles: deputies.map(w => w.title),
    };
  }
  return { kind: 'role', title: user.role_title || user.role_code, ward_titles: [] };
}

function learningContext(req) {
  const user = req.user;
  const wards = wardInfoOf(user);
  const scopeInfo = learningScope(user, wards);
  const position = positionOf(user, wards);
  const matcher = makeMatcher(user, wards);
  return { user, wards, scope: scopeInfo.axes, scopeInfo, position, matcher };
}

function scopeIsEmpty(scope) {
  return Array.isArray(scope) && scope.length === 0;
}

// فهرست سبک سنجه‌ها (بدون متن کامل) برای ساخت مسیر آموزشی.
router.get('/accreditation/learning/path', authRequired, (req, res) => {
  try {
    const ctx = learningContext(req);
    const { user, wards, scope, scopeInfo, position, matcher } = ctx;
    const ov = loadOverrides(user.id);

    if (scopeIsEmpty(scope) && ov.grants.size === 0) {
      return res.json({
        user: {
          id: user.id, full_name: user.full_name,
          role_code: user.role_code, role_title: user.role_title,
          department: user.department || null,
          wards, position_title: position.title, position_kind: position.kind,
        },
        scope: { kind: 'none', axes: [], note: 'برای سمت شما محور آموزشی تعریف نشده است.' },
        stats: { chapters: 0, axes: 0, standards: 0, measures: 0, steps: 0, safety_measures: 0, unit_measures: 0, team_measures: 0 },
        chapters: [],
      });
    }

    const rows = query(
      `SELECT id, code, parent_id, statement, detail_text, step_owners, measure_level,
              patient_safety_flag, weight_multiplier, page, responsible_role
         FROM accreditation_sections WHERE level_type = 'measure'`
    ).rows;
    const nodes = query(
      `SELECT id, code, level_type, title, statement, parent_id
         FROM accreditation_sections WHERE level_type <> 'measure'`
    ).rows;
    const byId = new Map(nodes.map(n => [n.id, n]));

    const chapters = new Map();
    const axisIndex = new Map();
    let measureCount = 0;
    let stepTotal = 0;
    let safetyCount = 0;
    let unitCount = 0;
    let teamCount = 0;

    for (const m of rows) {
      if (!measureAllowed(scope, m, ov)) continue;
      const std = byId.get(m.parent_id);
      const axis = std ? byId.get(std.parent_id) : null;
      if (!std || !axis) continue;
      const chapter = byId.get(axis.parent_id) || {
        code: axis.code.split('-')[0],
        title: axis.title,
      };

      const { steps, extras } = splitSteps(m);
      const owners = unique(steps.map(s => s.owner));
      const unitSteps = steps.filter(s => matcher(s.owner).unit).length;
      const roleSteps = steps.filter(s => matcher(s.owner).role).length;
      const teamSteps = steps.filter(s => matcher(s.owner).team).length;

      if (!chapters.has(chapter.code)) {
        chapters.set(chapter.code, {
          code: chapter.code, title: chapter.title || chapter.code, axes: [],
        });
      }
      if (!axisIndex.has(axis.code)) {
        const node = { code: axis.code, title: axis.title || axis.code, standards: [] };
        axisIndex.set(axis.code, node);
        chapters.get(chapter.code).axes.push(node);
      }
      const axisNode = axisIndex.get(axis.code);
      let stdNode = axisNode.standards.find(x => x.code === std.code);
      if (!stdNode) {
        stdNode = { code: std.code, title: std.statement || std.title || std.code, measures: [] };
        axisNode.standards.push(stdNode);
      }
      stdNode.measures.push({
        id: m.id,
        code: m.code,
        statement: m.statement || '',
        level: m.measure_level || 1,
        safety: !!m.patient_safety_flag,
        weight: m.weight_multiplier == null ? 1 : m.weight_multiplier,
        page: m.page || null,
        step_count: steps.length,
        extra_count: extras.length,
        unit_steps: unitSteps,
        role_steps: roleSteps,
        team_steps: teamSteps,
        owners,
      });

      measureCount += 1;
      stepTotal += steps.length;
      if (m.patient_safety_flag) safetyCount += 1;
      if (unitSteps > 0) unitCount += 1;
      if (teamSteps > 0) teamCount += 1;
    }

    const sortChapter = (a, b) => codeCmp(a.code, b.code);
    const list = [...chapters.values()].sort(sortChapter);
    for (const ch of list) {
      ch.axes.sort(sortChapter);
      for (const ax of ch.axes) {
        ax.standards.sort(sortChapter);
        for (const st of ax.standards) {
          st.measures.sort((a, b) => {
            const pa = (a.unit_steps > 0 ? 4 : 0) + (a.role_steps > 0 ? 2 : 0) + (a.team_steps > 0 ? 1 : 0);
            const pb = (b.unit_steps > 0 ? 4 : 0) + (b.role_steps > 0 ? 2 : 0) + (b.team_steps > 0 ? 1 : 0);
            if (pa !== pb) return pb - pa;
            return codeCmp(a.code, b.code);
          });
        }
      }
    }

    const axisList = [...axisIndex.values()].sort(sortChapter).map(a => ({
      code: a.code,
      title: a.title,
      source: scopeInfo.sources && scopeInfo.sources[a.code] ? scopeInfo.sources[a.code] : null,
      standards: a.standards.length,
      measures: a.standards.reduce((n, s) => n + s.measures.length, 0),
    }));

    let note = 'این مسیر از محورهای پاسخ‌گویی سمت شما ساخته شده است.';
    if (scope === '*') note = 'این مسیر همهٔ ۱۸ محور آموزشی را برای سمت شما باز می‌کند.';
    else if (position.kind === 'head' || position.kind === 'deputy') {
      note = 'محورهای مدیریت خدمات پرستاری و محور مراقبتیِ متناظر با نوع بخش به این مسیر اضافه شده‌اند.';
    } else if (scopeInfo.wardAxes && scopeInfo.wardAxes.length) {
      note = 'محورهای مرتبط با نوع واحد سازمانی شما هم به این مسیر اضافه شده‌اند.';
    }

    res.json({
      user: {
        id: user.id, full_name: user.full_name,
        role_code: user.role_code, role_title: user.role_title,
        department: user.department || null,
        wards, position_title: position.title, position_kind: position.kind,
      },
      scope: {
        kind: scope === '*' ? 'all' : 'axes',
        axes: axisList,
        ward_axes: scopeInfo.wardAxes || [],
        ward_labels: scopeInfo.wardLabels || [],
        note,
      },
      stats: {
        chapters: list.length,
        axes: axisList.length,
        standards: list.reduce((n, c) => n + c.axes.reduce((m, a) => m + a.standards.length, 0), 0),
        measures: measureCount,
        steps: stepTotal,
        safety_measures: safetyCount,
        unit_measures: unitCount,
        team_measures: teamCount,
      },
      chapters: list,
    });
  } catch (err) {
    console.error('[LearningPath]', err);
    res.status(500).json({ error: 'خطا در ساخت مسیر آموزشی' });
  }
});

// متن کامل یک سنجه برای درس گام‌به‌گام؛ دسترسی همان دامنهٔ آموزشی فهرست است.
router.get('/accreditation/learning/measure/:id', authRequired, (req, res) => {
  try {
    const rawId = String(req.params.id || '').trim();
    if (!rawId) return res.status(400).json({ error: 'شناسهٔ سنجه لازم است' });

    const measure = query(
      `SELECT * FROM accreditation_sections
        WHERE level_type = 'measure' AND (id = ? OR code = ?) LIMIT 1`,
      [rawId, rawId]
    ).rows[0];
    if (!measure) return res.status(404).json({ error: 'سنجه یافت نشد' });

    const ctx = learningContext(req);
    const { user, wards, scope, scopeInfo, position, matcher } = ctx;
    const ov = loadOverrides(user.id);
    if (!measureAllowed(scope, measure, ov)) {
      return res.status(403).json({ error: 'این سنجه در دامنهٔ آموزشی سمت شما نیست' });
    }

    const std = measure.parent_id ? query(
      'SELECT id, code, title, statement, parent_id FROM accreditation_sections WHERE id = ?',
      [measure.parent_id]
    ).rows[0] : null;
    const axis = std ? query(
      'SELECT id, code, title, parent_id FROM accreditation_sections WHERE id = ?',
      [std.parent_id]
    ).rows[0] : null;
    const chapter = axis ? query(
      'SELECT id, code, title FROM accreditation_sections WHERE id = ?',
      [axis.parent_id]
    ).rows[0] : null;

    const { owners, steps, extras } = splitSteps(measure);
    const stepList = steps.map(s => {
      const matched = matcher(s.owner);
      return { n: s.n, text: s.text, owner: s.owner, in_unit: matched.unit, in_role: matched.role, in_team: matched.team };
    });
    const extraList = extras.map(x => ({ n: x.n, text: x.text }));
    const wordCount = (txt) => String(txt || '').trim().split(/\s+/).filter(Boolean).length;

    res.json({
      user: {
        id: user.id, full_name: user.full_name,
        role_code: user.role_code, role_title: user.role_title,
        department: user.department || null,
        wards, position_title: position.title, position_kind: position.kind,
      },
      measure: {
        id: measure.id,
        code: measure.code,
        statement: measure.statement || '',
        detail_text: measure.detail_text || '',
        level: measure.measure_level || 1,
        safety: !!measure.patient_safety_flag,
        weight: measure.weight_multiplier == null ? 1 : measure.weight_multiplier,
        page: measure.page || null,
        owners,
        step_count: stepList.length,
        extra_count: extraList.length,
        word_count: wordCount(measure.statement) + stepList.reduce((n, s) => n + wordCount(s.text), 0),
      },
      simple: simpleLessons[measure.code] || null,
      chapter: chapter || null,
      axis: axis || null,
      standard: std || null,
      steps: stepList,
      extras: extraList,
      scope: {
        kind: scope === '*' ? 'all' : 'axes',
        ward_axes: scopeInfo.wardAxes || [],
        ward_labels: scopeInfo.wardLabels || [],
      },
      note: 'متن سنجه و گام‌ها عیناً از کتاب استانداردهای ملی اعتباربخشی (ویرایش ششم) آمده است.',
    });
  } catch (err) {
    console.error('[LearningMeasure]', err);
    res.status(500).json({ error: 'خطا در دریافت متن سنجه' });
  }
});

module.exports = router;
