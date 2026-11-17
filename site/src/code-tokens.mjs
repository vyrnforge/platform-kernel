// Minimal, dependency-free highlighting for static documentation examples.
// Segments render as React text, never injected HTML; joining them restores exact source.
const tokens=/(<!--[\s\S]*?-->|\/\*[\s\S]*?\*\/|\/\/[^\n]*|#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|<\/?[\w:.-]+|\b(?:import|public|private|final|static|void|new|var|return|case|switch|class|throw|try|catch|true|false|null|repositories|dependencies|implementation|testImplementation|scope)\b|\b\d+(?:\.\d+)*\b)/g;
export function tokenizeCode(source,language='java'){
  const parts=[];let last=0;
  for(const match of source.matchAll(tokens)){
    if(match.index>last)parts.push({text:source.slice(last,match.index),kind:null});
    const text=match[0];
    let kind=null;
    if(text.startsWith('//')||text.startsWith('/*')||text.startsWith('<!--')||(language==='bash'&&text.startsWith('#')))kind='comment';
    else if(text.startsWith('"')||text.startsWith("'"))kind='string';
    else if(text.startsWith('<'))kind='tag';
    else if(/^\d/.test(text))kind='number';
    else if(/^[a-zA-Z]/.test(text))kind='keyword';
    parts.push({text,kind});last=match.index+text.length;
  }
  if(last<source.length)parts.push({text:source.slice(last),kind:null});
  return parts;
}
