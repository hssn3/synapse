/**
 * Quality 8-Step Strategic Plan Wizard
 * Modular Frontend Component — Project 313
 */
// ==================== ویزارد ۸ مرحله‌ای تدوین برنامه استراتژیک (مطابق تصویر ۳۳) ====================
let STRAT_WIZARD = {
  step: 1,
  data: {
    mission: 'ارائه خدمات درمانی ایمن، باکیفیت و بیمارمحور با اتکا به دانش روز پزشکی، رعایت اخلاق حرفه‌ای و کرامت انسانی.',
    vision: 'تبدیل شدن به مرکز درمانی پیشرو و الگوی کشوری در کیفیت خدمات، ایمنی بیمار و رضایتمندی مراجعین تا سال ۱۴۰۸.',
    values: 'بیمارمحوری، پاسخگویی و شفافیت، کار تیمی، کرامت انسانی، تعهد به ایمنی و عدالت در سلامت.',
    macro_goals: '۱. ارتقای ایمنی بیمار و به حداقل رساندن وقایع ناخواسته درمانی\n۲. بهبود مستمر کیفیت خدمات بالینی و پاراکلینیکی\n۳. ارتقای رضایت گیرندگان خدمت و کرامت بیماران\n۴. توانمندسازی و ارتقای انگیزه و مهارت‌های منابع انسانی\n۵. انضباط مالی، بهینه‌سازی مصرف منابع و اقتصاد مقاومتی',
    stakeholders: [
      { name: 'بیماران و خانواده‌ها', needs: 'درمان ایمن، تکریم، کاهش زمان انتظار و هزینه‌های شفاف', power: 'بالا', interest: 'بسیار بالا' },
      { name: 'پزشکان و کادر پرستاری', needs: 'امنیت شغلی، تجهیزات به‌روز، انگیزش و آموزش مداوم', power: 'بالا', interest: 'بالا' },
      { name: 'وزارت بهداشت و دانشگاه', needs: 'رعایت استانداردهای اعتباربخشی و قوانین بالادستی', power: 'بسیار بالا', interest: 'بالا' },
      { name: 'شرکت‌های بیمه‌گر', needs: 'انضباط در ارسال اسناد، رعایت پروتکل‌ها و تعادل مالی', power: 'متوسط', interest: 'بالا' }
    ],
    swot: {
      strengths: 'کادر تخصصی مجرب و متعهد؛ وجود بخش‌های ویژه مجهز (ICU, CCU)؛ اعتباربخشی درجه یک؛ استقرار پرونده الکترونیک سلامت.',
      weaknesses: 'فرسودگی بخشی از تجهیزات قدیمی؛ تراکم بالای مراجعین در بخش اورژانس؛ کمبود نیروی پرستاری در شیفت‌های عصر و شب.',
      opportunities: 'رشد تقاضای خدمات سرپایی و تشخیصی؛ امکان جلب مشارکت خیرین سلامت؛ اجرای برنامه‌های تحول دیجیتال سلامت.',
      threats: 'تورم و افزایش قیمت ملزومات مصرفی و داروها؛ تأخیر بیمه‌ها در پرداخت مطالبات بیمارستان؛ نوسانات تعرفه‌های درمانی.'
    },
    ife_score: '2.78',
    efe_score: '2.65',
    ie_quadrant: 'حفظ و نگهداری (محافظه‌کارانه/رشد انتخابی)',
    strategies: [
      { code: 'SO-1', title: 'توسعه کلینیک‌های فوق تخصصی با اتکا به پزشکان برجسته مرکز', priority: 'بالا' },
      { code: 'WO-1', title: 'نوسازی ناوگان تجهیزات پزشکی حساس از طریق اعتبارات دانشگاهی و خیرین', priority: 'خیلی بالا' },
      { code: 'ST-1', title: 'مدیریت بهینه زنجیره تأمین ملزومات و کاهش هدررفت جهت مقابله با تورم', priority: 'بالا' },
      { code: 'WT-1', title: 'بازطراحی فرآیند تریاژ و پذیرش اورژانس جهت کاهش زمان انتظار', priority: 'خیلی بالا' }
    ]
  }
};

function openStrategicWizardModal(){
  const saved = localStorage.getItem('strat_wizard_data_' + (S.hospitalId||'default'));
  if(saved) { try { STRAT_WIZARD.data = JSON.parse(saved); } catch(e){} }
  STRAT_WIZARD.step = 1;
  renderStrategicWizardContent();
}

