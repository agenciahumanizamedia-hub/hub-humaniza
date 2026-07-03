import { db, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp } from "./firebase.js";

let clients=[], projects=[], selectedClientId=localStorage.getItem('hubSelectedClient')||null, selectedProjectId=localStorage.getItem('hubSelectedProject')||null;

Object.assign(window,{openClientModal,openProjectModal,closeModals,saveClient,saveProject,selectClient,selectProject,deleteClient,copyClientLink,approveStrategic,approveProduction,approveCalendar,requestAdjust,autoGrow,render,addContentItem,removeContentItem,toggleChecklist,formatText,formatHighlight,clearFormat,setTextSize,normalizeEditor,pasteClean,releaseStage,saveDraft,updateClientControl,updateProjectControl,updateStageControl});

function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2)}
function autoGrow(el){el.style.height='auto';el.style.height=(el.scrollHeight+2)+'px'}
function closeModals(){document.querySelectorAll('.modal').forEach(m=>m.classList.remove('active'))}

function formatText(cmd,value=null){
  document.execCommand(cmd,false,value);
}
function formatHighlight(){
  document.execCommand('foreColor',false,'#FFFFFF');
  document.execCommand('backColor',false,'#111111');
}
function clearFormat(){
  document.execCommand('removeFormat',false,null);
  document.execCommand('foreColor',false,'#1C1C1C');
}
function setTextSize(size){
  document.execCommand('fontSize', false, '7');
  document.querySelectorAll('font[size="7"]').forEach(el=>{
    const span=document.createElement('span');
    span.style.fontSize=size;
    span.innerHTML=el.innerHTML;
    el.replaceWith(span);
  });
}
function normalizeEditor(){
  const selection=window.getSelection();
  let target=null;
  if(selection && selection.anchorNode){
    target=selection.anchorNode.nodeType===1?selection.anchorNode:selection.anchorNode.parentElement;
    target=target?.closest?.('.rich-editor');
  }
  if(!target)target=document.activeElement?.closest?.('.rich-editor')||document.activeElement;
  if(!target || !target.classList?.contains('rich-editor'))return;
  const text=target.innerText;
  target.innerHTML=text.replace(/\n/g,'<br>');
  target.style.fontSize='';
  target.style.fontFamily='';
  target.style.color='';
}
function pasteClean(e){
  e.preventDefault();
  const text=(e.clipboardData||window.clipboardData).getData('text/plain');
  document.execCommand('insertText',false,text);
}

function htmlToText(html){
  const div=document.createElement('div');
  div.innerHTML=html||'';
  return div.innerText||'';
}
function richField(label,id,value){
  return `<div class="content-box rich-box">
    <label>${label}</label>
    <div class="rich-toolbar">
      <button type="button" onclick="setTextSize('14px')" title="Texto pequeno">Pequeno</button><button type="button" onclick="setTextSize('16px')" title="Texto normal">Normal</button><button type="button" onclick="setTextSize('20px')" title="Subtítulo">Subtítulo</button><button type="button" onclick="setTextSize('26px')" title="Título">Título</button><button type="button" onclick="formatText('bold')" title="Negrito">B</button><button type="button" onclick="formatText('foreColor','#5B56FF')" title="Letra roxa">Roxo</button><button type="button" onclick="formatText('foreColor','#1C1C1C')" title="Letra preta">Preto</button><button type="button" onclick="formatText('foreColor','#FFFFFF')" title="Letra branca">Branco</button><button type="button" onclick="formatHighlight()" title="Fundo preto com letra branca">Destaque</button><button type="button" onclick="normalizeEditor()" title="Padronizar texto deste campo">Normalizar</button><button type="button" onclick="clearFormat()" title="Remover formatação">Limpar</button>
    </div>
    <div class="rich-editor" onpaste="pasteClean(event)" id="${id}" contenteditable="true" oninput="this.dataset.changed='1'">${value||''}</div>
  </div>`;
}
function richValue(id,fallback=''){
  const el=document.getElementById(id);
  if(!el)return fallback||'';
  return el.innerHTML;
}

