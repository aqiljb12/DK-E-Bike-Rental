const STORAGE_KEY = 'ebike_rental_demo_v1';
const fmtRM = n => `RM${Number(n || 0).toFixed(2)}`;
const pad = n => String(n).padStart(2, '0');
const nowIso = () => new Date().toISOString();

const seed = () => ({
  businessName: 'DK E-Bike Rental',
  currentBranch: 'Senai',
  bikes: [
    {id:'EB001', branch:'Senai', status:'available', battery:92, usageHours:18.5, rentals:14, lastService:'2026-09-10', serviceEveryHours:50},
    {id:'EB002', branch:'Senai', status:'available', battery:84, usageHours:37.2, rentals:27, lastService:'2026-09-02', serviceEveryHours:50},
    {id:'EB003', branch:'Senai', status:'maintenance', battery:71, usageHours:52.1, rentals:41, lastService:'2026-08-18', serviceEveryHours:50},
    {id:'EB004', branch:'Senai', status:'available', battery:96, usageHours:9.4, rentals:8, lastService:'2026-09-18', serviceEveryHours:50},
    {id:'EB101', branch:'Kulai', status:'available', battery:89, usageHours:22.8, rentals:17, lastService:'2026-09-11', serviceEveryHours:50},
    {id:'EB102', branch:'Kulai', status:'available', battery:78, usageHours:44.6, rentals:36, lastService:'2026-08-28', serviceEveryHours:50},
    {id:'EB103', branch:'Kulai', status:'maintenance', battery:68, usageHours:57.0, rentals:48, lastService:'2026-08-12', serviceEveryHours:50}
  ],
  rentals: [],
  transactions: [
    {id:'TX1001', bikeId:'EB001', branch:'Senai', customer:'Walk-in', minutes:30, price:10, startedAt:'2026-09-25T02:00:00.000Z', endedAt:'2026-09-25T02:32:00.000Z'},
    {id:'TX1002', bikeId:'EB004', branch:'Senai', customer:'Walk-in', minutes:60, price:18, startedAt:'2026-09-25T03:00:00.000Z', endedAt:'2026-09-25T04:04:00.000Z'},
    {id:'TX1003', bikeId:'EB101', branch:'Kulai', customer:'Walk-in', minutes:30, price:10, startedAt:'2026-09-25T05:20:00.000Z', endedAt:'2026-09-25T05:51:00.000Z'}
  ]
});

let state = load();
let selectedBike = null;
let selectedMinutes = 30;

function load(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || seed(); }
  catch { return seed(); }
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function branch(){ return state.currentBranch; }
function bikesForBranch(){ return state.bikes.filter(b => b.branch === branch()); }
function rentalsForBranch(){ return state.rentals.filter(r => r.branch === branch()); }
function txForBranch(){ return state.transactions.filter(t => t.branch === branch()); }
function statusLabel(s){ return s === 'available' ? 'Available' : s === 'in_use' ? 'In Use' : 'Maintenance'; }
function showToast(msg){ const el=$('#toast'); el.textContent=msg; el.classList.remove('hidden'); clearTimeout(showToast.t); showToast.t=setTimeout(()=>el.classList.add('hidden'),2200); }
function $(s){ return document.querySelector(s); }
function $$(s){ return [...document.querySelectorAll(s)]; }
function uid(prefix='ID'){ return prefix + Math.random().toString(36).slice(2,8).toUpperCase(); }

function renderAll(){
  $('#brandName').textContent = state.businessName;
  $('#branchSelect').value = branch();
  renderDashboard(); renderRentalPage(); renderBikes(); renderMaintenance(); renderReports();
}

function renderDashboard(){
  const bikes = bikesForBranch();
  const tx = txForBranch();
  const rentals = rentalsForBranch();
  const sales = tx.reduce((s,t)=>s+t.price,0);
  $('#todaySales').textContent = fmtRM(sales);
  $('#todayRentals').textContent = `${tx.length} rental selesai dalam demo`;
  $('#availableCount').textContent = bikes.filter(b=>b.status==='available').length;
  $('#inUseCount').textContent = bikes.filter(b=>b.status==='in_use').length;
  $('#maintenanceCount').textContent = bikes.filter(b=>b.status==='maintenance').length;
  $('#totalBikeCount').textContent = bikes.length;
  $('#activeRentals').innerHTML = rentals.length ? rentals.map(rentalCard).join('') : `<div class="empty">Belum ada rental aktif.</div>`;
  const attention = bikes.filter(b => b.status==='maintenance' || serviceDue(b));
  $('#attentionList').innerHTML = attention.length ? attention.map(b=>`
    <div class="card">
      <div class="bike-card-top"><div><div class="bike-id">${b.id}</div><div class="meta">${serviceDue(b) ? 'Servis sudah / hampir due' : 'Dalam maintenance'}</div></div><span class="status ${b.status}">${statusLabel(b.status)}</span></div>
    </div>`).join('') : `<div class="empty">Semua basikal dalam keadaan baik.</div>`;
}

