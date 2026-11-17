import {developerGuides} from './docs-data.mjs';

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
  if(normalized==='#/playground')return {page:'playground',title:'Playground',canonical:normalized};
  if(normalized==='#/docs')return {page:'docs',id:'install',title:'Documentation',canonical:'#/docs/install'};
  if(normalized==='#/docs/preview')return {page:'docs',id:'preview',title:'v0.4.0 developer preview · NOT RELEASED',canonical:normalized};
  if(normalized.startsWith('#/docs/')){
    const id=normalized.slice('#/docs/'.length);
    const guide=developerGuides.find(x=>x.id===id);
    if(guide)return {page:'docs',id,title:guide.title,canonical:normalized};
  }
  if(normalized==='#/reference')return {page:'reference',id:'architecture',title:'Reference',canonical:'#/reference/architecture'};
  if(normalized.startsWith('#/reference/')){
    const id=normalized.slice('#/reference/'.length);
    const item=referenceTopics.find(x=>x.id===id);
    if(item)return {page:'reference',id,title:item.title,canonical:normalized};
  }
  return {page:'notfound',title:'Page not found',canonical:normalized};
}
