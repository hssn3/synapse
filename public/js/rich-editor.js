/* =====================================================================
   ویرایشگر متنِ غنی — «فرم‌ساز شبیه ورد»
   ---------------------------------------------------------------------
   خواسته‌ی کاربر: کاربر بتواند جدول بکشد، داخل خانه‌ی جدول بنویسد،
   راست‌چین/وسط‌چین/چپ‌چین کند، و وسط متن فارسی که انگلیسی دارد جهت را
   عوض کند — و خروجی هم روی صفحه و هم در چاپ/PDF درست باشد.

   چرا contentEditable و نه یک کتابخانه: کل پروژه عمداً بدون وابستگی
   بیرونی است (شبکه‌ی ملی، بدون CDN). یک ویرایشگر کامل مثل TipTap چند صد
   کیلوبایت و یک زنجیره‌ی بیلد می‌آورد. اینجا فقط چیزی که واقعاً لازم است
   ساخته شده، روی همان APIهای بومی مرورگر.

   نکته‌ی مهمِ فارسی: مشکل اصلی «جهت» است، نه فونت. سه سطح جهت داریم:
     ۱) کل سند   — پیش‌فرض rtl
     ۲) هر پاراگراف/خانه — با دکمه‌های جهت عوض می‌شود
     ۳) تکه‌ی درون‌خطی — با «قطعه‌ی لاتین» که یک <span dir="ltr"> می‌گذارد
   سطح سوم همان چیزی است که «فارسی با انگلیسی وسطش» را درست می‌کند؛
   بدون آن، پرانتز و علامت و عدد سرِ جای غلط می‌پرند.

   امنیت: خروجی پیش از ذخیره و پیش از نمایش با یک allow-list پاک‌سازی
   می‌شود (نه با regex روی رشته). فقط تگ‌ها و ویژگی‌های سفیدِ فهرست‌شده
   می‌مانند؛ script/style/on* و href جاوااسکریپتی حذف می‌شوند.
   ===================================================================== */
