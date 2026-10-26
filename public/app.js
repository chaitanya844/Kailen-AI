const $ = id => document.getElementById(id);
const KAILEN_LOGO_SVG = '<svg class="kailen-logo" viewBox="0 0 100 100" fill="currentColor" aria-hidden="true"><path class="kailen-part-one" d="M 43 14 L 43 74.5 L 52.5 74.5 L 52.5 86 L 24.5 86 L 24.5 74.5 L 32.5 74.5 L 32.5 30.5 L 21 39 L 21 27.5 L 33 14 Z"/><path class="kailen-part-chevron" d="M 47.5 50 L 71 14 L 84.5 14 L 61 50 L 84.5 86 L 71 86 Z"/></svg>';
const PROVIDERS = {
 openai:{name:'OpenAI',mark:'O',desc:'GPT models through the OpenAI API.',hint:'sk-…'},
 anthropic:{name:'Anthropic',mark:'A',desc:'Claude models through the Anthropic API.',hint:'sk-ant-…'},
 google:{name:'Google Gemini',mark:'G',desc:'Gemini models through Google AI Studio.',hint:'AIza…'},
 openrouter:{name:'OpenRouter',mark:'R',desc:'A single API for models from many providers.',hint:'sk-or-…'},
 custom:{name:'OpenAI-compatible API',mark:'↗',desc:'Connect a compatible endpoint with a custom base URL.',hint:'API key'}
};
const DEFAULT_MODELS = {
  openai: ['gpt-4.1-mini','gpt-4.1','gpt-4o','gpt-4o-mini','o3-mini','o1','o1-mini','gpt-4-turbo'],
  anthropic: ['claude-3-7-sonnet-latest','claude-3-5-sonnet-latest','claude-3-5-haiku-latest','claude-3-opus-latest','claude-3-opus-20240229'],
  google: ['gemini-2.5-flash','gemini-2.5-pro','gemini-2.0-flash','gemini-2.0-flash-lite','gemini-1.5-pro','gemini-1.5-flash'],
  openrouter: ['openai/gpt-4.1-mini','anthropic/claude-3.7-sonnet','google/gemini-2.5-flash','deepseek/deepseek-r1','meta-llama/llama-3.3-70b-instruct','mistralai/mistral-large-2411'],
  custom: ['default']
};
const MODEL_META = {
  'gemini-2.5-flash': { badge: 'Recommended', desc: 'Fast, next-gen multimodal with high intelligence' },
  'gemini-2.5-pro': { badge: 'Flagship', desc: 'State-of-the-art reasoning, coding, and complex analysis' },
  'gemini-2.0-flash': { badge: 'Realtime', desc: 'Ultra-low latency streaming and multimodal speed' },
  'gemini-2.0-flash-lite': { badge: 'Lightweight', desc: 'High-speed, cost-efficient everyday tasks' },
  'gemini-1.5-pro': { badge: 'Deep Context', desc: '2M context window for massive documents and analysis' },
  'gemini-1.5-flash': { badge: 'Versatile', desc: 'Fast multimodal model for general workloads' },

  'claude-3-7-sonnet-latest': { badge: 'Hybrid Reasoning', desc: 'Frontier hybrid reasoning and software engineering' },
  'claude-3-5-sonnet-latest': { badge: 'Benchmark', desc: 'Industry-leading coding, reasoning, and visual analysis' },
  'claude-3-5-haiku-latest': { badge: 'Blazing Fast', desc: 'Lightning-fast responses with high intelligence' },
  'claude-3-opus-latest': { badge: 'Maximum Depth', desc: 'Deep synthesis, writing, and nuanced reasoning' },
  'claude-3-opus-20240229': { badge: 'Opus Classic', desc: 'Complex writing and philosophical depth' },

  'gpt-4.1-mini': { badge: 'Recommended', desc: 'Next-gen smart and fast workhorse model' },
  'gpt-4.1': { badge: 'Flagship', desc: 'Advanced general intelligence and deep reasoning' },
  'gpt-4o': { badge: 'Multimodal', desc: 'High-intelligence flagship multimodal model' },
  'gpt-4o-mini': { badge: 'Fast', desc: 'Affordable, low-latency intelligent model' },
  'o3-mini': { badge: 'Math & Code', desc: 'Specialized reasoning for STEM, math, and code' },
  'o1': { badge: 'Deep Thinking', desc: 'Full reasoning model for hard problems' },
  'o1-mini': { badge: 'Fast Reasoning', desc: 'Lightweight reasoning model for STEM tasks' },
  'gpt-4-turbo': { badge: 'Turbo', desc: 'High-accuracy GPT-4 Turbo model' },

  'openai/gpt-4.1-mini': { badge: 'OpenRouter', desc: 'GPT-4.1-mini routed via OpenRouter' },
  'anthropic/claude-3.7-sonnet': { badge: 'OpenRouter', desc: 'Claude 3.7 Sonnet routed via OpenRouter' },
  'google/gemini-2.5-flash': { badge: 'OpenRouter', desc: 'Gemini 2.5 Flash routed via OpenRouter' },
  'deepseek/deepseek-r1': { badge: 'Reasoning', desc: 'DeepSeek R1 open-weights reasoning model' },
  'meta-llama/llama-3.3-70b-instruct': { badge: 'Open Weights', desc: 'Meta Llama 3.3 70B open model' },
  'mistralai/mistral-large-2411': { badge: 'Mistral', desc: 'Flagship European frontier model' }
};

let providerSelectedModels = {
  google: 'gemini-2.5-flash',
  anthropic: 'claude-3-7-sonnet-latest',
  openai: 'gpt-4.1-mini',
  openrouter: 'google/gemini-2.5-flash',
  custom: 'default'
};
try {
  const savedMap = JSON.parse(localStorage.getItem('kailen-provider-models') || '{}');
  providerSelectedModels = { ...providerSelectedModels, ...savedMap };
} catch {}

let userAddedModels = {};
try {
  userAddedModels = JSON.parse(localStorage.getItem('kailen-user-models') || '{}');
} catch {}

function getModelsForProvider(pId) {
  const base = models[pId] || DEFAULT_MODELS[pId] || ['default'];
  const userList = userAddedModels[pId] || [];
  return Array.from(new Set([...base, ...userList]));
}

let unlocked=false, providerStatuses={}, models=DEFAULT_MODELS, selectedProvider='openai', selectedModel='gpt-4.1-mini', chats=[], activeChat=null, pendingFiles=[], controller=null, activeKeyProvider='openai', activeModalProvider='openai', toastTimer;

