let month=new Date(today.getFullYear(), today.getMonth(), 1), selected=days(1), data= {
}
;
for(let i=1;i<=31;i++) {
let d=new Date(today.getFullYear(), today.getMonth(), i);
if(d.getMonth()!==today.getMonth())break;
if([1, 4].includes(d.getDay()))data[key(d)]=['burn'];
if(d.getDay()===3)data[key(d)]=['recycle']
}
data[days(1)]=['burn'];
const names= {
burn:'燃えるごみ', recycle:'資源ごみ', nonburn:'燃えないごみ'
}
;
function render() {
$('month').textContent=`${month.getFullYear()}年${month.getMonth()+1}月`;
$('calendar').replaceChildren();
['日', '月', '火', '水', '木', '金', '土'].forEach(w=> {
let e=document.createElement('div');e.className='weekday';e.textContent=w;$('calendar').append(e)
}
);
let first=new Date(month.getFullYear(), month.getMonth(), 1).getDay(), count=new Date(month.getFullYear(), month.getMonth()+1, 0).getDate();
for(let i=0;i<first+count;i++) {
let d=new Date(month.getFullYear(), month.getMonth(), i-first+1), k=key(d), b=document.createElement('button');
b.className='day'+(d.getMonth()!==month.getMonth()?' other':'')+(k===key(today)?' today':'')+(k===selected?' selected':'');
b.textContent=d.getDate();
(data[k]||[]).forEach(t=> {
let dot=document.createElement('i');dot.className='dot '+t;b.append(dot)
}
);
b.onclick=()=> {
selected=k;
render()
}
;
$('calendar').append(b)
}
$('selectedTitle').textContent=label(selected)+'の収集予定';
let types=data[selected]||[];
$('selectedTypes').textContent=types.length?types.map(t=>names[t]).join('・'):'収集予定はありません';
$('date').value=selected
}
$('prev').onclick=()=> {
month.setMonth(month.getMonth()-1);
render()
}
;
$('next').onclick=()=> {
month.setMonth(month.getMonth()+1);
render()
}
;
$('addForm').onsubmit=e=> {
e.preventDefault();
let d=$('date').value, t=$('type').value;
data[d]=[...new Set([...(data[d]||[]), t])];
selected=d;
month=new Date(d+'T00:00:00');
month.setDate(1);
render();
toast('収集日を登録しました')
}
;
render();
