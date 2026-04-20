
(function(){
  var saved = localStorage.getItem('arbitres_hb_theme');
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if(saved === 'dark' || (saved === null && prefersDark)){
    document.documentElement.style.setProperty('--bg-app','#0f1117');
    document.documentElement.className = 'dark-init';
  }
})();
