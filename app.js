let data = [];

function render(){
  const list = document.getElementById('list');
  list.innerHTML = '';
  data.forEach((c,i)=>{
    const div = document.createElement('div');
    div.className = 'card ' + (c.success?'success':'') + (c.lamp?' lamp':'');
    div.innerHTML = `<b>${c.name}</b><br>${c.kommun}<br>${c.note||''}`;
    div.onclick = ()=>alert(c.name);
    list.appendChild(div);
  });
}

function importData(){
  const input = prompt('Klistra in TSV');
  const rows = input.split('\n');
  data = rows.map(r=>{
    const c = r.split('\t');
    return {name:c[0], kommun:c[1]};
  });
  render();
}

function exportData(){
  const blob = new Blob([JSON.stringify(data)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'hx2.json';
  a.click();
}

function surprise(){
  const i = Math.floor(Math.random()*data.length);
  document.querySelectorAll('.card')[i].classList.add('highlight');
}

setInterval(()=>{
  document.getElementById('datetime').innerText =
    new Date().toLocaleString('sv-SE');
},1000);
