// ===== Homepage Data & Rendering =====
const API_BASE = '';

// ----- Hero Carousel -----
let heroCurrent = 0;
let heroTimer = null;
let heroMovies = [];

// Fallback hero when API is unavailable
var FALLBACK_HERO = [
    { movie_id: 1, movie_name: '流浪地球', poster_url: '流浪地球.jpg', genre: '科幻 / 冒险', description: '太阳即将毁灭，人类在地球表面建造出巨大的推进器，寻找新的家园。', rating: 8.8 },
    { movie_id: 2, movie_name: '哪吒之魔童降世', poster_url: '哪吒之魔童降世.jpg', genre: '动画 / 奇幻', description: '天地灵气孕育出一颗混元珠，元始天尊将混元珠提炼成灵珠和魔丸。', rating: 9.0 },
    { movie_id: 3, movie_name: '复仇者联盟4：终局之战', poster_url: '复仇者联盟4.avif', genre: '动作 / 科幻', description: '漫威宇宙史诗终结篇，复仇者联盟集结对抗灭霸的最后一战。', rating: 9.2 }
];

function imgUrl(path) {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('/')) return path;
    return encodeURI(path);
}

function initHero(movies) {
    heroMovies = movies.slice(0, 3);
    if (heroMovies.length === 0) return;

    const track = document.getElementById('heroTrack');
    const dots = document.getElementById('heroDots');

    track.innerHTML = heroMovies.map((m, i) => `
        <div class="hero-slide">
            <img src="${imgUrl(m.poster_url)}" alt="${m.movie_name}"
                 class="hero-slide-img"
                 onerror="this.style.background='var(--cinema-dark)'; this.style.display='block';">
            <div class="hero-overlay"></div>
            <div class="hero-text">
                <span class="hero-genre">${m.genre || '电影'}</span>
                <h2>${m.movie_name}</h2>
                <p>${m.description ? m.description.substring(0, 80) + (m.description.length > 80 ? '...' : '') : '导演: ' + (m.director || '未知') + ' | 主演: ' + (m.actors || '未知')}</p>
            </div>
        </div>
    `).join('');

    dots.innerHTML = heroMovies.map((_, i) =>
        `<button class="hero-dot${i === 0 ? ' active' : ''}" data-index="${i}"></button>`
    ).join('');

    // Dot click
    dots.addEventListener('click', function(e) {
        const dot = e.target.closest('.hero-dot');
        if (dot) goToHero(parseInt(dot.dataset.index));
    });

    // Arrow buttons
    document.querySelector('.hero-btn.prev').addEventListener('click', () => prevHero());
    document.querySelector('.hero-btn.next').addEventListener('click', () => nextHero());

    // Auto-play
    startHeroAuto();
    const banner = document.getElementById('heroBanner');
    banner.addEventListener('mouseenter', stopHeroAuto);
    banner.addEventListener('mouseleave', startHeroAuto);
}

function goToHero(index) {
    heroCurrent = index;
    const track = document.getElementById('heroTrack');
    track.style.transform = `translateX(-${index * 100}%)`;
    document.querySelectorAll('.hero-dot').forEach((d, i) => {
        d.classList.toggle('active', i === index);
    });
}

function nextHero() { goToHero((heroCurrent + 1) % heroMovies.length); }
function prevHero() { goToHero((heroCurrent - 1 + heroMovies.length) % heroMovies.length); }

function startHeroAuto() {
    stopHeroAuto();
    heroTimer = setInterval(nextHero, 5000);
}
function stopHeroAuto() { if (heroTimer) { clearInterval(heroTimer); heroTimer = null; } }

// ----- Movie Grid -----
function renderMovieGrid(containerId, movies, limit) {
    const container = document.getElementById(containerId);
    const list = limit ? movies.slice(0, limit) : movies;
    if (list.length === 0) {
        container.innerHTML = '<p style="color: var(--cinema-text-dim); text-align: center; padding: 40px;">暂无电影数据</p>';
        return;
    }
    container.innerHTML = list.map(m => `
        <div class="movie-card">
            <div class="movie-poster-wrap" onclick="location.href='movie.html?movie_id=${m.movie_id}'">
                <img src="${imgUrl(m.poster_url)}" alt="${m.movie_name}" class="movie-poster-img"
                     onerror="this.parentElement.style.background='var(--cinema-dark)'; this.alt='${m.movie_name}';">
                <span class="movie-rating-badge">${m.rating || '?'}</span>
                <span class="movie-genre-tag">${m.genre || '电影'}</span>
            </div>
            <h3 class="movie-card-title">${m.movie_name}</h3>
            <button class="movie-card-btn" onclick="event.stopPropagation(); location.href='movie.html?movie_id=${m.movie_id}'">购票</button>
        </div>
    `).join('');
}

// ----- Sidebar: Box Office -----
function renderBoxOffice(data) {
    const container = document.getElementById('boxOffice');
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="color: var(--cinema-text-dim); font-size: 13px;">暂无票房数据</p>';
        return;
    }
    container.innerHTML = data.map((item, i) => `
        <div class="sidebar-item">
            <div class="sidebar-item-info">
                <span class="sidebar-rank ${i < 3 ? 'top' : 'normal'}">${i + 1}</span>
                <span class="sidebar-name">${item.movie_name}</span>
            </div>
            <span class="sidebar-value red">¥${item.total_revenue.toFixed(2)}</span>
        </div>
    `).join('');
}

// ----- Sidebar: Top 10 -----
function renderTop10(movies) {
    const container = document.getElementById('top10');
    const sorted = [...movies].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const top = sorted.slice(0, 10);
    if (top.length === 0) {
        container.innerHTML = '<p style="color: var(--cinema-text-dim); font-size: 13px;">暂无评分数据</p>';
        return;
    }
    container.innerHTML = top.map((item, i) => `
        <div class="sidebar-item">
            <div class="sidebar-item-info">
                <span class="sidebar-rank ${i < 3 ? 'top' : 'normal'}">${i + 1}</span>
                <span class="sidebar-name">${item.movie_name}</span>
            </div>
            <span class="sidebar-value gold">${item.rating}分</span>
        </div>
    `).join('');
}

// ----- Recommend -----
function pickRandom(arr, n) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(n, arr.length));
}

// ----- Load All Data -----
async function loadHomepage() {
    var movies = null;
    var boxOffice = [];

    try {
        var _ref = await Promise.all([
            fetch(API_BASE + '/api/movie/all'),
            fetch(API_BASE + '/api/movie/boxoffice')
        ]);
        movies = await _ref[0].json();
        boxOffice = await _ref[1].json();
    } catch (err) {
        console.warn('API 不可用，使用本地备用数据:', err.message);
    }

    // If API failed, use fallback hero + empty grids
    if (!Array.isArray(movies) || movies.length === 0) {
        initHero(FALLBACK_HERO);
        document.querySelectorAll('.movie-grid').forEach(function (g) {
            g.innerHTML = '<p style="color:var(--cinema-text-dim);text-align:center;padding:40px;grid-column:1/-1;">暂无电影数据，请检查数据库连接</p>';
        });
        renderBoxOffice([]);
        renderTop10([]);
        return;
    }

    // Hero carousel
    initHero(movies);

    // "正在热映" grid
    renderMovieGrid('hotMovies', movies, 6);

    // "为你推荐" grid
    renderMovieGrid('recMovies', pickRandom(movies, 3));

    // Box office sidebar
    renderBoxOffice(Array.isArray(boxOffice) ? boxOffice : []);

    // Top 10 sidebar
    renderTop10(movies);
}

// ----- Init -----
document.addEventListener('DOMContentLoaded', loadHomepage);
