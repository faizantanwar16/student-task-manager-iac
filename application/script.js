// Reference / preview copy only — see the note at the top of index.html.
// The live version of this logic is embedded in worker.js as INLINE_JS.
//
// When previewing this file locally (opening index.html directly), the
// relative "/api/tasks" calls below won't resolve to anything, since
// there's no server at that path. Point API_BASE at your deployed
// Worker URL to test against the real thing instead:
const API_BASE = ""; // e.g. "https://student-task-manager.yoursubdomain.workers.dev"

const taskForm = document.getElementById("taskForm");
const taskTitle = document.getElementById("taskTitle");
const taskPriority = document.getElementById("taskPriority");
const taskStatus = document.getElementById("taskStatus");
const addBtn = document.getElementById("addBtn");
const formMessage = document.getElementById("formMessage");
const listMessage = document.getElementById("listMessage");
const taskList = document.getElementById("taskList");
const taskCount = document.getElementById("taskCount");

function showMessage(el, text, type) {
  el.textContent = text;
  el.className = `message ${type || ""}`;
  if (text) {
    setTimeout(() => {
      el.textContent = "";
      el.className = "message";
    }, 3500);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function badgeClass(priority) {
  if (priority === "High") return "badge badge-high";
  if (priority === "Low") return "badge badge-low";
  return "badge badge-medium";
}

function statusBadgeClass(status) {
  return status === "Completed" ? "badge badge-status-completed" : "badge badge-status-pending";
}

function render(tasks) {
  taskCount.textContent = `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;

  if (!tasks.length) {
    taskList.innerHTML = `<p class="empty-state">No tasks yet. Add your first one above.</p>`;
    return;
  }

  taskList.innerHTML = tasks
    .map(
      (t) => `
      <div class="task-row">
        <span class="task-id">${escapeHtml(t.id)}</span>
        <span class="task-title ${t.status === "Completed" ? "completed" : ""}">${escapeHtml(t.title)}</span>
        <span class="${badgeClass(t.priority)}">${escapeHtml(t.priority)}</span>
        <span class="${statusBadgeClass(t.status)}">${escapeHtml(t.status)}</span>
        <span class="task-actions">
          <button class="icon-btn" data-action="toggle" data-id="${t.id}" data-status="${t.status}">
            ${t.status === "Completed" ? "Reopen" : "Complete"}
          </button>
          <button class="icon-btn danger" data-action="delete" data-id="${t.id}">Delete</button>
        </span>
      </div>`
    )
    .join("");
}

async function loadTasks() {
  try {
    const res = await fetch(`${API_BASE}/api/tasks`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Failed to load tasks");
    render(data.data);
  } catch (err) {
    showMessage(listMessage, `Error: ${err.message}`, "error");
  }
}

taskForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  addBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: taskTitle.value.trim(),
        priority: taskPriority.value,
        status: taskStatus.value,
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Could not add task");

    showMessage(formMessage, "Task added", "success");
    taskForm.reset();
    loadTasks();
  } catch (err) {
    showMessage(formMessage, `Error: ${err.message}`, "error");
  } finally {
    addBtn.disabled = false;
  }
});

taskList.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const id = btn.dataset.id;
  const action = btn.dataset.action;

  if (action === "delete") {
    if (!confirm(`Delete task ${id}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Delete failed");
      showMessage(listMessage, "Task deleted", "success");
      loadTasks();
    } catch (err) {
      showMessage(listMessage, `Error: ${err.message}`, "error");
    }
  }

  if (action === "toggle") {
    const newStatus = btn.dataset.status === "Completed" ? "Pending" : "Completed";
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Update failed");
      loadTasks();
    } catch (err) {
      showMessage(listMessage, `Error: ${err.message}`, "error");
    }
  }
});

loadTasks();
