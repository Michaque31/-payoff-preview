(function(){
'use strict';
var KEY='payoff_xitique_v1', data=load(), active=null;
function load(){try{var x=JSON.parse(localStorage.getItem(KEY)||'{}');return {groups:Array.isArray(x.groups)?x.groups:[]}}catch(e){return {groups:[]}}}
function save(){
 try{localStorage.setItem(KEY,JSON.stringify(data))}catch(e){console.error('Dados Xitique não foram gravados:',e);alert('O armazenamento do dispositivo está cheio. Exporta uma cópia de segurança e liberta espaço antes de continuar.')}
 try{
  var now=Date.now(),bkKey='payoff_xitique_backups_v1';
  var history=JSON.parse(localStorage.getItem(bkKey)||'[]');
  if(!Array.isArray(history))history=[];
  history=history.filter(function(b){return b&&b.createdAt&&now-new Date(b.createdAt).getTime()<365*24*60*60*1000});
  history.push({createdAt:new Date(now).toISOString(),reason:'alteracao',data:JSON.parse(JSON.stringify(data))});
  if(history.length>500)history=history.slice(-500);
  localStorage.setItem(bkKey,JSON.stringify(history));
 }catch(e){console.warn('Backup local Xitique não concluído',e)}
 if(typeof refreshXitiqueNotifications==='function')refreshXitiqueNotifications(false);
}
function id(){return 'x'+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function money(n){return (Number(n)||0).toLocaleString('pt-PT',{maximumFractionDigits:2})+' MT'}
function group(idv){return data.groups.find(function(g){return g.id===idv})}
function ensureGroup(g){g.members=Array.isArray(g.members)?g.members:[];g.movements=Array.isArray(g.movements)?g.movements:[];g.audit=Array.isArray(g.audit)?g.audit:[];g.settings=g.settings||{cycleDays:30,graceDays:0,fineType:'none',fineValue:0,fineCap:0,fineMode:'informative',contributionMode:'fixed',withdrawalApproval:'manager',orderMode:'manual',reminderDays:2,reminderFrequency:7,reminderChannel:'none'};g.rotationOrder=Array.isArray(g.rotationOrder)?g.rotationOrder:g.members.map(function(m){return m.id});g.drawHistory=Array.isArray(g.drawHistory)?g.drawHistory:[];return g}
function sum(g){return g.movements.filter(function(m){return m.type==='contribution'&&m.status==='confirmed'}).reduce(function(a,m){return a+m.amount},0)}
function spent(g){return g.movements.filter(function(m){return (m.type==='withdrawal'||m.type==='delivery')&&m.status==='confirmed'}).reduce(function(a,m){return a+m.amount},0)}
function style(){if(document.getElementById('xitiqueStyles'))return;var s=document.createElement('style');s.id='xitiqueStyles';s.textContent=
'#ovXitique{z-index:1200;align-items:stretch}#ovXitique .sheet{height:100%;max-height:100%;max-width:none;width:100%;border-radius:0;padding:calc(14px + env(safe-area-inset-top,0px)) 16px calc(20px + env(safe-area-inset-bottom,0px));overflow:auto;background:var(--bg);color:var(--tx)}.x-head{display:flex;align-items:center;gap:10px;position:sticky;top:0;background:var(--bg);padding:5px 0 14px;z-index:2}.x-head h2{margin:0;flex:1}.x-card{background:var(--card);border:1px solid var(--bd);border-radius:17px;padding:15px;margin:10px 0;box-shadow:var(--sh)}.x-muted{color:var(--mut);font-size:13px}.x-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.x-row>*{flex:1}.x-btn{border:0;border-radius:12px;padding:12px 14px;background:var(--ac);color:white;font-weight:650}.x-btn.alt{background:var(--fill);color:var(--tx)}.x-btn.danger{background:var(--red)}.x-field{display:block;width:100%;margin:9px 0;padding:12px;border:1px solid var(--bd);border-radius:11px;background:var(--card);color:var(--tx);font:inherit}.x-field label{font-size:13px;color:var(--mut)}.x-pill{font-size:11px;border-radius:30px;padding:4px 8px;background:var(--fill)}.x-empty{text-align:center;padding:32px 12px;color:var(--mut)}.x-list{display:grid;gap:8px}.x-item{display:flex;align-items:center;gap:12px;padding:12px;border-radius:13px;background:var(--fill)}.x-item .x-main{flex:1;min-width:0}.x-item b{display:block}.x-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.x-total{font-size:25px;font-weight:750;margin:6px 0}.x-note{font-size:12px;color:var(--mut);line-height:1.45}';
document.head.appendChild(s)}
function ensure(){style();if(document.getElementById('ovXitique'))return;var ov=document.createElement('div');ov.className='ov';ov.id='ovXitique';ov.innerHTML='<div class="sheet"><div id="xContent"></div></div>';document.body.appendChild(ov);ov.addEventListener('click',function(e){if(e.target===ov)close()})}
function open(){ensure();render();var el=document.getElementById('ovXitique');el.classList.add('on');el.style.display='flex';document.body.style.overflow='hidden'}
function close(){var el=document.getElementById('ovXitique');if(!el)return;el.classList.remove('on');el.style.display='none';document.body.style.overflow=''}
function head(title,back){return '<div class="x-head">'+(back?'<button class="x-btn alt" data-x="home">‹</button>':'')+'<h2>'+title+'</h2><button class="x-btn alt" data-x="close">✕</button></div>'}
function render(){var root=document.getElementById('xContent');if(!root)return;if(!active){root.innerHTML=head('Xitique',false)+'<p class="x-muted">Organiza grupos rotativos e de acumulação. Os dados ficam guardados neste dispositivo.</p><button class="x-btn" data-x="new">＋ Criar grupo</button><button class="x-btn alt" data-x="backups" style="margin-left:8px">Cópias de segurança</button>'+(data.groups.length?'<div class="x-list" style="margin-top:14px">'+data.groups.map(function(g){return '<div class="x-item"><div class="x-main"><b>'+esc(g.name)+'</b><span class="x-muted">'+(g.mode==='rotative'?'Rotativo':'Acumulação')+' · '+g.members.length+' participantes</span></div><button class="x-btn alt" data-open="'+g.id+'">Abrir</button></div>'}).join('')+'</div>':'<div class="x-empty">Ainda não existem grupos.<br>Cria o primeiro grupo de Xitique.</div>')+'<p class="x-note">Esta primeira área funciona localmente. Convites com sincronização real e backups Google Drive serão ligados numa etapa própria, com autenticação e permissões seguras.</p>';return}
var g=group(active);if(!g){active=null;render();return}
var total=sum(g),out=spent(g),bal=total-out;
root.innerHTML=head(esc(g.name),true)+'<div class="x-card"><span class="x-muted">'+(g.mode==='rotative'?'Xitique rotativo':'Xitique de acumulação')+' · '+esc(g.status)+'</span><div class="x-total">'+money(bal)+'</div><span class="x-muted">Saldo registado · Recebido '+money(total)+' · Saídas confirmadas '+money(out)+'</span>'+(g.goal?'<p class="x-muted">Objetivo: '+money(g.goal)+' · '+Math.min(100,Math.round(total/Math.max(1,g.goal)*100))+'%</p>':'')+'</div><div class="x-row"><button class="x-btn" data-x="contribution">＋ Contribuição</button><button class="x-btn alt" data-x="member">＋ Participante</button></div><div class="x-card"><b>Participantes ('+g.members.length+')</b><div class="x-list" style="margin-top:10px">'+(g.members.length?g.members.map(function(m){return '<div class="x-item"><div class="x-main"><b>'+esc(m.name)+'</b><span class="x-muted">'+esc(m.phone||'Sem telefone')+' · '+(m.status==='removed'?'Saiu do grupo':'Ativo')+'</span></div>'+(m.status==='removed'?'':'<button class="x-btn alt" data-exit="'+m.id+'">Saída</button>')+'</div>'}).join(''):'<span class="x-muted">Ainda sem participantes.</span>')+'</div></div><div class="x-card"><div class="x-row"><b style="flex:2">Movimentos</b><button class="x-btn alt" data-x="withdrawal">＋ Levantamento</button></div>'+(g.movements.length?g.movements.slice().reverse().map(function(m){return '<div class="x-item" style="margin-top:8px"><div class="x-main"><b>'+esc(m.label)+'</b><span class="x-muted">'+esc(m.date)+' · '+(m.status==='rejected'?'Rejeitado':(m.status==='confirmed'?'Confirmado':'Pendente'))+(m.type==='delivery'&&m.status==='confirmed'&&m.beneficiaryConfirmationRequired&&!m.beneficiaryConfirmed?' · Aguarda beneficiário':'')+'</span></div><div style="text-align:right"><b>'+money(m.amount)+'</b>'+(m.status==='pending'?(m.type==='withdrawal'&&g.settings.withdrawalApproval!=='manager'?'<button class="x-btn alt" data-vote="'+m.id+'" style="display:block;margin-top:6px;padding:7px 9px">Registar voto</button>':'<button class="x-btn alt" data-confirm="'+m.id+'" style="display:block;margin-top:6px;padding:7px 9px">Confirmar</button>'):'')+(m.type==='delivery'&&m.status==='confirmed'&&m.beneficiaryConfirmationRequired&&!m.beneficiaryConfirmed?'<button class="x-btn alt" data-beneficiary="'+m.id+'" style="display:block;margin-top:6px;padding:7px 9px">Confirmar beneficiário</button>':'')+'</div></div>'}).join(''):'<div class="x-empty">Sem movimentos registados.</div>')+'</div><p class="x-note">Os totais consideram apenas contribuições e saídas confirmadas. Esta versão inicial não processa transferências nem substitui comprovativos externos.</p>';
}
function confirmMovement(movementId){
 var g=group(active);if(!g)return;
 var m=g.movements.find(function(x){return x.id===movementId});
 if(!m||m.status==='confirmed')return;
 if(!confirm('Confirmar este movimento?'))return;
 m.status='confirmed';m.confirmedAt=new Date().toISOString();
 g.audit.push({at:m.confirmedAt,action:'movement_confirmed',movementId:m.id,amount:m.amount});
 save();render();
}
function form(title,fields,action){var root=document.getElementById('xContent');root.innerHTML=head(title,true)+'<form id="xForm">'+fields+'<button class="x-btn" type="submit">Guardar</button></form>';document.getElementById('xForm').onsubmit=function(e){e.preventDefault();var fd=new FormData(e.target);action(fd)}}
function backupHistory(){
 try{var a=JSON.parse(localStorage.getItem('payoff_xitique_backups_v1')||'[]');return Array.isArray(a)?a:[]}catch(e){return []}
}
function downloadBackup(){
 var payload={format:'payoff-xitique-backup',version:1,exportedAt:new Date().toISOString(),data:data};
 var json=JSON.stringify(payload,null,2),name='payoff-xitique-backup-'+new Date().toISOString().slice(0,10)+'.json';
 var native=window.DividasNative,FS=native&&native.Filesystem,SH=native&&native.Share,DIR=native&&native.Directory;
 if(FS&&SH&&DIR){
  FS.writeFile({path:name,data:btoa(unescape(encodeURIComponent(json))),directory:DIR.Cache,recursive:true})
   .then(function(file){return SH.share({title:name,text:'Cópia de segurança do Xitique.',url:file.uri,dialogTitle:'Guardar cópia do Xitique'})})
   .catch(function(e){console.warn('Exportação nativa Xitique:',e);alert('Não foi possível partilhar a cópia neste dispositivo.')});
  return;
 }
 try{
  var blob=new Blob([json],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},1500);
  alert('Cópia de segurança preparada. Verifica a pasta de transferências do dispositivo.');
 }catch(e){alert('Não foi possível exportar a cópia neste dispositivo.')}
}
function restoreBackup(file){
 if(!file)return;
 var reader=new FileReader();
 reader.onload=function(){
  try{
   var parsed=JSON.parse(String(reader.result||''));
   var restored=parsed&&parsed.format==='payoff-xitique-backup'?parsed.data:parsed;
   if(!restored||!Array.isArray(restored.groups))throw new Error('Formato inválido');
   var groupsCount=restored.groups.length,movesCount=restored.groups.reduce(function(a,g){return a+(Array.isArray(g.movements)?g.movements.length:0)},0);
   if(!confirm('Pré-visualização da cópia: '+groupsCount+' grupo(s), '+movesCount+' movimento(s). Os dados atuais serão guardados antes de restaurar. Continuar?'))return;
   save();
   data={groups:restored.groups};
   save();
   active=null;render();
   alert('Cópia restaurada com sucesso.');
  }catch(e){alert('Ficheiro inválido ou incompatível. Os dados atuais foram mantidos.')}
 };
 reader.onerror=function(){alert('Não foi possível ler o ficheiro selecionado.')};
 reader.readAsText(file);
}
function backupScreen(){
 var list=backupHistory(),root=document.getElementById('xContent');
 root.innerHTML=head('Cópias de segurança',true)
 +'<div class="x-card"><b>Backup automático local</b><p class="x-muted">O Xitique guarda uma cópia após cada alteração importante neste dispositivo. As cópias locais são mantidas até 12 meses, com até 500 versões recentes.</p><p class="x-muted">Estas cópias não são enviadas para o Google Drive e não protegem contra perda ou avaria do telemóvel.</p></div>'
 +'<div class="x-card"><b>Exportar cópia manual</b><p class="x-muted">Guarda um ficheiro JSON que podes conservar noutro local.</p><button class="x-btn" data-x="export">Exportar agora</button></div>'
 +'<div class="x-card"><b>Restaurar cópia</b><p class="x-muted">Seleciona um ficheiro JSON exportado anteriormente pelo Xitique.</p><input class="x-field" type="file" id="xBackupFile" accept=".json,application/json"></div>'
 +'<div class="x-card"><b>Histórico local ('+list.length+')</b><div class="x-list" style="margin-top:10px">'+(list.length?list.slice().reverse().slice(0,8).map(function(b){return '<div class="x-item"><div class="x-main"><b>'+esc(new Date(b.createdAt).toLocaleString('pt-PT'))+'</b><span class="x-muted">Cópia automática</span></div></div>'}).join(''):'<span class="x-muted">Ainda não existem cópias automáticas.</span>')+'</div></div>';
 var input=document.getElementById('xBackupFile');
 input.addEventListener('change',function(){if(this.files&&this.files[0])restoreBackup(this.files[0])});
}
function newGroup(){form('Criar grupo','<label class="x-muted">Nome do grupo<input class="x-field" name="name" required maxlength="60" placeholder="Ex.: Xitique da família"></label><label class="x-muted">Modalidade<select class="x-field" name="mode"><option value="rotative">Rotativo</option><option value="accumulation">Acumulação</option></select></label><label class="x-muted">Contribuição prevista (MT)<input class="x-field" name="amount" type="number" min="0" step=".01" required></label><label class="x-muted">Objetivo (opcional, acumulação)<input class="x-field" name="goal" type="number" min="0" step=".01"></label>',function(f){var name=String(f.get('name')||'').trim(),amount=Number(f.get('amount')),mode=f.get('mode');if(!name||!Number.isFinite(amount)||amount<=0)return;var g={id:id(),name:name,mode:mode,amount:amount,goal:Number(f.get('goal'))||0,status:'Em preparação',members:[],movements:[],createdAt:new Date().toISOString(),audit:[],settings:{cycleDays:30,graceDays:0,fineType:'none',fineValue:0,fineCap:0,fineMode:'informative',contributionMode:'fixed',withdrawalApproval:'manager',orderMode:'manual',reminderDays:2,reminderFrequency:7,reminderChannel:'none'},rotationOrder:[],drawHistory:[]};data.groups.push(g);save();active=g.id;render()})}
function memberForm(){form('Adicionar participante','<button class="x-btn alt" type="button" data-x="pickContact">Escolher dos contactos do telemóvel</button><label class="x-muted">Nome<input class="x-field" name="name" required maxlength="80"></label><label class="x-muted">Telefone (opcional)<input class="x-field" name="phone" inputmode="tel" maxlength="30" placeholder="+258..."></label>',function(f){var g=group(active),name=String(f.get('name')||'').trim();if(!name)return;addMember(g,name,String(f.get('phone')||'').trim());render()})}
function addMember(g,name,phone){ensureGroup(g);var m={id:id(),name:name,phone:phone||'',joinedAt:new Date().toISOString(),status:'active'};g.members.push(m);g.rotationOrder.push(m.id);g.audit.push({at:new Date().toISOString(),action:'member_added',memberId:m.id,name:name});save();return m}
async function pickContact(){var C=window.DividasNative&&window.DividasNative.Contacts;if(!C||!C.pickContact){alert('A seleção de contactos só estará disponível na versão Android atualizada.');return}try{var c=await C.pickContact();if(!c||c.cancelled)return;var n=document.querySelector('#xForm [name="name"]'),p=document.querySelector('#xForm [name="phone"]');if(n)n.value=c.name||'';if(p)p.value=c.phoneNumber||''}catch(e){alert('Não foi possível selecionar o contacto: '+(e&&e.message?e.message:''))}}
function movement(type){var g=group(active),isOut=type==='withdrawal'||type==='delivery';form(type==='delivery'?'Registar entrega ao beneficiário':(isOut?'Registar levantamento':'Registar contribuição'),'<label class="x-muted">Participante<select class="x-field" name="member" required><option value="">Selecionar</option>'+g.members.map(function(m){return '<option value="'+m.id+'">'+esc(m.name)+'</option>'}).join('')+'</select></label><label class="x-muted">Valor (MT)<input class="x-field" name="amount" type="number" min=".01" step=".01" value="'+(type==='contribution'&&g.settings.contributionMode==='fixed'?g.amount:'')+'" '+(type==='contribution'&&g.settings.contributionMode==='fixed'?'readonly':'')+' required></label><label class="x-muted">Data<input class="x-field" name="date" type="date" value="'+new Date().toISOString().slice(0,10)+'" required></label>'+(type==='contribution'?'<label class="x-muted">Data limite da contribuição (opcional)<input class="x-field" name="dueDate" type="date"></label>':'')+'<label class="x-muted">Nota (opcional)<input class="x-field" name="note" maxlength="180"></label><label class="x-muted"><input type="checkbox" name="confirmed" checked> Confirmado pelo gestor</label>'+(type==='delivery'?'<label class="x-muted"><input type="checkbox" name="beneficiaryConfirmationRequired"> Pedir confirmação do beneficiário</label><label class="x-muted"><input type="checkbox" name="beneficiaryConfirmed"> Beneficiário já confirmou a receção</label>':'')+'',function(f){var amount=Number(f.get('amount')),m=g.members.find(function(x){return x.id===f.get('member')});if(!m||!Number.isFinite(amount)||amount<=0)return;if(isOut&&amount>Math.max(0,sum(g)-spent(g))){alert('O valor excede o saldo disponível confirmado.');return}var item={id:id(),type:type==='delivery'?'delivery':(type==='withdrawal'?'withdrawal':'contribution'),memberId:m.id,label:(type==='delivery'?'Entrega — ':(isOut?'Levantamento — ':'Contribuição — '))+m.name,amount:amount,date:String(f.get('date')),dueDate:String(f.get('dueDate')||''),beneficiaryConfirmationRequired:type==='delivery'&&!!f.get('beneficiaryConfirmationRequired'),beneficiaryConfirmed:type==='delivery'&&!!f.get('beneficiaryConfirmed'),note:String(f.get('note')||''),status:f.get('confirmed')?'confirmed':'pending',createdAt:new Date().toISOString()};g.movements.push(item);g.audit.push({at:item.createdAt,action:item.type,amount:amount,member:m.name});save();render()})}

function groupSettings(){
 var g=group(active);if(!g)return;ensureGroup(g);var q=g.settings;
 form('Regras do grupo',
 '<label class="x-muted">Estado do grupo<select class="x-field" name="groupStatus"><option value="Em preparação">Em preparação</option><option value="Ativo">Ativo</option><option value="Pausado">Pausado</option><option value="Encerrado">Encerrado</option></select></label>'+
 '<label class="x-muted">Periodicidade do ciclo (dias)<input class="x-field" name="cycleDays" type="number" min="1" max="365" value="'+q.cycleDays+'"></label>'+
 '<label class="x-muted">Dias de tolerância antes de atraso<input class="x-field" name="graceDays" type="number" min="0" max="90" value="'+q.graceDays+'"></label>'+
 '<label class="x-muted">Regra de multa<select class="x-field" name="fineType"><option value="none">Sem multa</option><option value="fixed">Valor fixo por atraso</option><option value="percent">Percentagem da contribuição</option><option value="daily">Valor fixo por dia</option></select></label>'+
 '<label class="x-muted">Valor / percentagem da multa<input class="x-field" name="fineValue" type="number" min="0" step=".01" value="'+q.fineValue+'"></label>'+
 '<label class="x-muted">Limite máximo da multa (0 = sem limite)<input class="x-field" name="fineCap" type="number" min="0" step=".01" value="'+q.fineCap+'"></label>'+
 '<label class="x-muted">Aplicação da multa<select class="x-field" name="fineMode"><option value="informative">Apenas informativa</option><option value="manual">Aplicação manual pelo gestor</option><option value="automatic">Cálculo automático</option></select></label>'+
 '<label class="x-muted">Contribuições<select class="x-field" name="contributionMode"><option value="fixed">Valor fixo</option><option value="variable">Valor variável</option></select></label>'+
 '<label class="x-muted">Aprovação de levantamentos<select class="x-field" name="withdrawalApproval"><option value="manager">Só gestor</option><option value="majority">Maioria dos participantes</option><option value="unanimous">Unanimidade</option></select></label>'+
 '<label class="x-muted">Lembretes<select class="x-field" name="reminderChannel"><option value="none">Desativados</option><option value="whatsapp">WhatsApp (preparar mensagem)</option><option value="sms">SMS (preparar mensagem)</option></select></label>'+
 '<label class="x-muted">Antecedência do lembrete (dias)<input class="x-field" name="reminderDays" type="number" min="0" max="30" value="'+q.reminderDays+'"></label>'+
 '<label class="x-muted">Intervalo de lembretes em atraso (dias)<input class="x-field" name="reminderFrequency" type="number" min="1" max="30" value="'+q.reminderFrequency+'"></label>',
 function(f){g.status=String(f.get('groupStatus')||'Em preparação');q.cycleDays=Math.max(1,Number(f.get('cycleDays'))||30);q.graceDays=Math.max(0,Number(f.get('graceDays'))||0);q.fineType=String(f.get('fineType')||'none');q.fineValue=Math.max(0,Number(f.get('fineValue'))||0);q.fineCap=Math.max(0,Number(f.get('fineCap'))||0);q.fineMode=String(f.get('fineMode')||'informative');q.contributionMode=String(f.get('contributionMode')||'fixed');q.withdrawalApproval=String(f.get('withdrawalApproval')||'manager');q.reminderChannel=String(f.get('reminderChannel')||'none');q.reminderDays=Math.max(0,Number(f.get('reminderDays'))||0);q.reminderFrequency=Math.max(1,Number(f.get('reminderFrequency'))||7);g.audit.push({at:new Date().toISOString(),action:'group_settings_updated'});save();render();});
 var formEl=document.getElementById('xForm');if(formEl){formEl.elements.groupStatus.value=g.status||'Em preparação';formEl.elements.fineType.value=q.fineType;formEl.elements.fineMode.value=q.fineMode;formEl.elements.contributionMode.value=q.contributionMode;formEl.elements.withdrawalApproval.value=q.withdrawalApproval;formEl.elements.reminderChannel.value=q.reminderChannel;}
}
function rotationScreenDraw(){var g=group(active);if(!g)return;ensureGroup(g);var pool=g.members.filter(function(m){return m.status!=='removed'});if(!pool.length){alert('Adiciona participantes antes do sorteio.');return}var a=pool.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}g.rotationOrder=a.map(function(m){return m.id});var winner=a[0];var rec={at:new Date().toISOString(),winnerId:winner.id,winnerName:winner.name,order:g.rotationOrder.slice(),method:'random'};g.drawHistory.push(rec);g.audit.push({at:rec.at,action:'beneficiary_drawn',winnerId:winner.id,winnerName:winner.name,order:rec.order});save();rotationScreen();alert('Sorteio registado. Beneficiário: '+winner.name)}
function rotationScreen(){
 var g=group(active);if(!g)return;ensureGroup(g);
 function draw(){var pool=g.members.filter(function(m){return m.status!=='removed'});if(!pool.length){alert('Adiciona participantes antes do sorteio.');return}var a=pool.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}g.rotationOrder=a.map(function(m){return m.id});var winner=a[0];var rec={at:new Date().toISOString(),winnerId:winner.id,winnerName:winner.name,order:g.rotationOrder.slice(),method:'random'};g.drawHistory.push(rec);g.audit.push({at:rec.at,action:'beneficiary_drawn',winnerId:winner.id,winnerName:winner.name,order:rec.order});save();rotationScreen();alert('Sorteio registado. Beneficiário: '+winner.name);}
 function move(i,d){var j=i+d;if(j<0||j>=g.rotationOrder.length)return;var t=g.rotationOrder[i];g.rotationOrder[i]=g.rotationOrder[j];g.rotationOrder[j]=t;g.audit.push({at:new Date().toISOString(),action:'rotation_order_changed'});save();rotationScreen()}
 var html=head('Ordem dos beneficiários',true)+'<p class="x-muted">A ordem é guardada no histórico. O sorteio é registado para consulta posterior.</p><div class="x-card"><b>Ordem atual</b><div class="x-list" style="margin-top:10px">'+g.rotationOrder.map(function(mid,i){var m=g.members.find(function(x){return x.id===mid});if(!m)return '';return '<div class="x-item"><div class="x-main"><b>'+(i+1)+'. '+esc(m.name)+'</b></div><button class="x-btn alt" data-up="'+i+'">↑</button><button class="x-btn alt" data-down="'+i+'">↓</button></div>'}).join('')+'</div><div class="x-actions"><button class="x-btn" data-x="draw">Sortear ordem</button></div></div><div class="x-card"><b>Histórico de sorteios</b>'+(g.drawHistory.length?g.drawHistory.slice().reverse().map(function(d){return '<p class="x-muted">'+esc(d.at)+' · Beneficiário: <b>'+esc(d.winnerName)+'</b></p>'}).join(''):'<p class="x-muted">Ainda não houve sorteios.</p>')+'</div>';
 document.getElementById('xContent').innerHTML=html;
 document.getElementById('xContent').querySelectorAll('[data-up]').forEach(function(b){b.onclick=function(){move(Number(b.dataset.up),-1)}});
 document.getElementById('xContent').querySelectorAll('[data-down]').forEach(function(b){b.onclick=function(){move(Number(b.dataset.down),1)}});
}



