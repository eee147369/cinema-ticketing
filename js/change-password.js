async function doChange() {
    var oldPwd = document.getElementById('oldPwd').value;
    var newPwd = document.getElementById('newPwd').value;
    var confirmPwd = document.getElementById('confirmPwd').value;
    var msgEl = document.getElementById('msg');
    var btn = document.getElementById('changeBtn');

    if (!oldPwd || !newPwd || !confirmPwd) {
        msgEl.className = 'msg';
        msgEl.textContent = '请填写所有密码字段';
        return;
    }
    if (newPwd !== confirmPwd) {
        msgEl.className = 'msg';
        msgEl.textContent = '两次新密码输入不一致';
        return;
    }
    if (newPwd.length < 6) {
        msgEl.className = 'msg';
        msgEl.textContent = '新密码至少6位';
        return;
    }

    var userData = localStorage.getItem('user');
    var userId = userData ? JSON.parse(userData).user_id : '';

    if (!userId) {
        msgEl.className = 'msg';
        msgEl.textContent = '请先登录';
        return;
    }

    msgEl.className = 'msg';
    msgEl.textContent = '';
    btn.disabled = true;
    btn.textContent = '修改中...';

    try {
        var resp = await fetch('/api/user/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, oldPwd: oldPwd, newPwd: newPwd })
        });
        var result = await resp.json();
        if (resp.ok) {
            msgEl.className = 'msg success';
            msgEl.textContent = '密码修改成功';
            document.getElementById('oldPwd').value = '';
            document.getElementById('newPwd').value = '';
            document.getElementById('confirmPwd').value = '';
        } else {
            msgEl.className = 'msg';
            msgEl.textContent = result.error || '修改失败';
        }
    } catch (err) {
        msgEl.className = 'msg';
        msgEl.textContent = '网络错误，请稍后重试';
    } finally {
        btn.disabled = false;
        btn.textContent = '确认修改';
    }
}

document.getElementById('confirmPwd').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') doChange();
});
