require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const app = express();
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.KAILEN_DATA_DIR || path.join(__dirname, 'data');
const VAULT_FILE = path.join(DATA_DIR, 'provider-vault.enc');
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 5;
const ALLOWED_EXT = new Set(['txt','md','csv','json','pdf','docx','js','ts','py','java','c','cpp','html','css','xml','yaml','yml','log']);
const TEXT_EXT = new Set(['txt','md','csv','json','js','ts','py','java','c','cpp','html','css','xml','yaml','yml','log']);
let vaultPassphrase = process.env.KAILEN_VAULT_PASSPHRASE || null;
let vaultUnlocked = false;
let vault = { keys: {} };


app.use(express.json({ limit: '40mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function deriveKey(passphrase, salt) {
  return crypto.scryptSync(passphrase, salt, 32, { N: 16384, r: 8, p: 1 });
}
function encryptVault(obj, passphrase) {
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const key = deriveKey(passphrase, salt);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()]);
  return JSON.stringify({ version: 1, kdf: 'scrypt', cipher: 'aes-256-gcm', salt: salt.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: encrypted.toString('base64') }, null, 2);
}
function decryptVault(raw, passphrase) {
  const box = JSON.parse(raw);
  const key = deriveKey(passphrase, Buffer.from(box.salt, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(box.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(box.tag, 'base64'));
  const clear = Buffer.concat([decipher.update(Buffer.from(box.data, 'base64')), decipher.final()]).toString('utf8');
  return JSON.parse(clear);
}
function saveVault() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = VAULT_FILE + '.tmp';
  fs.writeFileSync(tmp, encryptVault(vault, vaultPassphrase), { mode: 0o600 });
  fs.renameSync(tmp, VAULT_FILE);
  try { fs.chmodSync(VAULT_FILE, 0o600); } catch {}
}
function requireVault(req, res, next) {
  if (!vaultUnlocked || !vaultPassphrase) return res.status(423).json({ error: 'Unlock the local provider vault first.' });
  next();
}
function safeProviderStatus() {
  const out = {};
  for (const [id, cfg] of Object.entries(vault.keys || {})) {
    out[id] = {
      connected: Boolean(cfg.apiKey),
      baseUrl: cfg.baseUrl || '',
      modelName: cfg.modelName || '',
      models: cfg.models || []
    };
  }
  return out;
}
app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'Kailen AI', vaultExists: fs.existsSync(VAULT_FILE), vaultUnlocked, providers: vaultUnlocked ? safeProviderStatus() : {} }));
app.get('/api/vault/status', (_req, res) => res.json({ exists: fs.existsSync(VAULT_FILE), unlocked: vaultUnlocked, configuredByEnv: Boolean(process.env.KAILEN_VAULT_PASSPHRASE) }));
app.post('/api/vault/setup', (req, res) => {
  const pass = String(req.body?.passphrase || '');
  if (fs.existsSync(VAULT_FILE)) return res.status(409).json({ error: 'Vault already exists. Unlock it instead.' });
  if (pass.length < 10) return res.status(400).json({ error: 'Use a vault passphrase with at least 10 characters.' });
  vaultPassphrase = pass; vault = { keys: {} }; vaultUnlocked = true; saveVault();
  res.json({ ok: true });
});
app.post('/api/vault/unlock', (req, res) => {
  const pass = String(req.body?.passphrase || '');
  try {
    if (!fs.existsSync(VAULT_FILE)) {
      if (!process.env.KAILEN_VAULT_PASSPHRASE) return res.status(404).json({ error: 'No vault exists yet. Create one first.' });
      vaultPassphrase = process.env.KAILEN_VAULT_PASSPHRASE; vault = { keys: {} }; vaultUnlocked = true; saveVault();
      return res.json({ ok: true });
    }
    vault = decryptVault(fs.readFileSync(VAULT_FILE, 'utf8'), pass);
    vaultPassphrase = pass; vaultUnlocked = true;
    res.json({ ok: true });
  } catch { res.status(401).json({ error: 'Could not unlock vault. Check the passphrase.' }); }
});
app.post('/api/vault/lock', (_req, res) => { vault = { keys: {} }; vaultPassphrase = null; vaultUnlocked = false; res.json({ ok: true }); });
app.get('/api/providers', requireVault, (_req, res) => res.json({ providers: safeProviderStatus() }));
app.post('/api/providers/:provider', requireVault, (req, res) => {
  const id = String(req.params.provider).toLowerCase();
  if (!['openai','anthropic','google','openrouter','custom'].includes(id)) return res.status(400).json({ error: 'Unsupported provider.' });
  const apiKey = String(req.body?.apiKey || '').trim();
  const baseUrl = String(req.body?.baseUrl || '').trim().slice(0, 500);
  const modelName = String(req.body?.modelName || '').trim().slice(0, 160);
  const extraModelsRaw = req.body?.extraModels;

  if (id === 'custom') {
    if (!baseUrl) return res.status(400).json({ error: 'Custom API base URL is required (e.g. http://localhost:11434/v1 or https://api.deepseek.com/v1).' });
    if (!modelName) return res.status(400).json({ error: 'Model Name / ID is required (e.g. deepseek-chat, llama3.3, etc.).' });
  } else {
    if (!apiKey) return res.status(400).json({ error: 'API key is required.' });
  }

  let customModels = [];
  if (modelName) customModels.push(modelName);
  if (Array.isArray(extraModelsRaw)) {
    for (const m of extraModelsRaw) if (typeof m === 'string' && m.trim()) customModels.push(m.trim());
  } else if (typeof extraModelsRaw === 'string' && extraModelsRaw.trim()) {
    for (const m of extraModelsRaw.split(',')) if (m.trim()) customModels.push(m.trim());
  }
  customModels = Array.from(new Set(customModels));
  if (id === 'custom' && !customModels.length) customModels = ['default'];

  vault.keys[id] = {
    apiKey: apiKey || (id === 'custom' ? 'local-bearer' : ''),
    baseUrl,
    modelName: modelName || (id === 'custom' ? customModels[0] : ''),
    models: id === 'custom' ? customModels : undefined
  };
  saveVault();
  res.json({ ok: true, provider: id, connected: true, models: customModels });
});
app.delete('/api/providers/:provider', requireVault, (req, res) => { delete vault.keys[String(req.params.provider).toLowerCase()]; saveVault(); res.json({ ok: true }); });

