const fs = require('fs');
const path = require('path');

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'full_76_slides_extracted_clean.json'), 'utf8'));

// Section definitions
function getSection(slideNum) {
  if (slideNum >= 1 && slideNum <= 18) return { id: 'hospital_macro', title: 'شاخص‌های کلان بیمارستان و اورژانس', icon: '🏥' };
  if (slideNum >= 19 && slideNum <= 40) return { id: 'surgical_maternity', title: 'اعمال جراحی، بلوک زایمان و پاراکلینیک', icon: '🩺' };
  if (slideNum >= 41 && slideNum <= 56) return { id: 'nursing_office', title: 'شاخص‌های عملکردی دفتر پرستاری', icon: '👩‍⚕️' };
  if (slideNum >= 57 && slideNum <= 60) return { id: 'patient_safety', title: 'شاخص‌های رعایت ایمنی بیمار', icon: '🛡️' };
  if (slideNum >= 61 && slideNum <= 69) return { id: 'infection_control', title: 'شاخص‌های عملکردی کنترل عفونت', icon: '🦠' };
  if (slideNum >= 70 && slideNum <= 73) return { id: 'patient_education', title: 'آموزش به بیمار و ایمنی همراه', icon: '📖' };
  return { id: 'staff_education', title: 'شاخص‌های آموزش و توانمندسازی کارکنان', icon: '🎓' };
}

const months = ['فروردین', 'اردیبهشت', 'خرداد', 'سه ماهه اول', 'تیر', 'مرداد', 'شهریور', 'سه ماهه دوم', 'مهر', 'آبان', 'آذر', 'سه ماهه سوم', 'دی', 'بهمن', 'اسفند', 'سه ماهه چهارم', 'کل سال'];

