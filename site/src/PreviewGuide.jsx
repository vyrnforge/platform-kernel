import React from 'react';
import {preview} from './preview-data.mjs';
import {version,candidatePr} from './data.mjs';

// Preserve old documentation links, but only expose release status here.
// Unpublished APIs and technical design live in the candidate engineering PR.
export function PreviewGuide(){
  return <article className="guide-article preview-article" aria-labelledby="guide-heading">
    <nav className="guide-breadcrumb" aria-label="Breadcrumb"><a href="#/docs/install">Documentation</a><span aria-hidden="true"> / </span><span>Release status</span></nav>
    <div className="guide-topline"><span>Version availability</span><span>v{preview.version} · NOT PUBLISHED</span></div>
    <h2 id="guide-heading" tabIndex={-1}>v{preview.version} release status</h2>
    <p className="guide-summary">{preview.summary}</p>
    <div className="preview-warning" role="note">
      <strong>Not released. Do not install v{preview.version} yet.</strong>
      <p>The supported public installation and integration examples are for v{version}. This page provides release status only, not unreleased API documentation.</p>
      <a href="#/docs/install">Install the published v{version} library</a>
    </div>
    <section className="preview-part" aria-labelledby="preview-guidance">
      <h3 id="preview-guidance">What developers should do</h3>
      <ul>{preview.guidance.map(item=><li key={item}>{item}</li>)}</ul>
      <p>Existing v{version} application code and supported security/reliability contracts remain documented in the public usage guides.</p>
    </section>
    <section className="preview-part preview-handoff" aria-labelledby="preview-followup">
      <h3 id="preview-followup">Track the upcoming version</h3>
      <p><a href={candidatePr} target="_blank" rel="noopener noreferrer">Candidate pull request and engineering review</a> · <a href="#/reference/releases">Published version information</a></p>
      <p>Installation guidance will be updated only after a separately authorized, verifiable release.</p>
    </section>
  </article>;
}
