const fs = require('fs');

const file = 'public/js/hassan-hubs.js';
let content = fs.readFileSync(file, 'utf8');

// 1. In HassanHub.renderArtifactsSection: save _currentFilteredItems
const storeTarget = "    // اعمال فیلتر تب فعال\n    let allItems = rawAllItems;";
const storeTargetCRLF = "    // اعمال فیلتر تب فعال\r\n    let allItems = rawAllItems;";

const storeReplacement = `    // اعمال فیلتر تب فعال
    let allItems = rawAllItems;`;

// 2. Locate renderArtifactsTableHtml and replace with compact version + Dossier Modal
const tableFnStart = "function renderArtifactsTableHtml(measureCode, items, sortDir, activeTab) {";
const tableFnEnd = "function renderArtifactsCardsTrackHtml(measureCode, items, activeTab) {";

const idxStart = content.indexOf(tableFnStart);
const idxEnd = content.indexOf(tableFnEnd);

if (idxStart === -1 || idxEnd === -1) {
  console.error('Could not find markers for renderArtifactsTableHtml');
  process.exit(1);
}

const newTableAndDossierCode = `function renderArtifactsTableHtml(measureCode, items, sortDir, activeTab) {
    if (items.length === 0) {
      return \`
        <div style="background:rgba(12,28,22,0.7);border:1px dashed rgba(212,175,90,0.3);border-radius:14px;padding:36px 20px;text-align:center;color:var(--sn-text-muted);">
          <div style="font-size:32px;margin-bottom:8px;">📂</div>
          <div style="font-size:14px;font-weight:700;color:var(--sn-gold-light);margin-bottom:6px;">هیچ موردی در این فیلتر ثبت نشده است</div>
          <div style="font-size:12px;margin-bottom:14px;">جهت تکمیل مستندات می‌توانید از کلیدهای بالای صفحه برای ثبت خط‌مشی، چک‌لیست یا شواهد استفاده کنید.</div>
          <button type="button" class="btn btn--success btn--sm" onclick="HassanHub.openGenericForm('policy', '\${measureCode}')">
            ➕ ثبت مورد جدید برای این سنجه
          </button>
        </div>
      \`;
    }

    return \`
      <!-- جدول جمع‌وجور و تمام‌عرض بدون نیاز به اسکرول افقی (Zero Horizontal Scroll) -->
      <div class="sn-artifacts-table-wrap" style="width:100%;box-sizing:border-box;border-radius:14px;border:1px solid rgba(212,175,90,0.28);background:rgba(12,28,22,0.92);box-shadow:0 10px 28px rgba(0,0,0,0.45);overflow:hidden;">
        <table class="sn-artifacts-table" style="width:100%;table-layout:fixed;border-collapse:collapse;direction:rtl;text-align:right;font-size:12px;">
          <thead>
            <tr style="background:linear-gradient(90deg, rgba(212,175,90,0.2) 0%, rgba(212,175,90,0.1) 100%);border-bottom:2px solid rgba(212,175,90,0.3);color:var(--sn-gold-light);font-size:12px;font-weight:800;">
              <th style="padding:11px 4px;width:4%;text-align:center;">ردیف</th>
              <th style="padding:11px 8px;width:17%;">نوع و کد مدرک</th>
              <th style="padding:11px 10px;width:33%;">عنوان مورد پرشده (پرونده)</th>
              <th style="padding:11px 8px;width:13%;cursor:pointer;user-select:none;" onclick="HassanHub.toggleArtifactSort('\${measureCode}')" title="تغییر جهت مرتب‌سازی تاریخ">
                <div style="display:inline-flex;align-items:center;gap:4px;">
                  <span>تاریخ ثبت</span>
                  <span style="font-size:10px;color:#fff;background:rgba(212,175,90,0.3);padding:1px 5px;border-radius:4px;font-weight:700;">
                    \${sortDir === 'desc' ? '▼ جدید' : '▲ قدیم'}
                  </span>
                </div>
              </th>
              <th style="padding:11px 8px;width:14%;">مسئول / ثبت‌کننده</th>
              <th style="padding:11px 6px;width:10%;text-align:center;">وضعیت انطباق</th>
              <th style="padding:11px 6px;width:9%;text-align:center;">بررسی</th>
            </tr>
          </thead>
          <tbody>
            \${items.map((it, idx) => {
              const bg = (idx % 2 === 0) ? 'background:rgba(16,36,28,0.45);' : 'background:rgba(22,50,40,0.65);';
              const bgVal = (idx % 2 === 0) ? 'rgba(16,36,28,0.45)' : 'rgba(22,50,40,0.65)';
              return \`
                <tr style="\${bg}border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;transition:background 0.15s ease;"
                    onclick="HassanHub.openArtifactDossier('\${measureCode}', \${idx})"
                    onmouseover="this.style.background='rgba(212,175,90,0.18)'"
                    onmouseout="this.style.background='\${bgVal}'"
                    title="جهت بررسی و مشاهده پرونده کامل کلیک کنید">
                  
                  <!-- ردیف -->
                  <td style="padding:10px 4px;text-align:center;font-weight:700;color:var(--sn-gold-light);font-size:11.5px;">
                    \${fa(idx + 1)}
                  </td>

                  <!-- نوع مدرک و کد در یک ستون فشرده -->
                  <td style="padding:10px 8px;overflow:hidden;">
                    <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-start;">
                      <span style="display:inline-flex;align-items:center;padding:2px 7px;border-radius:6px;font-size:11px;font-weight:700;\${it.badgeColor};white-space:nowrap;">
                        \${it.typeLabel}
                      </span>
                      <bdi dir="ltr" style="font-family:monospace;font-size:11px;color:var(--sn-gold-light);font-weight:700;padding-right:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">
                        \${escapeHtml(it.code)}
                      </bdi>
                    </div>
                  </td>

                  <!-- عنوان مورد پرشده با خلاصه‌سازی ۲ خطی -->
                  <td style="padding:10px 10px;overflow:hidden;">
                    <div style="font-weight:700;color:#fff;font-size:12.5px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;" title="\${escapeHtml(it.title)}">
                      \${escapeHtml(it.title)}
                    </div>
                    \${it.versionText ? \`
                      <div style="font-size:11px;color:var(--sn-text-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        \${escapeHtml(it.versionText)}
                      </div>
                    \` : ''}
                  </td>

                  <!-- تاریخ و زمان ثبت -->
                  <td style="padding:10px 8px;overflow:hidden;">
                    <div style="display:flex;flex-direction:column;gap:2px;">
                      <span style="font-weight:700;color:#fff;font-size:11.5px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;">
                        <span>📅</span> <span>\${it.dateText}</span>
                      </span>
                      \${it.dateTime ? \`
                        <span style="font-size:10.5px;color:var(--sn-text-muted);white-space:nowrap;">
                          🕒 \${it.dateTime}
                        </span>
                      \` : ''}
                    </div>
                  </td>

                  <!-- مسئول / ثبت‌کننده -->
                  <td style="padding:10px 8px;overflow:hidden;">
                    <div style="font-size:11.5px;color:rgba(255,255,255,0.88);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="\${escapeHtml(it.author)}">
                      \${escapeHtml(it.author)}
                    </div>
                  </td>

                  <!-- وضعیت انطباق -->
                  <td style="padding:10px 6px;text-align:center;overflow:hidden;">
                    <span style="display:inline-block;padding:2px 7px;border-radius:6px;font-size:11px;font-weight:700;\${it.statusClass};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">
                      \${it.status}
                    </span>
                  </td>

                  <!-- عملیات: دکمه بررسی پرونده -->
                  <td style="padding:10px 6px;text-align:center;">
                    <button type="button" class="btn btn--primary btn--sm" 
                            onclick="event.stopPropagation(); HassanHub.openArtifactDossier('\${measureCode}', \${idx})" 
                            style="padding:4px 9px;font-size:11px;border-radius:7px;display:inline-flex;align-items:center;gap:4px;background:rgba(212,175,90,0.22);border:1px solid rgba(212,175,90,0.5);color:var(--sn-gold-light);cursor:pointer;white-space:nowrap;" 
                            title="مشاهده و بررسی پرونده کامل">
                      <span>🔎</span> <span>بررسی</span>
                    </button>
                  </td>

                </tr>
              \`;
            }).join('')}
          </tbody>
        </table>
      </div>
    \`;
  }

  // =========================================================================
  // هاب پرونده الکترونیکی سنجه و مشاهده و بررسی پرونده (Dossier Modal)
  // =========================================================================
  HassanHub.closeArtifactDossier = function() {
    const el = document.getElementById('sn_artifact_dossier_modal');
    if (el) el.remove();
  };

  HassanHub.openArtifactDossier = function(measureCode, itemIndex) {
    measureCode = normCode(measureCode);
    const list = (HassanHub._currentFilteredItems && HassanHub._currentFilteredItems[measureCode]) || [];
    if (!list || !list.length) return;
    
    itemIndex = parseInt(itemIndex, 10);
    if (isNaN(itemIndex) || itemIndex < 0) itemIndex = 0;
    if (itemIndex >= list.length) itemIndex = list.length - 1;
    
    const it = list[itemIndex];
    if (!it) return;

    const hasPrev = itemIndex > 0;
    const hasNext = itemIndex < list.length - 1;
    const raw = it.rawItem || {};

    let detailsHtml = '';

    if (it.category === 'submission') {
      let answers = [];
      try {
        answers = typeof raw.answers === 'string' ? JSON.parse(raw.answers) : (raw.answers || []);
      } catch(e) { answers = []; }

      const pct = (raw.max_score && raw.max_score > 0) ? Math.round(((raw.score || 0) / raw.max_score) * 100) : 100;
      
      detailsHtml = \`
        <div style="background:rgba(16,36,28,0.7);border:1px solid rgba(212,175,90,0.28);border-radius:14px;padding:16px;margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
            <div style="font-size:13.5px;font-weight:800;color:var(--sn-gold-light);">
              📊 کارنامه ممیزی چک‌لیست: امتیاز \${fa(raw.score || 0)} از \${fa(raw.max_score || 0)} (\${fa(pct)}٪ انطباق)
            </div>
            <div style="font-size:11px;padding:3px 9px;border-radius:6px;background:rgba(16,185,129,0.2);color:#34d399;font-weight:700;">
              تکمیل‌شده و مصوب
            </div>
          </div>
          <div style="height:7px;border-radius:4px;background:rgba(255,255,255,0.08);overflow:hidden;margin-bottom:12px;">
            <div style="height:100%;width:\${pct}%;background:linear-gradient(90deg, #10b981 0%, #34d399 100%);"></div>
          </div>
          <div style="font-size:12.5px;line-height:1.7;color:#fff;background:rgba(0,0,0,0.25);padding:12px 14px;border-radius:10px;border-right:3px solid #10b981;">
            <b>گزارش و یادداشت ارزیاب:</b> \${escapeHtml(raw.note || 'ارزیابی میدانی انجام شده و فرم تکمیل گردید.')}
          </div>
        </div>

        \${answers.length > 0 ? \`
          <div style="margin-bottom:14px;">
            <h4 style="font-size:13px;font-weight:800;color:var(--sn-gold-light);margin-bottom:8px;">📋 ریز اقلام و پاسخ‌های ثبت‌شده در چک‌لیست:</h4>
            <div style="display:flex;flex-direction:column;gap:7px;max-height:240px;overflow-y:auto;padding-left:4px;">
              \${answers.map((ans, aIdx) => {
                const ansFa = ans.answer === 'excellent' ? 'عالی (انطباق کامل)' : (ans.answer === 'yes' ? 'بله (منطبق)' : 'خیر (عدم انطباق)');
                const ansColor = ans.answer === 'no' ? 'color:#f87171;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);' : 'color:#34d399;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);';
                return \`
                  <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:9px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
                    <div style="flex:1;">
                      <div style="font-size:12px;font-weight:700;color:#fff;">بند شماره \${fa(aIdx + 1)} چک‌لیست ممیزی</div>
                      \${ans.note ? \`<div style="font-size:11px;color:#fbbf24;margin-top:2px;">⚠️ مغایرت: \${escapeHtml(ans.note)}</div>\` : ''}
                    </div>
                    <span style="font-size:11px;padding:2px 7px;border-radius:5px;font-weight:700;white-space:nowrap;\${ansColor}">\${ansFa}</span>
                  </div>
                \`;
              }).join('')}
            </div>
          </div>
        \` : ''}
      \`;
    } else if (it.category === 'evaluation') {
      detailsHtml = \`
        <div style="background:rgba(16,36,28,0.7);border:1px solid rgba(212,175,90,0.28);border-radius:14px;padding:16px;margin-bottom:16px;">
          <div style="font-size:13.5px;font-weight:800;color:var(--sn-gold-light);margin-bottom:8px;">📊 ارزیابی رسمی سنجه — دوره سال \${fa(raw.year || 1405)}</div>
          <div style="font-size:12.5px;color:#fff;line-height:1.7;background:rgba(0,0,0,0.25);padding:12px 14px;border-radius:10px;border-right:3px solid #8b5cf6;">
            <b>مشروح نظرات ارزیاب کیفیت:</b> \${escapeHtml(raw.notes || 'ارزیابی انطباق سنجه ثبت شده است.')}
          </div>
          <div style="margin-top:10px;font-size:12px;color:var(--sn-text-muted);">
            وضعیت سیستمی: <b style="color:#fff;">\${escapeHtml(it.status)}</b> · ارزیاب ثبت‌کننده: <b style="color:var(--sn-gold-light);">\${escapeHtml(it.author)}</b>
          </div>
        </div>
      \`;
    } else if (it.category === 'policy' || it.category === 'procedure') {
      detailsHtml = \`
        <div style="background:rgba(16,36,28,0.7);border:1px solid rgba(212,175,90,0.28);border-radius:14px;padding:16px;margin-bottom:16px;">
          <div style="font-size:13.5px;font-weight:800;color:var(--sn-gold-light);margin-bottom:8px;">📜 مشخصات سند مصوب: \${escapeHtml(it.title)}</div>
          <div style="font-size:12px;color:var(--sn-text-muted);margin-bottom:10px;">
            کد سند: <bdi dir="ltr" style="font-family:monospace;color:var(--sn-gold-light);">\${escapeHtml(it.code)}</bdi> · نسخه \${fa(raw.version_no || 1)} (بازنگری \${fa(raw.revision_no || 0)}) · وضعیت: <b style="color:#34d399;">\${it.status}</b>
          </div>
          <div style="font-size:12.5px;line-height:1.7;color:#fff;background:rgba(0,0,0,0.25);padding:12px 14px;border-radius:10px;border-right:3px solid #d4af37;">
            <b>مسئول تدوین و اجرا:</b> \${escapeHtml(raw.responsible_person || it.author)}
            <br>
            <b>تاریخ ابلاغ / اعتبار:</b> \${escapeHtml(it.dateText)}
          </div>
          \${it.actionUrl ? \`
            <div style="margin-top:12px;">
              <a href="\${it.actionUrl}" class="btn btn--primary btn--sm" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px;font-size:12px;padding:7px 14px;">
                <span>👁️</span> <span>مشاهده متن کامل سند در سندخوان تخصصی</span>
              </a>
            </div>
          \` : ''}
        </div>
      \`;
    } else if (it.category === 'evidence') {
      detailsHtml = \`
        <div style="background:rgba(16,36,28,0.7);border:1px solid rgba(212,175,90,0.28);border-radius:14px;padding:16px;margin-bottom:16px;">
          <div style="font-size:13.5px;font-weight:800;color:var(--sn-gold-light);margin-bottom:8px;">📎 سند شواهد پیوست‌شده: \${escapeHtml(it.title)}</div>
          <div style="font-size:12px;color:var(--sn-text-muted);margin-bottom:12px;">
            نام فایل: <bdi dir="ltr" style="font-family:monospace;color:#fff;">\${escapeHtml(raw.file_name || it.code)}</bdi> · حجم فایل: <b>\${it.status}</b> · ثبت‌کننده: <b>\${escapeHtml(it.author)}</b>
          </div>
          \${it.actionUrl ? \`
            <a href="\${it.actionUrl}" target="_blank" class="btn btn--success btn--sm" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px;font-size:12px;padding:7px 14px;">
              <span>📥</span> <span>دانلود و باز کردن فایل ضمیمه</span>
            </a>
          \` : ''}
        </div>
      \`;
    } else if (it.category === 'flowchart') {
      detailsHtml = \`
        <div style="background:rgba(16,36,28,0.7);border:1px solid rgba(212,175,90,0.28);border-radius:14px;padding:16px;margin-bottom:16px;">
          <div style="font-size:13.5px;font-weight:800;color:var(--sn-gold-light);margin-bottom:8px;">🔄 شناسنامه و فلوچارت فرآیند: \${escapeHtml(it.title)}</div>
          <div style="font-size:12px;color:var(--sn-text-muted);margin-bottom:12px;">
            کد فرآیند: <bdi dir="ltr" style="font-family:monospace;color:var(--sn-gold-light);">\${escapeHtml(it.code)}</bdi> · حوزه فرآیند: <b>\${escapeHtml(it.author)}</b>
          </div>
          <button type="button" class="btn btn--primary btn--sm" onclick="HassanHub.closeArtifactDossier(); if(typeof go==='function') go('processes');" style="display:inline-flex;align-items:center;gap:6px;font-size:12px;padding:7px 14px;">
            <span>🔍</span> <span>مشاهده فلوچارت کامل در ماژول فرآیندها</span>
          </button>
        </div>
      \`;
    } else if (it.category === 'checklist') {
      detailsHtml = \`
        <div style="background:rgba(16,36,28,0.7);border:1px solid rgba(212,175,90,0.28);border-radius:14px;padding:16px;margin-bottom:16px;">
          <div style="font-size:13.5px;font-weight:800;color:var(--sn-gold-light);margin-bottom:8px;">✅ الگوی چک‌لیست ممیزی: \${escapeHtml(it.title)}</div>
          <div style="font-size:12px;color:var(--sn-text-muted);margin-bottom:12px;">
            کد چک‌لیست: <bdi dir="ltr" style="font-family:monospace;color:var(--sn-gold-light);">\${escapeHtml(it.code)}</bdi> · دوره پایش: <b>\${escapeHtml(it.author)}</b> · وضعیت: <b style="color:#34d399;">\${it.status}</b>
          </div>
          <button type="button" class="btn btn--success btn--sm" onclick="HassanHub.closeArtifactDossier(); HassanHub.openMeasureChecklistPage('\${measureCode}');" style="display:inline-flex;align-items:center;gap:6px;font-size:12px;padding:7px 14px;">
            <span>✍️</span> <span>ورود به سامانه تکمیل و ثبت این چک‌لیست</span>
          </button>
        </div>
      \`;
    }

    const modalHtml = \`
      <div id="sn_artifact_dossier_modal" style="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:14px;direction:rtl;animation:fadeIn 0.2s ease;">
        <div style="background:linear-gradient(145deg, rgba(16,36,28,0.98) 0%, rgba(10,22,18,0.98) 100%);border:1px solid rgba(212,175,90,0.45);border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,0.75);max-width:760px;width:100%;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;">
          
          <!-- Header -->
          <header style="padding:16px 20px;border-bottom:1px solid rgba(212,175,90,0.22);display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.25);">
            <div style="display:flex;align-items:center;gap:12px;overflow:hidden;">
              <span style="font-size:22px;flex-shrink:0;">📁</span>
              <div style="overflow:hidden;">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                  <span style="display:inline-flex;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;\${it.badgeColor}">
                    \${it.typeLabel}
                  </span>
                  <span style="font-size:11.5px;color:var(--sn-text-muted);">
                    پرونده شماره \${fa(itemIndex + 1)} از \${fa(list.length)}
                  </span>
                </div>
                <h3 style="font-size:15px;font-weight:800;color:#fff;margin:4px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  \${escapeHtml(it.title)}
                </h3>
              </div>
            </div>
            <button type="button" onclick="HassanHub.closeArtifactDossier()" style="background:transparent;border:none;color:var(--sn-text-muted);font-size:22px;cursor:pointer;padding:4px 8px;border-radius:8px;line-height:1;" title="بستن پرونده (Esc)">
              ✕
            </button>
          </header>

          <!-- Body -->
          <div style="padding:18px 20px;overflow-y:auto;flex:1;">
            
            <!-- ۴ کارت فشرده خلاصه وضعیت -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(150px, 1fr));gap:10px;margin-bottom:16px;">
              <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 12px;">
                <div style="font-size:11px;color:var(--sn-text-muted);margin-bottom:3px;">📅 تاریخ ثبت</div>
                <div style="font-size:12.5px;font-weight:700;color:#fff;">\${it.dateText}</div>
                \${it.dateTime ? \`<div style="font-size:10.5px;color:var(--sn-gold-light);margin-top:2px;">🕒 \${it.dateTime}</div>\` : ''}
              </div>

              <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 12px;">
                <div style="font-size:11px;color:var(--sn-text-muted);margin-bottom:3px;">👤 مسئول / ثبت‌کننده</div>
                <div style="font-size:12px;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="\${escapeHtml(it.author)}">\${escapeHtml(it.author)}</div>
              </div>

              <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 12px;">
                <div style="font-size:11px;color:var(--sn-text-muted);margin-bottom:3px;">🔖 شناسه ثبتی</div>
                <div style="font-size:12.5px;font-weight:700;color:var(--sn-gold-light);font-family:monospace;">
                  <bdi dir="ltr">\${escapeHtml(it.code)}</bdi>
                </div>
              </div>

              <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 12px;">
                <div style="font-size:11px;color:var(--sn-text-muted);margin-bottom:3px;">📊 وضعیت انطباق</div>
                <div style="font-size:11.5px;font-weight:700;">
                  <span style="display:inline-block;padding:2px 7px;border-radius:5px;\${it.statusClass}">
                    \${it.status}
                  </span>
                </div>
              </div>
            </div>

            <!-- محتوای تخصصی -->
            \${detailsHtml}

          </div>

          <!-- Footer -->
          <footer style="padding:12px 20px;border-top:1px solid rgba(212,175,90,0.22);display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.3);flex-wrap:wrap;gap:8px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <button type="button" class="btn btn--secondary btn--sm" onclick="HassanHub.openArtifactDossier('\${measureCode}', \${itemIndex - 1})" \${hasPrev ? '' : 'disabled'} style="opacity:\${hasPrev ? 1 : 0.4};font-size:11.5px;padding:5px 10px;">
                <span>‹</span> <span>پرونده قبلی</span>
              </button>
              <button type="button" class="btn btn--secondary btn--sm" onclick="HassanHub.openArtifactDossier('\${measureCode}', \${itemIndex + 1})" \${hasNext ? '' : 'disabled'} style="opacity:\${hasNext ? 1 : 0.4};font-size:11.5px;padding:5px 10px;">
                <span>پرونده بعدی</span> <span>›</span>
              </button>
            </div>

            <div style="display:flex;align-items:center;gap:8px;">
              <button type="button" class="btn btn--ghost btn--sm" onclick="window.print()" style="display:inline-flex;align-items:center;gap:4px;font-size:11.5px;padding:5px 10px;">
                <span>🖨️</span> <span>چاپ پرونده</span>
              </button>
              <button type="button" class="btn btn--secondary btn--sm" onclick="HassanHub.closeArtifactDossier()" style="font-size:11.5px;padding:5px 12px;">
                بستن
              </button>
            </div>
          </footer>

        </div>
      </div>
    \`;

    HassanHub.closeArtifactDossier();

    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    document.body.appendChild(div.firstElementChild);

    const escHandler = (e) => {
      if (e.key === 'Escape') {
        HassanHub.closeArtifactDossier();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  };
`;

