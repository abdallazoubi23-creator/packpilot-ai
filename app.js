const state={selected:null,quoteCreated:false,clarity:null,audit:null};
function $(id){return document.getElementById(id)}
function num(id){return Math.max(0,parseFloat($(id).value)||0)}
function money(x){return '$'+x.toLocaleString(undefined,{maximumFractionDigits:0})}
function go(n){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));$('s'+n).classList.add('active');document.querySelectorAll('.progress').forEach(p=>{const step=+p.dataset.step;p.innerHTML='';for(let i=1;i<=7;i++){const s=document.createElement('span');if(i<=step)s.className='on';p.appendChild(s)}});window.scrollTo({top:0,behavior:'smooth'})}
function calculateAudit(){
  const p=[num('pL'),num('pW'),num('pH')], b=[num('bL'),num('bW'),num('bH')], weight=num('weight');
  if(p.some(v=>v<=0)||b.some(v=>v<=0)||weight<=0){alert('Please enter positive product, box and weight values.');return}
  const pv=p.reduce((a,v)=>a*v,1), bv=b.reduce((a,v)=>a*v,1), voidR=Math.max(0,1-pv/bv);
  const frag=$('fragility').value, pad=frag==='high'?2:frag==='medium'?1.25:.75;
  const dims=p.map(v=>v+2*pad), sv=dims.reduce((a,v)=>a*v,1);
  const divisor=5000, currentDim=bv/divisor, suggestedDim=sv/divisor;
  const currentCharge=Math.max(weight,currentDim), suggestedCharge=Math.max(weight,suggestedDim);
  const shipReduction=Math.max(0,1-suggestedCharge/currentCharge);
  const volumeReduction=Math.max(0,1-sv/bv);
  const currentMat=num('materialCost'), shipCost=num('shippingCost'), monthly=num('monthlyOrders');
  const matReduction=Math.min(.30,volumeReduction*.28);
  const lowerPer=currentMat*matReduction + shipCost*shipReduction*.35;
  const upperPer=currentMat*Math.min(.38,matReduction+.06) + shipCost*shipReduction*.65;
  const lower=lowerPer*monthly, upper=upperPer*monthly;
  state.audit={p,b,pv,bv,voidR,frag,pad,dims,sv,currentDim,suggestedDim,currentCharge,suggestedCharge,shipReduction,volumeReduction,currentMat,shipCost,monthly,lower,upper};
  $('voidRatio').textContent=(voidR*100).toFixed(1)+'%';
  $('voidExplain').textContent=`Product volume is ${pv.toFixed(0)} cm3 inside a ${bv.toFixed(0)} cm3 package. Empty volume alone does not prove the package is wrong; protection requirements must be reviewed.`;
  const delta=Math.max(0,currentCharge-suggestedCharge);$('dimDelta').textContent=delta.toFixed(2)+' kg';
  $('dimExplain').textContent=`Illustrative chargeable weight changes from ${currentCharge.toFixed(2)} kg to ${suggestedCharge.toFixed(2)} kg using a 5,000 cm3/kg divisor.`;
  $('observedIssue').textContent=voidR>.75?'Large volume gap: test whether protection can be maintained in a smaller package.':voidR>.45?'Moderate volume gap: compare material, protection and carrier effects.':'Package appears relatively tight; focus on damage, material or sourcing instead of size alone.';
  $('protectionRule').textContent=frag==='high'?`High fragility adds ${pad} cm padding on each side and requires human/supplier review.`:frag==='medium'?`Medium fragility adds ${pad} cm padding on each side.`:`Low fragility adds ${pad} cm handling allowance on each side.`;
  $('monthlyOpportunity').textContent=money(lower)+' - '+money(upper);
  go(5)
}
function buildOption(name,type,protection,costFactor,shipFactor,eco,recommended){
  const a=state.audit; const dims=a.dims.map((d,i)=>d*(type==='protection'?1.12:type==='eco'?1.04:1));
  const vol=dims.reduce((x,v)=>x*v,1); const dimW=vol/5000; const charge=Math.max(num('weight'),dimW);
  const mat=Math.max(.1,a.currentMat*(1-costFactor));
  const per=Math.max(0,a.currentMat-mat)+Math.max(0,a.currentCharge-charge)/Math.max(.01,a.currentCharge)*a.shipCost*shipFactor;
  const monthly=per*a.monthly;
  return {name,type,protection,dims,dimW,charge,mat,monthly,eco,recommended};
}
function renderOptions(){
  if(!state.audit){calculateAudit();return}
  const opts=[
    buildOption('Option A - Cost focus','cost','Medium',.22,.45,'B+',false),
    buildOption('Option B - Protection focus','protection','High',.10,.30,'B',state.audit.frag==='high'),
    buildOption('Option C - Eco focus','eco',state.audit.frag==='high'?'High':'Medium',.15,.35,'A-',state.audit.frag!=='high')
  ]; state.options=opts; $('options').innerHTML=''; state.selected=null; $('continueOption').disabled=true;
  opts.forEach((o,i)=>{
    const el=document.createElement('div');el.className='card option'+(o.recommended?' recommended':'');
    el.innerHTML=`${o.recommended?'<div class="ribbon">START HERE</div>':''}<h3>${o.name}</h3><div class="price">${money(o.monthly)}<span class="tiny">/mo illustrative</span></div><div><span class="pill">${o.dims.map(v=>v.toFixed(1)).join(' x ')} cm</span><span class="pill rose">Protection ${o.protection}</span><span class="pill amber">Eco ${o.eco}</span></div><ul><li>Estimated material cost: $${o.mat.toFixed(2)} per unit</li><li>Illustrative dimensional weight: ${o.dimW.toFixed(2)} kg</li><li>Requires supplier availability and safety review</li></ul><div class="assumptions">This is a scenario, not a quote or guaranteed saving.</div><div class="actions"><button class="btn secondary" onclick="selectOption(${i},this)">Select this option</button></div>`;
    $('options').appendChild(el)
  })
}
function selectOption(i,button){state.selected=state.options[i];document.querySelectorAll('.option').forEach(x=>x.style.boxShadow='');button.closest('.option').style.boxShadow='0 0 0 4px rgba(44,153,141,.18)';$('continueOption').disabled=false;$('evidenceOption').textContent=state.selected.name;renderQuote()}
function renderQuote(){if(!state.selected)return;const o=state.selected;$('quoteQty').value=num('monthlyOrders');$('quoteSummary').innerHTML=`<h2>Prototype request summary</h2><div class="metric"><span>Seller segment</span><b>${$('platform').value}, ${num('monthlyOrders').toLocaleString()} orders/mo</b></div><div class="metric"><span>Product</span><b>${$('productName').value}</b></div><div class="metric"><span>Selected concept</span><b>${o.name}</b></div><div class="metric"><span>Target size</span><b>${o.dims.map(v=>v.toFixed(1)).join(' x ')} cm</b></div><div class="metric"><span>Protection target</span><b>${o.protection}</b></div><div class="metric"><span>Monthly quantity</span><b>${num('monthlyOrders').toLocaleString()}</b></div><p class="tiny">A live concierge pilot would review this request and manually contact suitable suppliers.</p>`}
function submitQuote(){if($('permission').value!=='yes'){alert('Without permission, the prototype records interest but cannot create a supplier request.');state.quoteCreated=false;$('evidenceQuote').textContent='Interest only'}else{state.quoteCreated=true;$('evidenceQuote').textContent='Created';alert('Prototype quote request created. No data was sent.')}go(8)}
function initScores(){const box=$('clarityScores');box.innerHTML='';for(let i=1;i<=5;i++){const b=document.createElement('button');b.textContent=i;b.onclick=()=>{state.clarity=i;box.querySelectorAll('button').forEach(x=>x.classList.remove('selected'));b.classList.add('selected')};box.appendChild(b)}}
function finish(){const price=$('priceChoice').value;$('evidencePrice').textContent=price;if(!state.clarity){alert('Please select a clarity score.');return}const a=state.audit,o=state.selected;$('finalSummary').innerHTML=`<h2>Experiment record</h2><div class="metric"><span>Segment</span><b>${$('category').value}; ${num('monthlyOrders').toLocaleString()} orders/mo</b></div><div class="metric"><span>SKU</span><b>${$('productName').value}</b></div><div class="metric"><span>Selected option</span><b>${o?o.name:'None'}</b></div><div class="metric"><span>Quote action</span><b>${state.quoteCreated?'Created':'Not created'}</b></div><div class="metric"><span>Clarity</span><b>${state.clarity}/5</b></div><div class="metric"><span>Price response</span><b>${price}</b></div><div class="metric"><span>Next action</span><b>${$('nextAction').value}</b></div><p><b>Illustrative opportunity:</b> ${money(a.lower)} - ${money(a.upper)} per month, subject to all displayed assumptions.</p><p><b>Open feedback:</b> ${$('feedback').value||'No comment provided.'}</p>`;go(9)}
function restart(){location.reload()}
initScores();go(1);