(function (global) {
  'use strict';

  /* ---------------- پاک‌سازی ---------------- */
  var ALLOWED_TAGS = {
    P: 1, BR: 1, DIV: 1, SPAN: 1, B: 1, STRONG: 1, I: 1, EM: 1, U: 1, S: 1,
    H1: 1, H2: 1, H3: 1, H4: 1, UL: 1, OL: 1, LI: 1, BLOCKQUOTE: 1, HR: 1,
    TABLE: 1, THEAD: 1, TBODY: 1, TR: 1, TD: 1, TH: 1, CAPTION: 1,
    A: 1, SUB: 1, SUP: 1, CODE: 1, PRE: 1
  };
  var ALLOWED_ATTR = { dir: 1, colspan: 1, rowspan: 1, href: 1, title: 1 };
  // فقط همین چند اعلانِ سبک اجازه دارد — تا استایل دلبخواهی وارد سند نشود
  var ALLOWED_STYLE = /^(text-align|direction|font-weight|font-style|text-decoration|width)$/;

  function sanitizeStyle(v) {
    return String(v || '').split(';').map(function (d) {
      var i = d.indexOf(':'); if (i < 0) return '';
      var k = d.slice(0, i).trim().toLowerCase(), val = d.slice(i + 1).trim();
      if (!ALLOWED_STYLE.test(k)) return '';
      if (/url\s*\(|expression|javascript:/i.test(val)) return '';
      return k + ':' + val;
    }).filter(Boolean).join(';');
  }

  function sanitize(html) {
    var doc = document.implementation.createHTMLDocument('s');
    doc.body.innerHTML = String(html || '');
    (function walk(node) {
      var kids = Array.prototype.slice.call(node.childNodes);
      kids.forEach(function (el) {
        if (el.nodeType === 3) return;                      // متن، سالم
        if (el.nodeType !== 1) { el.remove(); return; }      // کامنت و غیره
        if (!ALLOWED_TAGS[el.tagName]) {
          // تگ غیرمجاز: خودش می‌رود، محتوایش می‌ماند
          while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
          el.remove(); return;
        }
        Array.prototype.slice.call(el.attributes).forEach(function (a) {
          var n = a.name.toLowerCase();
          if (n === 'style') { var st = sanitizeStyle(a.value); if (st) el.setAttribute('style', st); else el.removeAttribute('style'); return; }
          if (n === 'class') { return; }                      // کلاس‌ها را نگه نمی‌داریم جز موارد زیر
          if (!ALLOWED_ATTR[n]) { el.removeAttribute(a.name); return; }
          if (n === 'href' && /^\s*javascript:/i.test(a.value)) el.removeAttribute('href');
          if (n === 'dir' && !/^(rtl|ltr|auto)$/i.test(a.value)) el.removeAttribute('dir');
        });
        // جدول‌ها همیشه کلاس خودمان را می‌گیرند تا استایل چاپ بگیرند
        if (el.tagName === 'TABLE') el.setAttribute('class', 're-table');
        walk(el);
        // قطعه‌ی جهت‌دارِ خالی (فقط فاصله‌ی صفرعرض) آشغال است — کاربر واردش
        // شده و بعد منصرف شده. می‌رود تا در خروجی و چاپ اثری نگذارد.
        if (el.tagName === 'SPAN' && el.hasAttribute('dir') &&
            !/[^\u200b\s]/.test(el.textContent || '') && !el.querySelector('*')) el.remove();
      });
    })(doc.body);
    return doc.body.innerHTML;
  }

  /* ---------------- ابزارها ---------------- */
  function exec(cmd, val) { try { document.execCommand(cmd, false, val || null); } catch (e) { /* مرورگر قدیمی */ } }

  // بلوکِ دربرگیرنده‌ی محل نشانگر (پاراگراف یا خانه‌ی جدول)
  function currentBlock(root) {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    var n = sel.getRangeAt(0).startContainer;
    if (n.nodeType === 3) n = n.parentNode;
    while (n && n !== root && !/^(P|DIV|LI|TD|TH|H1|H2|H3|H4|BLOCKQUOTE)$/.test(n.tagName)) n = n.parentNode;
    return (n && n !== root) ? n : null;
  }

  function setAlign(root, how) {
    var b = currentBlock(root);
    if (b) b.style.textAlign = how; else exec('justify' + (how === 'right' ? 'Right' : how === 'left' ? 'Left' : 'Center'));
  }

  function setDir(root, dir) {
    var b = currentBlock(root);
    if (b) { b.setAttribute('dir', dir); b.style.textAlign = (dir === 'rtl' ? 'right' : 'left'); }
  }

  // قطعه‌ی درون‌خطیِ لاتین: همان چیزی که «فارسی با انگلیسی وسطش» را درست می‌کند.
  // رفتارش عمداً «کلید حالت» است، نه یک کنش یک‌طرفه: اگر نشانگر بیرون است،
  // وارد قطعه می‌شود؛ اگر داخل است، از قطعه بیرون می‌آید. بدون این، کاربر
  // داخل قطعه گیر می‌افتاد و ادامه‌ی متن فارسی هم LTR می‌شد — همان اشکالی که
  // در تست واقعی دیده شد.
  // ZW برای داخلِ قطعه‌ی خالی، ZWNJ برای لنگرِ خروج.
  // چرا دو تا: فاصله‌ی صفرعرض (u200b) را مرورگر از گره‌ی مجاورِ یک عنصر
  // درون‌خطی پاک می‌کند و آن گره خالی می‌ماند؛ آن‌وقت «چسبندگی مرزی» کروم
  // تایپ بعدی را دوباره داخل همان span می‌برد — همان چیزی که در تست دیده شد.
  // نیم‌فاصله (u200c) یک نویسه‌ی واقعیِ فارسی است، پاک نمی‌شود، و در متن
  // فارسی هم نامرئی و بی‌ضرر است.
  var ZW = '\u200b';
  var ZWNJ = '\u200c';

  function inlineSpanAt() {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    var n = sel.getRangeAt(0).startContainer;
    if (n.nodeType === 3) n = n.parentNode;
    return n && n.closest ? n.closest('span[dir]') : null;
  }

  // نشانگر را بیرون از قطعه می‌برد و یک لنگرِ ماندگار می‌گذارد
  function caretAfter(node) {
    var t = node.nextSibling;
    if (!t || t.nodeType !== 3 || !t.nodeValue) {
      t = document.createTextNode(ZWNJ);
      node.parentNode.insertBefore(t, node.nextSibling);
    } else if (t.nodeValue.indexOf(ZWNJ) !== 0) {
      t.nodeValue = ZWNJ + t.nodeValue;
    }
    var r = document.createRange();
    r.setStart(t, 1); r.collapse(true);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }

  function wrapInline(dir) {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    // داخل قطعه هستیم ⇒ خروج (حالت خاموش)
    var cur = inlineSpanAt();
    if (cur && sel.getRangeAt(0).collapsed) { caretAfter(cur); return; }

    var r = sel.getRangeAt(0);
    if (r.collapsed) {
      var s = document.createElement('span');
      s.setAttribute('dir', dir);
      s.appendChild(document.createTextNode(ZW));
      r.insertNode(s);
      var nr = document.createRange();
      nr.setStart(s.firstChild, 1); nr.collapse(true);
      sel.removeAllRanges(); sel.addRange(nr);
      return;
    }
    var span = document.createElement('span');
    span.setAttribute('dir', dir);
    try { r.surroundContents(span); }
    catch (e) { span.appendChild(r.extractContents()); r.insertNode(span); }
    caretAfter(span);
  }

  function insertTable(root, rows, cols, header) {
    rows = Math.max(1, Math.min(30, rows | 0));
    cols = Math.max(1, Math.min(12, cols | 0));
    var t = document.createElement('table');
    t.className = 're-table';
    t.setAttribute('dir', 'rtl');
    var html = '';
    if (header) {
      html += '<thead><tr>';
      for (var c = 0; c < cols; c++) html += '<th>عنوان ' + (c + 1) + '</th>';
      html += '</tr></thead>';
      rows = Math.max(1, rows - 1);
    }
    html += '<tbody>';
    for (var r2 = 0; r2 < rows; r2++) {
      html += '<tr>';
      for (var c2 = 0; c2 < cols; c2++) html += '<td><br></td>';
      html += '</tr>';
    }
    html += '</tbody>';
    t.innerHTML = html;

    var sel = window.getSelection();
    if (sel && sel.rangeCount && root.contains(sel.getRangeAt(0).startContainer)) {
      var range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(t);
    } else {
      root.appendChild(t);
    }
    // همیشه یک پاراگراف بعد از جدول، وگرنه در انتهای سند گیر می‌افتد
    var after = document.createElement('p');
    after.innerHTML = '<br>';
    t.parentNode.insertBefore(after, t.nextSibling);
    placeCaret(after);
  }

  function placeCaret(el) {
    var r = document.createRange(); r.selectNodeContents(el); r.collapse(true);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }

  // عملیات ردیف/ستون روی جدولی که نشانگر داخلش است
  function cellCtx(root) {
    var b = currentBlock(root);
    while (b && b !== root && !/^(TD|TH)$/.test(b.tagName)) b = b.parentNode;
    if (!b || b === root) return null;
    var tr = b.parentNode, table = tr.closest('table');
    return { cell: b, row: tr, table: table, index: Array.prototype.indexOf.call(tr.children, b) };
  }

  function rowAdd(root, after) {
    var c = cellCtx(root); if (!c) return false;
    var tr = document.createElement('tr');
    for (var i = 0; i < c.row.children.length; i++) tr.innerHTML += '<td><br></td>';
    c.row.parentNode.insertBefore(tr, after ? c.row.nextSibling : c.row);
    placeCaret(tr.firstChild); return true;
  }
  function rowDel(root) {
    var c = cellCtx(root); if (!c) return false;
    var body = c.row.parentNode;
    if (body.children.length <= 1) { c.table.remove(); return true; }
    c.row.remove(); return true;
  }
  function colAdd(root, after) {
    var c = cellCtx(root); if (!c) return false;
    Array.prototype.forEach.call(c.table.rows, function (tr) {
      var cell = document.createElement(tr.parentNode.tagName === 'THEAD' ? 'th' : 'td');
      cell.innerHTML = tr.parentNode.tagName === 'THEAD' ? 'عنوان' : '<br>';
      var ref = tr.children[c.index];
      tr.insertBefore(cell, after ? (ref ? ref.nextSibling : null) : ref);
    });
    return true;
  }
  function colDel(root) {
    var c = cellCtx(root); if (!c) return false;
    if (c.row.children.length <= 1) { c.table.remove(); return true; }
    Array.prototype.forEach.call(c.table.rows, function (tr) {
      if (tr.children[c.index]) tr.children[c.index].remove();
    });
    return true;
  }

  /* ---------------- نوار ابزار ---------------- */
  var I = function (n) { return (typeof ic === 'function') ? ic(n) : ''; };

  function toolbar(id) {
    var btn = function (act, label, title, cls) {
      return '<button type="button" class="re-b' + (cls ? ' ' + cls : '') + '" ' +
        'data-act="' + act + '" title="' + title + '" tabindex="-1">' + label + '</button>';
    };
    return '<div class="re-bar" data-for="' + id + '">' +
      '<div class="re-grp">' +
        btn('bold', '<b>ب</b>', 'درشت (Ctrl+B)') +
        btn('italic', '<i>ک</i>', 'کج (Ctrl+I)') +
        btn('underline', '<u>خ</u>', 'زیرخط (Ctrl+U)') +
      '</div>' +
      '<div class="re-grp">' +
        btn('h2', 'تیتر', 'تیتر بخش') +
        btn('p', 'متن', 'متن عادی') +
        btn('ul', '• فهرست', 'فهرست نقطه‌ای') +
        btn('ol', '۱. فهرست', 'فهرست شماره‌دار') +
      '</div>' +
      '<div class="re-grp">' +
        btn('right', '▤', 'راست‌چین') +
        btn('center', '▥', 'وسط‌چین') +
        btn('left', '▦', 'چپ‌چین') +
      '</div>' +
      '<div class="re-grp">' +
        btn('rtl', 'راست‹چپ', 'جهت پاراگراف: راست به چپ') +
        btn('ltr', 'چپ›راست', 'جهت پاراگراف: چپ به راست') +
        btn('inline-ltr', 'A|ا', 'قطعه‌ی لاتین داخل متن فارسی — یک‌بار برای ورود، یک‌بار برای خروج', 're-b-hi') +
      '</div>' +
      '<div class="re-grp">' +
        btn('table', 'جدول', 'درج جدول') +
        btn('row+', '+سطر', 'افزودن سطر زیر') +
        btn('row-', '−سطر', 'حذف سطر') +
        btn('col+', '+ستون', 'افزودن ستون') +
        btn('col-', '−ستون', 'حذف ستون') +
      '</div>' +
      '<div class="re-grp">' +
        btn('hr', '───', 'خط جداکننده') +
        btn('clear', 'پاک‌کردن قالب', 'حذف قالب‌بندی') +
      '</div>' +
    '</div>';
  }

  /**
   * ویرایشگر را روی یک textarea سوار می‌کند.
   * textarea پنهان می‌شود و همچنان «منبع حقیقت» است — هر تغییر داخل
   * ویرایشگر، پاک‌سازی و داخل textarea نوشته می‌شود، پس فرم‌های موجود
   * بدون تغییر در منطق ارسال کار می‌کنند.
   */
  function attach(textarea, opts) {
    if (!textarea || textarea.dataset.reOn) return null;
    opts = opts || {};
    textarea.dataset.reOn = '1';

    var id = textarea.id || ('re' + Math.random().toString(36).slice(2, 8));
    var wrap = document.createElement('div');
    wrap.className = 're-wrap';
    wrap.innerHTML = toolbar(id) +
      '<div class="re-area" contenteditable="true" dir="rtl" role="textbox" aria-multiline="true"' +
      (opts.minHeight ? ' style="min-height:' + opts.minHeight + '"' : '') + '></div>';
    textarea.parentNode.insertBefore(wrap, textarea);
    textarea.style.display = 'none';

    var area = wrap.querySelector('.re-area');
    var bar = wrap.querySelector('.re-bar');

    // متن اولیه: اگر HTML بود همان، اگر متن ساده بود به پاراگراف تبدیل شود
    var initial = textarea.value || '';
    if (initial && !/<[a-z][\s\S]*>/i.test(initial)) {
      initial = initial.split(/\n{2,}/).map(function (para) {
        return '<p>' + para.split('\n').map(function (l) {
          return l.replace(/[&<>]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]; });
        }).join('<br>') + '</p>';
      }).join('');
    }
    area.innerHTML = sanitize(initial) || '<p><br></p>';

    var sync = function () { textarea.value = sanitize(area.innerHTML); };
    area.addEventListener('input', sync);
    area.addEventListener('blur', sync);

    // نشانِ حالت: وقتی نشانگر داخل قطعه‌ی لاتین است، دکمه روشن می‌ماند تا
    // کاربر بداند در چه حالتی تایپ می‌کند و کِی باید خارج شود.
    var ltrBtn = bar.querySelector('[data-act="inline-ltr"]');
    var refreshMode = function () {
      if (!ltrBtn) return;
      var inside = area.contains(document.activeElement) || document.activeElement === area;
      ltrBtn.classList.toggle('on', !!(inside && inlineSpanAt()));
    };
    ['keyup', 'mouseup', 'input', 'focus'].forEach(function (ev) {
      area.addEventListener(ev, refreshMode);
    });

    // چسباندن: همیشه از متن ساده — تا استایل ورد/وب وارد سند نشود
    area.addEventListener('paste', function (e) {
      e.preventDefault();
      var html = (e.clipboardData || window.clipboardData).getData('text/html');
      var text = (e.clipboardData || window.clipboardData).getData('text/plain');
      if (html) {
        var clean = sanitize(html);
        document.execCommand('insertHTML', false, clean);
      } else {
        document.execCommand('insertText', false, text);
      }
      sync();
    });

    bar.addEventListener('mousedown', function (e) { e.preventDefault(); }); // فوکوس نپرد
    bar.addEventListener('click', async function (e) {
      var b = e.target.closest('.re-b'); if (!b) return;
      area.focus();
      var a = b.dataset.act;
      if (a === 'bold' || a === 'italic' || a === 'underline') exec(a);
      else if (a === 'h2') exec('formatBlock', 'H3');
      else if (a === 'p') exec('formatBlock', 'P');
      else if (a === 'ul') exec('insertUnorderedList');
      else if (a === 'ol') exec('insertOrderedList');
      else if (a === 'right' || a === 'center' || a === 'left') setAlign(area, a);
      else if (a === 'rtl' || a === 'ltr') setDir(area, a);
      else if (a === 'inline-ltr') wrapInline('ltr');
      else if (a === 'hr') exec('insertHorizontalRule');
      else if (a === 'clear') exec('removeFormat');
      else if (a === 'table') {
        var spec = await BTN.prompt('اندازه‌ی جدول را بنویسید — «سطر×ستون»\nمثال: 4x3 یعنی ۴ سطر و ۳ ستون', '3x3');
        if (!spec) return;
        var m = String(spec).replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); })
                            .match(/(\d+)\s*[x×*]\s*(\d+)/);
        if (!m) { if (typeof toast === 'function') toast('قالب اندازه درست نیست. مثال: 4x3', true); return; }
        insertTable(area, parseInt(m[1], 10), parseInt(m[2], 10), await BTN.confirm('سطر اول به‌عنوان سرستون باشد؟'));
      }
      else if (a === 'row+') rowAdd(area, true);
      else if (a === 'row-') rowDel(area);
      else if (a === 'col+') colAdd(area, true);
      else if (a === 'col-') colDel(area);
      sync();
    });

    // Tab داخل جدول: خانه‌ی بعدی، نه خروج از ویرایشگر
    area.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var c = cellCtx(area); if (!c) return;
      e.preventDefault();
      var cells = Array.prototype.slice.call(c.table.querySelectorAll('td,th'));
      var i = cells.indexOf(c.cell) + (e.shiftKey ? -1 : 1);
      if (i >= 0 && i < cells.length) placeCaret(cells[i]);
      else if (!e.shiftKey) { rowAdd(area, true); }
    });

    // «پر کردن نمونه» مقدار را مستقیم روی textarea می‌نویسد؛ این شنونده همان
    // مقدار را داخل کادر ویرایش هم می‌آورد، وگرنه کاربر چیزی نمی‌بیند.
    textarea.addEventListener('re:pull', function () {
      var v = textarea.value || '';
      if (!/<[a-z][\s\S]*>/i.test(v)) {
        v = v.split(/\n{2,}/).map(function (para) {
          return '<p>' + para.split('\n').map(function (l) {
            return l.replace(/[&<>]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]; });
          }).join('<br>') + '</p>';
        }).join('');
      }
      area.innerHTML = sanitize(v) || '<p><br></p>';
      sync();
    });

    sync();
    var api = { area: area, sync: sync, sanitize: sanitize };
    textarea._rich = api;
    return api;
  }

  // همه‌ی textareaهایی که data-rich دارند را خودکار مجهز کن
  function autoAttach(root) {
    (root || document).querySelectorAll('textarea[data-rich]').forEach(function (t) {
      attach(t, { minHeight: t.dataset.richHeight || '220px' });
    });
  }

  global.RichEditor = { attach: attach, autoAttach: autoAttach, sanitize: sanitize };
})(window);