content = content.substring(0, idxStart) + newTableAndDossierCode + content.substring(idxEnd);

// Also make sure HassanHub._currentFilteredItems is updated in HassanHub.renderArtifactsSection
const saveListMarker = "    // تجمیع اقلام در ابتدای تابع تا هیچ خطای TDZ رخ ندهد\n    const rawAllItems = buildUnifiedArtifactList(data, measureCode);";
const saveListMarkerCRLF = "    // تجمیع اقلام در ابتدای تابع تا هیچ خطای TDZ رخ ندهد\r\n    const rawAllItems = buildUnifiedArtifactList(data, measureCode);";

const saveListCode = `    // تجمیع اقلام در ابتدای تابع تا هیچ خطای TDZ رخ ندهد
    const rawAllItems = buildUnifiedArtifactList(data, measureCode);
    HassanHub._currentFilteredItems = HassanHub._currentFilteredItems || {};
    HassanHub._currentFilteredItems[measureCode] = rawAllItems;`;

if (content.includes(saveListMarker)) {
  content = content.replace(saveListMarker, saveListCode);
} else if (content.includes(saveListMarkerCRLF)) {
  content = content.replace(saveListMarkerCRLF, saveListCode.replace(/\n/g, '\r\n'));
}

// And when allItems is filtered:
const filteredMarker = "    // اعمال فیلتر تب فعال\n    let allItems = rawAllItems;";
const filteredMarkerCRLF = "    // اعمال فیلتر تب فعال\r\n    let allItems = rawAllItems;";

const filteredCode = `    // اعمال فیلتر تب فعال
    let allItems = rawAllItems;`;

fs.writeFileSync(file, content, 'utf8');
console.log('Compact table and Dossier Modal successfully added to hassan-hubs.js!');
