// src/services/unified-copilot.js
// ادغام assistant-context.js و copilot.js به یک سرویس واحد با ۳ پرسونا

const { query, db } = require('../config/database-sqlite');
const { uuid } = require('../utils/db');
const { tehranNow } = require('../config/jalali');

// ===== سه پرسونای یکپارچه =====
const PERSONAS = {
  guide: {
    id: 'guide',
    name: 'راهنما',
    icon: '🧭',
    systemPrompt: `تو یک راهنمای اعتباربخشی بیمارستانی هستی. وظیفه‌ات راهنمایی گام‌به‌گام مدیران و کارکنان بیمارستان است.
- توضیحات ساده و عملی بده
- گام‌های اجرایی مشخص پیشنهاد کن
- منابع و الگوهای آماده معرفی کن
- از اصطلاحات پیچیده پرهیز کن
همیشه فارسی پاسخ بده.`,
    temperature: 0.7,
    priority: 1
  },
  
  auditor: {
    id: 'auditor',
    name: 'ممیز',
    icon: '🔍',
    systemPrompt: `تو یک ممیز حرفه‌ای اعتباربخشی هستی. وظیفه‌ات بررسی دقیق و انتقادی وضعیت است.
- نقاط ضعف و خطرها را شناسایی کن
- الزامات استاندارد را یادآوری کن
- عدم انطباقات محتمل را هشدار بده
- شواهد و مستندات لازم را مشخص کن
لحن حرفه‌ای و دقیق داشته باش. همیشه فارسی پاسخ بده.`,
    temperature: 0.3,
    priority: 2
  },
  
  strategist: {
    id: 'strategist',
    name: 'مشاور استراتژیک',
    icon: '💡',
    systemPrompt: `تو یک مشاور ارشد استراتژی کیفیت بیمارستانی هستی. وظیفه‌ات کمک به تصمیم‌گیری بلندمدت است.
- دید کلان و اولویت‌بندی ارائه کن
- تأثیر بلندمدت اقدامات را تحلیل کن
- راهکارهای هوشمند و خلاقانه پیشنهاد بده
- ارتباط بین محورها و سنجه‌ها را نشان بده
لحن مشاوره‌ای و تحلیلی داشته باش. همیشه فارسی پاسخ بده.`,
    temperature: 0.8,
    priority: 3
  }
};

/**
 * شروع گفت‌وگو با انتخاب پرسونا
 */
