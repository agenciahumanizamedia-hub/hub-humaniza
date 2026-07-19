function clientAccessBlocked(c){return c?.accessState==='Bloqueado'||c?.clientState==='Pausado';}
function projectAccessBlocked(p){return p?.projectAccess==='Bloqueado'||p?.projectState==='Bloqueado'||p?.projectState==='Rascunho';}
function stageVisible(status){return ['Liberado ao cliente','Aguardando aprovação','Aprovado','Finalizado','Em desenvolvimento','Em andamento'].includes(status);}
import { db, getDoc, getDocs, doc, updateDoc, addDoc, collection, query, where, serverTimestamp, onSnapshot } from "./firebase.js";

function setPrintMode(mode){
  document.body.setAttribute('data-print-mode', mode);
  setTimeout(()=>window.print(), 120);
}
function printDevelopment(){setPrintMode('development');}
function printCalendar(){setPrintMode('calendar');}
function printFullProject(){setPrintMode('full');}
const params=new URLSearchParams(window.location.search);
let selectedClientId=params.get('id'),briefingMode=params.get('briefing')==='1',client=null,projects=[],briefingQuestions=[],briefingAnswers=[],selectedProjectId=null;

let realtimeReady=false;
function showRealtimeNotice(){
  let n=document.getElementById('realtimeNotice');
  if(!n){
    n=document.createElement('div');
    n.id='realtimeNotice';
    n.className='realtime-notice';
    document.body.appendChild(n);
  }
  n.textContent='Atualizado agora';
  n.classList.add('show');
  clearTimeout(window.__rtNotice);
  window.__rtNotice=setTimeout(()=>n.classList.remove('show'),1800);
}
function applyClientRealtime(newClient,newProjects){
  client=newClient;
  projects=newProjects;
  if(selectedProjectId&&!projects.find(p=>p.id===selectedProjectId))selectedProjectId=projects[0]?.id||null;
  if(!selectedProjectId&&projects[0])selectedProjectId=projects[0].id;
  renderClientPortal();
  if(realtimeReady)showRealtimeNotice();
  realtimeReady=true;
}
function startClientRealtime(){
  const box=document.getElementById('clientPortal');
  if(!selectedClientId){
    box.innerHTML='<div class="empty">Link inválido. Nenhum cliente informado.</div>';
    return;
  }
  let latestClient=null, latestProjects=[];
  let gotClient=false, gotProjects=false;
  onSnapshot(doc(db,'hubClients',selectedClientId),snap=>{
    if(!snap.exists()){
      box.innerHTML='<div class="empty">Cliente não encontrado no Firebase.</div>';
      return;
    }
    latestClient={id:snap.id,...snap.data()};
    gotClient=true;
    if(gotProjects)applyClientRealtime(latestClient,latestProjects);
  },err=>{
    console.error('Erro tempo real cliente:',err);
    box.innerHTML='<div class="empty">Erro ao carregar cliente em tempo real.</div>';
  });
  onSnapshot(query(collection(db,'hubProjects'),where('clientId','==',selectedClientId)),snap=>{
    latestProjects=snap.docs.map(d=>({id:d.id,...d.data()}));
    gotProjects=true;
    if(gotClient)applyClientRealtime(latestClient,latestProjects);
  },err=>{
    console.error('Erro tempo real projetos:',err);
    box.innerHTML='<div class="empty">Erro ao carregar projetos em tempo real.</div>';
  });
  onSnapshot(collection(db,'hubBriefingQuestions'),snap=>{
    briefingQuestions=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.order||0)-(b.order||0));
    if(client)renderClientPortal();
  },err=>console.error('Erro ao carregar perguntas do briefing:',err));
  onSnapshot(query(collection(db,'hubBriefingAnswers'),where('clientId','==',selectedClientId)),snap=>{
    briefingAnswers=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.version||0)-(a.version||0));
    if(client)renderClientPortal();
  },err=>console.error('Erro ao carregar respostas do briefing:',err));
}

Object.assign(window,{selectProject,approveStrategic,approveProduction,approveCalendar,requestAdjust,autoGrow,goToProjects,printDevelopment,printCalendar,printFullProject,approveCreativeItem,requestCreativeAdjust,applyClientContentFilters,clearClientContentFilters,saveBriefing});

