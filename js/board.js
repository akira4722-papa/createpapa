let posts=[ {
id:1, t:'明日の保育園', m:'着替え袋の補充をお願いします。', time:'今日 18:20'
}
,  {
id:2, t:'宅配便', m:'午後に荷物が届く予定です。', time:'今日 16:05'
}
,  {
id:3, t:'週末のお出かけ', m:'水筒を忘れずに。', time:'昨日 20:15'
}
], pending=null;
function render() {
$('posts').replaceChildren();
$('postCount').textContent=posts.length+'件';
if(!posts.length)$('posts').innerHTML='<div class="empty">投稿はありません。</div>';
posts.forEach(p=> {
let el=document.createElement('article');el.className='post';let h=document.createElement('div');h.className='posthead';let title=document.createElement('strong');title.textContent=p.t;let del=document.createElement('button');del.className='btn secondary';del.textContent='削除';del.onclick=()=> {
pending=p.id;$('confirm').classList.add('show')
}
;h.append(title, del);let msg=document.createElement('p');msg.textContent=p.m;let time=document.createElement('div');time.className='posttime';time.textContent=p.time;el.append(h, msg, time);$('posts').append(el)
}
)
}
$('addForm').onsubmit=e=> {
e.preventDefault();
posts.unshift( {
id:Date.now(), t:$('title').value.trim(), m:$('message').value.trim(), time:'たった今'
}
);
$('title').value='';
$('message').value='';
render();
toast('投稿しました')
}
;
$('cancel').onclick=()=> {
$('confirm').classList.remove('show');
pending=null
}
;
$('delete').onclick=()=> {
posts=posts.filter(p=>p.id!==pending);
pending=null;
$('confirm').classList.remove('show');
render();
toast('投稿を削除しました')
}
;
render();
