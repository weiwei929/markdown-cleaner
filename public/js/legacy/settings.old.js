(function(){
  var defaultSettings = { enableHotkeys: false, diffMode: 'token', mode: 'basic' };
  function load(){
    try{ var s = localStorage.getItem('mdCleanerSettings'); if(!s) return { ...defaultSettings }; var obj = JSON.parse(s); return Object.assign({}, defaultSettings, obj); }catch(e){ return { ...defaultSettings }; }
  }
  function save(settings){ try{ localStorage.setItem('mdCleanerSettings', JSON.stringify(settings||{})); }catch(e){} }
  function apply(app){ app.state.settings = load(); }
  window.Settings = { load: load, save: save, apply: apply };
})();