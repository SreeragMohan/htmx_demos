const express = require('express');
const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true })); // Parse form data

// In-memory Data Store
let tasks = [
    { id: 1, text: 'Review PR #42: Login Refactor', completed: false },
    { id: 2, text: 'Update dependency versions', completed: true },
    { id: 3, text: 'Draft system architecture diagram', completed: false },
];

let nextId = 4;

// --- HTML Templates ---

const Layout = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TaskFlow | HTMX Demo</title>
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <!-- Styles -->
    <link rel="stylesheet" href="/css/styles.css">
    <!-- HTMX (CDN) -->
    <script src="https://unpkg.com/htmx.org@1.9.10"></script>
</head>
<body>
    <div class="app-container">
        <!-- Sidebar -->
        <aside class="glass-panel sidebar">
            <h1>TaskFlow</h1>
            <nav>
                <ul style="list-style:none; padding:0; margin-top:2rem;">
                    <li class="mb-4" style="color:var(--accent-primary); font-weight:600;">Dashboard</li>
                    <li class="mb-4" style="color:var(--text-muted);">Team</li>
                    <li class="mb-4" style="color:var(--text-muted);">Settings</li>
                </ul>
            </nav>
            <div style="margin-top:auto; padding-top:2rem; border-top:1px solid rgba(255,255,255,0.1);">
                <small style="color:var(--text-muted)">HTMX Demo v1.0</small>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="glass-panel main-content">
            ${content}
        </main>
    </div>
</body>
</html>
`;

const Stats = (tasks) => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    return `
    <div id="stats-grid" class="stats-grid" hx-swap-oob="true">
        <div class="stat-card">
            <span class="stat-value" style="color: var(--accent-primary)">${total}</span>
            <span class="stat-label">Total Tasks</span>
        </div>
        <div class="stat-card">
            <span class="stat-value" style="color: var(--accent-success)">${completed}</span>
            <span class="stat-label">Completed</span>
        </div>
        <div class="stat-card">
            <span class="stat-value" style="color: var(--accent-secondary)">${pending}</span>
            <span class="stat-label">Pending</span>
        </div>
    </div>
    `;
};

const TaskItem = (task) => `
<li class="task-item ${task.completed ? 'completed' : ''}" id="task-${task.id}">
    <div class="task-content">
        <input 
            type="checkbox" 
            class="task-checkbox" 
            ${task.completed ? 'checked' : ''}
            hx-put="/tasks/${task.id}/toggle"
            hx-target="#task-${task.id}"
            hx-swap="outerHTML"
        >
        
        <span 
            class="task-text"
            hx-get="/tasks/${task.id}/edit"
            hx-trigger="click"
            hx-target="this"
            hx-swap="outerHTML"
        >${task.text}</span>
    </div>
    
    <button 
        class="btn btn-danger"
        hx-delete="/tasks/${task.id}"
        hx-target="#task-${task.id}"
        hx-swap="outerHTML swap:0.3s"
    >
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
    </button>
</li>
`;

const EditTaskInput = (task) => `
<form hx-put="/tasks/${task.id}" hx-target="#task-${task.id}" hx-swap="outerHTML" style="display:inline; flex:1;">
    <input 
        type="text" 
        name="text" 
        value="${task.text}" 
        autofocus 
        onblur="this.form.requestSubmit()"
        style="width:100%; padding:4px 8px; font-size:1rem; background:rgba(0,0,0,0.3); border:1px solid var(--accent-primary);"
    >
</form>
`;

// --- Routes ---

app.get('/', (req, res) => {
    const taskListHtml = tasks.map(TaskItem).join('');
    // Initial Render needs the stats not OOB, but inline. 
    // Wait, the Stats function returns hx-swap-oob="true". 
    // For initial render, we strip that attribute or just ignore it implies "swap current element with id".
    // I can just reuse the HTML but remove the swap attribute OR just put the structure there.
    
    const statsHtml = `
    <div id="stats-grid" class="stats-grid">
        <div class="stat-card">
            <span class="stat-value" style="color: var(--accent-primary)">${tasks.length}</span>
            <span class="stat-label">Total Tasks</span>
        </div>
        <div class="stat-card">
            <span class="stat-value" style="color: var(--accent-success)">${tasks.filter(t=>t.completed).length}</span>
            <span class="stat-label">Completed</span>
        </div>
        <div class="stat-card">
            <span class="stat-value" style="color: var(--accent-secondary)">${tasks.filter(t=>!t.completed).length}</span>
            <span class="stat-label">Pending</span>
        </div>
    </div>`;

    const content = `
        <div class="flex justify-between items-center mb-4">
            <h2>My Tasks</h2>
            <div id="loading" class="htmx-indicator" style="color:var(--accent-primary)">Updating...</div>
        </div>

        ${statsHtml}

        <div class="input-group">
            <input 
                type="text" 
                name="q" 
                placeholder="Search tasks..." 
                hx-get="/tasks/search" 
                hx-trigger="keyup changed delay:300ms, search" 
                hx-target="#task-list"
                hx-indicator="#loading"
            >
        </div>

        <form hx-post="/tasks" hx-target="#task-list" hx-swap="beforeend" hx-on::after-request="this.reset()" class="input-group flex" style="gap:0.5rem">
            <input type="text" name="text" placeholder="Add a new task..." required>
            <button type="submit" class="btn btn-primary">
                Add Task
            </button>
        </form>

        <ul id="task-list" class="task-list">
            ${taskListHtml}
        </ul>
    `;
    
    res.send(Layout(content));
});

// Search
app.get('/tasks/search', (req, res) => {
    const query = req.query.q.toLowerCase();
    const filtered = tasks.filter(t => t.text.toLowerCase().includes(query));
    res.send(filtered.map(TaskItem).join(''));
});

// Create
app.post('/tasks', (req, res) => {
    const newTask = {
        id: nextId++,
        text: req.body.text,
        completed: false
    };
    tasks.push(newTask);
    
    // Return the new list item AND the updated stats (OOB Swap)
    res.send(TaskItem(newTask) + Stats(tasks));
});

// Update (Toggle Status)
app.put('/tasks/:id/toggle', (req, res) => {
    const id = parseInt(req.params.id);
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        // Return updated item + updated stats
        res.send(TaskItem(task) + Stats(tasks));
    } else {
        res.status(404).send('');
    }
});

// Get Edit Form
app.get('/tasks/:id/edit', (req, res) => {
    const id = parseInt(req.params.id);
    const task = tasks.find(t => t.id === id);
    if (task) {
        res.send(EditTaskInput(task));
    }
});

// Update (Text content)
app.put('/tasks/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.text = req.body.text;
        res.send(TaskItem(task).replace('slideIn', '')); // Return as normal item (without slideIn anim re-trigger optionally)
    }
});

// Delete
app.delete('/tasks/:id', (req, res) => {
    const id = parseInt(req.params.id);
    tasks = tasks.filter(t => t.id !== id);
    // Return empty string (removes element) + updated stats
    res.send("" + Stats(tasks));
});

app.listen(port, () => {
    console.log(`TaskFlow app listening at http://localhost:${port}`);
});
