let items=['牛乳', '卵', '食パン', 'トマト', 'レタス'];
function render() {
$('items').replaceChildren();
$('shoppingCount').textContent=items.length+'件';
if(!items.length) {
$('items').innerHTML='<div class="empty">買い物リストは空です。</div>';
return
}
items.forEach((v, i)=> {
let cb=document.createElement('input');cb.type='checkbox';cb.className='check';cb.onchange=()=> {
items.splice(i, 1);render();toast('リストから削除しました')
}
;let el=row(v, '食料品', cb);$('items').append(el)
}
)
}
$('addForm').onsubmit=e=> {
e.preventDefault();
let v=$('newItem').value.trim();
if(v) {
items.push(v);
$('newItem').value='';
render()
}
}
;
render();
