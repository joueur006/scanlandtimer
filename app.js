// Timer state
let startTime, timerInterval, elapsed = 0, pausedTime = 0, pauseStart;
let isRunning = false; let chart;

function formatHMS(ms){
  const s = Math.floor(ms/1000);
  const hh = Math.floor(s/3600).toString().padStart(2,'0');
  const mm = Math.floor((s%3600)/60).toString().padStart(2,'0');
  const ss = (s%60).toString().padStart(2,'0');
  return `${hh}:${mm}:${ss}`;
}

// format seconds into human readable hours/minutes (e.g. "1 h 23 m" or "18 m")
function formatHoursFromSeconds(seconds){
  seconds = Math.round(seconds);
  const h = Math.floor(seconds/3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h} h ${m} m`;
  return `${m} m`;
}

function formatDecimalHoursToReadable(decimalHours){
  const seconds = Math.round(decimalHours * 3600);
  return formatHoursFromSeconds(seconds);
}

function updateTimer(){
  const now = Date.now();
  const diff = (isRunning ? (now - startTime + elapsed) : elapsed);
  document.getElementById('timer').textContent = formatHMS(diff);
}

function startTimer(){
  if (!isRunning){ startTime = Date.now(); timerInterval = setInterval(updateTimer,1000); isRunning = true; }
}

function pauseTimer(){
  const now = Date.now();
  if (isRunning){ clearInterval(timerInterval); elapsed += now - startTime; pauseStart = now; isRunning = false; updateTimer(); }
  else { if (pauseStart){ pausedTime += now - pauseStart; startTime = now; timerInterval = setInterval(updateTimer,1000); isRunning = true; } }
}

function stopTimer(){
  const now = Date.now();
  if (isRunning){ clearInterval(timerInterval); elapsed += now - startTime; }

  const matiere = document.getElementById('subjectSelect').value || '';
  const chapitre = document.getElementById('chapterSelect').value || '';
  const date = new Date().toISOString();
  const duree = formatHMS(elapsed);

  const session = { date, matiere, chapitre, duree, pauses: Math.floor(pausedTime/1000) + 's', dureeMs: elapsed };
  const history = JSON.parse(localStorage.getItem('sessions')||'[]');
  history.push(session);
  localStorage.setItem('sessions', JSON.stringify(history));

  // refresh UI
  afficherHistorique(); updateChart(); updateStats();

  // reset timer
  elapsed = 0; pausedTime = 0; isRunning = false; pauseStart = null;
  document.getElementById('timer').textContent = '00:00:00';
}

// History UI
function afficherHistorique(){
  const history = JSON.parse(localStorage.getItem('sessions')||'[]');
  const tbody = document.getElementById('history'); tbody.innerHTML = '';
  const cardsContainer = document.getElementById('historyCards'); if (cardsContainer) cardsContainer.innerHTML = '';

  const viewModeEl = document.getElementById('historyViewMode');
  const mode = viewModeEl ? viewModeEl.value : 'all';

  if (mode === 'bySubject'){
    // group sessions by subject
    const grouped = {};
    history.forEach(s => {
      const key = s.matiere || 'Sans matière';
      grouped[key] = grouped[key] || { sessions: [], totalSeconds: 0 };
      grouped[key].sessions.push(s);
      const seconds = s.dureeMs ? Math.round(s.dureeMs/1000) : (function(){const p=s.duree.split(':');return (+p[0])*3600+(+p[1])*60+(+p[2]);})();
      grouped[key].totalSeconds += seconds;
    });

    // render grouped table: subject row with total, then its sessions
    Object.keys(grouped).sort().forEach(sub => {
      const g = grouped[sub];
      const trSummary = document.createElement('tr');
      const hh = Math.floor(g.totalSeconds/3600); const mm = Math.floor((g.totalSeconds%3600)/60);
      trSummary.innerHTML = `<td><strong>-</strong></td><td><strong>${sub}</strong></td><td></td><td><strong>${hh}h ${mm}m</strong></td><td></td>`;
      tbody.appendChild(trSummary);
      g.sessions.slice().reverse().forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td style="font-size:0.9rem">${new Date(s.date).toLocaleString()}</td><td>${s.matiere || '-'}</td><td>${s.chapitre || '-'}</td><td>${s.duree}</td><td>${s.pauses}</td>`;
        tbody.appendChild(tr);
      });
    });

    // compact cards view grouped
    if (cardsContainer){
      Object.keys(grouped).sort().forEach(sub => {
        const g = grouped[sub];
        const div = document.createElement('div'); div.className='history-card';
        const title = document.createElement('div'); title.innerHTML = `<strong>${sub}</strong> — <span style="color:var(--muted)">${Math.floor(g.totalSeconds/3600)}h ${Math.floor((g.totalSeconds%3600)/60)}m</span>`;
        div.appendChild(title);
        g.sessions.slice().reverse().forEach(s => { const p = document.createElement('div'); p.textContent = `${new Date(s.date).toLocaleString()} — ${s.chapitre || '-'} • ${s.duree}`; div.appendChild(p); });
        cardsContainer.appendChild(div);
      });
    }

  } else {
    // default: flat list
    history.slice().reverse().forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${new Date(s.date).toLocaleString()}</td><td>${s.matiere || '-'}</td><td>${s.chapitre || '-'}</td><td>${s.duree}</td><td>${s.pauses}</td>`;
      tbody.appendChild(tr);

      if (cardsContainer){
        const card = document.createElement('div'); card.className = 'history-card';
        const title = document.createElement('div'); title.innerHTML = `<strong>${s.matiere || '-'}</strong> — <span style="color:var(--muted)">${new Date(s.date).toLocaleString()}</span>`;
        const body = document.createElement('div'); body.textContent = `Chapitre: ${s.chapitre || '-'} • Durée: ${s.duree} • Pauses: ${s.pauses}`;
        const meta = document.createElement('div'); meta.className = 'meta'; meta.textContent = `Export ID: ${s.date}`;
        card.appendChild(title); card.appendChild(body); card.appendChild(meta);
        cardsContainer.appendChild(card);
      }
    });
  }
  // init scroll controls for table
  initTableScroll();
}

// Weekly aggregation
function getWeekNumber(d){ d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7)); const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1)); return Math.ceil((((d - yearStart) / 86400000) + 1)/7); }

function getWeeklyData(){
  const history = JSON.parse(localStorage.getItem('sessions')||'[]');
  const weekly = {};
  history.forEach(s => {
    const d = new Date(s.date);
    const key = `${d.getFullYear()}-S${getWeekNumber(d)}`;
    const seconds = s.dureeMs ? Math.round(s.dureeMs/1000) : (function(){const p=s.duree.split(':');return (+p[0])*3600+(+p[1])*60+(+p[2]);})();
    weekly[key] = (weekly[key]||0) + seconds/3600; // hours
  });
  return weekly;
}

// Agrégation: cette semaine, par jour (Mon..Dim) et par matière
function getThisWeekByDayData(){
  const history = JSON.parse(localStorage.getItem('sessions')||'[]');
  const subjectsOrder = getSubjectsByFrequency(history);
  const now = new Date(); const weekNow = getWeekNumber(now); const yearNow = now.getFullYear();
  const days = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  const map = {};

  // init map for stable ordering
  subjectsOrder.forEach(s => map[s] = [0,0,0,0,0,0,0]);

  history.forEach(s => {
    const d = new Date(s.date);
    if (getWeekNumber(d) !== weekNow || d.getFullYear() !== yearNow) return;
    const dayIndex = (d.getDay() + 6) % 7; // convert JS 0=Sun to 0=Mon
    const seconds = s.dureeMs ? Math.round(s.dureeMs/1000) : (function(){const p=s.duree.split(':');return (+p[0])*3600+(+p[1])*60+(+p[2]);})();
    const hours = seconds/3600;
    if (!map[s.matiere]) map[s.matiere] = [0,0,0,0,0,0,0];
    map[s.matiere][dayIndex] += hours;
  });

  const labels = days;
  const datasets = subjectsOrder.filter(sub => (map[sub]||[]).some(v=>v>0)).map(sub => ({
    label: sub,
    data: map[sub] || [0,0,0,0,0,0,0],
    backgroundColor: getColorForSubject(sub, subjectsOrder)
  }));

  return { labels, datasets };
}

// Totaux par matière (toutes semaines)
function getTotalsBySubject(){
  const history = JSON.parse(localStorage.getItem('sessions')||'[]');
  const totals = {};
  history.forEach(s=>{
    const seconds = s.dureeMs ? Math.round(s.dureeMs/1000) : (function(){const p=s.duree.split(':');return (+p[0])*3600+(+p[1])*60+(+p[2]);})();
    totals[s.matiere] = (totals[s.matiere]||0) + seconds/3600;
  });
  const subjectsOrder = getSubjectsByFrequency(history);
  const labels = subjectsOrder.filter(l => (totals[l]||0) > 0);
  const data = labels.map(l => +((totals[l]||0).toFixed(2)));
  const datasets = [{ label: 'Heures', data, backgroundColor: labels.map(l=>getColorForSubject(l, subjectsOrder)) }];
  return { labels, datasets };
}

// palette simple
function palette(){
  return ['#60a5fa','#34d399','#f59e0b','#fb7185','#a78bfa','#f97316','#06b6d4','#ef4444'];
}

// compute subjects ordered by total frequency (hours) across entire history
function getSubjectsByFrequency(history){
  const totals = {};
  history.forEach(s=>{
    const seconds = s.dureeMs ? Math.round(s.dureeMs/1000) : (function(){const p=s.duree.split(':');return (+p[0])*3600+(+p[1])*60+(+p[2]);})();
    totals[s.matiere] = (totals[s.matiere]||0) + seconds/3600;
  });
  return Object.keys(totals).sort((a,b)=> (totals[b]||0) - (totals[a]||0));
}

// get color for a subject according to the subjects order
function getColorForSubject(subject, subjectsOrder){
  const i = subjectsOrder.indexOf(subject);
  const pal = palette();
  return pal[(i >= 0 ? i : 0) % pal.length];
}

function updateChart(mode){
  mode = mode || document.getElementById('chartMode').value;
  if (chart) chart.destroy();

  if (mode === 'thisWeekByDay'){
    const d = getThisWeekByDayData();
    chart = new Chart(document.getElementById('weeklyChart'),{
      type: 'bar',
      data: d,
      options: {
  scales: { x:{ stacked:true }, y:{ beginAtZero:true, stacked:true, ticks:{ callback: v => formatDecimalHoursToReadable(Number(v) || 0) } } },
        plugins: {
          tooltip:{
            mode:'index',intersect:false,
            callbacks: {
              label: function(ctx){ const val = ctx.raw; return ctx.dataset.label + ': ' + formatDecimalHoursToReadable(val); }
            }
          }
        }
      }
    });
    return;
  }

  if (mode === 'bySubject'){
    const d = getTotalsBySubject();
    chart = new Chart(document.getElementById('weeklyChart'),{
      type:'bar',
      data: d,
      options:{
        indexAxis:'y',
  scales:{ x:{ beginAtZero:true, ticks:{ callback: v => formatDecimalHoursToReadable(Number(v) || 0) } } },
  plugins:{ tooltip:{ callbacks:{ label: function(ctx){ const val = ctx.raw; return ctx.dataset.label + ': ' + formatDecimalHoursToReadable(val); } } } }
      }
    });
    return;
  }

  // fallback: weekly totals
  const weekly = getWeeklyData();
  const labels = Object.keys(weekly); const data = Object.values(weekly).map(v=>+v.toFixed(2));
    chart = new Chart(document.getElementById('weeklyChart'),{
    type:'bar',
    data:{labels, datasets:[{label:'Heures',data,backgroundColor:'#60a5fa'}]},
    options:{
  scales:{ y:{ beginAtZero:true, ticks:{ callback: v => formatDecimalHoursToReadable(Number(v) || 0) } } },
  plugins:{ tooltip:{ callbacks:{ label: function(ctx){ const val = ctx.raw; return ctx.dataset.label + ': ' + formatDecimalHoursToReadable(val); } } } }
    }
  });
}

// Subjects -> chapters management (stored as object { subject: string, chapters: [string] })
function loadSubjects(){
  return JSON.parse(localStorage.getItem('subjects')||'[]');
}

function saveSubjects(list){
  localStorage.setItem('subjects', JSON.stringify(list));
}

function findSubject(name){
  const list = loadSubjects(); return list.find(s=>s.name === name);
}

function renderSubjectsList(){
  const list = loadSubjects(); const container = document.getElementById('subjectsList'); container.innerHTML='';
  list.forEach((s, i)=>{
    const div = document.createElement('div'); div.style.display='flex'; div.style.justifyContent='space-between'; div.style.alignItems='center'; div.style.padding='10px';
    const left = document.createElement('div'); left.innerHTML = `<strong>${s.name}</strong><div style="font-size:0.85rem;color:var(--muted)">${s.chapters && s.chapters.length? s.chapters.join(' · ') : '<em>aucun chapitre</em>'}</div>`;
    const right = document.createElement('div');
    const addChapBtn = document.createElement('button'); addChapBtn.className='ghost'; addChapBtn.textContent='Ajouter chapitre'; addChapBtn.addEventListener('click', ()=>{ const ch = prompt('Nom du chapitre'); if (ch) { addChapterToSubject(s.name, ch); } });
    const delBtn = document.createElement('button'); delBtn.className='warn'; delBtn.textContent='Supprimer matière'; delBtn.addEventListener('click', ()=>{ removeSubject(i); });
    right.appendChild(addChapBtn); right.appendChild(delBtn);
    div.appendChild(left); div.appendChild(right); container.appendChild(div);
  });
}

function populateSubjectAndChapterSelects(){
  const subjects = loadSubjects(); const sel = document.getElementById('subjectSelect'); const chap = document.getElementById('chapterSelect');
  sel.innerHTML = '<option value="">-- Aucune matière --</option>';
  chap.innerHTML = '<option value="">-- Chapitre (optionnel) --</option>';
  subjects.forEach(s=>{ const o = document.createElement('option'); o.value = s.name; o.textContent = s.name; sel.appendChild(o); });
  sel.addEventListener('change', ()=>{
    const cur = sel.value; chap.innerHTML = '<option value="">-- Chapitre (optionnel) --</option>';
    const subj = findSubject(cur); if (subj && subj.chapters) subj.chapters.forEach(c=>{ const o = document.createElement('option'); o.value = c; o.textContent = c; chap.appendChild(o); });
  });
}

function addSubject(name, chapter){
  if (!name || !name.trim()) return;
  const list = loadSubjects(); if (list.some(s=>s.name.toLowerCase()===name.toLowerCase())){ // if exists, add chapter
    if (chapter && chapter.trim()) addChapterToSubject(list.find(s=>s.name.toLowerCase()===name.toLowerCase()).name, chapter);
    return;
  }
  list.push({ name: name.trim(), chapters: chapter && chapter.trim()? [chapter.trim()] : [] }); saveSubjects(list); renderSubjectsList(); populateSubjectAndChapterSelects();
}

function removeSubject(index){
  const list = loadSubjects();
  if (index < 0 || index >= list.length) return;
  const subjName = list[index].name;
  if (!confirm(`Supprimer la matière « ${subjName} » (tous ses chapitres) et supprimer tout l'historique associé ? Cette action est irréversible.`)) return;

  // remove sessions linked to this subject
  let history = JSON.parse(localStorage.getItem('sessions')||'[]');
  history = history.filter(s => s.matiere !== subjName);
  localStorage.setItem('sessions', JSON.stringify(history));

  // remove subject
  list.splice(index,1);
  saveSubjects(list);
  renderSubjectsList();
  populateSubjectAndChapterSelects();

  // refresh UI that depends on history/subjects
  afficherHistorique();
  updateChart();
  updateStats();
}

