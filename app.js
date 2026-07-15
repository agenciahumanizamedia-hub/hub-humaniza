<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Prévia Controle de Acesso | Hub Humaniza</title>
<style>
*{box-sizing:border-box}
:root{
  --roxo:#5B56FF;
  --preto:#1C1C1C;
  --card:#242424;
  --linha:#353535;
  --branco:#F2F2F0;
  --cinza:#A6A6A6;
  --verde:#2C9D63;
  --amarelo:#B47B20;
  --vermelho:#8E2A2A;
}
body{
  margin:0;
  background:var(--preto);
  color:var(--branco);
  font-family:Arial,Helvetica,sans-serif;
}
.wrap{
  width:min(1050px,94vw);
  margin:24px auto 70px;
}
.top,.panel,.client-view{
  background:var(--card);
  border:1px solid var(--linha);
  border-radius:20px;
  padding:20px;
  margin-bottom:16px;
}
h1,h2,h3{margin:0}
.muted{color:var(--cinza);line-height:1.45}
.grid{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:14px;
  margin-top:16px;
}
.control{
  background:#202020;
  border:1px solid #3A3A3A;
  border-radius:14px;
  padding:14px;
}
label{
  display:block;
  color:var(--cinza);
  font-size:12px;
  font-weight:900;
  text-transform:uppercase;
  letter-spacing:.7px;
  margin-bottom:7px;
}
select{
  width:100%;
  background:#2B2B2B;
  color:#fff;
  border:1px solid #454545;
  border-radius:10px;
  padding:12px;
  font-size:15px;
}
.actions{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  margin-top:16px;
}
button{
  border:0;
  border-radius:12px;
  padding:11px 14px;
  font-weight:900;
  cursor:pointer;
  color:white;
  background:var(--roxo);
}
.btn-dark{background:#3A3A3A}
.status-row{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
  margin-top:12px;
}
.pill{
  border-radius:999px;
  padding:7px 10px;
  font-size:12px;
  font-weight:900;
  background:#2A2A2A;
  border:1px solid #3A3A3A;
}
.green{color:#52D694;border-color:rgba(82,214,148,.4)}
.yellow{color:#FFBD4A;border-color:rgba(255,189,74,.4)}
.red{color:#FF8585;border-color:rgba(255,133,133,.4)}
.locked-box{
  background:#202020;
  border:1px dashed #555;
  border-radius:14px;
  padding:24px;
  text-align:center;
  color:var(--cinza);
}
.open-box{
  background:#F2F2F0;
  color:#1C1C1C;
  border-radius:14px;
  padding:18px;
}
.notice{
  position:fixed;
  right:18px;
  bottom:18px;
  background:#202020;
  border:1px solid rgba(91,86,255,.55);
  padding:12px 14px;
  border-radius:14px;
  opacity:0;
  transform:translateY(10px);
  transition:.2s;
}
.notice.show{
  opacity:1;
  transform:translateY(0);
}
@media(max-width:700px){
  .grid{grid-template-columns:1fr}
}
</style>
</head>
<body>
<div class="wrap">
  <section class="top">
    <h1>Hub Humaniza</h1>
    <p class="muted">Prévia da correção de acesso do cliente</p>
  </section>

  <section class="panel">
    <h2>Painel da agência</h2>
    <p class="muted">Altere o status e o acesso. A visão do cliente abaixo muda automaticamente.</p>

    <div class="grid">
      <div class="control">
        <label>Cliente</label>
        <select id="clientStatus" onchange="updatePreview()">
          <option>Ativo</option>
          <option>Pausado</option>
          <option>Finalizado</option>
        </select>
      </div>

      <div class="control">
        <label>Acesso do cliente</label>
        <select id="clientAccess" onchange="updatePreview()">
          <option>Liberado</option>
          <option>Bloqueado</option>
        </select>
      </div>
    </div>

    <div class="actions">
      <button onclick="setBlocked()">Testar bloqueado</button>
      <button class="btn-dark" onclick="setReleased()">Voltar para liberado</button>
    </div>
  </section>

  <section class="client-view">
    <h2>Visão do cliente</h2>
    <div class="status-row">
      <span id="statusPill" class="pill green">Ativo</span>
      <span id="accessPill" class="pill green">Liberado</span>
    </div>

    <div id="clientContent" style="margin-top:16px"></div>
  </section>
</div>

<div id="notice" class="notice">Atualizado agora</div>

<script>
function showNotice(){
  const n=document.getElementById('notice');
  n.classList.add('show');
  clearTimeout(window.noticeTimer);
  window.noticeTimer=setTimeout(()=>n.classList.remove('show'),1400);
}

function updatePreview(){
  const status=document.getElementById('clientStatus').value;
  const access=document.getElementById('clientAccess').value;

  const statusPill=document.getElementById('statusPill');
  const accessPill=document.getElementById('accessPill');
  const content=document.getElementById('clientContent');

  statusPill.textContent=status;
  statusPill.className='pill ' + (status==='Ativo'?'green':status==='Pausado'?'yellow':'red');

  accessPill.textContent=access;
  accessPill.className='pill ' + (access==='Liberado'?'green':'red');

  if(access==='Bloqueado' || status==='Pausado'){
    content.innerHTML=`
      <div class="locked-box">
        <h3>Acesso bloqueado temporariamente</h3>
        <p>Quando a agência voltar para Ativo + Liberado, o portal abre novamente.</p>
      </div>`;
  }else{
    content.innerHTML=`
      <div class="open-box">
        <h3>Olá, Larissa</h3>
        <p>Seu acesso está liberado. Aqui aparecem seus projetos e aprovações.</p>
      </div>`;
  }

  showNotice();
}

function setBlocked(){
  document.getElementById('clientStatus').value='Pausado';
  document.getElementById('clientAccess').value='Bloqueado';
  updatePreview();
}

function setReleased(){
  document.getElementById('clientStatus').value='Ativo';
  document.getElementById('clientAccess').value='Liberado';
  updatePreview();
}

updatePreview();
</script>
</body>
</html>