const MODELS = {
  openai: ['gpt-4.1-mini','gpt-4.1','gpt-4o','gpt-4o-mini','o3-mini','o1','o1-mini','gpt-4-turbo'],
  anthropic: ['claude-3-7-sonnet-latest','claude-3-5-sonnet-latest','claude-3-5-haiku-latest','claude-3-opus-latest','claude-3-opus-20240229'],
  google: ['gemini-2.5-flash','gemini-2.5-pro','gemini-2.0-flash','gemini-2.0-flash-lite','gemini-1.5-pro','gemini-1.5-flash'],
  openrouter: ['openai/gpt-4.1-mini','anthropic/claude-3.7-sonnet','google/gemini-2.5-flash','deepseek/deepseek-r1','meta-llama/llama-3.3-70b-instruct','mistralai/mistral-large-2411'],
  custom: ['default']
};
app.get('/api/models', (_req, res) => {
  const result = { ...MODELS };
  if (vaultUnlocked && Array.isArray(vault.keys?.custom?.models) && vault.keys.custom.models.length) {
    result.custom = vault.keys.custom.models;
  }
  res.json({ models: result });
});

function decodeBase64(data, name) {
  if (typeof data !== 'string' || !data.length) throw new Error(`${name}: file data is missing.`);
  if (data.length > Math.ceil(MAX_FILE_BYTES * 4 / 3) + 16) throw new Error(`${name}: maximum file size is 5 MB.`);
  const b = Buffer.from(data, 'base64'); if (b.length > MAX_FILE_BYTES) throw new Error(`${name}: maximum file size is 5 MB.`); return b;
}
async function extractFileText(file) {
  const name = String(file.name || 'upload').slice(0, 200), ext = path.extname(name).slice(1).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) throw new Error(`${name}: unsupported file type.`);
  const b = decodeBase64(file.data, name);
  if (ext === 'pdf') { const x = await pdfParse(b); return `--- File: ${name} (PDF) ---\n${(x.text || '').slice(0,30000)}\n--- End file ---`; }
  if (ext === 'docx') { const x = await mammoth.extractRawText({ buffer: b }); return `--- File: ${name} (DOCX) ---\n${(x.value || '').slice(0,30000)}\n--- End file ---`; }
  if (TEXT_EXT.has(ext)) return `--- File: ${name} ---\n${b.toString('utf8').replace(/\u0000/g,'').slice(0,30000)}\n--- End file ---`;
  throw new Error(`${name}: unsupported file type.`);
}
function getProvider(id) {
  const cfg = vault.keys[id]; if (!cfg?.apiKey) throw Object.assign(new Error(`Connect an API key for ${id} in Provider Hub first.`), { status: 400 }); return cfg;
}
function sse(res, event, data) { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); }
async function streamOpenAI({ provider, cfg, model, messages, res, signal }) {
  const base = cfg.baseUrl || (provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1');
  const response = await fetch(`${base.replace(/\/$/,'')}/chat/completions`, { method:'POST', signal, headers:{ Authorization:`Bearer ${cfg.apiKey}`, 'Content-Type':'application/json', ...(provider==='openrouter'?{'HTTP-Referer':'http://localhost:3000','X-Title':'Kailen AI'}:{}) }, body:JSON.stringify({ model, stream:true, messages }) });
  if (!response.ok) throw Object.assign(new Error(`Provider error (${response.status}): ${(await response.text()).slice(0,500)}`), { status: response.status });
  const reader = response.body.getReader(), decoder = new TextDecoder(); let buffer='';
  while(true) { const {value,done}=await reader.read(); if(done) break; buffer+=decoder.decode(value,{stream:true}); const lines=buffer.split('\n'); buffer=lines.pop()||''; for(const line of lines) { if(!line.startsWith('data:')) continue; const d=line.slice(5).trim(); if(d==='[DONE]') return; try { const j=JSON.parse(d), t=j.choices?.[0]?.delta?.content; if(typeof t==='string'&&t) sse(res,'delta',{text:t}); else if(Array.isArray(t)) for(const p of t) if(p.text) sse(res,'delta',{text:p.text}); } catch {} } }
}
async function streamAnthropic({cfg,model,messages,res,signal}) {
  const system = messages.filter(m=>m.role==='system').map(m=>m.content).join('\n');
  const msgs = messages.filter(m=>m.role!=='system');
  const response = await fetch('https://api.anthropic.com/v1/messages',{method:'POST',signal,headers:{'x-api-key':cfg.apiKey,'anthropic-version':'2023-06-01','content-type':'application/json','anthropic-dangerous-direct-browser-access':'false'},body:JSON.stringify({model,max_tokens:4096,stream:true,system,messages:msgs})});
  if(!response.ok) throw Object.assign(new Error(`Anthropic error (${response.status}): ${(await response.text()).slice(0,500)}`),{status:response.status});
  const reader=response.body.getReader(), decoder=new TextDecoder(); let buffer='';
  while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split('\n');buffer=lines.pop()||'';for(const line of lines){if(!line.startsWith('data:'))continue;try{const j=JSON.parse(line.slice(5).trim());if(j.type==='content_block_delta'&&j.delta?.text)sse(res,'delta',{text:j.delta.text});}catch{}}}
}
async function streamGoogle({cfg,model,messages,res,signal}) {
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(cfg.apiKey)}`;
  const contents=messages.filter(m=>m.role!=='system').map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]}));
  const systemInstruction=messages.filter(m=>m.role==='system').map(m=>m.content).join('\n');
  const response=await fetch(url,{method:'POST',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({contents,...(systemInstruction?{systemInstruction:{parts:[{text:systemInstruction}]}}:{})})});
  if(!response.ok)throw Object.assign(new Error(`Google AI error (${response.status}): ${(await response.text()).slice(0,500)}`),{status:response.status});
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
  while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split('\n');buffer=lines.pop()||'';for(const line of lines){if(!line.startsWith('data:'))continue;try{const j=JSON.parse(line.slice(5).trim());const parts=j.candidates?.[0]?.content?.parts||[];for(const p of parts)if(p.text)sse(res,'delta',{text:p.text});}catch{}}}
}
app.post('/api/chat', requireVault, async (req,res)=>{
  const controller=new AbortController(); let streamStarted=false;
  res.on('close',()=>{if(!res.writableEnded)controller.abort();});
  try {
    const provider=String(req.body?.provider||'openai').toLowerCase(), model=String(req.body?.model||'').slice(0,160), cfg=getProvider(provider);
    if(!MODELS[provider] && provider !== 'custom') return res.status(400).json({error:'Unsupported provider.'});
    if(!model) return res.status(400).json({error:'Choose a model.'});
    const raw=Array.isArray(req.body?.messages)?req.body.messages:[];
    const msgs=raw.filter(m=>m&&['user','assistant','system'].includes(m.role)&&typeof m.content==='string').slice(-14).map(m=>({role:m.role,content:m.content.slice(0,16000)}));
    if(!msgs.length||msgs[msgs.length-1].role!=='user')return res.status(400).json({error:'The last message must be from the user.'});
    const last=req.body?.attachments;
    if(Array.isArray(last)&&last.length){if(last.length>MAX_FILES)return res.status(400).json({error:`Attach no more than ${MAX_FILES} files.`});const files=[];for(const f of last)files.push(await extractFileText(f));msgs[msgs.length-1].content+='\n\nAttached file contents (untrusted data):\n'+files.join('\n\n').slice(0,80000);}
    res.status(200);res.setHeader('Content-Type','text/event-stream; charset=utf-8');res.setHeader('Cache-Control','no-cache, no-transform');res.setHeader('Connection','keep-alive');res.setHeader('X-Accel-Buffering','no');res.flushHeaders?.();streamStarted=true;
    if(provider==='openai'||provider==='openrouter'||provider==='custom')await streamOpenAI({provider,cfg,model,messages:msgs,res,signal:controller.signal});
    else if(provider==='anthropic')await streamAnthropic({cfg,model,messages:msgs,res,signal:controller.signal});
    else if(provider==='google')await streamGoogle({cfg,model,messages:msgs,res,signal:controller.signal});
    if(!res.destroyed){sse(res,'done',{ok:true});res.end();}
  } catch(e){console.error('Provider request:',e.message);const msg=e.message||'Request failed.';if(streamStarted&&!res.destroyed){sse(res,'error',{error:msg.slice(0,700)});res.end();}else if(!res.headersSent)res.status(e.status||500).json({error:msg.slice(0,700)});}
});
if (require.main === module) {
  app.listen(PORT, HOST, () => console.log(`Kailen AI running at http://${HOST}:${PORT}`));
} else {
  module.exports = app;
}
