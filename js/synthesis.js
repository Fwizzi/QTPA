/* === SYNTHESIS v0.3.6 - Radar SVG + panneau detail === */
import { S, synFilters } from './state.js';
import { escapeHtml } from './utils.js';

const SHORT = {
  'Protocole':'Proto.','Jeu Passif':'Passif','Reprise de dribble':'R.drib.',
  'Continuité':'Contin.','Communication':'Comm.','Déplacement':'Déplac.',
  "Zone d'influence":"Z.infl.",'Gestion du sifflet':'Sifflet','Placement':'Placem.', 'Exécution du Jet' : 'EJ', 'Passage en Force' : 'PF', 'Mauvais Bloc' : 'MB', 'Jet Franc' : 'JF'
};
/* v0.3.24 (FRAG-3) : sn() échappe son retour pour sécuriser toutes les
   injections dans le SVG et le HTML du panneau détail (les noms de
   catégorie sont des constantes mais on échappe par sécurité défensive). */
function sn(c){return escapeHtml(SHORT[c]||c);}

const A1C='#18CCA5',A2C='#EDCF00',CR='#C82D2D',CG='#3BA711';
const FA1='rgba(24,95,165,0.10)',FA2='rgba(186,117,23,0.08)';
const RAD=150,CX=230,CY=230,SVG=500,LR=RAD+35,RVR=RAD*0.65;

export function setSynFilter(k,v){
  synFilters[k]=v;
  document.querySelectorAll('.syn-fb').forEach(b=>{
    var id=b.id; if(!id)return;
    var p=id.replace('sf','').split('-'); if(p.length<2)return;
    var m={arb:'arb',per:'per'}[p[0].toLowerCase()];
    if(m) b.classList.toggle('active',synFilters[m]===p.slice(1).join('-'));
  });
  buildSynTable();
}