function statusPill(s){if(s==='Aprovado')return'<span class="pill green">Aprovado</span>';if(s==='Ajustes solicitados')return'<span class="pill yellow">Ajustes</span>';if(s==='Bloqueado')return'<span class="pill lock">Bloqueado</span>';if(s==='Em andamento'||s==='Em desenvolvimento')return'<span class="pill purple">'+s+'</span>';return'<span class="pill yellow">'+s+'</span>'}
function progress(p){let n=0;if(p.strategicStatus==='Aprovado')n+=25;if(p.productionStatus==='Aprovado')n+=25;if(p.calendarStatus==='Aprovado')n+=25;if(p.approvalStatus==='Finalizado')n+=25;return n}

function defaultChecklist(type){
  if(type === 'roteiro'){
    return [
      {label:'Conteúdo criado',done:false},
      {label:'Revisado internamente',done:false},
      {label:'Cliente aprovou',done:false},
      {label:'Gravado',done:false},
      {label:'Editado',done:false},
      {label:'Legenda pronta',done:false},
      {label:'Publicado',done:false}
    ];
  }
  return [
    {label:'Conteúdo criado',done:false},
    {label:'Revisado internamente',done:false},
    {label:'Cliente aprovou',done:false},
    {label:'Arte criada',done:false},
    {label:'Legenda pronta',done:false},
    {label:'Publicado',done:false}
  ];
}
function newContentItem(type){
  const map={roteiro:'Roteiro',carrossel:'Carrossel',estatico:'Estático'};
  return {
    id:uid(),
    type,
    title:map[type]||'Conteúdo',
    driveLink:'',
    responsible:'',
    fields:{tema:'',objetivo:'',gancho:'',desenvolvimento:'',cta:'',slides:'',mensagem:'',legenda:''},
    checklist:defaultChecklist(type),
    note:''
  }
}
function baseProject(period,clientId){return{clientId,period,strategicStatus:'Aguardando aprovação',productionStatus:'Bloqueado',calendarStatus:'Bloqueado',approvalStatus:'Bloqueado',history:['Equipe Humaniza criou o projeto.'],strategic:{macro:'Objetivo principal do mês.',editorial:'Autoridade, conexão, prova e conversão.',themes:'Tema 01\nTema 02\nTema 03\nTema 04',creative:'Tom humano, claro e estratégico.',note:''},production:{items:[newContentItem('roteiro'),newContentItem('carrossel'),newContentItem('estatico')],note:''},calendar:{content:'Calendário Editorial\n\n01/07:\nFormato:\nTema:\nStatus:',note:''}}}

