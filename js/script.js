/* ========== 登录状态与下拉菜单 ========== */

function checkLoginState() {
    var user = localStorage.getItem('user');
    var profileOpt = document.getElementById('profileOption');
    var ticketOpt = document.getElementById('ticketOption');
    var logoutOpt = document.getElementById('logoutOption');
    var favOpt = document.querySelector('.dropdown-item[data-tab="favorite"]');
    var label = document.querySelector('.avatar-label');

    if (user) {
        var userData = JSON.parse(user);
        if (label) label.textContent = userData.user_name;
        if (profileOpt) profileOpt.style.display = 'block';
        if (ticketOpt) ticketOpt.style.display = 'block';
        if (favOpt) favOpt.style.display = 'block';
        if (logoutOpt) logoutOpt.style.display = 'block';
    } else {
        if (label) label.textContent = '登录';
        if (profileOpt) profileOpt.style.display = 'none';
        if (ticketOpt) ticketOpt.style.display = 'none';
        if (favOpt) favOpt.style.display = 'none';
        if (logoutOpt) logoutOpt.style.display = 'none';
    }
}

/* 下拉菜单切换 */
function toggleDropdown(e) {
    e.stopPropagation();
    document.getElementById('dropdownMenu').classList.toggle('show');
}

/* 点击页面其他区域关闭下拉 */
document.addEventListener('click', function() {
    var menu = document.getElementById('dropdownMenu');
    if (menu) menu.classList.remove('show');
});

/* 点击下拉项切换面板（或跳转到 USER.html） */
document.addEventListener('DOMContentLoaded', function() {
    var dropdownItems = document.querySelectorAll('.dropdown-item[data-tab]');
    dropdownItems.forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            var tab = this.getAttribute('data-tab');
            var panelInfo = document.getElementById('panelInfo');
            var panelTicket = document.getElementById('panelTicket');
            var panelFavorite = document.getElementById('panelFavorite');

            // 如果不在 USER.html（面板不存在），跳转到 USER.html 并带上 tab 参数
            if (!panelInfo || !panelTicket) {
                window.location.href = 'USER.html?tab=' + tab;
                return;
            }

            panelInfo.classList.remove('active');
            panelTicket.classList.remove('active');
            if (panelFavorite) panelFavorite.classList.remove('active');

            if (tab === 'information') panelInfo.classList.add('active');
            else if (tab === 'ticket') panelTicket.classList.add('active');
            else if (tab === 'favorite' && panelFavorite) panelFavorite.classList.add('active');

            document.getElementById('dropdownMenu').classList.remove('show');
        });
    });
});

/* 退出登录 */
document.addEventListener('DOMContentLoaded', function() {
    var logoutBtn = document.getElementById('logoutOption');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('user');
            window.location.reload();
        });
    }
});

/* 头像点击：未登录跳转登录页，已登录显示下拉 */
document.addEventListener('DOMContentLoaded', function() {
    var trigger = document.getElementById('avatarTrigger');
    var avatarWrap = trigger ? trigger.closest('.nav-item-two') : null;
    if (avatarWrap) {
        avatarWrap.addEventListener('click', function(e) {
            var user = localStorage.getItem('user');
            if (!user) {
                window.location.href = 'login.html';
            } else {
                toggleDropdown(e);
            }
        });
    }
});

/* ========== 页面初始化 ========== */

/* 根据 URL 参数 ?tab= 切换面板（从其他页面跳转过来时使用） */
(function() {
    var params = new URLSearchParams(window.location.search);
    var tab = params.get('tab');
    if (tab) {
        var panelInfo = document.getElementById('panelInfo');
        var panelTicket = document.getElementById('panelTicket');
        var panelFavorite = document.getElementById('panelFavorite');
        if (panelInfo) panelInfo.classList.remove('active');
        if (panelTicket) panelTicket.classList.remove('active');
        if (panelFavorite) panelFavorite.classList.remove('active');

        if (tab === 'information' && panelInfo) panelInfo.classList.add('active');
        else if (tab === 'ticket' && panelTicket) panelTicket.classList.add('active');
        else if (tab === 'favorite' && panelFavorite) panelFavorite.classList.add('active');
    }
})();

document.addEventListener('DOMContentLoaded', function() {
    /* 初始化登录状态 */
    checkLoginState();

    /* 加载数据 */
    fetchUserInfo();
    renderAllTickets();
    renderAllFavorites();
});

