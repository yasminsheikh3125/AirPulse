const MUMBAI_ZONES = [
  {name:'Dharavi',   x:.08,y:.55,aqi:189,cat:'unhealthy'},
  {name:'Chembur',   x:.22,y:.42,aqi:152,cat:'usg'},
  {name:'Andheri',   x:.18,y:.28,aqi:98, cat:'moderate'},
  {name:'Bandra',    x:.12,y:.50,aqi:87, cat:'moderate'},
  {name:'Worli',     x:.14,y:.62,aqi:72, cat:'moderate'},
  {name:'Colaba',    x:.16,y:.80,aqi:58, cat:'moderate'},
  {name:'Powai',     x:.38,y:.30,aqi:45, cat:'good'},
  {name:'Thane',     x:.58,y:.22,aqi:134,cat:'usg'},
  {name:'Navi Mumbai',x:.70,y:.55,aqi:78,cat:'moderate'},
  {name:'Borivali',  x:.22,y:.12,aqi:62, cat:'moderate'},
  {name:'Mulund',    x:.48,y:.30,aqi:110,cat:'usg'},
  {name:'Kurla',     x:.30,y:.48,aqi:168,cat:'unhealthy'},
  {name:'Goregaon',  x:.20,y:.20,aqi:88, cat:'moderate'},
  {name:'Malad',     x:.16,y:.16,aqi:75, cat:'moderate'},
  {name:'Vasai',     x:.10,y:.06,aqi:52, cat:'good'},
  {name:'Panvel',    x:.82,y:.70,aqi:95, cat:'moderate'},
];
 
const AQI_COLORS = {
  good:      {hex:'#22c55e',label:'Good',textColor:'#86efac'},
  moderate:  {hex:'#f0a500',label:'Moderate',textColor:'#fde047'},
  usg:       {hex:'#f97316',label:'Unhealthy for SG',textColor:'#fdba74'},
  unhealthy: {hex:'#ef4444',label:'Unhealthy',textColor:'#fca5a5'},
  vunhealthy:{hex:'#a855f7',label:'Very Unhealthy',textColor:'#d8b4fe'},
};
 
const MOCK_DATA = {
  aqi: 142, pm25: 48.2, pm10: 92.5, no2: 38.4, o3: 28.1, co: 0.8, so2: 12.3,
  temp: 32, feels_like: 36, humidity: 78, wind: 4.2, visibility: 6.5,
  weather: 'Hazy Sunshine', weatherIcon: '🌤',
  city: 'Mumbai, Maharashtra',
};
 
function aqiCategory(v) {
  if (v <= 50)  return 'good';
  if (v <= 100) return 'moderate';
  if (v <= 150) return 'usg';
  if (v <= 200) return 'unhealthy';
  return 'vunhealthy';
}
 
function genForecast() {
  return Array.from({length:72},(_,i)=>{
    const h=i%24, df=h<6?-20:h<10?10:h<16?20:h<20?30:0;
    return Math.max(20,Math.min(220,Math.round(142+df+(Math.random()-.5)*25)));
  });
}
function genHourly() {
  return Array.from({length:24},(_,h)=>{
    const df=h<5?-30:h<9?20:h<13?30:h<18?35:h<21?20:-10;
    return Math.max(20,Math.min(220,Math.round(142+df+(Math.random()-.5)*20)));
  });
}
const forecast72 = genForecast();
const hourlyData  = genHourly();
 
/* ══ CLOCK ═════════════════════════════════════════ */
function updateClock() {
  const now = new Date();
  document.getElementById('clock').textContent =
    now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}
setInterval(updateClock, 1000);
updateClock();
 
