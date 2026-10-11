/* =====================================================================
   لوگوی بیمارستان نمونه
   ---------------------------------------------------------------------
   منبع لوگو یک SVG داخل مخزن است (public/img/hospital-logo-sample.svg)
   تا قابل ویرایش و نسخه‌بندی بماند. اینجا فقط به WebP رندر می‌شود، چون
   endpoint موجودِ /api/public/hospital/:id/logo با res.type('image/webp')
   پاسخ می‌دهد و از پوشه‌ی آپلود سرو می‌کند.

   idempotent: اگر همان مرکز قبلاً logo_url داشته باشد و فایلش موجود باشد،
   دوباره تولید نمی‌شود.
   ===================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const { query } = require('../src/config/database');
const config = require('../src/config/app');

const SRC = path.join(__dirname, '..', 'public', 'img', 'hospital-logo-sample.svg');
const OUT_NAME = 'logo-sample-hospital.webp';

function seedHospitalLogo() {
  if (!fs.existsSync(SRC)) { console.log('[seed-logo] فایل SVG منبع نیست — رد شد'); return; }

  // همان مرکزی که سناریوی نمونه رویش سوار است: تنها بیمارستان فعال، یا
  // اگر چند تا بود، آن‌که دوره‌ی فعال دارد.
  const hosp = query(
    `SELECT h.id, h.name, h.logo_url FROM hospitals h
       LEFT JOIN accreditation_periods p ON p.hospital_id = h.id AND p.is_active = 1
      WHERE h.is_active = 1
      ORDER BY (p.id IS NULL), h.created_at LIMIT 1`).rows[0];
  if (!hosp) { console.log('[seed-logo] بیمارستان فعالی نیست — رد شد'); return; }

  const dir = config.upload.dir;
  const abs = path.join(dir, OUT_NAME);

  if (hosp.logo_url && fs.existsSync(path.join(dir, path.basename(hosp.logo_url)))) {
    console.log(`[seed-logo] «${hosp.name}» از قبل لوگو دارد — بدون تغییر`);
    return;
  }

  let sharp;
  try { sharp = require('sharp'); }
  catch (e) { console.log('[seed-logo] sharp در دسترس نیست — رد شد'); return; }

  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { /* از قبل هست */ }

  sharp(fs.readFileSync(SRC))
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 92 })
    .toFile(abs)
    .then(() => {
      query('UPDATE hospitals SET logo_url = ? WHERE id = ?', [OUT_NAME, hosp.id]);
      console.log(`[seed-logo] لوگوی «${hosp.name}» ساخته و ثبت شد (${OUT_NAME})`);
    })
    .catch(err => console.error('[seed-logo] رندر لوگو شکست خورد:', err.message));
}

module.exports = { seedHospitalLogo };

if (require.main === module) { seedHospitalLogo(); }
