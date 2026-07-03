function clientAccessBlocked(c){return c?.accessState==='Bloqueado'||c?.clientState==='Pausado';}
function projectAccessBlocked(p){return p?.projectAccess==='Bloqueado'||p?.projectState==='Bloqueado'||p?.projectState==='Rascunho';}
function stageVisible(status){return ['Liberado ao cliente','Aguardando aprovação','Aprovado','Finalizado','Em desenvolvimento','Em andamento'].includes(status);}
import { db, getDoc, getDocs, doc, updateDoc, collection, query, where, serverTimestamp } from "./firebase.js";

const params=new URLSearchParams(window.location.search);
let selectedClientId=params.get('id'),client=null,projects=[],selectedProjectId=null;

Object.assign(window,{selectProject,approveStrategic,approveProduction,approveCalendar,requestAdjust,autoGrow,goToProjects});

function autoGrow(el){el.style.height='auto';el.style.height=(el.scrollHeight+2)+'px'}
function goToProjects(){document.getElementById('projectNav')?.scrollIntoView({behavior:'smooth',block:'start'})}
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
function renderContentItem(item){
  let pct=itemProgress(item);
  return `<div class="content-item ${pct===100?'done':''}" data-item="${item.id}">
    <div class="content-item-head"><div><h4>${contentTypeName(item.type)}</h4><span class="muted">Status interno: ${pct}% concluído</span></div></div>
    <div class="content-progress"><span style="width:${pct}%"></span></div>
    ${item.driveLink?`<div class="content-box"><label>Link Drive</label><div class="readonly-box"><a href="${item.driveLink}" target="_blank" rel="noopener">Abrir Drive</a></div></div>`:''}
    ${field('Tema','tema',item.fields?.tema)}
    ${item.type==='roteiro'?`${field('Objetivo','objetivo',item.fields?.objetivo)}${field('Gancho','gancho',item.fields?.gancho)}${field('Desenvolvimento','desenvolvimento',item.fields?.desenvolvimento)}${field('CTA','cta',item.fields?.cta)}`:''}
    ${item.type==='carrossel'?`${field('Objetivo','objetivo',item.fields?.objetivo)}${field('Slides','slides',item.fields?.slides)}${field('Legenda','legenda',item.fields?.legenda)}${field('CTA','cta',item.fields?.cta)}`:''}
    ${item.type==='estatico'?`${field('Mensagem principal','mensagem',item.fields?.mensagem)}${field('Legenda','legenda',item.fields?.legenda)}${field('CTA','cta',item.fields?.cta)}`:''}
    <label>Observação do cliente sobre este conteúdo</label>
    <textarea data-field="note" oninput="autoGrow(this)" placeholder="Escreva aqui se precisar ajustar algo neste conteúdo.">${item.note||''}</textarea>
  </div>`
}
function renderProjectDetail(c,p){return`<div id="projectDetail">
  <div class="client-toolbar"><button class="btn-dark" onclick="goToProjects()">← Voltar para projetos</button></div>
  <div class="stage"><div class="stage-head"><div><h2>Projeto ${p.period}</h2><p>Você pode visualizar, aprovar ou solicitar ajustes. A produção interna fica bloqueada para edição.</p></div><span class="pill">${progress(p)}%</span></div><div class="flow"><div class="step ${stepClass(p.strategicStatus)}"><b>01 Planejamento</b><br>${p.strategicStatus}</div><div class="step ${stepClass(p.productionStatus)}"><b>02 Desenvolvimento</b><br>${p.productionStatus}</div><div class="step ${stepClass(p.calendarStatus)}"><b>03 Calendário</b><br>${p.calendarStatus}</div><div class="step ${stepClass(p.approvalStatus)}"><b>04 Aprovações</b><br>${p.approvalStatus}</div></div></div>
  ${stageStrategic(p)}${stageProduction(p)}${stageCalendar(p)}
  <div class="stage"><h2>Histórico</h2><p class="muted">Registro das últimas ações.</p><div class="timeline">${(p.history||[]).map(h=>`<div>${h}</div>`).join('')}</div></div>
  </div>`}
