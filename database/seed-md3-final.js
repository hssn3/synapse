'use strict';
// سری سوم (بخش 001-010) — فقط اقلام جدید؛ تکراری‌ها با کنترل وجود رد می‌شوند.
const { db } = require('../src/config/database-sqlite');
const crypto = require('crypto');

const DEMO = 'dd43b5de-bd17-4245-8dbf-246de3db401d';
const uid = () => crypto.randomUUID();

const DRUGS = [
["آکاربوز","Acarbose","قرص 100mg","",{},"","دیابت؛ پایش قند"],
["آمیودارون","Amiodarone","آمپول 150mg/3ml؛ قرص 200mg","",{ha:1,lasa:1},"","قلبی/ضدآریتمی؛ احتیاط نارسایی کلیه/کبد"],
["ایمونوگلوبولین آنتی‌دی","Anti-D Immunoglobulin","سرنگ 300mcg/2ml","",{ref:1},"نگهداری ۲–۸ درجه","پیشگیری Rh"],
["آسپیرین جویدنی","Aspirin Chewable","قرص 100mg","",{},"","ضدانعقاد/قلبی (حیاتی)؛ هشدار خونریزی"],
["بتامتازون","Betamethasone","آمپول 1ml","",{ref:1},"یخچال ۲–۸ درجه","ضدالتهاب استروئیدی"],
["آلپرازولام","Alprazolam","قرص","",{},"","(فارماکوپه ۱۴۰۳)"],
["آمانتادین","Amantadine","قرص","",{},"","(فارماکوپه ۱۴۰۳)"],
["بوسپیرون","Buspirone","قرص","",{},"","(فارماکوپه ۱۴۰۳)"],
["کابرگولین","Cabergoline","قرص 0.5/1mg","",{},"","(فارماکوپه ۱۴۰۳)"],
["اس‌سیتالوپرام","Escitalopram","قرص 20mg","",{},"","(فارماکوپه ۱۴۰۳)"],
["ازومپرازول","Esomeprazole","کپسول 40mg","",{},"","(فارماکوپه ۱۴۰۳)"],
["فلوکونازول","Fluconazole","کپسول 150mg","",{},"","(فارماکوپه ۱۴۰۳)"],
["گلی‌کلازید","Gliclazide","قرص 80mg/SR30/SR60","",{},"","(فارماکوپه ۱۴۰۳)"],
["رزوواستاتین","Rosuvastatin","قرص 5/10/20mg","",{},"","(فارماکوپه ۱۴۰۳)"],
["والپروات","Valproate","قرص 500mg","",{},"","(فارماکوپه ۱۴۰۳)"],
["اندانسترون","Ondansetron","آمپول 4mg","",{},"","(فارماکوپه ۱۴۰۳)"],
["سفوتاکسیم","Cefotaxime","ویال 500mg/1g/2g","",{lasa:1},"","(فارماکوپه ۱۴۰۳)؛ مشابه‌سمی سفتی‌زوکسیم"],
["سیپروفلوکساسین","Ciprofloxacin","قرص 250mg","",{},"","(فارماکوپه ۱۴۰۳)"],
["کلوپیدوگرل ۷۵","Clopidogrel","قرص 75mg","",{ha:1,lasa:1},"","ضدپلاکت نگهدارنده"],
["سیناریزین","Cinnarizine","قرص 75mg","",{},"","(فارماکوپه ۱۴۰۳)"],
["استامینوفن (آپوتل)","Acetaminophen","آمپول","",{lasa:1},"","تب/درد؛ مسمومیت کبدی در اوردوز"],
["هالوپریدول","Haloperidol","آمپول","",{ha:1},"","روانپزشکی/ضدتهوع"],
["فنوباربیتال","Phenobarbital","آمپول","",{ha:1},"","ضدتشنج"],
["لووفلوکساسین","Levofloxacin","آمپول","",{},"","آنتی‌بیوتیک"],
["تازوسین ۴.۵","Piperacillin-Tazobactam","آمپول 4.5g","",{},"","آنتی‌بیوتیک وسیع"],
["وانکومایسین","Vancomycin","آمپول","",{ha:1},"","آنتی‌بیوتیک"],
["ایمی‌پنم","Imipenem","آمپول","",{},"","آنتی‌بیوتیک"],
["لوزارتان","Losartan","قرص","",{lasa:1},"","فشارخون؛ پایش دوره‌ای"],
["نوراپی‌نفرین","Norepinephrine","آمپول","",{ha:1,ref:1},"یخچال ۲–۸ درجه","وازوپرسور"],
["هپارین","Heparin","آمپول","",{ha:1,ref:1},"یخچال ۲–۸ درجه","ضدانعقاد"],
["دیگوکسین","Digoxin","آمپول","",{ha:1,lasa:1},"","قلبی"],
["ماده حاجب رادیولوژی","Contrast Media","تزریقی","",{},"","دوز بر اساس سن/وزن؛ چک حساسیت و اوره/کراتینین"],
];

