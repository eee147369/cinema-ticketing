// ===== 日期筛选 =====
function getWeekDay(dateStr) {
    var days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    var d = new Date(dateStr + 'T00:00:00');
    var today = new Date();
    today.setHours(0,0,0,0);
    var tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.getTime() === today.getTime()) return '今天';
    if (d.getTime() === tomorrow.getTime()) return '明天';
    return days[d.getDay()];
}

function formatDateDisplay(dateStr) {
    var parts = dateStr.split('-');
    return parts[1] + '/' + parts[2];
}

async function fetchDates() {
    try {
        var resp = await fetch('/api/movie/dates');
        var dates = await resp.json();
        var ul = document.getElementById('date-list');
        ul.innerHTML = '';

        dates.forEach(function(d) {
            var li = document.createElement('li');
            var btn = document.createElement('button');
            var dow = getWeekDay(d);
            btn.textContent = formatDateDisplay(d) + ' ' + dow;
            btn.dataset.date = d;
            btn.addEventListener('click', function() {
                document.querySelectorAll('#date-list button').forEach(function(b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
            });
            li.appendChild(btn);
            ul.appendChild(li);
        });

        if (dates.length > 0) {
            var firstBtn = ul.querySelector('button');
            if (firstBtn) {
                firstBtn.classList.add('active');
            }
        }
    } catch (err) {
        document.getElementById('date-list').innerHTML = '<li>加载失败</li>';
        console.error('获取日期失败:', err);
    }
}
