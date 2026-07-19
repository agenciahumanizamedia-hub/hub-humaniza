let data = JSON.parse(localStorage.getItem('humanizaHubData') || '{"clients":[]}');
let selectedClientId = localStorage.getItem('hubSelectedClient') || null;
let selectedProjectId = localStorage.getItem('hubSelectedProject') || null;
let mode = localStorage.getItem('hubMode') || 'agency';

function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2)}
function saveAll(){localStorage.setItem('humanizaHubData', JSON.stringify(data))}
function autoGrow(el){el.style.height='auto';el.style.height=(el.scrollHeight+2)+'px'; saveCurrentFields()}
function closeModals(){document.querySelectorAll('.modal').forEach(m=>m.classList.remove('active'))}
function setMode(m){saveCurrentFields();mode=m;localStorage.setItem('hubMode',m);render()}

function openClientModal(){
  clientName.value='';
  clientEmail.value='';
  responsibleName.value='';
  responsiblePhone.value='';
  clientStatus.value='Ativo';
  clientAccess.value='Liberado';
  clientObs.value='';
  clientModal.classList.add('active');
}

function openProjectModal(){
  if(!data.clients.length){alert('Cadastre um cliente primeiro.'); return}
  projectClient.innerHTML = data.clients.map(c=>`<option value="${c.id}" ${c.id===selectedClientId?'selected':''}>${c.name}</option>`).join('');
  updateCopyOptions();
  projectClient.onchange = updateCopyOptions;
  projectPeriod.value='';
  projectModal.classList.add('active');
}

function updateCopyOptions(){
  const c = data.clients.find(x=>x.id===projectClient.value);
  projectCopy.innerHTML = '<option value="">Começar em branco</option>' + (c?.projects||[]).map(p=>`<option value="${p.id}">Duplicar ${p.period}</option>`).join('');
}

function saveClient(){
  const name=clientName.value.trim();
  if(!name){alert('Coloque o nome do cliente.');return}
  const c={
    id:uid(),
    name,
    email:clientEmail.value.trim(),
    responsibleName:responsibleName.value.trim(),
    responsiblePhone:responsiblePhone.value.trim().replace(/\D/g,''),
    status:clientStatus.value,
    access:clientAccess.value,
    obs:clientObs.value.trim(),
    projects:[]
  };
  data.clients.push(c);
  selectedClientId=c.id;
  selectedProjectId=null;
  localStorage.setItem('hubSelectedClient',selectedClientId);
  saveAll();
  closeModals();
  render();
}

function baseProject(period){
  return {
    id:uid(),
    period,
    strategicStatus:'Aguardando aprovação',
    productionStatus:'Bloqueado',
    calendarStatus:'Bloqueado',
    approvalStatus:'Bloqueado',
    history:['Projeto criado.'],
    strategic:{
      macro:'Objetivo principal do mês.',
      editorial:'Autoridade, conexão, prova e conversão.',
      themes:'Tema 01\nTema 02\nTema 03\nTema 04',
      creative:'Tom humano, claro e estratégico.',
      note:''
    },
    production:{
      reels:'Reels 01\nTema:\nObjetivo:\nGancho:\nDesenvolvimento:\nCTA:',
      carousel:'Carrossel 01\nTema:\nObjetivo:\nCards:\nLegenda:\nCTA:',
      staticPost:'Post Estático\nTema:\nMensagem principal:\nLegenda:',
      capture:'Data:\nLocal:\nEquipe:\nChecklist:',
      note:''
    },
    calendar:{
      content:'Calendário Editorial\n\n01/07:\nFormato:\nTema:\nStatus:',
      note:''
    }
  }
}

function saveProject(){
  const c=data.clients.find(x=>x.id===projectClient.value);
  if(!c)return;
  const period=projectPeriod.value.trim();
  if(!period){alert('Coloque o período.');return}
  let p;
  const copyId=projectCopy.value;
  if(copyId){
    const old=c.projects.find(x=>x.id===copyId);
    p=JSON.parse(JSON.stringify(old));
    p.id=uid();
    p.period=period;
    p.history=['Projeto criado duplicando '+old.period+'.'];
    p.strategicStatus='Aguardando aprovação';
    p.productionStatus='Bloqueado';
    p.calendarStatus='Bloqueado';
    p.approvalStatus='Bloqueado';
  } else {
    p=baseProject(period);
  }
  c.projects.unshift(p);
  selectedClientId=c.id;
  selectedProjectId=p.id;
  localStorage.setItem('hubSelectedClient',selectedClientId);
  localStorage.setItem('hubSelectedProject',selectedProjectId);
  saveAll();
  closeModals();
  render();
}