const DOCS = [
["notice","بخشنامه راهکار پیشگیری اشتباه دارویی","658/58321","صدور ۱۴۰۳/۰۶/۱۸","سازمان غذا و دارو","بخشنامه",1,"approved"],
["notice","بخشنامه راهکار پیشگیری اشتباه دارویی (انسولین)","658/58319","","سازمان غذا و دارو","بخشنامه",1,"approved"],
["notice","بخشنامه تزریق اشتباه دارو","658/89516","","سازمان غذا و دارو","بخشنامه",1,"approved"],
["form","فرم توزیع داروهای سقط‌جنین (۳ اندیکاسیون)","MD3-AB-01","امضای متخصص زنان + پذیرش","داروخانه","فرم",1,"approved"],
["form","فرم خام آمار مصرف مخدر بخش","MD3-NAR-01","موجودی/مصرفی/مانده/پوکه/نسخه","بخش‌ها","فرم",1,"approved"],
["notice","ابلاغ کد ۱۲۵","125","","بیمارستان","ابلاغ",1,"approved"],
["form","فرم ارزیابی روزانه استوک/یخچالی بخش","MD3-ST-01","ردیف/نام/انقضا/تعداد شنبه تا جمعه + آنتی‌دوت","بخش‌ها","فرم",1,"approved"],
["policy","خط‌مشی مهار شیمیایی ۱۴۰۳","MD3-POL-01","","بخش‌ها","خط‌مشی",1,"approved"],
["policy","جراحی ایمن ۱۴۰۳","MD3-POL-02","","اتاق عمل","خط‌مشی",1,"approved"],
["policy","امنیت داده و سطوح دسترسی","MD3-POL-03","","فناوری اطلاعات","خط‌مشی",1,"approved"],
["policy","اختصارات مجاز پرونده","MD3-POL-04","","مدارک پزشکی","خط‌مشی",1,"approved"],
["policy","ناشتایی جراحی الکتیو ۱۴۰۳","MD3-POL-05","","اتاق عمل","خط‌مشی",1,"approved"],
["procedure","برنامه 247-1404 مدیریت سکته قلبی","MD3-PRG-01","","قلب","برنامه",1,"approved"],
["license","پروانه بهره‌برداری (تا ۱۴۰۴)","MD3-LIC-01","","بیمارستان","پروانه",1,"approved"],
["license","پروانه اعتباربخشی","MD3-LIC-02","","بیمارستان","پروانه",1,"approved"],
["procedure","انتصاب کارگروه آموزش به بیمار (سنجه ب-1-10-2)","MD3-AP-01","از ۱۴۰۴/۰۱/۰۱","آموزش","ابلاغ",1,"approved"],
];

const KPIS = [
["MD3-KPI-01","رعایت 7R در راند سوپروایزری",85,"برنامه عملیاتی ۱۴۰۳"],
["MD3-KPI-02","آگاهی از لیست پرخطر/حیاتی/آنتی‌دوت",85,"برنامه عملیاتی ۱۴۰۳"],
["MD3-KPI-03","نظارت بر اجرای دستورالعمل (چک‌لیست)",80,"برنامه عملیاتی ۱۴۰۳"],
["MD3-KPI-04","امتیاز چک‌لیست دارودهی/کاردکس",70,"زیر ۷۰ = اقدام اصلاحی الزامی"],
];

const KNOWLEDGE = [
["شیوه مصرف بینی/گوش/واژینال/تنفسی/خوراکی/موضعی/چشمی","ضدسرفه ۱۵ دقیقه بدون مایعات؛ روانپزشکی: قطع تدریجی و پرهیز الکل؛ ضدانعقاد و ضدتشنج طبق دستور؛ ایمنی عمومی دارو (بروشور، تداخل، بارداری، انقضا)."],
["ماده حاجب رادیولوژی","دوز بر اساس سن/وزن؛ چک حساسیت دارویی و اوره/کراتینین قبل تزریق؛ آموزش بیمار."],
["پیشگیری ترومبوآمبولی بارداری (VTE)","دوز پروفیلاکسی از ابتدای بارداری (امتیاز ≥۴) یا هفته ۲۸ (امتیاز ۳)؛ سابقه VTE با مشاوره هماتولوژی؛ خطر خونریزی."],
["ثبت پرستاری و کاردکس","نام/دوز/راه/زمان/واکنش؛ ممنوعیت اختصار؛ امضای دو پرستار برای تلفنی/پرخطر/خون؛ DC/Hold/Change قرمز."],
["ایمنی عمومی دارو در منزل","بروشورخوانی، عدم قطع خودسرانه، لیست همراه، جعبه تفکیک، علائم تداخل (خون‌مردگی، راش، تب، خستگی)."],
];

const CHECKLISTS = [
["فرم ارزیابی روزانه استوک/یخچالی/تجهیزات بخش","MD3-CL-01"],
["فرم خام مخدر بخش","MD3-CL-02"],
["پرسشنامه ارزیابی بیمار (روانی/حافظه/خواب/دیابت)","MD3-CL-03"],
["ISBAR تحویل بیمار","MD3-CL-04"],
["تریاژ ESI نسخه ۵","MD3-CL-05"],
["امتیاز ICU","MD3-CL-06"],
];

