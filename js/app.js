
(() => {
  "use strict";
  const KEY = "beastTodoTasks";
  const THEME_KEY = "beastTodoTheme";
  const $ = s => document.querySelector(s);
  const el = {
    form: $("#taskForm"), title: $("#taskInput"), priority: $("#priorityInput"),
    category: $("#categoryInput"), date: $("#dueDateInput"), list: $("#taskList"),
    search: $("#searchInput"), categoryFilter: $("#categoryFilter"),
    dialog: $("#editDialog"), editForm: $("#editForm"), editTitle: $("#editTaskInput"),
    editPriority: $("#editPriority"), editCategory: $("#editCategory"), editDate: $("#editDueDate"),
    toast: $("#toast")
  };
  const priorities = ["high", "medium", "low"];
  const categories = ["Personal", "Work", "Study", "Health", "Shopping", "Other"];
  let tasks = loadTasks(), filter = "all", editingId = null, draggedId = null, toastTimer;

  function id() {
    return crypto && crypto.randomUUID ? crypto.randomUUID() :
      Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
  function isDate(v) {
    if (!v) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const [y, m, d] = v.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  }
  function normalize(t) {
    if (!t || typeof t !== "object") return null;
    const title = String(t.title || "").trim().slice(0, 120);
    if (!title) return null;
    const date = t.dueDate ?? t.date ?? "";
    const category = categories.includes(t.category) ? t.category : "Other";
    return {
      id: String(t.id || id()), title,
      priority: priorities.includes(t.priority) ? t.priority : "medium",
      category, dueDate: isDate(date) ? date : "",
      completed: Boolean(t.completed), createdAt: t.createdAt || new Date().toISOString(),
      updatedAt: t.updatedAt || null, remindedFor: t.remindedFor || null
    };
  }
  function loadTasks() {
    try {
      let data = null;
      for (const key of [KEY, "advancedTodoTasks", "taskflow_tasks_v1"]) {
        const raw = localStorage.getItem(key);
        if (raw) { data = JSON.parse(raw); break; }
      }
      return Array.isArray(data) ? data.map(normalize).filter(Boolean) : [];
    } catch (e) { console.warn("Unable to load tasks", e); return []; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(tasks)); return true; }
    catch (e) { toast("Could not save: browser storage may be full or disabled."); return false; }
  }
  function toast(message) {
    el.toast.textContent = message;
    el.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("show"), 2600);
  }
  function esc(v) {
    return String(v).replace(/[&<>"']/g, c => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
    })[c]);
  }
  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  function dateLabel(v) {
    if (!v) return "";
    return new Date(v + "T00:00:00").toLocaleDateString(undefined, {day:"numeric",month:"short",year:"numeric"});
  }
  function overdue(t) { return !!(t.dueDate && !t.completed && t.dueDate < today()); }

  function render() {
    const done = tasks.filter(t => t.completed).length, pending = tasks.length - done;
    const percent = tasks.length ? Math.round(done / tasks.length * 100) : 0;
    $("#totalCount").textContent = tasks.length;
    $("#completedCount").textContent = done;
    $("#pendingCount").textContent = pending;
    $("#progressPercent").textContent = percent + "%";
    $("#progressBar").style.width = percent + "%";
    $("#progressBar").setAttribute("aria-valuenow", percent);
    $("#allFilterCount").textContent = tasks.length;
    $("#pendingFilterCount").textContent = pending;
    $("#completedFilterCount").textContent = done;
    $("#clearCompleted").disabled = !done;
    $("#clearAll").disabled = !tasks.length;

    const q = el.search.value.trim().toLowerCase(), cat = el.categoryFilter.value;
    const visible = tasks.filter(t => {
      const filterOK = filter === "all" || (filter === "pending" && !t.completed) || (filter === "completed" && t.completed);
      const searchOK = [t.title,t.category,t.priority].some(v => v.toLowerCase().includes(q));
      return filterOK && searchOK && (cat === "all" || cat === t.category);
    });
    el.list.replaceChildren();
    if (!visible.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML = `<div class="empty-icon">${tasks.length ? "⌕" : "✦"}</div>
        <strong>${tasks.length ? "No tasks found" : "Your list is looking fresh!"}</strong>
        <span>${tasks.length ? "Try another search, filter, or category." : "Add your first task above and make today count."}</span>`;
      el.list.appendChild(empty);
    } else visible.forEach(t => {
      const item = document.createElement("article");
      item.className = "task-item" + (t.completed ? " completed" : "");
      item.dataset.id = t.id;
      item.draggable = filter === "all" && !q && cat === "all";
      const due = t.dueDate ? `<span class="due-label${overdue(t) ? " overdue" : ""}">${overdue(t) ? "Overdue · " : "Due · "}${esc(dateLabel(t.dueDate))}</span>` : "";
      item.innerHTML = `<button class="check-button" type="button" data-action="toggle" aria-label="${t.completed ? "Mark pending" : "Mark completed"}">${t.completed ? "✓" : ""}</button>
        <div class="task-main"><div class="task-title">${esc(t.title)}</div>
        <div class="task-meta"><span class="priority ${t.priority}">${t.priority[0].toUpperCase()+t.priority.slice(1)} priority</span>
        <span class="category-tag">${esc(t.category)}</span>${due}</div></div>
        <div class="task-actions"><button class="task-action" type="button" data-action="edit" aria-label="Edit task" title="Edit">✎</button>
        <button class="task-action delete" type="button" data-action="delete" aria-label="Delete task" title="Delete">⌫</button></div>`;
      el.list.appendChild(item);
    });
    $("#listSummary").textContent = `Showing ${visible.length} of ${tasks.length} task${tasks.length === 1 ? "" : "s"}`;
    document.querySelectorAll(".filter-button").forEach(b => {
      const active = b.dataset.filter === filter;
      b.classList.toggle("active", active); b.setAttribute("aria-pressed", String(active));
    });
  }
  function commit(message) {
    if (!save()) return false;
    render(); scheduleReminders();
    if (message) toast(message);
    return true;
  }

  el.form.addEventListener("submit", e => {
    e.preventDefault();
    const title = el.title.value.trim();
    if (!title) { toast("Please enter a task name."); el.title.focus(); return; }
    if (!isDate(el.date.value)) { toast("Please choose a valid due date."); return; }
    const task = {id:id(), title, priority:priorities.includes(el.priority.value) ? el.priority.value : "medium",
      category:categories.includes(el.category.value) ? el.category.value : "Other",
      dueDate:el.date.value, completed:false, createdAt:new Date().toISOString(), updatedAt:null, remindedFor:null};
    tasks.unshift(task);
    if (commit("Task added successfully.")) { el.form.reset(); el.priority.value="medium"; el.category.value="Personal"; el.title.focus(); }
    else tasks.shift();
  });

  el.list.addEventListener("click", e => {
    const button = e.target.closest("button[data-action]");
    if (!button) return;
    const card = button.closest(".task-item"), task = tasks.find(t => t.id === card?.dataset.id);
    if (!task) return;
    if (button.dataset.action === "toggle") {
      const old = {...task}; task.completed = !task.completed; task.updatedAt = new Date().toISOString(); task.remindedFor = null;
      if (!commit(task.completed ? "Task completed. Great work!" : "Task moved to pending.")) Object.assign(task, old);
    } else if (button.dataset.action === "delete") {
      if (!confirm(`Delete "${task.title}"?`)) return;
      const index = tasks.indexOf(task); tasks.splice(index,1);
      if (!commit("Task deleted.")) tasks.splice(index,0,task);
    } else if (button.dataset.action === "edit") {
      editingId = task.id; el.editTitle.value=task.title; el.editPriority.value=task.priority;
      el.editCategory.value=task.category; el.editDate.value=task.dueDate;
      el.dialog.showModal(); el.editTitle.focus();
    }
  });

  el.editForm.addEventListener("submit", e => {
    e.preventDefault();
    const task = tasks.find(t => t.id === editingId), title = el.editTitle.value.trim();
    if (!task || !title) { toast("Task name cannot be empty."); return; }
    if (!isDate(el.editDate.value)) { toast("Please choose a valid due date."); return; }
    const old = {...task};
    Object.assign(task, {title, priority:el.editPriority.value, category:el.editCategory.value,
      dueDate:el.editDate.value, updatedAt:new Date().toISOString()});
    if (task.dueDate !== old.dueDate) task.remindedFor = null;
    if (commit("Changes saved.")) { el.dialog.close(); editingId=null; }
    else Object.assign(task,old);
  });
  function closeDialog() { if (el.dialog.open) el.dialog.close(); editingId=null; }
  $("#cancelEdit").addEventListener("click",closeDialog);
  $(".close-dialog").addEventListener("click",closeDialog);
  el.dialog.addEventListener("click",e=>{if(e.target===el.dialog)closeDialog();});
  el.dialog.addEventListener("close",()=>{editingId=null;});

  document.querySelectorAll(".filter-button").forEach(b=>b.addEventListener("click",()=>{filter=b.dataset.filter;render();}));
  el.search.addEventListener("input",render);
  el.categoryFilter.addEventListener("change",render);
  $("#clearCompleted").addEventListener("click",()=>{
    const old=tasks; tasks=tasks.filter(t=>!t.completed);
    if(!commit("Completed tasks cleared."))tasks=old;
  });
  $("#clearAll").addEventListener("click",()=>{
    if(!tasks.length||!confirm("Delete every task? This cannot be undone."))return;
    const old=tasks; tasks=[];
    if(!commit("All tasks cleared."))tasks=old;
  });

  function applyTheme(theme) {
    const safe=theme==="light"?"light":"dark";
    document.documentElement.dataset.theme=safe;
    try{localStorage.setItem(THEME_KEY,safe);}catch(e){console.warn("Theme setting not saved",e);}
    $("#themeToggle").textContent=safe==="dark"?"☼":"☾";
    $("#themeToggle").setAttribute("aria-label",`Switch to ${safe==="dark"?"light":"dark"} mode`);
    $('meta[name="theme-color"]').setAttribute("content",safe==="dark"?"#111827":"#f3f5fb");
  }
  $("#themeToggle").addEventListener("click",()=>applyTheme(document.documentElement.dataset.theme==="dark"?"light":"dark"));

  // Drag and drop only runs on the full, unfiltered task list.
  el.list.addEventListener("dragstart",e=>{
    const card=e.target.closest(".task-item"); if(!card||!card.draggable)return;
    draggedId=card.dataset.id;card.classList.add("dragging");
    if(e.dataTransfer){e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",draggedId);}
  });
  el.list.addEventListener("dragover",e=>{
    if(draggedId&&e.target.closest(".task-item")){e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect="move";}
  });
  el.list.addEventListener("drop",e=>{
    const target=e.target.closest(".task-item");if(!target||!draggedId)return;e.preventDefault();
    const from=tasks.findIndex(t=>t.id===draggedId),to=tasks.findIndex(t=>t.id===target.dataset.id);
    if(from<0||to<0||from===to)return;
    const [moved]=tasks.splice(from,1);tasks.splice(to,0,moved);
    if(!commit("Task order updated.")){tasks.splice(to,1);tasks.splice(from,0,moved);}
  });
  el.list.addEventListener("dragend",()=>{
    draggedId=null;el.list.querySelectorAll(".dragging").forEach(c=>c.classList.remove("dragging"));
  });

  function download(content,name,type) {
    const blob=new Blob([content],{type:type+";charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  $("#exportJSON").addEventListener("click",()=>{
    download(JSON.stringify({application:"TODO-LIST Beast",version:"1.0",exportedAt:new Date().toISOString(),totalTasks:tasks.length,tasks},null,2),"todo-list-backup.json","application/json");
    toast("JSON backup exported.");
  });
  $("#exportCSV").addEventListener("click",()=>{
    const q=v=>`"${String(v??"").replace(/"/g,'""')}"`;
    const rows=[["Title","Category","Priority","Due date","Completed","Created at"],...tasks.map(t=>[t.title,t.category,t.priority,t.dueDate,t.completed?"Yes":"No",t.createdAt])];
    download("\uFEFF"+rows.map(r=>r.map(q).join(",")).join("\r\n"),"todo-list-tasks.csv","text/csv");
    toast("CSV file exported.");
  });

  function dueNotifications() {
    if(!("Notification" in window)||Notification.permission!=="granted")return;
    const date=today();let changed=false;
    tasks.forEach(t=>{
      if(t.completed||t.dueDate!==date||t.remindedFor===date)return;
      try{new Notification("TODO-LIST reminder",{body:"Due today: "+t.title,tag:"todo-"+t.id});t.remindedFor=date;changed=true;}
      catch(e){console.warn("Notification failed",e);}
    });
    if(changed)save();
  }
  function scheduleReminders() {
    clearTimeout(reminderTimer);
    if(!("Notification" in window)||Notification.permission!=="granted")return;
    dueNotifications();
    const now=new Date(),next=new Date(now);next.setHours(9,0,0,0);
    if(next<=now)next.setDate(next.getDate()+1);
    reminderTimer=setTimeout(()=>{dueNotifications();scheduleReminders();},Math.min(next-now,2147480000));
  }
  $("#enableReminders").addEventListener("click",async()=>{
    if(!("Notification" in window)){toast("This browser does not support notifications.");return;}
    try{
      const permission=await Notification.requestPermission();
      if(permission==="granted"){toast("Reminders enabled. Keep this page open for alerts.");scheduleReminders();}
      else toast("Notification permission was not granted.");
    }catch(e){toast("Could not enable browser notifications.");}
  });

  const now=new Date();
  $("#todayLabel").textContent=now.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric",year:"numeric"});
  $("#dateDay").textContent=now.toLocaleDateString(undefined,{weekday:"long"});
  $("#dateFull").textContent=now.toLocaleDateString(undefined,{month:"long",day:"numeric",year:"numeric"});
  $("#taskDate").textContent=now.toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"});
  applyTheme(document.documentElement.dataset.theme||"dark");
  render();scheduleReminders();
})();
