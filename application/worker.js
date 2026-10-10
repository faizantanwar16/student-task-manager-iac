// ============================================================
// Student Task Manager — Cloudflare Worker
// Serves the web app at "/" and a REST API under "/api/tasks",
// backed by the TASKS_KV binding (Cloudflare Workers KV).
// This entire file is the artifact Terraform uploads as the
// Worker's script content — see terraform/main.tf.
// ============================================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    try {
      if (pathname === "/" || pathname === "/index.html") {
        return new Response(HTML_PAGE, {
          headers: { "Content-Type": "text/html;charset=UTF-8" },
        });
      }

      if (pathname === "/api/tasks" && request.method === "GET") {
        return listTasks(env);
      }

      if (pathname === "/api/tasks" && request.method === "POST") {
        return createTask(request, env);
      }

      const taskMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
      if (taskMatch) {
        const taskId = decodeURIComponent(taskMatch[1]);
        if (request.method === "GET") return getTask(taskId, env);
        if (request.method === "PUT") return updateTask(taskId, request, env);
        if (request.method === "DELETE") return deleteTask(taskId, env);
      }

      return jsonResponse({ success: false, message: "Not found" }, 404);
    } catch (err) {
      return jsonResponse(
        { success: false, message: "Server error", error: err.message },
        500
      );
    }
  },
};

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

async function nextTaskId(env) {
  const current = await env.TASKS_KV.get("__counter__");
  const next = current ? parseInt(current, 10) + 1 : 101;
  await env.TASKS_KV.put("__counter__", String(next));
  return "T" + next;
}

// ------------------------------------------------------------
// CRUD handlers
// ------------------------------------------------------------
async function listTasks(env) {
  const list = await env.TASKS_KV.list({ prefix: "task:" });
  const tasks = [];

  for (const key of list.keys) {
    const value = await env.TASKS_KV.get(key.name);
    if (value) tasks.push(JSON.parse(value));
  }

  tasks.sort((a, b) => {
    const na = parseInt(a.id.replace(/\D/g, ""), 10);
    const nb = parseInt(b.id.replace(/\D/g, ""), 10);
    return na - nb;
  });

  return jsonResponse({ success: true, count: tasks.length, data: tasks });
}

async function createTask(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ success: false, message: "Invalid JSON body" }, 400);
  }

  const title = (body.title || "").trim();
  const priority = body.priority || "Medium";
  const status = body.status || "Pending";

  if (!title) {
    return jsonResponse({ success: false, message: "title is required" }, 400);
  }

  const id = await nextTaskId(env);
  const task = {
    id: id,
    title: title,
    priority: priority,
    status: status,
    createdDate: new Date().toISOString(),
  };

  await env.TASKS_KV.put("task:" + id, JSON.stringify(task));
  return jsonResponse({ success: true, message: "Task created", data: task }, 201);
}

async function getTask(id, env) {
  const value = await env.TASKS_KV.get("task:" + id);
  if (!value) {
    return jsonResponse({ success: false, message: "Task not found" }, 404);
  }
  return jsonResponse({ success: true, data: JSON.parse(value) });
}

async function updateTask(id, request, env) {
  const existing = await env.TASKS_KV.get("task:" + id);
  if (!existing) {
    return jsonResponse({ success: false, message: "Task not found" }, 404);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ success: false, message: "Invalid JSON body" }, 400);
  }

  const current = JSON.parse(existing);
  const updated = {
    id: current.id,
    title: body.title !== undefined ? body.title : current.title,
    priority: body.priority !== undefined ? body.priority : current.priority,
    status: body.status !== undefined ? body.status : current.status,
    createdDate: current.createdDate,
  };

  await env.TASKS_KV.put("task:" + id, JSON.stringify(updated));
  return jsonResponse({ success: true, message: "Task updated", data: updated });
}

async function deleteTask(id, env) {
  const existing = await env.TASKS_KV.get("task:" + id);
  if (!existing) {
    return jsonResponse({ success: false, message: "Task not found" }, 404);
  }

  await env.TASKS_KV.delete("task:" + id);
  return jsonResponse({ success: true, message: "Task deleted" });
}