try {
  const savedP = localStorage.getItem('kailen-selected-provider');
  if (savedP && PROVIDERS[savedP]) selectedProvider = savedP;
  const savedM = localStorage.getItem('kailen-selected-model');
  if (savedM) selectedModel = savedM;
  else if (providerSelectedModels[selectedProvider]) selectedModel = providerSelectedModels[selectedProvider];
} catch {}
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2500)}
function setTheme(theme){document.documentElement.dataset.theme=theme;try{localStorage.setItem('kailen-theme',theme)}catch{} $('themeIcon').textContent=theme==='dark'?'☀':'☾';$('themeLabel').textContent=theme==='dark'?'Light mode':'Dark mode';const themeSelect=$('settingTheme');if(themeSelect)themeSelect.value=theme;}
function switchThemeWithRipple(nextTheme, trigger) {
  const currentTheme = document.documentElement.dataset.theme || 'dark';
  if (nextTheme === currentTheme) return;

  const toggleBtn = $('themeToggle');
  if (toggleBtn) {
    toggleBtn.classList.remove('theme-toggle-ripple');
    void toggleBtn.offsetWidth;
    toggleBtn.classList.add('theme-toggle-ripple');
    setTimeout(() => toggleBtn.classList.remove('theme-toggle-ripple'), 600);
  }

  const applyThemeUpdate = () => {
    setTheme(nextTheme);
    if (typeof applyKailenSettings === 'function') {
      applyKailenSettings(getKailenSettings());
    }
  };

  const reduceMotion = document.documentElement.dataset.reduceMotion === 'true' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion || typeof document.startViewTransition !== 'function') {
    applyThemeUpdate();
    return;
  }

  let x = window.innerWidth;
  let y = 0;
  if (trigger && typeof trigger.clientX === 'number' && trigger.clientX > 0) {
    x = trigger.clientX;
    y = trigger.clientY;
  } else {
    const el = (trigger && trigger.nodeType === 1) ? trigger : toggleBtn;
    if (el) {
      const rect = el.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }
  }

  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  const transition = document.startViewTransition(() => {
    applyThemeUpdate();
  });

  transition.ready.then(() => {
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`
        ]
      },
      {
        duration: 520,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        pseudoElement: '::view-transition-new(root)'
      }
    );
  }).catch(() => {
    applyThemeUpdate();
  });
}
setTheme((()=>{try{return localStorage.getItem('kailen-theme')||'dark'}catch{return'dark'}})());
$('themeToggle').onclick=(e)=>{
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  switchThemeWithRipple(next, e);
};

// Personalised, time-aware welcome on the main workspace.
// Name is editable in the browser via localStorage key "kailen-user-name".
function updateWelcomeGreeting(){
  const title = $('greetingTitle');
  const subtitle = $('greetingSubtitle');
  if (!title || !subtitle) return;
  let name = 'Chaitanya';
  try {
    const saved = localStorage.getItem('kailen-user-name');
    if (saved && saved.trim()) name = saved.trim().slice(0, 60);
  } catch {}
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  // Build the heading with DOM nodes so the saved display name is never treated as HTML.
  const nameAccent = document.createElement('span');
  nameAccent.className = 'greeting-name';
  nameAccent.textContent = name;
  title.replaceChildren(document.createTextNode(`${greeting}, `), nameAccent, document.createTextNode('.'));
  subtitle.textContent = 'Your AI workspace is ready. What would you like to do today?';
}
updateWelcomeGreeting();

// -----------------------------------------------------------
// Settings & preferences
// Preferences live in localStorage for this Windows profile.
// Secrets are not stored here; API keys remain in the encrypted vault.
// -----------------------------------------------------------
const KAILEN_SETTINGS_KEY = 'kailen-settings-v1';
const DEFAULT_KAILEN_SETTINGS = {
  compact:false, reduceMotion:false, enterToSend:true, homeOverview:true, confirmClear:true,
  accent:'auto', themePreset:'midnight', customAccent:'', customBackground:'',
  surfaceOpacity:84, glassBlur:10, roundness:16, fontScale:100, backgroundGlow:true
};
const KAILEN_THEME_PRESETS = {
  midnight:{dark:{bg:'#0b1020',panel:'#182238',panel2:'#202e47',text:'#f5f7ff',muted:'#a8b6cc',subtle:'#71819a',border:'#36425a',accent:'#6594ff',accent2:'#9a7bff'},light:{bg:'#eff3fa',panel:'#ffffff',panel2:'#e8eef8',text:'#1c2638',muted:'#5d6b82',subtle:'#7d899e',border:'#d8e0ec',accent:'#386ce5',accent2:'#7956dc'}},
  graphite:{dark:{bg:'#101316',panel:'#20252a',panel2:'#2a3036',text:'#f5f6f7',muted:'#b2b9c2',subtle:'#828b96',border:'#3c454e',accent:'#b8c7d9',accent2:'#809bbd'},light:{bg:'#f0f2f4',panel:'#ffffff',panel2:'#e9edf1',text:'#232a32',muted:'#626e7b',subtle:'#85909c',border:'#d6dce2',accent:'#526b86',accent2:'#738ba6'}},
  aurora:{dark:{bg:'#081619',panel:'#13292b',panel2:'#1b383a',text:'#f0fffc',muted:'#a3c7c2',subtle:'#6f9992',border:'#315452',accent:'#43d6b4',accent2:'#6bb7ed'},light:{bg:'#eaf6f2',panel:'#fbfffd',panel2:'#e2f1ec',text:'#18322e',muted:'#52756d',subtle:'#789890',border:'#cce3dc',accent:'#108c78',accent2:'#3a83bc'}},
  forest:{dark:{bg:'#101a14',panel:'#1c2b21',panel2:'#28392c',text:'#f5faef',muted:'#b6c6b4',subtle:'#829981',border:'#3a5040',accent:'#91d48b',accent2:'#d4c77a'},light:{bg:'#eef4eb',panel:'#fcfff9',panel2:'#e5eee0',text:'#213426',muted:'#617662',subtle:'#889a88',border:'#d3e1cf',accent:'#35814b',accent2:'#9a812a'}},
  amethyst:{dark:{bg:'#151023',panel:'#251c38',panel2:'#322547',text:'#faf5ff',muted:'#c1b4d6',subtle:'#8e7ea7',border:'#4b3b62',accent:'#ae8bff',accent2:'#e0a6ef'},light:{bg:'#f3eef9',panel:'#fffaff',panel2:'#ece4f5',text:'#30223d',muted:'#766185',subtle:'#9888a8',border:'#ded1eb',accent:'#7952c9',accent2:'#b14eac'}},
  sand:{dark:{bg:'#1d1813',panel:'#30271e',panel2:'#403326',text:'#fff7eb',muted:'#d0bda6',subtle:'#a18b73',border:'#564534',accent:'#e8b56d',accent2:'#d68c70'},light:{bg:'#f6f0e6',panel:'#fffdf8',panel2:'#efe5d6',text:'#34291e',muted:'#76614c',subtle:'#9a826b',border:'#e2d3bd',accent:'#b7772a',accent2:'#b75d48'}}
};
function getKailenSettings(){try{return {...DEFAULT_KAILEN_SETTINGS,...(JSON.parse(localStorage.getItem(KAILEN_SETTINGS_KEY)||'{}')||{})}}catch{return {...DEFAULT_KAILEN_SETTINGS}}}
function saveKailenSettings(patch){const next={...getKailenSettings(),...patch};try{localStorage.setItem(KAILEN_SETTINGS_KEY,JSON.stringify(next))}catch{}applyKailenSettings(next);return next}
function hexRgb(hex){const c=String(hex||'').replace('#','');if(!/^[0-9a-fA-F]{6}$/.test(c))return {r:24,g:34,b:56};return {r:parseInt(c.slice(0,2),16),g:parseInt(c.slice(2,4),16),b:parseInt(c.slice(4,6),16)}}
function rgbaHex(hex,a){const c=hexRgb(hex);return `rgba(${c.r}, ${c.g}, ${c.b}, ${Math.max(0,Math.min(1,a))})`}
function applyKailenTheme(settings=getKailenSettings()){
 const root=document.documentElement,preset=KAILEN_THEME_PRESETS[settings.themePreset]||KAILEN_THEME_PRESETS.midnight;
 const palette=root.dataset.theme==='light'?preset.light:preset.dark;
 const choices={auto:[palette.accent,palette.accent2],blue:['#6594ff','#9a7bff'],violet:['#9b7aff','#c18cff'],mint:['#3dc9a2','#72e1c1'],rose:['#ec83ad','#b28aff']};
 const pair=choices[settings.accent]||choices.auto,accent=settings.customAccent||pair[0],accent2=settings.customAccent||pair[1],bg=settings.customBackground||palette.bg;
 const opacity=Math.max(.45,Math.min(1,Number(settings.surfaceOpacity??84)/100));
 const blur=Math.max(0,Math.min(24,Number(settings.glassBlur??10)));
 const radius=Math.max(8,Math.min(26,Number(settings.roundness??16)));
 const scale=Math.max(.9,Math.min(1.15,Number(settings.fontScale??100)/100));
 root.dataset.themePreset=settings.themePreset||'midnight';
 root.dataset.backgroundGlow=settings.backgroundGlow===false?'false':'true';
 root.style.setProperty('--bg',bg);
 root.style.setProperty('--panel-solid',palette.panel);
 root.style.setProperty('--panel',rgbaHex(palette.panel,opacity));
 root.style.setProperty('--panel-2',rgbaHex(palette.panel2,Math.min(1,opacity+.05)));
 root.style.setProperty('--text',palette.text);root.style.setProperty('--muted',palette.muted);root.style.setProperty('--subtle',palette.subtle);
 root.style.setProperty('--border',rgbaHex(palette.border,root.dataset.theme==='light'?.75:.8));
 root.style.setProperty('--accent',accent);root.style.setProperty('--accent2',accent2);
 root.style.setProperty('--blur',`blur(${blur}px)`);
 root.style.setProperty('--ui-radius',`${radius}px`);
 root.style.setProperty('--control-radius',`${Math.max(6,Math.round(radius*.65))}px`);
 root.style.setProperty('--font-scale',String(scale));
 const colorAccent=$('settingCustomAccent');if(colorAccent)colorAccent.value=settings.customAccent||accent;
 const colorBg=$('settingCustomBackground');if(colorBg)colorBg.value=settings.customBackground||bg;
 for(const [id,val,out,suffix] of [
  ['settingSurfaceOpacity',settings.surfaceOpacity,'settingSurfaceOpacityValue','%'],
  ['settingGlassBlur',settings.glassBlur,'settingGlassBlurValue',' px'],
  ['settingRoundness',settings.roundness,'settingRoundnessValue',' px'],
  ['settingFontScale',settings.fontScale,'settingFontScaleValue','%']
 ]){if($(id))$(id).value=val;if($(out))$(out).value=String(val)+suffix}
 document.querySelectorAll('[data-theme-preset]').forEach(b=>{const on=b.dataset.themePreset===(settings.themePreset||'midnight');b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on))});
 const accentSel=$('settingAccent');if(accentSel)accentSel.value=settings.accent||'auto';
}
function applyKailenSettings(settings=getKailenSettings()){
 const root=document.documentElement;root.dataset.density=settings.compact?'compact':'comfortable';root.dataset.reduceMotion=settings.reduceMotion?'true':'false';
 applyKailenTheme(settings);
 const pulse=document.querySelector('.workspace-pulse'),footnote=document.querySelector('.workspace-footnote');
 if(pulse)pulse.classList.toggle('hidden',settings.homeOverview===false);if(footnote)footnote.classList.toggle('hidden',settings.homeOverview===false);
 for(const [id,key] of [['settingCompact','compact'],['settingReduceMotion','reduceMotion'],['settingEnterToSend','enterToSend'],['settingHomeOverview','homeOverview'],['settingConfirmClear','confirmClear'],['settingBackgroundGlow','backgroundGlow']])if($(id))$(id).checked=Boolean(settings[key]);
 if($('settingTheme'))$('settingTheme').value=document.documentElement.dataset.theme||'dark';
 if($('settingDisplayName')&&document.activeElement!==$('settingDisplayName')){let n='Chaitanya';try{n=localStorage.getItem('kailen-user-name')||'Chaitanya'}catch{}$('settingDisplayName').value=n}
}
function initializeSettings(){
  const settings=getKailenSettings();
  applyKailenSettings(settings);

  const bindToggle=(id,key)=>{const el=$(id);if(el)el.addEventListener('change',()=>{saveKailenSettings({[key]:el.checked});toast('Preference saved')})};
  bindToggle('settingCompact','compact');
  bindToggle('settingReduceMotion','reduceMotion');
  bindToggle('settingEnterToSend','enterToSend');
  bindToggle('settingHomeOverview','homeOverview');
  bindToggle('settingConfirmClear','confirmClear');

  $('settingTheme').addEventListener('change',e=>{switchThemeWithRipple(e.target.value, e.target);toast('Theme updated')});
  $('settingAccent').addEventListener('change',e=>saveKailenSettings({accent:e.target.value,customAccent:''}));

  document.querySelectorAll('[data-theme-preset]').forEach(button=>button.addEventListener('click',()=>{
    saveKailenSettings({themePreset:button.dataset.themePreset,accent:'auto',customAccent:'',customBackground:''});
    toast(`${button.querySelector('strong')?.textContent||'Theme'} palette applied`);
  }));
  $('settingCustomAccent').addEventListener('input',e=>saveKailenSettings({customAccent:e.target.value}));
  $('settingCustomBackground').addEventListener('input',e=>saveKailenSettings({customBackground:e.target.value}));
  const bindRange=(id,key)=>$(id).addEventListener('input',e=>saveKailenSettings({[key]:Number(e.target.value)}));
  bindRange('settingSurfaceOpacity','surfaceOpacity');bindRange('settingGlassBlur','glassBlur');
  bindRange('settingRoundness','roundness');bindRange('settingFontScale','fontScale');
  bindToggle('settingBackgroundGlow','backgroundGlow');
  $('settingResetTheme').addEventListener('click',e=>{
    switchThemeWithRipple('dark', e.target);
    saveKailenSettings({themePreset:'midnight',accent:'auto',customAccent:'',customBackground:'',surfaceOpacity:84,glassBlur:10,roundness:16,fontScale:100,backgroundGlow:true});
    toast('Appearance reset to defaults');
  });
  $('settingSaveName').addEventListener('click',()=>{
    const value=$('settingDisplayName').value.trim().slice(0,60);
    if(!value){toast('Enter a display name first');return}
    try{localStorage.setItem('kailen-user-name',value)}catch{}
    updateWelcomeGreeting();
    toast('Display name saved');
  });
  $('settingDisplayName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('settingSaveName').click()}});
  $('settingsExportChats').addEventListener('click',exportConversationArchive);
  $('settingsLockVault').addEventListener('click',()=>$('lockVault').click());
  $('settingsClearChats').addEventListener('click',()=>{
    if(!chats.length){toast('There are no saved conversations');return}
    clearAllConversations();
  });
  $('settingsClearUsage').addEventListener('click',()=>{
    if(!confirm('Reset all local usage estimates? This will not change provider billing.'))return;
    try{localStorage.removeItem(NEURAL_STORAGE)}catch{}
    renderNeuralHub();toast('Local usage estimates reset');
  });
}
function exportConversationArchive(){
  const payload={
    application:'Kailen AI',
    exportedAt:new Date().toISOString(),
    note:'This archive contains locally saved conversations, not API keys.',
    conversations:chats
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;
  a.download=`kailen-ai-conversations-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast('Conversation archive exported');
}
initializeSettings();

function saveChats(){try{localStorage.setItem('kailen-chats',JSON.stringify(chats.slice(-40)))}catch{toast('Browser storage is full; export important chats.')}updateUsage()}
function loadChats(){try{chats=JSON.parse(localStorage.getItem('kailen-chats')||'[]')}catch{chats=[]}renderChatList();updateUsage()}
function updateUsage(){
 $('conversationCount').textContent=chats.length;
 const settingsChatCount=$('settingsConversationCount');if(settingsChatCount)settingsChatCount.textContent=chats.length;
 const settingsVaultStatus=$('settingsVaultStatus');if(settingsVaultStatus)settingsVaultStatus.textContent=unlocked?'Unlocked':'Locked';
 const connectedCount=Object.values(providerStatuses).filter(x=>x.connected).length;
 $('connectedCount').textContent=connectedCount;
 $('usageVault').textContent=unlocked?'Unlocked':'Locked';
 const homeConnected=$('homeConnectedStat');
 if(homeConnected)homeConnected.textContent=connectedCount;
 const homeModels=$('homeModelStat');
 if(homeModels)homeModels.textContent=Object.values(models||DEFAULT_MODELS).reduce((sum,list)=>sum+(Array.isArray(list)?list.length:0),0);
 const homeVault=$('homeVaultStat');
 if(homeVault)homeVault.textContent=unlocked?'Unlocked':'Locked';
 const homeVaultHint=$('homeVaultHint');
 if(homeVaultHint)homeVaultHint.textContent=unlocked?'Protected':'Local-first';
}
async function api(url,options={}){const r=await fetch(url,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||`Request failed (${r.status})`);return data}
function showVaultModal(mode){$('vaultModal').classList.remove('hidden');$('vaultError').textContent='';$('vaultPassphrase').value='';const setup=mode==='setup';$('vaultModalTitle').textContent=setup?'Create your local vault':'Unlock your vault';$('vaultModalDescription').textContent=setup?'Choose a strong passphrase. It encrypts your provider API keys on this computer.':'Enter your passphrase to decrypt provider keys on this computer.';$('vaultPassphrase').autocomplete=setup?'new-password':'current-password';$('vaultPassphrase').minLength=setup?10:1;$('vaultPassHelp').textContent=setup?'Use at least 10 characters. Losing this passphrase means losing access to the encrypted keys.':'Your passphrase is used locally to decrypt the vault.';$('vaultSubmit').innerHTML=(setup?'Create encrypted vault':'Unlock vault')+' <span>→</span>';$('vaultForm').dataset.mode=mode;setTimeout(()=>$('vaultPassphrase').focus(),80)}
async function initVault(){try{const s=await api('/api/vault/status');if(s.exists){showVaultModal('unlock')}else showVaultModal('setup')}catch(e){toast(e.message)}}
$('vaultForm').addEventListener('submit',async e=>{e.preventDefault();const mode=$('vaultForm').dataset.mode,passphrase=$('vaultPassphrase').value;$('vaultError').textContent='';try{await api(mode==='setup'?'/api/vault/setup':'/api/vault/unlock',{method:'POST',body:JSON.stringify({passphrase})});unlocked=true;$('vaultModal').classList.add('hidden');$('vaultStatusText').textContent='Vault unlocked';$('vaultDot').classList.add('online');$('providerVaultBadge').textContent='Vault unlocked';await refreshProviders();toast(mode==='setup'?'Encrypted vault created':'Vault unlocked')}catch(err){$('vaultError').textContent=err.message}});
$('lockVault').onclick=async()=>{if(!unlocked)return showVaultModal('unlock');try{await api('/api/vault/lock',{method:'POST'});unlocked=false;providerStatuses={};$('vaultStatusText').textContent='Vault locked';$('vaultDot').classList.remove('online');$('providerVaultBadge').textContent='Vault locked';renderProviders();updateUsage();showVaultModal('unlock');toast('Vault locked')}catch(e){toast(e.message)}};
async function refreshProviders(){if(!unlocked)return;try{const p=await api('/api/providers');providerStatuses=p.providers;renderProviders();updateUsage();const connected=Object.keys(providerStatuses).find(k=>providerStatuses[k].connected);if(connected&&!providerStatuses[selectedProvider]?.connected){selectedProvider=connected;selectedModel=(models[selectedProvider]||DEFAULT_MODELS[selectedProvider])[0]}updateModelUI()}catch(e){toast(e.message)}}
async function loadModels(){try{const d=await api('/api/models');models=d.models||DEFAULT_MODELS}catch{models=DEFAULT_MODELS}}
function renderCustomModelCard(){
  const customStatus = providerStatuses.custom;
  const isConn = Boolean(customStatus?.connected);
  const title = $('customCardTitle');
  const sub = $('customCardSubtitle');
  const urlTag = $('customTagUrl');
  const modelTag = $('customTagModel');
  const rmBtn = $('btnRemoveCustomModel');
  const editBtn = $('btnEditCustomModel');
  const connBtn = $('btnConnectCustomModel');
  const selBtn = $('btnSelectCustomModel');

  if(isConn){
    const activeModel = customStatus.modelName || models.custom?.[0] || 'default';
    if(title) title.textContent = `Custom Model: ${activeModel}`;
    if(sub) sub.textContent = `Connected to ${customStatus.baseUrl || 'custom endpoint'}. Ready to chat.`;
    if(urlTag) urlTag.textContent = customStatus.baseUrl || 'None';
    if(modelTag) modelTag.textContent = (customStatus.models?.length ? customStatus.models.join(', ') : activeModel);
    if(rmBtn) rmBtn.classList.remove('hidden');
    if(editBtn) editBtn.textContent = 'Edit Configuration';
    if(connBtn) connBtn.innerHTML = '<span>⚙</span> Edit Custom Model';
  } else {
    if(title) title.textContent = 'Custom OpenAI-Compatible Model';
    if(sub) sub.textContent = 'Not configured yet. Connect a local or cloud endpoint with your desired model name.';
    if(urlTag) urlTag.textContent = 'None';
    if(modelTag) modelTag.textContent = 'None';
    if(rmBtn) rmBtn.classList.add('hidden');
    if(editBtn) editBtn.textContent = 'Configure Model';
    if(connBtn) connBtn.innerHTML = '<span>＋</span> Connect Custom Model';
  }

  if(connBtn) connBtn.onclick = () => openKeyModal('custom');
  if(editBtn) editBtn.onclick = () => openKeyModal('custom');
  if(rmBtn) rmBtn.onclick = () => removeProvider('custom');
  if(selBtn) selBtn.onclick = () => {
    if(!isConn){ openKeyModal('custom'); return; }
    selectedProvider = 'custom';
    selectedModel = (models.custom || [customStatus.modelName || 'default'])[0];
    updateModelUI();
    showView('chat');
    toast(`Using Custom model: ${selectedModel}`);
  };
}
function renderProviders(){
  renderNeuralHub();
  renderCustomModelCard();
  const grid=$('providerGrid');
  grid.innerHTML='';
  for(const [id,p] of Object.entries(PROVIDERS)){
    const connected=Boolean(providerStatuses[id]?.connected);
    const activeM = (selectedProvider === id) ? selectedModel : (providerSelectedModels[id] || (models[id] || DEFAULT_MODELS[id] || ['default'])[0]);
    const card=document.createElement('article');
    card.className='provider-card';
    card.innerHTML=`<div class="provider-card-top"><div class="provider-logo">${p.mark}</div><div><h3>${p.name}</h3><p>${p.desc}</p></div><span class="provider-state">${connected?'● Connected':'○ Not connected'}</span></div><div class="provider-card-current-model"><span>Active model:</span><strong>${escapeHTML(activeM)}</strong></div><div class="provider-card-actions"><button class="small-btn primary" data-action="connect">${connected?'Replace key':'Connect API key'}</button>${connected?'<button class="small-btn danger" data-action="remove">Remove key</button>':''}<button class="small-btn" data-action="models">Choose Model</button></div>`;
    card.querySelector('[data-action=connect]').onclick=()=>openKeyModal(id);
    const rm=card.querySelector('[data-action=remove]');
    if(rm)rm.onclick=()=>removeProvider(id);
    card.querySelector('[data-action=models]').onclick=()=>openModelModal(id);
    grid.appendChild(card);
  }
  updateModelUI();
  $('providerVaultBadge').textContent=unlocked?'Vault unlocked':'Vault locked';
}
function openKeyModal(id){
  if(!unlocked)return showVaultModal('unlock');
  activeKeyProvider=id;
  const p=PROVIDERS[id];
  $('keyProviderMark').textContent=p.mark;
  $('keyModalTitle').textContent=id==='custom'?'Connect Custom AI Model':`Connect ${p.name}`;
  $('keyModalDescription').textContent=id==='custom'?'Connect your local or cloud OpenAI-compatible endpoint with custom model identifiers.':p.desc;

  const customGroup = $('customModelGroup');
  const baseUrlLabel = $('baseUrlLabel');
  const baseUrlHelp = $('baseUrlHelp');
  const baseUrlInput = $('baseUrlInput');
  const apiKeyReq = $('apiKeyReq');
  const apiKeyHelp = $('apiKeyHelp');
  const apiKeyInput = $('apiKeyInput');
  const customModelNameInput = $('customModelNameInput');
  const customExtraModelsInput = $('customExtraModelsInput');

  if (id === 'custom') {
    if (customGroup) customGroup.classList.remove('hidden');
    if (customModelNameInput) customModelNameInput.value = providerStatuses.custom?.modelName || (models.custom?.[0] !== 'default' ? models.custom?.[0] : '') || '';
    if (customExtraModelsInput) customExtraModelsInput.value = (providerStatuses.custom?.models || models.custom || []).slice(1).join(', ');
    if (baseUrlLabel) baseUrlLabel.innerHTML = 'API Base URL <span class="required">*</span>';
    if (baseUrlHelp) baseUrlHelp.textContent = 'Endpoint base URL (e.g. http://localhost:11434/v1 for Ollama, https://api.deepseek.com/v1 for DeepSeek).';
    if (baseUrlInput) { baseUrlInput.required = true; baseUrlInput.placeholder = 'http://localhost:11434/v1'; }
    if (apiKeyReq) apiKeyReq.classList.add('hidden');
    if (apiKeyHelp) apiKeyHelp.textContent = 'API key is optional for local models (Ollama, LM Studio).';
    if (apiKeyInput) { apiKeyInput.required = false; apiKeyInput.placeholder = 'API key (optional for local endpoints)'; }
  } else {
    if (customGroup) customGroup.classList.add('hidden');
    if (baseUrlLabel) baseUrlLabel.innerHTML = 'Custom base URL <span class="optional">optional</span>';
    if (baseUrlHelp) baseUrlHelp.textContent = "Leave blank to use the provider's default endpoint.";
    if (baseUrlInput) { baseUrlInput.required = false; baseUrlInput.placeholder = 'https://api.example.com/v1'; }
    if (apiKeyReq) apiKeyReq.classList.remove('hidden');
    if (apiKeyHelp) apiKeyHelp.textContent = 'API key is encrypted into your local vault.';
    if (apiKeyInput) { apiKeyInput.required = true; apiKeyInput.placeholder = p.hint; }
  }

  apiKeyInput.value='';
  baseUrlInput.value=providerStatuses[id]?.baseUrl||'';
  $('keyError').textContent='';
  $('keyModal').classList.remove('hidden');
  setTimeout(()=>{
    if(id==='custom'&&customModelNameInput) customModelNameInput.focus();
    else apiKeyInput.focus();
  },50);
}
$('closeKeyModal').onclick=()=>$('keyModal').classList.add('hidden');
$('keyModal').addEventListener('click',e=>{if(e.target===$('keyModal'))$('keyModal').classList.add('hidden')});
$('keyForm').addEventListener('submit',async e=>{
  e.preventDefault();
  $('keyError').textContent='';
  try{
    const payload = {
      apiKey: $('apiKeyInput').value,
      baseUrl: $('baseUrlInput').value
    };
    if (activeKeyProvider === 'custom') {
      const modelName = $('customModelNameInput')?.value.trim();
      if (!modelName) {
        $('keyError').textContent = 'Please enter a Model Name (e.g. deepseek-chat, llama3.3)';
        return;
      }
      payload.modelName = modelName;
      payload.extraModels = $('customExtraModelsInput')?.value || '';
    }
    await api(`/api/providers/${activeKeyProvider}`,{method:'POST',body:JSON.stringify(payload)});
    $('keyModal').classList.add('hidden');
    await loadModels();
    await refreshProviders();
    selectedProvider=activeKeyProvider;
    selectedModel=(models[selectedProvider]||['default'])[0];
    updateModelUI();
    toast(`${PROVIDERS[selectedProvider].name} configured and saved`);
  }catch(err){
    $('keyError').textContent=err.message;
  }
});
async function removeProvider(id){if(!confirm(`Remove the saved ${PROVIDERS[id].name} API key?`))return;try{await api(`/api/providers/${id}`,{method:'DELETE'});await refreshProviders();toast('Provider key removed')}catch(e){toast(e.message)}}
function openModelModal(targetProvider){
  if(!unlocked)return showVaultModal('unlock');
  activeModalProvider = (targetProvider && PROVIDERS[targetProvider]) ? targetProvider : selectedProvider;
  renderModelModal();
  $('modelModal').classList.remove('hidden');
}

function closeModelModal(){
  $('modelModal').classList.add('hidden');
}

function selectModelAndProvider(pId, modelName){
  selectedProvider = pId;
  selectedModel = modelName;
  providerSelectedModels[pId] = modelName;
  try {
    localStorage.setItem('kailen-selected-provider', selectedProvider);
    localStorage.setItem('kailen-selected-model', selectedModel);
    localStorage.setItem('kailen-provider-models', JSON.stringify(providerSelectedModels));
  } catch {}
  updateModelUI();
  renderProviders();
  closeModelModal();
  toast(`Using ${PROVIDERS[pId]?.name || pId} · ${modelName}`);
}

function renderModelModal(){
  const tabsContainer = $('modelModalTabs');
  const statusContainer = $('modelModalProviderStatus');
  const listContainer = $('modelModalList');
  const activeLabel = $('modelModalCurrentActive');

  if (activeLabel) {
    activeLabel.textContent = `${PROVIDERS[selectedProvider]?.name || selectedProvider} · ${selectedModel}`;
  }

  // Render provider tabs
  if (tabsContainer) {
    tabsContainer.innerHTML = '';
    for (const [id, p] of Object.entries(PROVIDERS)) {
      const isConn = Boolean(providerStatuses[id]?.connected);
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = `model-tab-btn ${id === activeModalProvider ? 'active' : ''}`;
      tab.innerHTML = `<span class="tab-dot ${isConn ? 'connected' : ''}"></span><span>${p.name}</span>`;
      tab.onclick = () => {
        activeModalProvider = id;
        renderModelModal();
      };
      tabsContainer.appendChild(tab);
    }
  }

  // Render active provider connection status
  const isConn = Boolean(providerStatuses[activeModalProvider]?.connected);
  const pName = PROVIDERS[activeModalProvider]?.name || activeModalProvider;
  if (statusContainer) {
    statusContainer.innerHTML = `
      <div class="model-provider-status-text">
        <span class="tab-dot ${isConn ? 'connected' : ''}"></span>
        <span>${isConn ? `<strong>${escapeHTML(pName)}</strong> is connected & ready` : `<strong>${escapeHTML(pName)}</strong> is not connected`}</span>
      </div>
      <div>
        ${isConn 
          ? `<button type="button" class="small-btn" id="btnManageCurrentKey">Manage key</button>`
          : `<button type="button" class="small-btn primary" id="btnConnectCurrentKey">Connect key</button>`}
      </div>
    `;
    const btnConn = $('btnConnectCurrentKey') || $('btnManageCurrentKey');
    if (btnConn) {
      btnConn.onclick = () => {
        closeModelModal();
        openKeyModal(activeModalProvider);
      };
    }
  }

  // Render model list
  if (listContainer) {
    listContainer.innerHTML = '';
    const currentList = getModelsForProvider(activeModalProvider);
    for (const m of currentList) {
      const isSelected = (selectedProvider === activeModalProvider && selectedModel === m);
      const meta = MODEL_META[m] || { badge: 'Available', desc: `Model option for ${pName}` };
      const card = document.createElement('div');
      card.className = `model-card-item ${isSelected ? 'selected' : ''}`;
      card.setAttribute('role', 'button');
      card.tabIndex = 0;
      card.innerHTML = `
        <div class="model-card-info">
          <div class="model-card-name-row">
            <span class="model-card-name">${escapeHTML(m)}</span>
            ${meta.badge ? `<span class="model-badge">${escapeHTML(meta.badge)}</span>` : ''}
            ${isSelected ? `<span class="model-badge" style="background:var(--accent);color:#fff">ACTIVE</span>` : ''}
          </div>
          <div class="model-card-desc">${escapeHTML(meta.desc)}</div>
        </div>
        <div class="model-card-check">${isSelected ? '✓' : ''}</div>
      `;
      card.onclick = () => {
        selectModelAndProvider(activeModalProvider, m);
      };
      card.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectModelAndProvider(activeModalProvider, m);
        }
      };
      listContainer.appendChild(card);
    }
  }

  // Setup custom model input
  const input = $('customModelInput');
  if (input) {
    input.value = '';
    input.placeholder = `e.g. custom ${pName} model ID`;
  }
}

