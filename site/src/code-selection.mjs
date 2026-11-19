// Select an entire syntax-highlighted sample without requiring Clipboard API
// permission. The caller keeps the accessible status text and keyboard policy.
export function selectCodeText(pre){
  const code=pre?.querySelector('code');
  const selection=window.getSelection();
  if(!code||!selection)return false;
  try{
    pre.focus({preventScroll:true});
    const range=document.createRange();
    range.selectNodeContents(code);
    selection.removeAllRanges();
    selection.addRange(range);
    return selection.toString()===code.textContent;
  }catch{
    return false;
  }
}
