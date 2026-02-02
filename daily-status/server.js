const express = require('express');
const dayjs = require('dayjs');
const app = express();
const port = 3001; // Different port than TaskFlow

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// --- Data & Constants ---

const PROJECTS = ['QB Sales Tracker', 'Internal HRMS', 'Client Portal A', 'Legacy Migration', 'AI Research'];
const ACTIVITIES = ['Coding', 'Meetings', 'Code Review', 'Documentation', 'Testing', 'Debugging'];
const DESCRIPTIONS = [
    'Fixed critical bug in login flow',
    'Daily standup and sprint planning',
    'Refactored API middleware',
    'Wrote unit tests for new module',
    'Client call regarding requirements',
    'Optimized database queries'
];

// Generate Dummy Data
let history = [];
for (let i = 0; i < 50; i++) {
    history.push({
        id: i,
        date: dayjs().subtract(Math.floor(Math.random() * 30), 'day').format('YYYY-MM-DD'),
        project: PROJECTS[Math.floor(Math.random() * PROJECTS.length)],
        activity: ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)],
        hours: Math.floor(Math.random() * 8) + 1,
        minutes: Math.random() > 0.5 ? 30 : 0,
        description: DESCRIPTIONS[Math.floor(Math.random() * DESCRIPTIONS.length)]
    });
}
// Sort by date desc
history.sort((a, b) => new Date(b.date) - new Date(a.date));

let nextId = 51;

// --- Templates ---

const Layout = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Status | HTMX Demo</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/css/corporate-light.css">
    <script src="https://unpkg.com/htmx.org@1.9.10"></script>
    <style>
        /* Specific overrides for this app if essential */
        .sidebar {
            /* Sidebar Icon place holders */
            font-size: 1.5rem;
            color: var(--text-muted);
            gap: 2rem;
        }
        .sidebar-icon { cursor: pointer; transition: color 0.2s; }
        .sidebar-icon:hover { color: var(--accent-primary); }
    </style>
</head>
<body>
    <div class="app-container">
        <!-- Sidebar (Mimic screenshot icons) -->
        <aside class="glass-panel sidebar">
            <div class="sidebar-icon">🏠</div>
            <div class="sidebar-icon">👤</div>
            <div class="sidebar-icon">⚡</div>
            <div class="sidebar-icon">📅</div>
            <div class="sidebar-icon">⚙️</div>
        </aside>

        <!-- Main Content -->
        <main class="glass-panel main-content">
            <div style="margin-bottom: 2rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
                <h1 style="display:block; margin:0; font-size:1.8rem;">Daily Status</h1>
            </div>
            ${content}
        </main>
    </div>
</body>
</html>
`;

const Form = () => `
<form hx-post="/status" hx-target="#history-list" hx-swap="afterbegin" hx-on::after-request="this.reset()" autocomplete="off">
    <div class="mb-4">
        <label class="stat-label">Date</label>
        <input type="date" name="date" required value="${dayjs().format('YYYY-MM-DD')}" style="color-scheme: dark;">
    </div>

    <div class="form-grid">
        <div>
            <label class="stat-label">Project</label>
            <div class="input-group" style="margin-top:0.5rem">
                <select name="project" required>
                    ${PROJECTS.map(p => `<option>${p}</option>`).join('')}
                </select>
            </div>
        </div>
        <div>
            <label class="stat-label">Activity Type</label>
            <div class="input-group" style="margin-top:0.5rem">
                <select name="activity" required>
                    ${ACTIVITIES.map(a => `<option>${a}</option>`).join('')}
                </select>
            </div>
        </div>
    </div>

    <div class="form-grid">
        <div>
            <label class="stat-label">Hours Spent</label>
            <div class="flex" style="gap:1rem; margin-top:0.5rem">
                <select name="hours" style="flex:1">
                    ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(h => `<option value="${h}">${h} Hr</option>`).join('')}
                </select>
                <select name="minutes" style="flex:1">
                    <option value="0">00 Min</option>
                    <option value="15">15 Min</option>
                    <option value="30">30 Min</option>
                    <option value="45">45 Min</option>
                </select>
            </div>
        </div>
    </div>

    <div class="mb-4">
        <label class="stat-label">Activity Description</label>
        <div class="input-group" style="margin-top:0.5rem">
            <textarea name="description" placeholder="Enter the activities performed... (e.g., #1234)" required></textarea>
        </div>
    </div>

    <div style="text-align: right;">
        <button type="submit" class="btn btn-primary">
            Submit Daily Status
        </button>
    </div>
</form>
`;

const HistoryRow = (item) => `
<tr class="history-row htmx-added">
    <td>${dayjs(item.date).format('DD/MM/YYYY')}</td>
    <td><span class="badge badge-proj">${item.project}</span></td>
    <td>${item.activity}</td>
    <td><span class="badge badge-hours">${item.hours}h ${item.minutes > 0 ? item.minutes + 'm' : ''}</span></td>
    <td style="color:var(--text-muted); max-width: 300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${item.description}">
        ${item.description}
    </td>
</tr>
`;

const HistoryTable = (items) => `
<table class="history-table">
    <thead>
        <tr>
            <th>Date</th>
            <th>Project</th>
            <th>Activity</th>
            <th>Duration</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody id="history-list">
        ${items.map(HistoryRow).join('')}
    </tbody>
</table>
`;

// --- Routes ---

app.get('/', (req, res) => {
    const content = `
        <h2 class="mb-4">Add Daily Status</h2>
        ${Form()}
        
        <div style="margin-top: 4rem; margin-bottom: 2rem;">
            <div class="flex justify-between items-end mb-4">
                <h2>My History</h2>
                <!-- Search Input -->
                <div style="position:relative; width: 300px;">
                    <input 
                        type="text" 
                        name="q" 
                        placeholder="Search project, activity or text..." 
                        hx-get="/history/search" 
                        hx-trigger="keyup changed delay:200ms, search" 
                        hx-target="#history-container"
                        hx-indicator="#search-loading"
                    >
                    <div id="search-loading" class="htmx-indicator" style="position:absolute; right:10px; top:12px; font-size:0.8rem; color:var(--accent-primary)">Searching...</div>
                </div>
            </div>
            
            <div id="history-container">
                ${HistoryTable(history)}
            </div>
        </div>
    `;
    res.send(Layout(content));
});

app.get('/history/search', (req, res) => {
    const q = (req.query.q || '').toLowerCase();
    const filtered = history.filter(item =>
        item.project.toLowerCase().includes(q) ||
        item.activity.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    );
    // Return just the table (replacing the container) or just the rows? 
    // The Input target is #history-container. Ideally I return the whole table to preserve headers.
    res.send(HistoryTable(filtered));
});

app.post('/status', (req, res) => {
    const newItem = {
        id: nextId++,
        date: req.body.date,
        project: req.body.project,
        activity: req.body.activity,
        hours: parseInt(req.body.hours),
        minutes: parseInt(req.body.minutes),
        description: req.body.description
    };

    // Add to top
    history.unshift(newItem);

    // Return ONLY the new row, prepended to the list
    res.send(HistoryRow(newItem));
});

app.listen(port, () => {
    console.log(`DailyStatus app listening at http://localhost:${port}`);
});
