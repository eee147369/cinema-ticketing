/* ========== 用户注册 ========== */
var API_BASE = '';

async function doRegister() {
    var username = document.getElementById('username').value.trim();
    var password = document.getElementById('password').value;
    var confirmPwd = document.getElementById('confirmPwd').value;
    var phone = document.getElementById('phone').value.trim();
    var email = document.getElementById('email').value.trim();
    var errorMsg = document.getElementById('errorMsg');

    if (!username || !password) {
        errorMsg.textContent = '用户名和密码不能为空';
        return;
    }
    if (password.length < 6) {
        errorMsg.textContent = '密码至少6位';
        return;
    }
    if (password !== confirmPwd) {
        errorMsg.textContent = '两次密码输入不一致';
        return;
    }

    errorMsg.textContent = '';

    try {
        var resp = await fetch(API_BASE + '/api/user/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, password: password, phone: phone, email: email })
        });
        var data = await resp.json();

        if (!resp.ok) {
            errorMsg.textContent = data.error || '注册失败';
            return;
        }

        // 注册成功，自动登录
        localStorage.setItem('user', JSON.stringify({
            user_id: data.user_id,
            user_name: data.user_name,
            phone: data.phone || '',
            email: data.email || ''
        }));

        if (typeof showToast === 'function') {
            showToast('注册成功，欢迎！', 'success');
        }
        setTimeout(function() {
            window.location.href = 'cinema.html';
        }, 500);
    } catch (e) {
        errorMsg.textContent = '网络错误，请检查后端服务';
        console.error('注册失败:', e);
    }
}

// 回车键提交
document.addEventListener('DOMContentLoaded', function() {
    var inputs = ['username', 'password', 'confirmPwd', 'phone', 'email'];
    inputs.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') doRegister();
            });
        }
    });
});
