/**
 * Enterprise Core Migration — NIST RBAC, Enterprise Form Builder & AI Assistant
 * Idempotent, safe execution.
 */
const { db } = require('../src/config/database-sqlite');
const crypto = require('crypto');

function uuid() {
  return crypto.randomUUID();
}

function runMigration() {
  console.log('[Migration Enterprise Core] Starting...');

  // 1. RBAC / ABAC Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      domain TEXT NOT NULL,
      resource TEXT NOT NULL,
      action TEXT NOT NULL,
      title_fa TEXT NOT NULL,
      description_fa TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      id TEXT PRIMARY KEY,
      role_id TEXT NOT NULL,
      permission_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(role_id, permission_id)
    );

    CREATE TABLE IF NOT EXISTS resource_policies (
      id TEXT PRIMARY KEY,
      hospital_id TEXT,
      resource_type TEXT NOT NULL,
      action TEXT NOT NULL,
      required_permission TEXT NOT NULL,
      conditions_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 2. Enterprise Form Engine Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS forms (
      id TEXT PRIMARY KEY,
      hospital_id TEXT NOT NULL,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'general',
      status TEXT DEFAULT 'active',
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(hospital_id, slug)
    );

    CREATE TABLE IF NOT EXISTS form_versions (
      id TEXT PRIMARY KEY,
      form_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      schema_json TEXT NOT NULL,
      ui_schema_json TEXT DEFAULT '{}',
      status TEXT DEFAULT 'published',
      published_at TEXT DEFAULT (datetime('now')),
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(form_id, version_number)
    );

    CREATE TABLE IF NOT EXISTS form_submissions (
      id TEXT PRIMARY KEY,
      hospital_id TEXT NOT NULL,
      form_id TEXT NOT NULL,
      form_version_id TEXT NOT NULL,
      user_id TEXT,
      data_json TEXT NOT NULL,
      status TEXT DEFAULT 'submitted',
      submitted_at TEXT DEFAULT (datetime('now')),
      reviewed_by TEXT,
      reviewed_at TEXT,
      approved_by TEXT,
      approved_at TEXT,
      rejection_reason TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS form_permissions (
      id TEXT PRIMARY KEY,
      form_id TEXT NOT NULL,
      role_code TEXT NOT NULL,
      can_view INTEGER DEFAULT 1,
      can_fill INTEGER DEFAULT 0,
      can_edit INTEGER DEFAULT 0,
      can_approve INTEGER DEFAULT 0,
      can_delete INTEGER DEFAULT 0,
      field_rules_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(form_id, role_code)
    );
  `);

  // 3. AI Assistant Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS assistant_personas (
      id TEXT PRIMARY KEY,
      role_code TEXT NOT NULL UNIQUE,
      title_fa TEXT NOT NULL,
      system_prompt TEXT NOT NULL,
      allowed_tools_json TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS assistant_audit_log (
      id TEXT PRIMARY KEY,
      hospital_id TEXT,
      user_id TEXT,
      role_code TEXT,
      query TEXT NOT NULL,
      response TEXT NOT NULL,
      tool_calls_json TEXT DEFAULT '[]',
      citations_json TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  console.log('[Migration Enterprise Core] Tables created successfully.');

  // Seed default core permissions
  seedCorePermissions();
}

function seedCorePermissions() {
  const insertPerm = db.prepare(`
    INSERT OR IGNORE INTO permissions (id, key, domain, resource, action, title_fa, description_fa)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const perms = [
    // فرم برنامه ماهانه
    { key: 'form:monthly_program:view', domain: 'form', resource: 'monthly_program', action: 'view', title_fa: 'مشاهده برنامه ماهانه' },
    { key: 'form:monthly_program:fill', domain: 'form', resource: 'monthly_program', action: 'fill', title_fa: 'پر کردن و ثبت درخواست در برنامه ماهانه' },
    { key: 'form:monthly_program:edit', domain: 'form', resource: 'monthly_program', action: 'edit', title_fa: 'ویرایش ساختار برنامه ماهانه' },
    { key: 'form:monthly_program:approve', domain: 'form', resource: 'monthly_program', action: 'approve', title_fa: 'تأیید رسمی برنامه ماهانه' },
    { key: 'form:monthly_program:delete', domain: 'form', resource: 'monthly_program', action: 'delete', title_fa: 'حذف برنامه ماهانه' },

    // فرم‌های عمومی و بالینی
    { key: 'form:error_report:view', domain: 'form', resource: 'error_report', action: 'view', title_fa: 'مشاهده گزارش خطا' },
    { key: 'form:error_report:fill', domain: 'form', resource: 'error_report', action: 'fill', title_fa: 'ثبت گزارش خطا' },
    { key: 'form:error_report:edit', domain: 'form', resource: 'error_report', action: 'edit', title_fa: 'تحلیل و اقدام اصلاحی خطا' },
    { key: 'form:error_report:approve', domain: 'form', resource: 'error_report', action: 'approve', title_fa: 'تأیید نهایی پرونده خطا' },

    // مدیریت سازمانی فرم‌ها
    { key: 'form_engine:schema:create', domain: 'form_engine', resource: 'schema', action: 'create', title_fa: 'طراحی و ساخت فرم جدید' },
    { key: 'form_engine:schema:edit', domain: 'form_engine', resource: 'schema', action: 'edit', title_fa: 'ویرایش ساختار فرم‌ها' },
    { key: 'form_engine:permissions:manage', domain: 'form_engine', resource: 'permissions', action: 'manage', title_fa: 'مدیریت ماتریس دسترسی فرم‌ها' },

    // دستیار هوشمند
    { key: 'assistant:chat:use', domain: 'assistant', resource: 'chat', action: 'use', title_fa: 'گفتگو با دستیار دانا' },
    { key: 'assistant:audit:view', domain: 'assistant', resource: 'audit', action: 'view', title_fa: 'مشاهده لاگ دستیار هوشمند' },
  ];

  perms.forEach(p => {
    insertPerm.run(uuid(), p.key, p.domain, p.resource, p.action, p.title_fa, p.title_fa);
  });

  // ۱. اطمینان از وجود نقش‌های استاندارد در جدول roles
  const ensureRoles = [
    { code: 'head_nurse', title_fa: 'سرپرستار' },
    { code: 'nurse', title_fa: 'پرستار' },
    { code: 'supervisor_clinical', title_fa: 'سوپروایزر بالینی' }
  ];
  ensureRoles.forEach(r => {
    db.prepare(`INSERT OR IGNORE INTO roles (id, code, title_fa) VALUES (?, ?, ?)`).run(uuid(), r.code, r.title_fa);
  });

  // نگاشت نقش‌ها به مجوزها بر اساس ماتریس RBAC صریح کاربر
  // پرستار: فقط view و fill برای برنامه ماهانه (edit, approve, delete اکیداً ممنوع)
  ['nurse', 'staff_nurse'].forEach(r => {
    mapRolePermission(r, 'form:monthly_program:view');
    mapRolePermission(r, 'form:monthly_program:fill');
    mapRolePermission(r, 'form:error_report:fill');
    mapRolePermission(r, 'assistant:chat:use');
  });

  // سرپرستار: view, fill, edit, approve برای برنامه ماهانه بخش (delete ممنوع)
  mapRolePermission('head_nurse', 'form:monthly_program:view');
  mapRolePermission('head_nurse', 'form:monthly_program:fill');
  mapRolePermission('head_nurse', 'form:monthly_program:edit');
  mapRolePermission('head_nurse', 'form:monthly_program:approve');
  mapRolePermission('head_nurse', 'form:error_report:fill');
  mapRolePermission('head_nurse', 'form:error_report:view');
  mapRolePermission('head_nurse', 'assistant:chat:use');

  // سوپروایزر: view, edit, approve روی تمام فرم‌ها (delete حذف سنجه ممنوع)
  ['supervisor_clinical', 'clinical_supervisor'].forEach(r => {
    mapRolePermission(r, 'form:monthly_program:view');
    mapRolePermission(r, 'form:monthly_program:fill');
    mapRolePermission(r, 'form:monthly_program:edit');
    mapRolePermission(r, 'form:monthly_program:approve');
    mapRolePermission(r, 'form:error_report:view');
    mapRolePermission(r, 'form:error_report:edit');
    mapRolePermission(r, 'form:error_report:approve');
    mapRolePermission(r, 'assistant:chat:use');
  });

  // مدیر / ادمین: دسترسی کامل
  const allPerms = db.prepare('SELECT id, key FROM permissions').all();
  const adminRole = db.prepare('SELECT id FROM roles WHERE code = ?').get('admin');
  if (adminRole) {
    const insertRP = db.prepare('INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) VALUES (?, ?, ?)');
    allPerms.forEach(perm => {
      insertRP.run(uuid(), adminRole.id, perm.id);
    });
  }

  // ایجاد فرم نمونه استاندارد: برنامه ماهانه شیفت
  seedSampleEnterpriseForm();

  // رجیستری پرسونای دستیار دانا
  seedAssistantPersonas();

  console.log('[Migration Enterprise Core] Core permissions and personas seeded.');
}

function mapRolePermission(roleCode, permKey) {
  const role = db.prepare('SELECT id FROM roles WHERE code = ?').get(roleCode);
  const perm = db.prepare('SELECT id FROM permissions WHERE key = ?').get(permKey);
  if (role && perm) {
    db.prepare('INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) VALUES (?, ?, ?)').run(uuid(), role.id, perm.id);
  }
}

function seedSampleEnterpriseForm() {
  const hospital = db.prepare('SELECT id FROM hospitals LIMIT 1').get();
  if (!hospital) return;

  const formSlug = 'monthly-program';
  let form = db.prepare('SELECT id FROM forms WHERE hospital_id = ? AND slug = ?').get(hospital.id, formSlug);
  if (!form) {
    const formId = uuid();
    db.prepare(`
      INSERT INTO forms (id, hospital_id, slug, title, description, category, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      formId,
      hospital.id,
      formSlug,
      'برنامه ماهانه شیفت و تفویض وظایف پرسنل',
      'فرم سازمانی تعیین کشیک‌ها، مرخصی و مسئولیت‌های بالینی بخش',
      'nursing',
      'active'
    );
    form = { id: formId };

    // نسخه ۱ فرم مبتنی بر JSON Schema
    const versionId = uuid();
    const schema = {
      title: "برنامه ماهانه شیفت",
      type: "object",
      required: ["ward_name", "month_jalali", "head_nurse_notes"],
      properties: {
        ward_name: {
          type: "string",
          title: "نام بخش / واحد",
          enum: ["اورژانس", "ICU جنرال", "CCU", "جراحی مردان", "جراحی زنان", "اطفال"]
        },
        month_jalali: {
          type: "string",
          title: "ماه کاری (شمسی)",
          enum: ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"]
        },
        year_jalali: {
          type: "number",
          title: "سال",
          default: 1405
        },
        head_nurse_notes: {
          type: "string",
          title: "ملاحظات سرپرستار بخش",
          maxLength: 1000
        },
        has_night_oncall: {
          type: "boolean",
          title: "آیا شیفت آنکال شبانه نیاز است؟",
          default: false
        },
        oncall_contact: {
          type: "string",
          title: "شماره تماس آنکال",
          show_if: { field: "has_night_oncall", equals: true }
        }
      }
    };

    const uiSchema = {
      ward_name: { "ui:widget": "select", "ui:help": "بخش رسمی ثبت‌شده در چارت" },
      head_nurse_notes: { "ui:widget": "textarea", "ui:placeholder": "توضیحات و نیازمندی‌های پرسنلی..." },
      has_night_oncall: { "ui:widget": "checkbox" }
    };

    db.prepare(`
      INSERT INTO form_versions (id, form_id, version_number, schema_json, ui_schema_json, status)
      VALUES (?, ?, 1, ?, ?, 'published')
    `).run(versionId, formId, JSON.stringify(schema), JSON.stringify(uiSchema));

    // تعریف ACL برای این فرم
    // پرستار: فقط view و fill (edit, approve, delete ممنوع)
    db.prepare(`
      INSERT OR REPLACE INTO form_permissions (id, form_id, role_code, can_view, can_fill, can_edit, can_approve, can_delete, field_rules_json)
      VALUES (?, ?, 'nurse', 1, 1, 0, 0, 0, ?)
    `).run(uuid(), formId, JSON.stringify({ head_nurse_notes: 'read_only' }));

    // سرپرستار: view, fill, edit, approve (delete ممنوع)
    db.prepare(`
      INSERT OR REPLACE INTO form_permissions (id, form_id, role_code, can_view, can_fill, can_edit, can_approve, can_delete, field_rules_json)
      VALUES (?, ?, 'head_nurse', 1, 1, 1, 1, 0, ?)
    `).run(uuid(), formId, JSON.stringify({}));

    // سوپروایزر: view, edit, approve
    db.prepare(`
      INSERT OR REPLACE INTO form_permissions (id, form_id, role_code, can_view, can_fill, can_edit, can_approve, can_delete, field_rules_json)
      VALUES (?, ?, 'supervisor_clinical', 1, 0, 1, 1, 0, ?)
    `).run(uuid(), formId, JSON.stringify({}));

    // ادمین: همه چیز
    db.prepare(`
      INSERT OR REPLACE INTO form_permissions (id, form_id, role_code, can_view, can_fill, can_edit, can_approve, can_delete, field_rules_json)
      VALUES (?, ?, 'admin', 1, 1, 1, 1, 1, ?)
    `).run(uuid(), formId, JSON.stringify({}));
  }
}

function seedAssistantPersonas() {
  const personas = [
    {
      role_code: 'nurse',
      title_fa: 'پرسونای پرستار بالینی',
      system_prompt: 'شما دستیار تخصصی پرستار بالینی هستید. تمرکز شما روی ثبت دقیق گزارش شیفت، تحویل بالینی به روش SBAR، ایمنی بیمار و فرم‌های در دسترس است. اگر پرستار از شما درخواست تایید، حذف یا ویرایش برنامه ماهانه یا سنجه‌های کلان را داشت، اکیداً امتناع کنید و به وضوح توضیح دهید که بر اساس ماتریس RBAC، تایید یا ویرایش برنامه ماهانه منحصراً در صلاحیت سرپرستار یا سوپروایزر است.',
      allowed_tools: ['search_forms', 'fetch_form_schema', 'check_permission', 'explain_rule']
    },
    {
      role_code: 'head_nurse',
      title_fa: 'پرسونای سرپرستار بخش',
      system_prompt: 'شما دستیار تخصصی سرپرستار بخش هستید. تمرکز شما بر مدیریت پرسنل بخش، تنظیم برنامه ماهانه شیفت، چک‌لیست‌های تجهیزات و لاگ‌های ایمنی است. شما حق تنظیم و تایید برنامه بخش خود را دارید اما حذف ساختاری مدارک را ندارید.',
      allowed_tools: ['search_forms', 'fetch_form_schema', 'check_permission', 'explain_rule', 'query_kpi', 'summarize_submissions']
    },
    {
      role_code: 'supervisor_clinical',
      title_fa: 'پرسونای سوپروایزر بالینی',
      system_prompt: 'شما دستیار تخصصی سوپروایزر بالینی بیمارستان هستید. تمرکز شما بر نظارت ۲۴ ساعته، تریاژ خطاهای پزشکی، بازدیدهای مدیریتی و تایید نهایی شیفت‌هاست.',
      allowed_tools: ['search_forms', 'fetch_form_schema', 'check_permission', 'explain_rule', 'query_kpi', 'summarize_submissions']
    },
    {
      role_code: 'admin',
      title_fa: 'پرسونای مدیریت بیمارستان',
      system_prompt: 'شما دستیار استراتژیک مدیریت و ریاست بیمارستان هستید. دسترسی کامل به گزارش‌های عملکردی، ماتریس دسترسی، شاخص‌های کلیدی و تصمیم‌گیری‌های کلان دارید.',
      allowed_tools: ['search_forms', 'fetch_form_schema', 'check_permission', 'explain_rule', 'query_kpi', 'summarize_submissions']
    }
  ];

  const insertP = db.prepare(`
    INSERT OR REPLACE INTO assistant_personas (id, role_code, title_fa, system_prompt, allowed_tools_json)
    VALUES (?, ?, ?, ?, ?)
  `);

  personas.forEach(p => {
    insertP.run(uuid(), p.role_code, p.title_fa, p.system_prompt, JSON.stringify(p.allowed_tools));
  });
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