async function fetchUserInfo() {
    var userData = localStorage.getItem('user');
    if (!userData) {
        ['user_id', 'user_name', 'phone', 'email', 'register_time'].forEach(function(f) {
            var el = document.getElementById(f);
            if (el) el.innerText = '请先登录';
        });
        return;
    }
    var user = JSON.parse(userData);
    var userId = user.user_id;

    try {
        var resp = await fetch('/api/user/info?user_id=' + userId);
        var data = await resp.json();
        var fields = ['user_id', 'user_name', 'phone', 'email', 'register_time'];
        fields.forEach(function(f) {
            var el = document.getElementById(f);
            if (el) el.innerText = data[f] || '加载失败';
        });
    } catch (err) {
        console.error('获取用户信息失败:', err);
        ['user_id', 'user_name', 'phone', 'email', 'register_time'].forEach(function(f) {
            var el = document.getElementById(f);
            if (el) el.innerText = '加载失败';
        });
    }
}

async function renderAllTickets() {
    var userData = localStorage.getItem('user');
    if (!userData) {
        var container = document.getElementById('ticket-container');
        if (container) container.innerHTML = '<p style="color:var(--cinema-text-dim);text-align:center;padding:40px;">请先登录</p>';
        return;
    }
    var user = JSON.parse(userData);
    var userId = user.user_id;

    try {
        var resp = await fetch('/api/ticket/all?user_id=' + userId);
        var tickets = await resp.json();
        var container = document.getElementById('ticket-container');
        if (!container) return;

        if (tickets.length === 0) {
            container.innerHTML = '<p>暂无购票记录</p>';
            return;
        }

        var html =
            '<table class="ticket-table">' +
            '  <thead><tr>' +
            '    <th>ID</th><th>电影</th><th>影院</th>' +
            '    <th>座位</th><th>价格</th><th>场次</th><th>购买时间</th><th>状态</th><th>操作</th>' +
            '  </tr></thead>' +
            '  <tbody>';
        tickets.forEach(function(t) {
            var statusClass = '';
            if (t.status.indexOf('已支付') > -1 || t.status.indexOf('已出票') > -1) statusClass = 'status-paid';
            else if (t.status.indexOf('已退款') > -1 || t.status.indexOf('已取消') > -1) statusClass = 'status-refunded';

            var actionHtml = '';
            if (t.status.indexOf('已支付') > -1 || t.status.indexOf('已出票') > -1) {
                actionHtml = '<button class="refund-btn" data-id="' + t.ticket_id + '">退票</button>';
            } else {
                actionHtml = '<span class="refunded-label">已退票</span>';
            }

            html +=
                '<tr>' +
                '  <td>' + t.ticket_id + '</td>' +
                '  <td>' + t.movie_name + '</td>' +
                '  <td>' + t.cinema_name + '</td>' +
                '  <td>' + t.seat_number + '</td>' +
                '  <td>' + t.price + '</td>' +
                '  <td>' + t.show_time + '</td>' +
                '  <td>' + t.buy_time + '</td>' +
                '  <td class="' + statusClass + '">' + t.status + '</td>' +
                '  <td>' + actionHtml + '</td>' +
                '</tr>';
        });
        html += '</tbody></table>';
        container.innerHTML = html;

        // 退票按钮点击事件
        container.querySelectorAll('.refund-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                var ticketId = this.dataset.id;
                if (!confirm('确定要退票吗？')) return;
                var self = this;
                fetch('/api/ticket/refund', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ticket_id: ticketId })
                })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.message) {
                        renderAllTickets();
                    } else {
                        alert(data.error || '退票失败');
                    }
                })
                .catch(function() {
                    alert('网络错误，请稍后重试');
                });
            });
        });
    } catch (err) {
        console.error('加载购票记录失败:', err);
        var container = document.getElementById('ticket-container');
        if (container) container.innerHTML = '<p>加载失败</p>';
    }
}