// Modal event listeners
const closeModelBtn = $('closeModelModal');
if (closeModelBtn) closeModelBtn.onclick = closeModelModal;
const modelModalEl = $('modelModal');
if (modelModalEl) {
  modelModalEl.addEventListener('click', e => {
    if (e.target === modelModalEl) closeModelModal();
  });
}
const customModelForm = $('customModelBar');
if (customModelForm) {
  customModelForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = $('customModelInput')?.value.trim();
    if (!val) return;
    if (!userAddedModels[activeModalProvider]) userAddedModels[activeModalProvider] = [];
    if (!userAddedModels[activeModalProvider].includes(val)) {
      userAddedModels[activeModalProvider].push(val);
      try {
        localStorage.setItem('kailen-user-models', JSON.stringify(userAddedModels));
      } catch {}
    }
    selectModelAndProvider(activeModalProvider, val);
  });
}

function updateModelUI(){
  const connected = Boolean(providerStatuses[selectedProvider]?.connected);
  const pName = PROVIDERS[selectedProvider]?.name || selectedProvider;
  const chip = $('selectedModelChip');
  if (chip) {
    chip.innerHTML = connected 
      ? `<span>${escapeHTML(pName)} · <strong>${escapeHTML(selectedModel)}</strong></span> <span>⌄</span>` 
      : `<span>Connect a provider ⌄</span>`;
    chip.title = `Active: ${pName} / ${selectedModel} (click to change)`;
  }
  const topP = $('topProvider');
  if (topP) {
    topP.innerHTML = connected 
      ? `<span>${escapeHTML(pName)} · ${escapeHTML(selectedModel)} ⌄</span>` 
      : `<span>Connect a provider ⌄</span>`;
  }
}

