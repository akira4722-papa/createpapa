const shopping=['牛乳', '卵', '食パン', '子ども用の歯みがき粉', 'バナナ'];
$('shoppingCount').textContent=shopping.length+'件';
const tasks=[ {
n:'保育園の着替えを補充', d:days(-2)
}
,  {
n:'予防接種の予約確認', d:days(-1)
}
,  {
n:'買い物に行く', d:days(1)
}
,  {
n:'週末のお出かけ準備', d:days(4)
}
,  {
n:'提出書類を確認', d:days(7)
}
,  {
n:'来月の予定を整理', d:days(12)
}
].filter(t=>t.d<=days(7)).sort((a, b)=>a.d.localeCompare(b.d));
$('taskCount').textContent=tasks.length+'件';
tasks.slice(0, 3).forEach(t=> {
let overdue=t.d<key(today);$('dashboardTasks').append(row(t.n, label(t.d), Object.assign(document.createElement('span'),  {
className:'status '+(overdue?'':'soon'), textContent:overdue?'期限切れ':label(t.d)
}
)))
}
);
if(!tasks.length)$('dashboardTasks').innerHTML='<div class="empty">対象タスクはありません</div>';
let tomorrow=['燃えるごみ'];
$('tomorrowGarbage').innerHTML=tomorrow.map(x=>`<div class="summaryline"><strong>🔥 ${x}</strong></div>`).join('');
const posts=[['明日の保育園', '着替え袋の補充をお願いします。', '今日 18:20'], ['宅配便', '午後に荷物が届く予定です。', '今日 16:05'], ['週末のお出かけ', '出発前に水筒を確認しよう。', '昨日 20:15'], ['買い物', '牛乳を忘れずに。', '昨日 18:40']];
posts.slice(0, 3).forEach(p=> {
let el=document.createElement('div');el.className='post';el.innerHTML=`<div class="rowtitle"></div><p></p><div class="posttime"></div>`;el.children[0].textContent=p[0];el.children[1].textContent=p[1];el.children[2].textContent=p[2];$('latestPosts').append(el)
}
);
