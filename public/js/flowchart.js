/* =====================================================================
   رسم فلوچارت فرآیند — SVG با چیدمان لایه‌ای
   ---------------------------------------------------------------------
   چرا SVG و نه تصویر: برگه باید روی A4 چاپ شود و روی دیوار برود
   («نصب فرآیند مذکور … در معرض دید گیرندگان خدمت» — ب-۱۰-۱-۳ و ج-۲-۳-۱).
   SVG در هر اندازه‌ای تیز چاپ می‌شود و متن فارسی‌اش قابل انتخاب می‌ماند.

   نمادهای استاندارد:
     بیضی            شروع / پایان
     مستطیل           اقدام
     لوزی             تصمیم
     متوازی‌الاضلاع    سند / فرم

   مدل داده: یک **گراف جهت‌دار** است، نه ستون فقرات.
   هر گام می‌تواند چند یال خروجی با برچسب دلخواه داشته باشد (بله/خیر/سایر/…)،
   می‌تواند به گامِ عقب‌تر برگردد (حلقه)، و می‌تواند از چند جا ورودی بگیرد.
   نسخه‌ی اولِ این فایل فقط یک ستونِ خطی با یک شاخه‌ی «خیر» را می‌شناخت که برای
   فلوچارت‌های واقعیِ بیمارستانی کافی نبود.

   چیدمان (خلاصه‌ی الگوریتم):
     ۱. ریشه‌ها را پیدا کن (گامِ «شروع»، وگرنه گامِ بدون ورودی)
     ۲. با DFS یال‌های بازگشتی (حلقه) را علامت بزن و کنار بگذار تا گراف بدون
        دور شود — وگرنه رتبه‌بندی هرگز تمام نمی‌شود
     ۳. رتبه‌ی هر گام = بلندترین مسیر از ریشه (مرتب‌سازی توپولوژیک)
     ۴. ترتیب افقی داخل هر رتبه با میانگینِ جای والدها (کاهش تقاطع)
     ۵. یال‌ها: مستقیم اگر هم‌ستون‌اند، وگرنه آرنجی؛ یال بازگشتی از کنارِ
        نمودار دور می‌زند تا روی شکل‌ها نیفتد
   ===================================================================== */