const selChip = $('selectedModelChip');
if (selChip) selChip.onclick = () => openModelModal(selectedProvider);
const topProv = $('topProvider');
if (topProv) topProv.onclick = () => openModelModal(selectedProvider);
function showView(view){$('chatView').classList.toggle('hidden',view!=='chat');$('providersView').classList.toggle('hidden',view!=='providers');$('usageView').classList.toggle('hidden',view!=='usage');$('settingsView').classList.toggle('hidden',view!=='settings');document.querySelectorAll('.nav-item[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$('topTitle').textContent=view==='chat'?'Unified workspace':view==='providers'?'Provider hub':view==='usage'?'Usage & status':'Settings';$('sidebar').classList.remove('open');if(view==='providers')renderProviders();if(view==='usage'||view==='settings')updateUsage()}
document.querySelectorAll('.nav-item[data-view]').forEach(b=>b.onclick=()=>showView(b.dataset.view));$('openSidebar').onclick=()=>$('sidebar').classList.add('open');$('closeSidebar').onclick=()=>$('sidebar').classList.remove('open');
function renderChatList(){const list=$('chatList');list.innerHTML='';if(!chats.length){list.innerHTML='<div class="empty-small">Your conversations will appear here.</div>';return}for(const c of [...chats].reverse()){const b=document.createElement('button');b.className='chat-item'+(c.id===activeChat?' active':'');b.textContent=c.title||'New conversation';b.title=b.textContent;b.onclick=()=>openChat(c.id);list.appendChild(b)}}
function newChat(){activeChat=null;$('messages').innerHTML='';$('welcome').classList.remove('hidden');pendingFiles=[];renderAttachments();renderChatList();$('promptInput').focus();showView('chat')}function clearAllConversations(){const settings=getKailenSettings();if(settings.confirmClear!==false&&!confirm('Clear all saved conversations from this browser?'))return;chats=[];activeChat=null;saveChats();renderChatList();$('messages').innerHTML='';$('welcome').classList.remove('hidden');updateUsage();toast('Conversation history cleared')} $('newChat').onclick=newChat;$('clearChats').onclick=clearAllConversations;
function openChat(id){const c=chats.find(x=>x.id===id);if(!c)return;activeChat=id;$('messages').innerHTML='';$('welcome').classList.add('hidden');for(const m of c.messages)addMessage(m.role,m.content,false);renderChatList();showView('chat')}
function getChat(){let c=chats.find(x=>x.id===activeChat);if(!c){c={id:cryptoRandomId(),title:'New conversation',messages:[]};chats.push(c);activeChat=c.id}return c}function cryptoRandomId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
function safeMarkdown(text){if(!window.marked||!window.DOMPurify)return escapeHTML(text).replace(/\n/g,'<br>');return DOMPurify.sanitize(marked.parse(text))}function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function decorateCode(root){root.querySelectorAll('pre').forEach(pre=>{if(pre.parentElement.classList.contains('code-wrap'))return;const code=pre.querySelector('code');if(code&&window.hljs)try{hljs.highlightElement(code)}catch{}const lang=(code?.className.match(/language-([\w+-]+)/)||[])[1]||'CODE';const wrap=document.createElement('div');wrap.className='code-wrap';pre.parentNode.insertBefore(wrap,pre);const top=document.createElement('div');top.className='code-top';const label=document.createElement('span');label.textContent=lang.toUpperCase();const btn=document.createElement('button');btn.className='copy-code';btn.textContent='Copy code';btn.onclick=async()=>{try{await navigator.clipboard.writeText(code?.textContent||pre.textContent);btn.textContent='Copied!'}catch{btn.textContent='Copy unavailable'}setTimeout(()=>btn.textContent='Copy code',1300)};top.append(label,btn);wrap.append(top,pre)})}
function addMessage(role,content,save=true){const el=document.createElement('article');el.className='message '+role;if(role==='user'){const bubble=document.createElement('div');bubble.className='bubble';bubble.textContent=content;el.appendChild(bubble)}else{el.innerHTML=`<div class="assistant-head"><span class="assistant-avatar">${KAILEN_LOGO_SVG}</span><span>Kailen AI</span></div><div class="assistant-content"></div><div class="message-actions"><button data-act="copy">Copy answer</button><button data-act="regen">Regenerate</button></div>`;const area=el.querySelector('.assistant-content');area.innerHTML=safeMarkdown(content);decorateCode(area);el.querySelector('[data-act=copy]').onclick=async()=>{try{await navigator.clipboard.writeText(content);toast('Answer copied')}catch{toast('Clipboard unavailable')}};el.querySelector('[data-act=regen]').onclick=()=>regenerate()}$('messages').appendChild(el);$('messages').scrollTop=$('messages').scrollHeight;return el}
function renderAttachments(){const tray=$('attachmentTray');tray.innerHTML='';pendingFiles.forEach((f,i)=>{const chip=document.createElement('span');chip.className='attachment-chip';chip.textContent=`📎 ${f.name}`;const b=document.createElement('button');b.textContent='×';b.onclick=()=>{pendingFiles.splice(i,1);renderAttachments()};chip.appendChild(b);tray.appendChild(chip)});$('fileHint').textContent=pendingFiles.length?`${pendingFiles.length} file(s) attached`:'Files are sent to the selected provider'}
$('fileInput').addEventListener('change',async e=>{const files=Array.from(e.target.files||[]);if(pendingFiles.length+files.length>5){toast('Maximum 5 files per message');e.target.value='';return}for(const f of files){if(f.size>5*1024*1024){toast(`${f.name} exceeds 5 MB`);continue}const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=reject;r.readAsDataURL(f)});pendingFiles.push({name:f.name,size:f.size,data})}renderAttachments();e.target.value=''});
$('promptInput').addEventListener('input',()=>{const t=$('promptInput');t.style.height='auto';t.style.height=Math.min(t.scrollHeight,180)+'px'});$('promptInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&getKailenSettings().enterToSend!==false){e.preventDefault();sendMessage()}});$('sendBtn').onclick=sendMessage;$('stopBtn').onclick=()=>{controller?.abort();controller=null;$('stopBtn').classList.add('hidden');$('sendBtn').classList.remove('hidden');toast('Response stopped')};document.querySelectorAll('.quick-card').forEach(b=>b.onclick=()=>{$('promptInput').value=b.dataset.prompt;$('promptInput').focus()});
async function sendMessage(override){if(!unlocked){showVaultModal('unlock');return}if(!providerStatuses[selectedProvider]?.connected){showView('providers');toast('Connect an API key first');return}const text=typeof override==='string'?override:$('promptInput').value.trim();if(!text&&!pendingFiles.length)return;const c=getChat();if(!c.messages.length)c.title=(text||pendingFiles[0]?.name||'New conversation').slice(0,48);const fileMeta=pendingFiles.map(f=>({name:f.name,size:f.size}));c.messages.push({role:'user',content:text+(fileMeta.length?'\n\nAttachments: '+fileMeta.map(f=>f.name).join(', '):'')});$('welcome').classList.add('hidden');addMessage('user',text+(fileMeta.length?'\n\n📎 '+fileMeta.map(f=>f.name).join(', '):''),false);$('promptInput').value='';$('promptInput').style.height='auto';const files=pendingFiles;pendingFiles=[];renderAttachments();renderChatList();saveChats();const assistantEl=document.createElement('article');assistantEl.className='message assistant';assistantEl.innerHTML=`<div class="assistant-head"><span class="assistant-avatar">${KAILEN_LOGO_SVG}</span><span>Kailen AI · ${escapeHTML(PROVIDERS[selectedProvider].name)} / ${escapeHTML(selectedModel)}</span></div><div class="assistant-content"> <span class="typing">Thinking…</span></div>`;const area=assistantEl.querySelector('.assistant-content');$('messages').appendChild(assistantEl);$('messages').scrollTop=$('messages').scrollHeight;$('sendBtn').classList.add('hidden');$('stopBtn').classList.remove('hidden');$('topLogoBtn')?.classList.add('ai-receiving');controller=new AbortController();let answer='';try{const body={provider:selectedProvider,model:selectedModel,messages:c.messages.filter(m=>!m.content.startsWith('Attachments:')).map(m=>({role:m.role,content:m.content})),attachments:files};const usageProvider=selectedProvider, usageModel=selectedModel, usageInput=body.messages.map(m=>m.content).join('\n')+files.map(f=>f.name).join(' ');const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});if(!response.ok){const er=await response.json().catch(()=>({}));throw new Error(er.error||`Request failed (${response.status})`)}const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const chunks=buffer.split('\n\n');buffer=chunks.pop()||'';for(const chunk of chunks){const event=chunk.match(/^event: (.+)$/m)?.[1];const dat=chunk.match(/^data: (.+)$/m)?.[1];if(!dat)continue;let payload;try{payload=JSON.parse(dat)}catch{continue}if(event==='delta'){answer+=payload.text;area.innerHTML=safeMarkdown(answer);$('messages').scrollTop=$('messages').scrollHeight}else if(event==='error')throw new Error(payload.error||'Provider stream failed')}}if(!answer)answer='The provider returned an empty response.';area.innerHTML=safeMarkdown(answer);decorateCode(area);assistantEl.insertAdjacentHTML('beforeend','<div class="message-actions"><button data-act="copy">Copy answer</button><button data-act="regen">Regenerate</button></div>');assistantEl.querySelector('[data-act=copy]').onclick=async()=>{try{await navigator.clipboard.writeText(answer);toast('Answer copied')}catch{toast('Clipboard unavailable')}};assistantEl.querySelector('[data-act=regen]').onclick=()=>regenerate();c.messages.push({role:'assistant',content:answer});recordNeuralUsage(usageProvider,usageModel,usageInput,answer);saveChats();$('topLogoBtn')?.classList.remove('ai-receiving');$('topLogoBtn')?.classList.add('ai-received');setTimeout(()=>$('topLogoBtn')?.classList.remove('ai-received'),1000);}catch(err){if(err.name!=='AbortError'){area.textContent=`Request error: ${err.message}`;toast(err.message)}}finally{controller=null;$('topLogoBtn')?.classList.remove('ai-receiving');$('stopBtn').classList.add('hidden');$('sendBtn').classList.remove('hidden');renderChatList();updateUsage()}}
function regenerate(){const c=chats.find(x=>x.id===activeChat);if(!c)return;const lastUser=[...c.messages].reverse().find(m=>m.role==='user');if(!lastUser)return;const msgs=c.messages;while(msgs.length&&msgs[msgs.length-1].role==='assistant')msgs.pop();saveChats();openChat(c.id);sendMessage(lastUser.content)}
$('topProvider').title='Choose provider and model';$('providerVaultBadge').textContent='Vault locked';
const topLogoBtn=$('topLogoBtn');
if(topLogoBtn){
  topLogoBtn.onclick=()=>{
    topLogoBtn.classList.remove('ai-receiving','ai-received');
    void topLogoBtn.offsetWidth;
    topLogoBtn.classList.add('ai-receiving');
    toast('Kailen AI Active');
    setTimeout(()=>{
      topLogoBtn.classList.remove('ai-receiving');
      topLogoBtn.classList.add('ai-received');
      setTimeout(()=>topLogoBtn.classList.remove('ai-received'),750);
    },2600);
  };
}
(async()=>{loadChats();await loadModels();try{const s=await api('/api/vault/status');if(s.exists)showVaultModal('unlock');else showVaultModal('setup')}catch(e){toast(e.message)}})();

