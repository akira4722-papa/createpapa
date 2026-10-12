const $=id=>document.getElementById(id);
const today=new Date();
today.setHours(0, 0, 0, 0);
const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const days=n=> {
let d=new Date(today);
d.setDate(d.getDate()+n);
return key(d)
}
;
const label=s=> {
let d=new Date(s+'T00:00:00');
return `${d.getMonth()+1}/${d.getDate()}（${['日','月','火','水','木','金','土'][d.getDay()]}）`
}
;
function toast(s) {
let t=$('toast');
if(!t)return;
t.textContent=s;
t.classList.add('show');
setTimeout(()=>t.classList.remove('show'), 1800)
}
function row(title, meta='', action) {
let el=document.createElement('div');
el.className='row';
let main=document.createElement('div');
main.className='rowmain';
let t=document.createElement('div');
t.className='rowtitle';
t.textContent=title;
main.append(t);
if(meta) {
let m=document.createElement('div');
m.className='rowmeta';
m.textContent=meta;
main.append(m)
}
el.append(main);
if(action)el.append(action);
return el
}
