let data = JSON.parse(localStorage.getItem('humanizaHubData') || '{"clients":[]}');
let selectedClientId = new URLSearchParams(window.location.search).get('id');
let selectedProjectId = localStorage.getItem('hubSelectedProject') || null;

function saveAll(){localStorage.setItem('humanizaHubData', JSON.stringify(data))}
function currentClient(){return data.clients.find(c=>c.id===selectedClientId)}
function currentProject(){return currentClient()?.projects.find(p=>p.id===selectedProjectId)}
function autoGrow(el){el.style.height='auto';el.style.height=(el.scrollHeight+2)+'px'; saveCurrentFields()}
function statusPill(status){
  if(status==='Aprovado')return '<span class="pill green">Aprovado</span>';
  if(status==='Ajustes solicitados')return '<span class="pill yellow">Ajustes</span>';
  if(status==='Bloqueado')return '<span class="pill lock">Bloqueado</span>';
  if(status==='Em andamento'||status==='Em desenvolvimento')return '<span class="pill purple">'+status+'</span>';
  return '<span class="pill yellow">'+status+'</span>';
}
function progress(p){
  let n=0;
  if(p.strategicStatus==='Aprovado')n+=25;
  if(p.productionStatus==='Aprovado')n+=25;
  if(p.calendarStatus==='Aprovado')n+=25;
  if(p.approvalStatus==='Finalizado')n+=25;
  return n;
}
function stepClass(status){
  if(status==='Aprovado')return 'done';
  if(status==='Bloqueado')return 'locked';
  return 'active';
}
function selectProject(id){
  saveCurrentFields();
  selectedProjectId=id;
  localStorage.setItem('hubSelectedProject',id);
  renderClientPortal();
}
function field(label,id,value){
  return `<div class="content-box"><label>${label}</label><div class="readonly-box">${value||''}</div></div>`;
}
function renderProjectDetail(c,p){
  return `
    <div class="stage">
      <div class="stage-head">
        <div><h2>Projeto ${p.period}</h2><p>Etapas liberadas conforme aprovação.</p></div>
        <span class="pill">${progress(p)}%</span>
      </div>
      <div class="flow">
        <div class="step ${stepClass(p.strategicStatus)}"><b>01 Planejamento</b><br>${p.strategicStatus}</div>
        <div class="step ${stepClass(p.productionStatus)}"><b>02 Desenvolvimento</b><br>${p.productionStatus}</div>
        <div class="step ${stepClass(p.calendarStatus)}"><b>03 Calendário</b><br>${p.calendarStatus}</div>
        <div class="step ${stepClass(p.approvalStatus)}"><b>04 Aprovações</b><br>${p.approvalStatus}</div>
      </div>
    </div>
    ${stageStrategic(p)}
    ${stageProduction(p)}
    ${stageCalendar(p)}
    <div class="stage">
      <h2>Histórico</h2>
      <div class="timeline">${(p.history||[]).map(h=>`<div>${h}</div>`).join('')}</div>
    </div>`;
}
function stageStrategic(p){
  return `<div class="stage">
    <div class="stage-head"><div><h2>01 Planejamento Estratégico</h2><p>A produção só libera após essa aprovação.</p></div>${statusPill(p.strategicStatus)}</div>
    <div class="content-grid">
      ${field('Visão Macro','strategic_macro',p.strategic.macro)}
      ${field('Linha Editorial','strategic_editorial',p.strategic.editorial)}
      ${field('Temas do mês','strategic_themes',p.strategic.themes)}
      ${field('Direção Criativa','strategic_creative',p.strategic.creative)}
    </div>
    <label>Observações do cliente</label>
    <textarea class="note" id="strategic_note" oninput="autoGrow(this)">${p.strategic.note||''}</textarea>
    <div class="actions">
      <button class="btn-green" onclick="approveStrategic()">Aprovar planejamento</button>
      <button class="btn-yellow" onclick="requestAdjust('strategic')">Solicitar ajustes</button>
    </div>
  </div>`;
}
function stageProduction(p){
  return `<div class="stage ${p.productionStatus==='Bloqueado'?'locked':''}">
    <div class="stage-head"><div><h2>02 Desenvolvimento Criativo</h2><p>Produção seguindo exatamente o planejamento aprovado.</p></div>${statusPill(p.productionStatus)}</div>
    ${p.productionStatus==='Bloqueado'?'<p class="muted">Bloqueado até aprovação do planejamento.</p>':`
      <div class="content-grid">
        ${field('Roteiros','production_reels',p.production.reels)}
        ${field('Carrosséis','production_carousel',p.production.carousel)}
        ${field('Estático','production_staticPost',p.production.staticPost)}
        ${field('Captação','production_capture',p.production.capture)}
      </div>
      <label>Observações do cliente</label>
      <textarea class="note" id="production_note" oninput="autoGrow(this)">${p.production.note||''}</textarea>
      <div class="actions">
        <button class="btn-green" onclick="approveProduction()">Aprovar desenvolvimento</button>
        <button class="btn-yellow" onclick="requestAdjust('production')">Solicitar ajustes</button>
      </div>`}
  </div>`;
}
function stageCalendar(p){
  return `<div class="stage ${p.calendarStatus==='Bloqueado'?'locked':''}">
    <div class="stage-head"><div><h2>03 Calendário Editorial</h2><p>Organização de datas, formatos e temas.</p></div>${statusPill(p.calendarStatus)}</div>
    ${p.calendarStatus==='Bloqueado'?'<p class="muted">Bloqueado até aprovação do desenvolvimento.</p>':`
      ${field('Calendário Editorial','calendar_content',p.calendar.content)}
      <label>Observações do cliente</label>
      <textarea class="note" id="calendar_note" oninput="autoGrow(this)">${p.calendar.note||''}</textarea>
      <div class="actions">
        <button class="btn-green" onclick="approveCalendar()">Aprovar calendário</button>
        <button class="btn-yellow" onclick="requestAdjust('calendar')">Solicitar ajustes</button>
      </div>`}
  </div>`;
}
function saveCurrentFields(){
  const p=currentProject();
  if(!p)return;
  const g=id=>document.getElementById(id)?.value;
  if(g('strategic_note')!==undefined)p.strategic.note=g('strategic_note');
  if(g('production_note')!==undefined)p.production.note=g('production_note');
  if(g('calendar_note')!==undefined)p.calendar.note=g('calendar_note');
  saveAll();
}
function addHistory(p,text){p.history.unshift(new Date().toLocaleString('pt-BR')+' • '+text)}
function send(c,msg){
  if(!c.responsiblePhone){alert('WhatsApp do responsável não cadastrado.');return}
  window.open(`https://wa.me/${c.responsiblePhone}?text=${encodeURIComponent(msg)}`,'_blank');
}
function approveStrategic(){
  saveCurrentFields();
  const c=currentClient(),p=currentProject();
  p.strategicStatus='Aprovado';
  p.productionStatus='Em desenvolvimento';
  addHistory(p,'Cliente aprovou o Planejamento. Desenvolvimento liberado.');
  saveAll();renderClientPortal();
  send(c,`✅ PLANEJAMENTO APROVADO\n\nCliente: ${c.name}\nProjeto: ${p.period}\n\nA produção pode iniciar seguindo exatamente o planejamento aprovado.`);
}
function approveProduction(){
  saveCurrentFields();
  const c=currentClient(),p=currentProject();
  p.productionStatus='Aprovado';
  p.calendarStatus='Em desenvolvimento';
  addHistory(p,'Cliente aprovou o Desenvolvimento. Calendário liberado.');
  saveAll();renderClientPortal();
  send(c,`✅ DESENVOLVIMENTO APROVADO\n\nCliente: ${c.name}\nProjeto: ${p.period}\n\nCalendário Editorial liberado.`);
}
function approveCalendar(){
  saveCurrentFields();
  const c=currentClient(),p=currentProject();
  p.calendarStatus='Aprovado';
  p.approvalStatus='Em andamento';
  addHistory(p,'Cliente aprovou o Calendário. Próxima etapa liberada.');
  saveAll();renderClientPortal();
  send(c,`✅ CALENDÁRIO APROVADO\n\nCliente: ${c.name}\nProjeto: ${p.period}\n\nPróxima etapa: aprovação de artes e vídeos.`);
}
function requestAdjust(type){
  saveCurrentFields();
  const c=currentClient(),p=currentProject();
  const map={strategic:['strategicStatus','Planejamento'],production:['productionStatus','Desenvolvimento'],calendar:['calendarStatus','Calendário']};
  p[map[type][0]]='Ajustes solicitados';
  addHistory(p,'Cliente solicitou ajustes em '+map[type][1]+'.');
  saveAll();renderClientPortal();
  send(c,`⚠️ AJUSTES SOLICITADOS\n\nCliente: ${c.name}\nProjeto: ${p.period}\nEtapa: ${map[type][1]}`);
}
function renderClientPortal(){
  const box=document.getElementById('clientPortal');
  const c=currentClient();
  if(!selectedClientId){
    box.innerHTML='<div class="empty">Link inválido. Nenhum cliente informado.</div>';
    return;
  }
  if(!c){
    box.innerHTML='<div class="empty">Cliente não encontrado neste navegador. Para teste com LocalStorage, cadastre o cliente neste mesmo navegador ou conecte ao Firebase.</div>';
    return;
  }
  if(!selectedProjectId&&c.projects[0])selectedProjectId=c.projects[0].id;
  const p=currentProject() || c.projects[0];
  if(p)selectedProjectId=p.id;
  box.innerHTML=`
    <div class="client-hero">
      <h1>Olá, ${c.name}</h1>
      <p class="muted">Bem-vindo ao Portal Humaniza. Aqui você acompanha apenas os seus projetos, comenta, aprova ou solicita ajustes.</p>
      <div class="pills"><span class="pill">${c.status}</span><span class="pill">${c.access}</span></div>
    </div>
    ${c.access==='Bloqueado'?'<div class="empty">Acesso bloqueado temporariamente.</div>':`
      <h2>Projetos</h2>
      <div class="client-projects">${c.projects.map(x=>`
        <div class="client-project ${x.id===selectedProjectId?'active':''}" onclick="selectProject('${x.id}')">
          <h3>${x.period}</h3>
          <div class="pills">${statusPill(x.strategicStatus)}${statusPill(x.productionStatus)}</div>
          <div class="progress"><span style="width:${progress(x)}%"></span></div>
        </div>`).join('')}</div>
      ${p?renderProjectDetail(c,p):'<div class="empty">Nenhum projeto disponível.</div>'}`}`;
  setTimeout(()=>document.querySelectorAll('textarea').forEach(t=>autoGrow(t)),0);
}
renderClientPortal();