// Local usage telemetry: approximations, not provider billing or exact tokens.
const NEURAL_STORAGE='kailen-neural-usage-v1';
const NEURAL_POS={openai:[190,180],anthropic:[440,95],google:[675,195],openrouter:[560,385],custom:[235,380]};
const NEURAL_COLORS={openai:'#24cfa6',anthropic:'#dca47e',google:'#6b9eff',openrouter:'#a17aff',custom:'#8da3c5'};
let neuralSelected='openai';
function getNeuralData(){try{return JSON.parse(localStorage.getItem(NEURAL_STORAGE))||{}}catch{return {}}}
function setNeuralData(data){try{localStorage.setItem(NEURAL_STORAGE,JSON.stringify(data))}catch{}}
function recordNeuralUsage(id,model,input,output){if(!PROVIDERS[id])return;const data=getNeuralData(),x=data[id]||{calls:0,inputTokens:0,outputTokens:0,models:{},rates:{input:0,output:0}};const i=Math.ceil(input.length/4),o=Math.ceil(output.length/4);x.calls++;x.inputTokens+=i;x.outputTokens+=o;x.models[model]=(x.models[model]||0)+1;x.lastUsed=new Date().toISOString();data[id]=x;setNeuralData(data);if(!$('providersView').classList.contains('hidden'))renderNeuralHub()}
function neuralMoney(n){return '$'+n.toFixed(n<0.01?4:2)}
function neuralCost(x){return ((x.inputTokens||0)*(x.rates?.input||0)+(x.outputTokens||0)*(x.rates?.output||0))/1e6}
function svgEl(tag,attributes={}){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attributes))e.setAttribute(k,String(v));return e}
function renderNeuralHub(){const svg=$('providerNetwork');if(!svg)return;svg.replaceChildren();const data=getNeuralData(),ids=Object.keys(PROVIDERS);const totals=ids.map(id=>(data[id]?.inputTokens||0)+(data[id]?.outputTokens||0)),max=Math.max(1,...totals);
 const defs=svgEl('defs');const glow=svgEl('filter',{id:'neuralGlow',x:'-100%',y:'-100%',width:'300%',height:'300%'});glow.append(svgEl('feGaussianBlur',{stdDeviation:'10'}));defs.append(glow);svg.append(defs);
 for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const a=NEURAL_POS[ids[i]],b=NEURAL_POS[ids[j]];svg.append(svgEl('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],class:'neural-link'}))}
 for(const id of ids){const p=PROVIDERS[id],x=NEURAL_POS[id],n=data[id]||{},connected=Boolean(providerStatuses[id]?.connected),size=33+38*Math.sqrt(((n.inputTokens||0)+(n.outputTokens||0))/max),color=NEURAL_COLORS[id];const g=svgEl('g',{class:'neural-node'+(neuralSelected===id?' selected':''),role:'button',tabindex:'0','aria-label':p.name+' provider details'});g.append(svgEl('circle',{cx:x[0],cy:x[1],r:size+13,fill:color,opacity:connected?'.16':'.045',filter:'url(#neuralGlow)'}));g.append(svgEl('circle',{cx:x[0],cy:x[1],r:size+7,fill:'none',stroke:color,'stroke-opacity':neuralSelected===id?'1':'.24',class:'node-halo'}));g.append(svgEl('circle',{cx:x[0],cy:x[1],r:size,fill:connected?color:'#28334b','fill-opacity':connected?'.26':'.65',stroke:color,'stroke-opacity':connected?'1':'.4','stroke-width':'2',class:'node-core'}));const symbol=svgEl('text',{x:x[0],y:x[1],class:'node-symbol'});symbol.textContent=p.mark;g.append(symbol);const label=svgEl('text',{x:x[0],y:x[1]+size+25,class:'node-label'});label.textContent=p.name;g.append(label);const usage=svgEl('text',{x:x[0],y:x[1]+size+41,class:'node-usage'});usage.textContent=(n.calls||0)+' calls';g.append(usage);g.addEventListener('click',()=>{neuralSelected=id;renderNeuralHub()});g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();neuralSelected=id;renderNeuralHub()}});svg.append(g)}renderNeuralInspector()}
