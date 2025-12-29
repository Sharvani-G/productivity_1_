/* public/js/index-todo.js */
(function() {
    async function loadToday() {
        const container = document.getElementById('current-day-tasks');
        const token = localStorage.getItem('token');
        if (!container || !token) return;

        const now = new Date();
        const jsDay = now.getDay();
        const trackerIndex = jsDay === 0 ? 6 : jsDay - 1; // Mon=0...Sat=5, Sun=6

        // Calculate Monday weekKey
        const diff = now.getDate() - jsDay + (jsDay === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diff));
        const weekKey = monday.toISOString().split('T')[0];

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
        const list = tasks.map(t => `<li style="${t.status === 'completed' ? 'text-decoration:line-through;opacity:0.7;' : ''}">
            ${t.status === 'completed' ? '✅' : '⏳'} ${t.text}</li>`).join('');
        container.innerHTML = `<ul style="list-style:none;padding:0;">${list}</ul>`;
    }

    document.addEventListener('DOMContentLoaded', loadToday);
    window.addEventListener('pageshow', loadToday);
})();