function stageStrategic(p){return`<div class="stage"><div class="stage-head"><div><h2>01 Planejamento Estratégico</h2><p>Revise o planejamento antes de aprovar.</p></div>${statusPill(p.strategicStatus)}</div><div class="content-grid">${field('Visão Macro','strategic_macro',p.strategic?.macro)}${field('Linha Editorial','strategic_editorial',p.strategic?.editorial)}${field('Temas do mês','strategic_themes',p.strategic?.themes)}${field('Direção Criativa','strategic_creative',p.strategic?.creative)}</div><label>Observações do cliente</label><textarea class="note" id="strategic_note" oninput="autoGrow(this)" placeholder="Escreva aqui o que deseja ajustar no planejamento.">${p.strategic?.note||''}</textarea><div class="actions"><button class="btn-green" onclick="approveStrategic()">Aprovar planejamento</button><button class="btn-yellow" onclick="requestAdjust('strategic')">Solicitar ajustes</button></div></div>`}
function stageProduction(p){let items=p.production?.items||[];return`<div class="stage ${!stageVisible(p.productionStatus)?'locked':''}"><div class="stage-head"><div><h2>02 Desenvolvimento Criativo</h2><p>Visualização dos roteiros, carrosséis e estáticos. O checklist é interno da Humaniza.</p></div>${statusPill(p.productionStatus)}</div>${!stageVisible(p.productionStatus)?'<p class="muted">Bloqueado até aprovação do planejamento.</p>':`${items.map(renderContentItem).join('')}<label>Observações gerais do desenvolvimento</label><textarea class="note" id="production_note" oninput="autoGrow(this)" placeholder="Escreva aqui ajustes gerais sobre os conteúdos.">${p.production?.note||''}</textarea><div class="actions"><button class="btn-green" onclick="approveProduction()">Aprovar desenvolvimento</button><button class="btn-yellow" onclick="requestAdjust('production')">Solicitar ajustes</button></div>`}</div>`}
function stageCalendar(p){return`<div class="stage ${!stageVisible(p.calendarStatus)?'locked':''}"><div class="stage-head"><div><h2>03 Calendário Editorial</h2><p>Datas, formatos e temas organizados.</p></div>${statusPill(p.calendarStatus)}</div>${!stageVisible(p.calendarStatus)?'<p class="muted">Bloqueado até aprovação do desenvolvimento.</p>':`${field('Calendário Editorial','calendar_content',p.calendar?.content)}<label>Observações do cliente</label><textarea class="note" id="calendar_note" oninput="autoGrow(this)" placeholder="Escreva aqui ajustes sobre o calendário.">${p.calendar?.note||''}</textarea><div class="actions"><button class="btn-green" onclick="approveCalendar()">Aprovar calendário</button><button class="btn-yellow" onclick="requestAdjust('calendar')">Solicitar ajustes</button></div>`}</div>`}
function getForm(p){let g=id=>document.getElementById(id)?.value;let items=(p.production?.items||[]).map(item=>{let box=document.querySelector(`[data-item="${item.id}"]`);if(box){let note=box.querySelector('[data-field="note"]')?.value||item.note||'';return{...item,note}}return item});return{strategic:{...p.strategic,note:g('strategic_note')??p.strategic?.note??''},production:{...p.production,items,note:g('production_note')??p.production?.note??''},calendar:{...p.calendar,note:g('calendar_note')??p.calendar?.note??''}}}
function addH(p,t){return[new Date().toLocaleString('pt-BR')+' • '+t,...(p.history||[])]}
async function save(extra={}){let p=currentProject();await updateDoc(doc(db,'hubProjects',p.id),{...getForm(p),...extra,updatedAt:serverTimestamp()})}
function send(c,msg){if(!c.responsiblePhone)return;window.open(`https://wa.me/${c.responsiblePhone}?text=${encodeURIComponent(msg)}`,'_blank')}
async function approveStrategic(){let p=currentProject();await save({strategicStatus:'Aprovado',productionStatus:'Em desenvolvimento',history:addH(p,'Cliente aprovou o Planejamento.')});send(client,`✅ PLANEJAMENTO APROVADO\n\nCliente: ${client.name}\nProjeto: ${p.period}`);await loadData()}
async function approveProduction(){let p=currentProject();await save({productionStatus:'Aprovado',calendarStatus:'Em desenvolvimento',history:addH(p,'Cliente aprovou o Desenvolvimento Criativo.')});send(client,`✅ DESENVOLVIMENTO APROVADO\n\nCliente: ${client.name}\nProjeto: ${p.period}`);await loadData()}
async function approveCalendar(){let p=currentProject();await save({calendarStatus:'Aprovado',approvalStatus:'Em andamento',history:addH(p,'Cliente aprovou o Calendário.')});send(client,`✅ CALENDÁRIO APROVADO\n\nCliente: ${client.name}\nProjeto: ${p.period}`);await loadData()}
async function requestAdjust(type){let p=currentProject(),map={strategic:['strategicStatus','Planejamento'],production:['productionStatus','Desenvolvimento Criativo'],calendar:['calendarStatus','Calendário']};await save({[map[type][0]]:'Ajustes solicitados',history:addH(p,'Cliente solicitou ajustes em '+map[type][1]+'.')});send(client,`⚠️ AJUSTES SOLICITADOS\n\nCliente: ${client.name}\nProjeto: ${p.period}\nEtapa: ${map[type][1]}`);await loadData()}
function projectLockedLabel(i){return i===0?'Próximo mês':'Em breve'}
function renderClientPortal(){let box=document.getElementById('clientPortal');if(client.access==='Bloqueado'){box.innerHTML='<div class="empty">Acesso bloqueado temporariamente.</div>';return}let p=currentProject()||projects[0];if(p)selectedProjectId=p.id;box.innerHTML=`<div class="client-hero"><h1>Olá, ${client.name}</h1><p class="muted">Aqui você acompanha seus projetos, aprova etapas ou solicita ajustes.</p><div class="pills"><span class="pill">${client.status}</span><span class="pill">${client.access}</span></div></div><div id="projectNav" class="stage"><h2>Projetos disponíveis</h2><p class="muted">Toque em um projeto para visualizar. Os próximos ficam bloqueados até liberação da Humaniza.</p><div class="client-projects">${projects.map(x=>`<div class="client-project ${x.id===selectedProjectId?'active':''}" onclick="selectProject('${x.id}')"><h3>${x.period}</h3><div class="pills">${statusPill(x.strategicStatus)}${statusPill(x.productionStatus)}</div><div class="progress"><span style="width:${progress(x)}%"></span></div></div>`).join('')}<div class="client-project locked-card"><h3>Próximo projeto</h3><div class="pills"><span class="pill lock">🔒 ${projectLockedLabel(0)}</span></div><p class="muted">Será liberado pela Humaniza.</p></div><div class="client-project locked-card"><h3>Projeto futuro</h3><div class="pills"><span class="pill lock">🔒 ${projectLockedLabel(1)}</span></div><p class="muted">Será liberado pela Humaniza.</p></div></div></div>${p?renderProjectDetail(client,p):'<div class="empty">Nenhum projeto disponível.</div>'}`;setTimeout(()=>document.querySelectorAll('textarea').forEach(t=>autoGrow(t)),0)}
loadData();
