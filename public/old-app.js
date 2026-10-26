// File-enabled chat frontend. Uploaded text is sent to the backend with the message.
// Conversation records persist in this browser; file bytes are not stored in localStorage.
const $ = s => document.querySelector(s);
const STORAGE_KEY = "chat-clone-upload-conversations-v1", USER_KEY = "chat-clone-upload-user-v1", THEME_KEY = "chat-clone-theme-v1";
const MAX_FILES = 5, MAX_FILE_BYTES = 5 * 1024 * 1024;
let conversations = loadConversations(), currentChatId = null, currentUser = loadUser(), pendingFiles = [], toastTimer, activeController = null;
const ALLOWED_EXT = new Set(["txt","md","csv","json","pdf","docx","js","ts","py","java","c","cpp","html","css","xml","yaml","yml","log"]);
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
function loadConversations(){try{const x=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");return Array.isArray(x)?x:[]}catch{return []}}
function saveConversations(){localStorage.setItem(STORAGE_KEY,JSON.stringify(conversations))}
function loadUser(){try{return JSON.parse(localStorage.getItem(USER_KEY)||"null")}catch{return null}}
function saveUser(u){currentUser=u;u?localStorage.setItem(USER_KEY,JSON.stringify(u)):localStorage.removeItem(USER_KEY);updateProfile()}
function updateProfile(){const n=currentUser?.name||"Guest";$("#profileName").textContent=n;$("#profileAvatar").textContent=n.slice(0,1).toUpperCase();$("#profilePlan").textContent=currentUser?"Demo profile":"Local demo";$("#loginTopBtn").textContent=currentUser?"Account":"Log in";$("#signupTopBtn").classList.toggle("hidden",!!currentUser)}
function toast(m){const e=$("#toast");e.textContent=m;e.classList.remove("hidden");clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.add("hidden"),2800)}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function fmtSize(n){return n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(2)} MB`}
function extOf(name){return (name.split(".").pop()||"").toLowerCase()}
function fileDescriptor(file){return {name:file.name,size:file.size,type:file.type||"application/octet-stream"}}
function createChat(){const c={id:uid(),title:"New chat",messages:[],updatedAt:Date.now()};conversations.unshift(c);currentChatId=c.id;saveConversations();renderChatList();renderConversation();closeSidebarMobile();$("#messageInput").focus()}
function getChat(){return conversations.find(c=>c.id===currentChatId)||null}
function renderChatList(filter=""){const list=$("#chatList");list.innerHTML="";const matches=conversations.filter(c=>c.title.toLowerCase().includes(filter.toLowerCase()));if(!matches.length){list.innerHTML=`<div style="padding:10px;color:#777;font-size:12px">${filter?"No matching chats":"Your conversations will appear here"}</div>`;return}matches.forEach(c=>{const r=document.createElement("div");r.className="chat-row "+(c.id===currentChatId?"selected":"");r.innerHTML=`<span class="chat-title">${esc(c.title)}</span><button class="chat-delete" title="Delete chat">×</button>`;r.querySelector(".chat-title").onclick=()=>{currentChatId=c.id;renderChatList(filter);renderConversation();closeSidebarMobile()};r.querySelector(".chat-delete").onclick=e=>{e.stopPropagation();conversations=conversations.filter(x=>x.id!==c.id);if(currentChatId===c.id)currentChatId=null;saveConversations();renderChatList(filter);renderConversation();toast("Conversation deleted")};list.appendChild(r)})}
function renderMarkdown(source){
 // Keep a safe plain-text fallback if a CDN is unavailable.
 if(!window.marked||!window.DOMPurify)return esc(source).replace(/\n/g,"<br>");
 try{
   const renderer=new marked.Renderer();
   renderer.code=(code,info="")=>{
     const lang=(info||"").trim().split(/\s+/)[0].toLowerCase();
     let highlighted=esc(code);
     if(window.hljs){
       try{highlighted=lang&&hljs.getLanguage(lang)?hljs.highlight(code,{language:lang,ignoreIllegals:true}).value:hljs.highlightAuto(code).value;}catch{}
     }
     const langClass=lang?` language-${esc(lang)}`:"";
     return `<pre><code class="hljs${langClass}" data-language="${esc(lang||"code")}">${highlighted}</code></pre>\n`;
   };
   marked.setOptions({gfm:true,breaks:false,renderer});
   const unsafeHtml=marked.parse(String(source));
   return DOMPurify.sanitize(unsafeHtml,{USE_PROFILES:{html:true}});
 }catch(error){console.warn("Markdown rendering failed; using plain text.",error);return esc(source).replace(/\n/g,"<br>")}
}
function addCodeCopyButtons(bubble){
 bubble.querySelectorAll("pre").forEach(pre=>{
   if(pre.parentElement?.classList.contains("code-block"))return;
   const code=pre.querySelector("code"),wrap=document.createElement("div");wrap.className="code-block";
   const header=document.createElement("div");header.className="code-header";
   const lang=document.createElement("span");lang.className="code-language";lang.textContent=code?.dataset.language||"code";
   const button=document.createElement("button");button.type="button";button.className="copy-code-btn";button.textContent="Copy";button.setAttribute("aria-label","Copy code");
   button.addEventListener("click",async()=>{const text=code?.textContent||"";try{await navigator.clipboard.writeText(text);button.textContent="Copied!";setTimeout(()=>{button.textContent="Copy"},1400)}catch{const area=document.createElement("textarea");area.value=text;area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.select();const ok=document.execCommand("copy");area.remove();button.textContent=ok?"Copied!":"Copy failed";setTimeout(()=>{button.textContent="Copy"},1400)}});
   header.append(lang,button);pre.replaceWith(wrap);wrap.append(header,pre);
 });
}
function applyTheme(theme){
 const light=theme==="light";
 document.body.classList.toggle("light-theme",light);
 const btn=$("#themeBtn");
 if(btn){btn.textContent=light?"☾":"☼";btn.title=light?"Switch to dark theme":"Switch to light theme";btn.setAttribute("aria-label",btn.title)}
 try{localStorage.setItem(THEME_KEY,light?"light":"dark")}catch{}
}
function exportCurrentChat(){
 const chat=getChat();
 if(!chat||!chat.messages.length){toast("There is no conversation to export yet");return}
 const lines=[`# ${chat.title||"Chat conversation"}`,`_Exported ${new Date().toLocaleString()}_`,""];
 for(const m of chat.messages){
   if(m.streaming)continue;
   lines.push(m.role==="user"?"## You":"## Assistant", "", m.content||"");
   if(m.attachments?.length)lines.push("", "Attachments: "+m.attachments.map(f=>`${f.name} (${fmtSize(f.size)})`).join(", "));
   lines.push("", "---", "");
 }
 const blob=new Blob([lines.join("\n")],{type:"text/markdown;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 const safe=(chat.title||"chat").replace(/[^a-z0-9-_]+/gi,"-").replace(/^-|-$/g,"").slice(0,60)||"chat";
 a.href=url;a.download=`${safe}.md`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);toast("Conversation exported as Markdown");
}
async function copyAssistantText(text,button){
 try{await navigator.clipboard.writeText(text);button.textContent="Copied"}
 catch{const area=document.createElement("textarea");area.value=text;area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.select();let ok=false;try{ok=document.execCommand("copy")}catch{}area.remove();button.textContent=ok?"Copied":"Copy failed"}
 setTimeout(()=>button.textContent="Copy answer",1300);
}
function regenerateLastAnswer(chatId){
 const chat=conversations.find(c=>c.id===chatId);if(!chat||activeController)return;
 const last=chat.messages[chat.messages.length-1],prior=chat.messages[chat.messages.length-2];
 if(!last||last.role!=="assistant"||!prior||prior.role!=="user")return;
 if(prior.attachments?.length){toast("Regeneration for messages with attachments is not available yet");return}
 const prompt=prior.content;
 chat.messages.splice(-2,2);currentChatId=chat.id;saveConversations();renderChatList();renderConversation();sendMessage(prompt);
}
function renderMessage(m){
 const el=document.createElement("div");el.className="message "+m.role;
 if(m.role==="assistant"){
   const avatar=document.createElement("div");avatar.className="message-avatar";avatar.textContent="✳";
   const bubble=document.createElement("div");bubble.className="bubble";
   if(m.content){bubble.innerHTML=renderMarkdown(m.content);addCodeCopyButtons(bubble)}
   else if(m.streaming)bubble.innerHTML=`<span class="typing-indicator" aria-label="Assistant is thinking"><i></i><i></i><i></i></span>`;
   el.append(avatar,bubble);
   if(m.content&&!m.streaming){
     const actions=document.createElement("div");actions.className="message-actions";
     const copy=document.createElement("button");copy.type="button";copy.className="message-action";copy.textContent="Copy answer";copy.onclick=()=>copyAssistantText(m.content,copy);actions.appendChild(copy);
     const chat=getChat();const isLatest=chat&&chat.messages[chat.messages.length-1]===m;
     if(isLatest){const regen=document.createElement("button");regen.type="button";regen.className="message-action";regen.textContent="Regenerate";regen.title="Generate a new answer to the last prompt";regen.onclick=()=>regenerateLastAnswer(chat.id);actions.appendChild(regen)}
     bubble.appendChild(actions);
   }
 }else{
   const bubble=document.createElement("div");bubble.className="bubble";bubble.textContent=m.content;
   if(m.attachments?.length){const files=document.createElement("div");files.className="message-attachments";m.attachments.forEach(f=>{const item=document.createElement("div");item.className="message-file";const name=document.createTextNode("▤ "+f.name);const size=document.createElement("small");size.textContent=fmtSize(f.size);item.append(name,size);files.appendChild(item)});bubble.appendChild(files)}
   el.appendChild(bubble);
 }
 return el;
}
function renderConversation(){const c=getChat(),box=$("#messages");box.innerHTML="";$("#welcome").classList.toggle("hidden",!!(c&&c.messages.length));if(c)c.messages.forEach(m=>box.appendChild(renderMessage(m)));$("#conversation").scrollTop=$("#conversation").scrollHeight}
function resizeInput(){const el=$("#messageInput");el.style.height="auto";el.style.height=Math.min(el.scrollHeight,180)+"px"}
function updateAttachmentTray(){const tray=$("#attachmentTray");tray.innerHTML="";tray.classList.toggle("hidden",pendingFiles.length===0);pendingFiles.forEach((file,index)=>{const chip=document.createElement("div");chip.className="attachment-chip";chip.innerHTML=`<span>▤</span><span>${esc(file.name)}<span class="file-meta"> · ${fmtSize(file.size)}</span></span><button type="button" class="remove-file" aria-label="Remove ${esc(file.name)}">×</button>`;chip.querySelector("button").onclick=()=>{pendingFiles.splice(index,1);updateAttachmentTray()};tray.appendChild(chip)})}
function addFiles(fileList){const incoming=[...fileList];for(const file of incoming){if(pendingFiles.length>=MAX_FILES){toast(`Maximum ${MAX_FILES} files per message`);break}const ext=extOf(file.name);if(!ALLOWED_EXT.has(ext)){toast(`${file.name}: file type not supported`);continue}if(file.size>MAX_FILE_BYTES){toast(`${file.name}: maximum file size is 5 MB`);continue}if(pendingFiles.some(f=>f.name===file.name&&f.size===file.size)){continue}pendingFiles.push(file)}updateAttachmentTray()}
function fileToBase64(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]||"");reader.onerror=()=>reject(new Error(`Could not read ${file.name}`));reader.readAsDataURL(file)})}
async function sendMessage(text){
 if(activeController){activeController.abort();return}
 const content=text.trim();if(!content&&!pendingFiles.length)return;if(!getChat())createChat();
 const chat=getChat(),files=[...pendingFiles];pendingFiles=[];updateAttachmentTray();const descriptors=files.map(fileDescriptor);
 chat.messages.push({role:"user",content:content||"Please inspect the attached file(s).",attachments:descriptors,at:Date.now()});
 if(chat.title==="New chat"){const title=content||descriptors[0]?.name||"File analysis";chat.title=title.length>34?title.slice(0,34)+"…":title}
 chat.updatedAt=Date.now();saveConversations();renderChatList();renderConversation();$("#messageInput").value="";resizeInput();
 const assistantMessage={role:"assistant",content:"",at:Date.now(),streaming:true};chat.messages.push(assistantMessage);
 activeController=new AbortController();const controller=activeController;
 const sendBtn=$("#sendBtn");sendBtn.disabled=false;sendBtn.textContent="■";sendBtn.setAttribute("aria-label","Stop generating");sendBtn.title="Stop generating";sendBtn.classList.add("stop-generating");$("#attachBtn").disabled=true;$("#messageInput").disabled=true;
 renderConversation();
 try{
   // File bytes are encoded in memory and sent to the backend, which extracts their text.
   const encoded=await Promise.all(files.map(async f=>({...fileDescriptor(f),data:await fileToBase64(f)})));
   if(controller.signal.aborted)throw new DOMException("Aborted","AbortError");
   const apiMessages=chat.messages.filter(m=>!m.streaming).map(m=>({role:m.role,content:m.content,attachments:[]}));
   apiMessages[apiMessages.length-1].attachments=encoded;
   const response=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:apiMessages}),signal:controller.signal});
   if(!response.ok){let data={};try{data=await response.json()}catch{}throw new Error(data.error||`Request failed (${response.status})`)}
   if(!response.body)throw new Error("Streaming is not supported by this browser.");
   const reader=response.body.getReader(),decoder=new TextDecoder();let buffer="",receivedDone=false;
   const handleEvent=raw=>{
     let eventName="message",dataText="";
     for(const line of raw.split("\n")){if(line.startsWith("event:"))eventName=line.slice(6).trim();else if(line.startsWith("data:"))dataText+=line.slice(5).trim()}
     if(!dataText)return;let payload;try{payload=JSON.parse(dataText)}catch{return}
     if(eventName==="delta"){assistantMessage.content+=payload.text;renderConversation();}
     else if(eventName==="done"){receivedDone=true;}
     else if(eventName==="error"){throw new Error(payload.error||"The AI stream failed.")}
   };
   while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const blocks=buffer.split("\n\n");buffer=blocks.pop()||"";for(const block of blocks)handleEvent(block);}
   buffer+=decoder.decode();if(buffer.trim())handleEvent(buffer);
   if(!receivedDone&&!controller.signal.aborted)throw new Error("The connection ended before the response completed. Please try again.");
   if(!assistantMessage.content&&!controller.signal.aborted)throw new Error("The model returned an empty response. Try again.");
 }catch(err){
   if(err.name==="AbortError"){
     if(assistantMessage.content)assistantMessage.content+="\n\n*Generation stopped.*";
     else chat.messages=chat.messages.filter(m=>m!==assistantMessage);
   }else{
     if(assistantMessage.content)assistantMessage.content+=`\n\n---\n**Stream interrupted:** ${err.message}`;
     else assistantMessage.content=`I couldn't process this message.\n\n${err.message}\n\nCheck that the server is running and your API key is configured.`;
   }
 }finally{
   delete assistantMessage.streaming;chat.updatedAt=Date.now();saveConversations();
   if(activeController===controller)activeController=null;
   sendBtn.disabled=false;sendBtn.textContent="↑";sendBtn.setAttribute("aria-label","Send message");sendBtn.title="Send message";sendBtn.classList.remove("stop-generating");$("#attachBtn").disabled=false;$("#messageInput").disabled=false;
   if(currentChatId===chat.id)renderConversation();renderChatList();$("#messageInput").focus();
 }
}

