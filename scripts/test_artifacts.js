const { db } = require('../src/config/database-sqlite');

function normCode(s) {
  return String(s || '')
    .replace(/[۰-۹]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])
    .replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/\s+/g, '')
    .trim();
}

function getKeywords(texts) {
  const stopWords = new Set([
    'در','به','و','از','با','بر','تا','یا','که','برای','جهت','صورت','مربوط','شده','است','بود',
    'می‌شود','می‌گردد','می‌باشد','می‌شوند','می‌گردند','می‌باشند','انجام','رعایت',
    'کلیه','تمام','تمامی','بخش','واحد','بخش‌ها','واحد‌ها','بیمارستان','مراکز','مرکز','سیستم',
    'های','ها','یک','دو','سه','چهار','پنج','شش','هفت','هشت','نه','ده',
    'اقدامات','تعیین','اجرا','تسهیل','ارائه','نظارت','ایجاد','پایش','حوزه'
  ]);
  const words = texts.filter(Boolean).join(' ')
    .replace(/[،؛:«»()0-9۰-۹.-]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim().replace(/^[\u200c\s]+|[\u200c\s]+$/g, ''))
    .filter(w => w.length >= 3 && !stopWords.has(w));
  return [...new Set(words)].slice(0, 8);
}

function fetchMeasureArtifacts(hospitalId, rawCode) {
  const code = normCode(rawCode);
  const codeFa = code.replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'['0123456789'.indexOf(d)]);
  const numOnly = code.replace(/^[^\d-]+-?/, '');

  const sec = db.prepare('SELECT * FROM accreditation_sections WHERE code = ? OR code = ?').get(code, codeFa);
  if (!sec) return null;

  const parent = sec.parent_id ? db.prepare('SELECT * FROM accreditation_sections WHERE id = ?').get(sec.parent_id) : null;
  const gparent = (parent && parent.parent_id) ? db.prepare('SELECT * FROM accreditation_sections WHERE id = ?').get(parent.parent_id) : null;

  const secIds = [sec.id];
  if (parent) secIds.push(parent.id);

  const keywords = getKeywords([sec.statement, sec.title, parent && parent.title, gparent && gparent.title]);

  // Build match query for controlled_documents
  let docWhere = '(section_id IN (' + secIds.map(() => '?').join(',') + ') OR doc_code LIKE ? OR doc_code LIKE ? OR title LIKE ? OR title LIKE ?';
  let docParams = [hospitalId, ...secIds, '%' + code + '%', '%' + numOnly + '%', '%' + code + '%', '%' + numOnly + '%'];
  keywords.forEach(kw => {
    docWhere += ' OR title LIKE ?';
    docParams.push('%' + kw + '%');
  });
  docWhere += ')';

  const policies = db.prepare(`
    SELECT id, title, doc_code, doc_type, status, version_no, revision_no, issue_date, responsible_person, updated_at, attachment_name
    FROM controlled_documents
    WHERE hospital_id = ? AND doc_type = 'policy' AND ${docWhere}
    ORDER BY updated_at DESC LIMIT 20
  `).all(...docParams);

  const procedures = db.prepare(`
    SELECT id, title, doc_code, doc_type, status, version_no, revision_no, issue_date, responsible_person, updated_at, attachment_name
    FROM controlled_documents
    WHERE hospital_id = ? AND doc_type IN ('procedure', 'instruction') AND ${docWhere}
    ORDER BY updated_at DESC LIMIT 20
  `).all(...docParams);

  // Checklists
  let chkWhere = '(section_id IN (' + secIds.map(() => '?').join(',') + ') OR checklist_code LIKE ? OR checklist_code LIKE ? OR title LIKE ? OR title LIKE ?';
  let chkParams = [hospitalId, ...secIds, '%' + code + '%', '%' + numOnly + '%', '%' + code + '%', '%' + numOnly + '%'];
  keywords.forEach(kw => {
    chkWhere += ' OR title LIKE ?';
    chkParams.push('%' + kw + '%');
  });
  chkWhere += ')';

  const checklists = db.prepare(`
    SELECT id, title, checklist_code, cadence, status, purpose, created_at,
      (SELECT COUNT(*) FROM checklist_submissions cs WHERE cs.checklist_id = c.id) as submissions_count,
      (SELECT MAX(submitted_at) FROM checklist_submissions cs WHERE cs.checklist_id = c.id) as last_submission_at
    FROM checklists c
    WHERE hospital_id = ? AND ${chkWhere}
    ORDER BY created_at DESC LIMIT 20
  `).all(...chkParams);

  // Flowcharts
  let flowWhere = '(section_id IN (' + secIds.map(() => '?').join(',') + ') OR process_code LIKE ? OR process_code LIKE ? OR title LIKE ? OR title LIKE ?';
  let flowParams = [hospitalId, ...secIds, '%' + code + '%', '%' + numOnly + '%', '%' + code + '%', '%' + numOnly + '%'];
  keywords.forEach(kw => {
    flowWhere += ' OR title LIKE ?';
    flowParams.push('%' + kw + '%');
  });
  flowWhere += ')';

  const flowcharts = db.prepare(`
    SELECT id, title, process_code, domain, status, file_path, file_name, created_at
    FROM processes
    WHERE hospital_id = ? AND ${flowWhere}
    ORDER BY created_at DESC LIMIT 20
  `).all(...flowParams);

  // Evidence files
  const evidence = db.prepare(`
    SELECT id, title, file_path, file_name, file_size_bytes, created_at, uploaded_by
    FROM evidence_files
    WHERE hospital_id = ? AND (entity_id IN (` + secIds.map(() => '?').join(',') + `) OR title LIKE ? OR title LIKE ?)
    ORDER BY created_at DESC LIMIT 20
  `).all(hospitalId, ...secIds, '%' + code + '%', '%' + numOnly + '%');

  return {
    measure: { id: sec.id, code: sec.code, statement: sec.statement, level: sec.measure_level, page: sec.page },
    keywords,
    counts: {
      total: policies.length + procedures.length + checklists.length + flowcharts.length + evidence.length,
      policies: policies.length,
      procedures: procedures.length,
      checklists: checklists.length,
      flowcharts: flowcharts.length,
      evidence: evidence.length
    },
    policies,
    procedures,
    checklists,
    flowcharts,
    evidence
  };
}

const h = db.prepare('SELECT id FROM hospitals').get().id;
['ب-2-2-1', 'الف-2-2-1', 'ب-1-1-1'].forEach(c => {
  const res = fetchMeasureArtifacts(h, c);
  console.log(`Measure ${c}: counts =`, res.counts, 'keywords =', res.keywords);
});
