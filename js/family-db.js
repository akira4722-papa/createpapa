/* 家族機能: Supabase接続・認証・共通処理 */
(() => {
  const SUPABASE_URL = "https://pwgmsbzbnihnemveggsl.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  window.familyDB = {
    sb, user: null,
    async init() {
      if (SUPABASE_PUBLISHABLE_KEY === "YOUR_SUPABASE_PUBLISHABLE_KEY") {
        this.showGate("js/app.js と js/family-db.js の SUPABASE_PUBLISHABLE_KEY を設定してください。"); return false;
      }
      const {data,error}=await sb.auth.getSession();
      if(error){this.showGate("Supabaseへの接続に失敗しました: "+error.message);return false;}
      this.user=data.session?.user||null;
      if(!this.user){this.showGate("");return false;}
      this.hideGate(); return true;
    },
    showGate(message) {
      let el=document.getElementById('familyAuthGate');
      if(!el){el=document.createElement('div');el.id='familyAuthGate';el.className='family-auth-gate';el.innerHTML=`<form id="familyLoginForm" class="family-auth-card"><h2>わが家の記録帳</h2><p>家族機能を使うにはログインしてください。</p><label>メールアドレス<input id="familyLoginEmail" type="email" required autocomplete="username"></label><label>パスワード<input id="familyLoginPassword" type="password" required autocomplete="current-password"></label><p id="familyLoginError" class="family-auth-error"></p><button class="btn" type="submit">ログイン</button><button id="familyLogout" class="btn secondary" type="button" hidden>ログアウト</button></form>`;document.body.appendChild(el);
        el.querySelector('#familyLoginForm').addEventListener('submit',async e=>{e.preventDefault();const b=e.currentTarget.querySelector('button[type=submit]');b.disabled=true;b.textContent='ログイン中…';const {error}=await sb.auth.signInWithPassword({email:el.querySelector('#familyLoginEmail').value.trim(),password:el.querySelector('#familyLoginPassword').value});b.disabled=false;b.textContent='ログイン';if(error){el.querySelector('#familyLoginError').textContent='ログインできませんでした。入力内容を確認してください。';return;}location.reload();});
      }
      el.style.display='grid';const er=el.querySelector('#familyLoginError');if(er)er.textContent=message||'';
    },
    hideGate(){const el=document.getElementById('familyAuthGate');if(el)el.style.display='none';},
    esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));},
    toast(msg){const e=document.getElementById('toast');if(e){e.textContent=msg;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2400);}else alert(msg);},
    async rows(table, order='created_at', ascending=false){const {data,error}=await sb.from(table).select('*').order(order,{ascending});if(error)throw error;return data||[];},
    async insert(table,row){const {data,error}=await sb.from(table).insert({...row,user_id:this.user.id}).select().single();if(error)throw error;return data;},
    async update(table,id,patch){const {error}=await sb.from(table).update(patch).eq('id',id);if(error)throw error;},
    async remove(table,id){const {error}=await sb.from(table).delete().eq('id',id);if(error)throw error;}
  };
  const css=document.createElement('style');css.textContent=`.family-auth-gate{position:fixed;inset:0;z-index:99999;background:rgba(20,28,24,.58);display:none;place-items:center;padding:20px}.family-auth-card{background:#fff;border-radius:20px;padding:26px;width:min(100%,380px);box-shadow:0 20px 60px #0003;display:grid;gap:12px;font-family:system-ui,sans-serif}.family-auth-card h2{margin:0}.family-auth-card label{display:grid;gap:6px;font-size:14px}.family-auth-card input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #ddd;border-radius:10px;font:inherit}.family-auth-error{color:#c33;font-size:13px;min-height:1em;margin:0}`;document.head.appendChild(css);
  document.addEventListener('DOMContentLoaded',async()=>{const ok=await window.familyDB.init();if(!ok)return;document.dispatchEvent(new CustomEvent('familydb-ready'));});
})();