function autoGrow(el){el.style.height='auto';el.style.height=(el.scrollHeight+2)+'px'}
function goToProjects(){document.getElementById('projectNav')?.scrollIntoView({behavior:'smooth',block:'start'})}
function formatDateBR(v){if(!v)return '';const [y,m,d]=v.split('-');return `${d}/${m}/${y}`;}
function statusPill(s){if(s==='Aprovado')return'<span class="pill green">Aprovado</span>';if(s==='Ajustes solicitados')return'<span class="pill yellow">Ajustes</span>';if(s==='Bloqueado')return'<span class="pill lock">Bloqueado</span>';if(s==='Em andamento'||s==='Em desenvolvimento')return'<span class="pill purple">'+s+'</span>';return'<span class="pill yellow">'+s+'</span>'}
function progress(p){let n=0;if(p.strategicStatus==='Aprovado')n+=25;if(p.productionStatus==='Aprovado')n+=25;if(p.calendarStatus==='Aprovado')n+=25;if(p.approvalStatus==='Finalizado')n+=25;return n}
function stepClass(s){if(s==='Aprovado')return'done';if(s==='Bloqueado')return'locked';return'active'}
function currentProject(){return projects.find(p=>p.id===selectedProjectId)}
function selectProject(id){selectedProjectId=id;renderClientPortal();setTimeout(()=>document.getElementById('projectDetail')?.scrollIntoView({behavior:'smooth',block:'start'}),100)}

async function loadData(){
  let box=document.getElementById('clientPortal');
  if(!selectedClientId){box.innerHTML='<div class="empty">Link inválido. Nenhum cliente informado.</div>';return}
  let cs=await getDoc(doc(db,'hubClients',selectedClientId));
  if(!cs.exists()){box.innerHTML='<div class="empty">Cliente não encontrado no Firebase.</div>';return}
  client={id:cs.id,...cs.data()};
  let ps=await getDocs(query(collection(db,'hubProjects'),where('clientId','==',selectedClientId)));
  projects=ps.docs.map(d=>({id:d.id,...d.data()}));
  selectedProjectId=selectedProjectId||projects[0]?.id||null;
  renderClientPortal();
}
function field(label,id,value){return`<div class="content-box"><label>${label}</label><div class="readonly-box">${value||''}</div></div>`}
function itemProgress(item){let total=item.checklist?.length||0,done=(item.checklist||[]).filter(x=>x.done).length;return total?Math.round(done*100/total):0}
function contentTypeName(t){if(t==='roteiro')return'🎬 Roteiro';if(t==='carrossel')return'📚 Carrossel';return'🖼️ Estático'}

function getClientItemNote(itemId){
  return document.getElementById('client_adjust_note_'+itemId)?.value?.trim() || '';
}
async function saveCreativeItemDecision(itemId,status){
  const p=currentProject();
  if(!p)return;

  const note=getClientItemNote(itemId);

  if(status==='Ajustes' && !note){
    alert('Escreva o ajuste solicitado antes de enviar.');
    return;
  }

  const items=(p.production?.items||[]).map(item=>{
    if(item.id===itemId){
      return {
        ...item,
        itemStatus:status,
        clientApproval:status==='Aprovado'?'Aprovado':'Ajustes solicitados',
        clientNote:note,
        clientActionAt:new Date().toLocaleString('pt-BR')
      };
    }
    return item;
  });

  await updateDoc(doc(db,'hubProjects',p.id),{
    production:{...p.production,items},
    history:[
      new Date().toLocaleString('pt-BR')+' • Cliente marcou um item como '+(status==='Aprovado'?'aprovado':'ajuste solicitado')+'.',
      ...(p.history||[])
    ],
    updatedAt:serverTimestamp()
  });

  alert(status==='Aprovado'?'Item aprovado.':'Ajuste solicitado.');
}
async function approveCreativeItem(itemId){
  await saveCreativeItemDecision(itemId,'Aprovado');
}
async function requestCreativeAdjust(itemId){
  await saveCreativeItemDecision(itemId,'Ajustes');
}


function normalizeClientFilterText(value){
  const div=document.createElement('div');
  div.innerHTML=value||'';
  return (div.innerText||div.textContent||'')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'');
}

