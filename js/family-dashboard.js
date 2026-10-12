document.addEventListener('familydb-ready', async () => {
  const d=window.familyDB;
  const el=id=>document.getElementById(id);
  const dateKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  try {
    const [shop,tasks,posts,garbage]=await Promise.all([d.rows('family_shopping_items','created_at',true),d.rows('family_tasks','due_date',true),d.rows('family_board_posts','created_at',false),d.rows('family_garbage','collection_date',true)]);
    el('shoppingCount').textContent=shop.length+'件';
    const today=new Date();today.setHours(0,0,0,0);const end=new Date(today);end.setDate(end.getDate()+7);const todayKey=dateKey(today);
    const due=tasks.filter(x=>x.due_date&&new Date(x.due_date+'T00:00:00')<end).sort((a,b)=>a.due_date.localeCompare(b.due_date));
    el('taskCount').textContent=due.length+'件';
    el('dashboardTasks').innerHTML=due.slice(0,4).map(x=>`<div class="family-summary-row"><span>${d.esc(x.title)}</span><small>${d.esc(x.due_date)}${x.due_date<todayKey?' · 期限切れ':''}</small></div>`).join('')||'<p class="family-muted">期限が近いタスクはありません。</p>';
    el('latestPosts').innerHTML=posts.slice(0,3).map(x=>`<div class="family-summary-row"><div><strong>${d.esc(x.title)}</strong>${x.body?`<p>${d.esc(x.body)}</p>`:''}</div><small>${x.created_at?new Date(x.created_at).toLocaleDateString('ja-JP'):''}</small></div>`).join('')||'<p class="family-muted">掲示板の投稿はまだありません。</p>';
    const tomorrow=new Date(today);tomorrow.setDate(tomorrow.getDate()+1);const key=dateKey(tomorrow);const tom=garbage.filter(x=>x.collection_date===key);
    el('tomorrowGarbage').textContent=tom.length?tom.map(x=>x.collection_type).join('、'):'明日の収集予定は未登録';
  } catch(e){console.error(e);d.toast('データを読み込めませんでした。SQL設定と権限を確認してください。');}
});