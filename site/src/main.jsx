import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {repo,version,candidateVersion} from './data.mjs';
import {developerGuides} from './docs-data.mjs';
import {resolveRoute,siteNavigation} from './routes.mjs';
import {DeveloperDocs} from './DeveloperDocs.jsx';
import {Reference} from './Reference.jsx';
import {IntegrationWorkbench} from './IntegrationWorkbench.jsx';
import './style.css';

const install=developerGuides.find(x=>x.id==='install');

function Header({page}){
  return <header className="site-header">
    <div className="header-inner wrap">
      <a className="brand" href="#/" aria-label="VyrnForge Platform Kernel home"><span className="brand-mark">V</span><span className="brand-name">VYRNFORGE <small>PLATFORM KERNEL</small></span></a>
      <nav aria-label="Primary navigation" className="primary-nav">
        {siteNavigation.map(x=><a key={x.id} href={x.href} aria-current={page===x.id?'page':undefined}>{x.title}</a>)}
      </nav>
      <div className="header-end"><span className="version-chip"><i aria-hidden="true"/> v{version}</span><a className="github-link" href={repo} target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden="true">↗</span></a></div>
    </div>
  </header>;
}

function Home(){
  return <div className="home-page">
    <section className="home-hero">
      <div className="wrap home-hero-layout">
        <div className="home-hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" aria-hidden="true"/> JAVA 21+ / EMBEDDED LIBRARY / v{version}</div>
          <h1 id="page-title" tabIndex={-1}>Build your product.<br/><em>Reuse the foundation.</em></h1>
          <p>Platform Kernel gives independent Java applications a consistent technical foundation: identifiers, trusted context, API contracts, audit and event patterns, and optional durable retries.</p>
          <p className="home-boundary-statement">Your application keeps its data, authorization and deployment. No mandatory Kernel server.</p>
          <div className="home-actions"><a className="btn primary" href="#/docs/install">Start with the quickstart <span aria-hidden="true">→</span></a><a className="btn subtle" href="#/playground">Explore a scenario <span aria-hidden="true">↗</span></a></div>
          <div className="home-facts"><span>Published on Maven Central</span><span>Three focused artifacts</span><span>Optional JDBC adapter</span></div>
        </div>
        <div className="home-code" aria-label="Maven installation preview">
          <div className="home-code-heading"><span className="code-dots" aria-hidden="true">● ● ●</span><span>pom.xml</span><span>RELEASED v{version}</span></div>
          <pre><code>{install.samples[0].code}</code></pre>
          <div className="home-code-caption"><span>One dependency to get started.</span><a href="#/docs/first">See your first Java example <span aria-hidden="true">→</span></a></div>
          <div className="home-code-under"><span>APPLICATION</span><span className="home-arrow" aria-hidden="true">→</span><span>EMBEDDED KERNEL</span><span className="home-arrow" aria-hidden="true">→</span><span>YOUR DOMAIN</span></div>
        </div>
      </div>
    </section>
    <section className="home-next section" aria-labelledby="next-heading"><div className="wrap">
      <div className="section-heading"><span className="eyebrow">YOUR FIRST INTEGRATION</span><h2 id="next-heading">A clear path from zero to useful.</h2><p>Learn the released library in small steps. Add only the infrastructure your product needs.</p></div>
      <div className="next-grid">
        <a href="#/docs/install"><span className="step-index">01 / INSTALL</span><h3>Choose the dependency <span aria-hidden="true">↗</span></h3><p>Maven or Gradle, Java 21+, no server or custom repository.</p></a>
        <a href="#/docs/first"><span className="step-index">02 / FIRST PROGRAM</span><h3>Use a real API <span aria-hidden="true">↗</span></h3><p>Generate UUIDv7 IDs and correlation context in a runnable class.</p></a>
        <a href="#/docs/request"><span className="step-index">03 / INTEGRATE</span><h3>Wire your application <span aria-hidden="true">↗</span></h3><p>Use trusted identity and tenant guards. Keep domain authorization local.</p></a>
      </div>
    </div></section>
    <section className="home-secondary section" aria-labelledby="where-heading"><div className="wrap home-secondary-layout">
      <div><span className="eyebrow">ONE FOUNDATION / CLEAR OWNERSHIP</span><h2 id="where-heading">What belongs where?</h2><p>Kernel handles common mechanics. IAM or a trusted provider establishes identity. File Storage manages file bytes. Each business application remains the system of record for its domain.</p><a href="#/reference/architecture" className="inline-link">Explore architecture boundaries <span aria-hidden="true">→</span></a></div>
      <div className="boundary-summary">
        <div><strong>Your application</strong><span>Domain data · permission policy · transactions</span></div>
        <div><strong>Platform Kernel</strong><span>Context · contracts · optional reliability</span></div>
        <div><strong>External authorities</strong><span>Identity provider · File Storage · chosen transport</span></div>
      </div>
    </div></section>
    <section className="home-release"><div className="wrap release-note"><span>Published: <strong>v{version}</strong></span><span>Under review: <strong>v{candidateVersion} (not released)</strong></span><a href="#/reference/releases">Versions and evidence <span aria-hidden="true">→</span></a></div></section>
  </div>;
}

function NotFound(){return <div className="wrap not-found"><h1 id="page-title" tabIndex={-1}>Page not found.</h1><p>The requested guide or reference topic isn't available.</p><a className="btn primary" href="#/docs/install">Open documentation</a></div>}

function App(){
  const [route,setRoute]=useState(()=>resolveRoute(window.location.hash));
  useEffect(()=>{
    const onHash=()=>setRoute(resolveRoute(window.location.hash));
    window.addEventListener('hashchange',onHash);
    return()=>window.removeEventListener('hashchange',onHash);
  },[]);
  useEffect(()=>{
    document.title=route.title+' · VyrnForge Platform Kernel';
    window.scrollTo({top:0,behavior:'instant'});
    if(route.page!=='home'){
      const title=document.getElementById('page-title');
      title?.focus({preventScroll:true});
    }
  },[route.page,route.id,route.title]);
  return <>
    <a className="skip-link" href="#main" onClick={e=>{e.preventDefault();document.getElementById("main")?.focus()}}>Skip to content</a>
    <Header page={route.page}/>
    <main id="main" tabIndex={-1}>
      {route.page==='home'&&<Home/>}
      {route.page==='docs'&&<DeveloperDocs guideId={route.id}/>}
      {route.page==='playground'&&<><h1 className="visually-hidden" tabIndex={-1} id="page-title">Interactive integration playground</h1><IntegrationWorkbench/></>}
      {route.page==='reference'&&<Reference topic={route.id}/>}
      {route.page==='notfound'&&<NotFound/>}
    </main>
    <footer className="site-footer"><div className="wrap footer-inner"><span><strong>VyrnForge</strong> / Platform Kernel <span>· v{version} released</span></span><div><a href="#/docs/install">Documentation</a><a href="#/reference/releases">Releases</a><a href={repo} target="_blank" rel="noopener noreferrer">Source ↗</a></div></div></footer>
  </>;
}
createRoot(document.getElementById('root')).render(<App/>);