// ------------------------------------------------------------
// Embedded frontend
// Cloudflare Workers cannot serve a separate static folder
// without extra asset-binding tooling, so the whole UI is
// inlined here. application/index.html, style.css and
// script.js in this repo are a reference copy of the same
// interface for local preview only, they are not what gets
// deployed. Edit this HTML_PAGE for changes to take effect.
// ------------------------------------------------------------
const INLINE_CSS = ":root{" +
"--ink:#1a1d29;--ink-soft:#5c6070;--paper:#f5f4f1;--card:#ffffff;" +
"--rule:#e4e2db;--accent:#3d5afe;--accent-dark:#2c40c9;--accent-wash:#e8ebff;" +
"--danger:#c94a3b;--danger-wash:#fbe9e6;--success:#2f9e5f;--success-wash:#e4f7ec;" +
"--font-display:'Space Grotesk',sans-serif;--font-body:'Inter',sans-serif;--font-mono:'IBM Plex Mono',monospace;" +
"}" +
"@media(prefers-color-scheme:dark){:root:not([data-theme='light']){" +
"--ink:#eceef5;--ink-soft:#9aa0b4;--paper:#12141c;--card:#1a1d29;--rule:#2b2f3d;" +
"--accent:#7c8fff;--accent-dark:#94a2ff;--accent-wash:#232a4d;" +
"--danger:#e58077;--danger-wash:#3a2521;--success:#6fd39a;--success-wash:#1c2f24;" +
"}}" +
"*{box-sizing:border-box}" +
"body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--font-body);line-height:1.5}" +
".page{max-width:760px;margin:0 auto;padding:48px 20px 40px}" +
".masthead-inner{border-bottom:2px solid var(--rule);padding-bottom:16px;margin-bottom:32px}" +
".masthead h1{font-family:var(--font-display);font-weight:700;font-size:2.1rem;margin:0}" +
".masthead-sub{margin:8px 0 0;color:var(--ink-soft);font-size:0.95rem;max-width:48ch}" +
".composer,.list-section{background:var(--card);border:1px solid var(--rule);border-radius:10px;padding:22px 24px;margin-bottom:24px}" +
".composer h2,.list-section h2{font-family:var(--font-display);font-weight:600;font-size:1.15rem;margin:0 0 14px}" +
"#taskTitle{width:100%;font-family:var(--font-body);font-size:0.98rem;padding:11px 13px;border:1px solid var(--rule);border-radius:7px;background:var(--paper);color:var(--ink);margin-bottom:12px}" +
"#taskTitle:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-wash)}" +
".composer-row{display:flex;gap:10px;flex-wrap:wrap}" +
".composer-row select{font-family:var(--font-body);font-size:0.88rem;padding:9px 10px;border:1px solid var(--rule);border-radius:7px;background:var(--paper);color:var(--ink)}" +
"#addBtn{margin-left:auto;background:var(--accent);color:#fff;border:none;font-weight:600;font-size:0.9rem;padding:9px 20px;border-radius:7px;cursor:pointer;transition:background-color .15s ease}" +
"#addBtn:hover{background:var(--accent-dark)}" +
"#addBtn:disabled{opacity:.6;cursor:not-allowed}" +
".list-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:14px}" +
".list-head h2{margin:0}" +
".list-count{font-family:var(--font-mono);font-size:.78rem;color:var(--accent)}" +
".task-list{display:flex;flex-direction:column;gap:10px}" +
".task-row{display:flex;align-items:center;gap:12px;padding:13px 14px;border:1px solid var(--rule);border-radius:8px;animation:rowIn .2s ease backwards}" +
"@keyframes rowIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}" +
".task-id{font-family:var(--font-mono);font-size:.76rem;color:var(--ink-soft);min-width:38px}" +
".task-title{flex:1;font-size:.94rem}" +
".task-title.completed{text-decoration:line-through;color:var(--ink-soft)}" +
".badge{font-size:.72rem;font-weight:600;padding:3px 9px;border-radius:999px;white-space:nowrap}" +
".badge-high{background:var(--danger-wash);color:var(--danger)}" +
".badge-medium{background:var(--accent-wash);color:var(--accent)}" +
".badge-low{background:var(--rule);color:var(--ink-soft)}" +
".badge-status-pending{background:var(--accent-wash);color:var(--accent)}" +
".badge-status-completed{background:var(--success-wash);color:var(--success)}" +
".task-actions{display:flex;gap:6px}" +
".icon-btn{border:1px solid var(--rule);background:transparent;color:var(--ink-soft);font-size:.76rem;font-weight:600;padding:6px 10px;border-radius:6px;cursor:pointer}" +
".icon-btn:hover{border-color:var(--accent);color:var(--accent)}" +
".icon-btn.danger:hover{border-color:var(--danger);color:var(--danger)}" +
".message{min-height:16px;font-size:.85rem;margin:12px 0 0}" +
".message:empty{margin:0}" +
".message.success{color:var(--success)}" +
".message.error{color:var(--danger)}" +
".empty-state{text-align:center;color:var(--ink-soft);font-style:italic;padding:28px 0}" +
".colophon{text-align:center;padding-top:16px;border-top:1px solid var(--rule)}" +
".colophon p{margin:0;font-size:.78rem;color:var(--ink-soft)}" +
"@media(max-width:520px){.composer-row{flex-direction:column}#addBtn{margin-left:0}.task-row{flex-wrap:wrap}}";