async function loadData(){clients=(await getDocs(collection(db,'hubClients'))).docs.map(d=>({id:d.id,...d.data()}));projects=(await getDocs(collection(db,'hubProjects'))).docs.map(d=>({id:d.id,...d.data()}));if(selectedClientId&&!clients.find(c=>c.id===selectedClientId))selectedClientId=clients[0]?.id||null;if(!selectedClientId&&clients[0])selectedClientId=clients[0].id;let ps=projects.filter(p=>p.clientId===selectedClientId);if(selectedProjectId&&!ps.find(p=>p.id===selectedProjectId))selectedProjectId=ps[0]?.id||null;if(!selectedProjectId&&ps[0])selectedProjectId=ps[0].id;localStorage.setItem('hubSelectedClient',selectedClientId||'');localStorage.setItem('hubSelectedProject',selectedProjectId||'');render()}
function currentClient(){return clients.find(c=>c.id===selectedClientId)}
function currentProject(){return projects.find(p=>p.id===selectedProjectId)}
function openClientModal(){clientName.value='';clientEmail.value='';responsibleName.value='';responsiblePhone.value='';clientStatus.value='Ativo';clientAccess.value='Liberado';clientObs.value='';clientModal.classList.add('active')}
function openProjectModal(){if(!clients.length){alert('Cadastre um cliente primeiro.');return}projectClient.innerHTML=clients.map(c=>`<option value="${c.id}" ${c.id===selectedClientId?'selected':''}>${c.name}</option>`).join('');updateCopyOptions();projectClient.onchange=updateCopyOptions;projectPeriod.value='';projectModal.classList.add('active')}
function updateCopyOptions(){let list=projects.filter(p=>p.clientId===projectClient.value);projectCopy.innerHTML='<option value="">Começar em branco</option>'+list.map(p=>`<option value="${p.id}">Duplicar ${p.period}</option>`).join('')}
async function saveClient(){let name=clientName.value.trim();if(!name){alert('Coloque o nome do cliente.');return}let r=await addDoc(collection(db,'hubClients'),{name,email:clientEmail.value.trim(),responsibleName:responsibleName.value.trim(),responsiblePhone:responsiblePhone.value.trim().replace(/\D/g,''),status:clientStatus.value,access:clientAccess.value,obs:clientObs.value.trim(),createdAt:serverTimestamp(),updatedAt:serverTimestamp()});selectedClientId=r.id;selectedProjectId=null;closeModals();await loadData()}
async function saveProject(){let clientId=projectClient.value,period=projectPeriod.value.trim();if(!period){alert('Coloque o período.');return}let data,copyId=projectCopy.value;if(copyId){let old=projects.find(p=>p.id===copyId);data=JSON.parse(JSON.stringify(old));delete data.id;data.period=period;data.clientId=clientId;data.history=['Equipe Humaniza criou o projeto duplicando '+old.period+'.'];data.strategicStatus='Aguardando aprovação';data.productionStatus='Bloqueado';data.calendarStatus='Bloqueado';data.approvalStatus='Bloqueado'}else data=baseProject(period,clientId);data.createdAt=serverTimestamp();data.updatedAt=serverTimestamp();let r=await addDoc(collection(db,'hubProjects'),data);selectedClientId=clientId;selectedProjectId=r.id;closeModals();await loadData()}
function selectClient(id){selectedClientId=id;selectedProjectId=projects.filter(p=>p.clientId===id)[0]?.id||null;localStorage.setItem('hubSelectedClient',id);localStorage.setItem('hubSelectedProject',selectedProjectId||'');render()}
function selectProject(id){selectedProjectId=id;localStorage.setItem('hubSelectedProject',id);render()}
function renderDashboard(){dashboard.innerHTML=`<div class="dashboard-card"><span class="muted">Clientes</span><strong>${clients.length}</strong></div><div class="dashboard-card"><span class="muted">Projetos</span><strong>${projects.length}</strong></div><div class="dashboard-card"><span class="muted">Aguardando</span><strong>${projects.filter(x=>x.strategicStatus!=='Aprovado').length}</strong></div><div class="dashboard-card"><span class="muted">Finalizados</span><strong>${projects.filter(x=>progress(x)===100).length}</strong></div>`}
function renderClients(){let q=(searchClient.value||'').toLowerCase(),list=clients.filter(c=>c.name.toLowerCase().includes(q));clientsList.innerHTML=list.length?list.map(c=>{let count=projects.filter(p=>p.clientId===c.id).length,first=projects.find(p=>p.clientId===c.id);return`<div class="client-card ${c.id===selectedClientId?'active':''}" onclick="selectClient('${c.id}')"><h3>${c.name}</h3><div class="muted">Resp.: ${c.responsibleName||'Não definido'}<br>${count} projeto(s)</div><div class="pills"><span class="pill">${c.status}</span><span class="pill">${c.access}</span>${first?statusPill(first.strategicStatus):''}</div></div>`}).join(''):'<div class="empty">Nenhum cliente.</div>'}
function renderWorkspace(){let c=currentClient();if(!c){workspace.innerHTML='<div class="empty">Cadastre ou selecione um cliente.</div>';return}let p=currentProject();workspace.innerHTML=`<div class="panel"><div class="top" style="margin:0"><div><h2>${c.name}</h2><p class="muted">Responsável: ${c.responsibleName||'Não definido'} • Acesso: ${c.access}</p></div><button class="btn-danger" onclick="deleteClient('${c.id}')">Excluir cliente</button></div><div class="actions"><button onclick="openProjectModal()">+ Novo projeto/mês</button><button class="btn-dark" onclick="copyClientLink()">Copiar link do cliente</button></div></div>${renderProjects(c)}${p?renderProjectDetail(c,p,true):'<div class="empty">Esse cliente ainda não tem projetos. Clique em + Novo projeto/mês.</div>'}`}
function renderProjects(c){let list=projects.filter(p=>p.clientId===c.id);if(!list.length)return'';return`<div class="project-list">${list.map(x=>`<div class="project-card ${x.id===selectedProjectId?'active':''}" onclick="selectProject('${x.id}')"><h3>${x.period}</h3><div class="pills">${statusPill(x.strategicStatus)}${statusPill(x.productionStatus)}</div><div class="progress"><span style="width:${progress(x)}%"></span></div></div>`).join('')}</div>`}
function stepClass(s){if(s==='Aprovado')return'done';if(s==='Bloqueado')return'locked';return'active'}
function renderProjectDetail(c,p,isAdmin){return`<div class="stage"><div class="stage-head"><div><h2>Projeto ${p.period}</h2><p>Etapas liberadas conforme aprovação.</p></div><span class="pill">${progress(p)}%</span></div><div class="flow"><div class="step ${stepClass(p.strategicStatus)}"><b>01 Planejamento</b><br>${p.strategicStatus}</div><div class="step ${stepClass(p.productionStatus)}"><b>02 Desenvolvimento</b><br>${p.productionStatus}</div><div class="step ${stepClass(p.calendarStatus)}"><b>03 Calendário</b><br>${p.calendarStatus}</div><div class="step ${stepClass(p.approvalStatus)}"><b>04 Aprovações</b><br>${p.approvalStatus}</div></div></div>${isAdmin?adminControls(c,p):''}${stageStrategic(p,isAdmin)}${stageProduction(p,isAdmin)}${stageCalendar(p,isAdmin)}${stageApproval(p,isAdmin)}<div class="stage"><h2>Histórico</h2><div class="timeline">${(p.history||[]).map(h=>`<div>${h}</div>`).join('')}</div></div>`}
function field(label,id,value,isAdmin){
  if(isAdmin)return richField(label,id,value);
  return `<div class="content-box"><label>${label}</label><div class="readonly-box">${value||''}</div></div>`;
}
function stageStrategic(p,isAdmin){return`<div class="stage"><div class="stage-head"><div><h2>01 Planejamento Estratégico</h2><p>A produção só libera após essa aprovação.</p></div>${statusPill(p.strategicStatus)}</div>${isAdmin?stageControl('strategic',p.strategicStatus):''}<div class="content-grid">${field('Visão Macro','strategic_macro',p.strategic?.macro,isAdmin)}${field('Linha Editorial','strategic_editorial',p.strategic?.editorial,isAdmin)}${field('Temas do mês','strategic_themes',p.strategic?.themes,isAdmin)}${field('Direção Criativa','strategic_creative',p.strategic?.creative,isAdmin)}</div><label>Observações do cliente</label><textarea class="note" id="strategic_note" oninput="autoGrow(this)">${p.strategic?.note||''}</textarea><div class="actions"><button class="btn-dark" onclick="saveDraft('planejamento estratégico')">Salvar alterações</button><button class="btn-green" onclick="approveStrategic()">Aprovar planejamento</button><button class="btn-yellow" onclick="requestAdjust('strategic')">Solicitar ajustes</button></div></div>`}
function stageProduction(p,isAdmin){let items=p.production?.items||[];let blocked=!isAdmin&&p.productionStatus==='Bloqueado';return`<div class="stage ${blocked?'locked':''}"><div class="stage-head"><div><h2>02 Desenvolvimento Criativo</h2><p>${isAdmin?'Área liberada para a agência preparar antes da aprovação do cliente.':'Cards separados para roteiros, carrosséis e estáticos.'}</p></div>${statusPill(p.productionStatus)}</div>${isAdmin?stageControl('production',p.productionStatus):''}${blocked?'<p class="muted">Bloqueado até aprovação do planejamento.</p>':`<div class="content-actions"><button onclick="addContentItem('roteiro')">+ Adicionar roteiro</button><button onclick="addContentItem('carrossel')">+ Adicionar carrossel</button><button onclick="addContentItem('estatico')">+ Adicionar estático</button></div>${items.map(renderContentItem).join('')}<label>Observações gerais do desenvolvimento</label><textarea class="note" id="production_note" oninput="autoGrow(this)">${p.production?.note||''}</textarea><div class="actions"><button class="btn-dark" onclick="saveDraft('desenvolvimento criativo')">Salvar alterações</button><button class="btn-green" onclick="releaseStage('production')">Liberar desenvolvimento ao cliente</button><button class="btn-dark" onclick="saveDraft('calendário editorial')">Salvar alterações</button><button class="btn-green" onclick="releaseStage('calendar')">Liberar calendário ao cliente</button><button class="btn-yellow" onclick="requestAdjust('production')">Registrar ajustes</button></div>`}</div>`}
function itemProgress(item){let total=item.checklist?.length||0,done=(item.checklist||[]).filter(x=>x.done).length;return total?Math.round(done*100/total):0}
function renderContentItem(item){let pct=itemProgress(item),typeLabel=item.type==='roteiro'?'🎬 Roteiro':item.type==='carrossel'?'📚 Carrossel':'🖼️ Estático';return`<div class="content-item ${pct===100?'done':''}" data-item="${item.id}"><div class="content-item-head"><div><h4>${typeLabel}</h4><span class="muted">${pct}% concluído</span></div><button class="btn-danger" onclick="removeContentItem('${item.id}')">Remover</button></div><div class="content-progress"><span style="width:${pct}%"></span></div><label>Responsável</label><textarea data-field="responsible" oninput="autoGrow(this)" placeholder="Ex: Diego, Luana, Lucas">${item.responsible||''}</textarea><label>Link Drive</label><textarea data-field="driveLink" oninput="autoGrow(this)" placeholder="Cole aqui o link do Drive">${item.driveLink||''}</textarea><label>Tema</label><div class="rich-toolbar"><button type="button" onclick="formatText('bold')" title="Negrito">B</button><button type="button" onclick="formatText('foreColor','#5B56FF')" title="Letra roxa">Roxo</button><button type="button" onclick="formatText('foreColor','#1C1C1C')" title="Letra preta">Preto</button><button type="button" onclick="formatText('foreColor','#FFFFFF')" title="Letra branca">Branco</button><button type="button" onclick="formatHighlight()" title="Fundo preto com letra branca">Destaque</button><button type="button" onclick="clearFormat()" title="Remover formatação">Limpar</button></div><div class="rich-editor" onpaste="pasteClean(event)" data-field="tema" contenteditable="true">${item.fields?.tema||''}</div>${item.type==='roteiro'?`<label>Objetivo</label><div class="rich-editor" onpaste="pasteClean(event)" data-field="objetivo" contenteditable="true">${item.fields?.objetivo||''}</div><label>Gancho</label><div class="rich-editor" onpaste="pasteClean(event)" data-field="gancho" contenteditable="true">${item.fields?.gancho||''}</div><label>Desenvolvimento</label><div class="rich-editor" onpaste="pasteClean(event)" data-field="desenvolvimento" contenteditable="true">${item.fields?.desenvolvimento||''}</div><label>CTA</label><div class="rich-editor" onpaste="pasteClean(event)" data-field="cta" contenteditable="true">${item.fields?.cta||''}</div>`:''}${item.type==='carrossel'?`<label>Objetivo</label><div class="rich-editor" onpaste="pasteClean(event)" data-field="objetivo" contenteditable="true">${item.fields?.objetivo||''}</div><label>Slides</label><div class="rich-editor" onpaste="pasteClean(event)" data-field="slides" contenteditable="true">${item.fields?.slides||''}</div><label>Legenda</label><div class="rich-editor" onpaste="pasteClean(event)" data-field="legenda" contenteditable="true">${item.fields?.legenda||''}</div><label>CTA</label><div class="rich-editor" onpaste="pasteClean(event)" data-field="cta" contenteditable="true">${item.fields?.cta||''}</div>`:''}${item.type==='estatico'?`<label>Mensagem principal</label><div class="rich-editor" onpaste="pasteClean(event)" data-field="mensagem" contenteditable="true">${item.fields?.mensagem||''}</div><label>Legenda</label><div class="rich-editor" onpaste="pasteClean(event)" data-field="legenda" contenteditable="true">${item.fields?.legenda||''}</div><label>CTA</label><div class="rich-editor" onpaste="pasteClean(event)" data-field="cta" contenteditable="true">${item.fields?.cta||''}</div>`:''}<div class="checklist">${(item.checklist||[]).map((c,i)=>`<label class="checkline"><input type="checkbox" ${c.done?'checked':''} onchange="toggleChecklist('${item.id}',${i},this.checked)"> ${c.label}</label>`).join('')}</div><label>Observações</label><textarea data-field="note" oninput="autoGrow(this)">${item.note||''}</textarea></div>`}
function stageCalendar(p,isAdmin){let blocked=!isAdmin&&p.calendarStatus==='Bloqueado';return`<div class="stage ${blocked?'locked':''}"><div class="stage-head"><div><h2>03 Calendário Editorial</h2><p>${isAdmin?'Área liberada para a agência preparar antes da liberação ao cliente.':'Organização de datas, formatos e temas.'}</p></div>${statusPill(p.calendarStatus)}</div>${isAdmin?stageControl('calendar',p.calendarStatus):''}${blocked?'<p class="muted">Bloqueado até aprovação do desenvolvimento.</p>':`${field('Calendário Editorial','calendar_content',p.calendar?.content,isAdmin)}<label>Observações do cliente</label><textarea class="note" id="calendar_note" oninput="autoGrow(this)">${p.calendar?.note||''}</textarea><div class="actions"><button class="btn-dark" onclick="saveDraft('calendário editorial')">Salvar alterações</button><button class="btn-green" onclick="releaseStage('calendar')">Liberar calendário ao cliente</button><button class="btn-green" onclick="releaseStage('approval')">Liberar aprovação final</button><button class="btn-yellow" onclick="requestAdjust('calendar')">Registrar ajustes</button></div>`}</div>`}
function stageApproval(p,isAdmin){
  let blocked=!isAdmin&&p.approvalStatus==='Bloqueado';
  return `<div class="stage ${blocked?'locked':''}">
    <div class="stage-head">
      <div><h2>04 Aprovação Final</h2><p>${isAdmin?'Área liberada para a agência preparar antes de mostrar ao cliente.':'Conteúdos finais liberados para sua conferência.'}</p></div>
      ${statusPill(p.approvalStatus)}
    </div>
    ${blocked?'<p class="muted">Esta etapa ainda não foi liberada pela agência.</p>':`
      <div class="content-box">
        <label>Orientações finais</label>
        ${isAdmin?`<div class="rich-toolbar"><button type="button" onclick="formatText('bold')" title="Negrito">B</button><button type="button" onclick="formatText('foreColor','#5B56FF')" title="Letra roxa">Roxo</button><button type="button" onclick="formatText('foreColor','#1C1C1C')" title="Letra preta">Preto</button><button type="button" onclick="formatText('foreColor','#FFFFFF')" title="Letra branca">Branco</button><button type="button" onclick="formatHighlight()" title="Fundo preto com letra branca">Destaque</button><button type="button" onclick="clearFormat()" title="Remover formatação">Limpar</button></div><div class="rich-editor" onpaste="pasteClean(event)" id="approval_notes" contenteditable="true">${p.approvalNotes||''}</div>`:`<div class="readonly-box">${p.approvalNotes||''}</div>`}
      </div>
      ${isAdmin?`<div class="actions"><button class="btn-green" onclick="releaseStage('approval')">Liberar aprovação final ao cliente</button></div>`:''}
    `}
  </div>`;
}
function collectProduction(p){let items=(p.production?.items||[]).map(item=>{let box=document.querySelector(`[data-item="${item.id}"]`);if(!box)return item;let fields={...item.fields};box.querySelectorAll('[data-field]').forEach(el=>{let k=el.getAttribute('data-field');if(k==='note') item.note=el.value; else if(k==='driveLink') item.driveLink=el.value; else if(k==='responsible') item.responsible=el.value; else fields[k]=(el.innerHTML!==undefined?el.innerHTML:el.value)});return{...item,fields,note:item.note||''}});return{...p.production,items,note:document.getElementById('production_note')?.value??p.production?.note??''}}
function getForm(p){let g=id=>document.getElementById(id)?.value;return{strategic:{...p.strategic,macro:richValue('strategic_macro',p.strategic?.macro??''),editorial:richValue('strategic_editorial',p.strategic?.editorial??''),themes:richValue('strategic_themes',p.strategic?.themes??''),creative:richValue('strategic_creative',p.strategic?.creative??''),note:g('strategic_note')??p.strategic?.note??''},production:collectProduction(p),calendar:{...p.calendar,content:richValue('calendar_content',p.calendar?.content??''),note:g('calendar_note')??p.calendar?.note??''}}}
async function saveProjectExtra(extra={}){
  let p=currentProject();if(!p)return;
  const approvalEl=document.getElementById('approval_notes');
  const approvalNotes=approvalEl?approvalEl.innerHTML:(p.approvalNotes||'');
  await updateDoc(doc(db,'hubProjects',p.id),{...getForm(p),approvalNotes,...extra,updatedAt:serverTimestamp()})
}
function addHistory(p,text){return[new Date().toLocaleString('pt-BR')+' • '+text,...(p.history||[])]}
async function addContentItem(type){let p=currentProject();let form=getForm(p);form.production.items=[...(form.production.items||[]),newContentItem(type)];form.history=addHistory(p,'Equipe Humaniza adicionou um '+(type==='roteiro'?'roteiro':type==='carrossel'?'carrossel':'estático')+'.');await updateDoc(doc(db,'hubProjects',p.id),{production:form.production,history:form.history||p.history,updatedAt:serverTimestamp()});await loadData()}
async function removeContentItem(id){let p=currentProject();let form=getForm(p);form.production.items=(form.production.items||[]).filter(x=>x.id!==id);await updateDoc(doc(db,'hubProjects',p.id),{production:form.production,updatedAt:serverTimestamp()});await loadData()}
async function toggleChecklist(id,index,checked){let p=currentProject();let form=getForm(p);let item=form.production.items.find(x=>x.id===id);if(item&&item.checklist[index])item.checklist[index].done=checked;await updateDoc(doc(db,'hubProjects',p.id),{production:form.production,updatedAt:serverTimestamp()});await loadData()}
function send(c,msg){if(!c.responsiblePhone){alert('WhatsApp do responsável não cadastrado.');return}window.open(`https://wa.me/${c.responsiblePhone}?text=${encodeURIComponent(msg)}`,'_blank')}

