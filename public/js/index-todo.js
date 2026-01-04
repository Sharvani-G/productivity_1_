/* public/js/index-todo.js */
(function() {
    async function loadToday() {
        const container = document.getElementById('current-day-tasks');
        const token = localStorage.getItem('token');
        if (!container || !token) return;

        const now = new Date();
        const jsDay = now.getDay();
        const trackerIndex = jsDay === 0 ? 6 : jsDay - 1; // Mon=0...Sat=5, Sun=6

        function formatDateLocal(d) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }

        // Calculate Monday weekKey
        const diff = now.getDate() - jsDay + (jsDay === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diff));
        const weekKey = formatDateLocal(monday);

        try {
            const res = await fetch(`/api/tasks/${weekKey}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const days = await res.json();
                const tasks = days[String(trackerIndex)] || [];
                render(tasks, container);
            }
        } catch (e) { console.error(e); }
    }

function render(tasks, container) {
        if (!tasks.length) {
            container.innerHTML = '<p>🎉 No tasks scheduled for today. <a href="/weekly">Add some</a>!</p>';
            return;
        }

        const list = tasks.map(t => {
            // Logic to determine status text and style, matching planner.js values
            const statusText = t.status || 'No status';
            let badgeStyle = "font-size: 0.75rem; margin-left: 10px; padding: 2px 8px; border-radius: 12px; font-weight: 600; text-transform: uppercase;";
            
            // Assign colors based on the status
            if (statusText === 'Completed') {
                badgeStyle += "background-color: #d4edda; color: #155724;";
            } else if (statusText === 'In Process') {
                badgeStyle += "background-color: #fff3cd; color: #856404;";
            } else if (statusText === 'Abandoned') {
                badgeStyle += "background-color: #f8d7da; color: #721c24;";
            } else {
                badgeStyle += "background-color: #e2e3e5; color: #383d41;";
            }

            return `
                <li style="margin-bottom: 12px; display: flex; align-items: center; ${t.status === 'Completed' ? 'text-decoration:line-through;opacity:0.7;' : ''}">
                    <span>${t.status === 'Completed' ? '✅' : '⏳'} ${t.text}</span>
                    <span style="${badgeStyle}">${statusText}</span>
                </li>`;
        }).join('');

        container.innerHTML = `<ul style="list-style:none;padding:0;">${list}</ul>`;
    }

    document.addEventListener('DOMContentLoaded', loadToday);
    window.addEventListener('pageshow', loadToday);
})();