const INLINE_JS =
"var taskForm=document.getElementById('taskForm');" +
"var taskTitle=document.getElementById('taskTitle');" +
"var taskPriority=document.getElementById('taskPriority');" +
"var taskStatus=document.getElementById('taskStatus');" +
"var addBtn=document.getElementById('addBtn');" +
"var formMessage=document.getElementById('formMessage');" +
"var listMessage=document.getElementById('listMessage');" +
"var taskList=document.getElementById('taskList');" +
"var taskCount=document.getElementById('taskCount');" +
"function showMessage(el,text,type){el.textContent=text;el.className='message '+(type||'');if(text){setTimeout(function(){el.textContent='';el.className='message';},3500);}}" +
"function escapeHtml(str){return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}" +
"function badgeClass(priority){if(priority==='High')return 'badge badge-high';if(priority==='Low')return 'badge badge-low';return 'badge badge-medium';}" +
"function statusBadgeClass(status){return status==='Completed'?'badge badge-status-completed':'badge badge-status-pending';}" +
"function render(tasks){" +
"taskCount.textContent=tasks.length+(tasks.length===1?' task':' tasks');" +
"if(!tasks.length){taskList.innerHTML='<p class=\"empty-state\">No tasks yet. Add your first one above.</p>';return;}" +
"var html='';" +
"tasks.forEach(function(t){" +
"html+='<div class=\"task-row\">'+" +
"'<span class=\"task-id\">'+escapeHtml(t.id)+'</span>'+" +
"'<span class=\"task-title'+(t.status==='Completed'?' completed':'')+'\">'+escapeHtml(t.title)+'</span>'+" +
"'<span class=\"'+badgeClass(t.priority)+'\">'+escapeHtml(t.priority)+'</span>'+" +
"'<span class=\"'+statusBadgeClass(t.status)+'\">'+escapeHtml(t.status)+'</span>'+" +
"'<span class=\"task-actions\">'+" +
"'<button class=\"icon-btn\" data-action=\"toggle\" data-id=\"'+t.id+'\" data-status=\"'+t.status+'\">'+(t.status==='Completed'?'Reopen':'Complete')+'</button>'+" +
"'<button class=\"icon-btn danger\" data-action=\"delete\" data-id=\"'+t.id+'\">Delete</button>'+" +
"'</span></div>';" +
"});" +
"taskList.innerHTML=html;" +
"}" +
"function loadTasks(){" +
"fetch('/api/tasks').then(function(r){return r.json();}).then(function(data){" +
"if(!data.success)throw new Error(data.message||'Failed to load tasks');" +
"render(data.data);" +
"}).catch(function(err){showMessage(listMessage,'Error: '+err.message,'error');});" +
"}" +
"taskForm.addEventListener('submit',function(e){" +
"e.preventDefault();" +
"addBtn.disabled=true;" +
"fetch('/api/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:taskTitle.value.trim(),priority:taskPriority.value,status:taskStatus.value})})" +
".then(function(r){return r.json();})" +
".then(function(data){" +
"if(!data.success)throw new Error(data.message||'Could not add task');" +
"showMessage(formMessage,'Task added','success');" +
"taskForm.reset();" +
"loadTasks();" +
"})" +
".catch(function(err){showMessage(formMessage,'Error: '+err.message,'error');})" +
".finally(function(){addBtn.disabled=false;});" +
"});" +
"taskList.addEventListener('click',function(e){" +
"var btn=e.target.closest('button[data-action]');" +
"if(!btn)return;" +
"var id=btn.dataset.id;" +
"var action=btn.dataset.action;" +
"if(action==='delete'){" +
"if(!confirm('Delete task '+id+'?'))return;" +
"fetch('/api/tasks/'+id,{method:'DELETE'}).then(function(r){return r.json();}).then(function(data){" +
"if(!data.success)throw new Error(data.message||'Delete failed');" +
"showMessage(listMessage,'Task deleted','success');" +
"loadTasks();" +
"}).catch(function(err){showMessage(listMessage,'Error: '+err.message,'error');});" +
"}" +
"if(action==='toggle'){" +
"var newStatus=btn.dataset.status==='Completed'?'Pending':'Completed';" +
"fetch('/api/tasks/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:newStatus})}).then(function(r){return r.json();}).then(function(data){" +
"if(!data.success)throw new Error(data.message||'Update failed');" +
"loadTasks();" +
"}).catch(function(err){showMessage(listMessage,'Error: '+err.message,'error');});" +
"}" +
"});" +
"loadTasks();";