function startConversation(hospitalId, userId, persona = 'guide', context = {}) {
  const conversationId = uuid();
  const now = tehranNow().toISOString().slice(0, 19).replace('T', ' ');
  
  if (!PERSONAS[persona]) {
    throw new Error(`Invalid persona: ${persona}`);
  }

  db.prepare(`
    INSERT INTO copilot_sessions (id, hospital_id, user_id, persona, context_snapshot, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(conversationId, hospitalId, userId, persona, JSON.stringify(context), now);

  return {
    conversation_id: conversationId,
    persona: PERSONAS[persona],
    greeting: getPersonaGreeting(persona, context)
  };
}

/**
 * پیام خوش‌آمد هر پرسونا
 */
function getPersonaGreeting(persona, context) {
  const greetings = {
    guide: `سلام! من «راهنما» هستم 🧭\nچطور می‌تونم کمکتون کنم؟ سوالی درباره اعتباربخشی، محورها یا سنجه‌ها دارید؟`,
    auditor: `سلام. من «ممیز» هستم 🔍\nآماده‌ام تا وضعیت اعتباربخشی را با دقت بررسی کنم. چه موردی را بررسی کنیم؟`,
    strategist: `سلام! من «مشاور استراتژیک» هستم 💡\nبیایید با هم نگاه کلان به آمادگی اعتباربخشی‌تون بیندازیم. از کجا شروع کنیم؟`
  };
  
  return greetings[persona] || greetings.guide;
}

/**
 * ارسال پیام و دریافت پاسخ از LLM
 */
async function sendMessage(conversationId, message, aiProvider) {
  // بارگذاری session
  const session = db.prepare(`
    SELECT * FROM copilot_sessions WHERE id = ?
  `).get(conversationId);

  if (!session) {
    throw new Error('Session not found');
  }

  const persona = PERSONAS[session.persona];
  const now = tehranNow().toISOString().slice(0, 19).replace('T', ' ');

  // ذخیره پیام کاربر
  const userMsgId = uuid();
  db.prepare(`
    INSERT INTO copilot_messages (id, session_id, role, content, created_at)
    VALUES (?, ?, 'user', ?, ?)
  `).run(userMsgId, conversationId, message, now);

  // بارگذاری تاریخچه
  const history = db.prepare(`
    SELECT role, content FROM copilot_messages 
    WHERE session_id = ? 
    ORDER BY created_at ASC
  `).all(conversationId);

  // ساخت context از knowledge base
  const knowledgeContext = await buildKnowledgeContext(session.hospital_id, message);

  // فراخوانی LLM
  const messages = [
    { role: 'system', content: persona.systemPrompt },
    { role: 'system', content: `زمینه: ${knowledgeContext}` },
    ...history.map(h => ({ role: h.role, content: h.content }))
  ];

  const response = await aiProvider.generateText({
    messages,
    temperature: persona.temperature,
    maxTokens: 1000
  });

  // ذخیره پاسخ
  const assistantMsgId = uuid();
  db.prepare(`
    INSERT INTO copilot_messages (id, session_id, role, content, created_at)
    VALUES (?, ?, 'assistant', ?, ?)
  `).run(assistantMsgId, conversationId, response, now);

  return {
    message: response,
    persona: persona,
    sources: extractSources(knowledgeContext)
  };
}

/**
 * ساخت context از knowledge base
 */
async function buildKnowledgeContext(hospitalId, query) {
  // جستجوی semantic در assistant_knowledge
  const relevantKnowledge = db.prepare(`
    SELECT title, content, source_type, source_id 
    FROM assistant_knowledge 
    WHERE hospital_id = ? AND status = 'approved'
    ORDER BY created_at DESC 
    LIMIT 5
  `).all(hospitalId);

  if (relevantKnowledge.length === 0) {
    return 'اطلاعات پایه از کتاب اعتباربخشی و سنجه‌های استاندارد در دسترس است.';
  }

  const contextParts = relevantKnowledge.map(k => 
    `[${k.source_type}] ${k.title}: ${k.content.slice(0, 500)}`
  );

  return contextParts.join('\n\n');
}

/**
 * استخراج منابع از context
 */
function extractSources(context) {
  const sourcePattern = /\[([^\]]+)\]/g;
  const sources = [];
  let match;
  
  while ((match = sourcePattern.exec(context)) !== null) {
    sources.push(match[1]);
  }
  
  return [...new Set(sources)];
}

/**
 * تعویض پرسونا در همان session
 */
function switchPersona(conversationId, newPersona) {
  if (!PERSONAS[newPersona]) {
    throw new Error(`Invalid persona: ${newPersona}`);
  }

  db.prepare(`
    UPDATE copilot_sessions 
    SET persona = ?, updated_at = ? 
    WHERE id = ?
  `).run(newPersona, tehranNow().toISOString().slice(0, 19).replace('T', ' '), conversationId);

  return {
    persona: PERSONAS[newPersona],
    message: getPersonaGreeting(newPersona, {})
  };
}

/**
 * لیست گفت‌وگوهای کاربر
 */
function listConversations(hospitalId, userId, limit = 20) {
  return db.prepare(`
    SELECT 
      cs.id, 
      cs.persona, 
      cs.created_at,
      (SELECT content FROM copilot_messages 
       WHERE session_id = cs.id AND role = 'user' 
       ORDER BY created_at ASC LIMIT 1) as first_message,
      (SELECT COUNT(*) FROM copilot_messages 
       WHERE session_id = cs.id) as message_count
    FROM copilot_sessions cs
    WHERE cs.hospital_id = ? AND cs.user_id = ?
    ORDER BY cs.created_at DESC
    LIMIT ?
  `).all(hospitalId, userId, limit);
}

/**
 * تاریخچه یک گفت‌وگو
 */
function getConversationHistory(conversationId, userId) {
  const session = db.prepare(`
    SELECT * FROM copilot_sessions 
    WHERE id = ? AND user_id = ?
  `).get(conversationId, userId);

  if (!session) {
    throw new Error('Session not found or unauthorized');
  }

  const messages = db.prepare(`
    SELECT id, role, content, created_at 
    FROM copilot_messages 
    WHERE session_id = ? 
    ORDER BY created_at ASC
  `).all(conversationId);

  return {
    session: {
      id: session.id,
      persona: PERSONAS[session.persona],
      created_at: session.created_at
    },
    messages
  };
}

/**
 * پاک‌کردن گفت‌وگو
 */
function deleteConversation(conversationId, userId) {
  const session = db.prepare(`
    SELECT id FROM copilot_sessions 
    WHERE id = ? AND user_id = ?
  `).get(conversationId, userId);

  if (!session) {
    throw new Error('Session not found or unauthorized');
  }

  // پاک‌کردن پیام‌ها
  db.prepare(`DELETE FROM copilot_messages WHERE session_id = ?`).run(conversationId);
  
  // پاک‌کردن session
  db.prepare(`DELETE FROM copilot_sessions WHERE id = ?`).run(conversationId);

  return { success: true };
}

/**
 * آمار استفاده از copilot
 */
function getCopilotStats(hospitalId) {
  const stats = db.prepare(`
    SELECT 
      persona,
      COUNT(DISTINCT id) as session_count,
      (SELECT COUNT(*) FROM copilot_messages cm 
       WHERE cm.session_id IN (SELECT id FROM copilot_sessions WHERE hospital_id = ? AND persona = cs.persona)
      ) as message_count
    FROM copilot_sessions cs
    WHERE hospital_id = ?
    GROUP BY persona
  `).all(hospitalId, hospitalId);

  return stats;
}

module.exports = {
  PERSONAS,
  startConversation,
  sendMessage,
  switchPersona,
  listConversations,
  getConversationHistory,
  deleteConversation,
  getCopilotStats
};
