/**
 * Seed CRM and Clinical Safety permissions for admin, nursing_director, QC manager, clinical supervisor
 */
'use strict';

const { db } = require('../src/config/database-sqlite');

function run() {
  const roleUpdates = [
    {
      code: 'admin',
      perms: ['view_crm', 'manage_crm', 'view_safe_surgery', 'manage_safe_surgery', 'view_waste_tracking', 'manage_waste_tracking']
    },
    {
      code: 'quality_control_manager',
      perms: ['view_crm', 'manage_crm', 'view_safe_surgery', 'view_waste_tracking']
    },
    {
      code: 'nursing_director',
      perms: ['view_crm', 'manage_crm', 'view_safe_surgery', 'manage_safe_surgery', 'view_waste_tracking']
    },
    {
      code: 'clinical_supervisor',
      perms: ['view_crm', 'view_safe_surgery', 'manage_safe_surgery']
    },
    {
      code: 'infection_control_supervisor',
      perms: ['view_waste_tracking', 'manage_waste_tracking']
    }
  ];

  for (const ru of roleUpdates) {
    const role = db.prepare('SELECT id, permissions FROM roles WHERE code = ? AND hospital_id IS NULL').get(ru.code);
    if (!role) continue;
    let list = [];
    try { list = JSON.parse(role.permissions || '[]'); } catch (e) { list = []; }
    let changed = false;
    for (const p of ru.perms) {
      if (!list.includes(p)) {
        list.push(p);
        changed = true;
      }
    }
    if (changed) {
      db.prepare('UPDATE roles SET permissions = ? WHERE id = ?').run(JSON.stringify(list), role.id);
      console.log(`[Seed CRM Roles] Updated ${ru.code}`);
    }
  }
}

if (require.main === module) {
  run();
  process.exit(0);
}

module.exports = { run };