function voteMovement(movementId){
 var g=group(active);if(!g)return;ensureGroup(g);var m=g.movements.find(function(x){return x.id===movementId});if(!m||m.status!=='pending')return;
 var activeMembers=g.members.filter(function(x){return x.status!=='removed'});if(!activeMembers.length)return;
 var promptList=activeMembers.map(function(x,i){return (i+1)+'. '+x.name}).join('\n');
 var choice=prompt('Registar voto recebido de que participante?\n'+promptList+'\nIndica o número:','1');if(choice===null)return;
 var member=activeMembers[Number(choice)-1];if(!member){alert('Participante inválido.');return}
 m.votes=Array.isArray(m.votes)?m.votes:[];if(m.votes.some(function(v){return v.memberId===member.id})){alert('Este participante já tem um voto registado.');return}
 var vote=confirm('O voto de '+member.name+' é FAVORÁVEL?\nOK = Sim · Cancelar = Não');
 m.votes.push({memberId:member.id,memberName:member.name,approved:vote,at:new Date().toISOString()});
 var yes=m.votes.filter(function(v){return v.approved}).length,no=m.votes.length-yes,required=g.settings.withdrawalApproval==='unanimous'?activeMembers.length:Math.floor(activeMembers.length/2)+1;
 if(yes>=required){m.status='confirmed';m.confirmedAt=new Date().toISOString()}
 else if(no>activeMembers.length-required){m.status='rejected';m.rejectedAt=new Date().toISOString()}
 g.audit.push({at:new Date().toISOString(),action:'withdrawal_vote_recorded',movementId:m.id,memberId:member.id,approved:vote,yes:yes,no:no});
 save();render();
}
function confirmBeneficiary(movementId){
 var g=group(active);if(!g)return;var m=g.movements.find(function(x){return x.id===movementId});if(!m||m.type!=='delivery'||!m.beneficiaryConfirmationRequired||m.beneficiaryConfirmed)return;
 if(!confirm('Confirmas que o beneficiário '+m.label.replace('Entrega — ','')+' confirmou a receção?'))return;
 m.beneficiaryConfirmed=true;m.beneficiaryConfirmedAt=new Date().toISOString();g.audit.push({at:m.beneficiaryConfirmedAt,action:'beneficiary_confirmed',movementId:m.id});save();render();
}