async function saveDraft(label='alterações'){
  const p=currentProject(); if(!p)return;
  try{
    await saveProjectExtra({history:addHistory(p,'Equipe Humaniza • Salvou '+label+'.')});
    alert('Alterações salvas com sucesso.');
    await loadData();
  }catch(err){console.error(err);alert('Erro ao salvar: '+(err.message||err));}
}
async function updateClientControl(field,value){
  const c=currentClient(); if(!c)return;
  try{
    await updateDoc(doc(db,'hubClients',c.id),{[field]:value,updatedAt:serverTimestamp()});
    alert('Cliente atualizado com sucesso.'); await loadData();
  }catch(err){console.error(err);alert('Erro ao atualizar cliente: '+(err.message||err));}
}
async function updateProjectControl(field,value){
  const p=currentProject(); if(!p)return;
  try{
    await updateDoc(doc(db,'hubProjects',p.id),{
      [field]:value,
      history:addHistory(p,'Equipe Humaniza • Alterou '+field+' para '+value+'.'),
      updatedAt:serverTimestamp()
    });
    alert('Projeto atualizado com sucesso.'); await loadData();
  }catch(err){console.error(err);alert('Erro ao atualizar projeto: '+(err.message||err));}
}
async function updateStageControl(stage,value){
  const p=currentProject(); if(!p)return;
  const fields={strategic:'strategicStatus',production:'productionStatus',calendar:'calendarStatus',approval:'approvalStatus'};
  const field=fields[stage]; if(!field)return;
  try{
    await updateDoc(doc(db,'hubProjects',p.id),{
      [field]:value,
      history:addHistory(p,'Equipe Humaniza • Alterou '+stage+' para '+value+'.'),
      updatedAt:serverTimestamp()
    });
    alert('Etapa atualizada com sucesso.'); await loadData();
  }catch(err){console.error(err);alert('Erro ao atualizar etapa: '+(err.message||err));}
}
function controlSelect(label,value,onchange,options){
  return `<label class="control-field"><span>${label}</span><select onchange="${onchange}">
    ${options.map(o=>`<option value="${o}" ${value===o?'selected':''}>${o}</option>`).join('')}
  </select></label>`;
}
function adminControls(c,p){
  return `<div class="admin-control-panel">
    <div class="control-head"><h3>Controle de acesso e status</h3><p>Você decide o que o cliente pode visualizar.</p></div>
    <div class="control-grid">
      ${controlSelect('Cliente',c.clientState||'Ativo',`updateClientControl('clientState',this.value)`,['Ativo','Pausado','Finalizado'])}
      ${controlSelect('Acesso do cliente',c.accessState||'Liberado',`updateClientControl('accessState',this.value)`,['Liberado','Bloqueado'])}
      ${controlSelect('Projeto',p.projectState||'Em andamento',`updateProjectControl('projectState',this.value)`,['Rascunho','Em andamento','Aguardando cliente','Aprovado','Finalizado','Bloqueado'])}
      ${controlSelect('Visibilidade do projeto',p.projectAccess||'Liberado',`updateProjectControl('projectAccess',this.value)`,['Liberado','Bloqueado'])}
    </div>
  </div>`;
}
function stageControl(stage,value){
  const opts=['Preparando','Liberado ao cliente','Aguardando aprovação','Aprovado','Finalizado','Bloqueado'];
  return `<div class="stage-control">${controlSelect('Status da etapa',value||'Preparando',`updateStageControl('${stage}',this.value)`,opts)}</div>`;
}