function addChapterToSubject(subjectName, chapterName){ if (!chapterName || !chapterName.trim()) return; const list = loadSubjects(); const s = list.find(x=>x.name===subjectName); if (!s) return; if (!s.chapters) s.chapters=[]; if (!s.chapters.includes(chapterName)) s.chapters.push(chapterName); saveSubjects(list); renderSubjectsList(); populateSubjectAndChapterSelects(); }

// listen mode change and subject events
document.addEventListener('DOMContentLoaded', ()=>{
  const mode = document.getElementById('chartMode');
  mode.addEventListener('change', ()=> updateChart(mode.value));

  renderSubjectsList(); populateSubjectAndChapterSelects();
  document.getElementById('addSubjectBtn').addEventListener('click', ()=>{
    const name = document.getElementById('newSubjectInput').value.trim(); const ch = document.getElementById('newChapterInput').value.trim(); if (!name) return; addSubject(name, ch); document.getElementById('newSubjectInput').value = ''; document.getElementById('newChapterInput').value = '';
  });

  const histMode = document.getElementById('historyViewMode'); if (histMode) histMode.addEventListener('change', ()=> afficherHistorique());
});

// Stats: this week
function updateStats(){
  const history = JSON.parse(localStorage.getItem('sessions')||'[]');
  const now = new Date(); const weekNow = getWeekNumber(now); const yearNow = now.getFullYear();
  let totalSeconds = 0; const jours = new Set(); const matieres = {};
  history.forEach(s=>{
    const d = new Date(s.date); if (getWeekNumber(d)!==weekNow || d.getFullYear()!==yearNow) return;
    const seconds = s.dureeMs ? Math.round(s.dureeMs/1000) : (function(){const p=s.duree.split(':');return (+p[0])*3600+(+p[1])*60+(+p[2]);})();
    totalSeconds += seconds; jours.add(d.toDateString()); matieres[s.matiere] = (matieres[s.matiere]||0) + seconds;
  });
  const totalHeures = (totalSeconds/3600).toFixed(2); const moyenne = (jours.size? (totalSeconds/3600/jours.size).toFixed(2) : '0.00');
  let top = '-'; if (Object.keys(matieres).length) top = Object.entries(matieres).sort((a,b)=>b[1]-a[1])[0][0];
  document.getElementById('totalSemaine').textContent = formatHoursFromSeconds(totalSeconds);
  document.getElementById('moyenneJour').textContent = formatHoursFromSeconds(Math.round(totalSeconds / (jours.size||1)));
  document.getElementById('topMatiere').textContent = top;
  renderTopSubjects();
}