function exitMember(memberId){
 var g=group(active);if(!g)return;ensureGroup(g);
 var m=g.members.find(function(x){return x.id===memberId});if(!m||m.status==='removed')return;
 var who=prompt('Quem iniciou a saída?\n1 — Pedido do participante\n2 — Iniciativa do gestor','1');if(who===null)return;
 var reason=prompt('Motivo da saída (opcional):','');if(reason===null)return;
 if(!confirm('Registar a saída de '+m.name+'? O histórico financeiro será preservado.'))return;
 m.status='removed';m.leftAt=new Date().toISOString();m.exitInitiatedBy=who==='2'?'manager':'participant';m.exitReason=reason;
 g.rotationOrder=g.rotationOrder.filter(function(idv){return idv!==m.id});
 g.audit.push({at:m.leftAt,action:'member_exit',memberId:m.id,name:m.name,initiatedBy:m.exitInitiatedBy,reason:reason});
 if(confirm('Queres adicionar um substituto? O novo participante começará sem herdar movimentos ou saldos anteriores.')){
  var name=prompt('Nome do novo participante:','');if(name&&name.trim()){var phone=prompt('Telefone do novo participante (opcional):','')||'';addMember(g,name.trim(),phone.trim());}
 }
 save();render();
}


function xitiqueNotificationId(value){var h=0;String(value).split('').forEach(function(c){h=((h*31)+c.charCodeAt(0))|0});return 120000000+(Math.abs(h)%700000000)}
async function refreshXitiqueNotifications(requestPermission){
 var L=window.DividasNative&&window.DividasNative.LocalNotifications;if(!L)return;
 try{
  var permission=await L.checkPermissions();
  if(requestPermission&&permission.display!=='granted')permission=await L.requestPermissions();
  if(permission.display!=='granted')return;
  var key='payoff_xitique_notification_ids',old=[];try{old=JSON.parse(localStorage.getItem(key)||'[]')}catch(e){}
  if(old.length)await L.cancel({notifications:old.map(function(idv){return {id:idv}})});
  var notifications=[],ids=[];
  data.groups.forEach(function(g){ensureGroup(g);g.movements.forEach(function(m){
   if(m.type!=='contribution'||m.status==='confirmed'||!m.dueDate)return;
   var due=new Date(m.dueDate+'T09:00:00');if(!Number.isFinite(due.getTime()))return;
   var now=new Date(),lead=Math.max(0,Number(g.settings.reminderDays)||0),base=new Date(due.getTime()-lead*86400000);if(base<=now)base=new Date(now.getTime()+60000);var step=Math.max(1,Number(g.settings.reminderFrequency)||7);
   for(var n=0;n<4;n++){var at=new Date(base.getTime()+n*step*86400000),id=xitiqueNotificationId(m.id+':'+n);ids.push(id);notifications.push({id:id,title:'Xitique — contribuição pendente',body:g.name+': '+m.label+' · '+money(m.amount),schedule:{at:at}})}
  })});
  if(notifications.length)await L.schedule({notifications:notifications});
  localStorage.setItem(key,JSON.stringify(ids));
 }catch(e){console.warn('Notificações Xitique:',e)}
}

