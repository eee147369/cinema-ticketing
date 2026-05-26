// ===== 影厅类型筛选 =====
async function fetchTypes() {
    try {
        var resp = await fetch('/api/cinema/types');
        var types = await resp.json();
        var ul = document.getElementById('type-list');
        ul.innerHTML = '';

        types.forEach(function(t) {
            var li = document.createElement('li');
            var btn = document.createElement('button');
            btn.textContent = t;
            btn.addEventListener('click', function() {
                document.querySelectorAll('#type-list button').forEach(function(b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
            });
            li.appendChild(btn);
            ul.appendChild(li);
        });

        if (types.length > 0) {
            var firstBtn = ul.querySelector('button');
            if (firstBtn) firstBtn.classList.add('active');
        }
    } catch (err) {
        document.getElementById('type-list').innerHTML = '<li>加载失败</li>';
        console.error('获取影厅类型失败:', err);
    }
}
