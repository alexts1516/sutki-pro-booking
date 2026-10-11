/* The Address — адаптивная галерея квартиры (сетка на десктопе / слайдер на мобильном),
   полноэкранный просмотр и редактор фото для владельца/админа (index.html#photos). */
(function(){
'use strict';
const {M, photo, photoList, aptPhotos, capOf, gById, guestApts, openApt, renderGrid, toast, AMEN_GROUPS, amenCatalog, applyAptInfo, amenAllHTML, L2} = window.__guest;
/* ---------- слайдер (мобильный) ---------- */
function setSlide(i){
  const a = M.apt, L = photoList(a), N = L.length; if(!N) return;
  i = (i + N) % N; M.photo = i;
  const big = document.querySelector('.pgal .pbig'); if(!big) return;
  big.dataset.photo = i;
  big.innerHTML = photo(a, L[i], 's0') + `<span class="cap">${capOf(L[i])}${L[i]==='b'||typeof L[i]==='string'?'':' '+tx('· иллюстрация')}</span>` + (N>1?`<span class="cnt">${i+1} / ${N}</span>`:'');
  const strip = document.querySelector('.pgal .pthumbs');
  if(strip){ strip.querySelectorAll('.pth').forEach((b,k)=>b.classList.toggle('on', k===i));
    const th = strip.children[i]; if(th){ const left = th.offsetLeft - (strip.clientWidth - th.offsetWidth)/2; strip.scrollTo({left:Math.max(0,left), behavior:'smooth'}); } }
}
let SW = null, SW_AT = 0;
document.addEventListener('touchstart', e=>{ const el = e.target.closest && e.target.closest('.pgal .pbig, #pview .pv-stage'); if(!el || e.touches.length!==1) return;
  SW = {el, x:e.touches[0].clientX, y:e.touches[0].clientY}; }, {passive:true});
document.addEventListener('touchend', e=>{ if(!SW) return; const t = e.changedTouches[0], dx = t.clientX - SW.x, dy = t.clientY - SW.y, el = SW.el; SW = null;
  if(Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
  SW_AT = Date.now(); const d = dx < 0 ? 1 : -1;
  if(el.id || el.classList.contains('pv-stage')) pvGo(PV.i + d); else setSlide(M.photo + d); }, {passive:true});
document.addEventListener('click', e=>{ if(Date.now() - SW_AT < 400 && e.target.closest && e.target.closest('.pgal, #pview')){ e.stopPropagation(); e.preventDefault(); } }, true);

/* ---------- полноэкранный просмотр ---------- */
const PV = {a:null, i:0};
function pvEl(){ let v = document.getElementById('pview'); if(v) return v;
  v = document.createElement('div'); v.id = 'pview'; v.setAttribute('role','dialog'); v.setAttribute('aria-modal','true'); v.hidden = true;
  v.innerHTML = `<div class="pv-top"><span class="pv-cnt" id="pvCnt"></span><button type="button" class="pv-x" data-pv="x" aria-label="${tx('Закрыть')}">${ic('x',22)}</button></div>
    <button type="button" class="pv-nav prev" data-pv="prev" aria-label="${tx('Предыдущее фото')}">${ic('chevL',26)}</button>
    <div class="pv-stage" id="pvStage"></div>
    <button type="button" class="pv-nav next" data-pv="next" aria-label="${tx('Следующее фото')}">${ic('chevL',26)}</button>`;
  v.addEventListener('click', e=>{ const b = e.target.closest('[data-pv]'); if(b){ e.stopPropagation(); const k=b.dataset.pv; if(k==='x') closeViewer(); else pvGo(PV.i + (k==='next'?1:-1)); return; }
    if(e.target === v || e.target.id === 'pvStage'){ e.stopPropagation(); closeViewer(); } });
  document.body.appendChild(v); return v; }
function pvGo(i){ const L = photoList(PV.a), N = L.length; PV.i = (i + N) % N;
  // в просмотре не обрезаем: фото — object-fit:contain, иллюстрации — preserveAspectRatio meet
  document.getElementById('pvStage').innerHTML = photo(PV.a, L[PV.i], 'v0').replace('xMidYMid slice','xMidYMid meet').replace(' loading="lazy"','');
  document.getElementById('pvCnt').textContent = `${PV.i+1} / ${N}`;
  pvEl().classList.toggle('single', N < 2); }
function openViewer(a, i){ PV.a = a; const v = pvEl(); v.hidden = false; document.body.classList.add('pv-open'); pvGo(i||0); v.querySelector('.pv-x').focus({preventScroll:true}); }
function closeViewer(){ const v = document.getElementById('pview'); if(!v || v.hidden) return; v.hidden = true; document.body.classList.remove('pv-open');
  if(PV.a && M.apt === PV.a && document.querySelector('.pgal')) setSlide(PV.i); }
document.addEventListener('keydown', e=>{ const v = document.getElementById('pview'); if(!v || v.hidden) return;
  if(e.key==='Escape'){ e.stopImmediatePropagation(); closeViewer(); }
  else if(e.key==='ArrowRight'){ e.preventDefault(); pvGo(PV.i+1); } else if(e.key==='ArrowLeft'){ e.preventDefault(); pvGo(PV.i-1); } }, true);

/* ---------- фото квартир: владелец / администратор (index.html#photos) ----------
   Порядок хранится в st.aptPhotos[aptId] (= a.photos на сайте), первое фото — главное. */
const PE = {apt:1};
function peSave(id, L){ const r = Store.update(st=>{ st.aptPhotos = st.aptPhotos || {}; st.aptPhotos[id] = L; }); if(!r.ok){ toast(tx('Не хватает места в браузере — уменьшите число фото')); return false; } return true; }
function peResize(file){ return new Promise((res, rej)=>{ const fr = new FileReader(); fr.onerror = rej; fr.onload = ()=>{ const im = new Image(); im.onerror = rej; im.onload = ()=>{
  const k = Math.min(1, 1400 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width*k); c.height = Math.round(im.height*k);
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', .82)); }; im.src = fr.result; }; fr.readAsDataURL(file); }); }
function peRender(){
  let v = document.getElementById('peditor'); if(!v){ v = document.createElement('div'); v.id = 'peditor'; document.body.appendChild(v); }
  v.hidden = false; document.body.classList.add('pv-open');
  const u = Auth.check('panel');
  if(!u || !(u.role==='owner' || u.role==='admin')){
    v.innerHTML = `<div class="pe-card pe-login"><h2>${tx('Фото квартир')}</h2><p class="muted">${tx('Раздел для владельца и администратора. Демо-вход без пароля:')}</p>
      <div class="pe-row"><button type="button" class="btn brand" data-pe-login="owner">${tx('Войти как владелец')}</button><button type="button" class="btn" data-pe-login="admin">${tx('Войти как администратор')}</button></div>
      <p><a href="#" data-pe-close>${tx('← На сайт')}</a></p></div>`; return; }
  const a = gById(PE.apt) || gById(1), L = aptPhotos(a).slice();
  v.innerHTML = `<div class="pe-card"><div class="pe-head"><div><h2>${tx('Фото квартир')}</h2><div class="muted" style="font-size:13px">${esc(u.name)} · ${esc(ROLE_NAME[u.role])} · ${tx('первое фото — главное, оно на карточке в каталоге')}</div></div><a href="#" class="btn" data-pe-close>${tx('← На сайт')}</a></div>
    <div class="pe-row"><select class="inp" id="peApt" style="max-width:360px">${guestApts.map(x=>`<option value="${x.id}" ${x.id===a.id?'selected':''}>${esc(x.title)}</option>`).join('')}</select>
      <label class="btn brand pe-up">${ic('plus',16)} ${tx('Добавить фото')}<input type="file" id="peFile" accept="image/*" multiple hidden></label>
      <button type="button" class="btn" data-pe-open="${a.id}">${tx('Открыть карточку')}</button></div>
    <p class="muted" style="font-size:12.5px">${tx('Рекомендуем горизонтальные фото 4:3 — в сетке они обрезаются по центру. Вертикальные тоже можно: в полноэкранном просмотре они показываются целиком.')}</p>
    <div class="pe-grid">${L.map((p,i)=>`<div class="pe-it ${i===0?'main':''}" data-pe-i="${i}"><div class="pe-ph">${photo(a,p,'e'+i)}${i===0?`<span class="pe-badge">${tx('Главное')}</span>`:''}</div>
      <div class="pe-act"><button type="button" class="btn sm" data-pe="main" ${i===0?'disabled':''}>${tx('Главным')}</button><button type="button" class="btn sm" data-pe="left" ${i===0?'disabled':''} aria-label="${tx('Левее')}">←</button><button type="button" class="btn sm" data-pe="right" ${i===L.length-1?'disabled':''} aria-label="${tx('Правее')}">→</button><button type="button" class="btn sm pe-del" data-pe="del" ${L.length<2?`disabled title="${tx('Нельзя удалить последнее фото')}"`:''}>${tx('Удалить')}</button></div></div>`).join('')}</div>
    ${L.length<2?`<p class="muted" style="font-size:12.5px">${tx('Последнее фото удалить нельзя — у квартиры должно быть хотя бы одно фото.')}</p>`:''}
    ${peInfoHTML(a)}</div>`;
}
/* ---------- удобства и правила проживания квартиры (сохраняются сразу, st.aptInfo[aptId]) ---------- */
const HH = []; for(let h=0;h<24;h++) for(const m of ['00','30']) HH.push(String(h).padStart(2,'0')+':'+m);
const tOpts = v => HH.map(t=>`<option ${t===v?'selected':''}>${t}</option>`).join('');
const yn = (name, v, yes, no) => `<select class="inp" data-rule="${name}" data-bool="1"><option value="1" ${v?'selected':''}>${yes||L2('Да','Yes')}</option><option value="0" ${v?'':'selected'}>${no||L2('Нет','No')}</option></select>`;
function peInfoHTML(a){ const I = a.info, r = I.rules, cat = amenCatalog(), on = new Set(I.amen);
  return `<div class="pe-sec" id="peAmen"><h3>${L2('Удобства','Amenities')}</h3><p class="muted" style="font-size:12.5px;margin:0 0 10px">${L2('Отмеченные удобства показываются в карточке квартиры: первые 8 — сразу, остальные — по кнопке «Показать все удобства».','Checked amenities appear on the apartment card: the first 8 right away, the rest under “Show all amenities”.')}</p>
    <div class="pe-amen">${AMEN_GROUPS.map(([g,ru,en])=>`<div class="pe-ag"><b>${L2(ru,en)}</b>${cat.filter(c=>c.group===g).map(c=>`<label class="pe-chk"><input type="checkbox" data-amen="${esc(c.id)}" ${on.has(c.id)?'checked':''}> ${ic(c.icon,16)} <span>${esc(L2(c.ru,c.en))}${c.custom?` <small class="muted">· ${L2('своё','custom')}</small>`:''}</span></label>${c.id==='wifi'?`<input class="inp pe-wifi" id="peWifi" value="${esc(I.wifiSpeed||'')}" placeholder="${L2('скорость, напр. 200 Мбит/с','speed, e.g. 200 Mbps')}" ${on.has('wifi')?'':'disabled'}>`:''}`).join('')}</div>`).join('')}</div>
    <div class="pe-row pe-custom"><input class="inp" id="peCName" placeholder="${L2('Своё удобство, напр. «Проектор»','Custom amenity, e.g. “Projector”')}" maxlength="40" style="max-width:280px"><select class="inp" id="peCGroup" style="max-width:220px">${AMEN_GROUPS.map(([g,ru,en])=>`<option value="${g}">${L2(ru,en)}</option>`).join('')}</select><button type="button" class="btn" data-pe-addamen>${ic('plus',16)} ${L2('Добавить в каталог','Add to catalogue')}</button></div>
    <p class="muted" style="font-size:12px;margin:0">${L2('Своё удобство добавляется один раз и становится доступно для всех квартир.','A custom amenity is added once and becomes available for all apartments.')}</p></div>
  <div class="pe-sec" id="peRules"><h3>${L2('Правила проживания','House rules')}</h3><div class="pe-rules">
    <label>${L2('Заезд с','Check-in from')}<select class="inp" data-rule="ci">${tOpts(r.ci)}</select></label>
    <label>${L2('Выезд до','Check-out by')}<select class="inp" data-rule="co">${tOpts(r.co)}</select></label>
    <label>${L2('Ранний заезд по запросу','Early check-in on request')}${yn('early', r.early)}</label>
    <label>${L2('Можно с животными','Pets allowed')}${yn('pets', r.pets)}</label>
    <label>${L2('Вечеринки','Parties')}${yn('parties', r.parties, L2('Можно','Allowed'), L2('Нельзя','Not allowed'))}</label>
    <label>${L2('Курение','Smoking')}<select class="inp" data-rule="smoking">${[['no','Нельзя','Not allowed'],['balcony','На балконе','On the balcony'],['yes','Можно','Allowed']].map(([k,ru,en])=>`<option value="${k}" ${r.smoking===k?'selected':''}>${L2(ru,en)}</option>`).join('')}</select></label>
    <label>${L2('Тихие часы','Quiet hours')}${yn('quiet', r.quiet, L2('Есть','On'), L2('Нет','Off'))}</label>
    <label>${L2('Тишина с','Quiet from')}<select class="inp" data-rule="quietFrom" ${r.quiet?'':'disabled'}>${tOpts(r.quietFrom)}</select></label>
    <label>${L2('Тишина до','Quiet until')}<select class="inp" data-rule="quietTo" ${r.quiet?'':'disabled'}>${tOpts(r.quietTo)}</select></label>
    <label>${L2('Залог','Deposit')}<select class="inp" id="peDepOn"><option value="0" ${+r.deposit>0?'':'selected'}>${L2('Без залога','None')}</option><option value="1" ${+r.deposit>0?'selected':''}>${L2('Сумма, ₸','Amount, ₸')}</option></select></label>
    <label>${L2('Сумма залога, ₸','Deposit amount, ₸')}<input class="inp" type="number" min="0" step="1000" data-rule="deposit" id="peDep" value="${+r.deposit>0?+r.deposit:''}" ${+r.deposit>0?'':'disabled'}></label>
  </div><p class="muted" style="font-size:12px;margin:8px 0 0">${L2('«Можно с животными» включает квартиру в фильтр «с животными» и доплату за питомца, как раньше. Изменения сохраняются сразу.','“Pets allowed” puts the apartment into the pets filter and applies the pet surcharge as before. Changes are saved immediately.')}</p></div>`;
}
function peSaveInfo(fn){ const a = gById(PE.apt); const I = JSON.parse(JSON.stringify(a.info)); fn(I);
  const r = Store.update(st=>{ st.aptInfo = st.aptInfo || {}; st.aptInfo[a.id] = I; });
  if(!r.ok){ toast(tx('Не хватает места в браузере')); return; } applyAptInfo(a); toast(L2('Сохранено','Saved')); setTimeout(peRender, 0); }
function peClose(){ const v = document.getElementById('peditor'); if(v){ v.hidden = true; } document.body.classList.remove('pv-open'); if(location.hash==='#photos') history.replaceState(null,'',location.pathname+location.search); renderGrid(); }
document.addEventListener('click', e=>{ const v = document.getElementById('peditor'); if(!v || v.hidden || !v.contains(e.target)) return;
  const lg = e.target.closest('[data-pe-login]'); if(lg){ Auth.login(lg.dataset.peLogin); peRender(); return; }
  if(e.target.closest('[data-pe-close]')){ e.preventDefault(); peClose(); return; }
  const op = e.target.closest('[data-pe-open]'); if(op){ peClose(); openApt(+op.dataset.peOpen); return; }
  if(e.target.closest('[data-pe-addamen]')){ const nm = $id('peCName').value.trim(), g = $id('peCGroup').value; if(!nm){ toast(L2('Введите название удобства','Enter the amenity name')); return; }
    const st = Store.load(), exists = amenCatalog(st).some(c=>c.ru.toLowerCase()===nm.toLowerCase() || c.en.toLowerCase()===nm.toLowerCase()); if(exists){ toast(L2('Такое удобство уже есть в каталоге','This amenity is already in the catalogue')); return; }
    const id = 'c' + Date.now().toString(36); Store.update(s2=>{ s2.amenCustom = (s2.amenCustom||[]).concat([{id, name:nm, group:g}]); });
    peSaveInfo(I=>{ I.amen.push(id); }); return; }
  const b = e.target.closest('[data-pe]'); if(!b || b.disabled) return;
  const a = gById(PE.apt), L = aptPhotos(a).slice(), i = +b.closest('[data-pe-i]').dataset.peI, k = b.dataset.pe;
  if(k==='main') L.unshift(L.splice(i,1)[0]);
  else if(k==='left' && i>0) [L[i-1], L[i]] = [L[i], L[i-1]];
  else if(k==='right' && i<L.length-1) [L[i+1], L[i]] = [L[i], L[i+1]];
  else if(k==='del'){ if(L.length<2){ toast(tx('Нельзя удалить последнее фото')); return; } if(!confirm(tx('Удалить это фото?'))) return; L.splice(i,1); }
  if(peSave(a.id, L)) peRender(); }, true);
document.addEventListener('change', async e=>{
  if(e.target.id==='peApt'){ PE.apt = +e.target.value; peRender(); return; }
  const am = e.target.dataset && e.target.dataset.amen; if(am){ const v = e.target.checked; peSaveInfo(I=>{ I.amen = I.amen.filter(x=>x!==am); if(v) I.amen.push(am); }); return; }
  if(e.target.id==='peWifi'){ const v = e.target.value.trim().slice(0,30); peSaveInfo(I=>{ I.wifiSpeed = v; }); return; }
  if(e.target.id==='peDepOn'){ const on = e.target.value==='1'; peSaveInfo(I=>{ I.rules.deposit = on ? (+I.rules.deposit>0 ? +I.rules.deposit : 20000) : 0; }); return; }
  const rk = e.target.dataset && e.target.dataset.rule; if(rk){ const el = e.target; let v = el.value;
    if(el.dataset.bool) v = v==='1'; else if(rk==='deposit') v = Math.max(0, Math.round(+v||0));
    peSaveInfo(I=>{ I.rules[rk] = v; }); return; }
  if(e.target.id==='peFile'){ const fs = [...e.target.files].filter(f=>/^image\//.test(f.type)); if(!fs.length) return;
    const a = gById(PE.apt), L = aptPhotos(a).slice();
    for(const f of fs){ try{ L.push(await peResize(f)); }catch(err){ toast(tx('Не удалось прочитать файл')+' '+f.name); } }
    if(peSave(a.id, L)){ toast(tx('Фото добавлены')); peRender(); } }
});
const $id = id => document.getElementById(id);
/* ---------- «Показать все удобства» — шторка со всеми удобствами по группам ---------- */
function openAmenAll(){ const a = M.apt; if(!a) return; let v = $id('amenAll'); if(!v){ v = document.createElement('div'); v.id = 'amenAll'; v.setAttribute('role','dialog'); v.setAttribute('aria-modal','true'); document.body.appendChild(v); }
  v.innerHTML = `<div class="aa-card"><div class="aa-h"><h3>${L2('Все удобства','All amenities')}</h3><button type="button" class="mclose" data-aaclose aria-label="${tx('Закрыть')}">${ic('x',18)}</button></div><div class="aa-b">${amenAllHTML(a)}</div></div>`;
  v.hidden = false; v.querySelector('[data-aaclose]').focus({preventScroll:true}); }
function closeAmenAll(){ const v = $id('amenAll'); if(v) v.hidden = true; }
document.addEventListener('click', e=>{ if(e.target.closest && e.target.closest('[data-amenall]')){ e.stopPropagation(); openAmenAll(); return; }
  const v = $id('amenAll'); if(v && !v.hidden && (e.target===v || e.target.closest('[data-aaclose]'))){ e.stopPropagation(); closeAmenAll(); } }, true);
document.addEventListener('keydown', e=>{ const v = $id('amenAll'); if(e.key==='Escape' && v && !v.hidden){ e.stopImmediatePropagation(); closeAmenAll(); } }, true);
function peRoute(){ if(location.hash==='#photos') peRender(); }
window.addEventListener('hashchange', peRoute); peRoute();
window.setSlide = setSlide; window.openViewer = openViewer;
})();
