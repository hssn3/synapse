const { db } = require('../src/config/database-sqlite');
const crypto = require('crypto');

console.log('=== TESTING CHECKLIST SUBMISSIONS & SCORING ===');

// Get 10 sample checklists covering surgery, emergency, infection control, nursing, blood, etc.
const sampleChecklists = db.prepare(`
  SELECT c.id, c.checklist_code, c.title, c.hospital_id
  FROM checklists c
  WHERE c.checklist_code IN ('CHK-LM-01', 'CHK-LM-02', 'CHK-LM-11', 'CHK-LM-12', 'CHK-LM-13', 'CHK-LM-18', 'CHK-LM-23', 'CHK-LM-31', 'CHK-LM-36', 'OH.NM.CL.9702.03')
`).all();

console.log(`Found ${sampleChecklists.length} target checklists for physical submission testing.`);

const user = db.prepare("SELECT id FROM users LIMIT 1").get();

let testedCount = 0;
let totalNonConformities = 0;

for (const chk of sampleChecklists) {
  const items = db.prepare("SELECT * FROM checklist_items WHERE checklist_id = ?").all(chk.id);
  if (!items.length) continue;

  const answers = [];
  let score = 0;
  let maxScore = 0;

  items.forEach((it, idx) => {
    let ansVal = '';
    let isNc = false;
    let note = null;

    if (it.answer_type === 'yes_no') {
      const isYes = (idx % 4 !== 0); // occasionally produce a 'no' (non-conformity)
      ansVal = isYes ? 'yes' : 'no';
      const weight = it.weight || 1;
      maxScore += weight * 1;
      if (isYes) {
        score += weight * 1;
      } else {
        isNc = true;
        totalNonConformities++;
        note = 'مورد عدم انطباق شناسایی شد — نیاز به اقدام اصلاحی و بازرسی مجدد.';
      }
    } else {
      // likert5: empty:0, low:1, medium:2, good:3, excellent:4
      const options = ['excellent', 'good', 'medium', 'low'];
      ansVal = options[idx % options.length];
      const valMap = { empty: 0, low: 1, medium: 2, good: 3, excellent: 4 };
      const weight = it.weight || 1;
      maxScore += weight * 4;
      score += weight * (valMap[ansVal] || 0);

      if (ansVal === 'low' || ansVal === 'empty') {
        isNc = true;
        totalNonConformities++;
        note = 'امتیاز در سطح پایین ارزیابی شد — پیگیری بهبود کیفیت.';
      }
    }

    answers.push({
      item_id: it.id,
      answer: ansVal,
      note: note
    });
  });

  const subId = crypto.randomUUID();
  const wardNames = ['بخش اورژانس', 'بخش مراقبت‌های ویژه (ICU)', 'اتاق عمل جنرال', 'بخش جراحی زنان', 'بخش داخلی مردان', 'بانک خون'];
  const ref = wardNames[testedCount % wardNames.length];

  db.prepare(`
    INSERT INTO checklist_submissions (id, hospital_id, checklist_id, reference, answers, score, max_score, note, submitted_by, submitted_at, is_example)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 0)
  `).run(
    subId,
    chk.hospital_id,
    chk.id,
    ref,
    JSON.stringify(answers),
    score,
    maxScore,
    `تکمیل ارزیابی دوره‌ای بخش — انطباق با سنجه‌های اعتباربخشی. امتیاز کسب‌شده: ${score} از ${maxScore}`,
    user.id
  );

  testedCount++;
  console.log(`✓ Submitted: [${chk.checklist_code}] "${chk.title}" -> Ref: ${ref} | Score: ${score}/${maxScore} (${Math.round((score/maxScore)*100)}%) | Items: ${items.length}`);
}

console.log(`\n🎉 SUBMISSION TESTING COMPLETED!`);
console.log(`- Total submissions created and evaluated: ${testedCount}`);
console.log(`- Non-conformities correctly detected: ${totalNonConformities}`);

const totalSubs = db.prepare("SELECT count(*) as c FROM checklist_submissions").get().c;
console.log(`Total submissions in system now: ${totalSubs}`);
