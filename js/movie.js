/* ========== 全局数据 ========== */
var movieList = [];
var dateList = [];
var activeDateIndex = 0;
var carouselState = { centerIndex: 0, total: 0 };
var API_BASE = '';

/* ========== 从数据库加载电影和日期 ========== */
async function loadAllData() {
    try {
        var mResp = await fetch(API_BASE + '/api/movie/all');
        movieList = await mResp.json();
        carouselState.total = movieList.length;
    } catch (e) {
        console.error('加载电影失败', e);
        movieList = [];
    }

    // 直接生成明天起3天日期，不依赖后端API
    var now = new Date();
    var wd = ['周日','周一','周二','周三','周四','周五','周六'];
    for (var i = 1; i < 4; i++) {
        var d = new Date(now);
        d.setDate(d.getDate() + i);
        var label = i === 1 ? '明天' : i === 2 ? '后天' : wd[d.getDay()];
        var mm = d.getMonth() + 1;
        var dd = d.getDate();
        dateList.push({
            label: label,
            date: mm + '月' + dd + '日',
            full: d.getFullYear() + '-' + String(mm).padStart(2,'0') + '-' + String(dd).padStart(2,'0')
        });
    }
}

/* ========== 轮播 ========== */
function renderCarousel() {
    var track = document.getElementById('carouselTrack');
    if (!track || movieList.length === 0) return;

    var idx = carouselState.centerIndex;
    var total = carouselState.total;
    var positions = [];
    for (var i = 0; i < total; i++) {
        var offset = i - idx;
        if (offset < -Math.floor(total / 2)) offset += total;
        if (offset > Math.floor(total / 2)) offset -= total;
        positions.push({ originalIndex: i, offset: offset });
    }
    positions.sort(function(a, b) { return a.offset - b.offset; });

    track.innerHTML = '';
    positions.forEach(function(pos) {
        var card = document.createElement('div');
        card.className = 'movie-poster-card';
        if (pos.offset === 0) card.className += ' center';
        else if (Math.abs(pos.offset) === 1) card.className += ' side';
        else card.className += ' hidden-card';

        var movie = movieList[pos.originalIndex];
        (function(m) {
            var img = document.createElement('img');
            img.src = m.poster_url || '';
            img.alt = m.movie_name;
            img.onerror = function() {
                this.src = 'data:image/svg+xml,' + encodeURIComponent(
                    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280"><rect width="200" height="280" fill="#f0ede6"/><text x="100" y="140" text-anchor="middle" fill="#9b8d7e" font-size="14">' + m.movie_name + '</text></svg>'
                );
            };
            card.appendChild(img);
        })(movie);

        (function(off) {
            card.addEventListener('click', function() {
                if (off < 0) navigateCarousel(-1);
                else if (off > 0) navigateCarousel(1);
            });
        })(pos.offset);

        track.appendChild(card);
    });

    updateMovieInfo();
}

function navigateCarousel(direction) {
    carouselState.centerIndex += direction;
    if (carouselState.centerIndex < 0) carouselState.centerIndex = carouselState.total - 1;
    if (carouselState.centerIndex >= carouselState.total) carouselState.centerIndex = 0;
    renderCarousel();
    renderShowtimes();
}

function updateMovieInfo() {
    var movie = movieList[carouselState.centerIndex];
    var panel = document.getElementById('movieInfoPanel');
    if (!panel || !movie) return;
    var ratingHtml = movie.rating > 0
        ? movie.rating + '分 <span>' + movie.review_count + '人评</span>'
        : '<span>暂无评分</span>';
    panel.innerHTML =
        '<div class="info-title">' + movie.movie_name + '</div>' +
        '<div class="info-rating">' + ratingHtml + '</div>' +
        '<div class="info-meta">' + movie.duration + '分钟 / ' + (movie.genre || '') + '</div>' +
        '<div class="info-cast">' + (movie.actors || movie.director || '') + '</div>';

    // 更新剧情简介
    var descDiv = document.getElementById('movieDesc');
    if (descDiv) {
        descDiv.innerHTML = movie.description || '暂无简介';
    }
    // 重置描述折叠状态
    var descBtn = document.getElementById('descToggleBtn');
    if (descBtn) {
        descBtn.textContent = '展开剧情简介';
        if (descDiv) descDiv.classList.remove('show');
    }

    // 检查收藏状态
    checkFavoriteStatus(movie.movie_id);

    // 加载评论
    loadReviews(movie.movie_id);
}

