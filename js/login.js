async function doLogin() {
    var username = document.getElementById('username').value.trim();
    var password = document.getElementById('password').value;
    var errorEl = document.getElementById('errorMsg');
    var btn = document.getElementById('loginBtn');

    if (!username || !password) {
        errorEl.textContent = '请输入用户名和密码';
        return;
    }

    btn.disabled = true;
    btn.textContent = '登录中...';
    errorEl.textContent = '';

    try {
        var resp = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, password: password })
        });
        var data = await resp.json();

        if (resp.ok) {
            localStorage.setItem('user', JSON.stringify(data));
            window.location.href = 'USER.html';
        } else {
            errorEl.textContent = data.error || '登录失败';
            btn.disabled = false;
            btn.textContent = '登录';
        }
    } catch (err) {
        errorEl.textContent = '网络错误，请稍后重试';
        btn.disabled = false;
        btn.textContent = '登录';
    }
}

document.getElementById('password').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') doLogin();
});