async function renderAllFavorites() {
    var userData = localStorage.getItem('user');
    var container = document.getElementById('favorite-container');

    if (!container) return;

    if (!userData) {
        container.innerHTML = '<p style="color:var(--cinema-text-dim);text-align:center;padding:40px;">请先登录</p>';
        return;
    }

    var user = JSON.parse(userData);
    var userId = user.user_id;

    try {
        var resp = await fetch('/api/favorite/list?user_id=' + userId);
        var favorites = await resp.json();

        if (favorites.length === 0) {
            container.innerHTML = '<p style="color:var(--cinema-text-dim);text-align:center;padding:40px;">暂无收藏</p>';
            return;
        }

        var html = '<div class="favorite-grid">';
        favorites.forEach(function(f) {
            var imgSrc = (f.poster_url && f.poster_url !== 'null') ? f.poster_url : (f.movie_name + '.jpg');
            var favId = f.favorite_id;
            html +=
                '<div class="fav-card" data-favid="' + favId + '" data-movieid="' + f.movie_id + '">' +
                '  <img class="fav-poster" src="' + imgSrc + '" alt="' + f.movie_name + '" onerror="this.style.display=\'none\'">' +
                '  <div class="fav-info">' +
                '    <h4>' + f.movie_name + '</h4>' +
                '    <div class="fav-meta">' +
                '      <span class="fav-icon-genre"></span> ' + (f.genre || '未知') +
                '      <span class="fav-icon-duration"></span> ' + (f.duration || '未知') + ' 分钟' +
                '    </div>' +
                '    <div class="fav-time">收藏于 ' + f.create_time + '</div>' +
                '  </div>' +
                '  <button class="fav-remove-btn" data-movieid="' + f.movie_id + '" title="取消收藏">&times;</button>' +
                '</div>';
        });
        html += '</div>';
        container.innerHTML = html;

        // 取消收藏按钮事件
        container.querySelectorAll('.fav-remove-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var movieId = this.dataset.movieid;
                var userData = localStorage.getItem('user');
                if (!userData) return;
                var user = JSON.parse(userData);
                var self = this;
                fetch('/api/favorite/remove', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: user.user_id, movie_id: movieId })
                })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.message) {
                        var card = self.closest('.fav-card');
                        if (card) card.style.opacity = '0';
                        setTimeout(function() {
                            if (card && card.parentNode) card.parentNode.removeChild(card);
                            if (typeof showToast === 'function') showToast('已取消收藏', 'success');
                        }, 300);
                    }
                })
                .catch(function() {});
            });
        });
    } catch (err) {
        console.error('加载收藏失败:', err);
        container.innerHTML = '<p style="color:var(--cinema-text-dim);text-align:center;padding:40px;">加载失败</p>';
    }
}

/* ========== 全局搜索 ========== */
(function() {
    var input = document.getElementById('searchInput');
    var results = document.getElementById('searchResults');
    if (!input || !results) return;

    var searchTimeout = null;
    var API_BASE = '';

    input.addEventListener('input', function() {
        var keyword = this.value.trim();
        if (keyword.length < 1) {
            results.classList.remove('show');
            return;
        }
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(function() {
            fetch(API_BASE + '/api/movie/search?keyword=' + encodeURIComponent(keyword))
                .then(function(r) { return r.json(); })
                .then(function(movies) {
                    if (!movies || movies.length === 0) {
                        results.innerHTML = '<div class="nav-search-empty">未找到匹配电影</div>';
                        results.classList.add('show');
                        return;
                    }
                    var html = '';
                    movies.forEach(function(m) {
                        var poster = m.poster_url || '';
                        var imgHtml = poster
                            ? '<img src="' + poster + '" alt="" onerror="this.style.display=\'none\'">'
                            : '<div style="width:36px;height:50px;background:var(--cinema-dark);border-radius:4px;"></div>';
                        html +=
                            '<a class="nav-search-result-item" href="movie.html?movie_id=' + m.movie_id + '">' +
                            imgHtml +
                            '  <div class="nav-search-result-info">' +
                            '    <div class="nav-search-result-name">' + m.movie_name + '</div>' +
                            '    <div class="nav-search-result-meta">' + (m.genre || '') + ' · ' + (m.duration || '') + '分钟</div>' +
                            '  </div>' +
                            '  <div class="nav-search-result-rating">' + (m.rating > 0 ? m.rating : '') + '</div>' +
                            '</a>';
                    });
                    results.innerHTML = html;
                    results.classList.add('show');
                })
                .catch(function() {
                    results.innerHTML = '<div class="nav-search-empty">搜索失败</div>';
                    results.classList.add('show');
                });
        }, 300);
    });

    input.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            results.classList.remove('show');
            input.blur();
        }
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav-search')) {
            results.classList.remove('show');
        }
    });
})();

