/* ========== 选座购票 ========== */
var API_BASE = '';
var scheduleData = null;
var selectedSeats = [];
var seatPrice = 0;

function getQueryParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
}

async function loadSeatPage() {
    var scheduleId = getQueryParam('schedule_id');
    if (!scheduleId) {
        document.getElementById('seatInfoBar').innerHTML = '<div class="seat-loading">缺少场次信息</div>';
        return;
    }

    try {
        var resp = await fetch(API_BASE + '/api/schedule/seats?schedule_id=' + scheduleId);
        if (!resp.ok) throw new Error('Not found');
        scheduleData = await resp.json();
        seatPrice = scheduleData.price;

        renderInfo();
        renderSeats();
    } catch (e) {
        document.getElementById('seatInfoBar').innerHTML = '<div class="seat-loading">加载失败，请检查后端服务</div>';
        console.error('加载场次失败:', e);
    }
}

function renderInfo() {
    var bar = document.getElementById('seatInfoBar');
    if (!scheduleData) return;

    var posterHtml = scheduleData.poster_url
        ? '<img class="seat-info-poster" src="' + scheduleData.poster_url + '" alt="' + scheduleData.movie_name + '" onerror="this.style.display=\'none\'">'
        : '';

    bar.innerHTML =
        '<div class="seat-info-row">' +
        (posterHtml || '') +
        '  <div class="seat-info-details">' +
        '    <div class="seat-info-title">' + scheduleData.movie_name + '</div>' +
        '    <div class="seat-info-meta">' +
               scheduleData.cinema_name + ' · ' + (scheduleData.cinema_type || '') + '<br>' +
               scheduleData.show_date + ' ' + scheduleData.show_time + ' · ' +
               (scheduleData.genre || '') +
        '    </div>' +
        '  </div>' +
        '  <div class="seat-info-price">¥' + seatPrice + '</div>' +
        '</div>';
}

function renderSeats() {
    var grid = document.getElementById('seatGrid');
    if (!grid || !scheduleData) return;

    var rows = scheduleData.rows || 8;
    var cols = scheduleData.cols || 10;
    var takenSeats = scheduleData.taken_seats || [];

    grid.innerHTML = '';

    for (var r = 0; r < rows; r++) {
        var rowDiv = document.createElement('div');
        rowDiv.className = 'seat-row';

        var label = document.createElement('div');
        label.className = 'seat-row-label';
        label.textContent = String.fromCharCode(65 + r);
        rowDiv.appendChild(label);

        for (var c = 0; c < cols; c++) {
            var seatNum = String.fromCharCode(65 + r) + '排' + (c + 1) + '座';
            var seat = document.createElement('div');
            seat.className = 'seat';
            seat.dataset.seat = seatNum;

            // 检查是否已售
            if (takenSeats.indexOf(seatNum) !== -1) {
                seat.classList.add('taken');
            } else {
                seat.classList.add('available');
                seat.addEventListener('click', toggleSeat);
            }

            rowDiv.appendChild(seat);
        }
        grid.appendChild(rowDiv);
    }
}

function toggleSeat() {
    var seat = this;
    var seatNum = seat.dataset.seat;

    if (seat.classList.contains('taken')) return;

    if (seat.classList.contains('selected')) {
        seat.classList.remove('selected');
        seat.classList.add('available');
        var idx = selectedSeats.indexOf(seatNum);
        if (idx !== -1) selectedSeats.splice(idx, 1);
    } else {
        // 最多选5座
        if (selectedSeats.length >= 5) {
            if (typeof showToast === 'function') {
                showToast('每次最多选择5个座位', 'error');
            }
            return;
        }
        seat.classList.remove('available');
        seat.classList.add('selected');
        selectedSeats.push(seatNum);
    }

    updateFooter();
}

function updateFooter() {
    var info = document.getElementById('selectedInfo');
    var price = document.getElementById('totalPrice');
    var btn = document.getElementById('confirmBtn');

    if (selectedSeats.length === 0) {
        info.textContent = '未选座';
        price.textContent = '¥0';
        btn.disabled = true;
    } else {
        info.textContent = '已选 ' + selectedSeats.join('、');
        price.textContent = '¥' + (selectedSeats.length * seatPrice);
        btn.disabled = false;
    }
}

async function confirmPurchase() {
    var userData = localStorage.getItem('user');
    if (!userData) {
        if (typeof showToast === 'function') {
            showToast('请先登录', 'error');
        }
        setTimeout(function() {
            window.location.href = 'login.html';
        }, 1000);
        return;
    }

    if (selectedSeats.length === 0) {
        if (typeof showToast === 'function') {
            showToast('请先选择座位', 'error');
        }
        return;
    }

    var user = JSON.parse(userData);
    var btn = document.getElementById('confirmBtn');
    btn.disabled = true;
    btn.textContent = '购买中...';

    try {
        // 逐个购买座位
        for (var i = 0; i < selectedSeats.length; i++) {
            var resp = await fetch(API_BASE + '/api/ticket/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.user_id,
                    schedule_id: getQueryParam('schedule_id'),
                    seat_number: selectedSeats[i]
                })
            });
            var data = await resp.json();

            if (!resp.ok) {
                if (typeof showToast === 'function') {
                    showToast('座位 ' + selectedSeats[i] + ' ' + (data.error || '购买失败'), 'error');
                }
                btn.disabled = false;
                btn.textContent = '确认购票';
                return;
            }
        }

        if (typeof showToast === 'function') {
            showToast('购票成功！共 ' + selectedSeats.length + ' 张', 'success');
        }
        setTimeout(function() {
            window.location.href = 'USER.html?tab=ticket';
        }, 800);
    } catch (e) {
        console.error('购票失败:', e);
        if (typeof showToast === 'function') {
            showToast('网络错误，请重试', 'error');
        }
        btn.disabled = false;
        btn.textContent = '确认购票';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadSeatPage();

    var confirmBtn = document.getElementById('confirmBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmPurchase);
    }
});