// Top 3 subjects with chapters and durations (for current week)
function renderTopSubjects(){
  const history = JSON.parse(localStorage.getItem('sessions')||'[]');
  const now = new Date(); const weekNow = getWeekNumber(now); const yearNow = now.getFullYear();
  const subjTotals = {}; // subj -> seconds
  const subjChapters = {}; // subj -> {chapter: seconds}

  history.forEach(s=>{
    const d = new Date(s.date); if (getWeekNumber(d)!==weekNow || d.getFullYear()!==yearNow) return;
    const seconds = s.dureeMs ? Math.round(s.dureeMs/1000) : (function(){const p=s.duree.split(':');return (+p[0])*3600+(+p[1])*60+(+p[2]);})();
    const sub = s.matiere || '-'; const ch = s.chapitre || '';
    subjTotals[sub] = (subjTotals[sub]||0) + seconds;
    subjChapters[sub] = subjChapters[sub] || {};
    if (ch) subjChapters[sub][ch] = (subjChapters[sub][ch]||0) + seconds;
  });

  const subjectsOrder = getSubjectsByFrequency(history);
  const sorted = Object.entries(subjTotals).sort((a,b)=>b[1]-a[1]);
  const top3 = sorted.slice(0,3);
  const container = document.getElementById('topSubjectsList'); container.innerHTML = '';
  const compact = document.getElementById('topUnderTimer'); if (compact) compact.innerHTML = '';

  top3.forEach(([sub, seconds], idx)=>{
    const h = Math.floor(seconds/3600); const m = Math.floor((seconds%3600)/60);
    const color = getColorForSubject(sub, subjectsOrder);

    const card = document.createElement('div'); card.className = 'top-card';
    const dot = document.createElement('div'); dot.style.width='10px'; dot.style.height='10px'; dot.style.background = color; dot.style.borderRadius='2px'; dot.style.marginTop='6px';
    const content = document.createElement('div'); content.className = 'content';
    const titleLine = document.createElement('div'); titleLine.innerHTML = `<strong>${sub}</strong> <span style='color:var(--muted)'>(${h}h ${m}m)</span>`;
    content.appendChild(titleLine);

    const chContainer = document.createElement('div'); chContainer.className = 'chapters';
    const chapters = subjChapters[sub] || {};
    const chapEntries = Object.entries(chapters).sort((a,b)=>b[1]-a[1]);
    const topChaps = chapEntries.slice(0,3);
    if (topChaps.length){
      topChaps.forEach(([c, ssec])=>{ const hh = Math.floor(ssec/3600); const mm = Math.floor((ssec%3600)/60); const ch = document.createElement('div'); ch.className='chapter'; ch.textContent = `• ${c} (${hh}h ${mm}m)`; chContainer.appendChild(ch); });
    } else {
      const subjObj = findSubject(sub);
      if (subjObj && subjObj.chapters && subjObj.chapters.length){ subjObj.chapters.slice(0,2).forEach(c=>{ const ch = document.createElement('div'); ch.className='chapter'; ch.textContent = `• ${c}`; chContainer.appendChild(ch); }); }
    }

    content.appendChild(chContainer);
    card.appendChild(dot); card.appendChild(content);
    container.appendChild(card);

    // compact under timer
    if (compact){ const item = document.createElement('div'); item.className='top-card'; const dot2 = dot.cloneNode(true); dot2.style.marginTop='4px'; const ct = document.createElement('div'); ct.className='content'; ct.innerHTML = `<strong>${sub}</strong><div class="chapters"><div class="chapter">${h}h ${m}m</div></div>`; item.appendChild(dot2); item.appendChild(ct); compact.appendChild(item); }
  });
}