const TRAININGS = [
["توانمندسازی رابطین آموزش به بیمار ۱۴۰۴","آموزش","1404"],
["دوره هموویژلانس پرستاری و پزشکی","پرستاری","1403"],
["صلاحیت حرفه‌ای سرپرستار و سوپروایزر","پرستاری","1403"],
["مجوز کار با اشعه","پرتودرمانی","1403"],
];

const COMMITTEES = [
["کمیته دارو و درمان (DTC/DUE)","pharmacy","ماهانه"],
["کارگروه‌های ۱/۲/۳ اعتباربخشی","accreditation","ماهانه"],
["کمیته هموویژلانس","blood","فصلی"],
];

function runMigration() {
  const existing = new Set(db.prepare('SELECT generic_name FROM drug_formulary WHERE hospital_id=?').all(DEMO).map(r => r.generic_name));
  const ins = db.prepare(`INSERT INTO drug_formulary
    (id, hospital_id, generic_name, brand_name, local_code, dosage_form, strength,
     is_vital, is_essential, is_high_alert, is_lasa, is_refrigerated, is_narcotic, is_cytotoxic,
     storage_note, note, is_active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`);
  let n = 0;
  DRUGS.forEach((d, i) => {
    if (existing.has(d[0])) return;
    existing.add(d[0]);
    try { ins.run(uid(), DEMO, d[0], d[1], 'MD3-' + String(i + 1).padStart(3, '0'), d[2], d[3], 0, 0, d[4].ha ? 1 : 0, d[4].lasa ? 1 : 0, d[4].ref ? 1 : 0, d[4].nar ? 1 : 0, d[4].cyto ? 1 : 0, d[5] || null, d[6] || null); n++; } catch (e) {}
  });
  console.log(`[Seed MD3-Formulary] ${n} جدید`);

  const docIns = db.prepare(`INSERT INTO controlled_documents
    (id, hospital_id, doc_type, title, doc_code, scope, work_method, version_no, status)
    SELECT ?,?,?,?,?,?,?,?,? WHERE NOT EXISTS
    (SELECT 1 FROM controlled_documents WHERE hospital_id=? AND doc_code=?)`);
  let nd = 0;
  for (const d of DOCS) { if (docIns.run(uid(), DEMO, d[0], d[1], d[2], d[4], d[5], d[6], d[7], DEMO, d[2]).changes) nd++; }
  console.log(`[Seed MD3-Docs] ${nd} مدرک`);

  let nkp = 0;
  for (const k of KPIS) {
    if (!db.prepare('SELECT id FROM hospital_kpis WHERE hospital_id=? AND code=?').get(DEMO, k[0])) {
      db.prepare(`INSERT INTO hospital_kpis (id, hospital_id, code, title, target_value, definition, is_active) VALUES (?,?,?,?,?,?,1)`).run(uid(), DEMO, k[0], k[1], k[2], k[3]);
      nkp++;
    }
  }
  console.log(`[Seed MD3-KPIs] ${nkp} شاخص`);

  const kIns = db.prepare(`INSERT INTO assistant_knowledge (id, hospital_id, title, content, source_type, status)
    SELECT ?,?,?,?,'manual','confirmed' WHERE NOT EXISTS (SELECT 1 FROM assistant_knowledge WHERE hospital_id=? AND title=?)`);
  let nk = 0;
  for (const k of KNOWLEDGE) { if (kIns.run(uid(), DEMO, k[0], k[1], DEMO, k[0]).changes) nk++; }
  console.log(`[Seed MD3-Knowledge] ${nk} دانش`);

  const cIns = db.prepare(`INSERT INTO checklists (id, hospital_id, title, checklist_code, status)
    SELECT ?,?,?,?,'active' WHERE NOT EXISTS (SELECT 1 FROM checklists WHERE hospital_id=? AND title=?)`);
  let nc = 0;
  for (const c of CHECKLISTS) { if (cIns.run(uid(), DEMO, c[0], c[1], DEMO, c[0]).changes) nc++; }
  console.log(`[Seed MD3-Checklists] ${nc} چک‌لیست`);

  let ntr = 0;
  for (const t of TRAININGS) {
    if (!db.prepare('SELECT id FROM training_needs WHERE hospital_id=? AND title=?').get(DEMO, t[0])) {
      db.prepare(`INSERT INTO training_needs (id, hospital_id, title, department, year) VALUES (?,?,?,?,?)`).run(uid(), DEMO, t[0], t[1], t[2]);
      ntr++;
    }
  }
  console.log(`[Seed MD3-Training] ${ntr} نیاز`);

  let ncm = 0;
  for (const c of COMMITTEES) {
    if (!db.prepare('SELECT id FROM committees WHERE hospital_id=? AND name=?').get(DEMO, c[0])) {
      db.prepare(`INSERT INTO committees (id, hospital_id, name, committee_type, meeting_frequency) VALUES (?,?,?,?,?)`).run(uid(), DEMO, c[0], c[1], c[2]);
      ncm++;
    }
  }
  console.log(`[Seed MD3-Committees] ${ncm} کمیته`);
}

if (require.main === module) { runMigration(); process.exit(0); }
module.exports = { runMigration };
