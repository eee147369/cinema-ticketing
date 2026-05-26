// ===== 品牌/影院筛选 =====
async function fetchCinemas() {
    try {
        var resp = await fetch('/api/cinema/list');
        var cinemas = await resp.json();
        var ul = document.getElementById('cinema-list');
        ul.innerHTML = '';

        cinemas.forEach(function(c) {
            var li = document.createElement('li');
            var btn = document.createElement('button');
            btn.textContent = c.cinema_name;
            btn.dataset.cinemaId = c.cinema_id;
            btn.addEventListener('click', function() {
                document.querySelectorAll('#cinema-list button').forEach(function(b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
            });
            li.appendChild(btn);
            ul.appendChild(li);
        });

        if (cinemas.length > 0) {
            var firstBtn = ul.querySelector('button');
            if (firstBtn) firstBtn.classList.add('active');
        }
    } catch (err) {
        document.getElementById('cinema-list').innerHTML = '<li>加载失败</li>';
        console.error('获取影院失败:', err);
    }
}