function renderClientContentFilters(){
  return `<div class="admin-control-panel no-print">
    <div class="control-head">
      <h3>Encontre um conteúdo</h3>
      <p>Pesquise por palavra ou filtre pela semana e pelo status.</p>
    </div>
    <div class="control-grid">
      <label class="control-field">
        <span>Buscar palavra</span>
        <input id="client_content_search" placeholder="Tema, objetivo, legenda..." oninput="applyClientContentFilters()">
      </label>
      <label class="control-field">
        <span>Semana</span>
        <select id="client_content_week" onchange="applyClientContentFilters()">
          <option value="">Todas</option>
          <option>Semana 1</option>
          <option>Semana 2</option>
          <option>Semana 3</option>
          <option>Semana 4</option>
          <option>Semana 5</option>
        </select>
      </label>
      <label class="control-field">
        <span>Status</span>
        <select id="client_content_status" onchange="applyClientContentFilters()">
          <option value="">Todos</option>
          <option>Em criação</option>
          <option>Aguardando aprovação</option>
          <option>Aprovado</option>
          <option>Ajustes</option>
          <option>Postado</option>
        </select>
      </label>
      <label class="control-field">
        <span>Resultados</span>
        <div class="pills"><span class="pill purple" id="client_content_count">Todos</span></div>
      </label>
    </div>
    <div class="actions">
      <button class="btn-dark" type="button" onclick="clearClientContentFilters()">Limpar filtros</button>
    </div>
  </div>`;
}

function applyClientContentFilters(){
  const search=normalizeClientFilterText(document.getElementById('client_content_search')?.value||'');
  const week=document.getElementById('client_content_week')?.value||'';
  const status=document.getElementById('client_content_status')?.value||'';
  const items=[...document.querySelectorAll('.content-item[data-filter-scope="client"]')];
  let visible=0;

  items.forEach(item=>{
    const text=normalizeClientFilterText(item.dataset.search||item.innerText);
    const currentWeek=item.querySelector('[data-field="week"]')?.value||item.dataset.week||'';
    const currentStatus=item.querySelector('[data-field="itemStatus"]')?.value||item.dataset.status||'';
    const show=(!search||text.includes(search))&&(!week||currentWeek===week)&&(!status||currentStatus===status);
    item.classList.toggle('hidden',!show);
    if(show)visible++;
  });

  const count=document.getElementById('client_content_count');
  if(count)count.textContent=items.length?`${visible} de ${items.length}`:'Nenhum';
  const empty=document.getElementById('client_content_empty');
  if(empty)empty.classList.toggle('hidden',visible!==0||items.length===0);
}

function clearClientContentFilters(){
  ['client_content_search','client_content_week','client_content_status'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.value='';
  });
  applyClientContentFilters();
}

