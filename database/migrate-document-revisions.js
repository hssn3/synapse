/**
 * Migration: Add separate revision_no field to documents, versions, processes, and forms
 * Enables distinct Version (نسخه) and Revision (ویرایش: نسخه اولیه تا ویرایش ۲۰)
 */
const { db } = require('../src/config/database-sqlite');

function runMigration() {
  // 1. controlled_documents
  try {
    const docCols = db.prepare('PRAGMA table_info(controlled_documents)').all().map(c => c.name);
    if (!docCols.includes('revision_no')) {
      db.prepare('ALTER TABLE controlled_documents ADD COLUMN revision_no INTEGER DEFAULT 0').run();
      console.log('[MigrateDocRevisions] Added revision_no to controlled_documents');
    }
    // اطمینان از مقداردهی رکوردهای بدون مقدار
    db.prepare('UPDATE controlled_documents SET revision_no = 0 WHERE revision_no IS NULL').run();
    db.prepare('UPDATE controlled_documents SET version_no = 1 WHERE version_no IS NULL OR version_no = 0').run();
  } catch (err) {
    console.error('[MigrateDocRevisions] Error migrating controlled_documents:', err.message);
  }

  // 2. document_versions
  try {
    const verCols = db.prepare('PRAGMA table_info(document_versions)').all().map(c => c.name);
    if (!verCols.includes('revision_no')) {
      db.prepare('ALTER TABLE document_versions ADD COLUMN revision_no INTEGER DEFAULT 0').run();
      console.log('[MigrateDocRevisions] Added revision_no to document_versions');
    }
  } catch (err) {
    console.error('[MigrateDocRevisions] Error migrating document_versions:', err.message);
  }

  // 3. processes
  try {
    const procCols = db.prepare('PRAGMA table_info(processes)').all().map(c => c.name);
    if (!procCols.includes('revision_no')) {
      db.prepare('ALTER TABLE processes ADD COLUMN revision_no INTEGER DEFAULT 0').run();
      console.log('[MigrateDocRevisions] Added revision_no to processes');
    }
    db.prepare('UPDATE processes SET revision_no = 0 WHERE revision_no IS NULL').run();
    db.prepare('UPDATE processes SET version_no = 1 WHERE version_no IS NULL OR version_no = 0').run();
  } catch (err) {
    console.error('[MigrateDocRevisions] Error migrating processes:', err.message);
  }

  // 4. forms & admin_forms
  try {
    const formCols = db.prepare('PRAGMA table_info(forms)').all().map(c => c.name);
    if (!formCols.includes('revision_no')) {
      db.prepare('ALTER TABLE forms ADD COLUMN revision_no INTEGER DEFAULT 0').run();
      console.log('[MigrateDocRevisions] Added revision_no to forms');
    }
    if (!formCols.includes('version_no')) {
      db.prepare('ALTER TABLE forms ADD COLUMN version_no INTEGER DEFAULT 1').run();
      console.log('[MigrateDocRevisions] Added version_no to forms');
    }
  } catch (err) {}

  try {
    const adminFormCols = db.prepare('PRAGMA table_info(admin_forms)').all().map(c => c.name);
    if (!adminFormCols.includes('revision_no')) {
      db.prepare('ALTER TABLE admin_forms ADD COLUMN revision_no INTEGER DEFAULT 0').run();
      console.log('[MigrateDocRevisions] Added revision_no to admin_forms');
    }
    if (!adminFormCols.includes('version_no')) {
      db.prepare('ALTER TABLE admin_forms ADD COLUMN version_no INTEGER DEFAULT 1').run();
      console.log('[MigrateDocRevisions] Added version_no to admin_forms');
    }
  } catch (err) {}

  console.log('[MigrateDocRevisions] ✅ Migration completed successfully.');
}

module.exports = { runMigration };

if (require.main === module) {
  runMigration();
}
