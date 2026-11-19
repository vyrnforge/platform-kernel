// Release-status metadata only. The public site intentionally does not bundle
// unpublished API source snippets or implementation notes.
export const preview={
  version:'0.4.0',
  status:'NOT RELEASED',
  published:'0.3.2',
  summary:'The next library version is under review and is not available for installation. Use the released v0.3.2 integration guides and API examples in production applications.',
  guidance:[
    'Install v0.3.2 from Maven Central using the published quickstart.',
    'Check version availability in the Reference page; do not adopt unreleased APIs.',
    'Wait for a signed release and verified Maven Central availability before considering an upgrade.'
  ]
};

export function searchPreview(query){
  const term=query.trim().toLocaleLowerCase();
  if(!term)return true;
  return [preview.version,preview.status,preview.published,preview.summary,...preview.guidance,'release status']
    .some(value=>value.toLocaleLowerCase().includes(term));
}