function escapeHtml(value){
  return String(value??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
}
function availableBriefingQuestions(){
  return briefingQuestions.filter(q=>q.active!==false&&(!q.clientId||q.clientId===selectedClientId)).sort((a,b)=>(a.order||0)-(b.order||0));
}
function latestBriefing(){return briefingAnswers[0]||null;}
function renderBriefingInput(q,value=''){
  const required=q.required!==false?'data-required="1"':'';
  const common=`id="brief_${q.id}" data-question-id="${q.id}" ${required}`;
  if(q.type==='text')return `<input ${common} value="${escapeHtml(value)}">`;
  if(q.type==='number')return `<input type="number" ${common} value="${escapeHtml(value)}">`;
  if(q.type==='date')return `<input type="date" ${common} value="${escapeHtml(value)}">`;
  if(q.type==='url')return `<input type="url" ${common} value="${escapeHtml(value)}" placeholder="https://">`;
  if(q.type==='yesno')return `<select ${common}><option value="">Selecione</option><option value="Sim" ${value==='Sim'?'selected':''}>Sim</option><option value="Não" ${value==='Não'?'selected':''}>Não</option></select>`;
  return `<textarea ${common} oninput="autoGrow(this)">${escapeHtml(value)}</textarea>`;
}
function renderBriefingForm(){
  const questions=availableBriefingQuestions();
  const latest=latestBriefing();
  const answered=client?.briefingStatus==='Respondido'||!!latest;
  const canEdit=!answered||client?.briefingEditAllowed===true;
  const answers=latest?.answers||{};
  return `<div class="client-hero">
    <h1>Briefing Humaniza</h1>
    <p class="muted">Olá, ${escapeHtml(client?.name||'')}. Antes de começarmos, queremos conhecer melhor a sua empresa. Responda com calma e da forma mais simples possível.</p>
    <div class="pills"><span class="pill ${canEdit?'purple':'green'}">${canEdit?(answered?'Edição liberada':'Novo briefing'):'Respondido e bloqueado'}</span></div>
  </div>
  <div class="stage">
    ${!questions.length?'<div class="empty">As perguntas do briefing ainda não foram cadastradas pela Humaniza.</div>':canEdit?`<div class="form">${questions.map(q=>`<div class="full"><label>${escapeHtml(q.text)} ${q.required!==false?'<strong>*</strong>':''}</label>${q.description?`<div class="muted">${escapeHtml(q.description)}</div>`:''}${renderBriefingInput(q,answers[q.id]||'')}</div>`).join('')}</div><div class="actions"><button class="btn-green" onclick="saveBriefing()">Enviar briefing</button></div><p class="muted">Após o envio, as respostas serão bloqueadas. Uma nova edição somente poderá ser liberada pela Humaniza.</p>`:`<div class="content-grid">${questions.map(q=>`<div class="content-box"><label>${escapeHtml(q.text)}</label><div class="readonly-box">${escapeHtml(answers[q.id]||'Não informado').replace(/\n/g,'<br>')}</div></div>`).join('')}</div><div class="pills"><span class="pill green">Briefing enviado</span><span class="pill lock">Edição bloqueada</span></div><p class="muted">Para alterar alguma resposta, solicite à Humaniza a liberação de uma nova edição.</p>`}
  </div>`;
}

async function saveBriefing(){
  if(client?.briefingStatus==='Respondido'&&client?.briefingEditAllowed!==true){
    alert('Este briefing está bloqueado para edição. Solicite a liberação à Humaniza.');
    return;
  }
  const questions=availableBriefingQuestions();
  const answers={};
  let firstMissing=null;
  questions.forEach(q=>{
    const el=document.getElementById('brief_'+q.id);
    const value=(el?.value||'').trim();
    answers[q.id]=value;
    if(q.required!==false&&!value&&!firstMissing)firstMissing=el;
  });
  if(firstMissing){
    alert('Responda todas as perguntas obrigatórias antes de enviar.');
    firstMissing.focus();
    return;
  }
  const previous=latestBriefing();
  const version=(previous?.version||0)+1;
  const answeredAt=new Date().toLocaleString('pt-BR');
  await addDoc(collection(db,'hubBriefingAnswers'),{
    clientId:selectedClientId,
    clientName:client?.name||'',
    version,
    answers,
    answeredAt,
    createdAt:serverTimestamp()
  });
  await updateDoc(doc(db,'hubClients',selectedClientId),{
    briefingStatus:'Respondido',
    briefingEditAllowed:false,
    briefingCurrentVersion:version,
    briefingUpdatedAt:serverTimestamp(),
    updatedAt:serverTimestamp()
  });
  alert('Briefing enviado com sucesso. A edição foi bloqueada.');
}

function renderContentItem(item){
  let pct=itemProgress(item);
  const approval = item.clientApproval || 'Aguardando resposta';
  const approvalClass = approval === 'Aprovado' ? 'green' : approval === 'Ajustes solicitados' ? 'yellow' : 'purple';

  return `<div class="content-item ${pct===100?'done':''}" data-item="${item.id}" data-filter-scope="client" data-week="${item.week||''}" data-status="${item.itemStatus||''}" data-search="${normalizeClientFilterText(Object.values(item.fields||{}).join(' ')+' '+(item.note||'')).replace(/"/g,'&quot;')}">
    <div class="content-item-head">
      <div>
        <h4>${contentTypeName(item.type)}</h4>
        <span class="muted">Status interno: ${pct}% concluído</span>
      </div>
      <div class="pills"><span class="pill ${approvalClass}">${approval}</span></div>
    </div>

    <div class="content-progress"><span style="width:${pct}%"></span></div>

    ${item.postDate?field('Data de postagem','postDate',formatDateBR(item.postDate)):''}
    ${item.week?field('Semana do mês','week',item.week):''}
    ${item.itemStatus?field('Status do conteúdo','itemStatus',item.itemStatus):''}

    ${item.driveLink?`<div class="content-box"><label>Link Drive</label><div class="readonly-box"><a href="${item.driveLink}" target="_blank" rel="noopener">Abrir Drive</a></div></div>`:''}

    ${field('Tema','tema',item.fields?.tema)}

    ${item.type==='roteiro'?`${field('Objetivo','objetivo',item.fields?.objetivo)}${field('Gancho','gancho',item.fields?.gancho)}${field('Desenvolvimento','desenvolvimento',item.fields?.desenvolvimento)}${field('CTA','cta',item.fields?.cta)}`:''}
    ${item.type==='carrossel'?`${field('Objetivo','objetivo',item.fields?.objetivo)}${field('Slides','slides',item.fields?.slides)}${field('Legenda','legenda',item.fields?.legenda)}${field('CTA','cta',item.fields?.cta)}`:''}
    ${item.type==='estatico'?`${field('Mensagem principal','mensagem',item.fields?.mensagem)}${field('Legenda','legenda',item.fields?.legenda)}${field('CTA','cta',item.fields?.cta)}`:''}

    <div class="client-decision-box">
      <label>Decisão deste conteúdo</label>
      <div class="pills"><span class="pill ${approvalClass}">${approval}</span></div>

      <label>Comentário para ajuste</label>
      <textarea id="client_adjust_note_${item.id}" oninput="autoGrow(this)" placeholder="Se pedir ajuste, escreva aqui o que precisa mudar neste conteúdo.">${item.clientNote||''}</textarea>

      <div class="actions">
        <button class="btn-green" onclick="approveCreativeItem('${item.id}')">Aprovar este item</button>
        <button class="btn-yellow" onclick="requestCreativeAdjust('${item.id}')">Solicitar ajuste</button>
      </div>
    </div>
  </div>`;
}

function renderProjectDetail(c,p){return`<div id="projectDetail">
  <div class="client-toolbar"><button class="btn-dark" onclick="goToProjects()">← Voltar para projetos</button></div>
  <div class="stage"><div class="stage-head"><div><h2>Projeto ${p.period}</h2><p>Você pode visualizar, aprovar ou solicitar ajustes. A produção interna fica bloqueada para edição.</p></div><span class="pill">${progress(p)}%</span></div><div class="flow"><div class="step ${stepClass(p.strategicStatus)}"><b>01 Planejamento</b><br>${p.strategicStatus}</div><div class="step ${stepClass(p.productionStatus)}"><b>02 Desenvolvimento</b><br>${p.productionStatus}</div><div class="step ${stepClass(p.calendarStatus)}"><b>03 Calendário</b><br>${p.calendarStatus}</div><div class="step ${stepClass(p.approvalStatus)}"><b>04 Aprovações</b><br>${p.approvalStatus}</div></div></div>
  ${stageStrategic(p)}${stageProduction(p)}${stageCalendar(p)}
  <div class="stage"><h2>Histórico</h2><p class="muted">Registro das últimas ações.</p><div class="timeline">${(p.history||[]).map(h=>`<div>${h}</div>`).join('')}</div></div>
  </div>`}
function stageStrategic(p){return`<div class="stage"><div class="stage-head"><div><h2>01 Planejamento Estratégico</h2><p>Revise o planejamento antes de aprovar.</p></div>${statusPill(p.strategicStatus)}</div><div class="content-grid">${field('Visão Macro','strategic_macro',p.strategic?.macro)}${field('Linha Editorial','strategic_editorial',p.strategic?.editorial)}${field('Temas do mês','strategic_themes',p.strategic?.themes)}${field('Direção Criativa','strategic_creative',p.strategic?.creative)}</div><label>Observações do cliente</label><textarea class="note" id="strategic_note" oninput="autoGrow(this)" placeholder="Escreva aqui o que deseja ajustar no planejamento.">${p.strategic?.note||''}</textarea><div class="actions"><button class="btn-green" onclick="approveStrategic()">Aprovar planejamento</button><button class="btn-yellow" onclick="requestAdjust('strategic')">Solicitar ajustes</button></div></div>`}
function stageProduction(p){let items=p.production?.items||[];return`<div class="stage ${!stageVisible(p.productionStatus)?'locked':''}"><div class="stage-head"><div><h2>02 Desenvolvimento Criativo</h2><div class="actions no-print"><button class="btn-dark" onclick="window.print()">Imprimir desenvolvimento</button></div><p>Visualização dos roteiros, carrosséis e estáticos. O checklist é interno da Humaniza.</p></div>${statusPill(p.productionStatus)}</div>${!stageVisible(p.productionStatus)?'<p class="muted">Bloqueado até aprovação do planejamento.</p>':`${renderClientContentFilters()}<div id="client_content_empty" class="empty hidden">Nenhum conteúdo encontrado com esses filtros.</div>${items.map(renderContentItem).join('')}<label>Observações gerais do desenvolvimento</label><textarea class="note" id="production_note" oninput="autoGrow(this)" placeholder="Escreva aqui ajustes gerais sobre os conteúdos.">${p.production?.note||''}</textarea><div class="actions"><button class="btn-green" onclick="approveProduction()">Aprovar desenvolvimento</button><button class="btn-yellow" onclick="requestAdjust('production')">Solicitar ajustes</button></div>`}</div>`}

function itemFormatLabel(type){return type==='roteiro'?'🎬 Roteiro':type==='carrossel'?'📚 Carrossel':'🖼️ Estático';}
function calendarItemsFromProduction(p){
  const items=p.production?.items||[];
  return items.map(item=>({
    id:item.id,
    date:item.postDate||'',
    week:item.week||'',
    format:itemFormatLabel(item.type),
    theme:(item.fields?.tema||'Sem tema').replace(/<[^>]*>/g,''),
    status:item.itemStatus||'Em criação', note:item.clientNote||''
  })).sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));
}
function renderAutoCalendar(p){
  const list=calendarItemsFromProduction(p);
  if(!list.length)return '<div class="empty">Nenhum conteúdo com data disponível.</div>';
  return `<div class="auto-calendar">
    ${list.map(item=>`<div class="calendar-row">
      <div><strong>${formatDateBR(item.date)}</strong><span>${item.week||''}</span></div>
      <div><strong>${item.format}</strong><span>${item.theme}</span></div>
      <div><span class="calendar-status ${item.status.replaceAll(' ','-').toLowerCase()}">${item.status}</span>${item.note?`<small class="calendar-note">${item.note}</small>`:''}</div>
    </div>`).join('')}
  </div>`;
}

