function suggest(content){
  const lines = content.split(/\r?\n/);
  const suggestions = [];
  const repPunc = /(。{2,}|，{2,}|！{2,}|？{2,}|\.{2,}|,{2,}|!{2,}|\?{2,})/;
  for(let i=0;i<lines.length;i++){
    const line = lines[i];
    if(!line.trim()) continue;
    const m = repPunc.exec(line);
    if(m){
      suggestions.push({ line: i, type: 'ai', code: 'typo-punc-repeat', message: `第${i+1}行：检测到重复标点 "${m[0]}"，建议合并为单个`, fix: { type: 'replace', text: line.replace(m[0], m[0].charAt(0)) } });
    }
    const tokens = line.split(/\s+/);
    for(let j=0;j<tokens.length-1;j++){
      const a = tokens[j], b = tokens[j+1];
      if(a && b && a===b){
        const pair = a+" "+b;
        suggestions.push({ line: i, type: 'ai', code: 'typo-duplicate-word', message: `第${i+1}行：检测到重复词 "${pair}"，建议合并为一个`, fix: { type: 'replace', text: line.replace(pair, a) } });
        break;
      }
    }
  }
  const aggregations = aggregate(content);
  return { suggestions, stats: { total: suggestions.length }, aggregations };
}

function aggregate(content){
  const terms = [];
  const pairs = [
    ['。。','。'],['，，','，'],['！！','！'],['？？','？'],
    ['..','.'],[',,',','],['!!','!'],['??','?']
  ];
  for(const [from,to] of pairs){
    const { count, locations } = countOccurrences(content, from);
    if(count>0){ terms.push({ from, to, count, locations }); }
  }
  const dupRegex = /\b([A-Za-z]+)\s+\1\b|([\u4e00-\u9fff])\s+\2/g;
  const seen = new Set();
  const lines = content.split(/\r?\n/);
  for(let i=0;i<lines.length;i++){
    const line = lines[i];
    let m;
    const wordDup = /\b([A-Za-z]+)\s+\1\b/g;
    while((m = wordDup.exec(line))){
      const from = m[0];
      const to = m[1];
      const key = from+"->"+to;
      if(!seen.has(key)){
        const { count, locations } = countOccurrences(content, from);
        terms.push({ from, to, count, locations });
        seen.add(key);
      }
    }
    const cnDup = /([\u4e00-\u9fff])\s+\1/g;
    while((m = cnDup.exec(line))){
      const from = m[0];
      const to = m[1];
      const key = from+"->"+to;
      if(!seen.has(key)){
        const { count, locations } = countOccurrences(content, from);
        terms.push({ from, to, count, locations });
        seen.add(key);
      }
    }
  }
  return { terms };
}

function countOccurrences(text, needle){
  const lines = text.split(/\r?\n/);
  let count = 0; const locations = [];
  for(let i=0;i<lines.length;i++){
    const line = lines[i];
    let idx = line.indexOf(needle);
    if(idx!==-1){
      let c = 0; let start = 0;
      while((idx = line.indexOf(needle, start))!==-1){ c++; start = idx + needle.length; }
      count += c; locations.push({ line: i, count: c });
    }
  }
  return { count, locations };
}

function applyBulk(text, mappings, range){
  const lines = text.split(/\r?\n/);
  if(range && Number.isInteger(range.start) && Number.isInteger(range.end)){
    const start = Math.max(0, range.start);
    const end = Math.min(lines.length - 1, range.end);
    const before = lines.slice(0, start).join('\n');
    const segment = lines.slice(start, end + 1).join('\n');
    const after = lines.slice(end + 1).join('\n');
    let segOut = segment;
    for(const m of (mappings||[])){
      const from = m.from||''; const to = m.to||'';
      if(!from) continue;
      const re = new RegExp(escapeReg(from), 'g');
      segOut = segOut.replace(re, to);
    }
    const out = [before, segOut, after].filter(Boolean).join('\n');
    return { text: out };
  } else {
    let out = text;
    for(const m of (mappings||[])){
      const from = m.from||''; const to = m.to||'';
      if(!from) continue;
      const re = new RegExp(escapeReg(from), 'g');
      out = out.replace(re, to);
    }
    return { text: out };
  }
}

function escapeReg(s){
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { suggest, applyBulk };