const HTML_PAGE = "<!DOCTYPE html>\n" +
'<html lang="en"><head><meta charset="UTF-8">' +
'<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
"<title>Student Task Manager</title>" +
'<link rel="preconnect" href="https://fonts.googleapis.com">' +
'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
'<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">' +
"<style>" + INLINE_CSS + "</style>" +
"</head><body>" +
'<div class="page">' +
'<header class="masthead"><div class="masthead-inner">' +
"<h1>Task Board</h1>" +
'<p class="masthead-sub">Coursework, deadlines, and everything in between &mdash; tracked in one running list.</p>' +
"</div></header>" +
'<main class="board">' +
'<section class="composer" id="composer">' +
'<h2>New task</h2>' +
'<form id="taskForm">' +
'<input type="text" id="taskTitle" placeholder="e.g. Submit Cloud Computing Assignment" required />' +
'<div class="composer-row">' +
'<select id="taskPriority">' +
'<option value="Low">Low priority</option>' +
'<option value="Medium" selected>Medium priority</option>' +
'<option value="High">High priority</option>' +
"</select>" +
'<select id="taskStatus">' +
'<option value="Pending" selected>Pending</option>' +
'<option value="Completed">Completed</option>' +
"</select>" +
'<button type="submit" id="addBtn">Add task</button>' +
"</div>" +
"</form>" +
'<p id="formMessage" class="message" role="status" aria-live="polite"></p>' +
"</section>" +
'<section class="list-section">' +
'<div class="list-head"><h2>Your tasks</h2><span class="list-count" id="taskCount">0 tasks</span></div>' +
'<div id="taskList" class="task-list"></div>' +
'<p id="listMessage" class="message" role="status" aria-live="polite"></p>' +
"</section>" +
"</main>" +
'<footer class="colophon"><p>Backed by Cloudflare Workers KV &mdash; every change here is saved instantly, no publish step needed.</p></footer>' +
"</div>" +
"<script>" + INLINE_JS + "</script>" +
"</body></html>";