async function releaseStage(stage){
  let p=currentProject();
  if(!p)return;
  const map={
    production:{field:'productionStatus',status:'Em desenvolvimento',text:'Desenvolvimento liberado ao cliente.'},
    calendar:{field:'calendarStatus',status:'Em desenvolvimento',text:'Calendário liberado ao cliente.'},
    approval:{field:'approvalStatus',status:'Em andamento',text:'Aprovação final liberada ao cliente.'}
  };
  const cfg=map[stage];
  if(!cfg)return;
  try{
    await saveProjectExtra({[cfg.field]:cfg.status,history:addHistory(p,'Equipe Humaniza • '+cfg.text)});
    alert(cfg.text);
    await loadData();
  }catch(err){
    console.error(err);
    alert('Erro ao liberar etapa: '+(err.message||err));
  }
}
async function approveStrategic(){let c=currentClient(),p=currentProject();await saveProjectExtra({strategicStatus:'Aprovado',productionStatus:'Em desenvolvimento',history:addHistory(p,'Planejamento aprovado. Desenvolvimento liberado.')});send(c,`✅ PLANEJAMENTO APROVADO\n\nCliente: ${c.name}\nProjeto: ${p.period}\n\nA produção pode iniciar seguindo exatamente o planejamento aprovado.`);await loadData()}
async function approveProduction(){let c=currentClient(),p=currentProject();await saveProjectExtra({productionStatus:'Aprovado',calendarStatus:'Em desenvolvimento',history:addHistory(p,'Desenvolvimento aprovado. Calendário liberado.')});send(c,`✅ DESENVOLVIMENTO APROVADO\n\nCliente: ${c.name}\nProjeto: ${p.period}\n\nCalendário Editorial liberado.`);await loadData()}
async function approveCalendar(){let c=currentClient(),p=currentProject();await saveProjectExtra({calendarStatus:'Aprovado',approvalStatus:'Em andamento',history:addHistory(p,'Calendário aprovado. Próxima etapa: aprovação de artes e vídeos.')});send(c,`✅ CALENDÁRIO APROVADO\n\nCliente: ${c.name}\nProjeto: ${p.period}\n\nPróxima etapa: aprovação de artes e vídeos.`);await loadData()}
async function requestAdjust(type){let c=currentClient(),p=currentProject(),map={strategic:['strategicStatus','Planejamento'],production:['productionStatus','Desenvolvimento'],calendar:['calendarStatus','Calendário']};await saveProjectExtra({[map[type][0]]:'Ajustes solicitados',history:addHistory(p,'Ajustes solicitados em '+map[type][1]+'.')});send(c,`⚠️ AJUSTES SOLICITADOS\n\nCliente: ${c.name}\nProjeto: ${p.period}\nEtapa: ${map[type][1]}`);await loadData()}
async function deleteClient(id){if(!confirm('Excluir cliente e todos os projetos dele?'))return;for(let p of projects.filter(p=>p.clientId===id))await deleteDoc(doc(db,'hubProjects',p.id));await deleteDoc(doc(db,'hubClients',id));selectedClientId=null;selectedProjectId=null;await loadData()}
function copyClientLink(){let c=currentClient();if(!c)return;let link=window.location.origin+'/cliente.html?id='+c.id;navigator.clipboard?.writeText(link);alert('Link do cliente copiado: '+link)}
function render(){renderDashboard();renderClients();renderWorkspace();setTimeout(()=>document.querySelectorAll('textarea').forEach(t=>autoGrow(t)),0)}
loadData();
