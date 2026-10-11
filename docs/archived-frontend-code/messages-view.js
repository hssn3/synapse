/**
 * Collaboration Internal Messages
 * Modular Frontend Component — Project 313
 */
// ==================== پیام‌های داخلی ====================
// عمداً کلاینت ایمیل نیست: سه صندوق، یک فرم نوشتن، بدون پوشه/رونوشت/پیوست.
const MSG={box:'inbox', compose:false, editId:null, colleagues:[]};
const MSG_CAT_FA={general:'عمومی', meeting_invite:'دعوت‌نامه جلسه', task:'دستور کار', announcement:'اطلاعیه'};
const MSG_CAT_IC={general:'✉', meeting_invite:'❖', task:'✔', announcement:'◈'};
const MSG_BOXES=[['inbox','📥 دریافتی'],['sent','📤 ارسالی'],['drafts','📝 پیش‌نویس']];

function setMsgBox(b){ MSG.box=b; MSG.compose=false; MSG.editId=null; renderMessages(); }
function openCompose(){ MSG.compose=true; MSG.editId=null; renderMessages(); }
function closeCompose(){ MSG.compose=false; MSG.editId=null; renderMessages(); }

async function renderMessages(){
  $('ptitle').textContent='پیام‌های داخلی';
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    const [res, col]=await Promise.all([API.messages(MSG.box), API.colleagues()]);
    MSG.colleagues=col.users||[];
    const rows=res.messages||[];
    const editing=MSG.editId?rows.find(m=>m.id===MSG.editId):null;
    const isInbox=MSG.box==='inbox', isDrafts=MSG.box==='drafts';
    // ستون «طرف مقابل» بسته به صندوق معنای متفاوتی دارد؛ دو جدول جدا نمی‌سازیم
    const peerHd=isInbox?'فرستنده':'گیرنده';

    $('content').innerHTML=`
    <div class="panel g">
      <div class="phd"><div class="abadge">✉</div><div><h3>پیام‌های داخلی</h3>
        <div class="sub">پیام‌رسانی بین همکاران همین بیمارستان — بدون خروج از سامانه</div></div>
        <button class="btn btn-g btn-sm" onclick="openCompose()">✎ نوشتن پیام</button></div>
      <div class="pbody">
        <div class="doctabs">${MSG_BOXES.map(([k,l])=>
          `<button class="btn btn-sm ${MSG.box===k?'btn-g':'btn-o'}" onclick="setMsgBox('${k}')">${l}</button>`).join('')}</div>
        ${(MSG.compose||editing)?msgComposeHtml(editing):''}
        ${!rows.length?`<div class="empty"><div class="ei">✉</div>
          <div style="margin-top:6px">${isDrafts
            ? 'پیشنویسی ذخیره نشده — بنویسید و هر وقت کامل شد بفرستید.'
            : (isInbox ? 'پیامی دریافت نکردهاید. به همکاران همین بیمارستان بدون خروج از سامانه پیام بدهید.' : 'هنوز پیامی نفرستادید.')}</div>
          <div style="margin-top:10px"><button class="btn btn-g btn-sm" onclick="openCompose()">✎ نوشتن پیام</button></div></div>`:`
        <div class="tbl-wrap"><table><thead><tr>
          <th>نوع</th><th>موضوع</th><th>${peerHd}</th><th>تاریخ</th><th></th></tr></thead><tbody>
        ${rows.map(m=>{
          const unread=isInbox&&!m.is_read;
          const peer=isInbox?m.sender_name:(m.recipient_name||'—');
          return `<tr style="${unread?'background:rgba(212,175,90,.07)':''}">
            <td style="white-space:nowrap">${MSG_CAT_IC[m.category]||'✉'} ${esc(MSG_CAT_FA[m.category]||'عمومی')}</td>
            <td><span style="${unread?'font-weight:800;color:var(--gdl)':''}">${esc(m.subject)}</span>
              ${unread?' <span class="bdg b2">جدید</span>':''}
              ${m.meeting_title?`<div style="font-size:11.5px;color:var(--td);margin-top:3px">❖ ${esc(m.meeting_title)}${m.meeting_date?' — '+faDateISO(m.meeting_date):''}${m.meeting_start?' ساعت '+esc(m.meeting_start):''}</div>`:''}
              ${m.body?`<div style="font-size:12px;color:var(--td);margin-top:3px">${esc(String(m.body).slice(0,110))}${String(m.body).length>110?'…':''}</div>`:''}</td>
            <td>${esc(peer)}</td>
            <td style="white-space:nowrap;color:var(--gdl)">${faDateTime(m.sent_at||m.created_at)}</td>
            <td style="white-space:nowrap">
              ${isInbox?`<button class="btn btn-sm" onclick="toggleMsgRead('${m.id}',${m.is_read?0:1})">${m.is_read?'نخوانده':'خوانده شد'}</button>`:''}
              ${isDrafts?`<button class="btn btn-sm" onclick="editDraft('${m.id}')">ویرایش</button>`:''}
              ${(isInbox||isDrafts)?`<button class="btn btn-sm btn-o" onclick="removeMessage('${m.id}')">حذف</button>`:''}
            </td></tr>`;
        }).join('')}
        </tbody></table></div>`}
      </div>
    </div>`;
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}

