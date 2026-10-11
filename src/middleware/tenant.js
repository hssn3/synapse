/**
 * Tenant Middleware - میدل‌ور شناسایی و ایزوله‌سازی tenant
 * 
 * این میدل‌ور مسئولیت‌های زیر را دارد:
 * 1. شناسایی tenant فعلی از روی subdomain، token یا query string
 * 2. تزریق اتصال دیتابیس مناسب به req.db
 * 3. تزریق اطلاعات بیمارستان به req.hospital
 * 4. اطمینان از ایزولاسیون کامل داده‌ها
 * 
 * استفاده:
 * router.get('/api/data', authRequired, tenantMiddleware, (req, res) => {
 *   const data = req.db.prepare('SELECT * FROM table').all();
 *   res.json(data);
 * });
 */

const pool = require('../db/connection-pool');

/**
 * میدل‌ور اصلی tenant
 */
function tenantMiddleware(req, res, next) {
  try {
    // ۱. شناسایی hospital ID
    const hospitalId = identifyTenant(req);
    
    if (!hospitalId) {
      return res.status(400).json({ 
        error: 'TENANT_NOT_FOUND',
        message: 'نتوانستیم بیمارستان شما را شناسایی کنیم. لطفاً دوباره وارد شوید.'
      });
    }

    // ۲. تزریق db connections
    req.systemDb = pool.getSystemDb();
    req.db = pool.getTenantDb(hospitalId);
    req.hospitalId = hospitalId;

    // ۳. بارگذاری اطلاعات بیمارستان از system DB
    try {
      const hospital = req.systemDb.prepare(`
        SELECT id, name, subdomain, logo_url, is_active 
        FROM hospitals 
        WHERE id = ?
      `).get(hospitalId);

      if (!hospital) {
        return res.status(404).json({ 
          error: 'HOSPITAL_NOT_FOUND',
          message: 'بیمارستان مورد نظر یافت نشد.'
        });
      }

      if (!hospital.is_active) {
        return res.status(403).json({ 
          error: 'HOSPITAL_INACTIVE',
          message: 'دسترسی به این بیمارستان غیرفعال شده است.'
        });
      }

      req.hospital = hospital;
    } catch (err) {
      console.error('[TenantMiddleware] Hospital lookup failed:', err.message);
      return res.status(500).json({ 
        error: 'HOSPITAL_LOOKUP_FAILED',
        message: 'خطا در دریافت اطلاعات بیمارستان'
      });
    }

    // ۴. اضافه کردن helper functions
    req.tenantQuery = (sql, params = []) => {
      return req.db.prepare(sql).all(params);
    };

    req.tenantQueryOne = (sql, params = []) => {
      return req.db.prepare(sql).get(params);
    };

    req.tenantExec = (sql, params = []) => {
      return req.db.prepare(sql).run(params);
    };

    next();
  } catch (err) {
    console.error('[TenantMiddleware] Error:', err.message);
    res.status(500).json({ 
      error: 'TENANT_MIDDLEWARE_ERROR',
      message: 'خطا در پردازش درخواست'
    });
  }
}

/**
 * شناسایی tenant از منابع مختلف
 */
function identifyTenant(req) {
  // الویت ۱: از JWT token (اگر کاربر لاگین کرده)
  if (req.user && req.user.hospital_id) {
    return req.user.hospital_id;
  }

  // الویت ۲: از ساب‌دومین (h1.example.com → h1)
  const subdomain = extractSubdomain(req);
  if (subdomain) {
    const hospitalId = lookupHospitalBySubdomain(subdomain);
    if (hospitalId) return hospitalId;
  }

  // الویت ۳: از query string (?hospital=id)
  if (req.query && req.query.hospital) {
    return req.query.hospital;
  }

  // الویت ۴: از header (X-Hospital-ID)
  if (req.headers && req.headers['x-hospital-id']) {
    return req.headers['x-hospital-id'];
  }

  return null;
}

/**
 * استخراج ساب‌دومین از hostname
 */
function extractSubdomain(req) {
  const hostname = req.hostname || req.get('host');
  if (!hostname) return null;

  const parts = hostname.split('.');
  
  // اگر localhost یا IP است
  if (parts.length === 1 || hostname.includes('localhost') || /^\d+\.\d+\.\d+\.\d+/.test(hostname)) {
    return null;
  }

  // اگر فرمت subdomain.domain.com است
  if (parts.length >= 3) {
    return parts[0];
  }

  return null;
}

/**
 * یافتن hospital ID از روی subdomain
 */
