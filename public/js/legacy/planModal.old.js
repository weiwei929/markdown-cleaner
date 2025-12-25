(function(){
  function open(app, data, sec){
    var el = app.elements.planContent;
    var title = Array(sec.level+1).join('#') + ' ' + (sec.heading || '(空)') + ' · 行 ' + (sec.range.start + 1) + '-' + (sec.range.end + 1);
    var html = '';
    html += "<div class='issues-summary'>";
    html += "<div class='summary-line'><strong>修复计划</strong></div>";
    html += "<div class='summary-line'>范围：" + (data.scope === 'section' ? title : '全局') + "</div>";
    html += "<div class='summary-line'>选择优先级：" + ((data.selectedPriorities||[]).join(', ') || '无') + "</div>";
    html += "<div class='summary-line'>估算：安全 " + data.estimate.safe + " · 建议 " + data.estimate.suggested + " · 警告 " + data.estimate.warning + "</div>";
    html += "</div>";
    html += "<div class='compare-content'><div class='compare-side original'><pre id='planPreviewOriginal'></pre></div><div class='compare-side processed'><pre id='planPreviewProcessed'></pre></div></div>";
    el.innerHTML = html;
    app.state.lastPlanData = data;
    app.state.lastPlanSection = sec;
    app.elements.planModal.style.display = 'block';
    app.elements.planBackdrop.style.display = 'block';
    document.body.classList.add('modal-open');
    requestPreview(app);
  }

  function close(app){
    app.elements.planModal.style.display = 'none';
    app.elements.planBackdrop.style.display = 'none';
    document.body.classList.remove('modal-open');
  }

  function renderPreviewDiff(orig, proc){
    function esc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    var oLines = (orig||'').split(/\r?\n/), pLines = (proc||'').split(/\r?\n/);
    var m = Math.max(oLines.length, pLines.length), oHTML = '', pHTML = '';
    for(var i=0;i<m;i++){
      var o = oLines[i] || '', p = pLines[i] || '';
      if(o === p){ oHTML += esc(o) + "\n"; pHTML += esc(p) + "\n"; continue; }
      // 简易字词级差异：前后缀相同，中间差异高亮
      var prefix = 0; var minLen = Math.min(o.length, p.length);
      while(prefix < minLen && o.charAt(prefix) === p.charAt(prefix)) prefix++;
      var oRem = o.length - prefix, pRem = p.length - prefix;
      var suffix = 0;
      while(suffix < oRem && suffix < pRem && o.charAt(o.length - 1 - suffix) === p.charAt(p.length - 1 - suffix)) suffix++;
      var oMid = o.substring(prefix, o.length - suffix);
      var pMid = p.substring(prefix, p.length - suffix);
      var oLine = esc(o.substring(0, prefix)) + (oMid ? "<mark class='diff-del-inline'>" + esc(oMid) + "</mark>" : '') + esc(o.substring(o.length - suffix));
      var pLine = esc(p.substring(0, prefix)) + (pMid ? "<mark class='diff-add-inline'>" + esc(pMid) + "</mark>" : '') + esc(p.substring(p.length - suffix));
      oHTML += oLine + "\n"; pHTML += pLine + "\n";
    }
    return { originalHTML: oHTML, processedHTML: pHTML };
  }

  async function requestPreview(app){
    try{
      var content = app.elements.markdownEditor.value || '';
      var sec = app.state.lastPlanSection;
      var plan = { selectedPriorities: (app.state.lastPlanData && app.state.lastPlanData.selectedPriorities) || ['SAFE','SUGGESTED'] };
      if(sec && sec.heading !== '全局') plan.sectionRange = sec.range;
      var resp = await fetch('/api/preview-fixes', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ content: content, plan: plan }) });
      var result = await resp.json();
      if(!result.success) throw new Error(result.error||'预览生成失败');
      var mode = (app.state.settings && app.state.settings.diffMode) || 'token';
      var diff = mode==='line' ? renderLineDiff(result.data.originalSegment||'', result.data.processedSegment||'') : renderTokenDiff(result.data.originalSegment||'', result.data.processedSegment||'');
      document.getElementById('planPreviewOriginal').innerHTML = diff.originalHTML;
      document.getElementById('planPreviewProcessed').innerHTML = diff.processedHTML;
    }catch(e){ app.showError('预览生成失败: '+e.message); }
  }

  function renderLineDiff(orig, proc){
    function esc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    var o = (orig||'').split(/\r?\n/), p = (proc||'').split(/\r?\n/);
    var m = Math.max(o.length, p.length), oh = '', ph = '';
    for(var i=0;i<m;i++){
      var ol = esc(o[i]||''), pl = esc(p[i]||'');
      if(ol===pl){ oh += ol + "\n"; ph += pl + "\n"; }
      else { oh += "<span class='diff-del'>"+ol+"</span>\n"; ph += "<span class='diff-add'>"+pl+"</span>\n"; }
    }
    return { originalHTML: oh, processedHTML: ph };
  }

  function tokenize(s){
    var out = [], i = 0; var len = s.length;
    while(i < len){
      var ch = s.charAt(i);
      if(/\s/.test(ch)){ out.push(ch); i++; continue; }
      if(/[\u4e00-\u9fff]/.test(ch)){ out.push(ch); i++; continue; }
      if(/[A-Za-z0-9]/.test(ch)){
        var j = i+1; while(j < len && /[A-Za-z0-9]/.test(s.charAt(j))) j++;
        out.push(s.slice(i,j)); i = j; continue;
      }
      out.push(ch); i++;
    }
    return out;
  }

  function renderTokenDiff(orig, proc){
    function esc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    var oLines = (orig||'').split(/\r?\n/), pLines = (proc||'').split(/\r?\n/);
    var m = Math.max(oLines.length, pLines.length), oHTML = '', pHTML = '';
    for(var i=0;i<m;i++){
      var o = oLines[i] || '', p = pLines[i] || '';
      if(o === p){ oHTML += esc(o) + "\n"; pHTML += esc(p) + "\n"; continue; }
      var ot = tokenize(o), pt = tokenize(p);
      var prefix = 0; var minLen = Math.min(ot.length, pt.length);
      while(prefix < minLen && ot[prefix] === pt[prefix]) prefix++;
      var oRem = ot.length - prefix, pRem = pt.length - prefix;
      var suffix = 0;
      while(suffix < oRem && suffix < pRem && ot[ot.length - 1 - suffix] === pt[pt.length - 1 - suffix]) suffix++;
      var oMid = ot.slice(prefix, ot.length - suffix).map(esc).join('');
      var pMid = pt.slice(prefix, pt.length - suffix).map(esc).join('');
      var oStart = ot.slice(0, prefix).map(esc).join('');
      var oEnd = suffix ? ot.slice(ot.length - suffix).map(esc).join('') : '';
      var pStart = ot.slice(0, prefix).map(esc).join('');
      var pEnd = suffix ? pt.slice(pt.length - suffix).map(esc).join('') : '';
      var oLine = oStart + (oMid ? "<mark class='diff-del-inline'>" + oMid + "</mark>" : '') + oEnd;
      var pLine = pStart + (pMid ? "<mark class='diff-add-inline'>" + pMid + "</mark>" : '') + pEnd;
      oHTML += oLine + "\n"; pHTML += pLine + "\n";
    }
    return { originalHTML: oHTML, processedHTML: pHTML };
  }

  async function applySafe(app){
    try{
      var content = app.elements.markdownEditor.value || '';
      var sec = app.state.lastPlanSection; if(!sec){ app.showError('无可应用的板块范围'); return; }
      var resp = await fetch('/api/apply-fixes', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ content: content, plan:{ selectedPriorities:['SAFE'], sectionRange: sec.range } }) });
      var result = await resp.json(); if(!result.success) throw new Error(result.error||'应用失败');
      app.state.processedContent = result.data.text; app.elements.markdownEditor.value = app.state.processedContent;
      app.updateCompareView(); app.elements.compareTab.style.display='block'; app.switchTab('compare'); app.updateUI(); app.updateStatus('已应用 SAFE 到该板块');
    }catch(e){ app.showError('应用失败: '+e.message); } finally{ close(app); }
  }

  async function applySuggested(app){
    try{
      var content = app.elements.markdownEditor.value || '';
      var sec = app.state.lastPlanSection; if(!sec){ app.showError('无可应用的板块范围'); return; }
      var confirmed = window.confirm('应用建议修复可能影响排版，确认仅对该板块应用吗？'); if(!confirmed) return;
      var resp = await fetch('/api/apply-fixes', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ content: content, plan:{ selectedPriorities:['SUGGESTED'], sectionRange: sec.range } }) });
      var result = await resp.json(); if(!result.success) throw new Error(result.error||'应用失败');
      app.state.processedContent = result.data.text; app.elements.markdownEditor.value = app.state.processedContent;
      app.updateCompareView(); app.elements.compareTab.style.display='block'; app.switchTab('compare'); app.updateUI(); app.updateStatus('已应用 SUGGESTED 到该板块');
    }catch(e){ app.showError('应用失败: '+e.message); } finally{ close(app); }
  }

  function exportPlanJson(app){
    try{
      var data = app.state.lastPlanData, sec = app.state.lastPlanSection; if(!data||!sec){ app.showError('无可导出的计划'); return; }
      var planJson = { section:{ heading: sec.heading, level: sec.level, range: sec.range }, selectedPriorities: data.selectedPriorities, estimate: data.estimate };
      var blob = new Blob([JSON.stringify(planJson,null,2)], { type:'application/json' });
      var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href=url; a.download='fix-plan.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function(){ URL.revokeObjectURL(url); },100);
      app.updateStatus('修复计划 JSON 已导出');
    }catch(e){ app.showError('导出失败: '+e.message); }
  }

  window.PlanModal = { open: open, close: close, requestPreview: requestPreview, applySafe: applySafe, applySuggested: applySuggested, exportPlanJson: exportPlanJson };
})();