function currentClient(){return data.clients.find(c=>c.id===selectedClientId)}
function currentProject(){return currentClient()?.projects.find(p=>p.id===selectedProjectId)}

function selectClient(id){
  saveCurrentFields();
  selectedClientId=id;
  const c=currentClient();
  selectedProjectId=c?.projects[0]?.id||null;
  localStorage.setItem('hubSelectedClient',selectedClientId);
  localStorage.setItem('hubSelectedProject',selectedProjectId||'');
  render();
}

function selectProject(id){
  saveCurrentFields();
  selectedProjectId=id;
  localStorage.setItem('hubSelectedProject',id);
  render();
}

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

function renderDashboard(){
  const projects=data.clients.flatMap(c=>c.projects.map(p=>({c,p})));
  dashboard.innerHTML=`
    <div class="dashboard-card"><span class="muted">Clientes</span><strong>${data.clients.length}</strong></div>
    <div class="dashboard-card"><span class="muted">Projetos</span><strong>${projects.length}</strong></div>
    <div class="dashboard-card"><span class="muted">Aguardando</span><strong>${projects.filter(x=>x.p.strategicStatus!=='Aprovado').length}</strong></div>
    <div class="dashboard-card"><span class="muted">Finalizados</span><strong>${projects.filter(x=>progress(x.p)===100).length}</strong></div>`;
}

function renderClients(){
  const q=(searchClient.value||'').toLowerCase();
  const list=data.clients.filter(c=>c.name.toLowerCase().includes(q));
  clientsList.innerHTML=list.length?list.map(c=>`
    <div class="client-card ${c.id===selectedClientId?'active':''}" onclick="selectClient('${c.id}')">
      <h3>${c.name}</h3>
      <div class="muted">Resp.: ${c.responsibleName||'Não definido'}<br>${c.projects.length} projeto(s)</div>
      <div class="pills"><span class="pill">${c.status}</span><span class="pill">${c.access}</span>${c.projects[0]?statusPill(c.projects[0].strategicStatus):''}</div>
    </div>`).join(''):'<div class="empty">Nenhum cliente.</div>';
}

function renderWorkspace(){
  const c=currentClient();
  if(!c){workspace.innerHTML='<div class="empty">Cadastre ou selecione um cliente.</div>';return}
  if(!selectedProjectId&&c.projects[0])selectedProjectId=c.projects[0].id;
  const p=currentProject();
  workspace.innerHTML=`
    <div class="panel">
      <div class="top" style="margin:0">
        <div>
          <h2>${c.name}</h2>
          <p class="muted">Responsável: ${c.responsibleName||'Não definido'} • Acesso: ${c.access}</p>
        </div>
        <button class="btn-danger" onclick="deleteClient('${c.id}')">Excluir cliente</button>
      </div>
      <div class="actions">
        <button onclick="openProjectModal()">+ Novo projeto/mês</button>
        <button class="btn-dark" onclick="copyClientLink()">Copiar link do cliente</button>
      </div>
    </div>
    ${renderProjects(c)}
    ${p?renderProjectDetail(c,p,true):'<div class="empty">Esse cliente ainda não tem projetos. Clique em + Novo projeto/mês.</div>'}`;
}

function renderProjects(c){
  if(!c.projects.length)return '';
  return `<div class="project-list">${c.projects.map(x=>`
    <div class="project-card ${x.id===selectedProjectId?'active':''}" onclick="selectProject('${x.id}')">
      <h3>${x.period}</h3>
      <div class="pills">${statusPill(x.strategicStatus)}${statusPill(x.productionStatus)}</div>
      <div class="progress"><span style="width:${progress(x)}%"></span></div>
    </div>`).join('')}</div>`;
}

function stepClass(status){
  if(status==='Aprovado')return 'done';
  if(status==='Bloqueado')return 'locked';
  return 'active';
}