function renderNeuralInspector(){const root=$('providerInspector');if(!root)return;const id=neuralSelected,p=PROVIDERS[id],n=getNeuralData()[id]||{},connected=Boolean(providerStatuses[id]?.connected);root.replaceChildren();root.innerHTML=`<div class="inspector-eyebrow">PROVIDER INTELLIGENCE</div><h2>${escapeHTML(p.name)}</h2><div style="font-size:12px;opacity:.7">${connected?'● Connected':'○ Not connected'} · ${escapeHTML(p.desc)}</div><div class="inspector-stats"><div class="inspector-stat"><small>REQUESTS</small><strong>${n.calls||0}</strong></div><div class="inspector-stat"><small>ESTIMATED SPEND</small><strong>${neuralMoney(neuralCost(n))}</strong></div><div class="inspector-stat"><small>INPUT TOKENS ≈</small><strong>${(n.inputTokens||0).toLocaleString()}</strong></div><div class="inspector-stat"><small>OUTPUT TOKENS ≈</small><strong>${(n.outputTokens||0).toLocaleString()}</strong></div></div><div class="inspector-section"><h3>Model activity</h3><div>${Object.entries(n.models||{}).map(([m,v])=>'<div class="inspector-model">'+escapeHTML(m)+' · '+v+' calls</div>').join('')||'<p>No locally recorded requests yet.</p>'}</div></div><div class="inspector-section"><h3>Estimated pricing (USD per 1M tokens)</h3><div class="inspector-rate"><label>Input rate<input id="neuralInputRate" type="number" min="0" step="0.01" value="${n.rates?.input||0}"></label><label>Output rate<input id="neuralOutputRate" type="number" min="0" step="0.01" value="${n.rates?.output||0}"></label></div><p>Set your own rates; different models may have different prices. This is not an invoice, remaining balance or official billing.</p></div><div class="inspector-section"><h3>Provider billing</h3><p>Open the provider's billing dashboard to verify actual charges. Kailen AI cannot currently fetch account balances or invoices.</p></div><div class="inspector-actions"><button id="neuralConnect">${connected?'Replace API key':'Connect API key'}</button><button id="neuralSelect">Use provider</button><button id="neuralClear">Reset local usage</button></div>`;
 root.querySelectorAll('#neuralInputRate,#neuralOutputRate').forEach(input=>input.addEventListener('change',()=>{const all=getNeuralData(),x=all[id]||{calls:0,inputTokens:0,outputTokens:0,models:{}};x.rates={input:Math.max(0,Number($('neuralInputRate').value)||0),output:Math.max(0,Number($('neuralOutputRate').value)||0)};all[id]=x;setNeuralData(all);renderNeuralInspector()}));$('neuralConnect').onclick=()=>openKeyModal(id);$('neuralSelect').onclick=()=>{if(!connected){toast('Connect this provider first');return}selectedProvider=id;selectedModel=(models[id]||DEFAULT_MODELS[id])[0];updateModelUI();showView('chat')};$('neuralClear').onclick=()=>{if(!confirm('Clear locally estimated usage for '+p.name+'?'))return;const all=getNeuralData();delete all[id];setNeuralData(all);renderNeuralHub()}}