/* ══ MAIN AQI ═══════════════════════════════════════ */
function initMainAQI() {
  const d = MOCK_DATA;
  const cat = aqiCategory(d.aqi);
  const col = AQI_COLORS[cat];
 
  // Sidebar
  document.getElementById('sidebar-aqi').textContent = d.aqi;
  document.getElementById('sidebar-aqi').style.color = col.hex;
  document.getElementById('sidebar-bar').style.width = Math.min(100, d.aqi/300*100)+'%';
  document.getElementById('sidebar-bar').style.background = col.hex;
  document.getElementById('sidebar-badge').textContent = col.label;
  document.getElementById('sidebar-city').textContent = d.city.replace(', Maharashtra','');
 
  // Topbar
  document.getElementById('topbar-city').textContent = d.city;
 
  // Gauge
  const arc = document.getElementById('gauge-arc');
  const totalLen = 172;
  const pct = Math.min(100, d.aqi / 300);
  setTimeout(()=>{
    arc.setAttribute('stroke-dasharray', `${totalLen*pct} ${totalLen}`);
  }, 200);
  document.getElementById('gauge-text').textContent = d.aqi;
 
  const labelMap = {good:'status-good',moderate:'status-moderate',usg:'status-usg',unhealthy:'status-unhealthy',vunhealthy:'status-unhealthy'};
  const badge = document.getElementById('aqi-status-badge');
  badge.textContent = col.label;
  badge.style.background = col.hex+'20';
  badge.style.color = col.textColor;
  badge.style.border = `1px solid ${col.hex}40`;
 
  // KPI cards
  document.getElementById('temp-val').textContent = d.temp+'°C';
  document.getElementById('feels-like').textContent = `Feels like ${d.feels_like}°C`;
  document.getElementById('pm25-kpi').textContent = d.pm25.toFixed(1);
  document.getElementById('humidity-kpi').textContent = d.humidity+'%';
  document.getElementById('wind-kpi').textContent = `Wind ${d.wind} m/s`;
 
  // Pollutants
  document.getElementById('pm25').textContent = d.pm25.toFixed(1);
  document.getElementById('pm10').textContent = d.pm10.toFixed(1);
  document.getElementById('no2').textContent  = d.no2.toFixed(1);
  document.getElementById('o3').textContent   = d.o3.toFixed(1);
  document.getElementById('so2').textContent  = d.so2.toFixed(1);
  document.getElementById('co').textContent   = d.co.toFixed(2);
 
  setTimeout(()=>{
    document.getElementById('pm25bar').style.width = Math.min(100,d.pm25/150*100)+'%';
    document.getElementById('pm10bar').style.width = Math.min(100,d.pm10/250*100)+'%';
    document.getElementById('no2bar').style.width  = Math.min(100,d.no2/200*100)+'%';
    document.getElementById('o3bar').style.width   = Math.min(100,d.o3/100*100)+'%';
    document.getElementById('so2bar').style.width  = Math.min(100,d.so2/75*100)+'%';
    document.getElementById('cobar').style.width   = Math.min(100,d.co/10*100)+'%';
    document.getElementById('sidebar-bar').style.width = Math.min(100,d.aqi/300*100)+'%';
  }, 250);
 
  // Weather
  document.getElementById('weather-icon').textContent = d.weatherIcon;
  document.getElementById('temp-weather').textContent = d.temp+'°C';
  document.getElementById('weather-desc').textContent = d.weather;
  document.getElementById('humidity').textContent = d.humidity+'%';
  document.getElementById('wind').textContent = d.wind+' m/s';
  document.getElementById('visibility').textContent = d.visibility+' km';
}
 
/* ══ SAFE HOURS ════════════════════════════════════ */
function initSafeHours() {
  const grid = document.getElementById('safe-hours-grid');
  const colMap = {good:'#22c55e',moderate:'#f0a500',usg:'#f97316',unhealthy:'#ef4444',vunhealthy:'#a855f7'};
  hourlyData.forEach((aqi,i)=>{
    const cat = aqiCategory(aqi);
    const block = document.createElement('div');
    block.className = 'sh-block';
    block.style.background = colMap[cat];
    block.style.opacity = cat==='good'?'1':cat==='moderate'?'.85':'.65';
    block.addEventListener('mouseenter',()=>{
      const t = document.getElementById('tooltip');
      t.textContent = `${i}:00 — AQI ${aqi}`;
      t.style.display = 'block';
    });
    block.addEventListener('mouseleave',()=>{ document.getElementById('tooltip').style.display='none'; });
    block.addEventListener('mousemove',(e)=>{
      const t = document.getElementById('tooltip');
      t.style.left=(e.clientX+12)+'px'; t.style.top=(e.clientY-32)+'px';
    });
    grid.appendChild(block);
  });
}
 
