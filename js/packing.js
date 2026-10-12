const templates= {
daytrip:['財布・スマホ', '水筒', 'おやつ', 'タオル', '着替え', 'おむつ・おしりふき'], overnight:['財布・スマホ', '充電器', '家族の着替え', 'パジャマ', '歯みがきセット', '保険証・医療証', 'タオル'], pool:['水着', 'タオル', '着替え', '水遊び用おむつ', '飲み物', '日焼け止め'], custom:[]
}
;
let items=[];
function load(v) {
items=(templates[v]||[]).map((text, i)=>( {
id:Date.now()+i, text, checked:false
}
));
render()
}
function render() {
$('items').replaceChildren();
items.forEach(item=> {
let cb=document.createElement('input');cb.type='checkbox';cb.className='check';cb.checked=item.checked;cb.onchange=()=> {
item.checked=cb.checked;progress()
}
;let el=row(item.text, '', cb);let del=document.createElement('button');del.className='btn secondary';del.textContent='削除';del.onclick=()=> {
items=items.filter(x=>x!==item);render()
}
;el.append(del);$('items').append(el)
}
);
if(!items.length)$('items').innerHTML='<div class="empty">持ち物を追加してください。</div>';
progress()
}
function progress() {
let c=items.filter(i=>i.checked).length;
$('progress').textContent=`${c} / ${items.length} 準備OK`;
$('bar').style.width=items.length?`${c/items.length*100}%`:'0%'
}
$('template').onchange=e=>load(e.target.value);
$('addForm').onsubmit=e=> {
e.preventDefault();
items.push( {
id:Date.now(), text:$('newItem').value.trim(), checked:false
}
);
$('newItem').value='';
$('template').value='custom';
render()
}
;
$('reset').onclick=()=> {
items.forEach(i=>i.checked=false);
render();
toast('チェックをリセットしました')
}
;
load('daytrip');
