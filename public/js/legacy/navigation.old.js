(function(){
  function jumpToLine(app, line){
    var content = app.elements.markdownEditor.value || '';
    var lines = content.split(/\r?\n/);
    var clamp = Math.max(1, Math.min(line, lines.length));
    var idx = 0; for(var i=0;i<clamp-1;i++){ idx += lines[i].length + 1; }
    app.elements.markdownEditor.focus();
    app.elements.markdownEditor.setSelectionRange(idx, idx);
    app.elements.markdownEditor.scrollTop = app.elements.markdownEditor.scrollHeight * (clamp/lines.length);
  }

  function getCurrentLineIndex(app){
    var pos = app.elements.markdownEditor.selectionStart || 0;
    var text = app.elements.markdownEditor.value || '';
    var count = 0; for(var i=0;i<pos;i++){ if(text.charAt(i)==='\n') count++; }
    return count;
  }

  function jumpPrev(app){
    var st = (app.state.lastAnalyzeData && app.state.lastAnalyzeData.structure) || app.parseOutlineFromContent();
    var sections = st.sections || []; var cur = getCurrentLineIndex(app); var prev = null;
    for(var i=0;i<sections.length;i++){
      if(sections[i].range.start <= cur && sections[i].range.end >= cur){ if(i>0) prev = sections[i-1]; break; }
      if(sections[i].range.start < cur) prev = sections[i];
    }
    if(prev){ jumpToLine(app, prev.range.start+1); if(app.updateStatus) app.updateStatus('已跳转到上一板块'); return true; }
    return false;
  }

  function jumpNext(app){
    var st = (app.state.lastAnalyzeData && app.state.lastAnalyzeData.structure) || app.parseOutlineFromContent();
    var sections = st.sections || []; var cur = getCurrentLineIndex(app);
    for(var i=0;i<sections.length;i++){ if(sections[i].range.start > cur){ jumpToLine(app, sections[i].range.start+1); if(app.updateStatus) app.updateStatus('已跳转到下一板块'); return true; } }
    return false;
  }

  function bindButtons(app, sec){
    var prevBtn = document.getElementById('btnJumpPrevSection');
    var nextBtn = document.getElementById('btnJumpNextSection');
    var endBtn = document.getElementById('btnJumpToSectionEnd');
    if(prevBtn) prevBtn.onclick = function(){ jumpPrev(app); };
    if(nextBtn) nextBtn.onclick = function(){ jumpNext(app); };
    if(endBtn) endBtn.onclick = function(){ jumpToLine(app, sec.range.end+1); };
    updateHotkeys(app);
  }

  function updateHotkeys(app){
    var enabled = !app.state.settings || app.state.settings.enableHotkeys;
    if(enabled && !app._navKeysBound){
      app._navKeyHandler = function(e){
        if(e.altKey && e.key==='ArrowUp'){ e.preventDefault(); jumpPrev(app); }
        if(e.altKey && e.key==='ArrowDown'){ e.preventDefault(); jumpNext(app); }
      };
      document.addEventListener('keydown', app._navKeyHandler);
      app._navKeysBound = true;
    } else if(!enabled && app._navKeysBound){
      document.removeEventListener('keydown', app._navKeyHandler);
      app._navKeysBound = false;
      app._navKeyHandler = null;
    }
  }

  window.SectionNav = { jumpToLine: jumpToLine, jumpPrev: jumpPrev, jumpNext: jumpNext, bindButtons: bindButtons, updateHotkeys: updateHotkeys };
})();