const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const Database = require('better-sqlite3');
const jalali = require('../src/config/jalali');

// Generate Jalali timestamp
const j = jalali.todayJalali();
const now = new Date();
const pad = n => String(n).padStart(2, '0');
const iranHour = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tehran', hour: '2-digit', hour12: false }).format(now);
const iranMin = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tehran', minute: '2-digit' }).format(now);

const folderName = `hospital-accreditation-platform-${j.jy}-${pad(j.jm)}-${pad(j.jd)}_${iranHour}-${iranMin}`;
const projectDir = path.resolve(__dirname, '..');

// Check for Google Drive mount
const candidateDrives = [
  'G:\\My Drive',
  'G:\\درایو من',
  'G:\\',
  'H:\\My Drive',
  'H:\\',
  path.join(process.env.USERPROFILE || '', 'Google Drive')
];

let gdriveTarget = null;
for (const cand of candidateDrives) {
  if (fs.existsSync(cand)) {
    gdriveTarget = cand;
    break;
  }
}

// Ensure Google Drive sync is never paused locally
try {
  const pausedFile = path.join(process.env.USERPROFILE || 'C:\\Users\\NvDAdmin', 'AppData\\Local\\Google\\DriveFS\\user-paused');
  if (fs.existsSync(pausedFile)) {
    fs.unlinkSync(pausedFile);
  }
} catch (e) {}

// Target folder: "آنتی گراویتی" on Google Drive
const backupBaseDir = gdriveTarget
  ? path.join(gdriveTarget, 'آنتی گراویتی')
  : path.join(process.env.USERPROFILE || 'C:\\Users\\NvDAdmin', 'Desktop', 'آنتی گراویتی');

fs.mkdirSync(backupBaseDir, { recursive: true });

// Apply Antigravity icon to backupBaseDir via desktop.ini
try {
  const exePath = 'C:\\Users\\NvDAdmin\\AppData\\Local\\Programs\\Antigravity IDE\\Antigravity IDE.exe';
  const iniPath = path.join(backupBaseDir, 'desktop.ini');
  const iniContent = `[.ShellClassInfo]\r\nIconResource=${exePath},0\r\nInfoTip=آنتی گراویتی - مخزن رسمی پشتیبان، چت‌ها و ادامه کار پروژه\r\n[ViewState]\r\nMode=\r\nVid=\r\nFolderType=Generic\r\n`;
  fs.writeFileSync(iniPath, iniContent, 'latin1');
  execSync(`attrib +h +s "${iniPath}" && attrib +r "${backupBaseDir}"`);
} catch (e) {}

const targetZip = path.join(backupBaseDir, `${folderName}.zip`);

// Staging directory in OS temp to ensure Desktop is never cluttered
const stageDir = path.join(os.tmpdir(), folderName);

console.log(`[Archive] Preparing backup: ${folderName}`);
console.log(`[Archive] Source: ${projectDir}`);
console.log(`[Archive] Destination Folder: ${backupBaseDir}`);
console.log(`[Archive] Destination Zip: ${targetZip}`);

if (fs.existsSync(stageDir)) fs.rmSync(stageDir, { recursive: true, force: true });
fs.mkdirSync(stageDir, { recursive: true });