/* ══ HEATMAP ════════════════════════════════════════ */
function initHeatmap() {
  const canvas = document.getElementById('heatmap-canvas');
  const container = canvas.parentElement;
  canvas.width = container.offsetWidth;
  canvas.height = container.offsetHeight;
  const ctx = canvas.getContext('2d');
  const colMap = {good:'#22c55e',moderate:'#f0a500',usg:'#f97316',unhealthy:'#ef4444',vunhealthy:'#a855f7'};
 
  ctx.fillStyle = '#0e1219';
  ctx.fillRect(0,0,canvas.width,canvas.height);
 
  ctx.strokeStyle='rgba(255,255,255,0.03)'; ctx.lineWidth=1;
  for(let x=0;x<canvas.width;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();}
  for(let y=0;y<canvas.height;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke();}
 
  MUMBAI_ZONES.forEach(z=>{
    const cx=z.x*canvas.width, cy=z.y*canvas.height;
    const r=50+Math.random()*28;
    const col=colMap[z.cat]||'#f0a500';
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
    g.addColorStop(0,col+'55'); g.addColorStop(0.4,col+'30'); g.addColorStop(1,'transparent');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
  });
 
  MUMBAI_ZONES.forEach(z=>{
    const cx=z.x*canvas.width, cy=z.y*canvas.height;
    ctx.fillStyle='rgba(8,11,18,0.72)';
    ctx.beginPath(); ctx.roundRect(cx-30,cy-20,60,16,3); ctx.fill();
    ctx.fillStyle=colMap[z.cat]||'#fff';
    ctx.font='500 10px Syne,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(z.name,cx,cy-12);
    ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='9px DM Mono,monospace';
    ctx.fillText('AQI '+z.aqi,cx,cy+2);
  });
 
  canvas.addEventListener('click',(e)=>{
    const rect=canvas.getBoundingClientRect();
    const mx=(e.clientX-rect.left)*(canvas.width/rect.width);
    const my=(e.clientY-rect.top)*(canvas.height/rect.height);
    let closest=null, minD=9999;
    MUMBAI_ZONES.forEach(z=>{
      const d=Math.hypot(z.x*canvas.width-mx,z.y*canvas.height-my);
      if(d<minD){minD=d;closest=z;}
    });
    if(closest){
      document.getElementById('zone-name').textContent=closest.name;
      const col=AQI_COLORS[closest.cat]||AQI_COLORS.moderate;
      document.getElementById('zone-aqi').innerHTML=`AQI <strong style="color:${col.hex}">${closest.aqi}</strong> — ${col.label}`;
    }
  });
}
 
/* ══ FORECAST CHART ════════════════════════════════ */
function initForecastChart() {
  const labels=forecast72.map((_,i)=>{
    const h=i%24; const d=Math.floor(i/24);
    if(i===0||h===0) return ['Today','Day 2','Day 3'][d];
    if(h%6===0) return `${h}:00`;
    return '';
  });
  const colors=forecast72.map(v=>({good:'#22c55e',moderate:'#f0a500',usg:'#f97316',unhealthy:'#ef4444',vunhealthy:'#a855f7'}[aqiCategory(v)]));
  new Chart(document.getElementById('forecast-chart'),{
    type:'bar',
    data:{labels,datasets:[{label:'AQI',data:forecast72,backgroundColor:colors.map(c=>c+'80'),borderColor:colors,borderWidth:1,borderRadius:2}]},
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`AQI: ${c.parsed.y}`}}},
      scales:{
        x:{grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'#5a6478',font:{size:9},maxTicksLimit:12}},
        y:{min:0,max:250,grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'#5a6478',font:{size:9}}}
      }
    }
  });
}
 
/* ══ POLLUTANT DONUT ═══════════════════════════════ */
function initPollutantChart() {
  const d=MOCK_DATA;
  new Chart(document.getElementById('pollutant-chart'),{
    type:'doughnut',
    data:{
      labels:['PM2.5','PM10','NO₂','O₃','SO₂','CO'],
      datasets:[{
        data:[d.pm25,d.pm10,d.no2,d.o3,d.so2,d.co*10],
        backgroundColor:['#f97316cc','#f0a500cc','#4f8ef7cc','#22c55ecc','#a855f7cc','#ef4444cc'],
        borderColor:'#0e1219',borderWidth:2,
      }]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:true,position:'right',labels:{color:'#8892a4',font:{size:10},boxWidth:10,padding:7}}}
    }
  });
}
 