// init
// default tab
function showTab(id){
  document.querySelectorAll('.tab').forEach(t=> t.style.display = 'none');
  const el = document.getElementById(id); if (!el) return; el.style.display = '';
  // update active state on nav buttons
  try{
    document.querySelectorAll('nav button[data-tab]').forEach(b=>{
      if (b.getAttribute('data-tab') === id) b.classList.add('active'); else b.classList.remove('active');
    });
  }catch(e){/* noop */}
  // refresh according to tab
  if (id === 'historyTab') afficherHistorique();
  if (id === 'progressTab') { updateChart(); updateStats(); }
  if (id === 'subjectsTab') { renderSubjectsList(); }
}

// show timer tab by default
showTab('timerTab');

// initial render for other components
afficherHistorique(); updateChart(); updateStats(); renderSubjectsList(); populateSubjectAndChapterSelects();
// small interval to refresh timer display when visible
setInterval(()=>{ if (isRunning) updateTimer(); }, 1000);

// Table scroll initializer
function initTableScroll(){
  const wrapper = document.querySelector('.table-wrapper'); if (!wrapper) return;
  const resp = wrapper.querySelector('.table-responsive'); const btnL = wrapper.querySelector('.table-scroll-btn.left'); const btnR = wrapper.querySelector('.table-scroll-btn.right');
  // check overflow
  const isOverflow = resp.scrollWidth > resp.clientWidth + 1;
  if (isOverflow){ btnL.classList.remove('hidden'); btnR.classList.remove('hidden'); } else { btnL.classList.add('hidden'); btnR.classList.add('hidden'); }

  btnL.onclick = ()=>{ resp.scrollBy({ left: -Math.min(300, resp.clientWidth), behavior: 'smooth' }); };
  btnR.onclick = ()=>{ resp.scrollBy({ left: Math.min(300, resp.clientWidth), behavior: 'smooth' }); };

  // update visibility on scroll
  resp.onscroll = ()=>{
    if (resp.scrollLeft <= 5) btnL.classList.add('hidden'); else btnL.classList.remove('hidden');
    if (resp.scrollLeft + resp.clientWidth >= resp.scrollWidth - 5) btnR.classList.add('hidden'); else btnR.classList.remove('hidden');
  };
}