/* ========== 日期切换 ========== */
function renderDateBar() {
    var bar = document.getElementById('dateBar');
    if (!bar) return;
    bar.innerHTML = '';
    dateList.forEach(function(d, i) {
        var tab = document.createElement('button');
        tab.className = 'date-tab' + (i === activeDateIndex ? ' active' : '');
        var dayNum = parseInt(d.full.split('-')[2]);
        tab.innerHTML = '<span class="date-day">' + d.label + '</span><span class="date-num">' + dayNum + '</span>';
        tab.addEventListener('click', function() {
            activeDateIndex = i;
            renderDateBar();
            renderShowtimes();
        });
        bar.appendChild(tab);
    });
}

function getActiveDate() {
    return dateList[activeDateIndex];
}

/* ========== 场次渲染（从 API 加载） ========== */
async function renderShowtimes() {
    var container = document.getElementById('showtimeList');
    if (!container || movieList.length === 0) return;
    var movie = movieList[carouselState.centerIndex];
    var date = getActiveDate();
    if (!date) return;

    container.innerHTML = '<div class="showtime-empty">加载中...</div>';

    try {
        var resp = await fetch(API_BASE + '/api/movie/showtimes?movie_id=' + movie.movie_id + '&date=' + date.full);
        var times = await resp.json();

        if (!times || times.length === 0) {
            container.innerHTML = '<div class="showtime-empty">该日期暂无场次</div>';
            return;
        }

        var html = '';
        times.forEach(function(t) {
            html +=
                '<div class="showtime-card">' +
                '  <div class="showtime-time-col">' +
                '    <div class="showtime-start">' + t.time + '</div>' +
                '    <div class="showtime-end">' + t.end_time + '散场</div>' +
                '  </div>' +
                '  <div class="showtime-info-col">' +
                '    <div class="showtime-lang">' + (movie.genre || '') + '</div>' +
                '    <div class="showtime-hall">' + t.cinema_name + ' ' + t.cinema_type + '</div>' +
                '  </div>' +
                '  <div class="showtime-price-col">' +
                '    <div class="showtime-price">&yen;' + t.price + '<small>起</small></div>' +
                '  </div>' +
                '  <div class="showtime-btn-col">' +
                '    <button class="showtime-buy-btn">购票</button>' +
                '  </div>' +
                '</div>';
        });
        container.innerHTML = html;

        // 购票按钮点击跳转选座
        container.querySelectorAll('.showtime-buy-btn').forEach(function(btn, idx) {
            btn.addEventListener('click', function() {
                var t = times[idx];
                if (t && t.schedule_id) {
                    window.location.href = 'seat-select.html?schedule_id=' + t.schedule_id;
                } else {
                    alert('选座购票功能开发中');
                }
            });
        });
    } catch (e) {
        console.error('加载场次失败', e);
        container.innerHTML = '<div class="showtime-empty">加载失败，请检查后端服务</div>';
    }
}

/* ========== 剧情简介展开/折叠 ========== */
document.addEventListener('DOMContentLoaded', function() {
    var descBtn = document.getElementById('descToggleBtn');
    if (descBtn) {
        descBtn.addEventListener('click', function() {
            var descDiv = document.getElementById('movieDesc');
            if (!descDiv) return;
            var isShow = descDiv.classList.toggle('show');
            this.textContent = isShow ? '收起简介' : '展开剧情简介';
        });
    }
});