const enriched = raw.map(s => {
  const sNum = s.slide_num;
  const sec = getSection(sNum);
  
  let unit = 'تعداد';
  let chartType = s.chart_type || 'bar';
  
  if (s.title.includes('درصد') || s.title.includes('نرخ') || s.title.includes('میزان') || s.title.includes('میانگین')) {
    unit = 'درصد (%)';
    chartType = 'percentage';
  } else if (s.title.includes('پروسیجر')) {
    unit = 'پروسیجر';
  } else if (s.title.includes('مراجعین') || s.title.includes('شرکت کنندگان')) {
    unit = 'نفر';
  } else if (s.title.includes('دلایل') || s.title.includes('علل') || s.title.includes('تفكيك') || s.title.includes('گروه')) {
    unit = 'تعداد / سهم';
    chartType = 'breakdown';
  } else if (s.table_rows.length === 0) {
    chartType = sNum === 1 ? 'cover_main' : (sNum === 76 ? 'closing' : (sNum === 68 ? 'corrective' : 'cover_section'));
    unit = '';
  }

  // Parse table rows into clean headers and 2D row array
  let headers = ['دوره / سرفصل', 'عملکرد ۱۴۰۴', 'هدف / عملکرد ۱۴۰۵'];
  let rows = [];
  
  if (s.table_rows.length > 0) {
    // Check if table rows have multiple indicator columns or standard 1404/1405
    const sampleRow = s.table_rows[0];
    const valKeys = Object.keys(sampleRow.values || {});
    
    // Find keys with 1404 and 1405
    const key1404 = valKeys.find(k => k.includes('1404')) || valKeys[0];
    const key1405 = valKeys.find(k => k.includes('1405')) || valKeys[1];
    
    s.table_rows.forEach(r => {
      const label = r.label || '';
      if (!label.trim()) return;
      
      let rawVal1404 = r.values[key1404];
      let rawVal1405 = key1405 ? r.values[key1405] : null;
      
      let num1404 = null;
      if (rawVal1404 !== undefined && rawVal1404 !== null && rawVal1404 !== '') {
        const parsed = parseFloat(rawVal1404);
        if (!isNaN(parsed)) {
          // If unit is percent and parsed < 1, e.g. 0.04 -> 4%
          if (unit.includes('درصد') && parsed > 0 && parsed <= 1) {
            num1404 = Math.round(parsed * 1000) / 10;
          } else {
            num1404 = Math.round(parsed * 100) / 100;
          }
        }
      }

      let num1405 = null;
      if (rawVal1405 !== undefined && rawVal1405 !== null && rawVal1405 !== '') {
        const parsed = parseFloat(rawVal1405);
        if (!isNaN(parsed)) {
          if (unit.includes('درصد') && parsed > 0 && parsed <= 1) {
            num1405 = Math.round(parsed * 1000) / 10;
          } else {
            num1405 = Math.round(parsed * 100) / 100;
          }
        }
      }

      rows.push([
        label,
        num1404 !== null ? String(num1404) : '',
        num1405 !== null ? String(num1405) : ''
      ]);
    });
  }

  // Corrective action notes
  let correctiveAction = '';
  if (sNum === 68) {
    correctiveAction = 'هدف: کاهش ۰.۲٪ موارد مواجهات شغلی کارکنان\n۱- آموزش گروهی و چهره‌به‌چهره چگونگی جمع‌آوری اجسام تیز و برنده و تزریقات ایمن\n۲- ارزیابی و نظارت مستمر کارکنان توسط مسئولین و سوپروایزران براساس چک‌لیست تزریقات ایمن';
  } else if (sNum === 23) {
    correctiveAction = 'پایش و پیگیری علل کنسلی اعمال جراحی: هماهنگی آزمایشگاه جهت تسریع در آماده‌سازی خون درخواستی، مدیریت رزرو اتاق عمل و مدیریت تخت‌های بستری.';
  } else if (sNum === 16 || sNum === 17) {
    correctiveAction = 'مشاوره مددکاری اجتماعی و ارجاع بیماران نیازمند به امور مالی بیمارستان و خیریه سلامت جهت کاهش ترک با مسئولیت شخصی ناشی از بار مالی.';
  } else if (sNum === 52 || sNum === 53) {
    correctiveAction = 'پروتکل استاندارد پیشگیری از زخم فشاری (برادن): تغییر پوزیشن هر ۲ ساعت، استفاده از تشک مواج و ارزیابی روزانه پوست توسط سرپرستار بخش.';
  } else if (sNum === 73) {
    correctiveAction = 'ارزیابی ریسک سقوط مورس در بدو بستری، بالا بودن حفاظ تخت (سایدریل)، کمک‌رسانی در جابجایی بیماران مسن و کم‌توان.';
  }

  // Analysis / leadership summary note
  let analysisNote = '';
  if (s.title.includes('پذیرش')) {
    analysisNote = 'روند افزایشی مراجعین و اشغال تخت با اوج مراجعین در اردیبهشت، دی و بهمن ماه؛ نشان‌دهنده اعتماد بیماران و بهره‌وری مناسب بخش‌ها.';
  } else if (s.title.includes('اعزام') || s.title.includes('ارجاع')) {
    analysisNote = 'نرخ پایین اعزام و ارجاع (کمتر از ۳.۳٪ کل مراجعین) بیانگر توانمندی و جامعیت خدمات تخصصی در داخل بیمارستان امید است.';
  } else if (s.title.includes('اورژانس')) {
    analysisNote = 'بخش اورژانس با پذیرش ۳,۹۶۴ بیمار به عنوان خط اول درمانی، زمان پاسخگویی سریع و مراقبت اثربخش را تأمین کرده است.';
  } else if (s.title.includes('جراحی')) {
    analysisNote = 'تنوع بالای اعمال جراحی شامل ارتوپدی، جراحی عمومی، زنان، ارولوژی و ENT با کمترین درصد کنسلی (زیر ۲٪).';
  } else if (s.title.includes('زایمان')) {
    analysisNote = 'ترویج زایمان طبیعی با سهم ۵۶.۴٪ در راستای استانداردهای اعتباربخشی بیمارستان دوستدار مادر و کودک.';
  } else if (s.title.includes('بهداشت دست') || s.title.includes('عفونت')) {
    analysisNote = 'کنترل سختگیرانه عفونت‌های بیمارستانی با پایش ماهانه مصرف هندراب و رعایت پروتکل‌های پنج لحظه بهداشت دست سازمان جهانی بهداشت.';
  } else if (s.title.includes('CPR') || s.title.includes('احیا')) {
    analysisNote = 'میزان احیای موفق بالای ۳۶.۵٪ نشان‌دهنده آمادگی بالای تیم کد ۹۹ و مهارت در مراقبت‌های ویژه پیشرفته است.';
  }

  return {
    slide_number: sNum,
    section_id: sec.id,
    section_title: sec.title,
    section_icon: sec.icon,
    title: s.title,
    slide_text: (s.slide_texts || []).join(' | '),
    chart_type: chartType,
    unit: unit,
    headers: headers,
    rows: rows,
    corrective_actions: correctiveAction,
    analysis_note: analysisNote
  };
});

fs.writeFileSync(path.join(__dirname, 'enriched_indicators_76.json'), JSON.stringify(enriched, null, 2), 'utf8');
console.log(`Successfully generated enriched dataset for ${enriched.length} slides.`);