function stageCalendar(p){return`<div class="stage ${!stageVisible(p.calendarStatus)?'locked':''}"><div class="stage-head"><div><h2>03 Calendário Editorial</h2><div class="actions no-print"><button class="btn-dark" onclick="window.print()">Salvar como PDF</button></div><p>Datas, formatos e temas organizados.</p></div>${statusPill(p.calendarStatus)}</div>${!stageVisible(p.calendarStatus)?'<p class="muted">Bloqueado até aprovação do desenvolvimento.</p>':`<div class="content-box"><label>Calendário automático</label>${renderAutoCalendar(p)}</div>${field('Observações do calendário','calendar_content',p.calendar?.content)}<label>Observações do cliente</label><textarea class="note" id="calendar_note" oninput="autoGrow(this)" placeholder="Escreva aqui ajustes sobre o calendário.">${p.calendar?.note||''}</textarea><div class="actions"><button class="btn-green" onclick="approveCalendar()">Aprovar calendário</button><button class="btn-yellow" onclick="requestAdjust('calendar')">Solicitar ajustes</button></div>`}</div>`}
function getForm(p){
  let g=id=>document.getElementById(id)?.value;
  return {
    strategic:{...p.strategic,note:g('strategic_note')??p.strategic?.note??''},
    production:{...p.production,note:g('production_note')??p.production?.note??''},
    calendar:{...p.calendar,note:g('calendar_note')??p.calendar?.note??''}
  };
}
function addH(p,t){return[new Date().toLocaleString('pt-BR')+' • '+t,...(p.history||[])]}
async function save(extra={}){let p=currentProject();await updateDoc(doc(db,'hubProjects',p.id),{...getForm(p),...extra,updatedAt:serverTimestamp()})}
function send(c,msg){if(!c.responsiblePhone)return;window.open(`https://wa.me/${c.responsiblePhone}?text=${encodeURIComponent(msg)}`,'_blank')}
async function approveStrategic(){let p=currentProject();await save({strategicStatus:'Aprovado',productionStatus:'Em desenvolvimento',history:addH(p,'Cliente aprovou o Planejamento.')});send(client,`✅ PLANEJAMENTO APROVADO\n\nCliente: ${client.name}\nProjeto: ${p.period}`);await loadData()}
async function approveProduction(){let p=currentProject();await save({productionStatus:'Aprovado',calendarStatus:'Em desenvolvimento',history:addH(p,'Cliente aprovou o Desenvolvimento Criativo.')});send(client,`✅ DESENVOLVIMENTO APROVADO\n\nCliente: ${client.name}\nProjeto: ${p.period}`);await loadData()}
async function approveCalendar(){let p=currentProject();await save({calendarStatus:'Aprovado',approvalStatus:'Em andamento',history:addH(p,'Cliente aprovou o Calendário.')});send(client,`✅ CALENDÁRIO APROVADO\n\nCliente: ${client.name}\nProjeto: ${p.period}`);await loadData()}
async function requestAdjust(type){let p=currentProject(),map={strategic:['strategicStatus','Planejamento'],production:['productionStatus','Desenvolvimento Criativo'],calendar:['calendarStatus','Calendário']};await save({[map[type][0]]:'Ajustes solicitados',history:addH(p,'Cliente solicitou ajustes em '+map[type][1]+'.')});send(client,`⚠️ AJUSTES SOLICITADOS\n\nCliente: ${client.name}\nProjeto: ${p.period}\nEtapa: ${map[type][1]}`);await loadData()}
function projectLockedLabel(i){return i===0?'Próximo mês':'Em breve'}
function renderClientPortal(){let box=document.getElementById('clientPortal');if(briefingMode){box.innerHTML=renderBriefingForm();setTimeout(()=>document.querySelectorAll('textarea').forEach(t=>autoGrow(t)),0);return}if(client.access==='Bloqueado'){box.innerHTML='<div class="empty">Acesso bloqueado temporariamente.</div>';return}let p=currentProject()||projects[0];if(p)selectedProjectId=p.id;box.innerHTML=`<div class="client-hero"><h1>Olá, ${client.name}</h1><p class="muted">Aqui você acompanha seus projetos, aprova etapas ou solicita ajustes.</p><div class="pills"><span class="pill">${client.status}</span><span class="pill">${client.access}</span></div>
      <div class="actions no-print">
        <button class="btn-dark" onclick="printFullProject()">PDF Projeto completo</button>
        <button class="btn-dark" onclick="printDevelopment()">PDF Desenvolvimento</button>
        <button class="btn-dark" onclick="printCalendar()">PDF Calendário</button>
      </div></div><div id="projectNav" class="stage"><h2>Projetos disponíveis</h2><p class="muted">Toque em um projeto para visualizar. Os próximos ficam bloqueados até liberação da Humaniza.</p><div class="client-projects">${projects.map(x=>`<div class="client-project ${x.id===selectedProjectId?'active':''}" onclick="selectProject('${x.id}')"><h3>${x.period}</h3><div class="pills">${statusPill(x.strategicStatus)}${statusPill(x.productionStatus)}</div><div class="progress"><span style="width:${progress(x)}%"></span></div></div>`).join('')}<div class="client-project locked-card"><h3>Próximo projeto</h3><div class="pills"><span class="pill lock">🔒 ${projectLockedLabel(0)}</span></div><p class="muted">Será liberado pela Humaniza.</p></div><div class="client-project locked-card"><h3>Projeto futuro</h3><div class="pills"><span class="pill lock">🔒 ${projectLockedLabel(1)}</span></div><p class="muted">Será liberado pela Humaniza.</p></div></div></div>${p?renderProjectDetail(client,p):'<div class="empty">Nenhum projeto disponível.</div>'}`;setTimeout(()=>document.querySelectorAll('textarea').forEach(t=>autoGrow(t)),0)}
startClientRealtime();