(function (global) {
  'use strict';

  // اندازه‌ها عمداً جمع‌وجورند: کارفرما گزارش داد «سایز آیکون‌ها خیلی بزرگ است و
  // چند صفحه می‌شود». یک فلوچارتِ ۹ گامی باید روی *یک* برگه‌ی A4 بنشیند، وگرنه
  // نه روی دیوار جمع‌وجور است نه در جلسه قابل ارائه.
  var W = 186;            // عرض شکل
  var COL_GAP = 30;       // فاصله‌ی افقی بین ستون‌ها
  var GAP = 28;           // فاصله‌ی عمودی بین رتبه‌ها
  var PAD = 16;
  var LANE = 30;          // عرض راهروی کناری برای یال‌های بازگشتی
  var LH = 13;            // ارتفاع خط متن
  var H = { start: 38, end: 38, action: 44, document: 44, decision: 66 };

  var TYPE_FA = {
    start: 'شروع', action: 'اقدام', decision: 'تصمیم', document: 'سند / فرم', end: 'پایان',
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // شکستن متن فارسی. عمداً سقفِ خط ندارد و متن را نمی‌بُرد: این برگه روی دیوار
  // می‌رود و گامِ نصفه‌کاره بدتر از گامِ بلند است — شکل بلندتر می‌شود (boxH).
  function wrap(text, maxChars) {
    var words = String(text || '').trim().split(/\s+/);
    var lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var next = cur ? cur + ' ' + words[i] : words[i];
      if (next.length > maxChars && cur) { lines.push(cur); cur = words[i]; }
      else cur = next;
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  }

  function maxCharsFor(type) { return type === 'decision' ? 17 : 23; }

  function boxH(step) {
    var lines = wrap(step.text, maxCharsFor(step.step_type)).length;
    var base = H[step.step_type] || H.action;
    var content = step.step_type === 'decision'
      ? lines * LH + (step.owner ? 13 : 0) + 38
      : lines * LH + (step.owner ? 13 : 0) + 16;
    return Math.max(base, content);
  }

  function shape(type, cx, cy, w, h) {
    var x = cx - w / 2, y = cy - h / 2;
    if (type === 'start' || type === 'end') {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
             '" rx="' + (h / 2) + '" ry="' + (h / 2) + '" class="fc-sh fc-' + type + '"/>';
    }
    if (type === 'decision') {
      return '<polygon points="' + [cx + ',' + y, (x + w) + ',' + cy, cx + ',' + (y + h), x + ',' + cy].join(' ') +
             '" class="fc-sh fc-decision"/>';
    }
    if (type === 'document') {
      var sk = 17;
      return '<polygon points="' + [(x + sk) + ',' + y, (x + w) + ',' + y, (x + w - sk) + ',' + (y + h), x + ',' + (y + h)].join(' ') +
             '" class="fc-sh fc-document"/>';
    }
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
           '" rx="8" ry="8" class="fc-sh fc-action"/>';
  }

  function label(cx, cy, text, owner, type) {
    var lines = wrap(text, maxCharsFor(type));
    var total = lines.length * LH + (owner ? 12 : 0);
    var startY = cy - total / 2 + LH * 0.78;
    var out = '';
    for (var i = 0; i < lines.length; i++) {
      out += '<text class="fc-t" x="' + cx + '" y="' + (startY + i * LH) + '">' + esc(lines[i]) + '</text>';
    }
    if (owner) {
      out += '<text class="fc-o" x="' + cx + '" y="' + (startY + lines.length * LH + 3) + '">' + esc(owner) + '</text>';
    }
    return out;
  }

  function edgeText(x, y, t) {
    if (!t) return '';
    return '<text class="fc-e" x="' + x + '" y="' + y + '">' + esc(t) + '</text>';
  }

  /* ---------- سازگاری با داده‌ی قدیمی ----------
     اگر یالی ذخیره نشده باشد، از مدلِ قدیمیِ «ستون فقرات» ساخته می‌شود:
     هر گام به گام بعدی، و گامِ تصمیم شاخه‌ی «خیر» را به no_target_id می‌دهد. */
  function deriveLinks(steps) {
    var out = [];
    for (var i = 0; i < steps.length; i++) {
      var s = steps[i], nxt = steps[i + 1];
      if (s.step_type === 'end') continue;
      if (nxt) out.push({ from: s.id, to: nxt.id, label: s.step_type === 'decision' ? 'بله' : '' });
      if (s.step_type === 'decision' && s.no_target_id) {
        out.push({ from: s.id, to: s.no_target_id, label: 'خیر' });
      }
    }
    return out;
  }

  /* ---------- چیدمان لایه‌ای ---------- */
  function layout(steps, links, opts) {
    opts = opts || {};
    var byId = {}, i, s;
    for (i = 0; i < steps.length; i++) byId[steps[i].id] = steps[i];

    var out = {}, inc = {};
    for (i = 0; i < steps.length; i++) { out[steps[i].id] = []; inc[steps[i].id] = []; }
    var edges = [];
    for (i = 0; i < links.length; i++) {
      var l = links[i];
      if (!byId[l.from] || !byId[l.to] || l.from === l.to) continue;
      var e = { from: l.from, to: l.to, label: l.label || '' };
      edges.push(e); out[e.from].push(e); inc[e.to].push(e);
    }

    // ریشه‌ها
    var roots = steps.filter(function (n) { return n.step_type === 'start'; });
    if (!roots.length) roots = steps.filter(function (n) { return !inc[n.id].length; });
    if (!roots.length) roots = [steps[0]];

    // یال‌های بازگشتی (حلقه) با رنگ‌آمیزی DFS — بدون این، رتبه‌بندی در دور گیر می‌کند
    var color = {}, back = [];
    function isBack(e) { return back.indexOf(e) !== -1; }
    function dfs(id) {
      color[id] = 1;
      var es = out[id];
      for (var k = 0; k < es.length; k++) {
        var t = es[k].to;
        if (color[t] === 1) back.push(es[k]);
        else if (!color[t]) dfs(t);
      }
      color[id] = 2;
    }
    for (i = 0; i < roots.length; i++) if (!color[roots[i].id]) dfs(roots[i].id);
    for (i = 0; i < steps.length; i++) if (!color[steps[i].id]) dfs(steps[i].id);

    var fwd = edges.filter(function (e) { return !isBack(e); });

    // رتبه = بلندترین مسیر از ریشه (توپولوژیک، روی گرافِ بدون دور)
    var rank = {}, indeg = {};
    for (i = 0; i < steps.length; i++) { rank[steps[i].id] = 0; indeg[steps[i].id] = 0; }
    for (i = 0; i < fwd.length; i++) indeg[fwd[i].to]++;
    var q = steps.filter(function (n) { return !indeg[n.id]; }).map(function (n) { return n.id; });
    var seen = 0;
    while (q.length) {
      var id = q.shift(); seen++;
      var es2 = out[id];
      for (var j = 0; j < es2.length; j++) {
        if (isBack(es2[j])) continue;
        var to = es2[j].to;
        if (rank[to] < rank[id] + 1) rank[to] = rank[id] + 1;
        if (--indeg[to] === 0) q.push(to);
      }
    }
    // اگر گامی جدا افتاده باشد (بدون یال)، ته نمودار می‌نشیند تا گم نشود
    if (seen < steps.length) {
      var maxR = 0;
      for (i = 0; i < steps.length; i++) if (rank[steps[i].id] > maxR) maxR = rank[steps[i].id];
      for (i = 0; i < steps.length; i++) if (indeg[steps[i].id] > 0) rank[steps[i].id] = maxR + 1;
    }

    // گروه‌بندی در رتبه‌ها، با ترتیبِ اولیه‌ی sort_order
    var ranks = [];
    for (i = 0; i < steps.length; i++) {
      var r = rank[steps[i].id];
      (ranks[r] = ranks[r] || []).push(steps[i].id);
    }
    for (i = 0; i < ranks.length; i++) if (!ranks[i]) ranks[i] = [];

    // کاهش تقاطع: چند پاس میانگینِ جای والدها
    function bary(id, prevPos) {
      var ps = [], es3 = inc[id];
      for (var k = 0; k < es3.length; k++) {
        if (isBack(es3[k])) continue;
        var v = prevPos[es3[k].from];
        if (v != null) ps.push(v);
      }
      if (!ps.length) return 1e6;   // بی‌والد → ته صف
      var sum = 0; for (var m = 0; m < ps.length; m++) sum += ps[m];
      return sum / ps.length;
    }
    for (var pass = 0; pass < 4; pass++) {
      for (var rr = 1; rr < ranks.length; rr++) {
        var prevPos = {};
        for (i = 0; i < ranks[rr - 1].length; i++) prevPos[ranks[rr - 1][i]] = i;
        var order = {};
        for (i = 0; i < ranks[rr].length; i++) order[ranks[rr][i]] = i;
        ranks[rr].sort(function (a, b) {
          var d = bary(a, prevPos) - bary(b, prevPos);
          return d !== 0 ? d : order[a] - order[b];
        });
      }
    }

    /* ---- شکستن به چند ستون («باند») ----
       یک فرآیندِ ۱۳ گامی یک ستونِ بلندِ باریک می‌شود. روی A4 عمودی، جا دادنِ آن در
       یک صفحه یعنی مقیاسِ خیلی کوچک: اندازه‌گیریِ واقعی نشان داد نمودار به نوارِ
       ۵۴ میلی‌متری تبدیل می‌شود که متنش عملاً خوانا نیست — یعنی «یک صفحه شد» ولی
       «قابل استفاده» نشد.
       پس وقتی رتبه‌ها زیاد می‌شوند، نمودار به چند باندِ کنارِ هم می‌شکند و از عرضِ
       کاغذ استفاده می‌کند. باندها راست‌به‌چپ چیده می‌شوند تا با جهتِ خواندنِ فارسی
       بخوانند. یال‌ها به مختصات بسته‌اند نه به رتبه، پس مسیریابیِ موجود همان‌طور
       کار می‌کند و یالِ بینِ دو باند مثل هر یالِ غیرهم‌ستونِ دیگر آرنجی کشیده می‌شود. */
    var perBand = Math.max(1, opts.maxRanksPerBand || 9);
    var bandCount = Math.ceil(ranks.length / perBand);
    if (bandCount > 1) perBand = Math.ceil(ranks.length / bandCount); // باندها هم‌اندازه شوند

    // اول عرضِ هر باند را بدان تا فاصله‌ی افقیِ باندها درست باشد
    var bandWide = [];
    for (var rb = 0; rb < ranks.length; rb++) {
      var bi = Math.floor(rb / perBand);
      bandWide[bi] = Math.max(bandWide[bi] || 1, ranks[rb].length);
    }
    var bandX = [], acc = 0;
    for (var bj = 0; bj < bandCount; bj++) {
      bandX[bj] = acc;
      acc += bandWide[bj] * (W + COL_GAP) + LANE + COL_GAP;
    }

    // مختصات
    var pos = {}, y = PAD, widest = 0, bandY = [], curBand = -1;
    for (var rq = 0; rq < ranks.length; rq++) {
      var band = Math.floor(rq / perBand);
      if (band !== curBand) { curBand = band; y = PAD; }
      var ids = ranks[rq], hMax = 0;
      for (i = 0; i < ids.length; i++) hMax = Math.max(hMax, boxH(byId[ids[i]]));
      // باندِ صفر سمتِ راست می‌نشیند (جهتِ خواندنِ فارسی)
      var offX = bandX[bandCount - 1 - band];
      for (i = 0; i < ids.length; i++) {
        pos[ids[i]] = {
          x: offX + (i - (ids.length - 1) / 2) * (W + COL_GAP),
          y: y + hMax / 2,
          h: boxH(byId[ids[i]]),
          r: rq, col: i, band: band,
        };
      }
      widest = Math.max(widest, ids.length);
      y += hMax + GAP;
      bandY[band] = y;
    }
    // بلندترین باند ارتفاعِ کلِ نمودار را تعیین می‌کند
    y = 0;
    for (var by = 0; by < bandY.length; by++) y = Math.max(y, bandY[by] || 0);

    // انتقال به مختصات مثبت + جا برای راهروی کناری
    var minX = 1e9, maxX = -1e9;
    for (var k2 in pos) { minX = Math.min(minX, pos[k2].x); maxX = Math.max(maxX, pos[k2].x); }
    var shift = LANE + PAD + W / 2 - minX;
    for (k2 in pos) pos[k2].x += shift;

    return {
      byId: byId, pos: pos, ranks: ranks, fwd: fwd, back: back, edges: edges,
      width: (maxX - minX) + W + 2 * PAD + 2 * LANE,
      height: y - GAP + PAD,
    };
  }

  /* ---------- مسیر یال‌ها ---------- */
  // یالی که هم‌ستون است ولی از روی گامِ میانی رد می‌شود، اگر مستقیم کشیده شود از
  // *داخلِ* آن شکل عبور می‌کند و برچسبش هم روی برچسبِ یالِ کناری می‌افتد — در
  // تصمیمی که یک شاخه‌اش یک گام را جا می‌اندازد (مثلاً «خیر → مستقیم پایان»)
  // همیشه پیش می‌آید. این تابع می‌گوید آیا چیزی سرِ راه هست.
  function blocked(a, b, all) {
    var top = Math.min(a.y + a.h / 2, b.y - b.h / 2);
    var bot = Math.max(a.y + a.h / 2, b.y - b.h / 2);
    for (var i = 0; i < all.length; i++) {
      var p = all[i];
      if (p === a || p === b) continue;
      if (Math.abs(p.x - a.x) > W / 2) continue;          // ستون دیگر
      if (p.y - p.h / 2 > top && p.y + p.h / 2 < bot) return true;
    }
    return false;
  }

  function mergeParallel(links) {
    var seen = {}, out = [];
    for (var i = 0; i < links.length; i++) {
      var l = links[i], k = l.from + '\u0000' + l.to;
      if (seen[k] === undefined) {
        seen[k] = out.length;
        out.push({ from: l.from, to: l.to, label: l.label || '' });
      } else {
        var prev = out[seen[k]];
        if (l.label && prev.label.indexOf(l.label) === -1) {
          prev.label = prev.label ? prev.label + ' / ' + l.label : l.label;
        }
      }
    }
    return out;
  }

  function forwardPath(a, b, text, all) {
    var x1 = a.x, y1 = a.y + a.h / 2;
    var x2 = b.x, y2 = b.y - b.h / 2 - 3;
    var s, lx, ly;
    // هم‌ستون ولی با مانع: از کنارِ ستون دور می‌زند
    if (Math.abs(x1 - x2) < 1 && all && blocked(a, b, all)) {
      var dx = x1 + W / 2 + 16;
      s = '<path d="M ' + x1 + ' ' + y1 + ' V ' + (y1 + GAP / 2) + ' H ' + dx +
          ' V ' + (y2 - GAP / 2) + ' H ' + x2 + ' V ' + y2 +
          '" class="fc-ln" fill="none" marker-end="url(#fcArrow)"/>';
      return s + edgeText(dx + 5, (y1 + y2) / 2, text);
    }
    if (Math.abs(x1 - x2) < 1) {
      s = '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
          '" class="fc-ln" marker-end="url(#fcArrow)"/>';
      // فاصله‌ی عمودیِ کم شد، پس برچسب باید داخلِ همان فاصله بنشیند نه روی شکل
      lx = x1 + 11; ly = y1 + (GAP / 2) + 3;
    } else {
      var my = (y1 + y2) / 2;
      s = '<path d="M ' + x1 + ' ' + y1 + ' V ' + my + ' H ' + x2 + ' V ' + y2 +
          '" class="fc-ln" fill="none" marker-end="url(#fcArrow)"/>';
      // برچسب روی *ستونِ مقصد* می‌نشیند، نه کنارِ مبدأ. اگر کنار مبدأ بماند،
      // در تصمیمِ چندشاخه هر سه برچسب روی هم می‌افتند و ناخوانا می‌شوند
      // (در رندر واقعی دیده شد: «کم/متوسط/بالا» یک لکه‌ی درهم شدند).
      lx = x2 + 11; ly = my - 3;
    }
    return s + edgeText(lx, ly, text);
  }

  // یال بازگشتی: از پهلوی گام بیرون می‌رود، در راهروی کناری بالا می‌رود و از
  // پهلو وارد مقصد می‌شود — تا هرگز روی شکل‌ها نیفتد.
  function backPath(a, b, laneX, text) {
    var x1 = a.x - W / 2, y1 = a.y;
    var x2 = b.x - W / 2 - 4, y2 = b.y;
    var d = 'M ' + x1 + ' ' + y1 + ' H ' + laneX + ' V ' + y2 + ' H ' + x2;
    return '<path d="' + d + '" class="fc-ln fc-back" fill="none" marker-end="url(#fcArrow)"/>' +
           edgeText(laneX + 6, (y1 + y2) / 2, text);
  }

  /**
   * steps: [{ id, step_type, text, owner, no_target_id? }]
   * links: [{ from, to, label }]  — اگر ندهید، از مدل قدیمی ساخته می‌شود
   */
  function render(steps, links, opts) {
    opts = opts || {};
    var list = (steps || []).filter(function (s) { return s && s.text; });
    if (!list.length) return '';
    var ls = (links && links.length) ? links : deriveLinks(list);

    // دو یال با مبدأ و مقصدِ یکسان (مثلاً تصمیمی که «بله» و «خیر»ش هر دو به یک
    // گام می‌روند) دقیقاً روی هم می‌افتند و برچسب‌هایشان یک لکه می‌شود. به‌جای
    // رسمِ دوباره، برچسب‌ها در یک یال ادغام می‌شوند: «بله / خیر». این هم داده‌ی
    // قدیمی را نجات می‌دهد و هم جلوی همین اشتباه از سمت کاربر را می‌گیرد.
    ls = mergeParallel(ls);

    var L = layout(list, ls, opts);
    var laneX = PAD + LANE / 2;
    var allPos = [];
    for (var k in L.pos) if (Object.prototype.hasOwnProperty.call(L.pos, k)) allPos.push(L.pos[k]);

    var edgesSvg = '';
    for (var i = 0; i < L.fwd.length; i++) {
      var e = L.fwd[i];
      edgesSvg += forwardPath(L.pos[e.from], L.pos[e.to], e.label, allPos);
    }
    for (i = 0; i < L.back.length; i++) {
      var b = L.back[i];
      edgesSvg += backPath(L.pos[b.from], L.pos[b.to], laneX, b.label);
    }

    var body = '';
    for (i = 0; i < list.length; i++) {
      var s = list[i], p = L.pos[s.id];
      if (!p) continue;
      body += shape(s.step_type, p.x, p.y, W, p.h);
      body += label(p.x, p.y, s.text, s.owner, s.step_type);
    }

    // اندازه‌ی *طبیعی* روی خودِ svg می‌نشیند، نه width="100%".
    // با width="100%" یک نمودارِ باریک تا عرض ظرف **بزرگ** می‌شد و ارتفاعش هم به
    // همان نسبت بالا می‌رفت — دقیقاً همان «آیکون‌های خیلی بزرگ و چند صفحه شدن».
    // حالا CSS فقط اجازه‌ی کوچک‌شدن می‌دهد (max-width/max-height)، نه بزرگ‌شدن.
    var vw = Math.max(L.width, 320);
    return '<svg class="fcsvg" viewBox="0 0 ' + vw + ' ' + L.height + '" ' +
      'width="' + vw + '" height="' + L.height + '" ' +
      'preserveAspectRatio="xMidYMin meet" xmlns="http://www.w3.org/2000/svg" ' +
      'role="img" aria-label="' + esc(opts.title || 'فلوچارت فرآیند') + '">' +
      '<defs><marker id="fcArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" ' +
      'orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="fc-ar"/></marker></defs>' +
      edgesSvg + body + '</svg>';
  }

  global.Flowchart = { render: render, deriveLinks: deriveLinks, TYPE_FA: TYPE_FA };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) module.exports = (typeof window !== 'undefined' ? window : globalThis).Flowchart;