function renderProjectDetail(c,p,isAdminView){
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
    ${stageStrategic(p,isAdminView)}
    ${stageProduction(p,isAdminView)}
    ${stageCalendar(p,isAdminView)}
    <div class="stage">
      <h2>Histórico</h2>
      <div class="timeline">${(p.history||[]).map(h=>`<div>${h}</div>`).join('')}</div>
    </div>`;
}

function field(label,id,value,isAdminView){
  if(isAdminView)return `<div class="content-box"><label>${label}</label><textarea id="${id}" oninput="autoGrow(this)">${value||''}</textarea></div>`;
  return `<div class="content-box"><label>${label}</label><div class="readonly-box">${value||''}</div></div>`;
}

function stageStrategic(p,isAdminView){
  return `<div class="stage">
    <div class="stage-head"><div><h2>01 Planejamento Estratégico</h2><p>A produção só libera após essa aprovação.</p></div>${statusPill(p.strategicStatus)}</div>
    <div class="content-grid">
      ${field('Visão Macro','strategic_macro',p.strategic.macro,isAdminView)}
      ${field('Linha Editorial','strategic_editorial',p.strategic.editorial,isAdminView)}
      ${field('Temas do mês','strategic_themes',p.strategic.themes,isAdminView)}
      ${field('Direção Criativa','strategic_creative',p.strategic.creative,isAdminView)}
    </div>
    <label>Observações do cliente</label>
    <textarea class="note" id="strategic_note" oninput="autoGrow(this)">${p.strategic.note||''}</textarea>
    <div class="actions">
      <button class="btn-green" onclick="approveStrategic()">Aprovar planejamento</button>
      <button class="btn-yellow" onclick="requestAdjust('strategic')">Solicitar ajustes</button>
    </div>
  </div>`;
}

function stageProduction(p,isAdminView){
  return `<div class="stage ${p.productionStatus==='Bloqueado'?'locked':''}">
    <div class="stage-head"><div><h2>02 Desenvolvimento Criativo</h2><p>Produção seguindo exatamente o planejamento aprovado.</p></div>${statusPill(p.productionStatus)}</div>
    ${p.productionStatus==='Bloqueado'?'<p class="muted">Bloqueado até aprovação do planejamento.</p>':`
      <div class="content-grid">
        ${field('Roteiros','production_reels',p.production.reels,isAdminView)}
        ${field('Carrosséis','production_carousel',p.production.carousel,isAdminView)}
        ${field('Estático','production_staticPost',p.production.staticPost,isAdminView)}
        ${field('Captação','production_capture',p.production.capture,isAdminView)}
      </div>
      <label>Observações do cliente</label>
      <textarea class="note" id="production_note" oninput="autoGrow(this)">${p.production.note||''}</textarea>
      <div class="actions">
        <button class="btn-green" onclick="approveProduction()">Aprovar desenvolvimento</button>
        <button class="btn-yellow" onclick="requestAdjust('production')">Solicitar ajustes</button>
      </div>`}
  </div>`;
}

function stageCalendar(p,isAdminView){
  return `<div class="stage ${p.calendarStatus==='Bloqueado'?'locked':''}">
    <div class="stage-head"><div><h2>03 Calendário Editorial</h2><p>Organização de datas, formatos e temas.</p></div>${statusPill(p.calendarStatus)}</div>
    ${p.calendarStatus==='Bloqueado'?'<p class="muted">Bloqueado até aprovação do desenvolvimento.</p>':`
      ${field('Calendário Editorial','calendar_content',p.calendar.content,isAdminView)}
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
  if(g('strategic_macro')!==undefined)p.strategic.macro=g('strategic_macro');
  if(g('strategic_editorial')!==undefined)p.strategic.editorial=g('strategic_editorial');
  if(g('strategic_themes')!==undefined)p.strategic.themes=g('strategic_themes');
  if(g('strategic_creative')!==undefined)p.strategic.creative=g('strategic_creative');
  if(g('strategic_note')!==undefined)p.strategic.note=g('strategic_note');
  if(g('production_reels')!==undefined)p.production.reels=g('production_reels');
  if(g('production_carousel')!==undefined)p.production.carousel=g('production_carousel');
  if(g('production_staticPost')!==undefined)p.production.staticPost=g('production_staticPost');
  if(g('production_capture')!==undefined)p.production.capture=g('production_capture');
  if(g('production_note')!==undefined)p.production.note=g('production_note');
  if(g('calendar_content')!==undefined)p.calendar.content=g('calendar_content');
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
  addHistory(p,'Planejamento aprovado. Desenvolvimento liberado.');
  saveAll();render();
  send(c,`✅ PLANEJAMENTO APROVADO\n\nCliente: ${c.name}\nProjeto: ${p.period}\n\nA produção pode iniciar seguindo exatamente o planejamento aprovado.`);
}

function approveProduction(){
  saveCurrentFields();
  const c=currentClient(),p=currentProject();
  p.productionStatus='Aprovado';
  p.calendarStatus='Em desenvolvimento';
  addHistory(p,'Desenvolvimento aprovado. Calendário liberado.');
  saveAll();render();
  send(c,`✅ DESENVOLVIMENTO APROVADO\n\nCliente: ${c.name}\nProjeto: ${p.period}\n\nCalendário Editorial liberado.`);
}

function approveCalendar(){
  saveCurrentFields();
  const c=currentClient(),p=currentProject();
  p.calendarStatus='Aprovado';
  p.approvalStatus='Em andamento';
  addHistory(p,'Calendário aprovado. Próxima etapa: aprovação de artes e vídeos.');
  saveAll();render();
  send(c,`✅ CALENDÁRIO APROVADO\n\nCliente: ${c.name}\nProjeto: ${p.period}\n\nPróxima etapa: aprovação de artes e vídeos.`);
}

function requestAdjust(type){
  saveCurrentFields();
  const c=currentClient(),p=currentProject();
  const map={strategic:['strategicStatus','Planejamento'],production:['productionStatus','Desenvolvimento'],calendar:['calendarStatus','Calendário']};
  p[map[type][0]]='Ajustes solicitados';
  addHistory(p,'Ajustes solicitados em '+map[type][1]+'.');
  saveAll();render();
  send(c,`⚠️ AJUSTES SOLICITADOS\n\nCliente: ${c.name}\nProjeto: ${p.period}\nEtapa: ${map[type][1]}`);
}

function deleteClient(id){
  if(!confirm('Excluir cliente e todos os projetos dele?'))return;
  data.clients=data.clients.filter(c=>c.id!==id);
  selectedClientId=data.clients[0]?.id||null;
  selectedProjectId=data.clients[0]?.projects[0]?.id||null;
  saveAll();render();
}

function copyClientLink(){
  const c=currentClient();
  if(!c)return;
  const link=location.href.split('#')[0]+'#cliente='+c.id;
  navigator.clipboard?.writeText(link);
  alert('Link do cliente copiado. Nesta versão de teste, ele abre a visão do cliente no mesmo navegador.');
}

function renderClientPortal(){
  const hash=location.hash.replace('#cliente=','');
  if(hash && data.clients.find(c=>c.id===hash))selectedClientId=hash;
  const c=currentClient() || data.clients[0];
  if(!c){clientPortal.innerHTML='<div class="empty">Nenhum cliente cadastrado ainda.</div>';return}
  selectedClientId=c.id;
  if(!selectedProjectId&&c.projects[0])selectedProjectId=c.projects[0].id;
  const p=currentProject() || c.projects[0];
  if(p)selectedProjectId=p.id;
  clientPortal.innerHTML=`
    <div class="client-hero">
      <h1>Olá, ${c.name}</h1>
      <p class="muted">Bem-vindo ao Portal Humaniza. Aqui você acompanha apenas os seus projetos, comenta, aprova ou solicita ajustes.</p>
      <div class="pills"><span class="pill">${c.status}</span><span class="pill">${c.access}</span></div>
    </div>
    ${c.access==='Bloqueado'?'<div class="empty">Acesso bloqueado temporariamente.</div>':`
      <h2>Projetos</h2>
      <div class="client-projects">${c.projects.map(x=>`
        <div class="client-project ${x.id===selectedProjectId?'active':''}" onclick="selectProject('${x.id}');renderClientPortal()">
          <h3>${x.period}</h3>
          <div class="pills">${statusPill(x.strategicStatus)}${statusPill(x.productionStatus)}</div>
          <div class="progress"><span style="width:${progress(x)}%"></span></div>
        </div>`).join('')}</div>
      ${p?renderProjectDetail(c,p,false):'<div class="empty">Nenhum projeto disponível.</div>'}`}`;
}

function render(){
  agencyMode.classList.toggle('hidden',mode!=='agency');
  clientMode.classList.toggle('hidden',mode!=='client');
  btnNewClient.style.display=mode==='agency'?'inline-block':'none';
  btnNewProject.style.display=mode==='agency'?'inline-block':'none';

  if(mode==='agency'){
    renderDashboard();renderClients();renderWorkspace();
  } else {
    renderClientPortal();
  }
  setTimeout(()=>document.querySelectorAll('textarea').forEach(t=>autoGrow(t)),0);
}

// Abre direto no Portal Cliente quando o link tiver #cliente=ID
if (location.hash.startsWith('#cliente=')) {
  mode = 'client';
  localStorage.setItem('hubMode', 'client');
}

window.addEventListener('hashchange', () => {
  if (location.hash.startsWith('#cliente=')) {
    mode = 'client';
    localStorage.setItem('hubMode', 'client');
  }
  render();
});

render();
