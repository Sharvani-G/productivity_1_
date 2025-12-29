/* public/js/report.js */
(function() {
    const statusColors = { completed: "#22c55e", inprocess: "#eab308", abandoned: "#ef4444" };
    let lineChart;
    let donutChart;
    let serverData = {};

    async function init() {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch('/api/stats/summary', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            serverData = await res.json();

            // 1. Update Top Stats Cards
            document.getElementById("efficiency").innerText = serverData.stats.eff || "0%";
            document.getElementById("completedCount").innerText = serverData.stats.done || 0;
            document.getElementById("inProcessCount").innerText = serverData.stats.active || 0;
            document.getElementById("abandonedCount").innerText = serverData.stats.lost || 0;

            // 2. Render Charts
            renderLineChart();
            renderBarChart();
            renderDonutChart(); 
            
            // 3. Render Professional Heatmap (Fixed for Local Timezone)
            renderHeatmap(serverData.heatmapData);

            // 4. Setup Toggles and Initial Avg
            setupToggles();
            updateAverageDisplay('completed');

        } catch (e) {
            console.error("Dashboard Init Error:", e);
        }
    }

    function renderLineChart() {
        const lineCtx = document.getElementById('lineChart').getContext('2d');
        const percentages = serverData.weeklyData.completed.map((val, i) => 
            serverData.dailyTotalTasks[i] > 0 ? Math.round((val / serverData.dailyTotalTasks[i]) * 100) : 0
        );

        lineChart = new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
                datasets: [{
                    data: percentages,
                    borderColor: statusColors.completed,
                    pointBackgroundColor: statusColors.completed,
                    tension: 0.4, 
                    borderWidth: 3, 
                    fill: false
                }]
            },
            options: {
                maintainAspectRatio: false,
                scales: { 
                    y: { min: 0, max: 100, ticks: { stepSize: 10, color: '#90e0ef' }, grid: { color: 'rgba(144, 224, 239, 0.1)' } },
                    x: { ticks: { color: '#90e0ef' }, grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    function renderDonutChart() {
        const donutCtx = document.getElementById('statusDonut');
        if (!donutCtx) return;
        
        donutChart = new Chart(donutCtx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [serverData.stats.done, serverData.stats.active, serverData.stats.lost],
                    backgroundColor: [statusColors.completed, statusColors.inprocess, statusColors.abandoned],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                cutout: '80%',
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    }

    function renderBarChart() {
        const barCtx = document.getElementById('barChart').getContext('2d');
        new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: ['M','T','W','T','F','S','S'],
                datasets: [{ 
                    data: serverData.dailyTotalTasks, 
                    backgroundColor: '#0077b6',
                    borderRadius: 4
                }]
            },
            options: { 
                maintainAspectRatio: false,
                scales: { 
                    y: { min: 0, max: 16, ticks: { stepSize: 2, color: '#90e0ef' }, grid: { color: 'rgba(144, 224, 239, 0.1)' } },
                    x: { ticks: { color: '#90e0ef' }, grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    /**
     * Professional GitHub-Style Heatmap Logic
     * Updated to handle Local Timezone to ensure "Today" appears correctly.
     */
   function renderHeatmap(weeksData) {
    const heatmap = document.getElementById("heatmap");
    const tooltip = document.getElementById("heatmap-tooltip");
    if (!heatmap || !tooltip) return;
    heatmap.innerHTML = '';

    // 1. Create Lookup Map
    const activityMap = {};
    weeksData.forEach(week => {
        const startDay = new Date(week.weekKey);
        for (let i = 0; i < 7; i++) {
            const current = new Date(startDay);
            current.setDate(startDay.getDate() + i);
            const y = current.getFullYear();
            const m = String(current.getMonth() + 1).padStart(2, '0');
            const d_part = String(current.getDate()).padStart(2, '0');
            const dateKey = `${y}-${m}-${d_part}`;
            
            const tasks = week.days[String(i)] || [];
            if (tasks.length > 0) {
                activityMap[dateKey] = {
                    done: tasks.filter(t => t.status.toLowerCase() === 'completed').length,
                    active: tasks.filter(t => t.status.toLowerCase().includes('process')).length,
                    lost: tasks.filter(t => t.status.toLowerCase() === 'abandoned').length
                };
            }
        }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const totalDays = 371; 
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (totalDays - 1));

    // 2. Generate boxes
    for (let i = 0; i < totalDays; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayNum = String(d.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${dayNum}`;
        
        const dayData = activityMap[dateStr] || { done: 0, active: 0, lost: 0 };
        const dot = document.createElement("div");
        
        let level = 0;
        if (dayData.done > 0) level = 1;
        if (dayData.done > 2) level = 2;
        if (dayData.done > 5) level = 3;
        if (dayData.done > 8) level = 4;

        dot.className = `dot lvl-${level}`;
        
        // 3. New Custom Hover Interaction
        dot.addEventListener('mouseenter', (e) => {
            const content = `
                <span class="tooltip-date">${d.toDateString()}</span>
                ✅ Completed: ${dayData.done}<br>
                ⏳ Ongoing: ${dayData.active}<br>
                ❌ Abandoned: ${dayData.lost}
            `;
            tooltip.innerHTML = content;
            tooltip.style.display = 'block';
        });

        dot.addEventListener('mousemove', (e) => {
            // Position the tooltip slightly above and to the right of the cursor
            tooltip.style.left = (e.clientX + 15) + 'px';
            tooltip.style.top = (e.clientY - 60) + 'px';
        });

        dot.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });

        heatmap.appendChild(dot);
    }
}

    function setupToggles() {
        const container = document.querySelector('.segmented-control.mini-btns');
        if (!container) return;

        container.addEventListener('click', (e) => {
            const btn = e.target.closest('.seg-btn');
            if (!btn) return;

            const type = btn.getAttribute('data-type');
            const dataKey = type === 'inprocess' ? 'inprocess' : type;

            const newData = serverData.weeklyData[dataKey].map((val, i) => 
                serverData.dailyTotalTasks[i] > 0 ? Math.round((val / serverData.dailyTotalTasks[i]) * 100) : 0
            );

            lineChart.data.datasets[0].data = newData;
            lineChart.data.datasets[0].borderColor = statusColors[type];
            lineChart.data.datasets[0].pointBackgroundColor = statusColors[type];
            lineChart.update();

            container.querySelectorAll(".seg-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            updateAverageDisplay(type);
        });
    }

    function updateAverageDisplay(type) {
        const dataKey = type === 'inprocess' ? 'inprocess' : type;
        const values = serverData.weeklyData[dataKey].map((val, i) => 
            serverData.dailyTotalTasks[i] > 0 ? Math.round((val / serverData.dailyTotalTasks[i]) * 100) : 0
        );
        
        const avg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
        
        const labelVal = document.getElementById("stat-val");
        const labelType = document.getElementById("stat-type");
        
        labelType.innerText = (type === 'inprocess' ? 'In-Process' : type.charAt(0).toUpperCase() + type.slice(1)) + " Avg:";
        labelVal.innerText = avg + "%";
        
        labelVal.className = ""; 
        if (type === 'completed') labelVal.classList.add("green");
        else if (type === 'inprocess') labelVal.classList.add("yellow");
        else labelVal.classList.add("red");
    }

    document.addEventListener('DOMContentLoaded', init);
})();