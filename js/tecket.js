// 获取并渲染所有购票记录
async function renderAllTickets() {
  try {
    // 假设后端接口返回所有票的数组，格式：[{price, status, buy_time}, ...]
    const response = await fetch("/api/ticket/all");
    const tickets = await response.json();

    let html = "";

    // 循环每一条数据，生成HTML片段
    tickets.forEach(ticket => {
      html += `
        <div class="ticket-item">
          <div class="ticket-price">
            <label>价格:</label>
            <span>${ticket.price}</span>
          </div>
          <div class="ticket-status">
            <label>状态:</label>
            <span>${ticket.status}</span>
          </div>
          <div class="ticket-buy-time">
            <label>购买时间:</label>
            <span>${ticket.buy_time}</span>
          </div>
        </div>
      `;
    });

    // 把生成的所有HTML塞到容器里
    document.getElementById("ticket-container").innerHTML = html;

  } catch (err) {
    console.error("加载失败:", err);
    document.getElementById("ticket-container").innerHTML = "<p>加载失败</p >";
  }
}

// 页面加载时调用
window.onload = function () {
  fetchUserInfo();
  renderAllTickets();
};