function lookupHospitalBySubdomain(subdomain) {
  try {
    const systemDb = pool.getSystemDb();
    const result = systemDb.prepare(`
      SELECT id FROM hospitals WHERE subdomain = ? AND is_active = 1
    `).get(subdomain);
    
    return result ? result.id : null;
  } catch (err) {
    console.error('[TenantMiddleware] Subdomain lookup failed:', err.message);
    return null;
  }
}

/**
 * میدل‌ور برای مسیرهای عمومی (بدون نیاز به tenant)
 * مثل صفحه لاگین، درباره ما و ...
 */
function optionalTenantMiddleware(req, res, next) {
  try {
    const hospitalId = identifyTenant(req);
    
    if (hospitalId) {
      req.systemDb = pool.getSystemDb();
      req.db = pool.getTenantDb(hospitalId);
      req.hospitalId = hospitalId;

      // بارگذاری اطلاعات بیمارستان (اختیاری)
      try {
        const hospital = req.systemDb.prepare(`
          SELECT id, name, subdomain, logo_url 
          FROM hospitals 
          WHERE id = ?
        `).get(hospitalId);
        
        if (hospital) {
          req.hospital = hospital;
        }
      } catch (err) {
        // در مسیرهای عمومی خطا نمی‌دهیم
        console.warn('[OptionalTenant] Hospital lookup failed:', err.message);
      }
    }

    next();
  } catch (err) {
    // در حالت اختیاری، خطا را نادیده می‌گیریم
    console.warn('[OptionalTenant] Error (non-blocking):', err.message);
    next();
  }
}

/**
 * Middleware برای Super Admin (دسترسی به همه tenants)
 */
function superAdminTenantMiddleware(req, res, next) {
  // Super admin باید به صورت صریح tenant را مشخص کند
  const hospitalId = req.query.hospital || req.body.hospital || req.params.hospitalId;
  
  if (!hospitalId) {
    // اگر tenant مشخص نشده، فقط systemDb در دسترس است
    req.systemDb = pool.getSystemDb();
    req.db = null;
    req.hospitalId = null;
    return next();
  }

  try {
    req.systemDb = pool.getSystemDb();
    req.db = pool.getTenantDb(hospitalId);
    req.hospitalId = hospitalId;

    const hospital = req.systemDb.prepare(`
      SELECT id, name, subdomain, logo_url, is_active 
      FROM hospitals 
      WHERE id = ?
    `).get(hospitalId);

    if (!hospital) {
      return res.status(404).json({ 
        error: 'HOSPITAL_NOT_FOUND',
        message: 'بیمارستان مورد نظر یافت نشد.'
      });
    }

    req.hospital = hospital;
    next();
  } catch (err) {
    console.error('[SuperAdminTenant] Error:', err.message);
    res.status(500).json({ 
      error: 'TENANT_ERROR',
      message: 'خطا در دسترسی به داده‌های بیمارستان'
    });
  }
}

/**
 * Helper: دریافت لیست تمام tenants (فقط برای super admin)
 */
function getAllTenants() {
  const systemDb = pool.getSystemDb();
  return systemDb.prepare(`
    SELECT id, name, subdomain, is_active, created_at
    FROM hospitals
    ORDER BY name
  `).all();
}

/**
 * Helper: آمار استفاده tenant
 */
function getTenantStats(hospitalId) {
  try {
    const db = pool.getTenantDb(hospitalId);
    
    const stats = {
      users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
      measures: db.prepare('SELECT COUNT(*) as count FROM measure_status').get().count,
      errors: db.prepare('SELECT COUNT(*) as count FROM medical_error_reports').get().count,
      committees: db.prepare('SELECT COUNT(*) as count FROM committee_meeting_minutes').get().count,
      dbSize: getDbSize(hospitalId)
    };
    
    return stats;
  } catch (err) {
    console.error('[TenantStats] Error:', err.message);
    return null;
  }
}

/**
 * Helper: اندازه دیتابیس tenant
 */
function getDbSize(hospitalId) {
  const fs = require('fs');
  const dbPath = pool.getTenantDbPath(hospitalId);
  
  try {
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      return Math.round(stats.size / 1024); // KB
    }
  } catch (err) {
    console.error('[GetDbSize] Error:', err.message);
  }
  
  return 0;
}

module.exports = {
  tenantMiddleware,
  optionalTenantMiddleware,
  superAdminTenantMiddleware,
  getAllTenants,
  getTenantStats,
  identifyTenant
};