try {
  // 1. Copy codebase to staging folder excluding node_modules, .git, and active hospital.db
  const psCopy = `
$src = '${projectDir.replace(/'/g, "''")}';
$dst = '${stageDir.replace(/'/g, "''")}';
& robocopy $src $dst /E /XD node_modules .git /XF *.zip "hospital.db*" | Out-Null
if ($LASTEXITCODE -ge 8) { exit $LASTEXITCODE } else { exit 0 }
`;

  const tempPs1 = path.join(os.tmpdir(), `temp-copy-${Date.now()}.ps1`);
  fs.writeFileSync(tempPs1, psCopy, 'utf8');
  try {
    execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${tempPs1}"`, { stdio: 'inherit' });
  } finally {
    if (fs.existsSync(tempPs1)) fs.unlinkSync(tempPs1);
  }

  // 2. Safely snapshot database using SQLite VACUUM INTO into staging
  const dbSource = path.join(projectDir, 'database', 'hospital.db');
  const dbTarget = path.join(stageDir, 'database', 'hospital.db');
  if (fs.existsSync(dbSource)) {
    fs.mkdirSync(path.join(stageDir, 'database'), { recursive: true });
    console.log('[Archive] Snapshotting database with VACUUM INTO...');
    try {
      const db = new Database(dbSource, { readonly: true });
      db.exec(`VACUUM INTO '${dbTarget.replace(/'/g, "''")}'`);
      db.close();
      console.log('[Archive] Database snapshotted successfully.');
    } catch (e) {
      console.warn('[Archive] VACUUM INTO fallback to copy:', e.message);
      fs.copyFileSync(dbSource, dbTarget);
    }
  }

  // 3. Compress staging folder into temp zip then copy to avoid PowerShell codepage issues with Persian paths
  console.log('[Archive] Compressing to zip archive...');
  const tempZip = path.join(os.tmpdir(), `temp-zip-${Date.now()}.zip`);
  const psZip = `
$src = '${stageDir.replace(/'/g, "''")}';
$dest = '${tempZip.replace(/'/g, "''")}';
Compress-Archive -Path "$src\\*" -DestinationPath $dest -Force
`;
  const tempPs2 = path.join(os.tmpdir(), `temp-ps-zip-${Date.now()}.ps1`);
  fs.writeFileSync(tempPs2, psZip, 'utf8');

  try {
    execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${tempPs2}"`, { stdio: 'inherit' });
    if (fs.existsSync(tempZip)) {
      fs.copyFileSync(tempZip, targetZip);
      fs.unlinkSync(tempZip);
      const size = (fs.statSync(targetZip).size / (1024 * 1024)).toFixed(2);
      console.log(`[Archive] ✅ Backup zip created: ${targetZip} (${size} MB)`);
    }
  } finally {
    if (fs.existsSync(tempPs2)) fs.unlinkSync(tempPs2);
  }

  // 4. Also update chat transcript & handover in "آنتی گراویتی"
  try {
    const convId = 'b34a2da4-7bff-45a0-9ce9-29df4a1620d7';
    const transcriptPath = path.join(process.env.USERPROFILE || 'C:\\Users\\NvDAdmin', `.gemini/antigravity-ide/brain/${convId}/.system_generated/logs/transcript.jsonl`);
    if (fs.existsSync(transcriptPath)) {
      const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(Boolean);
      let chatMarkdown = `# مشروح کامل گفتگوها و اقدامات آنتی گراویتی (جلسه کاری)\n\n`;
      chatMarkdown += `> **شناسه گفتگو (Conversation ID):** \`${convId}\`\n`;
      chatMarkdown += `> **آخرین بروزرسانی:** ${new Date().toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })}\n\n---\n\n`;
      let stepNum = 1;
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.type === 'USER_INPUT') {
            chatMarkdown += `### 👤 کاربر (مرحله ${stepNum++}):\n\n${entry.content || ''}\n\n---\n\n`;
          } else if (entry.type === 'PLANNER_RESPONSE') {
            const text = entry.content || '';
            if (text.trim()) {
              chatMarkdown += `### 🤖 آنتی گراویتی (پاسخ):\n\n${text}\n\n---\n\n`;
            }
          }
        } catch (e) {}
      }
      fs.writeFileSync(path.join(backupBaseDir, 'مشروح_کامل_چت_ها_و_دستورات.md'), chatMarkdown, 'utf8');
      console.log('[Archive] 💬 بروزرسانی مشروح چت‌ها در گوگل درایو انجام شد.');
    }
  } catch (e) {
    console.warn('[Archive] خطا در همگام‌سازی مشروح چت‌ها:', e.message);
  }

  if (gdriveTarget) {
    console.log(`[Archive] ☁️ Saved directly to Google Drive ("آنتی گراویتی"). Desktop is clean!`);
  } else {
    console.log(`[Archive] 💾 Saved to Desktop.`);
  }

} finally {
  if (fs.existsSync(stageDir)) {
    fs.rmSync(stageDir, { recursive: true, force: true });
  }
}
