/* 家族機能: Supabase接続・共通処理。家族画面ではログイン画面を表示しない。 */
(() => {
  const SUPABASE_URL = "https://pwgmsbzbnihnemveggsl.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_9yxCklCNudnEnIlWoGfRgw_kOLcbDxS";
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  window.familyDB = {
    sb, user: null,
    async init() {
      if (SUPABASE_PUBLISHABLE_KEY === "YOUR_SUPABASE_PUBLISHABLE_KEY") {
        this.toast("SupabaseのPublishable keyが未設定です。");
        return false;
      }
      try {
        const { data, error } = await sb.auth.getSession();
        if (error) throw error;
        this.user = data.session?.user || null;
        if (!this.user) {
          // 家族画面ではログイン案内・ログイン画面を表示しない。
          return false;
        }
        document.dispatchEvent(new CustomEvent('familydb-ready'));
        return true;
      } catch (error) {
        console.error(error);
        this.toast("Supabaseに接続できませんでした。");
        return false;
      }
    },
    esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
    toast(msg) { const e = document.getElementById('toast'); if (e) { e.textContent = msg; e.classList.add('show'); setTimeout(() => e.classList.remove('show'), 3200); } else console.info(msg); },
    async rows(table, order='created_at', ascending=false) { const { data, error } = await sb.from(table).select('*').order(order, {ascending}); if (error) throw error; return data || []; },
    async insert(table, row) { if (!this.user) throw new Error('認証済みセッションがありません'); const { data, error } = await sb.from(table).insert({...row, user_id:this.user.id}).select().single(); if (error) throw error; return data; },
    async update(table, id, patch) { const { error } = await sb.from(table).update(patch).eq('id', id); if (error) throw error; },
    async remove(table, id) { const { error } = await sb.from(table).delete().eq('id', id); if (error) throw error; }
  };
  document.addEventListener('DOMContentLoaded', () => { window.familyDB.init(); });
})();