/* ══ HOURLY BARS ═══════════════════════════════════ */
function initHourlyGrid() {
  const grid=document.getElementById('hourly-grid');
  const colMap={good:'#22c55e',moderate:'#f0a500',usg:'#f97316',unhealthy:'#ef4444',vunhealthy:'#a855f7'};
  hourlyData.forEach((aqi,h)=>{
    const cat=aqiCategory(aqi);
    const col=colMap[cat];
    const pct=Math.min(100,aqi/250*100);
    const bar=document.createElement('div');
    bar.className='hr-bar';
    bar.innerHTML=`
      <div class="hr-vis" style="height:${28+pct*.6}px;background:${col}25;border:1px solid ${col}55;border-radius:5px 5px 2px 2px;width:32px;"></div>
      <div class="hr-num" style="color:${col}">${aqi}</div>
      <div class="hr-time">${h}:00</div>
    `;
    grid.appendChild(bar);
  });
}
 
/* ══ HEALTH ALERTS ═════════════════════════════════ */
const PERSONA_ALERTS = {
  general:[
    {type:'warning',icon:'😷',title:'Limit Prolonged Outdoor Exposure',body:'AQI is at 142. Healthy adults should limit outdoor time to under 2 hours.',action:'Set Outdoor Timer'},
    {type:'info',icon:'🪟',title:'Keep Windows Closed',body:'Outdoor air is worse than indoor. Use air purifiers if available.',action:'Learn More'},
    {type:'safe',icon:'🕕',title:'Best Window: 5AM–7AM',body:'Early morning AQI drops below 70. Plan walks or exercise then.',action:'Set Reminder'},
    {type:'info',icon:'💧',title:'Stay Hydrated',body:'Higher pollution with heat increases dehydration risk. Drink 2.5L today.',action:'Remind Me'},
  ],
  asthma:[
    {type:'danger',icon:'🫁',title:'High Asthma Risk Today',body:'PM2.5 at 48.2 µg/m³ significantly increases risk of asthma attacks. Keep rescue inhaler accessible.',action:'Emergency Plan'},
    {type:'danger',icon:'🚫',title:'Avoid Outdoor Exercise',body:'All outdoor physical activity is strongly discouraged for asthmatic individuals.',action:'Indoor Alternatives'},
    {type:'warning',icon:'💊',title:'Pre-Medicate Before Going Out',body:'If outdoor exposure is unavoidable, use bronchodilators 15 min prior.',action:'Medication Guide'},
    {type:'info',icon:'🏥',title:'Nearest Hospital: 2.3 km',body:'Kokilaben Dhirubhai Ambani Hospital is your nearest asthma-ready facility.',action:'Get Directions'},
  ],
  runner:[
    {type:'danger',icon:'🏃',title:"Cancel Today's Run",body:'AQI 142 means running outdoors exposes you to significantly more pollutants. Skip today.',action:'Indoor Workout Plan'},
    {type:'warning',icon:'⏰',title:'Reschedule to 5–7AM Tomorrow',body:'Forecast shows AQI dipping to 65–72 early tomorrow. Best window for cardio.',action:'Set Alarm'},
    {type:'info',icon:'😷',title:'Use N95 If You Must Run',body:'N95 masks reduce PM2.5 exposure by up to 95%. Reduce intensity too.',action:'Where to Buy'},
    {type:'safe',icon:'🏋',title:'Indoor Alternatives Today',body:'Treadmill, yoga, or indoor cycling. Equal benefit, zero pollution.',action:'Find Gyms Nearby'},
  ],
  child:[
    {type:'danger',icon:'👶',title:'Keep Children Indoors',body:"Children's developing lungs are 3× more vulnerable. No outdoor play until AQI < 100.",action:'Indoor Activity Ideas'},
    {type:'danger',icon:'🏫',title:'Alert School Administration',body:'Advise school to cancel outdoor recess and sports today.',action:'Send Alert Template'},
    {type:'warning',icon:'👴',title:'Elderly — Avoid All Outdoor Activity',body:'Cardiovascular and respiratory risks significantly elevated for individuals over 65.',action:'Caregiver Checklist'},
    {type:'info',icon:'🌿',title:'Indoor Air Purification',body:'Run HEPA purifiers in rooms. Avoid candles or high-heat cooking.',action:'Purifier Settings'},
  ],
  pregnant:[
    {type:'danger',icon:'🤱',title:'Elevated Risk for Pregnant Women',body:'Air pollution is linked to low birth weight and preterm birth. Stay indoors.',action:'Read Research'},
    {type:'warning',icon:'🚗',title:'Avoid High-Traffic Routes',body:'Vehicle exhaust is the primary PM2.5 source. Use AC on recirculation mode.',action:'Route Planner'},
    {type:'info',icon:'🍃',title:'Indoor Plants Can Help',body:'Snake plants and spider plants reduce indoor VOC levels.',action:'Plant Guide'},
    {type:'safe',icon:'👩‍⚕️',title:'Discuss with Your OB/GYN',body:'If regularly outdoors, discuss protective measures with your provider.',action:'Book Appointment'},
  ],
};
 