function estimatedFine(m,g){
 var q=g.settings||{},due=m.dueDate;if(!due||q.fineType==='none'||!q.fineValue)return 0;
 var days=Math.max(0,Math.floor((Date.now()-new Date(due+'T23:59:59').getTime())/86400000)-Math.max(0,Number(q.graceDays)||0));
 if(!days)return 0;var fee=q.fineType==='percent'?m.amount*Number(q.fineValue)/100:(q.fineType==='daily'?days*Number(q.fineValue):Number(q.fineValue));
 if(q.fineType==='fixed')fee=Number(q.fineValue);
 if(Number(q.fineCap)>0)fee=Math.min(fee,Number(q.fineCap));return Math.max(0,fee);
}

function reportScreen(){
 var g=group(active);if(!g)return;ensureGroup(g);var received=sum(g),out=spent(g),pending=g.movements.filter(function(m){return m.status==='pending'}),fineTotal=g.movements.filter(function(m){return m.type==='contribution'&&m.status!=='confirmed'}).reduce(function(a,m){return a+estimatedFine(m,g)},0),rows=g.members.map(function(m){var paid=g.movements.filter(function(x){return x.memberId===m.id&&x.type==='contribution'&&x.status==='confirmed'}).reduce(function(a,x){return a+x.amount},0);return '<div class="x-item"><div class="x-main"><b>'+esc(m.name)+'</b><span class="x-muted">Contribuições confirmadas: '+money(paid)+' · Multa estimada: '+money(g.movements.filter(function(x){return x.memberId===m.id&&x.type==='contribution'&&x.status!=='confirmed'}).reduce(function(a,x){return a+estimatedFine(x,g)},0))+'</span></div><button class="x-btn alt" data-remind="'+m.id+'">Lembrar</button></div>'}).join('');
 var csv=['Participante,Telefone,Contribuições confirmadas'];g.members.forEach(function(m){var paid=g.movements.filter(function(x){return x.memberId===m.id&&x.type==='contribution'&&x.status==='confirmed'}).reduce(function(a,x){return a+x.amount},0);csv.push('"'+String(m.name).replace(/"/g,'""')+'","'+String(m.phone||'').replace(/"/g,'""')+'",'+paid)});
 document.getElementById('xContent').innerHTML=head('Relatório do grupo',true)+'<div class="x-card"><b>Resumo financeiro</b><div class="x-total">'+money(received-out)+'</div><p class="x-muted">Contribuições confirmadas: '+money(received)+'<br>Saídas confirmadas: '+money(out)+'<br>Movimentos pendentes: '+pending.length+'<br>Multas estimadas (não recebidas): '+money(fineTotal)+'</p><button class="x-btn" data-x="csv">Exportar CSV</button></div><div class="x-card"><b>Participantes</b><div class="x-list" style="margin-top:10px">'+rows+'</div></div><div class="x-card"><b>Histórico recente</b>'+g.audit.slice().reverse().slice(0,30).map(function(a){return '<p class="x-muted">'+esc(a.at)+' · '+esc(a.action)+'</p>'}).join('')+'</div>';
 window.__xitiqueCsv=csv.join('\n');
}
function sendReminder(memberId){var g=group(active);if(!g)return;var m=g.members.find(function(x){return x.id===memberId});if(!m||!m.phone){alert('Este participante não tem telefone registado.');return}var channel=g.settings.reminderChannel;if(channel==='none'){channel=confirm('Enviar pelo WhatsApp? Escolhe Cancelar para abrir SMS.')?'whatsapp':'sms'}var msg='Olá '+m.name+', este é um lembrete do grupo '+g.name+' do Xitique. Por favor, confirma a tua contribuição com o gestor.';var A=window.DividasNative&&window.DividasNative.MessageActions;if(A&&channel==='whatsapp')A.openWhatsApp({phone:m.phone,message:msg}).catch(function(e){alert(e.message||'Não foi possível abrir WhatsApp.')});else if(A)A.openSms({phone:m.phone,message:msg}).catch(function(e){alert(e.message||'Não foi possível abrir SMS.')});else{var url=channel==='whatsapp'?'https://wa.me/'+m.phone.replace(/\D/g,'')+'?text='+encodeURIComponent(msg):'sms:'+m.phone+'?body='+encodeURIComponent(msg);window.open(url,'_blank')}}
function exportReport(){var blob=new Blob(['\ufeff'+(window.__xitiqueCsv||'')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='xitique-relatorio.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},1000)}
function dailyBackup(){try{var list=backupHistory(),day=new Date().toISOString().slice(0,10);if(!list.some(function(b){return b&&b.reason==='diaria'&&String(b.createdAt||'').slice(0,10)===day})){list.push({createdAt:new Date().toISOString(),reason:'diaria',data:JSON.parse(JSON.stringify(data))});list=list.filter(function(b){return b&&b.createdAt&&Date.now()-new Date(b.createdAt).getTime()<365*24*60*60*1000});if(list.length>500)list=list.slice(-500);localStorage.setItem('payoff_xitique_backups_v1',JSON.stringify(list))}}catch(e){console.warn('Backup diário Xitique:',e)}}

document.addEventListener('click',function(e){var b=e.target.closest('[data-x],[data-open],[data-confirm],[data-up],[data-down],[data-remind],[data-exit],[data-vote],[data-beneficiary]');if(!b)return;if(b.dataset.confirm){confirmMovement(b.dataset.confirm);return}if(b.dataset.exit){exitMember(b.dataset.exit);return}if(b.dataset.vote){voteMovement(b.dataset.vote);return}if(b.dataset.beneficiary){confirmBeneficiary(b.dataset.beneficiary);return}if(b.dataset.remind){sendReminder(b.dataset.remind);return}if(b.dataset.up||b.dataset.down)return;if(b.dataset.open){active=b.dataset.open;render();return}var a=b.dataset.x;if(a==='close')close();else if(a==='home'){active=null;render()}else if(a==='backups')backupScreen();else if(a==='export')downloadBackup();else if(a==='settings')groupSettings();else if(a==='rotation')rotationScreen();else if(a==='draw')rotationScreenDraw();else if(a==='report')reportScreen();else if(a==='csv')exportReport();else if(a==='notify')refreshXitiqueNotifications(true).then(function(){alert('Lembretes locais do Xitique atualizados. Verifica se as notificações estão autorizadas no Android.')});else if(a==='pickContact')pickContact();else if(a==='delivery')movement('delivery');else if(a==='new')newGroup();else if(a==='member')memberForm();else if(a==='contribution')movement('contribution');else if(a==='withdrawal')movement('withdrawal')});
dailyBackup();
document.addEventListener('DOMContentLoaded',function(){dailyBackup();var entry=document.getElementById('guideSettingsEntry');if(!entry||document.getElementById('xitiqueSettingsEntry'))return;var box=document.createElement('div');box.className='grp';box.id='xitiqueSettingsEntry';box.innerHTML='<label>Grupos de Xitique</label><div class="acts"><button class="btn" id="openXitique" type="button">Abrir Xitique</button></div>';entry.parentNode.insertBefore(box,entry);document.getElementById('openXitique').addEventListener('click',open)});
window.PayoffXitique={open:open,getData:function(){return JSON.parse(JSON.stringify(data))}};
})();