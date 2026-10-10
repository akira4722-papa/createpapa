(() => {
  'use strict';
  const STORE_KEY = 'familyPetMock.v1';
  const today = new Date();
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const pretty = value => {
    if (!value) return '未登録';
    const d = new Date(`${value}T00:00:00`);
    return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
  };
  const ageLabel = value => {
    if (!value) return '未登録';
    const born = new Date(`${value}T00:00:00`);
    if (Number.isNaN(born.getTime()) || born > today) return pretty(value);
    let years = today.getFullYear() - born.getFullYear();
    let months = today.getMonth() - born.getMonth();
    if (today.getDate() < born.getDate()) months--;
    if (months < 0) { years--; months += 12; }
    return years > 0 ? `${years}歳${months}か月` : `${Math.max(0,months)}か月`;
  };
  const photoFallback = 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1000&q=82';
  const typeInfo = {
    daily: { label:'日々の様子', icon:'☀️', cls:'daily' },
    symptom: { label:'異変・症状', icon:'🩺', cls:'symptom' },
    vet: { label:'通院', icon:'🏥', cls:'vet' },
    medicine: { label:'薬・処置', icon:'💊', cls:'medicine' }
  };
  const seedDate = new Date(today); seedDate.setDate(seedDate.getDate()-2);
  const seedVet = new Date(today); seedVet.setDate(seedVet.getDate()-12);
  const initial = {
    selectedPetId:'pet-sample-cat',
    pets:[{id:'pet-sample-cat',name:'名前を登録',birthday:'',species:'猫・長毛種',photo:photoFallback,description:'プロフィール編集から名前や生年月日、写真を登録できます。'}],
    entries:[
      {id:'sample-vet',petId:'pet-sample-cat',date:fmt(seedVet),type:'vet',title:'動物病院での診察メモ',body:'診察で聞いたことや、帰宅後の様子をここに記録します。次回の診察時に見返せるよう、先生からの説明も残しておくと便利です。',clinic:'病院名を入力',treatment:'診断・処方・次回予約など',photos:[],sample:true},
      {id:'sample-symptom',petId:'pet-sample-cat',date:fmt(seedDate),type:'symptom',title:'いつもと違う様子に気づいた',body:'例：食欲、飲水量、排泄、歩き方、皮膚の状態など。気づいた時間と、その後の変化をメモ。',clinic:'',treatment:'',photos:[photoFallback],sample:true}
    ]
  };
  let state;
  try { state = JSON.parse(localStorage.getItem(STORE_KEY)) || initial; }
  catch { state = initial; }
  if (!Array.isArray(state.pets) || !state.pets.length) state = initial;
  let activeFilter = 'all';
  let pendingPhotos = [];
  let pendingProfilePhoto = '';
  let editingEntryId = null;
  const $ = id => document.getElementById(id);
  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); return true; }
    catch (e) { alert('ブラウザ内の保存容量が足りない可能性があります。写真の枚数やサイズを減らしてお試しください。'); return false; }
  }
  function currentPet() { return state.pets.find(p => p.id === state.selectedPetId) || state.pets[0]; }
  function escapeHTML(value='') { return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
  function imageHTML(src, alt, cls='') {
    if (!src) return `<div class="pet-profile-photo-placeholder ${cls}">🐾</div>`;
    return `<img class="${cls}" src="${escapeHTML(src)}" alt="${escapeHTML(alt)}" onerror="this.onerror=null;this.src='${photoFallback}'">`;
  }
  function renderPets() {
    $('petCount').textContent = `${state.pets.length}匹`;
    $('petSwitcher').innerHTML = state.pets.map(p => `
      <button type="button" class="pet-switch-card ${p.id===state.selectedPetId?'active':''}" data-pet-id="${escapeHTML(p.id)}">
        ${p.photo ? imageHTML(p.photo,p.name) : '<span class="pet-switch-avatar">🐾</span>'}
        <span><span class="pet-switch-name">${escapeHTML(p.name)}</span><span class="pet-switch-meta">${escapeHTML(p.species||'種類未登録')}</span></span>
      </button>`).join('') + `
      <button type="button" class="pet-switch-card" id="addPetInline"><span class="pet-switch-avatar">＋</span><span><span class="pet-switch-name">ペットを追加</span><span class="pet-switch-meta">プロフィールを登録</span></span></button>`;
    $('petSwitcher').querySelectorAll('[data-pet-id]').forEach(btn => btn.addEventListener('click', () => { state.selectedPetId=btn.dataset.petId; persist(); render(); }));
    $('addPetInline').addEventListener('click', openProfileModal);
  }
  function renderProfile() {
    const p = currentPet();
    const photo = p.photo ? imageHTML(p.photo,p.name,'pet-profile-photo') : '<div class="pet-profile-photo-placeholder">🐾</div>';
    $('petProfile').innerHTML = `${photo}<div class="pet-profile-info"><span class="pet-profile-kicker">A MEMBER OF OUR FAMILY</span><div class="pet-profile-name-row"><h2 class="pet-profile-name">${escapeHTML(p.name)}</h2><button class="pet-edit-button" id="editPetProfile">✎ 編集</button></div><div class="pet-profile-tags"><span class="pet-tag">🐾 ${escapeHTML(p.species||'種類未登録')}</span><span class="pet-tag">💚 家族の一員</span></div><div class="pet-facts"><div><span class="pet-fact-label">生年月日</span><span class="pet-fact-value">${escapeHTML(pretty(p.birthday))}</span></div><div><span class="pet-fact-label">年齢</span><span class="pet-fact-value">${escapeHTML(ageLabel(p.birthday))}</span></div><div><span class="pet-fact-label">記録数</span><span class="pet-fact-value">${state.entries.filter(e=>e.petId===p.id).length}件</span></div></div><p class="pet-summary">${escapeHTML(p.description||'日々の様子や通院記録を、ここにまとめて残せます。')}</p></div>`;
    $('editPetProfile').addEventListener('click', () => openProfileModal(p));
  }
  function dateParts(value) {
    const d = new Date(`${value}T00:00:00`);
    return {month:`${d.getMonth()+1}月`,day:d.getDate(),weekday:['日','月','火','水','木','金','土'][d.getDay()]};
  }
  function renderEntries() {
    const q = $('journalSearch').value.trim().toLowerCase();
    const p = currentPet();
    const items = state.entries.filter(e => e.petId===p.id && (activeFilter==='all'||e.type===activeFilter) && (!q || [e.title,e.body,e.clinic,e.treatment].join(' ').toLowerCase().includes(q))).sort((a,b)=>b.date.localeCompare(a.date));
    if (!items.length) {
      $('journalList').innerHTML = '<div class="journal-empty"><strong>まだ記録がありません</strong><span>小さな変化に気づいたときや、通院した日に記録してみましょう。<br>写真も一緒に残せます。</span></div>';
      return;
    }
    $('journalList').innerHTML = items.map(e => {
      const d = dateParts(e.date); const type = typeInfo[e.type] || typeInfo.daily;
      const extra = [e.clinic ? `<span>🏥 ${escapeHTML(e.clinic)}</span>`:'',e.treatment ? `<span>📋 ${escapeHTML(e.treatment)}</span>`:''].filter(Boolean).join('');
      const photos = (e.photos||[]).map((src,i)=>`<button type="button" data-photo="${escapeHTML(src)}" aria-label="添付写真${i+1}を拡大">${imageHTML(src,`${e.title} 添付写真`)}</button>`).join('');
      return `<article class="journal-entry"><div class="entry-date"><span class="entry-date-month">${d.month}</span><strong class="entry-date-day">${d.day}</strong><span class="entry-date-weekday">${d.weekday}曜日</span></div><div class="entry-main"><span class="entry-type ${type.cls}">${type.icon} ${type.label}${e.sample?'<small class="entry-sample">表示例</small>':''}</span><h3 class="entry-title">${escapeHTML(e.title)}</h3>${e.body?`<p class="entry-body">${escapeHTML(e.body)}</p>`:''}${extra?`<div class="entry-extra">${extra}</div>`:''}${photos?`<div class="entry-photos">${photos}</div>`:''}</div><div class="entry-actions"><button class="entry-action" data-edit-entry="${escapeHTML(e.id)}">編集</button><button class="entry-action delete" data-delete-entry="${escapeHTML(e.id)}">削除</button></div></article>`;
    }).join('');
    $('journalList').querySelectorAll('[data-photo]').forEach(btn => btn.addEventListener('click', () => openLightbox(btn.dataset.photo)));
    $('journalList').querySelectorAll('[data-edit-entry]').forEach(btn => btn.addEventListener('click', () => openEntryModal(state.entries.find(e=>e.id===btn.dataset.editEntry))));
    $('journalList').querySelectorAll('[data-delete-entry]').forEach(btn => btn.addEventListener('click', () => { const e=state.entries.find(x=>x.id===btn.dataset.deleteEntry); if (!e || !confirm(`「${e.title}」を削除しますか？`)) return; state.entries=state.entries.filter(x=>x.id!==e.id); persist(); render(); }));
  }
  function renderFilters() { document.querySelectorAll('.filter-chip').forEach(btn=>btn.classList.toggle('active',btn.dataset.filter===activeFilter)); }
  function render() { renderPets(); renderProfile(); renderEntries(); renderFilters(); }
  function showModal(id) { $(id).classList.add('show'); $(id).setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
  function hideModal(id) { $(id).classList.remove('show'); $(id).setAttribute('aria-hidden','true'); if (!document.querySelector('.pet-modal-backdrop.show')) document.body.style.overflow=''; }
  function openEntryModal(entry=null) {
    editingEntryId = entry?.id || null; pendingPhotos = [...(entry?.photos||[])];
    $('entryForm').reset(); $('entryDate').value=entry?.date||fmt(today); $('entryType').value=entry?.type||'daily'; $('entryTitle').value=entry?.title||''; $('entryBody').value=entry?.body||''; $('entryClinic').value=entry?.clinic||''; $('entryTreatment').value=entry?.treatment||''; $('entryPhotos').value=''; $('uploadPreview').innerHTML=pendingPhotos.map(src=>`<img src="${escapeHTML(src)}" alt="添付予定の写真">`).join(''); $('petModalTitle').textContent=entry?'記録を編集':'記録を追加'; $('saveEntry').textContent=entry?'変更を保存':'記録を保存'; $('vetFields').style.display=$('entryType').value==='vet'||$('entryType').value==='medicine'?'grid':'none'; showModal('petModal'); setTimeout(()=>$('entryTitle').focus(),80);
  }
  function openProfileModal(pet=null) {
    pendingProfilePhoto=''; $('profileForm').reset(); $('profileModalTitle').textContent=pet?'プロフィールを編集':'ペットを追加';
    $('profileName').value=pet?.name==='名前を登録'?'':(pet?.name||''); $('profileBirthday').value=pet?.birthday||''; $('profileSpecies').value=pet?.species||''; pendingProfilePhoto=pet?.photo||''; $('profilePhotoPreview').innerHTML=pendingProfilePhoto?`<img src="${escapeHTML(pendingProfilePhoto)}" alt="プロフィール写真プレビュー">`:''; $('profileForm').dataset.editPetId=pet?.id||''; showModal('profileModal');
  }
  function readImage(file) {
    return new Promise((resolve,reject)=>{
      const reader=new FileReader(); reader.onerror=()=>reject(new Error('写真を読み込めませんでした。')); reader.onload=()=>{
        const img=new Image(); img.onerror=()=>resolve(reader.result); img.onload=()=>{
          const scale=Math.min(1,1200/Math.max(img.width,img.height)); const canvas=document.createElement('canvas'); canvas.width=Math.round(img.width*scale); canvas.height=Math.round(img.height*scale); canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height); resolve(canvas.toDataURL('image/jpeg',.78));
        }; img.src=reader.result;
      }; reader.readAsDataURL(file);
    });
  }
  $('entryType').addEventListener('change',()=>{$('vetFields').style.display=$('entryType').value==='vet'||$('entryType').value==='medicine'?'grid':'none';});
  $('entryPhotos').addEventListener('change',async e=>{
    const files=Array.from(e.target.files||[]).slice(0,6); try { const loaded=await Promise.all(files.map(readImage)); pendingPhotos=[...pendingPhotos,...loaded].slice(0,6); $('uploadPreview').innerHTML=pendingPhotos.map(src=>`<img src="${escapeHTML(src)}" alt="添付予定の写真">`).join(''); } catch(err){alert(err.message);} e.target.value='';
  });
  $('entryForm').addEventListener('submit',e=>{
    e.preventDefault(); const old=state.entries.find(x=>x.id===editingEntryId); const item={id:editingEntryId||`entry-${Date.now()}`,petId:currentPet().id,date:$('entryDate').value,type:$('entryType').value,title:$('entryTitle').value.trim(),body:$('entryBody').value.trim(),clinic:$('entryClinic').value.trim(),treatment:$('entryTreatment').value.trim(),photos:pendingPhotos,sample:false};
    if(!item.date||!item.title){alert('日付とタイトルを入力してください。');return;} if(old) state.entries=state.entries.map(x=>x.id===old.id?item:x); else state.entries.push(item); if(persist()){hideModal('petModal');render();}
  });
  $('profilePhoto').addEventListener('change',async e=>{const file=e.target.files?.[0]; if(!file)return; try{pendingProfilePhoto=await readImage(file); $('profilePhotoPreview').innerHTML=`<img src="${escapeHTML(pendingProfilePhoto)}" alt="プロフィール写真プレビュー">`;}catch(err){alert(err.message);}});
  $('profileForm').addEventListener('submit',e=>{
    e.preventDefault(); const id=$('profileForm').dataset.editPetId; const data={name:$('profileName').value.trim(),birthday:$('profileBirthday').value,species:$('profileSpecies').value.trim(),photo:pendingProfilePhoto||'',description:'日々の様子や通院記録を、ここにまとめて残せます。'}; if(!data.name){alert('名前を入力してください。');return;}
    if(id){const p=state.pets.find(x=>x.id===id); if(p)Object.assign(p,data);} else {const p={id:`pet-${Date.now()}`,...data}; state.pets.push(p); state.selectedPetId=p.id;}
    if(persist()){hideModal('profileModal');render();}
  });
  function openLightbox(src){$('lightboxImage').src=src;$('photoLightbox').classList.add('show');$('photoLightbox').setAttribute('aria-hidden','false');}
  function closeLightbox(){$('photoLightbox').classList.remove('show');$('photoLightbox').setAttribute('aria-hidden','true');$('lightboxImage').src='';}
  $('addEntryTop').addEventListener('click',()=>openEntryModal()); $('addPetTop').addEventListener('click',openProfileModal); $('closePetModal').addEventListener('click',()=>hideModal('petModal')); $('cancelEntry').addEventListener('click',()=>hideModal('petModal')); $('closeProfileModal').addEventListener('click',()=>hideModal('profileModal')); $('cancelProfile').addEventListener('click',()=>hideModal('profileModal')); $('closeLightbox').addEventListener('click',closeLightbox); $('photoLightbox').addEventListener('click',e=>{if(e.target===$('photoLightbox'))closeLightbox();});
  document.querySelectorAll('.filter-chip').forEach(btn=>btn.addEventListener('click',()=>{activeFilter=btn.dataset.filter;renderEntries();renderFilters();})); $('journalSearch').addEventListener('input',renderEntries);
  document.querySelectorAll('.pet-modal-backdrop').forEach(el=>el.addEventListener('click',e=>{if(e.target===el)hideModal(el.id);})); document.addEventListener('keydown',e=>{if(e.key==='Escape'){hideModal('petModal');hideModal('profileModal');closeLightbox();}});
  render();
})();