function msgComposeHtml(d){
  const v=f=>esc((d&&d[f])||'');
  return `<div style="margin-bottom:16px;padding:16px 18px;border-radius:12px;background:var(--subpanel);border:1px solid var(--bd)">
    <div style="font-size:12.5px;color:var(--gdl);font-weight:700;margin-bottom:12px">${d?'ویرایش پیش‌نویس':'پیام جدید'}</div>
    <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:12px">
      <div class="fg"><label>گیرنده</label><select id="mg_to" class="sel">
        <option value="">— انتخاب همکار —</option>
        ${MSG.colleagues.map(u=>`<option value="${u.id}"${d&&d.recipient_id===u.id?' selected':''}>${esc(u.full_name)}${u.department?' — '+esc(u.department):''}</option>`).join('')}
      </select></div>
      <div class="fg"><label>دسته‌بندی</label><select id="mg_cat" class="sel">
        ${Object.entries(MSG_CAT_FA).map(([k,l])=>`<option value="${k}"${d&&d.category===k?' selected':''}>${l}</option>`).join('')}
      </select></div>
    </div>
    <div class="fg"><label>موضوع</label><input id="mg_sub" maxlength="200" value="${v('subject')}" placeholder="موضوع پیام"></div>
    <div class="fg"><label>متن پیام</label><textarea id="mg_body" rows="4" maxlength="8000" placeholder="متن پیام…">${v('body')}</textarea></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-g" onclick="submitMessage(false)">ارسال</button>
      <button class="btn btn-o" onclick="submitMessage(true)">ذخیره پیش‌نویس</button>
      <button class="btn btn-o" onclick="closeCompose()">انصراف</button>
    </div>
  </div>`;
}

async function submitMessage(asDraft){
  const body={recipient_id:$('mg_to').value||null, category:$('mg_cat').value,
    subject:$('mg_sub').value.trim(), body:$('mg_body').value.trim()};
  if(!body.subject){ toast('موضوع پیام را وارد کنید',true); return; }
  if(!asDraft&&!body.recipient_id){ toast('گیرنده را انتخاب کنید',true); return; }
  try{
    if(MSG.editId) await API.updateMessage(MSG.editId, Object.assign({}, body, {send:!asDraft}));
    else await API.sendMessage(Object.assign({}, body, {is_draft:asDraft}));
    toast(asDraft?'پیش‌نویس ذخیره شد':'پیام ارسال شد');
    MSG.compose=false; MSG.editId=null;
    MSG.box=asDraft?'drafts':'sent';
    renderMessages(); refreshNavBadges();
  }catch(e){ toast(e.message,true); }
}
function editDraft(id){ MSG.editId=id; MSG.compose=true; renderMessages(); }
async function toggleMsgRead(id,val){
  try{ await API.updateMessage(id,{is_read:!!val}); renderMessages(); refreshNavBadges(); }
  catch(e){ toast(e.message,true); }
}
async function removeMessage(id){
  if(!await BTN.confirmDanger('این پیام حذف شود؟')) return;
  try{ await API.deleteMessage(id); toast('پیام حذف شد'); renderMessages(); refreshNavBadges(); }
  catch(e){ toast(e.message,true); }
}

