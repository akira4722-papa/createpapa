let tasks=[ {
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
];
let filter='all';
$('taskDate').value=days(1);
function render() {
let visible=tasks.filter(t=>t.d<=days(7)).filter(t=>filter==='overdue'?t.d<key(today):filter==='week'?t.d>=key(today):true).sort((a, b)=>a.d.localeCompare(b.d));
$('taskCount').textContent=tasks.filter(t=>t.d<=days(7)).length+'件';
$('items').replaceChildren();
if(!visible.length) {
$('items').innerHTML='<div class="empty">該当するタスクはありません。</div>';
return
}
visible.forEach(t=> {
let overdue=t.d<key(today);let del=document.createElement('button');del.className='btn secondary';del.textContent='完了';del.onclick=()=> {
tasks=tasks.filter(x=>x!==t);render();toast('タスクを完了しました')
}
;$('items').append(row(t.n, label(t.d), Object.assign(document.createElement('span'),  {
className:'status '+(overdue?'':'soon'), textContent:overdue?'期限切れ':label(t.d)
}
)))
}
);
}
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=> {
filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active', x===b));render()
}
);
$('addForm').onsubmit=e=> {
e.preventDefault();
tasks.push( {
n:$('taskName').value.trim(), d:$('taskDate').value
}
);
$('taskName').value='';
render()
}
;
render();