// ensure buttons state on resize
window.addEventListener('resize', ()=>{ setTimeout(initTableScroll, 120); });
window.addEventListener('load', ()=>{ setTimeout(initTableScroll, 120); });

// Export and reset data
function exportData(){
  const sessions = JSON.parse(localStorage.getItem('sessions')||'[]');
  const subjects = JSON.parse(localStorage.getItem('subjects')||'[]');
  const payload = { exportedAt: new Date().toISOString(), sessions, subjects };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const name = `scanland-export-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function resetData(){
  if (!confirm('Réinitialiser toutes les données (sessions et matières) ? Cette action est irréversible.')) return;
  localStorage.removeItem('sessions');
  localStorage.removeItem('subjects');
  // reset UI
  renderSubjectsList();
  populateSubjectAndChapterSelects();
  afficherHistorique();
  updateChart();
  updateStats();
  // also reset timer state
  clearInterval(timerInterval);
  elapsed = 0; pausedTime = 0; isRunning = false; pauseStart = null;
  document.getElementById('timer').textContent = '00:00:00';
}

// Import data from JSON file. Offers merge or replace.
function importData(){
  const input = document.getElementById('importFileInput');
  input.value = '';
  input.onchange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      // basic validation: expect object with sessions and/or subjects arrays
      const hasSessions = Array.isArray(parsed.sessions);
      const hasSubjects = Array.isArray(parsed.subjects);
      if (!hasSessions && !hasSubjects){ alert('Fichier JSON invalide : aucune clé "sessions" ou "subjects" trouvée.'); return; }

      const action = confirm('Voulez-vous remplacer toutes les données existantes par celles du fichier importé ? (OK = Remplacer, Annuler = Fusionner)') ? 'replace' : 'merge';

      if (action === 'replace'){
        if (hasSessions) localStorage.setItem('sessions', JSON.stringify(parsed.sessions)); else localStorage.removeItem('sessions');
        if (hasSubjects) localStorage.setItem('subjects', JSON.stringify(parsed.subjects)); else localStorage.removeItem('subjects');
      } else {
        // merge: combine arrays, avoid duplicates for subjects by name
        if (hasSessions){
          const existing = JSON.parse(localStorage.getItem('sessions')||'[]');
          const combined = existing.concat(parsed.sessions || []);
          localStorage.setItem('sessions', JSON.stringify(combined));
        }
        if (hasSubjects){
          const existing = JSON.parse(localStorage.getItem('subjects')||'[]');
          const map = {};
          existing.concat(parsed.subjects || []).forEach(s => { if (!s || !s.name) return; if (!map[s.name]) map[s.name] = { name: s.name, chapters: Array.isArray(s.chapters)? [...new Set(s.chapters)] : [] }; else { if (Array.isArray(s.chapters)) map[s.name].chapters = Array.from(new Set(map[s.name].chapters.concat(s.chapters))); } });
          const merged = Object.values(map);
          localStorage.setItem('subjects', JSON.stringify(merged));
        }
      }

      // refresh UI
      renderSubjectsList(); populateSubjectAndChapterSelects(); afficherHistorique(); updateChart(); updateStats();
      alert('Import terminé.');
    } catch (err){
      console.error(err);
      alert('Erreur lors de la lecture/du parsing du fichier JSON.');
    }
  };
  input.click();
}
