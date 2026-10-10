(() => {
  'use strict';

  // js/app.js と同じ Supabase URL / Publishable key を設定してください。
  const SUPABASE_URL = 'https://pwgmsbzbnihnemveggsl.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_9yxCklCNudnEnIlWoGfRgw_kOLcbDxS';
  const PHOTO_BUCKET = 'family-pet-photos';
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const today = new Date();
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const pretty = value => { if (!value) return '未登録'; const d = new Date(`${value}T00:00:00`); return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`; };
  const ageLabel = value => {
    if (!value) return '未登録';
    const born = new Date(`${value}T00:00:00`);
    if (Number.isNaN(born.getTime()) || born > today) return pretty(value);
    let years=today.getFullYear()-born.getFullYear(), months=today.getMonth()-born.getMonth();
    if (today.getDate()<born.getDate()) months--;
    if (months<0) { years--; months+=12; }
    return years>0 ? `${years}歳${months}か月` : `${Math.max(0,months)}か月`;
  };
  const typeInfo = {
    daily:{label:'日々の様子',icon:'☀️',cls:'daily'},
    symptom:{label:'異変・症状',icon:'🩺',cls:'symptom'},
    vet:{label:'通院',icon:'🏥',cls:'vet'},
    medicine:{label:'薬・処置',icon:'💊',cls:'medicine'}
  };
  let state={selectedPetId:null,pets:[],entries:[]};
  let currentUser=null, activeFilter='all', pendingPhotos=[], pendingProfilePhoto='', editingEntryId=null;
  const signedPhotoUrls = new Map();
  const $ = id => document.getElementById(id);
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function status(message, error=false) { const el=$('petStatus'); if(el){el.textContent=message;el.style.color=error?'#b42318':'';} }
  function photoSrc(path) { if (!path) return ''; if (path.startsWith('data:') || /^https?:\/\//i.test(path)) return path; return signedPhotoUrls.get(path) || ''; }
  function imageHTML(path,alt,cls='') { const src=photoSrc(path); return src ? `<img class="${cls}" src="${escapeHTML(src)}" alt="${escapeHTML(alt)}">` : `<div class="pet-profile-photo-placeholder ${cls}">🐾</div>`; }
  function currentPet() { return state.pets.find(p=>p.id===state.selectedPetId) || state.pets[0] || null; }

  async function createSignedUrl(path) {
    if (!path || path.startsWith('data:') || /^https?:\/\//i.test(path)) return;
    if (signedPhotoUrls.has(path)) return;
    const {data,error}=await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path,604800);
    if (!error && data?.signedUrl) signedPhotoUrls.set(path,data.signedUrl);
  }
  async function refreshPhotoUrls() {
    const paths=[];
    state.pets.forEach(p=>{if(p.photo)paths.push(p.photo);});
    state.entries.forEach(e=>(e.photos||[]).forEach(x=>paths.push(x)));
    await Promise.all([...new Set(paths)].filter(x=>x && !x.startsWith('data:') && !/^https?:\/\//i.test(x)).map(createSignedUrl));
  }
  async function uploadDataImage(dataUrl, folder) {
    if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl || '';
    const response=await fetch(dataUrl); const blob=await response.blob();
    const path=`${currentUser.id}/${folder}/${uid()}.jpg`;
    const {error}=await supabase.storage.from(PHOTO_BUCKET).upload(path,blob,{contentType:'image/jpeg',upsert:false});
    if(error) throw error;
    await createSignedUrl(path);
    return path;
  }
  async function uploadPendingImages() {
    for (const pet of state.pets) if (pet.photo?.startsWith('data:')) pet.photo=await uploadDataImage(pet.photo,`profiles/${pet.id}`);
    for (const entry of state.entries) {
      const uploaded=[];
      for (const photo of (entry.photos||[])) uploaded.push(photo?.startsWith('data:') ? await uploadDataImage(photo,`entries/${entry.id}`) : photo);
      entry.photos=uploaded;
    }
  }
  async function persist() {
    try {
      await uploadPendingImages();
      const payload={selectedPetId:state.selectedPetId,pets:state.pets,entries:state.entries};
      const {error}=await supabase.from('family_pet_state').upsert({user_id:currentUser.id,data:payload,updated_at:new Date().toISOString()},{onConflict:'user_id'});
      if(error) throw error;
      await refreshPhotoUrls();
      status('保存済み · 家族の端末と共有中');
      return true;
    } catch(err) {
      console.error(err); status(`保存できませんでした：${err.message || 'Supabase設定を確認してください'}`,true);
      alert(`保存できませんでした。\n${err.message || 'Supabaseの設定とSQLを確認してください。'}`); return false;
    }
  }
  async function loadState() {
    const {data,error}=await supabase.from('family_pet_state').select('data').eq('user_id',currentUser.id).maybeSingle();
    if(error) throw error;
    if(data?.data && Array.isArray(data.data.pets) && Array.isArray(data.data.entries)) state=data.data;
    else state={selectedPetId:null,pets:[],entries:[]};
    if(!state.pets.some(p=>p.id===state.selectedPetId)) state.selectedPetId=state.pets[0]?.id || null;
    await refreshPhotoUrls(); render();
    status('保存先に接続済み · 家族の端末と共有できます');
  }

  function renderPets() {
    $('petCount').textContent=`${state.pets.length}匹`;
    $('petSwitcher').innerHTML=state.pets.map(p=>`<button type="button" class="pet-switch-card ${p.id===state.selectedPetId?'active':''}" data-pet-id="${escapeHTML(p.id)}">${p.photo?imageHTML(p.photo,p.name):'<span class="pet-switch-avatar">🐾</span>'}<span><span class="pet-switch-name">${escapeHTML(p.name)}</span><span class="pet-switch-meta">${escapeHTML(p.species||'種類未登録')}</span></span></button>`).join('')+`<button type="button" class="pet-switch-card" id="addPetInline"><span class="pet-switch-avatar">＋</span><span><span class="pet-switch-name">ペットを追加</span><span class="pet-switch-meta">プロフィールを登録</span></span></button>`;
    $('petSwitcher').querySelectorAll('[data-pet-id]').forEach(btn=>btn.addEventListener('click',async()=>{state.selectedPetId=btn.dataset.petId; await persist();render();}));
    $('addPetInline').addEventListener('click',()=>openProfileModal());
  }
  function renderProfile() {
    const p=currentPet();
    if(!p){$('petProfile').innerHTML='<div class="pet-empty-profile"><div class="pet-profile-photo-placeholder">🐾</div><div class="pet-profile-info"><h2>ペットを登録しましょう</h2><p>名前や生年月日、プロフィール写真を登録すると、健康・通院日記を残せます。</p><button type="button" class="pet-primary" id="firstPetButton">＋ 最初のペットを登録</button></div></div>';$('firstPetButton').addEventListener('click',()=>openProfileModal());return;}
    const photo=p.photo?imageHTML(p.photo,p.name,'pet-profile-photo'):'<div class="pet-profile-photo-placeholder">🐾</div>';
    $('petProfile').innerHTML=`${photo}<div class="pet-profile-info"><span class="pet-profile-kicker">A MEMBER OF OUR FAMILY</span><div class="pet-profile-name-row"><h2 class="pet-profile-name">${escapeHTML(p.name)}</h2><button class="pet-edit-button" id="editPetProfile">✎ 編集</button></div><div class="pet-profile-tags"><span class="pet-tag">🐾 ${escapeHTML(p.species||'種類未登録')}</span><span class="pet-tag">💚 家族の一員</span></div><div class="pet-facts"><div><span class="pet-fact-label">生年月日</span><span class="pet-fact-value">${escapeHTML(pretty(p.birthday))}</span></div><div><span class="pet-fact-label">年齢</span><span class="pet-fact-value">${escapeHTML(ageLabel(p.birthday))}</span></div><div><span class="pet-fact-label">記録数</span><span class="pet-fact-value">${state.entries.filter(e=>e.petId===p.id).length}件</span></div></div><p class="pet-summary">${escapeHTML(p.description||'日々の様子や通院記録を、ここにまとめて残せます。')}</p></div>`;
    $('editPetProfile').addEventListener('click',()=>openProfileModal(p));
  }
  function dateParts(value) { const d=new Date(`${value}T00:00:00`);return {month:`${d.getMonth()+1}月`,day:d.getDate(),weekday:['日','月','火','水','木','金','土'][d.getDay()]}; }
  function renderEntries() {
    const p=currentPet(), q=$('journalSearch').value.trim().toLowerCase();
    if(!p){$('journalList').innerHTML='<div class="journal-empty"><strong>まずはペットを登録してください</strong><span>プロフィール登録後、日々の様子や通院記録を追加できます。</span></div>';return;}
    const items=state.entries.filter(e=>e.petId===p.id&&(activeFilter==='all'||e.type===activeFilter)&&(!q||[e.title,e.body,e.clinic,e.treatment].join(' ').toLowerCase().includes(q))).sort((a,b)=>b.date.localeCompare(a.date));
    if(!items.length){$('journalList').innerHTML='<div class="journal-empty"><strong>まだ記録がありません</strong><span>小さな変化に気づいたときや、通院した日に記録してみましょう。<br>写真も一緒に残せます。</span></div>';return;}
    $('journalList').innerHTML=items.map(e=>{const d=dateParts(e.date),type=typeInfo[e.type]||typeInfo.daily;const extra=[e.clinic?`<span>🏥 ${escapeHTML(e.clinic)}</span>`:'',e.treatment?`<span>📋 ${escapeHTML(e.treatment)}</span>`:''].filter(Boolean).join('');const photos=(e.photos||[]).map((src,i)=>`<button type="button" data-photo-index="${i}" data-entry-photo="${escapeHTML(e.id)}" aria-label="添付写真${i+1}を拡大">${imageHTML(src,`${e.title} 添付写真`)}</button>`).join('');return `<article class="journal-entry"><div class="entry-date"><span class="entry-date-month">${d.month}</span><strong class="entry-date-day">${d.day}</strong><span class="entry-date-weekday">${d.weekday}曜日</span></div><div class="entry-main"><span class="entry-type ${type.cls}">${type.icon} ${type.label}</span><h3 class="entry-title">${escapeHTML(e.title)}</h3>${e.body?`<p class="entry-body">${escapeHTML(e.body)}</p>`:''}${extra?`<div class="entry-extra">${extra}</div>`:''}${photos?`<div class="entry-photos">${photos}</div>`:''}</div><div class="entry-actions"><button class="entry-action" data-edit-entry="${escapeHTML(e.id)}">編集</button><button class="entry-action delete" data-delete-entry="${escapeHTML(e.id)}">削除</button></div></article>`;}).join('');
    $('journalList').querySelectorAll('[data-entry-photo]').forEach(btn=>btn.addEventListener('click',()=>{const e=state.entries.find(x=>x.id===btn.dataset.entryPhoto);const src=e?.photos?.[Number(btn.dataset.photoIndex)];openLightbox(photoSrc(src));}));
    $('journalList').querySelectorAll('[data-edit-entry]').forEach(btn=>btn.addEventListener('click',()=>openEntryModal(state.entries.find(e=>e.id===btn.dataset.editEntry))));
    $('journalList').querySelectorAll('[data-delete-entry]').forEach(btn=>btn.addEventListener('click',async()=>{const e=state.entries.find(x=>x.id===btn.dataset.deleteEntry);if(!e||!confirm(`「${e.title}」を削除しますか？`))return;state.entries=state.entries.filter(x=>x.id!==e.id);if(await persist())render();}));
  }
  function renderFilters(){document.querySelectorAll('.filter-chip').forEach(btn=>btn.classList.toggle('active',btn.dataset.filter===activeFilter));}
  function render(){renderPets();renderProfile();renderEntries();renderFilters();}
  function showModal(id){$(id).classList.add('show');$(id).setAttribute('aria-hidden','false');document.body.style.overflow='hidden';}
  function hideModal(id){$(id).classList.remove('show');$(id).setAttribute('aria-hidden','true');if(!document.querySelector('.pet-modal-backdrop.show'))document.body.style.overflow='';}
  function openEntryModal(entry=null){if(!currentPet()){alert('先にペットのプロフィールを登録してください。');openProfileModal();return;}editingEntryId=entry?.id||null;pendingPhotos=[...(entry?.photos||[])];$('entryForm').reset();$('entryDate').value=entry?.date||fmt(today);$('entryType').value=entry?.type||'daily';$('entryTitle').value=entry?.title||'';$('entryBody').value=entry?.body||'';$('entryClinic').value=entry?.clinic||'';$('entryTreatment').value=entry?.treatment||'';$('entryPhotos').value='';$('uploadPreview').innerHTML=pendingPhotos.map(src=>`<img src="${escapeHTML(photoSrc(src))}" alt="添付予定の写真">`).join('');$('petModalTitle').textContent=entry?'記録を編集':'記録を追加';$('saveEntry').textContent=entry?'変更を保存':'記録を保存';$('vetFields').style.display=['vet','medicine'].includes($('entryType').value)?'grid':'none';showModal('petModal');setTimeout(()=>$('entryTitle').focus(),80);}
  function openProfileModal(pet=null){pendingProfilePhoto=pet?.photo||'';$('profileForm').reset();$('profileModalTitle').textContent=pet?'プロフィールを編集':'ペットを追加';$('profileName').value=pet?.name||'';$('profileBirthday').value=pet?.birthday||'';$('profileSpecies').value=pet?.species||'';$('profilePhotoPreview').innerHTML=pendingProfilePhoto?`<img src="${escapeHTML(photoSrc(pendingProfilePhoto))}" alt="プロフィール写真プレビュー">`:'';$('profileForm').dataset.editPetId=pet?.id||'';showModal('profileModal');}
  function readImage(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('写真を読み込めませんでした。'));reader.onload=()=>{const img=new Image();img.onerror=()=>resolve(reader.result);img.onload=()=>{const scale=Math.min(1,1200/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',.78));};img.src=reader.result;};reader.readAsDataURL(file);});}
  $('entryType').addEventListener('change',()=>{$('vetFields').style.display=['vet','medicine'].includes($('entryType').value)?'grid':'none';});
  $('entryPhotos').addEventListener('change',async e=>{const files=Array.from(e.target.files||[]).slice(0,6-pendingPhotos.length);try{const loaded=await Promise.all(files.map(readImage));pendingPhotos=[...pendingPhotos,...loaded].slice(0,6);$('uploadPreview').innerHTML=pendingPhotos.map(src=>`<img src="${escapeHTML(photoSrc(src))}" alt="添付予定の写真">`).join('');}catch(err){alert(err.message);}e.target.value='';});
  $('entryForm').addEventListener('submit',async e=>{e.preventDefault();const old=state.entries.find(x=>x.id===editingEntryId);const item={id:editingEntryId||uid(),petId:currentPet().id,date:$('entryDate').value,type:$('entryType').value,title:$('entryTitle').value.trim(),body:$('entryBody').value.trim(),clinic:$('entryClinic').value.trim(),treatment:$('entryTreatment').value.trim(),photos:pendingPhotos,sample:false};if(!item.date||!item.title){alert('日付とタイトルを入力してください。');return;}if(old)state.entries=state.entries.map(x=>x.id===old.id?item:x);else state.entries.push(item);$('saveEntry').disabled=true;try{if(await persist()){hideModal('petModal');render();}}finally{$('saveEntry').disabled=false;}});
  $('profilePhoto').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{pendingProfilePhoto=await readImage(file);$('profilePhotoPreview').innerHTML=`<img src="${escapeHTML(pendingProfilePhoto)}" alt="プロフィール写真プレビュー">`;}catch(err){alert(err.message);}});
  $('profileForm').addEventListener('submit',async e=>{e.preventDefault();const id=$('profileForm').dataset.editPetId;const data={name:$('profileName').value.trim(),birthday:$('profileBirthday').value,species:$('profileSpecies').value.trim(),photo:pendingProfilePhoto||'',description:'日々の様子や通院記録を、ここにまとめて残せます。'};if(!data.name){alert('名前を入力してください。');return;}if(id){const pet=state.pets.find(x=>x.id===id);if(pet)Object.assign(pet,data);}else{const pet={id:uid(),...data};state.pets.push(pet);state.selectedPetId=pet.id;}const btn=$('profileForm').querySelector('button[type="submit"]');btn.disabled=true;try{if(await persist()){hideModal('profileModal');render();}}finally{btn.disabled=false;}});
  function openLightbox(src){if(!src)return;$('lightboxImage').src=src;$('photoLightbox').classList.add('show');$('photoLightbox').setAttribute('aria-hidden','false');}
  function closeLightbox(){$('photoLightbox').classList.remove('show');$('photoLightbox').setAttribute('aria-hidden','true');$('lightboxImage').src='';}
  $('addEntryTop').addEventListener('click',()=>openEntryModal());$('addPetTop').addEventListener('click',()=>openProfileModal());$('closePetModal').addEventListener('click',()=>hideModal('petModal'));$('cancelEntry').addEventListener('click',()=>hideModal('petModal'));$('closeProfileModal').addEventListener('click',()=>hideModal('profileModal'));$('cancelProfile').addEventListener('click',()=>hideModal('profileModal'));$('closeLightbox').addEventListener('click',closeLightbox);$('photoLightbox').addEventListener('click',e=>{if(e.target===$('photoLightbox'))closeLightbox();});
  document.querySelectorAll('.filter-chip').forEach(btn=>btn.addEventListener('click',()=>{activeFilter=btn.dataset.filter;renderEntries();renderFilters();}));$('journalSearch').addEventListener('input',renderEntries);document.querySelectorAll('.pet-modal-backdrop').forEach(el=>el.addEventListener('click',e=>{if(e.target===el&&el.id!=='petLoginModal')hideModal(el.id);}));document.addEventListener('keydown',e=>{if(e.key==='Escape'){hideModal('petModal');hideModal('profileModal');closeLightbox();}});

  async function boot(){
    if(SUPABASE_PUBLISHABLE_KEY==='YOUR_SUPABASE_PUBLISHABLE_KEY'){
      status('SupabaseのPublishable keyを設定してください。js/pet.js内の設定を確認してください。',true);
      $('petLoginError').textContent='SupabaseのPublishable keyが未設定です。';showModal('petLoginModal');return;
    }
    const {data,error}=await supabase.auth.getSession();if(error)throw error;currentUser=data.session?.user||null;
    if(!currentUser){showModal('petLoginModal');return;}
    await loadState();
  }
  $('petLoginForm').addEventListener('submit',async e=>{e.preventDefault();$('petLoginButton').disabled=true;$('petLoginError').textContent='';try{const {error}=await supabase.auth.signInWithPassword({email:$('petLoginEmail').value.trim(),password:$('petLoginPassword').value});if(error)throw error;const {data}=await supabase.auth.getUser();currentUser=data.user;await loadState();hideModal('petLoginModal');}catch(err){$('petLoginError').textContent=err.message||'ログインに失敗しました。';}finally{$('petLoginButton').disabled=false;}});
  supabase.auth.onAuthStateChange(async(_event,session)=>{if(session?.user&&!currentUser){currentUser=session.user;try{await loadState();hideModal('petLoginModal');}catch(err){status(`読み込みに失敗しました：${err.message}`,true);}}else if(!session){currentUser=null;showModal('petLoginModal');}});
  boot().catch(err=>{console.error(err);status(`読み込みに失敗しました：${err.message || '設定を確認してください'}`,true);});
})();