/* ========== 收藏功能 ========== */
function checkFavoriteStatus(movieId) {
    var userData = localStorage.getItem('user');
    var favBtn = document.getElementById('favBtn');
    if (!favBtn || !movieId) return;

    if (!userData) {
        favBtn.innerHTML = '&#9825; 收藏';
        favBtn.classList.remove('active');
        return;
    }

    var user = JSON.parse(userData);
    fetch('/api/favorite/list?user_id=' + user.user_id)
        .then(function(r) { return r.json(); })
        .then(function(favs) {
            var isFav = favs.some(function(f) { return String(f.movie_id) === String(movieId); });
            if (isFav) {
                favBtn.innerHTML = '&#9829; 已收藏';
                favBtn.classList.add('active');
            } else {
                favBtn.innerHTML = '&#9825; 收藏';
                favBtn.classList.remove('active');
            }
        })
        .catch(function() {});
}

function toggleFavorite() {
    var userData = localStorage.getItem('user');
    if (!userData) {
        if (typeof showToast === 'function') showToast('请先登录', 'error');
        setTimeout(function() { window.location.href = 'login.html'; }, 1000);
        return;
    }

    var movie = movieList[carouselState.centerIndex];
    if (!movie) return;

    var user = JSON.parse(userData);
    var favBtn = document.getElementById('favBtn');
    var isFav = favBtn && favBtn.classList.contains('active');

    var url = isFav
        ? '/api/favorite/remove'
        : '/api/favorite/add';

    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id, movie_id: movie.movie_id })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.error) {
            if (typeof showToast === 'function') showToast(data.error, 'error');
            return;
        }
        if (typeof showToast === 'function') {
            showToast(isFav ? '已取消收藏' : '收藏成功', 'success');
        }
        checkFavoriteStatus(movie.movie_id);
    })
    .catch(function() {
        if (typeof showToast === 'function') showToast('操作失败', 'error');
    });
}

document.addEventListener('DOMContentLoaded', function() {
    var favBtn = document.getElementById('favBtn');
    if (favBtn) {
        favBtn.addEventListener('click', toggleFavorite);
    }
});

/* ========== 评论加载 ========== */
function loadReviews(movieId) {
    var reviewList = document.getElementById('reviewList');
    if (!reviewList || !movieId) return;

    fetch('/api/review/list?movie_id=' + movieId)
        .then(function(r) { return r.json(); })
        .then(function(reviews) {
            if (!reviews || reviews.length === 0) {
                reviewList.innerHTML = '<div class="review-empty">暂无评论</div>';
                return;
            }
            var html = '';
            reviews.forEach(function(r) {
                var stars = '';
                for (var i = 0; i < 5; i++) {
                    stars += i < r.rating ? '★' : '☆';
                }
                html +=
                    '<div class="review-item">' +
                    '  <span class="review-user">' + r.user_name + '</span>' +
                    '  <span class="review-stars">' + stars + '</span>' +
                    '  <div class="review-content">' + r.content + '</div>' +
                    '  <div class="review-time">' + r.create_time + '</div>' +
                    '</div>';
            });
            reviewList.innerHTML = html;
        })
        .catch(function() {
            reviewList.innerHTML = '<div class="review-empty">加载评论失败</div>';
        });
}

/* ========== 初始化 ========== */
document.addEventListener('DOMContentLoaded', async function() {
    await loadAllData();

    // 支持 ?movie_id=X URL 参数，自动定位到对应电影
    var params = new URLSearchParams(window.location.search);
    var targetMovieId = params.get('movie_id');
    if (targetMovieId) {
        for (var i = 0; i < movieList.length; i++) {
            if (String(movieList[i].movie_id) === targetMovieId) {
                carouselState.centerIndex = i;
                break;
            }
        }
    }

    renderCarousel();
    renderDateBar();
    renderShowtimes();

    document.getElementById('carouselPrev').addEventListener('click', function() { navigateCarousel(-1); });
    document.getElementById('carouselNext').addEventListener('click', function() { navigateCarousel(1); });
});
