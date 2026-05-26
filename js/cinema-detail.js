var API_BASE = '';
var cinemaData = null;
var activeDate = '';
var activeHallFilter = '';

function getQueryParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
}

async function loadCinemaDetail() {
    var cinemaId = getQueryParam('id');
    if (!cinemaId) {
        renderCinemaList();
        return;
    }

    try {
        var resp = await fetch(API_BASE + '/api/cinema/detail?cinema_id=' + cinemaId);
        if (!resp.ok) throw new Error('Not found');
        cinemaData = await resp.json();
    } catch (e) {
        document.getElementById('cdHeader').innerHTML = '<div class="cd-empty">影院不存在或加载失败</div>';
        return;
    }

    document.getElementById('cdHeader').innerHTML =
        '<div class="cd-header-name">' + cinemaData.cinema_name + '</div>' +
        '<div class="cd-header-meta">' + cinemaData.address + ' · ' + cinemaData.type + '</div>';

    renderDateBar();
    renderFilterBar();
    renderMovieList();
}

/* ========== 日期栏 ========== */
function renderDateBar() {
    var bar = document.getElementById('dateBar');
    if (!bar || !cinemaData.dates || cinemaData.dates.length === 0) {
        bar.innerHTML = '';
        return;
    }
    if (!activeDate) activeDate = cinemaData.dates[0];

    var now = new Date();
    var weekDays = ['周日','周一','周二','周三','周四','周五','周六'];

    var html = '';
    cinemaData.dates.forEach(function(d) {
        var parts = d.split('-');
        var dayNum = parseInt(parts[2]);
        var dot = new Date(d);
        var diff = Math.floor((dot - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
        var label = diff === 0 ? '今天' : diff === 1 ? '明天' : diff === 2 ? '后天' : weekDays[dot.getDay()];
        html +=
            '<button class="date-tab' + (d === activeDate ? ' active' : '') + '" data-date="' + d + '">' +
            '<span class="date-day">' + label + '</span>' +
            '<span class="date-num">' + String(dayNum) + '</span>' +
            '</button>';
    });
    bar.innerHTML = html;

    bar.querySelectorAll('.date-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            activeDate = this.dataset.date;
            bar.querySelectorAll('.date-tab').forEach(function(t) { t.classList.remove('active'); });
            this.classList.add('active');
            renderMovieList();
        });
    });
}

/* ========== 影厅类型筛选栏 ========== */
function renderFilterBar() {
    var bar = document.getElementById('cdFilterBar');
    if (!bar) return;

    // 从 schedules 中提取实际影厅类型
    var tags = ['全部'];
    if (cinemaData.type) {
        var cinemaTypes = cinemaData.type.split(/[,，\/、]/).map(function(t) { return t.trim() + '厅'; });
        cinemaTypes.forEach(function(t) { if (tags.indexOf(t) === -1) tags.push(t); });
    }
    // 从 schedules 的 language 字段提取影厅特征
    if (cinemaData.schedules) {
        cinemaData.schedules.forEach(function(s) {
            if (s.language) {
                var parts = s.language.split(/[\s,，\/、]+/);
                parts.forEach(function(p) {
                    if (p.indexOf('IMAX') !== -1) { var tag = 'IMAX厅'; if (tags.indexOf(tag) === -1) tags.push(tag); }
                    else if (p.indexOf('杜比') !== -1) { var tag = '杜比厅'; if (tags.indexOf(tag) === -1) tags.push(tag); }
                    else if (p.indexOf('激光') !== -1) { var tag = '激光厅'; if (tags.indexOf(tag) === -1) tags.push(tag); }
                    else if (p.indexOf('巨幕') !== -1) { var tag = '巨幕厅'; if (tags.indexOf(tag) === -1) tags.push(tag); }
                    else if (p.indexOf('4K') !== -1) { var tag = '4K厅'; if (tags.indexOf(tag) === -1) tags.push(tag); }
                    else if (p.indexOf('VIP') !== -1) { var tag = 'VIP厅'; if (tags.indexOf(tag) === -1) tags.push(tag); }
                });
            }
        });
    }

    var html = '';
    tags.forEach(function(t) {
        html += '<button class="cd-filter-tag' + (activeHallFilter === t || (!activeHallFilter && t === '全部') ? ' active' : '') + '">' + t + '</button>';
    });
    bar.innerHTML = html;

    bar.querySelectorAll('.cd-filter-tag').forEach(function(tag) {
        tag.addEventListener('click', function() {
            activeHallFilter = this.textContent === '全部' ? '' : this.textContent;
            bar.querySelectorAll('.cd-filter-tag').forEach(function(t) { t.classList.remove('active'); });
            this.classList.add('active');
            renderMovieList();
        });
    });
}