function renderAlerts(persona) {
  const cards = PERSONA_ALERTS[persona]||PERSONA_ALERTS.general;
  const container = document.getElementById('alert-cards');
  container.innerHTML='';
  cards.forEach(c=>{
    const div=document.createElement('div');
    div.className=`alert-card ${c.type}`;
    div.innerHTML=`<div class="ac-icon">${c.icon}</div><div class="ac-title">${c.title}</div><div class="ac-body">${c.body}</div><span class="ac-action">${c.action} →</span>`;
    container.appendChild(div);
  });
}
 
function initPersonaTabs() {
  document.querySelectorAll('.ptab').forEach(t=>{
    t.addEventListener('click',()=>{
      document.querySelectorAll('.ptab').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      renderAlerts(t.dataset.persona);
    });
  });
  renderAlerts('general');
}
 
/* ══ NOTIFICATIONS ═════════════════════════════════ */
const NOTIFS = [
  {type:'notif-crit',icon:'🚨',title:'CRITICAL: Dharavi AQI reached 189',desc:'Unhealthy levels detected. Vulnerable groups should stay indoors immediately.',time:'2 min ago'},
  {type:'notif-warn',icon:'⚠️',title:'Kurla crosses Unhealthy threshold',desc:'AQI in Kurla has risen to 168. Limit outdoor exposure.',time:'18 min ago'},
  {type:'notif-warn',icon:'🌫',title:'PM2.5 spike predicted at 5 PM',desc:'Industrial activity and evening traffic expected to push PM2.5 above 60 µg/m³.',time:'1 hr ago'},
  {type:'notif-good',icon:'✅',title:'Powai remains in Good range',desc:'Powai maintaining AQI below 50. Safe for outdoor activities all day.',time:'2 hr ago'},
];
function initNotifications() {
  const list=document.getElementById('notif-list');
  NOTIFS.forEach(n=>{
    const div=document.createElement('div');
    div.className=`notif ${n.type}`;
    div.innerHTML=`<div class="notif-icon-wrap">${n.icon}</div><div class="notif-body"><div class="notif-title">${n.title}</div><div class="notif-desc">${n.desc}</div></div><div class="notif-time">${n.time}</div>`;
    list.appendChild(div);
  });
}
 
/* ══ SEARCH ════════════════════════════════════════ */
document.getElementById('city-input').addEventListener('keydown',(e)=>{
  if(e.key==='Enter'){
    const v=e.target.value;
    document.getElementById('topbar-city').textContent=v;
    document.getElementById('sidebar-city').textContent=v.split(',')[0];
  }
});
 
/* ══ SAFE HOURS (FORECAST TAB) ═══════════════════════════ */
function initSafeHoursForecast() {
  const grid = document.getElementById('safe-hours-grid-forecast');
  if (!grid) return;
  const colMap = {good:'#22c55e',moderate:'#f0a500',usg:'#f97316',unhealthy:'#ef4444',vunhealthy:'#a855f7'};
  hourlyData.forEach((aqi,i)=>{
    const cat = aqiCategory(aqi);
    const block = document.createElement('div');
    block.className = 'sh-block';
    block.style.background = colMap[cat];
    block.style.opacity = cat==='good'?'1':cat==='moderate'?'.85':'.65';
    block.addEventListener('mouseenter',()=>{
      const t = document.getElementById('tooltip');
      t.textContent = `${i}:00 — AQI ${aqi}`;
      t.style.display = 'block';
    });
    block.addEventListener('mouseleave',()=>{ document.getElementById('tooltip').style.display='none'; });
    block.addEventListener('mousemove',(e)=>{
      const t = document.getElementById('tooltip');
      t.style.left=(e.clientX+12)+'px'; t.style.top=(e.clientY-32)+'px';
    });
    grid.appendChild(block);
  });
}
 
