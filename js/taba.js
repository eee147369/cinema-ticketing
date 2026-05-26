document.addEventListener('DOMContentLoaded', function() {
    
    const tabs = document.querySelectorAll('.tabs div');
    const panels = document.querySelectorAll('.tab-content > div');

    if (tabs.length > 0 && panels.length > 0) {
        tabs[0].classList.add('active');
        panels[0].classList.add('show');
    }

    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('show'));
            tab.classList.add('active');
            if (panels[index]) panels[index].classList.add('show');
        });
    });

    fetchUserInfo();
});

async function fetchUserInfo() {
    try {
        const response = await fetch('/api/user/info');
        const data = await response.json();
        const fields = ['user_id','user_name','phone','email','register_time'];
        fields.forEach(f => {
            const el = document.getElementById(f);
            if (el) el.innerText = data[f] || '加载失败';
        });
    } catch(err) {
        console.error('获取用户信息失败:', err);
        const fields = ['user_id','user_name','phone','email','register_time'];
        fields.forEach(f => {
            const el = document.getElementById(f);
            if(el) el.innerText = '加载失败';
        });
    }
}