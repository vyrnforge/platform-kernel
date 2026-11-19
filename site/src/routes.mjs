import {developerGuides} from './docs-data.mjs';
import {workbenchModes,scenariosFor} from './workbench-data.mjs';
import {capabilityGuide,inferCapability} from './capability-guides.mjs';

export const referenceTopics=[
  {id:'architecture',title:'Architecture & ownership'},
  {id:'capabilities',title:'Capability reference'},
  {id:'releases',title:'Versions & release notes'}
];

export const siteNavigation=[
  {id:'home',title:'Home',href:'#/'},
  {id:'docs',title:'Documentation',href:'#/docs/install'},
  {id:'playground',title:'Playground',href:'#/playground'},
  {id:'reference',title:'Reference',href:'#/reference/architecture'}
];

const legacy={
  '#overview':'#/',
  '#content':'#/',
  '#product':'#/reference/architecture',
  '#usecases':'#/playground',
  '#start':'#/docs/install',
  '#adoption':'#/docs/install',
  '#docs':'#/docs/install',
  '#journeys':'#/docs/install',
  '#workbench':'#/playground',
  '#demo':'#/playground',
  '#capabilities':'#/reference/capabilities',
  '#boundaries':'#/reference/architecture',
  '#architecture':'#/reference/architecture',
  '#next':'#/reference/releases',
  '#readiness':'#/reference/releases'
};

export function canonicalHash(hash=''){
  if(!hash || hash==='#' || hash==='#/')return '#/';
  return legacy[hash]||hash;
}

export function resolveRoute(hash=''){
  const normalized=canonicalHash(hash);
  if(normalized==='#/')return {page:'home',title:'Home',canonical:normalized};
  if(normalized==='#/playground'||normalized.startsWith('#/playground?')){
    const query=normalized.includes('?')?normalized.split('?').slice(1).join('?'):'';
    const params=new URLSearchParams(query);
    const requestedCapability=params.get('cap');
    const selectedCapability=capabilityGuide(requestedCapability);
    const requestedMode=params.get('mode');
    // An explicitly shared capability can stand alone. Use its published
    // integration pattern rather than silently displaying the Core guide.
    const mode=workbenchModes.some(item=>item.id===requestedMode)?requestedMode:
      !requestedMode&&selectedCapability?.mode?selectedCapability.mode:'core';
    const requestedScope=params.get('scope');
    const scope=mode==='request'&&requestedScope==='tenantless'?'tenantless':'scoped';
    const available=scenariosFor(mode,scope);
    const compatibleGuide=selectedCapability&&(
      selectedCapability.mode===mode||
      selectedCapability.mode===null&&!requestedMode
    )?selectedCapability:null;
    const wantedScenario=params.get('scenario')||compatibleGuide?.scenario||'success';
    const scenarioExists=available.some(item=>item.id===wantedScenario);
    const supportedByGuide=!compatibleGuide?.scenarios||
      compatibleGuide.scenarios.includes(wantedScenario);
    // An otherwise valid request/mutation scenario can still be unrelated to
    // the chosen capability. Never show a different scenario silently.
    const preferred=compatibleGuide?.scenario||'success';
    const validPreferred=available.some(item=>item.id===preferred)&&
      (!compatibleGuide?.scenarios||compatibleGuide.scenarios.includes(preferred));
    const scenario=scenarioExists&&supportedByGuide?wantedScenario:
      scenarioExists&&validPreferred?preferred:'success';
    const capabilityId=compatibleGuide?.id||inferCapability(mode,scenario);
    const corrections=[];
    if(requestedMode&&!workbenchModes.some(item=>item.id===requestedMode))corrections.push('Unknown application pattern');
    if(requestedScope&&(requestedScope!=='scoped'&&requestedScope!=='tenantless'||mode!=='request'&&requestedScope!=='scoped'))corrections.push('Unsupported endpoint scope');
    if(params.has('scenario')&&wantedScenario!==scenario)corrections.push(
      scenarioExists?'Scenario unavailable for this capability':'Scenario unavailable for this pattern and scope'
    );
    if(requestedCapability&&!selectedCapability)corrections.push('Unknown capability guide');
    if(selectedCapability&&!compatibleGuide)corrections.push('Capability and integration pattern do not match');
    const recovery=corrections.length?corrections.join('; ')+'. Showing '+available.find(item=>item.id===scenario).title+'. Choose a supported option or return to your guide.':null;
    return {page:'playground',title:'Playground',mode,scope,scenario,capabilityId,recovery,canonical:normalized};
  }
  if(normalized==='#/docs')return {page:'docs',id:'install',title:'Documentation',canonical:'#/docs/install'};
  // Section deep links are optional, validated hints within the existing guides,
  // never new top-level destinations. Query text is retained for Back/Forward.
  if(normalized.startsWith('#/docs/')){
    const [path,rawQuery='']=normalized.slice('#/docs/'.length).split('?',2);
    const guide=developerGuides.find(x=>x.id===path);
    if(path==='preview'||guide){
      const params=new URLSearchParams(rawQuery);
      const sections=['overview','prerequisite','steps','scope','failures','decisions','recovery','conformance','example','troubleshooting','verification','ownership'];
      const section=sections.includes(params.get('section'))?params.get('section'):'overview';
      const index=Number(params.get('sample'));
      const sampleIndex=guide&&params.has('sample')&&Number.isInteger(index)&&index>=0&&index<guide.samples.length?index:null;
      const searchQuery=params.has('q')?params.get('q').slice(0,120):null;
      return {page:'docs',id:path,title:path==='preview'?'v0.4.0 release status · NOT RELEASED':guide.title,
        section:path==='preview'?'overview':section,sampleIndex,searchQuery,canonical:normalized};
    }
  }
  if(normalized==='#/reference')return {page:'reference',id:'architecture',title:'Reference',canonical:'#/reference/architecture'};
  if(normalized.startsWith('#/reference/')){
    const id=normalized.slice('#/reference/'.length);
    const item=referenceTopics.find(x=>x.id===id);
    if(item)return {page:'reference',id,title:item.title,canonical:normalized};
  }
  return {page:'notfound',title:'Page not found',canonical:normalized};
}