function rentalCard(r){
  const remain = remainingMs(r);
  const cls = remain <= 0 ? 'timer over' : 'timer';
  return `<div class="card rental-card">
    <div><div class="bike-id">${r.bikeId}</div><div class="meta">${r.customer || 'Walk-in'} · ${r.minutes} min · ${fmtRM(r.price)}</div></div>
    <div class="${cls}" data-timer-id="${r.id}">${formatMs(remain)}</div>
    <div class="card-actions">
      <button onclick="addTime('${r.id}',15)">+15 min</button>
      <button onclick="addTime('${r.id}',30)">+30 min</button>
      <button onclick="finishRental('${r.id}')">Tamat</button>
    </div>
  </div>`;
}
function remainingMs(r){ return new Date(r.endsAt).getTime() - Date.now(); }
function formatMs(ms){
  if(ms<=0) return 'MASA TAMAT';
  const total=Math.floor(ms/1000), h=Math.floor(total/3600), m=Math.floor((total%3600)/60), s=total%60;
  return h>0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
function tickTimers(){
  $$('[data-timer-id]').forEach(el=>{
    const r=state.rentals.find(x=>x.id===el.dataset.timerId); if(!r) return;
    const rem=remainingMs(r); el.textContent=formatMs(rem); el.classList.toggle('over', rem<=0);
  });
}

function renderRentalPage(){
  $('#rentalPageActive').innerHTML = rentalsForBranch().length ? rentalsForBranch().map(rentalCard).join('') : `<div class="empty">Belum ada rental aktif.</div>`;
  if(selectedBike){
    const b=state.bikes.find(x=>x.id===selectedBike);
    if(b){
      $('#bikePreview').classList.remove('hidden');
      $('#bikePreview').innerHTML=`<div class="bike-card-top"><div><div class="bike-id">${b.id}</div><div class="meta">${b.branch} · Battery est. ${b.battery}% · ${b.usageHours.toFixed(1)}h usage</div></div><span class="status ${b.status}">${statusLabel(b.status)}</span></div>`;
      $('#startRentalBtn').disabled = b.status!=='available';
      return;
    }
  }
  $('#bikePreview').classList.add('hidden'); $('#startRentalBtn').disabled=true;
}

function renderBikes(){
  const q=$('#bikeSearch')?.value?.trim().toLowerCase() || '';
  const filter=$('#bikeStatusFilter')?.value || 'all';
  const list=bikesForBranch().filter(b => (!q || b.id.toLowerCase().includes(q)) && (filter==='all' || b.status===filter));
  $('#bikeList').innerHTML=list.length?list.map(bikeCard).join(''):`<div class="empty">Tiada basikal dijumpai.</div>`;
}
function bikeCard(b){
  const due=serviceDue(b), progress=Math.min(100,Math.round((b.usageHours/b.serviceEveryHours)*100));
  return `<div class="bike-card">
    <div class="bike-card-top"><div><div class="bike-id">${b.id}</div><div class="meta">${b.branch}</div></div><span class="status ${b.status}">${statusLabel(b.status)}</span></div>
    <div class="metrics"><div class="metric"><span>Battery est.</span><strong>${b.battery}%</strong></div><div class="metric"><span>Usage</span><strong>${b.usageHours.toFixed(1)}h</strong></div><div class="metric"><span>Rental</span><strong>${b.rentals}</strong></div></div>
    <div class="meta" style="margin-top:12px">Service interval ${b.serviceEveryHours}h ${due?'· DUE':''}</div><div class="progress"><span style="width:${progress}%"></span></div>
    <div class="card-actions">
      ${b.status==='available'?`<button onclick="quickRental('${b.id}')">Start rental</button>`:''}
      ${b.status!=='in_use'?`<button onclick="toggleMaintenance('${b.id}')">${b.status==='maintenance'?'Set available':'Maintenance'}</button>`:''}
      <button onclick="openBikeDetail('${b.id}')">Detail</button>
    </div>
  </div>`;
}
function serviceDue(b){ return b.usageHours >= b.serviceEveryHours*.9; }

function renderMaintenance(){
  const list=bikesForBranch().slice().sort((a,b)=>(b.status==='maintenance')-(a.status==='maintenance') || b.usageHours-a.usageHours);
  $('#maintenanceList').innerHTML=list.map(b=>{
    const due=serviceDue(b); return `<div class="card">
      <div class="bike-card-top"><div><div class="bike-id">${b.id}</div><div class="meta">Usage ${b.usageHours.toFixed(1)}h · Last service ${b.lastService}</div></div><span class="status ${due?'overdue':b.status}">${due?'SERVICE DUE':statusLabel(b.status)}</span></div>
      <div class="card-actions"><button onclick="serviceBike('${b.id}')">Rekod servis</button>${b.status!=='in_use'?`<button onclick="toggleMaintenance('${b.id}')">${b.status==='maintenance'?'Set available':'Masuk maintenance'}</button>`:''}</div>
    </div>`;
  }).join('');
}

function renderReports(){
  const tx=txForBranch(); const sales=tx.reduce((s,t)=>s+t.price,0); const mins=tx.reduce((s,t)=>s+t.minutes,0);
  $('#reportSales').textContent=fmtRM(sales); $('#reportRentalCount').textContent=tx.length; $('#reportHours').textContent=`${(mins/60).toFixed(1)}h`; $('#reportAverage').textContent=fmtRM(tx.length?sales/tx.length:0);
  $('#transactionList').innerHTML=tx.length?tx.slice().reverse().map(t=>`<div class="card"><div class="bike-card-top"><div><div class="bike-id">${t.bikeId}</div><div class="meta">${t.customer||'Walk-in'} · ${t.minutes} min · ${new Date(t.endedAt).toLocaleString('ms-MY')}</div></div><strong>${fmtRM(t.price)}</strong></div></div>`).join(''):`<div class="empty">Belum ada transaksi.</div>`;
}

function selectBikeByCode(code){
  const bike=state.bikes.find(b=>b.id.toLowerCase()===code.trim().toLowerCase() && b.branch===branch());
  if(!bike){selectedBike=null;showToast('Basikal tak dijumpai dalam cawangan ini');renderRentalPage();return}
  selectedBike=bike.id; $('#bikeCode').value=bike.id; renderRentalPage();
}

function startRental(){
  const b=state.bikes.find(x=>x.id===selectedBike); if(!b || b.status!=='available') return;
  const price=Math.max(0,Number($('#priceInput').value||0)); const customer=$('#customerName').value.trim()||'Walk-in';
  const started=new Date(); const ends=new Date(started.getTime()+selectedMinutes*60000);
  state.rentals.push({id:uid('R'), bikeId:b.id, branch:b.branch, customer, minutes:selectedMinutes, price, startedAt:started.toISOString(), endsAt:ends.toISOString()});
  b.status='in_use'; b.rentals+=1; save(); selectedBike=null; $('#bikeCode').value=''; $('#customerName').value=''; showToast(`Rental ${b.id} dimulakan`); renderAll();
}
window.finishRental=function(id){
  const idx=state.rentals.findIndex(r=>r.id===id); if(idx<0)return; const r=state.rentals[idx]; const b=state.bikes.find(x=>x.id===r.bikeId);
  const elapsed=Math.max(1,(Date.now()-new Date(r.startedAt).getTime())/3600000); if(b){b.status='available';b.usageHours=Number((b.usageHours+elapsed).toFixed(2));b.battery=Math.max(55,Math.round(b.battery-elapsed*.8));}
  state.transactions.push({id:uid('TX'),bikeId:r.bikeId,branch:r.branch,customer:r.customer,minutes:r.minutes,price:r.price,startedAt:r.startedAt,endedAt:nowIso()}); state.rentals.splice(idx,1); save(); showToast(`Rental ${r.bikeId} ditamatkan`); renderAll();
}
window.addTime=function(id,min){
  const r=state.rentals.find(x=>x.id===id); if(!r)return; r.minutes+=min; r.endsAt=new Date(new Date(r.endsAt).getTime()+min*60000).toISOString(); r.price=Number((r.price+(min/30)*10).toFixed(2)); save(); showToast(`Tambah ${min} minit`); renderAll();
}
window.quickRental=function(id){ showPage('rental'); selectBikeByCode(id); }
window.toggleMaintenance=function(id){ const b=state.bikes.find(x=>x.id===id); if(!b||b.status==='in_use')return; b.status=b.status==='maintenance'?'available':'maintenance'; save(); renderAll(); }
window.serviceBike=function(id){ const b=state.bikes.find(x=>x.id===id); if(!b)return; b.lastService=new Date().toISOString().slice(0,10); b.usageHours=0; b.battery=Math.min(100,b.battery+3); if(b.status==='maintenance') b.status='available'; save(); showToast(`Servis ${id} direkod`); renderAll(); }
window.openBikeDetail=function(id){
  const b=state.bikes.find(x=>x.id===id); if(!b)return; openModal(`Detail ${id}`,`<div class="panel"><div class="metrics"><div class="metric"><span>Status</span><strong>${statusLabel(b.status)}</strong></div><div class="metric"><span>Battery est.</span><strong>${b.battery}%</strong></div><div class="metric"><span>Total rental</span><strong>${b.rentals}</strong></div></div><p class="meta" style="margin-top:14px">Usage sejak servis: ${b.usageHours.toFixed(1)} jam<br>Last service: ${b.lastService}<br>Service interval: ${b.serviceEveryHours} jam</p></div>`); }

function openModal(title,html){$('#modalTitle').textContent=title;$('#modalBody').innerHTML=html;$('#modal').classList.remove('hidden')}
function closeModal(){$('#modal').classList.add('hidden')}
function showPage(name){$$('.page').forEach(p=>p.classList.toggle('active',p.dataset.page===name));$$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.nav===name));window.scrollTo({top:0,behavior:'smooth'});}

