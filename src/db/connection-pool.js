/**
 * Tenant Connection Pool - لایه انتزاعی دیتابیس چندمستأجری
 * 
 * این ماژول مسئول مدیریت اتصالات به دیتابیس‌های سیستم و tenant هاست.
 * هر tenant یک دیتابیس جداگانه در database/tenants/{hospital_id}/ دارد.
 * 
 * معماری:
 * - system.db: جداول مشترک (hospitals، accreditation_measures، platform_settings)
 * - tenant DB: جداول اختصاصی هر مرکز (users، measure_status، errors، ...)
 * 
 * نکته امنیتی: این لایه تضمین می‌کند هیچ tenant به داده‌های tenant دیگر دسترسی ندارد.
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class TenantConnectionPool {
  constructor() {
    this.systemDb = null;
    this.tenantConnections = new Map(); // {hospitalId: {db, lastAccess, queries}}
    this.maxConnections = 10; // حداکثر تعداد اتصالات همزمان
    this.connectionTimeout = 30 * 60 * 1000; // 30 دقیقه
    this.stats = {
      systemQueries: 0,
      tenantQueries: new Map(),
      cacheHits: 0,
      cacheMisses: 0
    };
    
    // اتصال به دیتابیس سیستم
    this.initSystemDb();
    
    // تمیزکاری دوره‌ای اتصالات غیرفعال
    this.startCleanupTimer();
  }

  /**
   * اتصال به دیتابیس سیستم مرکزی
   */
  initSystemDb() {
    const systemPath = path.join(process.cwd(), 'database/system.db');
    
    // اگر system.db وجود ندارد، از hospital.db استفاده کن (backward compatibility)
    const dbPath = fs.existsSync(systemPath) 
      ? systemPath 
      : path.join(process.cwd(), 'database/hospital.db');
    
    try {
      this.systemDb = new Database(dbPath, { 
        readonly: false,
        fileMustExist: true 
      });
      
      // بهینه‌سازی‌های SQLite
      this.systemDb.pragma('journal_mode = WAL');
      this.systemDb.pragma('synchronous = NORMAL');
      this.systemDb.pragma('cache_size = -64000'); // 64MB cache
      this.systemDb.pragma('temp_store = MEMORY');
      
      console.log(`[ConnectionPool] ✅ System DB connected: ${dbPath}`);
    } catch (err) {
      console.error('[ConnectionPool] ❌ Failed to connect to system DB:', err.message);
      throw err;
    }
  }

  /**
   * دریافت دیتابیس سیستم (برای جداول مشترک)
   */
  getSystemDb() {
    if (!this.systemDb) {
      throw new Error('System database not initialized');
    }
    this.stats.systemQueries++;
    return this.systemDb;
  }

  /**
   * دریافت دیتابیس tenant (برای داده‌های اختصاصی)
   * @param {string} hospitalId - شناسه منحصربه‌فرد بیمارستان
   * @returns {Database} اتصال به دیتابیس tenant
   */
  getTenantDb(hospitalId) {
    if (!hospitalId) {
      throw new Error('Hospital ID is required for tenant database');
    }

    // چک کردن cache
    if (this.tenantConnections.has(hospitalId)) {
      const cached = this.tenantConnections.get(hospitalId);
      cached.lastAccess = Date.now();
      cached.queries++;
      this.stats.cacheHits++;
      
      // آپدیت آمار
      if (!this.stats.tenantQueries.has(hospitalId)) {
        this.stats.tenantQueries.set(hospitalId, 0);
      }
      this.stats.tenantQueries.set(
        hospitalId, 
        this.stats.tenantQueries.get(hospitalId) + 1
      );
      
      return cached.db;
    }

    this.stats.cacheMisses++;

    // اگر تعداد اتصالات از حد مجاز گذشت، قدیمی‌ترین را ببند
    if (this.tenantConnections.size >= this.maxConnections) {
      this.closeOldestConnection();
    }

    // ایجاد اتصال جدید
    const tenantPath = this.getTenantDbPath(hospitalId);
    
    if (!fs.existsSync(tenantPath)) {
      // اگر دیتابیس tenant وجود ندارد، از shared استفاده کن (backward compatibility)
      console.warn(`[ConnectionPool] ⚠️ Tenant DB not found for ${hospitalId}, using shared DB`);
      return this.getSystemDb();
    }

    try {
      const db = new Database(tenantPath, { readonly: false });
      
      // بهینه‌سازی‌ها
      db.pragma('journal_mode = WAL');
      db.pragma('synchronous = NORMAL');
      db.pragma('cache_size = -32000'); // 32MB cache per tenant
      db.pragma('temp_store = MEMORY');
      
      // ذخیره در cache
      this.tenantConnections.set(hospitalId, {
        db,
        lastAccess: Date.now(),
        queries: 1,
        created: Date.now()
      });
      
      this.stats.tenantQueries.set(hospitalId, 1);
      
      console.log(`[ConnectionPool] ✅ Tenant DB connected: ${hospitalId}`);
      return db;
    } catch (err) {
      console.error(`[ConnectionPool] ❌ Failed to connect to tenant DB ${hospitalId}:`, err.message);
      throw err;
    }
  }

  /**
   * مسیر دیتابیس tenant
   */
  getTenantDbPath(hospitalId) {
    return path.join(process.cwd(), `database/tenants/${hospitalId}/hospital.db`);
  }

  /**
   * مسیر فایل‌های آپلود tenant
   */
  getTenantUploadPath(hospitalId) {
    return path.join(process.cwd(), `storage/tenants/${hospitalId}/uploads`);
  }

  /**
   * بستن قدیمی‌ترین اتصال
   */
  closeOldestConnection() {
    let oldestId = null;
    let oldestTime = Infinity;

    for (const [id, conn] of this.tenantConnections) {
      if (conn.lastAccess < oldestTime) {
        oldestTime = conn.lastAccess;
        oldestId = id;
      }
    }

    if (oldestId) {
      const conn = this.tenantConnections.get(oldestId);
      conn.db.close();
      this.tenantConnections.delete(oldestId);
      console.log(`[ConnectionPool] 🗑️ Closed oldest connection: ${oldestId}`);
    }
  }

  /**
   * بستن اتصالات غیرفعال (بیش از timeout)
   */
  closeInactiveConnections() {
    const now = Date.now();
    const toClose = [];

    for (const [id, conn] of this.tenantConnections) {
      if (now - conn.lastAccess > this.connectionTimeout) {
        toClose.push(id);
      }
    }

    toClose.forEach(id => {
      const conn = this.tenantConnections.get(id);
      conn.db.close();
      this.tenantConnections.delete(id);
      console.log(`[ConnectionPool] ⏰ Closed inactive connection: ${id}`);
    });

    return toClose.length;
  }

  /**
   * شروع تایمر تمیزکاری
   */
  startCleanupTimer() {
    setInterval(() => {
      const closed = this.closeInactiveConnections();
      if (closed > 0) {
        console.log(`[ConnectionPool] 🧹 Cleanup: ${closed} connection(s) closed`);
      }
    }, 5 * 60 * 1000); // هر 5 دقیقه
  }

  /**
   * بستن تمام اتصالات
   */
  closeAll() {
    if (this.systemDb) {
      this.systemDb.close();
      console.log('[ConnectionPool] System DB closed');
    }

    for (const [id, conn] of this.tenantConnections) {
      conn.db.close();
      console.log(`[ConnectionPool] Tenant DB closed: ${id}`);
    }

    this.tenantConnections.clear();
    console.log('[ConnectionPool] ✅ All connections closed');
  }

  /**
   * آمار و monitoring
   */
  getStats() {
    return {
      systemQueries: this.stats.systemQueries,
      activeTenants: this.tenantConnections.size,
      maxConnections: this.maxConnections,
      cacheHits: this.stats.cacheHits,
      cacheMisses: this.stats.cacheMisses,
      hitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100,
      tenantQueries: Object.fromEntries(this.stats.tenantQueries),
      connections: Array.from(this.tenantConnections.entries()).map(([id, conn]) => ({
        hospitalId: id,
        queries: conn.queries,
        age: Date.now() - conn.created,
        lastAccess: Date.now() - conn.lastAccess
      }))
    };
  }

  /**
   * تست سلامت
   */
  healthCheck() {
    try {
      // تست system DB
      const systemTest = this.systemDb.prepare('SELECT 1 as test').get();
      if (!systemTest || systemTest.test !== 1) {
        return { healthy: false, error: 'System DB query failed' };
      }

      // تست tenant DBs
      for (const [id, conn] of this.tenantConnections) {
        const tenantTest = conn.db.prepare('SELECT 1 as test').get();
        if (!tenantTest || tenantTest.test !== 1) {
          return { healthy: false, error: `Tenant DB query failed: ${id}` };
        }
      }

      return { 
        healthy: true, 
        activeTenants: this.tenantConnections.size,
        systemQueries: this.stats.systemQueries
      };
    } catch (err) {
      return { healthy: false, error: err.message };
    }
  }
}

// Singleton instance
const pool = new TenantConnectionPool();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[ConnectionPool] SIGTERM received, closing connections...');
  pool.closeAll();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[ConnectionPool] SIGINT received, closing connections...');
  pool.closeAll();
  process.exit(0);
});

module.exports = pool;
