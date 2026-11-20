/* VuelosRD source monitoring: dynamic checks with conservative stale-state fallback. */
'use strict';
const sourceStatusWords={
es:{title:'Estado de las fuentes oficiales',noData:'Aún no hay un informe automático publicado. Se muestran las revisiones independientes fechadas.',checked:'Última comprobación automática: {date}',stale:'La última comprobación es antigua; no se confirma el estado actual.',expl:'Estos resultados describen solicitudes automáticas, no vuelos ni accesibilidad para todas las personas.',ok:'Respuestas HTTP',limited:'Accesos automáticos limitados',alerts:'Problemas que revisar',history:'Comprobaciones reales guardadas',technical:'Estado de automatización: {code}',empty:'Aún no hay historial publicado',alternate:'Otra página oficial comprobada',access:'Acceso automático limitado; no confirma un enlace roto',success:'Solicitud HTTP respondida durante el control',fail:'Problema técnico bajo revisión; no confirma fallo para visitantes'},
en:{title:'Official source status',noData:'No automated report is published yet. Dated independent reviews are shown.',checked:'Last automated check: {date}',stale:'The latest check is old; current status is not confirmed.',expl:'Results describe automated requests, not flight data or access for every visitor.',ok:'HTTP responses',limited:'Limited automated access',alerts:'Issues for review',history:'Stored real checks',technical:'Automation status: {code}',empty:'No check history published yet',alternate:'Verified alternative official page',access:'Automated access limited; does not prove a broken link',success:'HTTP response observed in the check',fail:'Technical issue under review; does not prove visitor failure'},
de:{title:'Status offizieller Quellen',noData:'Noch kein automatischer Bericht veröffentlicht. Datierte unabhängige Prüfungen werden angezeigt.',checked:'Letzte automatische Prüfung: {date}',stale:'Die letzte Prüfung ist älter; ein aktueller Status ist nicht bestätigt.',expl:'Die Resultate beschreiben automatische Anfragen, keine Live-Flüge oder Erreichbarkeit für alle Besucher.',ok:'HTTP-Antworten',limited:'Bot-/Abrufbeschränkungen',alerts:'Zu prüfende Probleme',history:'Gespeicherte echte Prüfläufe',technical:'Automationsstatus: {code}',empty:'Noch kein Prüfverlauf veröffentlicht',alternate:'Geprüfte alternative offizielle Seite',access:'Automatischer Zugriff eingeschränkt; Link nicht als defekt bestätigt',success:'HTTP-Antwort bei der Prüfung erhalten',fail:'Technisches Problem zu untersuchen; kein Beleg für Besucher-Ausfall'},
fr:{title:'Statut des sources officielles',noData:'Aucun rapport automatique publié. Les vérifications indépendantes datées restent visibles.',checked:'Dernier contrôle automatique : {date}',stale:'Le dernier contrôle est ancien; aucun statut actuel confirmé.',expl:'Ces résultats concernent des requêtes automatiques et non des vols en direct.',ok:'Réponses HTTP',limited:'Accès automatiques limités',alerts:'Incidents à vérifier',history:'Historique réel',technical:'État du contrôle : {code}',empty:'Aucun historique disponible',alternate:'Autre page officielle vérifiée',access:'Accès automatique limité; lien non prouvé cassé',success:'Réponse HTTP lors du contrôle',fail:'Incident technique à examiner; accès visiteur non confirmé'},
ht:{title:'Eta sous ofisyèl yo',noData:'Pa gen rapò otomatik pibliye ankò. Verifikasyon endepandan ki gen dat rete vizib.',checked:'Dènye verifikasyon otomatik: {date}',stale:'Dènye verifikasyon an ansyen; pa gen konfimasyon aktyèl.',expl:'Rezilta yo se demann otomatik, pa done vòl an dirèk.',ok:'Repons HTTP',limited:'Aksè otomatik limite',alerts:'Pwoblèm pou verifye',history:'Istwa verifikasyon reyèl',technical:'Eta otomatik: {code}',empty:'Pa gen istwa ankò',alternate:'Lòt paj ofisyèl verifye',access:'Aksè otomatik limite; lyen pa konfime kòm kraze',success:'Repons HTTP pandan verifikasyon',fail:'Pwoblèm teknik pou verifye; pa prèv sit pa mache'}
};
const verifiedOfficialAlternatives={
 'https://www.iberia.com/do/flight-status/':'https://www.iberia.com/de/llegadas-y-salidas/',
 'https://www.united.com/en/us/flightstatus':'https://www.united.com/',
 'https://www.spiritrestructuring.com/':'https://www.spiritrestructuring.com/guests'
};
let sourceLatest=null,sourceHistory=null;
function sourceCheckRecent(date){
 const age=Date.now()-Date.parse(date||'');
 return Number.isFinite(age)&&age>=-3600000&&age<8*86400000;
}
function renderSourceHealthPanel(){
 const w=sourceStatusWords[current],root=$('sourceHealthPanel');
 $('sourceHealthTitle').textContent=w.title;
 $('sourceHealthExplanation').textContent=w.expl;
 const latest=sourceLatest;
 const recent=latest&&sourceCheckRecent(latest.checkedAt);
 $('sourceHealthDate').textContent=latest?w.checked.replace('{date}',new Date(latest.checkedAt).toLocaleString(current==='ht'?'fr-HT':current))+(recent?'':' · '+w.stale):w.noData;
 const metrics=$('sourceHealthMetrics');metrics.replaceChildren();
 if(latest){
  for(const [value,label] of [[latest.ok,w.ok],[latest.monitorLimitationCount,w.limited],[latest.actionableAlertCount,w.alerts]]){
   const span=document.createElement('span'),strong=document.createElement('strong');
   strong.textContent=String(value);span.append(strong,document.createTextNode(' · '+label));metrics.append(span);
  }
 }else{const note=document.createElement('span');note.textContent=w.noData;metrics.append(note)}
 const history=$('sourceHealthHistory');history.replaceChildren();
 const runs=sourceHistory?.entries||[];
 if(!runs.length){history.textContent=w.empty;return;}
 const head=document.createElement('strong');head.textContent=w.history;history.append(head);
 const list=document.createElement('ol');
 for(const entry of runs.slice(-5).reverse()){
  const li=document.createElement('li');li.textContent=new Date(entry.checkedAt).toLocaleDateString(current==='ht'?'fr-HT':current)+' · '+entry.ok+'/'+entry.total+' '+w.ok+' · '+entry.actionableAlertCount+' '+w.alerts;list.append(li);
 }
 history.append(list);
}
// Published status is public in this repository. GitHub's own raw endpoint keeps
// scheduled updates fresh even when Cloudflare does not build bot-generated commits.
const sourceDataMirror='https://raw.githubusercontent.com/PuntaCanada/vuelosrd/main/';
async function readSourceSnapshot(url,kind){
 try{
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(7000)});
  if(!response.ok)return null;
  const data=await response.json();
  if(kind==='latest'){
   if(data.schemaVersion!==1||data.total!==47||!Array.isArray(data.warnings)||!Number.isFinite(Date.parse(data.checkedAt)))return null;
   if(data.ok+data.uncertain+data.broken!==47)return null;
  }else if(data.schemaVersion!==1||!Array.isArray(data.entries))return null;
  return data;
 }catch{return null}
}
async function loadSourceHealth(){
 const urls=[
  '/data/source-health-latest.json',
  sourceDataMirror+'data/source-health-latest.json',
  '/data/source-health-history.json',
  sourceDataMirror+'data/source-health-history.json'
 ];
 const [localLatest,githubLatest,localHistory,githubHistory]=await Promise.all([
  readSourceSnapshot(urls[0],'latest'),readSourceSnapshot(urls[1],'latest'),
  readSourceSnapshot(urls[2],'history'),readSourceSnapshot(urls[3],'history')
 ]);
 const latest=[localLatest,githubLatest].filter(Boolean).sort((a,b)=>Date.parse(b.checkedAt)-Date.parse(a.checkedAt))[0]||null;
 const histories=[localHistory,githubHistory].filter(Boolean).sort((a,b)=>Date.parse(b.entries.at(-1)?.checkedAt||0)-Date.parse(a.entries.at(-1)?.checkedAt||0));
 sourceLatest=latest;sourceHistory=histories[0]||null;
 renderSourceHealthPanel();renderAirlines();
}
// Defer dynamic loading until the existing inline VuelosRD app and its language state are ready.
window.addEventListener('DOMContentLoaded',()=>loadSourceHealth(),{once:true});
