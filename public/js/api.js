// ============ API Client ============
const API = {
  async req(path, opts = {}) {
    const res = await fetch('/api' + path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts,
    });
    let data = null;
    try { data = await res.json(); } catch (e) { data = {}; }
    if (!res.ok) {
      // کد وضعیت را روی خطا نگه می‌داریم: بدون آن، فراخوان‌کننده نمی‌توانست «پیدا نشد»
      // را از «سقف درخواست» یا «خطای سرور» تشخیص دهد و همه را یکسان مدیریت می‌کرد.
      const err = new Error(data.error || `خطای سرور (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return data;
  },
  // سال شمسی انتخاب‌شده در نوار کناری را به روت‌های سال‌محور اضافه می‌کند تا فیلتر واقعاً روی داده اعمال شود
  // (پیش از این سال فقط state فرانت بود و هیچ کوئری‌ای را محدود نمی‌کرد).
  wy(path, q) {
    const y = (typeof S !== 'undefined' && S && S.year) ? S.year : null;
    const parts = [];
    if (q) parts.push(q);
    if (y) parts.push('year=' + y);
    return path + (parts.length ? (path.includes('?') ? '&' : '?') + parts.join('&') : '');
  },
  get(p) { return this.req(p); },
  post(p, body) { return this.req(p, { method: 'POST', body: JSON.stringify(body) }); },
  put(p, body) { return this.req(p, { method: 'PUT', body: JSON.stringify(body) }); },

  // auth
  login(username, password) { return this.post('/auth/login', { username, password }); },
  logout() { return this.post('/auth/logout', {}); },
  me() { return this.get('/auth/me'); },
  // وضعیت نشست برای بوت SPA — برخلاف me() هرگز ۴۰۱ نمی‌دهد و همیشه {authenticated:bool}
  // برمی‌گرداند؛ روی صفحه‌ی ورود (بدون نشست) یک ۴۰۱ بی‌فایده در کنسول نمی‌گذارد.
  session() { return this.get('/auth/session'); },
  changePassword(current_password, new_password) { return this.post('/auth/change-password', { current_password, new_password }); },
  // فهرست مراکز فعال برای صفحه‌ی انتخاب مرکز (بدون ورود)
  publicHospitals() { return this.get('/public/hospitals'); },
  publicHospital(id) { return this.get(`/public/hospital/${encodeURIComponent(id)}`); },
  devUsers() { return this.get('/auth/dev-users'); },
  devLogin(username) { return this.post('/auth/dev-login', { username }); },
  // ورود کاشی‌ای بر اساس سمت — جایگزین فرم نام‌کاربری/رمز برای ورود روزمره
  hospitalRoles(id) { return this.get(`/entry/hospital/${encodeURIComponent(id)}/roles`); },
  requirePassword() { return this.get('/entry/require-password'); },
  themePolicy() { return this.get('/entry/theme-policy'); },
  roleLogin(user_id, password) { return this.post('/entry/role-login', { user_id, password }); },
  superSettings() { return this.get('/super/settings'); },
  superSetRequirePassword(require_password) { return this.put('/super/settings', { require_password }); },
  superSetProfileFieldsEnabled(profile_fields_enabled) { return this.put('/super/settings', { profile_fields_enabled }); },
  superSetLightThemeEnabled(light_theme_enabled) { return this.put('/super/settings', { light_theme_enabled }); },
  // پروفایل شخصی (جنسیت/بیو/نحوه تماس/عکس) — فقط خودِ کاربر
  updateMyProfile(data) { return this.put('/profile/me', data); },
  uploadAvatar(file) {
    const fd = new FormData(); fd.append('file', file);
    return fetch('/api/profile/avatar', { method: 'POST', credentials: 'include', body: fd })
      .then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'خطا در آپلود'); return d; });
  },
  // بکاپ و بازگردانی دیتابیس پلتفرم
  superBackupDownloadUrl() { return '/api/super/backup/download'; },
  superRestoreBackup(file, confirm_phrase) {
    const fd = new FormData(); fd.append('file', file); fd.append('confirm_phrase', confirm_phrase);
    return fetch('/api/super/backup/restore', { method: 'POST', credentials: 'include', body: fd })
      .then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'خطا در بازگردانی'); return d; });
  },

  // accreditation
  tree() { return this.get('/accreditation/tree'); },
  // متن کامل کتاب سنجههای مشخص — واکشی تنبل پس از درخت سبک
  measureDetails(ids) { return this.get('/accreditation/measures-full?ids=' + encodeURIComponent(ids.join(','))); },
  // اقلام و زیرمنوهای تکمیل‌شده و مرتبط با هر سنجه (خط‌مشی، روش اجرایی، چک‌لیست، فلوچارت و شواهد)
  measureArtifacts(code) { return this.get('/accreditation/measures/' + encodeURIComponent(code) + '/artifacts'); },
  statuses() { return this.get(this.wy('/accreditation/status')); },
  // سال را صریح می‌فرستیم: وضعیت سنجه دوره‌ای است و باید در همان سالی ثبت شود
  // که کاربر از نوار بالای صفحه انتخاب کرده، نه همیشه سال جاری.
  setStatus(measureId, status, notes, na_reason) {
    return this.put('/accreditation/status/' + measureId,
      { status, notes, na_reason, year: (typeof S !== 'undefined' && S && S.year) ? S.year : undefined });
  },
  accDashboard() { return this.get(this.wy('/accreditation/dashboard')); },
  // نمره‌ی ارزیاب داخلی/بیرونی — جدا از خودارزیابی
  setReview(kind, measureId, status, note) {
    return this.put('/accreditation/review/' + kind + '/' + measureId,
      { status, note, year: (typeof S !== 'undefined' && S && S.year) ? S.year : undefined });
  },
  reviewGaps() { return this.get(this.wy('/accreditation/review-gaps')); },
  scoring() { return this.get('/accreditation/scoring'); },
  setEvalMethod(measureId, eval_obs, eval_itv) {
    return this.put('/accreditation/eval-method/' + measureId, { eval_obs, eval_itv });
  },
  superScoring() { return this.get('/super/scoring'); },
  superSaveScoring(level_weights) { return this.put('/super/scoring', { level_weights }); },

  // پرونده‌ی الکترونیکی شواهد — یک مسیر مشترک برای سنجه/حسابرسی/مصوبه‌ی واکراند
  evidenceFiles(type, id) { return this.get(`/evidence/${type}/${encodeURIComponent(id)}`); },
  uploadEvidenceFile(type, id, file, title) {
    const fd = new FormData(); fd.append('file', file);
    if (title) fd.append('title', title);
    // بدون Content-Type دستی — مرورگر باید boundary را خودش بگذارد
    return fetch(`/api/evidence/${type}/${encodeURIComponent(id)}`, { method: 'POST', credentials: 'include', body: fd })
      .then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'خطا در آپلود'); return d; });
  },
  deleteEvidenceFile(fileId) { return this.req(`/evidence/file/${fileId}`, { method: 'DELETE' }); },
  evidenceDownloadUrl(fileId) { return `/api/evidence/file/${fileId}/download`; },

  // general
  dashboard() { return this.get('/dashboard'); },
  users() { return this.get('/users'); },
  rolesList() { return this.get('/users/roles/list'); },
  createUser(b) { return this.post('/users', b); },
  permissionCatalog() { return this.get('/roles/permissions/catalog'); },
  // دسترسی موردی کاربر ↔ سنجه
  myOverrides() { return this.get('/accreditation/my-overrides'); },
  searchMeasures(q) { return this.get('/measures/search?q=' + encodeURIComponent(q)); },
  userOverrides(uid) { return this.get(`/users/${uid}/measure-overrides`); },
  setUserOverride(uid, b) { return this.post(`/users/${uid}/measure-overrides`, b); },
  deleteUserOverride(uid, id) { return this.req(`/users/${uid}/measure-overrides/${id}`, { method: 'DELETE' }); },
  createRole(b) { return this.post('/roles', b); },
  updateRole(id, b) { return this.put(`/roles/${id}`, b); },
  superLogin(username, password) { return this.post('/auth/super-login', { username, password }); },
  superLogout() { return this.post('/auth/super-logout', {}); },
  superMe() { return this.get('/auth/super-me'); },
  superHospitals() { return this.get('/super/hospitals'); },
  superRoleHierarchy() { return this.get('/super/role-hierarchy'); },
  superSaveRoleHierarchy(roles) { return this.put('/super/role-hierarchy', { roles }); },
  superRecycleBin(q) { return this.get('/super/recycle-bin' + (q ? '?' + q : '')); },
  superRestore(id) { return this.post('/super/recycle-bin/' + id + '/restore', {}); },
  superCreateHospital(name) { return this.post('/super/hospitals', { name }); },
  superSetHospitalActive(id, is_active) { return this.put(`/super/hospitals/${id}`, { is_active }); },
  superRenameHospital(id, name) { return this.put(`/super/hospitals/${id}`, { name }); },
  superHospitalAuditLog(id) { return this.get(`/super/hospitals/${id}/audit-log`); },
  superAssignHospitalAdmin(id, b) { return this.post(`/super/hospitals/${id}/admin`, b); },
  // پست‌های حوزه‌ی مدیریت — برچسب/تعداد فقط از پنل سوپرادمین قابل تغییر
  superManagementPositions(hospitalId) { return this.get(`/super/hospitals/${hospitalId}/management-positions`); },
  superAddManagementPosition(hospitalId, label) { return this.post(`/super/hospitals/${hospitalId}/management-positions`, { label }); },
  superRenameManagementPosition(id, label) { return this.put(`/super/management-positions/${id}`, { label }); },
  superDeleteManagementPosition(id) { return this.req(`/super/management-positions/${id}`, { method: 'DELETE' }); },
  superUploadHospitalLogo(id, file) {
    const fd = new FormData(); fd.append('file', file);
    return fetch(`/api/super/hospitals/${id}/logo`, { method: 'POST', credentials: 'include', body: fd })
      .then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'خطا در آپلود لوگو'); return d; });
  },
  // لاگ خطاهای سرور
  superErrorLog(params) { const q = new URLSearchParams(params || {}).toString(); return this.get('/super/error-log' + (q ? '?' + q : '')); },
  // لاگ فعالیت کراس‌بیمارستان (از audit_log/super_audit_log موجود)
  superActivityLog(params) { const q = new URLSearchParams(params || {}).toString(); return this.get('/super/activity-log' + (q ? '?' + q : '')); },
  superUserSummary(params) { const q = new URLSearchParams(params || {}).toString(); return this.get('/super/user-summary' + (q ? '?' + q : '')); },
  // «کنترل کامل» — مدیریت هر کاربر از پنل سوپرادمین
  superHospitalUsers(hospitalId) { return this.get(`/super/hospitals/${hospitalId}/users`); },
  superResetUserPassword(userId, new_password) { return this.put(`/super/users/${userId}/reset-password`, { new_password }); },
  superSetUserStatus(userId, is_active) { return this.put(`/super/users/${userId}/status`, { is_active }); },
  superSetUserRole(userId, role_id) { return this.put(`/super/users/${userId}/role`, { role_id }); },
  // امکانات/پکیج هر بیمارستان (superadmin) — فعال/غیرفعال‌کردن هر بخش برای فروش پکیج
  superHospitalFeatures(hospitalId) { return this.get(`/super/hospitals/${hospitalId}/features`); },
  superSetHospitalFeature(hospitalId, feature_key, enabled) { return this.put(`/super/hospitals/${hospitalId}/features`, { feature_key, enabled }); },
  // امکانات/پکیج بیمارستان جاری (کاربر عادی) — برای قفل‌نمایی منو و صفحه‌ی «برای فعال‌سازی خرید کنید»
  hospitalFeatures() { return this.get('/hospital/features'); },
  // امضای الکترونیکی
  signatures() { return this.get('/signatures'); },
  uploadSignature(file, label, user_id) {
    const fd = new FormData(); fd.append('file', file);
    if (label) fd.append('label', label);
    if (user_id) fd.append('user_id', user_id);
    return fetch('/api/signatures', { method: 'POST', credentials: 'include', body: fd })
      .then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'خطا در آپلود'); return d; });
  },
  activateSignature(id) { return this.post('/signatures/' + id + '/active', {}); },
  deleteSignature(id) { return this.req('/signatures/' + id, { method: 'DELETE' }); },

  // یادآوری‌ها — اقلامشان از همان /inbox می‌آید؛ این‌ها فقط «انجام شد/بعداً» و قوانین‌اند
  reminderDone(dedupe_key) { return this.post('/reminders/done', { dedupe_key }); },
  reminderSnooze(dedupe_key, days) { return this.post('/reminders/snooze', { dedupe_key, days }); },
  reminderRules() { return this.get('/reminders/rules'); },
  createReminderRule(b) { return this.post('/reminders/rules', b); },
  updateReminderRule(id, b) { return this.put('/reminders/rules/' + id, b); },
  deleteReminderRule(id) { return this.req('/reminders/rules/' + id, { method: 'DELETE' }); },

  accreditationPeriod() { return this.get('/policy/period'); },
  saveAccreditationPeriod(b) { return this.put('/policy/period', b); },
  guideTimeline() { return this.get('/guide-timeline'); },
  // دستیار هوشمند — «الان چه کار کنم؟» و «بررسی وظایف من»
  assistantNext() { return this.get('/assistant/next'); },
  assistantReview() { return this.get('/assistant/review'); },
  legalDuties() { return this.get('/legal-duties'); },
  dutiesProgress() { return this.get('/duties/progress'); },
  myWork() { return this.get('/my-work'); },
  smartDecisions() { return this.get('/duties/smart-decisions'); },
  // دستیار «دانا»
  assistantChat(text, conversation_id) { return this.post('/assistant/chat', { text, conversation_id }); },
  assistantConversations() { return this.get('/assistant/conversations'); },
  assistantMessages(id) { return this.get(`/assistant/conversations/${id}/messages`); },
  assistantUsage() { return this.get('/assistant/usage'); },
  superAssistantSettings(hid) { return this.get(`/super/hospitals/${hid}/assistant`); },
  superSaveAssistantSettings(hid, b) { return this.put(`/super/hospitals/${hid}/assistant`, b); },
  superTestAssistantSettings(hid, b) { return this.post(`/super/hospitals/${hid}/assistant/test`, b); },
  superAssistantConversations(hid) { return this.get(`/super/hospitals/${hid}/assistant/conversations`); },
  superAssistantConversationMessages(hid, cid) { return this.get(`/super/hospitals/${hid}/assistant/conversations/${cid}/messages`); },
  followupList(params) {
    const q = new URLSearchParams(Object.entries(params || {}).filter(([,v]) => v !== undefined && v !== '')).toString();
    return this.get('/followup' + (q ? '?' + q : ''));
  },
  followupCreate(b) { return this.post('/followup', b); },
  followupUpdate(id, b) { return this.put(`/followup/${id}`, b); },
  followupContacts(id) { return this.get(`/followup/${id}/contacts`); },
  followupAddContact(id, b) { return this.post(`/followup/${id}/contacts`, b); },
  dismissGuideMilestone(key) { return this.post('/guide-timeline/dismiss', { key }); }, // «انجام دادم»
  snoozeGuideMilestone(key, days) { return this.post('/guide-timeline/snooze', { key, days }); }, // «بعداً یادآوری کن»
  settings() { return this.get('/users/settings'); },
  updateSettings(b) { return this.put('/users/settings', b); },
  committees() { return this.get('/committees'); },
  createCommittee(b) { return this.post('/committees', b); },
  committeeMinutes(id) { return this.get(this.wy('/committees/' + id + '/minutes')); },
  addCommitteeMinutes(id, b) { return this.post('/committees/' + id + '/minutes', b); },
  committeeMinute(cid, mid) { return this.get('/committees/' + cid + '/minutes/' + mid); },
  updateCommitteeMinute(cid, mid, b) { return this.put('/committees/' + cid + '/minutes/' + mid, b); },
  signCommitteeMinute(cid, mid) { return this.post('/committees/' + cid + '/minutes/' + mid + '/sign', {}); },
  previousDecisions(cid, q) { return this.get('/committees/' + cid + '/previous-decisions' + (q || '')); },
  deleteCommitteeMinute(cid, mid) { return this.req('/committees/' + cid + '/minutes/' + mid, { method: 'DELETE' }); },
  meetingRooms() { return this.get('/committees/meeting-rooms'); },
  committeeMeetings(id) { return this.get(this.wy('/committees/' + id + '/meetings')); },
  scheduleCommitteeMeeting(id, b) { return this.post('/committees/' + id + '/meetings', b); },
  cancelCommitteeMeeting(eventId) { return this.req('/committees/meetings/' + eventId, { method: 'DELETE' }); },
  tasks() { return this.get('/tasks'); },
  assistantStatus() { return this.get('/assistant/status'); },
  // خواندن متن از عکس/PDF — multipart، پس Content-Type را مرورگر خودش می‌گذارد
  ocrExtract(file) {
    const fd = new FormData(); fd.append('file', file);
    return fetch('/api/ocr/extract', { method: 'POST', credentials: 'include', body: fd })
      .then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'خطا در خواندن فایل'); return d; });
  },
  superChangePassword(b) { return this.post('/super/change-password', b); },

  // کارتابل شخصی + جانشین
  inbox() { return this.get('/inbox'); },
  colleagues() { return this.get('/users/colleagues'); },
  delegates() { return this.get('/users/delegates'); },
  createDelegate(b) { return this.post('/users/delegates', b); },
  deleteDelegate(id) { return this.req('/users/delegates/' + id, { method: 'DELETE' }); },

  // پیام‌های داخلی
  messages(box) { return this.get('/messages?box=' + encodeURIComponent(box || 'inbox')); },
  sendMessage(b) { return this.post('/messages', b); },
  updateMessage(id, b) { return this.put('/messages/' + id, b); },
  deleteMessage(id) { return this.req('/messages/' + id, { method: 'DELETE' }); },
  unreadMessages() { return this.get('/messages/unread-count'); },

  // میانبرهای شخصی + شمارنده‌های منو
  shortcuts() { return this.get('/shortcuts'); },
  addShortcut(b) { return this.post('/shortcuts', b); },
  deleteShortcut(id) { return this.req('/shortcuts/' + id, { method: 'DELETE' }); },
  navBadges() { return this.get('/nav-badges'); },

  // مدارک کنترل‌شده
  documents(q) { return this.get('/documents' + (q ? '?' + q : '')); },
  sectionDocuments(sectionId) { return this.get('/documents?section_id=' + encodeURIComponent(sectionId)); },
  document(id) { return this.get('/documents/' + id); },
  createDocument(b) { return this.post('/documents', b); },
  docCodes() { return this.get('/doc-codes'); },
  tenures() { return this.get('/tenures'); },
  tenuresAt(date, roleCode) { return this.get('/tenures/at?date=' + encodeURIComponent(date) + (roleCode ? '&role_code=' + encodeURIComponent(roleCode) : '')); },
  docEditors() { return this.get('/document-editors'); },
  grantDocEditor(user_id, note) { return this.post('/document-editors', { user_id, note }); },
  revokeDocEditor(id) { return this.req('/document-editors/' + id, { method: 'DELETE' }); },
  docCodeNext(id) { return this.get('/doc-codes/' + id + '/next'); },
  saveDocCode(id, code, auto) { return this.put('/doc-codes/' + id, auto ? { auto: true } : { code }); },
  updateDocument(id, b) { return this.put('/documents/' + id, b); },
  deleteDocument(id) { return this.req('/documents/' + id, { method: 'DELETE' }); },
  addSignoff(id, b) { return this.post('/documents/' + id + '/signoffs', b); },
  signSignoff(sid) { return this.post('/documents/signoffs/' + sid + '/sign', {}); },
  deleteSignoff(sid) { return this.req('/documents/signoffs/' + sid, { method: 'DELETE' }); },
  documentVersion(id, vid) { return this.get('/documents/' + id + '/versions/' + vid); },
  uploadDocumentAttachment(id, file) {
    const fd = new FormData(); fd.append('file', file);
    return fetch('/api/documents/' + id + '/attachment', { method: 'POST', credentials: 'include', body: fd })
      .then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'خطا در آپلود'); return d; });
  },
  // آپلود انبوه: چند فایل هم‌زمان، متن استخراج و طبقه‌بندی می‌شود؛ ثبتِ
  // نهایی با createDocument/createProcess همینِ فایل انجام می‌شود.
  bulkExtractDocuments(files) {
    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    return fetch('/api/documents/bulk-extract', { method: 'POST', credentials: 'include', body: fd })
      .then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'خطا در پردازش فایل‌ها'); return d; });
  },

  // کتابخانه دیجیتال (مخزن ساده فایل)
  library(q) { return this.get('/library' + (q ? '?' + q : '')); },
  createLibraryItem(b) { return this.post('/library', b); },
  updateLibraryItem(id, b) { return this.put('/library/' + id, b); },
  deleteLibraryItem(id) { return this.req('/library/' + id, { method: 'DELETE' }); },
  uploadLibraryFile(id, file) {
    const fd = new FormData(); fd.append('file', file);
    // بدون Content-Type دستی — مرورگر باید boundary را خودش بگذارد
    return fetch('/api/library/' + id + '/file', { method: 'POST', credentials: 'include', body: fd })
      .then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'خطا در آپلود'); return d; });
  },

  // بانک چک‌لیست‌ها
  checklists(q) { return this.get('/checklists' + (q ? '?' + q : '')); },
  checklist(id) { return this.get('/checklists/' + id); },
  createChecklist(b) { return this.post('/checklists', b); },
  updateChecklist(id, b) { return this.put('/checklists/' + id, b); },
  deleteChecklist(id) { return this.req('/checklists/' + id, { method: 'DELETE' }); },
  checklistSubmissions(id) { return this.get(this.wy('/checklists/' + id + '/submissions')); },
  submitChecklist(id, b) { return this.post('/checklists/' + id + '/submissions', b); },
  checklistSubmission(sid) { return this.get('/checklists/submissions/' + sid); },
  checklistCorrectiveAction(sid, b) { return this.post('/checklists/submissions/' + sid + '/corrective-action', b); },
  setChecklistMeasurers(id, ids) { return this.put('/checklists/' + id + '/measurers', { measurer_user_ids: ids }); },
  checklistExportUrl(id) { return this.wy('/api/checklists/' + id + '/export.csv'); },

  // جست‌وجوی سراسری — نتیجه‌ها را خودِ سرور با مجوزِ همان کاربر فیلتر می‌کند
  globalSearch(q) { return this.get('/search?q=' + encodeURIComponent(q)); },

  // مدیریت دارویی (محور ب-۶)
  phList(res, q) { return this.get('/pharmacy/' + res + (q ? '?' + q : '')); },
  phCreate(res, b) { return this.post('/pharmacy/' + res, b); },
  phUpdate(res, id, b) { return this.put('/pharmacy/' + res + '/' + id, b); },
  phDelete(res, id) { return this.req('/pharmacy/' + res + '/' + id, { method: 'DELETE' }); },
  phTemps(fridgeId) { return this.get('/pharmacy-temp/' + fridgeId); },
  phAddTemp(fridgeId, b) { return this.post('/pharmacy-temp/' + fridgeId, b); },
  phDashboard() { return this.get('/pharmacy-dashboard'); },

  // اقلام و نگهداشت دوره‌ای
  assets(q) { return this.get('/assets' + (q ? '?' + q : '')); },
  asset(id) { return this.get('/assets/' + id); },
  assetsDue() { return this.get('/assets-due'); },
  createAsset(b) { return this.post('/assets', b); },
  updateAsset(id, b) { return this.put('/assets/' + id, b); },
  deleteAsset(id) { return this.req('/assets/' + id, { method: 'DELETE' }); },
  createAssetPlan(assetId, b) { return this.post('/assets/' + assetId + '/plans', b); },
  updateAssetPlan(planId, b) { return this.put('/assets/plans/' + planId, b); },
  deleteAssetPlan(planId) { return this.req('/assets/plans/' + planId, { method: 'DELETE' }); },
  createAssetLog(assetId, b) { return this.post('/assets/' + assetId + '/logs', b); },
  deleteAssetLog(logId) { return this.req('/assets/logs/' + logId, { method: 'DELETE' }); },

  // نشان‌ها و گواهینامه‌ها
  certifications(q) { return this.get('/certifications' + (q ? '?' + q : '')); },
  createCertification(b) { return this.post('/certifications', b); },
  updateCertification(id, b) { return this.put('/certifications/' + id, b); },
  deleteCertification(id) { return this.req('/certifications/' + id, { method: 'DELETE' }); },
  uploadCertificationFile(id, file) {
    const fd = new FormData(); fd.append('file', file);
    return fetch('/api/certifications/' + id + '/file', { method: 'POST', credentials: 'include', body: fd })
      .then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'خطا در آپلود'); return d; });
  },

  // حسابرسی داخلی (چک‌لیست به‌عنوان ابزار بازرسی)
  audits(q) { return this.get(this.wy('/audits', q)); },
  audit(id) { return this.get('/audits/' + id); },
  createAudit(b) { return this.post('/audits', b); },
  updateAudit(id, b) { return this.put('/audits/' + id, b); },
  deleteAudit(id) { return this.req('/audits/' + id, { method: 'DELETE' }); },
  linkAuditSubmission(id, submission_id) { return this.post('/audits/' + id + '/submission', { submission_id }); },

  // رجیستری فرآیندها / فلوچارت فرآیند
  processes(q) { return this.get('/processes' + (q ? '?' + q : '')); },
  process(id) { return this.get('/processes/' + id); },
  processKpisCatalog(q) { return this.get('/processes/kpis-catalog' + (q ? '?q=' + encodeURIComponent(q) : '')); },
  createProcess(b) { return this.post('/processes', b); },
  updateProcess(id, b) { return this.put('/processes/' + id, b); },
  setProcessApproval(id, approve) { return this.post('/processes/' + id + '/approval', { approve }); },
  deleteProcess(id) { return this.req('/processes/' + id, { method: 'DELETE' }); },
  setProcessNotifyUsers(id, notify_user_ids) { return this.put('/processes/' + id + '/notify-users', { notify_user_ids }); },
  // تشخیص فلوچارت از فایل. برخلاف بقیه‌ی مسیرها، وقتی سرور «گامی پیدا نشد»
  // برمی‌گرداند متنِ خوانده‌شده را هم می‌فرستد؛ آن متن روی خطا سوار می‌شود تا
  // رابط کاربری بتواند نشانش دهد و کارِ کاربر زمین نماند.
  processExtractFlow(file) {
    const fd = new FormData(); fd.append('file', file);
    return fetch('/api/processes/extract-flowchart', { method: 'POST', credentials: 'include', body: fd })
      .then(async r => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { const e = new Error(d.error || 'خطا در تشخیص فلوچارت'); e.status = r.status; e.text = d.text; throw e; }
        return d;
      });
  },
  uploadProcessFile(id, file) {
    const fd = new FormData(); fd.append('file', file);
    return fetch('/api/processes/' + id + '/file', { method: 'POST', credentials: 'include', body: fd })
      .then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'خطا در آپلود'); return d; });
  },

  // بازدید میدانی مدیریتی (واکراند) + مصوبه‌ها
  walkarounds(q) { return this.get('/walkarounds' + (q ? '?' + q : '')); },
  walkaround(id) { return this.get('/walkarounds/' + id); },
  walkaroundSummary(q) { return this.get('/walkarounds/summary' + (q ? '?' + q : '')); },
  createWalkaround(b) { return this.post('/walkarounds', b); },
  updateWalkaround(id, b) { return this.put('/walkarounds/' + id, b); },
  deleteWalkaround(id) { return this.req('/walkarounds/' + id, { method: 'DELETE' }); },
  updateResolutionStatus(rid, status) { return this.put('/walkarounds/resolutions/' + rid, { status }); },

  // گزارش خطا/واقعه (با شاخهٔ تحلیل ریشه‌ای)
  medicalErrors(q) { return this.get(this.wy('/users/medical-errors/list', q)); },
  createMedicalError(b) { return this.post('/users/medical-errors', b); },
  updateMedicalError(id, b) { return this.put('/users/medical-errors/' + id, b); },

  // FMEA — عوامل تهدید کننده ایمنی بیمار
  fmeaList(q) { return this.get(this.wy('/fmea', q)); },
  fmea(id) { return this.get('/fmea/' + id); },
  createFmea(b) { return this.post('/fmea', b); },
  updateFmea(id, b) { return this.put('/fmea/' + id, b); },
  deleteFmea(id) { return this.req('/fmea/' + id, { method: 'DELETE' }); },

  // فعالیت‌ها و فرم‌ساز پویا (activity_types.form_schema)
  activityTypes() { return this.get('/activities/types'); },
  createActivityType(b) { return this.post('/activities/types', b); },
  updateActivityType(id, b) { return this.put('/activities/types/' + id, b); },
  activityRecords() { return this.get(this.wy('/activities/records')); },
  // تقویم: بازه‌ی یک ماه شمسی (year+month) — سال از پارامتر خودِ تقویم می‌آید نه S.year
  calendarEvents(year, month) { return this.get('/calendar/events?year=' + year + '&month=' + month); },
  reportsTrend(period, year, compareYear) {
    return this.get('/reports/trend?period=' + period + '&year=' + year + (compareYear ? '&compareYear=' + compareYear : ''));
  },
  activityRecord(id) { return this.get('/activities/records/' + id); },
  createActivityRecord(b) { return this.post('/activities/records', b); },

  // برنامه‌های بهبود/عملیاتی/استراتژیک — گردش‌کار «پیشنهاد → تأیید»
  programs(q) { return this.get('/programs' + (q ? '?' + q : '')); },
  program(id) { return this.get('/programs/' + id); },
  createProgram(b) { return this.post('/programs', b); },
  updateProgram(id, b) { return this.put('/programs/' + id, b); },
  approveProgram(id, decision_note) { return this.put('/programs/' + id + '/approve', { decision_note }); },
  rejectProgram(id, decision_note) { return this.put('/programs/' + id + '/reject', { decision_note }); },
  setProgramProgress(id, progress_percent) { return this.put('/programs/' + id + '/progress', { progress_percent }); },
  deleteProgram(id) { return this.req('/programs/' + id, { method: 'DELETE' }); },

  // نیازسنجی آموزشی — گردش‌کار سه‌مرحله‌ای «کاربر → مافوق → سازمان»
  trainingNeeds(q) { return this.get('/training-needs' + (q ? '?' + q : '')); },
  trainingNeed(id) { return this.get('/training-needs/' + id); },
  createTrainingNeed(b) { return this.post('/training-needs', b); },
  updateTrainingNeed(id, b) { return this.put('/training-needs/' + id, b); },
  superiorReviewTraining(id, b) { return this.put('/training-needs/' + id + '/superior-review', b); },
  finalDecideTraining(id, b) { return this.put('/training-needs/' + id + '/final-decision', b); },
  deleteTrainingNeed(id) { return this.req('/training-needs/' + id, { method: 'DELETE' }); },

  // کارت امتیازی متوازن (BSC) — ۴ وجه × ۱۲ ماه شمسی
  bsc(year) { return this.get('/bsc' + (year ? '?year=' + year : '')); },
  setBscValue(b) { return this.put('/bsc/values', b); },
  setBscIndicator(id, b) { return this.put('/bsc/indicators/' + id, b); },
  bscExportUrl(year) { return '/api/bsc/export.csv' + (year ? '?year=' + year : ''); },

  // ماژول شاخص — شناسنامه، داده‌ی دوره‌ای، روند و داشبورد
  indicators(q) { return this.get('/indicators' + (q ? '?' + q : '')); },
  indicatorsDashboard(year) { return this.get('/indicators/dashboard' + (year ? '?year=' + year : '')); },
  indicator(id, year) { return this.get('/indicators/' + id + (year ? '?year=' + year : '')); },
  createIndicator(b) { return this.post('/indicators', b); },
  updateIndicator(id, b) { return this.put('/indicators/' + id, b); },
  deleteIndicator(id) { return this.req('/indicators/' + id, { method: 'DELETE' }); },
  setIndicatorValue(id, b) { return this.put('/indicators/' + id + '/values', b); },
  approveIndicatorValue(id, b) { return this.post('/indicators/' + id + '/values/approve', b); },
  setIndicatorCollectors(id, ids) { return this.put('/indicators/' + id + '/collectors', { user_ids: ids }); },
  indicatorsExportUrl() { return '/api/indicators/export.csv'; },
  indicatorsCompare(q) { return this.get('/indicators/compare?' + q); },

  // چرخه‌ی عدم انطباق و اقدام اصلاحی روی سنجه
  correctiveActions(measureId) { return this.get('/accreditation/measures/' + measureId + '/corrective-actions'); },
  createCorrectiveAction(measureId, b) { return this.post('/accreditation/measures/' + measureId + '/corrective-actions', b); },
  updateCorrectiveAction(id, b) { return this.put('/corrective-actions/' + id, b); },
  transitionCorrectiveAction(id, status, note) { return this.post('/corrective-actions/' + id + '/transition', { status, note }); },
  correctiveActionHistory(id) { return this.get('/corrective-actions/' + id + '/history'); },

  // ساختار سازمانی — چهار جدول مرجع هم‌شکل
  orgStructure(all) { return this.get('/org-structure' + (all ? '?all=1' : '')); },
  createOrgItem(kind, b) { return this.post('/org-structure/' + kind, b); },
  updateOrgItem(kind, id, b) { return this.put('/org-structure/' + kind + '/' + id, b); },
  deleteOrgItem(kind, id) { return this.req('/org-structure/' + kind + '/' + id, { method: 'DELETE' }); },

  // سه حوزه‌ی کلان سازمانی — مدیریت/پرستاری/پشتیبانی
  orgDivisions() { return this.get('/org-divisions'); },
  setOrgDivisionHead(code, headUserId) { return this.put('/org-divisions/' + code, { head_user_id: headUserId }); },
  orgChartAdmins() { return this.get('/org-chart/admins'); },

  // زیرساختار حوزه‌ی مدیریت — پست‌های نام‌دار؛ برچسب/تعداد از پنل سوپرادمین، انتصاب از اینجا
  managementPositions() { return this.get('/management/positions'); },
  updateManagementPosition(id, b) { return this.put('/management/positions/' + id, b); },

  // پیش‌نمایش داشبورد یک نقش (فقط ادمین) — نشست موقت جدا از نشست واقعی
  previewStart(userId) { return this.post('/preview/start/' + userId, {}); },
  previewExit() { return this.post('/preview/exit', {}); },
  previewStatus() { return this.get('/preview/status'); },

  // زیرساختار حوزه‌ی پرستاری — سوپروایزرهای بالینی شماره‌دار + بخش‌ها (سرپرستار/جانشین)
  nursingHierarchy() { return this.get('/nursing/hierarchy'); },
  addNursingSupervisor(label) { return this.post('/nursing/supervisors', { label }); },
  updateNursingSupervisor(id, b) { return this.put('/nursing/supervisors/' + id, b); },
  deleteNursingSupervisor(id) { return this.req('/nursing/supervisors/' + id, { method: 'DELETE' }); },
  setNursingCrossCover(userId, b) { return this.put('/nursing/cross-cover/' + userId, b); },
  addNursingWard(b) { return this.post('/nursing/wards', b); },
  updateNursingWard(id, b) { return this.put('/nursing/wards/' + id, b); },
  deleteNursingWard(id) { return this.req('/nursing/wards/' + id, { method: 'DELETE' }); },
  nursingRoster() { return this.get('/nursing/roster'); },

  // داشبورد خودِ سرپرستار/جانشین بخش
  hnMyWards() { return this.get('/nursing/head/my-wards'); },
  hnRoster(wardId) { return this.get('/nursing/head/roster?ward_id=' + wardId); },
  hnSetDeputies(wardId, b) { return this.put('/nursing/head/wards/' + wardId + '/deputies', b); },
  hnGetPresence(wardId, date) { return this.get('/nursing/head/presence?ward_id=' + wardId + (date ? '&date=' + date : '')); },
  hnSetPresence(b) { return this.put('/nursing/head/presence', b); },
  hnGetAttendance(wardId, date) { return this.get('/nursing/head/attendance?ward_id=' + wardId + (date ? '&date=' + date : '')); },
  hnSetAttendance(b) { return this.put('/nursing/head/attendance', b); },
  hnLeaveSubmit(b) { return this.post('/nursing/leave-requests', b); },
  hnLeaveMine() { return this.get('/nursing/leave-requests/mine'); },
  hnLeaveReview(wardId) { return this.get('/nursing/head/leave-requests?ward_id=' + wardId); },
  hnLeaveDecide(id, b) { return this.put('/nursing/head/leave-requests/' + id, b); },
  hnShiftTasks(wardId, date) { return this.get('/nursing/head/shift-tasks?ward_id=' + wardId + (date ? '&date=' + date : '')); },
  hnSetShiftTask(b) { return this.put('/nursing/head/shift-tasks', b); },

  // پرسنل بخش و برنامه‌ی ماهانه‌ی شیفت (M/E/N/مرخصی) — src/routes/api.js بخش ShiftSchedule
  shiftStaffList(ward, includeInactive) {
    return this.get('/shift/staff?ward=' + encodeURIComponent(ward) + (includeInactive ? '&include_inactive=1' : ''));
  },
  shiftStaffAdd(b) { return this.post('/shift/staff', b); },
  shiftStaffUpdate(id, b) { return this.put('/shift/staff/' + id, b); },
  shiftStaffDelete(id) { return this.req('/shift/staff/' + id, { method: 'DELETE' }); },
  shiftSchedule(ward, year, month) {
    return this.get('/shift/schedule?ward=' + encodeURIComponent(ward) + '&year=' + year + '&month=' + month);
  },
  shiftSetNote(b) { return this.put('/shift/schedule/note', b); },
  shiftSetCell(b) { return this.put('/shift/schedule/cell', b); },
  shiftGetSettings(ward) { return this.get('/shift/settings?ward=' + encodeURIComponent(ward)); },
  shiftSetSettings(b) { return this.put('/shift/settings', b); },
  shiftSetCustomRows(b) { return this.put('/shift/schedule/custom-rows', b); },
  shiftUnits() { return this.get('/shift/units'); },
  shiftUnitAdd(b) { return this.post('/shift/units', b); },
  shiftUnitDelete(id) { return this.req('/shift/units/' + id, { method: 'DELETE' }); },
  shiftRegisterForm() { return this.post('/shift/register-form', {}); },
  shiftGetPrintConfig() { return this.get('/shift/print-config'); },
  shiftSetPrintConfig(b) { return this.put('/shift/print-config', b); },

  // حضورِ شیفتی و گزارشِ ۲۴ ساعته — src/routes/api.js بخش ShiftAttendance
  saContext() { return this.get('/shift/attendance/context'); },
  saRoster(date, shift, ward) {
    const q = [];
    if (date) q.push('date=' + date);
    if (shift) q.push('shift=' + shift);
    if (ward) q.push('ward=' + encodeURIComponent(ward));
    return this.get('/shift/attendance' + (q.length ? '?' + q.join('&') : ''));
  },
  saMark(b) { return this.put('/shift/attendance', b); },
  saLive() { return this.get('/shift/attendance/live'); },
  saReport(date, shift) { return this.get('/shift/report?date=' + date + '&shift=' + shift); },
  saReportSave(b) { return this.put('/shift/report', b); },
  saReportList(p) {
    const q = [];
    if (p && p.status) q.push('status=' + encodeURIComponent(p.status));
    if (p && p.from) q.push('from=' + p.from);
    if (p && p.to) q.push('to=' + p.to);
    return this.get('/shift/reports' + (q.length ? '?' + q.join('&') : ''));
  },
  saReportReview(id, b) { return this.put('/shift/reports/' + id + '/review', b); },

  // نتایج نظرسنجی رضایت بیمار — جدول + میانگین محورها برای مدیر بهبود کیفیت
  satisfactionResults(from, to) {
    const q = []; if (from) q.push('from=' + from); if (to) q.push('to=' + to);
    return this.get('/satisfaction/results' + (q.length ? '?' + q.join('&') : ''));
  },

  // پروفایل بیمارستان (ویزارد راه‌اندازی اولیه)
  // بانک دانش دانا — گردش تأیید پاسخهای دستیار (مالکان مدارک)
  knowledgeList(status) { return this.get('/assistant/knowledge' + (status ? '?status=' + encodeURIComponent(status) : '')); },
  knowledgeApprove(id) { return this.post('/assistant/knowledge/' + encodeURIComponent(id) + '/approve', {}); },
  knowledgeReject(id) { return this.post('/assistant/knowledge/' + encodeURIComponent(id) + '/reject', {}); },
  knowledgeDelete(id) { return this.req('/assistant/knowledge/' + encodeURIComponent(id), { method: 'DELETE' }); },
  // اسلایدهای شاخص‌های جامع بیمارستان (۱۴۰۴-۱۴۰۵)
  indicatorSlides(params) {
    const q = new URLSearchParams(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== '')).toString();
    return this.get('/indicator-slides' + (q ? '?' + q : ''));
  },
  indicatorSlide(slideNumber) { return this.get('/indicator-slides/' + slideNumber); },
  updateIndicatorSlideValues(slideNumber, b) { return this.put('/indicator-slides/' + slideNumber + '/values', b); },
  indicatorSlidesExcelUrl() { return '/api/indicator-slides/export/excel'; },
  hospitalProfile() { return this.get('/hospital/profile'); },
  saveHospitalProfile(b) { return this.put('/hospital/profile', b); },
};