function openModal(html){$("#modalContent").innerHTML=html;$("#modalOverlay").classList.remove("hidden")}
function closeModal(){$("#modalOverlay").classList.add("hidden")}
function authModal(mode="login"){const signup=mode==="signup";openModal(`<div class="welcome-mark" style="text-align:center;margin-bottom:12px">✳</div><h2 style="text-align:center">${signup?"Create your account":"Welcome back"}</h2><p style="text-align:center">Demo-only profile. Do not enter a real password.</p><form id="authForm">${signup?'<label for="authName">Name</label><input id="authName" required maxlength="60" placeholder="Your name"/>':""}<label for="authEmail">Email</label><input id="authEmail" type="email" required placeholder="you@example.com"/><label for="authPassword">Password</label><input id="authPassword" type="password" minlength="4" required placeholder="Demo password"/><button class="primary" type="submit">${signup?"Sign up":"Log in"}</button></form><p class="switch-text">${signup?"Already have an account?":"Don't have an account?"} <button class="text-link" id="switchAuth">${signup?"Log in":"Sign up"}</button></p>`);$("#switchAuth").onclick=()=>authModal(signup?"login":"signup");$("#authForm").onsubmit=e=>{e.preventDefault();const email=$("#authEmail").value.trim(),name=signup?$("#authName").value.trim():email.split("@")[0];saveUser({name,email});closeModal();toast("Demo profile saved locally")}}
function closeSidebarMobile(){if(matchMedia("(max-width:760px)").matches)$("#sidebar").classList.remove("open")}
function accountModal(){if(!currentUser){authModal();return}openModal(`<h2>Your account</h2><p>Local demo profile only</p><div class="feature-row"><span>Name</span><strong>${esc(currentUser.name)}</strong></div><div class="feature-row"><span>Email</span><strong>${esc(currentUser.email)}</strong></div><button class="primary" id="logoutBtn">Log out</button>`);$("#logoutBtn").onclick=()=>{saveUser(null);closeModal();toast("Logged out")}}
$("#newChatBtn").onclick=createChat;$("#brandBtn").onclick=()=>$("#sidebar").classList.toggle("open");$("#openSidebar").onclick=()=>$("#sidebar").classList.add("open");$("#closeSidebar").onclick=()=>$("#sidebar").classList.remove("open");
$("#chatForm").onsubmit=e=>{e.preventDefault();sendMessage($("#messageInput").value)};$("#messageInput").oninput=resizeInput;$("#messageInput").onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("#chatForm").requestSubmit()}};
document.querySelectorAll(".suggestion").forEach(b=>b.onclick=()=>{$("#messageInput").value=b.dataset.prompt;resizeInput();$("#messageInput").focus()});
$("#searchChatsBtn").onclick=()=>{openModal('<h2>Search chats</h2><p>Search saved conversation titles.</p><label for="chatSearch">Search</label><input id="chatSearch" placeholder="Search your chats…"/><button class="primary" id="doneSearch">Done</button>');$("#chatSearch").oninput=e=>renderChatList(e.target.value);$("#doneSearch").onclick=()=>{renderChatList();closeModal()};$("#chatSearch").focus()};
$("#libraryBtn").onclick=()=>{openModal(`<h2>Library</h2><p>Conversation history is stored locally in this browser.</p><div class="feature-row"><span>Saved conversations</span><strong>${conversations.length}</strong></div><button class="primary" id="libraryOk">Done</button><button class="danger-button" id="clearChatsBtn">Delete all conversations</button>`);$("#libraryOk").onclick=closeModal;$("#clearChatsBtn").onclick=()=>{if(confirm("Delete all saved conversations from this browser? This cannot be undone.")){conversations=[];currentChatId=null;saveConversations();renderChatList();renderConversation();closeModal();toast("All conversations deleted")}}};
$("#modalClose").onclick=closeModal;$("#modalOverlay").onclick=e=>{if(e.target===$("#modalOverlay"))closeModal()};document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();createChat()}if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==="e"){e.preventDefault();exportCurrentChat()}});
$("#loginTopBtn").onclick=()=>currentUser?accountModal():authModal("login");$("#signupTopBtn").onclick=()=>authModal("signup");$("#profileBtn").onclick=accountModal;
$("#exportBtn").onclick=exportCurrentChat;$("#themeBtn").onclick=()=>applyTheme(document.body.classList.contains("light-theme")?"dark":"light");
$("#shareBtn").onclick=async()=>{const c=getChat(),txt=c?`${c.title}\n\n${c.messages.map(m=>`${m.role==="user"?"You":"Assistant"}: ${m.content}`).join("\n\n")}`:"ChatGPT Clone";try{await navigator.clipboard.writeText(txt);toast("Conversation copied")}catch{toast("Clipboard unavailable")}};
$("#modelPicker").onclick=()=>{openModal('<h2>Model</h2><p>Model configured by the server .env file.</p><div class="feature-row"><span>AI model</span><strong>Server configured</strong></div><button class="primary" id="modelDone">Done</button>');$("#modelDone").onclick=closeModal};
$("#attachBtn").onclick=()=>$("#fileInput").click();$("#fileInput").onchange=e=>{addFiles(e.target.files);e.target.value=""};
$("#toolsBtn").onclick=()=>{openModal('<h2>Tools</h2><p>File-aware AI chat is enabled.</p><div class="feature-row"><span>Text and code files</span><strong>Supported</strong></div><div class="feature-row"><span>PDF / DOCX</span><strong>Text extraction</strong></div><div class="feature-row"><span>Web search</span><strong>Not connected</strong></div><button class="primary" id="toolsDone">Done</button>');$("#toolsDone").onclick=closeModal};
$("#voiceBtn").onclick=()=>toast("Voice mode is not implemented in this version");
const composer=$("#chatForm");
composer.addEventListener("dragover",e=>{e.preventDefault();composer.classList.add("dragging")});
composer.addEventListener("dragleave",()=>composer.classList.remove("dragging"));
composer.addEventListener("drop",e=>{e.preventDefault();composer.classList.remove("dragging");if(e.dataTransfer?.files)addFiles(e.dataTransfer.files)});
applyTheme((()=>{try{return localStorage.getItem(THEME_KEY)||"dark"}catch{return "dark"}})());updateProfile();renderChatList();renderConversation();