/* ══ ZONE RANKINGS ══════════════════════════════════════ */
function initZoneRankings() {
  const container = document.getElementById('zone-rankings');
  if (!container) return;
  const colMap = {good:'#22c55e',moderate:'#f0a500',usg:'#f97316',unhealthy:'#ef4444',vunhealthy:'#a855f7'};
  const sorted = [...MUMBAI_ZONES].sort((a,b) => a.aqi - b.aqi);
  sorted.forEach(z => {
    const col = colMap[z.cat] || '#f0a500';
    const pct = Math.min(100, z.aqi / 200 * 100);
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;';
    row.innerHTML = `
      <div style="width:90px;font-size:12px;color:var(--muted2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${z.name}</div>
      <div style="flex:1;height:6px;background:var(--bg4);border-radius:3px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:${col};border-radius:3px;transition:width .8s ease;"></div>
      </div>
      <div style="width:36px;text-align:right;font-size:12px;font-family:var(--font-mono);color:${col};">${z.aqi}</div>
    `;
    container.appendChild(row);
  });
}
 
/* ══ FORECAST SUMMARY ═══════════════════════════════════ */
function initForecastSummary() {
  const avg = Math.round(forecast72.reduce((a,b)=>a+b,0)/forecast72.length);
  document.getElementById('fc-avg').textContent = avg;
  const maxAqi = Math.max(...forecast72);
  const maxIdx = forecast72.indexOf(maxAqi);
  const day = Math.floor(maxIdx/24);
  const hour = maxIdx%24;
  document.getElementById('fc-worst-time').textContent = `Day ${day+1}, ${hour}:00`;
  document.getElementById('fc-worst-aqi').textContent = `Peak AQI ${maxAqi}`;
  const dayAvgs = [0,1,2].map(d => {
    const slice = forecast72.slice(d*24, d*24+24);
    return Math.round(slice.reduce((a,b)=>a+b,0)/slice.length);
  });
  const bestDay = dayAvgs.indexOf(Math.min(...dayAvgs));
  document.getElementById('fc-best-day').textContent = bestDay===0?'Today':`Day ${bestDay+1}`;
  document.getElementById('fc-best-aqi').textContent = `Avg AQI ${dayAvgs[bestDay]}`;
}
 
/* ══ TAB SWITCHING ══════════════════════════════════════ */
const TAB_TITLES = {
  dashboard:     'Dashboard',
  heatmap:       'Heatmap',
  forecast:      'Forecast',
  health:        'Health Alerts',
  notifications: 'Notifications',
  history:       'History',
};
 
let heatmapInited = false;
 
function switchTab(tabId) {
  document.querySelectorAll('.tab-panel').forEach(p => { p.style.display = 'none'; });
  const panel = document.getElementById('tab-' + tabId);
  if (panel) panel.style.display = '';
 
  document.querySelectorAll('.nav-item[data-tab]').forEach(x => x.classList.remove('active'));
  const activeItem = document.querySelector('.nav-item[data-tab="' + tabId + '"]');
  if (activeItem) activeItem.classList.add('active');
 
  document.getElementById('topbar-tab-title').textContent = TAB_TITLES[tabId] || tabId;
  document.querySelector('.main').scrollTop = 0;
 
  if (tabId === 'heatmap' && !heatmapInited) {
    setTimeout(() => { initHeatmap(); heatmapInited = true; }, 50);
  }
}
 
document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
  item.addEventListener('click', () => switchTab(item.dataset.tab));
});
 
/* ══ INIT ═══════════════════════════════════════════ */
window.addEventListener('load',()=>{
  initMainAQI();
  initSafeHours();
  initSafeHoursForecast();
  // heatmap is lazy-inited on tab switch
  initForecastChart();
  initPollutantChart();
  initHourlyGrid();
  initPersonaTabs();
  initNotifications();
  initZoneRankings();
  initForecastSummary();
  // Start on dashboard tab
  switchTab('dashboard');
});