$$('.nav-item').forEach(btn=>btn.addEventListener('click',()=>showPage(btn.dataset.nav)));
$$('[data-go]').forEach(btn=>btn.addEventListener('click',()=>showPage(btn.dataset.go)));
$('#branchSelect').addEventListener('change',e=>{state.currentBranch=e.target.value;selectedBike=null;save();renderAll();});
$('#scanDemoBtn').addEventListener('click',()=>{const avail=bikesForBranch().filter(b=>b.status==='available');if(!avail.length){showToast('Tiada basikal available');return}selectBikeByCode(avail[Math.floor(Math.random()*avail.length)].id);});
$('#bikeCode').addEventListener('input',e=>{if(e.target.value.length>=4)selectBikeByCode(e.target.value)});
$('#durationOptions').addEventListener('click',e=>{if(!e.target.matches('.seg'))return;$$('.seg').forEach(x=>x.classList.remove('active'));e.target.classList.add('active');selectedMinutes=Number(e.target.dataset.minutes);$('#priceInput').value=selectedMinutes===30?10:selectedMinutes===60?18:25;});
$('#startRentalBtn').addEventListener('click',startRental);
$('#bikeSearch').addEventListener('input',renderBikes);$('#bikeStatusFilter').addEventListener('change',renderBikes);
$('#addBikeBtn').addEventListener('click',()=>openModal('Tambah Basikal',`<div class="form-grid"><div><label>Bike ID / Barcode</label><input id="newBikeId" placeholder="EB005"></div><div><label>Battery estimate %</label><input id="newBikeBattery" type="number" min="0" max="100" value="100"></div></div><button class="primary full" id="saveBikeBtn">Tambah Basikal</button>`));
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()}); $('#closeModalBtn').addEventListener('click',closeModal);
$('#modalBody').addEventListener('click',e=>{if(e.target.id!=='saveBikeBtn')return;const id=$('#newBikeId').value.trim().toUpperCase();const battery=Math.min(100,Math.max(0,Number($('#newBikeBattery').value||100)));if(!id){showToast('Masukkan Bike ID');return}if(state.bikes.some(b=>b.id===id)){showToast('Bike ID sudah ada');return}state.bikes.push({id,branch:branch(),status:'available',battery,usageHours:0,rentals:0,lastService:new Date().toISOString().slice(0,10),serviceEveryHours:50});save();closeModal();showToast(`${id} ditambah`);renderAll();});
$('#resetDemoBtn').addEventListener('click',()=>{if(confirm('Reset semua data demo?')){state=seed();save();selectedBike=null;renderAll();showToast('Demo di-reset')}});

renderAll(); setInterval(tickTimers,1000);
