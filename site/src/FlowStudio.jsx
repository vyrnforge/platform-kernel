import React,{useEffect,useId,useRef,useState,useMemo} from 'react';
import {flows,getFlow,getScenario,routeEdges,edgePath} from './flow-data.mjs';
import {source,version} from './data.mjs';
import './flow-studio.css';
function Icon({name}){const paths={play:'M8 5v14l11-7z',pause:'M9 5v14 M15 5v14',back:'M6 5v14 M19 5L9 12l10 7z',next:'M18 5v14 M5 5l10 7-10 7z',reset:'M4 11a8 8 0 1 1 2 7 M4 11V4m0 7h7',expand:'M4 9V4h5 M15 4h5v5 M20 15v5h-5 M9 20H4v-5',close:'M6 6l12 12M18 6 6 18'};return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]||paths.play}/></svg>}
function Graph({flow,scenario,index,playing,duration,selected,onSelect,motion,canvasRef}) {
  const id=useId().replace(/[^a-zA-Z0-9_-]/g,'');
  const edges=useMemo(()=>routeEdges(flow,scenario),[flow,scenario]);
  const current=scenario.frames[index], prev=scenario.frames[index-1];
  const activeNode=flow.nodes.find(n=>n.id===current.node);
  const activeEdge=prev&&prev.node!==current.node?edges.find(e=>e.from===prev.node&&e.to===current.node):null;
  const visited=new Set(scenario.frames.slice(0,index+1).map(f=>f.node));
  const inRoute=new Set(scenario.frames.map(f=>f.node));
  useEffect(()=>{const el=canvasRef.current;if(el&&el.scrollWidth>el.clientWidth){const target=activeNode.x/1000*el.scrollWidth-el.clientWidth/2;el.scrollTo({left:Math.max(0,target),behavior:motion?'smooth':'auto'});}},[activeNode.x,canvasRef,motion]);
  const tone=current.tone;
  return <div className="fs-canvas" ref={canvasRef} tabIndex={0} aria-label="Scrollable interactive architecture diagram">
    <svg className="fs-graph" viewBox="0 0 1000 490" role="group" aria-label={flow.title+' architecture'}>
      <defs>
        <pattern id={id+'grid'} width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#304765"/></pattern>
        {['base','selected','done','active'].map((t,i)=><marker key={t} id={id+t} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill={['#405777','#718cb5','#46bfae','#83d9ff'][i]}/></marker>)}
        <filter id={id+'glow'} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="1000" height="490" rx="16" fill="#0a1527"/><rect width="1000" height="490" rx="16" fill={'url(#'+id+'grid)'} opacity=".6"/>
      {flow.group&&<g><rect x={flow.group.x} y={flow.group.y} width={flow.group.w} height={flow.group.h} rx="16" fill="#153047" fillOpacity=".5" stroke="#43657a" strokeDasharray="6 5"/><text x={flow.group.x+12} y={flow.group.y-9} className="fs-group-label">{flow.group.label}</text></g>}
      {edges.map(e=>{const active=activeEdge?.key===e.key,done=e.indices.some(i=>i<=index);const kind=active?'active':done?'done':e.kind;return <g key={e.key}><path d={e.path} className={'fs-edge '+kind} markerEnd={'url(#'+id+kind+')'}/>{active&&<path d={e.path} className="fs-edge-glow"/>}</g>})}
      {flow.nodes.map(n=>{const isActive=current.node===n.id,seen=visited.has(n.id),onRoute=inRoute.has(n.id),chosen=selected===n.id;return <g key={n.id} role="button" tabIndex={0} aria-label={n.title+' — '+n.owner} aria-pressed={chosen} onClick={()=>onSelect(n.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(n.id)}}} className={'fs-node '+(isActive?'active '+tone:seen?'visited':onRoute?'upcoming':'dim')+(chosen?' inspected':'')}>
      <rect className="fs-node-outline" x={n.x-94} y={n.y-39} width="188" height="78" rx="12"/>
      <rect className="fs-node-accent" x={n.x-94} y={n.y-23} width="3" height="46" rx="2"/>
      <circle className="fs-node-dot" cx={n.x+75} cy={n.y-22} r="4"/>
      <text x={n.x-80} y={n.y-18} className="fs-owner">{n.owner}</text>
      <text x={n.x-80} y={n.y+8} className="fs-node-title">{n.title}</text>
      <text x={n.x-80} y={n.y+26} className="fs-node-state">{isActive?'ACTIVE':seen?'VISITED':onRoute?'AWAITING':'STANDBY'}</text>
      </g>})}
      {activeEdge&&playing&&motion&&<circle key={flow.id+scenario.id+index} r="5.5" fill="#c6f7ff" filter={'url(#'+id+'glow)'}><animateMotion path={activeEdge.path} dur={(duration*.78)+'ms'} fill="freeze"/></circle>}
    </svg>
  </div>;
}
export function FlowStudio(){
  const [mode,setMode]=useState('request'),[scenarioId,setScenarioId]=useState('allowed'),[index,setIndex]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1),[inspected,setInspected]=useState(null),[expanded,setExpanded]=useState(false),[motion,setMotion]=useState(true);
  const root=useRef(null),canvas=useRef(null),expandButton=useRef(null),closeButton=useRef(null),timeline=useRef(null);
  const flow=getFlow(mode),scenario=getScenario(flow,scenarioId),last=scenario.frames.length-1,frame=scenario.frames[index],duration=1450/speed;
  const node=flow.nodes.find(n=>n.id===(inspected||frame.node))||flow.nodes[0];
  useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const apply=()=>setMotion(!media.matches);apply();media.addEventListener('change',apply);return()=>media.removeEventListener('change',apply)},[]);
  useEffect(()=>{if(!playing)return;if(index===last){setPlaying(false);return;}const timer=window.setTimeout(()=>{setIndex(i=>Math.min(i+1,last));setInspected(null)},duration);return()=>clearTimeout(timer)},[playing,index,last,duration]);
  useEffect(()=>{if(!expanded)return;const original=document.body.style.overflow;document.body.style.overflow='hidden';closeButton.current?.focus();const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setExpanded(false)}if(e.key==='Tab'){const focusable=Array.from(root.current?.querySelectorAll('button:not(:disabled),select,input,a[href],[tabindex="0"]')||[]);if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}};document.addEventListener('keydown',key,true);return()=>{document.body.style.overflow=original;document.removeEventListener('keydown',key,true);expandButton.current?.focus()}},[expanded]);
  useEffect(()=>{const strip=timeline.current,active=strip?.querySelector('[aria-current=step]');if(strip&&active){const left=active.offsetLeft-strip.offsetLeft;strip.scrollTo({left:Math.max(0,left-strip.clientWidth/2+active.clientWidth/2),behavior:motion?'smooth':'auto'});}},[index,scenarioId,motion]);
  function reset(id,sc){setMode(id);setScenarioId(sc);setIndex(0);setPlaying(false);setInspected(null)}
  function seek(value){setPlaying(false);setIndex(Math.max(0,Math.min(last,value)));setInspected(null)}
  function toggle(){if(playing){setPlaying(false);return}if(index===last)setIndex(0);setInspected(null);setPlaying(true)}
  const completed=index===last;
  return <div ref={root} className={'flow-studio'+(expanded?' expanded':'')} role={expanded?'dialog':undefined} aria-modal={expanded?true:undefined} aria-label="Kernel Flow Studio" data-testid="flow-studio">
    <div className="fs-top"><div><span className="fs-live"><i/> FLOW STUDIO</span><span className="fs-version">v{version} · Simulation</span></div><button type="button" ref={expanded?closeButton:expandButton} className="fs-icon-button" onClick={()=>setExpanded(v=>!v)} title={expanded?'Close expanded view':'Expand workspace'} aria-label={expanded?'Close expanded view':'Expand workspace'}><Icon name={expanded?'close':'expand'}/><span>{expanded?'Close':'Expand'}</span></button></div>
    <div className="fs-modes" aria-label="Flow type">{flows.map((m,i)=><button type="button" key={m.id} data-mode={m.id} aria-pressed={mode===m.id} onClick={()=>reset(m.id,m.scenarios[0].id)}><span>0{i+1}</span>{m.title}</button>)}</div>
    <div className="fs-workspace">
      <aside className="fs-scenarios"><div className="fs-label">SCENARIOS</div><p>{flow.subtitle}</p><div className="fs-scenario-list">{flow.scenarios.map(s=><button key={s.id} data-scenario={s.id} type="button" aria-pressed={scenario.id===s.id} onClick={()=>reset(flow.id,s.id)}><i className={'fs-indicator '+s.tone}/><span>{s.title}</span><span className="fs-chevron">›</span></button>)}</div><div className="fs-scenario-note">Choose a path, then play or step through each handoff. Click a component to inspect its responsibility.</div></aside>
      <div className="fs-stage">
        <div className="fs-stage-header"><div><span className="fs-label">ACTIVE SEQUENCE</span><h3>{scenario.title}</h3></div><span className={'fs-state '+(completed?scenario.tone:'info')} data-testid="flow-state">{completed?scenario.outcome:playing?'Playing':'Ready / paused'}</span></div>
        <Graph flow={flow} scenario={scenario} index={index} playing={playing} duration={duration} selected={node.id} onSelect={id=>{setPlaying(false);setInspected(id)}} motion={motion} canvasRef={canvas}/>
        <div className="fs-legend"><span><i className="active"/> Current route</span><span><i className="visited"/> Visited</span><span><i className="muted"/> Alternate / pending</span><span className="fs-mobile-hint">Scroll diagram horizontally</span></div>
        <div className="fs-playback">
          <div className="fs-controls"><button type="button" aria-label="Restart sequence" title="Restart sequence" onClick={()=>seek(0)}><Icon name="reset"/></button><button type="button" aria-label="Previous step" title="Previous step" disabled={index===0} onClick={()=>seek(index-1)}><Icon name="back"/></button><button type="button" className="fs-play" data-testid="play" onClick={toggle}><Icon name={playing?'pause':'play'}/>{playing?'Pause':completed?'Replay':'Play'}</button><button type="button" aria-label="Next step" title="Next step" disabled={completed} onClick={()=>seek(index+1)}><Icon name="next"/></button><label className="fs-speed">Speed <select aria-label="Playback speed" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value=".5">0.5×</option><option value="1">1×</option><option value="2">2×</option></select></label></div>
          <div className="fs-scrub"><label htmlFor="fs-timeline">Step {index+1} / {last+1}</label><input id="fs-timeline" type="range" min="0" max={last} value={index} onChange={e=>seek(Number(e.target.value))} aria-valuetext={frame.label} style={{'--progress':(index/Math.max(1,last)*100)+'%'}}/><span>{Math.round(index/Math.max(1,last)*100)}%</span></div>
          <div className="fs-timeline" ref={timeline} aria-label="Sequence timeline">{scenario.frames.map((f,i)=><button key={i} type="button" data-step={i} aria-current={index===i?'step':undefined} className={(i===index?'current':i<index?'complete':'future')+' '+f.tone} onClick={()=>seek(i)} title={f.label}><span>{String(i+1).padStart(2,'0')}</span>{f.label}</button>)}</div>
        </div>
      </div>
      <aside className="fs-inspector"><div className="fs-label">TRACE / INSPECTOR</div><div className="fs-event" aria-live="polite"><span className={'fs-state '+frame.tone}>STEP {String(index+1).padStart(2,'0')}</span><h3 data-testid="step-title">{frame.label}</h3><p>{frame.detail}</p><div className="fs-signal"><span>ILLUSTRATIVE SIGNAL</span><code>{frame.signal}</code></div></div><div className="fs-component"><div className="fs-label">{inspected?'SELECTED COMPONENT':'CURRENT COMPONENT'}</div><h4>{node.title}</h4><span className="fs-owner-label">{node.owner}</span><p>{node.description}</p><a href={source(node.path)} target="_blank" rel="noreferrer">Inspect release source ↗</a>{inspected&&<button className="fs-text-button" onClick={()=>setInspected(null)}>Follow active step</button>}</div><div className="fs-log"><div className="fs-label">TRACE HISTORY</div><ol>{scenario.frames.slice(0,index+1).map((f,i)=><li key={i}><button type="button" onClick={()=>seek(i)}><i className={'fs-indicator '+f.tone}/><span>{String(i+1).padStart(2,'0')} · {f.label}</span></button></li>)}</ol></div></aside>
    </div>
    <div className="fs-footer"><span>Deterministic illustration of released contracts and code. Not a live runtime, performance measurement or production trace.</span><a href={source('docs/v2/production-hardening.md')} target="_blank" rel="noreferrer">Reliability and recovery guide ↗</a></div>
  </div>
}