/* ========== 电影排片列表 ========== */
function renderMovieList() {
    var container = document.getElementById('cdMovieList');
    if (!container || !activeDate) return;

    container.innerHTML = '<div class="cd-empty">加载中...</div>';

    var url = API_BASE + '/api/cinema/detail?cinema_id=' + getQueryParam('id') + '&date=' + activeDate;
    fetch(url).then(function(resp) { return resp.json(); }).then(function(data) {
        var schedules = data.schedules || [];
        var movies = data.movies || [];

        // 按影厅类型筛选 — 检查 language 字段是否包含影厅类型关键词
        if (activeHallFilter) {
            var filterKeyword = activeHallFilter.replace('厅','').trim();
            schedules = schedules.filter(function(s) {
                var lang = s.language || '';
                return lang.indexOf(filterKeyword) !== -1;
            });
        }

        if (movies.length === 0) {
            container.innerHTML = '<div class="cd-empty">暂无排片信息</div>';
            return;
        }

        var html = '';
        movies.forEach(function(m) {
            var movieSchedules = schedules.filter(function(s) { return s.movie_id === m.movie_id; });
            // 即使没有场次也显示电影区块

            var posterHtml = m.poster_url
                ? '<img class="cd-mb-poster" src="' + m.poster_url + '" alt="' + m.movie_name + '" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><div class="cd-mb-poster-placeholder" style="display:none">' + m.movie_name.substring(0,4) + '</div>'
                : '<div class="cd-mb-poster-placeholder">' + m.movie_name.substring(0,4) + '</div>';

            html +=
                '<div class="cd-movie-block">' +
                '  <div class="cd-movie-block-header">' +
                posterHtml +
                '    <div class="cd-mb-info">' +
                '      <div class="cd-mb-name">' + m.movie_name + '</div>' +
                '      <div class="cd-mb-meta">' + (m.genre || '') + ' / ' + (m.duration || '') + '分钟</div>' +
                '      <div class="cd-mb-rating">' + (m.director ? '导演: ' + m.director : '') + '</div>' +
                '    </div>' +
                '  </div>';

            if (movieSchedules.length === 0) {
                html += '<div class="cd-st-grid"><span style="font-size:12px;color:var(--cinema-text-dim);">该日期暂无场次</span></div>';
            } else {
                html += '<div class="cd-st-grid">';
                movieSchedules.forEach(function(s) {
                    var duration = m.duration || 120;
                    var sp = s.show_time.split(':');
                    var startMin = parseInt(sp[0]) * 60 + parseInt(sp[1]);
                    var endMin = startMin + duration;
                    var endH = Math.floor(endMin / 60) % 24;
                    var endM = endMin % 60;
                    var endTime = String(endH).padStart(2, '0') + ':' + String(endM).padStart(2, '0');

                    html +=
                        '<div class="cd-st-pill">' +
                        '  <span class="cd-st-pill-time">' + s.show_time + '</span>' +
                        '  <span class="cd-st-pill-end">' + endTime + '散场</span>' +
                        '  <span class="cd-st-pill-info">' + (s.language || '') + '</span>' +
                        '  <span class="cd-st-pill-info">' + data.type + '</span>' +
                        '  <span class="cd-st-pill-price">&yen;' + s.price + '</span>' +
                        '</div>';
                });
                html += '</div>';
            }

            html += '</div>';
        });
        container.innerHTML = html;

        // 点击场次按钮跳转选座
        container.querySelectorAll('.cd-st-pill').forEach(function(pill) {
            pill.addEventListener('click', function() {
                // 找到对应的 schedule_id
                var idx = Array.prototype.indexOf.call(container.querySelectorAll('.cd-st-pill'), pill);
                // 获取该场次的 schedule_id — 从 schedules 数组中查找
                var scheduleId = null;
                if (schedules[idx]) scheduleId = schedules[idx].schedule_id;
                if (scheduleId) {
                    window.location.href = 'seat-select.html?schedule_id=' + scheduleId;
                } else {
                    alert('选座购票功能开发中');
                }
            });
        });
    }).catch(function() {
        container.innerHTML = '<div class="cd-empty">加载失败</div>';
    });
}

/* ========== 影院列表（无 ?id 时显示） ========== */
async function renderCinemaList() {
    var header = document.getElementById('cdHeader');
    var dateBar = document.getElementById('dateBar');
    var filterBar = document.getElementById('cdFilterBar');
    var container = document.getElementById('cdMovieList');

    header.innerHTML = '<div style="padding:20px 0;font-family:var(--font-display);font-size:22px;letter-spacing:3px;color:var(--cinema-gold);">选择影院</div>';
    if (dateBar) dateBar.innerHTML = '';
    if (filterBar) filterBar.innerHTML = '';
    container.innerHTML = '<div class="cinema-loading">加载影院列表...</div>';

    try {
        var resp = await fetch(API_BASE + '/api/cinema/list');
        var cinemas = await resp.json();

        if (!Array.isArray(cinemas) || cinemas.length === 0) {
            container.innerHTML = '<div class="cinema-empty">暂无影院数据</div>';
            return;
        }

        container.innerHTML = '';
        container.className = 'cinema-list-container';

        var themes = [
            'linear-gradient(135deg,#f0ede6 0%,#e8e4d9 100%)',
            'linear-gradient(135deg,#faf8f5 0%,#f0ede6 100%)',
            'linear-gradient(135deg,#ffffff 0%,#f5f2ec 100%)'
        ];
        var accents = ['#c0392b','#8b2c24','#a8382c'];

        cinemas.forEach(function(c, i) {
            var card = document.createElement('div');
            card.className = 'cinema-card';
            card.style.background = themes[i % 3];
            card.style.transitionDelay = (i * 0.05) + 's';

            card.innerHTML =
                '<div class="cinema-card-header">' +
                '  <h3 class="cinema-name">' + c.cinema_name + '</h3>' +
                '  <span class="cinema-type-badge" style="background:' + accents[i % 3] + '">' + c.type + '</span>' +
                '</div>' +
                '<div class="cinema-address">' + c.address + '</div>';

            card.addEventListener('click', function() {
                window.location.href = 'cinema-detail.html?id=' + c.cinema_id;
            });

            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML = '<div class="cinema-empty">加载失败，请检查后端服务</div>';
        console.error('加载影院列表失败:', e);
    }
}

document.addEventListener('DOMContentLoaded', loadCinemaDetail);