export function buildSynTable(){
  var bA1=document.getElementById('sfArb-A1'),bA2=document.getElementById('sfArb-A2');
  if(bA1&&!bA1.dataset.labeled){bA1.textContent=S.a1;bA1.dataset.labeled='1';}
  if(bA2&&!bA2.dataset.labeled){bA2.textContent=S.a2;bA2.dataset.labeled='1';}

  var allObs=S.obs.filter(function(o){return synFilters.per==='all'||o.period===synFilters.per;});
  var oA1=allObs.filter(function(o){var a=Array.isArray(o.arb)?o.arb:[o.arb];return a.includes('A1');});
  var oA2=allObs.filter(function(o){var a=Array.isArray(o.arb)?o.arb:[o.arb];return a.includes('A2');});
  var sA1=_bs(oA1),sA2=_bs(oA2);

  var cats;
  if(synFilters.arb==='A1') cats=Object.keys(sA1);
  else if(synFilters.arb==='A2') cats=Object.keys(sA2);
  else cats=[...new Set([...Object.keys(sA1),...Object.keys(sA2)])];
  cats.sort(function(a,b){return((sA1[b]?sA1[b].total:0)+(sA2[b]?sA2[b].total:0))-((sA1[a]?sA1[a].total:0)+(sA2[a]?sA2[a].total:0));});

  var rEl=document.getElementById('synRadar'),dEl=document.getElementById('synDetail');
  if(!cats.length){rEl.innerHTML='<div style="text-align:center;color:var(--text-hint);padding:2rem;">Aucune observation</div>';dEl.innerHTML='';return;}

  var shA1=synFilters.arb==='all'||synFilters.arb==='A1';
  var shA2=synFilters.arb==='all'||synFilters.arb==='A2';
  var scA1=oA1.length?Math.round(oA1.filter(function(o){return o.col==='green';}).length/oA1.length*100):null;
  var scA2=oA2.length?Math.round(oA2.filter(function(o){return o.col==='green';}).length/oA2.length*100):null;

  var mx=Math.max.apply(null,cats.map(function(c){return(sA1[c]?sA1[c].total:0)+(sA2[c]?sA2[c].total:0);}));
  var mn=Math.min.apply(null,cats.map(function(c){return(sA1[c]?sA1[c].total:0)+(sA2[c]?sA2[c].total:0);}));
  function fs(c){var t=(sA1[c]?sA1[c].total:0)+(sA2[c]?sA2[c].total:0);return mx===mn?13:Math.round(9+(t-mn)/(mx-mn)*11);}

  var n=cats.length,st=2*Math.PI/n;
  function ag(i){return st*i-Math.PI/2;}
  function pl(i,p){var a=ag(i);return{x:+(CX+RAD*(p/100)*Math.cos(a)).toFixed(1),y:+(CY+RAD*(p/100)*Math.sin(a)).toFixed(1)};}
  function lp(i){var a=ag(i),x=+(CX+LR*Math.cos(a)).toFixed(1),y=+(CY+LR*Math.sin(a)).toFixed(1),c=Math.cos(a);return{x:x,y:y,a:Math.abs(c)<0.15?'middle':c>0?'start':'end'};}
  function rp(i){var a=ag(i),x=+(CX+RVR*Math.cos(a)).toFixed(1),y=+(CY+RVR*Math.sin(a)).toFixed(1),c=Math.cos(a);return{x:x,y:y,a:Math.abs(c)<0.15?'middle':c>0?'start':'end'};}

  var svg='<svg viewBox="0 0 '+SVG+' '+SVG+'" width="100%" style="max-width:500px;">';

  [37.5,75,112.5,150].forEach(function(r){svg+='<circle cx="'+CX+'" cy="'+CY+'" r="'+r+'" fill="none" stroke="#eae9e5" stroke-width="0.5"/>';});
  svg+='<text x="'+(CX+4)+'" y="'+(CY-RAD-3)+'" font-size="7" fill="#ccc">100%</text>';
  svg+='<text x="'+(CX+4)+'" y="'+(CY-RAD*0.75-3)+'" font-size="7" fill="#ccc">75%</text>';
  svg+='<text x="'+(CX+4)+'" y="'+(CY-RAD*0.5-3)+'" font-size="7" fill="#ccc">50%</text>';
  svg+='<text x="'+(CX+4)+'" y="'+(CY-RAD*0.25-3)+'" font-size="7" fill="#ccc">25%</text>';

  var i;
  for(i=0;i<n;i++){var p=pl(i,100);svg+='<line x1="'+CX+'" y1="'+CY+'" x2="'+p.x+'" y2="'+p.y+'" stroke="#e0e0dc" stroke-width="0.4"/>';}

  /* Polygone A1 */
  if(shA1){
    var pts=[];
    for(i=0;i<n;i++){var s=sA1[cats[i]];if(s){var pct=s.total>0?Math.round(s.g/s.total*100):0;var pt=pl(i,pct);pts.push(pt.x+','+pt.y);}}
    if(pts.length>=2) svg+='<polygon points="'+pts.join(' ')+'" fill="'+FA1+'" stroke="'+A1C+'" stroke-width="1.8"/>';
    for(i=0;i<n;i++){var s=sA1[cats[i]];if(s){var pct=s.total>0?Math.round(s.g/s.total*100):0;var pt=pl(i,pct);svg+='<circle cx="'+pt.x+'" cy="'+pt.y+'" r="3" fill="'+A1C+'"/>';}}
  }

  /* Polygone A2 */
  if(shA2){
    var pts=[];
    for(i=0;i<n;i++){var s=sA2[cats[i]];if(s){var pct=s.total>0?Math.round(s.g/s.total*100):0;var pt=pl(i,pct);pts.push(pt.x+','+pt.y);}}
    if(pts.length>=2) svg+='<polygon points="'+pts.join(' ')+'" fill="'+FA2+'" stroke="'+A2C+'" stroke-width="1.8" stroke-dasharray="5,3"/>';
    for(i=0;i<n;i++){var s=sA2[cats[i]];if(s){var pct=s.total>0?Math.round(s.g/s.total*100):0;var pt=pl(i,pct);svg+='<circle cx="'+pt.x+'" cy="'+pt.y+'" r="2.5" fill="'+A2C+'"/>';}}
  }

  /* Labels + compteurs R/V SUR les rayons */
  for(i=0;i<n;i++){
    var cat=cats[i],lbl=lp(i),rv=rp(i),f=fs(cat);
    var tot=(sA1[cat]?sA1[cat].total:0)+(sA2[cat]?sA2[cat].total:0);
    var fc=tot<=1?'var(--text-hint)':tot<=2?'var(--text-muted)':'var(--text-main)';
    svg+='<text x="'+lbl.x+'" y="'+lbl.y+'" text-anchor="'+lbl.a+'" font-size="'+f+'" font-weight="500" fill="'+fc+'">'+sn(cat)+'</text>';

    var s1=sA1[cat],s2=sA2[cat];
    var isL=rv.a==='end',isM=rv.a==='middle';
    var xB=isL?rv.x-42:(isM?rv.x-18:rv.x);
    var ly=rv.y;

    if(shA1&&s1){
      svg+='<rect x="'+xB+'" y="'+(ly-4)+'" width="4" height="4" rx="1" fill="'+A1C+'"/>';
      svg+='<text x="'+(xB+6)+'" y="'+ly+'" font-size="8" font-weight="500" fill="'+CR+'">'+s1.r+'R</text>';
      svg+='<text x="'+(xB+19)+'" y="'+ly+'" font-size="8" fill="var(--text-hint)">-</text>';
      svg+='<text x="'+(xB+24)+'" y="'+ly+'" font-size="8" font-weight="500" fill="'+CG+'">'+s1.g+'V</text>';
      ly+=10;
    }
    if(shA2&&s2){
      svg+='<rect x="'+xB+'" y="'+(ly-4)+'" width="4" height="4" rx="1" fill="'+A2C+'"/>';
      svg+='<text x="'+(xB+6)+'" y="'+ly+'" font-size="8" font-weight="500" fill="'+CR+'">'+s2.r+'R</text>';
      svg+='<text x="'+(xB+19)+'" y="'+ly+'" font-size="8" fill="var(--text-hint)">-</text>';
      svg+='<text x="'+(xB+24)+'" y="'+ly+'" font-size="8" font-weight="500" fill="'+CG+'">'+s2.g+'V</text>';
    }
  }

  /* Scores au centre */
  if(shA1&&shA2&&scA1!==null&&scA2!==null){
    svg+='<text x="'+(CX-16)+'" y="'+(CY-4)+'" text-anchor="end" font-size="22" font-weight="500" fill="'+A1C+'">'+scA1+'%</text>';
    svg+='<text x="'+(CX-16)+'" y="'+(CY+10)+'" text-anchor="end" font-size="9" fill="'+A1C+'">'+escapeHtml(S.a1)+'</text>';
    svg+='<text x="'+(CX+16)+'" y="'+(CY-4)+'" text-anchor="start" font-size="22" font-weight="500" fill="'+A2C+'">'+scA2+'%</text>';
    svg+='<text x="'+(CX+16)+'" y="'+(CY+10)+'" text-anchor="start" font-size="9" fill="'+A2C+'">'+escapeHtml(S.a2)+'</text>';
  }else if(shA1&&scA1!==null){
    svg+='<text x="'+CX+'" y="'+(CY-4)+'" text-anchor="middle" font-size="26" font-weight="500" fill="'+A1C+'">'+scA1+'%</text>';
    svg+='<text x="'+CX+'" y="'+(CY+12)+'" text-anchor="middle" font-size="10" fill="'+A1C+'">'+escapeHtml(S.a1)+'</text>';
  }else if(shA2&&scA2!==null){
    svg+='<text x="'+CX+'" y="'+(CY-4)+'" text-anchor="middle" font-size="26" font-weight="500" fill="'+A2C+'">'+scA2+'%</text>';
    svg+='<text x="'+CX+'" y="'+(CY+12)+'" text-anchor="middle" font-size="10" fill="'+A2C+'">'+escapeHtml(S.a2)+'</text>';
  }

  svg+='</svg>';
  rEl.innerHTML=svg;

  /* === Panneau detail - histogrammes chiffres integres === */
  var pLbl=synFilters.per==='all'?'MT1 + MT2':synFilters.per;
  var cb={};
  cats.forEach(function(c){var a1=sA1[c]||{r:0,g:0,total:0},a2=sA2[c]||{r:0,g:0,total:0};cb[c]={r:a1.r+a2.r,g:a1.g+a2.g,total:a1.total+a2.total};});

  var h='';
  if(shA1&&shA2){
    h+='<div class="syn-legend">';
    h+='<div class="syn-leg"><span style="width:14px;height:3px;background:'+A1C+';display:inline-block;border-radius:1px;"></span>'+escapeHtml(S.a1)+'</div>';
    h+='<div class="syn-leg"><span style="width:14px;height:3px;background:'+A2C+';display:inline-block;border-radius:1px;"></span>'+escapeHtml(S.a2)+'</div>';
    h+='</div>';
  }
  h+='<div class="syn-det-title">Detail par categorie</div>';
  h+='<div class="syn-det-sub">'+allObs.length+' observations \u00b7 '+pLbl+'</div>';
  h+='<div class="syn-det-list">';

  cats.forEach(function(c){
    var d=cb[c];
    var pct=d.total>0?Math.round(d.g/d.total*100):0;
    var pc=pct>=70?CG:pct>=40?'#854F0B':CR;
    var f=fs(c),nf=Math.max(9,Math.min(14,f));
    var nc=f<=9?'var(--text-hint)':f<=11?'var(--text-muted)':'var(--text-main)';
    var rW=d.total>0?Math.round(d.r/d.total*100):0;
    var gW=d.total>0?Math.round(d.g/d.total*100):0;

    var bar='<div class="syn-bar">';
    if(d.r>0) bar+='<div class="syn-bar-r" style="width:'+rW+'%">'+d.r+'</div>';
    if(d.g>0) bar+='<div class="syn-bar-g" style="width:'+gW+'%">'+d.g+'</div>';
    bar+='</div>';

    h+='<div class="syn-det-row"><span class="syn-det-name" style="font-size:'+nf+'px;color:'+nc+'">'+sn(c)+'</span>'+bar+'<span class="syn-det-pct" style="color:'+pc+'">'+pct+'%</span></div>';
  });

  h+='</div>';
  dEl.innerHTML=h;
}

function _bs(obs){
  var m={};
  obs.forEach(function(o){
    var cs=Array.isArray(o.cats)?o.cats:[o.cat];
    cs.forEach(function(c){if(!m[c])m[c]={r:0,g:0,total:0};if(o.col==='red')m[c].r++;else m[c].g++;m[c].total++;});
  });
  return m;
}
