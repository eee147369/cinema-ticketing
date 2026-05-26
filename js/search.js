// ===== Cinema Noir - Consistent Cinema Theme =====

var cinemaBackdrops = [
    { bg: 'linear-gradient(135deg, #f0ede6 0%, #e8e4d9 100%)', border: '#b8942e', accent: '#c0392b' },
    { bg: 'linear-gradient(135deg, #faf8f5 0%, #f0ede6 100%)', border: '#b8942e', accent: '#a8382c' },
    { bg: 'linear-gradient(135deg, #ffffff 0%, #f5f2ec 100%)', border: '#c9a84c', accent: '#a8382c' }
];

function getCinemaImage(name) {
    if (name.indexOf('星光') !== -1) return '影院1.jpg';
    if (name.indexOf('银兴') !== -1) return '影院2.jpg';
    if (name.indexOf('万达') !== -1) return '影院3.jpg';
    return '';
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ?
        parseInt(result[1], 16) + ',' +
        parseInt(result[2], 16) + ',' +
        parseInt(result[3], 16)
        : '0,0,0';
}

// ===== Get active filter =====
function getActiveFilter(listId, dataKey) {
    var activeBtn = document.querySelector('#' + listId + ' button.active');
    if (!activeBtn) return '';
    return dataKey ? activeBtn.dataset[dataKey] : activeBtn.textContent.trim();
}

// ===== Main search =====
async function searchCinemas() {
    var container = document.getElementById('cinema-results');
    if (!container) return;

    var cinemaId = getActiveFilter('cinema-list', 'cinemaId');
    var hallType = getActiveFilter('type-list', null);

    container.innerHTML = '<div class="cinema-loading">搜索中...</div>';

    try {
        var params = new URLSearchParams();
        if (cinemaId) params.append('cinema_id', cinemaId);
        if (hallType) params.append('type', hallType);

        var resp = await fetch('/api/cinema/search?' + params.toString());
        var cinemas = await resp.json();

        if (cinemas.length === 0) {
            container.innerHTML = '<div class="cinema-empty">未找到符合条件的影院</div>';
            return;
        }

        container.innerHTML = '';
        cinemas.forEach(function(c, index) {
            var theme = cinemaBackdrops[index % cinemaBackdrops.length];
            var card = document.createElement('div');
            card.className = 'cinema-card';
            card.style.background = theme.bg;
            card.style.borderColor = theme.border;

            var cinemaImg = getCinemaImage(c.cinema_name);
            if (cinemaImg) {
                card.style.backgroundImage = 'url(' + cinemaImg + '), ' + theme.bg;
                card.style.backgroundSize = 'cover, cover';
                card.style.backgroundPosition = 'center, center';
                card.style.backgroundBlendMode = 'overlay, normal';
            }

            card.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08), inset 0 0 60px rgba(0,0,0,0.03)';
            card.style.transitionDelay = (index * 0.05) + 's';

            card.innerHTML =
                '<div class="cinema-card-header">' +
                '  <h3 class="cinema-name">' + c.cinema_name + '</h3>' +
                '  <span class="cinema-type-badge" style="background:' + theme.accent + '">' + c.type + '</span>' +
                '</div>' +
                '<div class="cinema-address">' + c.address + '</div>';

            container.appendChild(card);

            card.style.cursor = 'pointer';
            card.addEventListener('click', function() {
                window.location.href = 'cinema-detail.html?id=' + c.cinema_id;
            });
        });
    } catch (err) {
        container.innerHTML = '<div class="cinema-empty">加载失败，请检查后端服务</div>';
        console.error('搜索失败:', err);
    }
}

// ===== Bind events =====
document.addEventListener('DOMContentLoaded', function() {
    fetchCinemas();
    fetchTypes();

    var btn = document.getElementById('search-btn');
    if (btn) {
        btn.addEventListener('click', searchCinemas);
    }
});