function renderStrategicWizardContent(){
  const cur = STRAT_WIZARD.step;
  const d = STRAT_WIZARD.data;
  const steps = [
    { num: 1, title: 'اطلاعات اولیه' },
    { num: 2, title: 'تحلیل ذینفعان' },
    { num: 3, title: 'تحلیل ماتریس SWOT' },
    { num: 4, title: 'ارزیابی عوامل داخلی IFE' },
    { num: 5, title: 'ارزیابی عوامل خارجی EFE' },
    { num: 6, title: 'ماتریس داخلی و خارجی IE' },
    { num: 7, title: 'تدوین استراتژی‌ها' },
    { num: 8, title: 'اولویت‌بندی استراتژی‌ها' }
  ];

  let bodyHtml = '';
  if(cur === 1){
    bodyHtml = `
      <div style="font-size:12.5px;color:var(--td);margin-bottom:14px">رسالت، چشم‌انداز، ارزش‌های محوری و اهداف کلان راهبردی بیمارستان را در این مرحله ثبت نمایید:</div>
      <div class="fg"><label>رسالت (Mission) بیمارستان *</label><textarea id="sw_mission" rows="3">${esc(d.mission)}</textarea></div>
      <div class="fg"><label>چشم‌انداز (Vision) افق ۵ ساله *</label><textarea id="sw_vision" rows="3">${esc(d.vision)}</textarea></div>
      <div class="fg"><label>ارزش‌های محوری (Core Values)</label><textarea id="sw_values" rows="2">${esc(d.values)}</textarea></div>
      <div class="fg"><label>اهداف کلان (Macro Goals)</label><textarea id="sw_macro_goals" rows="4">${esc(d.macro_goals)}</textarea></div>
    `;
  } else if(cur === 2){
    bodyHtml = `
      <div style="font-size:12.5px;color:var(--td);margin-bottom:14px">شناسایی گروه‌های ذینفع، انتظارات و ماتریس قدرت-علاقه (Mendelow Matrix):</div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>گروه ذینفع</th><th>انتظارات و نیازهای کلیدی</th><th>سطح قدرت</th><th>سطح منفعت</th></tr></thead>
        <tbody>${d.stakeholders.map(s=>`<tr>
          <td style="font-weight:700;color:var(--th)">${esc(s.name)}</td>
          <td>${esc(s.needs)}</td>
          <td><span class="bdg b1">${esc(s.power)}</span></td>
          <td><span class="bdg b2">${esc(s.interest)}</span></td>
        </tr>`).join('')}</tbody>
      </table></div>
    `;
  } else if(cur === 3){
    bodyHtml = `
      <div style="font-size:12.5px;color:var(--td);margin-bottom:14px">تحلیل چهارگانه نقاط قوت، نقاط ضعف، فرصت‌ها و تهدیدها (ماتریس SWOT):</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div style="background:rgba(16,185,129,0.08);border:1.5px solid #10b981;border-radius:10px;padding:12px">
          <h4 style="margin:0 0 8px 0;color:#065f46">💪 نقاط قوت (Strengths)</h4>
          <textarea id="sw_strengths" rows="5" style="width:100%;font-size:12px">${esc(d.swot.strengths)}</textarea>
        </div>
        <div style="background:rgba(239,68,68,0.08);border:1.5px solid #ef4444;border-radius:10px;padding:12px">
          <h4 style="margin:0 0 8px 0;color:#991b1b">⚠️ نقاط ضعف (Weaknesses)</h4>
          <textarea id="sw_weaknesses" rows="5" style="width:100%;font-size:12px">${esc(d.swot.weaknesses)}</textarea>
        </div>
        <div style="background:rgba(59,130,246,0.08);border:1.5px solid #3b82f6;border-radius:10px;padding:12px">
          <h4 style="margin:0 0 8px 0;color:#1e40af">🌟 فرصت‌ها (Opportunities)</h4>
          <textarea id="sw_opportunities" rows="5" style="width:100%;font-size:12px">${esc(d.swot.opportunities)}</textarea>
        </div>
        <div style="background:rgba(245,158,11,0.08);border:1.5px solid #f59e0b;border-radius:10px;padding:12px">
          <h4 style="margin:0 0 8px 0;color:#92400e">⚡ تهدیدها (Threats)</h4>
          <textarea id="sw_threats" rows="5" style="width:100%;font-size:12px">${esc(d.swot.threats)}</textarea>
        </div>
      </div>
    `;
  } else if(cur === 4){
    bodyHtml = `
      <div style="font-size:12.5px;color:var(--td);margin-bottom:14px">ماتریس ارزیابی عوامل داخلی (Internal Factor Evaluation - IFE):</div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>عامل داخلی</th><th>نوع</th><th>ضریب اهمیت (۰ تا ۱)</th><th>رتبه (۱ تا ۴)</th><th>نمره نهایی</th></tr></thead>
        <tbody>
          <tr><td>کادر تخصصی مجرب و بخش‌های فعال ویژه</td><td>قوت</td><td>۰.۲۵</td><td>۴</td><td>۱.۰۰</td></tr>
          <tr><td>استقرار پرونده الکترونیک و سامانه HIS</td><td>قوت</td><td>۰.۱۵</td><td>۳</td><td>۰.۴۵</td></tr>
          <tr><td>تراکم مراجعین و زمان انتظار اورژانس</td><td>ضعف</td><td>۰.۳۰</td><td>۱</td><td>۰.۳۰</td></tr>
          <tr><td>فرسودگی تجهیزات پزشکی اتاق عمل</td><td>ضعف</td><td>۰.۳۰</td><td>۲</td><td>۰.۶۰</td></tr>
          <tr style="font-weight:800;background:var(--bg-card,#f1f5f9)"><td colspan="2">مجموع نمره وزنی عوامل داخلی (IFE Score):</td><td>۱.۰۰</td><td>—</td><td style="color:var(--pri,#2563eb);font-size:14px">۲.۳۵ از ۴.۰۰</td></tr>
        </tbody>
      </table></div>
    `;
  } else if(cur === 5){
    bodyHtml = `
      <div style="font-size:12.5px;color:var(--td);margin-bottom:14px">ماتریس ارزیابی عوامل خارجی (External Factor Evaluation - EFE):</div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>عامل خارجی</th><th>نوع</th><th>ضریب اهمیت</th><th>رتبه (۱ تا ۴)</th><th>نمره نهایی</th></tr></thead>
        <tbody>
          <tr><td>رشد تقاضای خدمات سرپایی و تشخیصی تخصصی</td><td>فرصت</td><td>۰.۲۵</td><td>۳</td><td>۰.۷۵</td></tr>
          <tr><td>حمایت خیرین سلامت در نوسازی بخش‌ها</td><td>فرصت</td><td>۰.۲۰</td><td>۳</td><td>۰.۶۰</td></tr>
          <tr><td>تأخیر سازمان‌های بیمه‌گر در پرداخت مطالبات</td><td>تهدید</td><td>۰.۳۰</td><td>۲</td><td>۰.۶۰</td></tr>
          <tr><td>تورم و افزایش قیمت تجهیزات و داروها</td><td>تهدید</td><td>۰.۲۵</td><td>۲</td><td>۰.۵۰</td></tr>
          <tr style="font-weight:800;background:var(--bg-card,#f1f5f9)"><td colspan="2">مجموع نمره وزنی عوامل خارجی (EFE Score):</td><td>۱.۰۰</td><td>—</td><td style="color:var(--pri,#2563eb);font-size:14px">۲.۴۵ از ۴.۰۰</td></tr>
        </tbody>
      </table></div>
    `;
  } else if(cur === 6){
    bodyHtml = `
      <div style="font-size:12.5px;color:var(--td);margin-bottom:14px">ماتریس داخلی و خارجی (Internal-External Matrix - IE):</div>
      <div style="background:var(--bg-card,#f8fafc);border:1.5px solid var(--bdr,#cbd5e1);border-radius:12px;padding:20px;text-align:center">
        <div style="font-size:15px;font-weight:800;color:var(--pri,#2563eb);margin-bottom:10px">
          موقعیت راهبردی بیمارستان بر اساس تلاقی IFE (۲.۳۵) و EFE (۲.۴۵):
        </div>
        <div style="display:inline-block;padding:12px 28px;background:rgba(59,130,246,0.12);border:2px solid #3b82f6;border-radius:12px;font-weight:800;font-size:16px;color:#1e40af">
          منطقه حفظ و نگهداری (Hold & Maintain - خانه V)
        </div>
        <div style="margin-top:12px;font-size:12.5px;color:var(--td,#64748b);line-height:1.7;max-width:600px;margin-inline:auto">
          در این وضعیت، استراتژی‌های رسوخ در بازار و توسعه خدمت و بهینه‌سازی فرآیندهای داخلی بدون هزینه‌تراشی سنگین، بهترین رویکرد برای هدایت سازمان بیمارستانی است.
        </div>
      </div>
    `;
  } else if(cur === 7){
    bodyHtml = `
      <div style="font-size:12.5px;color:var(--td);margin-bottom:14px">استراتژی‌های استخراج‌شده بر اساس ماتریس TOWS/SWOT:</div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>کد استراتژی</th><th>عنوان و شرح راهبرد</th><th>اولویت اولیه</th></tr></thead>
        <tbody>${d.strategies.map(st=>`<tr>
          <td style="font-family:monospace;font-weight:700;color:var(--gdl,#2563eb)">${esc(st.code)}</td>
          <td style="font-weight:700;color:var(--th,#0f172a)">${esc(st.title)}</td>
          <td><span class="bdg ${st.priority==='خیلی بالا'?'b3':'b1'}">${esc(st.priority)}</span></td>
        </tr>`).join('')}</tbody>
      </table></div>
    `;
  } else if(cur === 8){
    bodyHtml = `
      <div style="font-size:12.5px;color:var(--td);margin-bottom:14px">اولویت‌بندی استراتژی‌ها با ماتریس برنامه‌ریزی استراتژیک کمی (QSPM Matrix):</div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>رتبه</th><th>کد</th><th>عنوان استراتژی منتخب</th><th>نمره جذابیت کل (TAS)</th><th>وضعیت تصویب</th></tr></thead>
        <tbody>
          <tr><td>۱</td><td style="font-family:monospace;font-weight:700;color:var(--gdl)">WO-1</td><td style="font-weight:700">نوسازی ناوگان تجهیزات پزشکی حساس از طریق اعتبارات دانشگاهی و خیرین</td><td><b>۵.۴۰</b></td><td><span class="bdg b1">مصوب هیئت رئیسه</span></td></tr>
          <tr><td>۲</td><td style="font-family:monospace;font-weight:700;color:var(--gdl)">WT-1</td><td style="font-weight:700">بازطراحی فرآیند تریاژ و پذیرش اورژانس جهت کاهش زمان انتظار</td><td><b>۵.۱۵</b></td><td><span class="bdg b1">مصوب هیئت رئیسه</span></td></tr>
          <tr><td>۳</td><td style="font-family:monospace;font-weight:700;color:var(--gdl)">SO-1</td><td style="font-weight:700">توسعه کلینیک‌های فوق تخصصی با اتکا به پزشکان برجسته مرکز</td><td><b>۴.۸۰</b></td><td><span class="bdg b1">در حال ابلاغ</span></td></tr>
          <tr><td>۴</td><td style="font-family:monospace;font-weight:700;color:var(--gdl)">ST-1</td><td style="font-weight:700">مدیریت بهینه زنجیره تأمین ملزومات و کاهش هدررفت جهت مقابله با تورم</td><td><b>۴.۴۵</b></td><td><span class="bdg b2">در دست بررسی</span></td></tr>
        </tbody>
      </table></div>
    `;
  }

  const modalHtml = `
  <div id="stratModalWrap" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)">
    <div style="background:var(--bg-panel,#ffffff);border-radius:18px;box-shadow:0 20px 40px rgba(0,0,0,0.25);width:100%;max-width:980px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;border:1.5px solid var(--bdr,#cbd5e1)">
      
      <!-- هدر ویزارد -->
      <div style="padding:16px 22px;border-bottom:1.5px solid var(--bdr,#e2e8f0);display:flex;align-items:center;justify-content:space-between;background:var(--bg-card,#f8fafc)">
        <div>
          <h3 style="margin:0;font-size:16px;color:var(--th,#0f172a);display:flex;align-items:center;gap:8px">
            <span>🎯</span> ویزارد تدوین برنامه استراتژیک بیمارستان
          </h3>
          <div style="font-size:11.5px;color:var(--td,#64748b);margin-top:2px">الگوی ۸ مرحله‌ای استاندارد تدوین و اولویت‌بندی سند راهبردی</div>
        </div>
        <button class="btn btn-o btn-sm" onclick="closeStrategicWizardModal()" style="border-radius:8px">✕ بستن</button>
      </div>

      <!-- استپر مراحل ۸ گانه -->
      <div style="display:flex;overflow-x:auto;padding:10px 16px;background:var(--bg-card,#f1f5f9);border-bottom:1px solid var(--bdr,#cbd5e1);gap:6px">
        ${steps.map(s=>`
          <button style="padding:6px 10px;border-radius:8px;border:1px solid ${s.num===cur?'var(--pri,#2563eb)':'var(--bdr,#cbd5e1)'};background:${s.num===cur?'var(--pri,#2563eb)':'var(--bg-panel,#ffffff)'};color:${s.num===cur?'#ffffff':'var(--th,#0f172a)'};font-size:11.5px;font-weight:700;white-space:nowrap;cursor:pointer;display:flex;align-items:center;gap:5px"
                  onclick="setStrategicWizardStep(${s.num})">
            <span style="display:inline-block;width:18px;height:18px;line-height:18px;text-align:center;border-radius:50%;background:${s.num===cur?'rgba(255,255,255,0.3)':'rgba(0,0,0,0.06)'};font-size:10px">${fa(s.num)}</span>
            <span>${esc(s.title)}</span>
          </button>
        `).join('')}
      </div>

      <!-- بدنه محتوا -->
      <div style="padding:22px;overflow-y:auto;flex:1">
        ${bodyHtml}
      </div>

      <!-- فوتر و دکمه‌های ناوبری -->
      <div style="padding:14px 22px;border-top:1.5px solid var(--bdr,#e2e8f0);display:flex;align-items:center;justify-content:space-between;background:var(--bg-card,#f8fafc)">
        <div>
          ${cur>1?`<button class="btn btn-o btn-sm" onclick="setStrategicWizardStep(${cur-1})">◂ مرحله قبلی</button>`:''}
        </div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-o btn-sm" onclick="saveStrategicWizardData(false)">💾 ذخیره پیش‌نویس</button>
          ${cur<8?`<button class="btn btn-g btn-sm" onclick="setStrategicWizardStep(${cur+1})">مرحله بعدی ▸</button>`:`<button class="btn btn-g btn-sm" onclick="saveStrategicWizardData(true)">✓ تصویب و اتمام ویزارد</button>`}
        </div>
      </div>

    </div>
  </div>`;

  let wrap = $('stratModalWrap');
  if(wrap) wrap.outerHTML = modalHtml;
  else document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function setStrategicWizardStep(step){
  saveStrategicWizardCurrentStepInputs();
  STRAT_WIZARD.step = Math.max(1, Math.min(8, step));
  renderStrategicWizardContent();
}

function saveStrategicWizardCurrentStepInputs(){
  const cur = STRAT_WIZARD.step;
  const d = STRAT_WIZARD.data;
  if(cur === 1){
    if($('sw_mission')) d.mission = $('sw_mission').value;
    if($('sw_vision')) d.vision = $('sw_vision').value;
    if($('sw_values')) d.values = $('sw_values').value;
    if($('sw_macro_goals')) d.macro_goals = $('sw_macro_goals').value;
  } else if(cur === 3){
    if($('sw_strengths')) d.swot.strengths = $('sw_strengths').value;
    if($('sw_weaknesses')) d.swot.weaknesses = $('sw_weaknesses').value;
    if($('sw_opportunities')) d.swot.opportunities = $('sw_opportunities').value;
    if($('sw_threats')) d.swot.threats = $('sw_threats').value;
  }
}

function saveStrategicWizardData(finalize){
  saveStrategicWizardCurrentStepInputs();
  localStorage.setItem('strat_wizard_data_' + (S.hospitalId||'default'), JSON.stringify(STRAT_WIZARD.data));
  if(finalize){
    toast('برنامه استراتژیک ۸ مرحله‌ای با موفقیت تصویب و ذخیره شد');
    closeStrategicWizardModal();
    renderPrograms();
  } else {
    toast('اطلاعات پیش‌نویس ذخیره شد');
  }
}

function closeStrategicWizardModal(){
  const el = $('stratModalWrap');
  if(el) el.remove();
}

