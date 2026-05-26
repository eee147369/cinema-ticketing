# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

电影购票管理系统 (Movie Ticketing System) — A cinema-themed web application with a Flask backend, pure HTML/CSS/JS frontend, and MySQL database. All static files are served by the Flask backend.

## Architecture

### Backend (Flask — `app.py`)
- Single Flask app serving both API and static files on `localhost:5000`
- Database: MySQL via `pymysql`, connection uses `DictCursor`
- DB config in `config.py`: user=`root`, password=`zwq123123`, database=`cinema2`
- Static file serving: tries `image/` directory first, falls back to project root (for `css/` and `js/` folders)
- Entry page: `cinema.html` (routed at `/`)
- Separate `user.py` and `ticket.py` files exist but are unused — `app.py` has all endpoints

### Frontend (Pure HTML/CSS/JS)
- **Design system**: "Cinema Noir" — dark backgrounds (#0d0d14, #1a1a2e, #1e1e30), gold accents (#c9a84c), crimson buttons (#c0392b, #e63946), warm text (#f0e6d3). CSS variables in `head.css`.
- **Navigation**: All pages share `head.css` (nav + global styles), `bottom.css` (footer), and `script.js` (auth state, dropdown menu).
- **Auth flow**: `login.html` → fetch `/api/auth/login` → store `user` JSON in `localStorage` → redirect `USER.html`. Dropdown menu shows/hides based on login state.
- **API base URL**: Hardcoded as `http://localhost:5000` in all JS files.
- **Homepage** (`cinema.html`): Hero carousel + movie grids + sidebar rankings, all data loaded from API via `home.js`.
- **Movie page param**: `movie.html?movie_id=X` auto-selects that movie in the carousel.

### API Endpoints

| HTTP | Path | Purpose | Params | Added |
|------|------|---------|--------|-------|
| POST | `/api/auth/login` | User login | JSON `{username, password}` | — |
| GET | `/api/user/info` | Get user info | `?user_id=` | — |
| POST | `/api/user/change-password` | Change password | JSON `{user_id, oldPwd, newPwd}` | — |
| GET | `/api/ticket/all` | Get all tickets | — | — |
| GET | `/api/favorite/list` | Get user favorites | `?user_id=` | — |
| GET | `/api/movie/all` | All movies with ratings | — | — |
| GET | `/api/movie/boxoffice` | Box office revenue ranking | — | 本次新增 |
| GET | `/api/movie/list` | Movies + schedules by date | `?date=` | — |
| GET | `/api/movie/showtimes` | Showtimes for movie+date | `?movie_id=&date=` | — |
| GET | `/api/movie/dates` | Earliest 3 dates with tickets | — | — |
| GET | `/api/movie/dates_all` | Next 7 dates with schedules | — | — |
| GET | `/api/cinema/list` | All cinemas | — | — |
| GET | `/api/cinema/types` | Distinct hall types | — | — |
| GET | `/api/cinema/search` | Search cinemas with filters | `?cinema_id=&type=&date=` | — |
| GET | `/api/cinema/detail` | Cinema detail + schedules | `?cinema_id=&date=` | — |
| POST | `/api/ticket/refund` | Refund a ticket | JSON `{ticket_id}` | 本次新增 |

### Database (`cinema2`)
- Tables: `user`, `movie`, `cinema`, `schedule`, `ticket`, `favorite`, `review`, `refund`, `admin_user`, `view_log`
- Key relationships: `schedule` links `movie` + `cinema`, `ticket` references `user`, `favorite` references `user` + `movie`
- Login: `user` table, password stored as Werkzeug hash (`pbkdf2:...`)

## Key Commands

```bash
# Start the Flask backend (from D:/软件工程/软件工程项目/image/)
python app.py

# Start on a specific port (default 5000)
python app.py  # then access http://localhost:5000

# Kill port 5000 if needed
npx kill-port 5000
# or
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Kill all zombie Flask processes
taskkill /F /IM python.exe

# Restore database from dump
"C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe" -u root -p < cinema2.sql

# Or use the setup script
setup_database.bat   # Windows
bash setup_database.sh  # macOS/Linux
```

## File Structure

### Project Root (`D:/软件工程/软件工程项目/`)
- `css/` — All stylesheet files
- `js/` — All JavaScript files
- `image/` — HTML pages, Flask backend, images, SQL dump, and setup scripts

### Pages (in `image/`)
- `cinema.html` — **Homepage** (Hero carousel + movie grids + sidebar rankings + footer). Data from APIs.
- `movie.html` — Movie carousel + showtimes. Supports `?movie_id=X` param to auto-select movie.
- `cinema-detail.html` — Individual cinema detail + schedule
- `login.html` — Login form
- `change-password.html` — Password change form
- `USER.html` — User profile panel (info, tickets, favorites)

### CSS (`../css/` from HTML files)
- `head.css` — **Global styles**, CSS variables, nav bar, avatar + dropdown
- `home.css` — **Homepage** (hero carousel, movie grid, sidebar, footer, responsive)
- `bottom.css` — Footer (legacy, homepage uses its own footer in `home.css`)
- `choose.css` — Filter section + cinema cards
- `movie.css` — Movie carousel + showtime cards
- `cinema-detail.css` — Cinema detail page styles
- `auth.css` — Login + change-password forms
- `date-bar.css` — Date selector tabs
- `user-hero.css` — User page hero banner
- `user-panel.css` — User info panel + ticket table
- `user-favorite.css` — Favorites grid
- `tab.css` / `second.css` / `tab-panel-ticket.css` / `password.css` — Legacy, mostly unused

### JavaScript (`../js/` from HTML files)
- `home.js` — **Homepage logic** (hero carousel with auto-play, movie grid rendering from API, box office & TOP 10 sidebars, random recommendations)
- `script.js` — Auth state management, dropdown toggle, user info/tickets/favorites rendering (shared across pages)
- `login.js` — Login API call
- `change-password.js` — Password change API call
- `movie.js` — Movie carousel, date bar, showtime rendering. Supports `?movie_id=X` URL param.
- `cinema-detail.js` — Cinema detail page (loads by `?id=` param)
- `search.js` — Cinema search with brand/hall filters + results cards
- `data.js` — Date filter (legacy, for cinema.html)
- `place.js` — Cinema brand filter list
- `type.js` — Hall type filter list
- `taba.js` — Legacy tab handling
- `tecket.js` — Unused

## Important Notes

- **No framework/build step** — Pure vanilla HTML/CSS/JS, served statically by Flask
- **API URLs are hardcoded** as `http://localhost:5000` in all JS files
- **Auth uses localStorage** — `user` key stores JSON `{user_id, user_name, phone, email, register_time}`
- **Image files** — Chinese-named PNG/JPG/Avif files for posters, icons, and backgrounds in the same directory
- **Navigation `user-nav.css`** — Emptied, styles consolidated into `head.css`
- **Google Fonts** — Cinzel (display headings), EB Garamond (body text)
- **Film grain overlay** — Applied globally via `body::before` SVG filter in `head.css`
- **`movie.py` / `cinema.py` / `cinema-search.py`** — Do not exist (all functionality in `app.py`). `user.py` and `ticket.py` are vestigial.
- **Homepage hero carousel** — Auto-plays every 5s, pauses on hover. Shows top 3 movies from DB.
- **Movie page `?movie_id=X`** — Auto-selects the corresponding movie in carousel + loads its showtimes.

## 本次会话 (2026-05-20) — 新首页整合 + 可配置化

### 完成内容
- **新首页**：基于微信文件中的 `index.html` 设计，重写 `image/cinema.html`，适配深色 Cinema Noir 主题
- **Hero 轮播**：从数据库加载前 3 部电影，5 秒自动播放，悬停暂停，左右按钮 + 圆点导航
- **电影网格**："正在热映"（全部电影）+ "为你推荐"（随机 3 部），从 `/api/movie/all` 加载
- **侧边栏**：今日票房（`/api/movie/boxoffice`）+ TOP 10 评分排行
- **页脚**：四列信息（关于、链接、帮助、联系方式）
- **购票跳转**：点击"购票" → `movie.html?movie_id=X`，自动定位到对应电影
- **票房 API**：新增 `GET /api/movie/boxoffice`，从 ticket 表聚合票房数据

### 新建文件
| 文件 | 说明 |
|------|------|
| `css/home.css` | 首页专属深色主题样式（轮播、网格、侧栏、页脚、响应式） |
| `js/home.js` | 首页逻辑（轮播控制、API 加载、渲染电影/票房/TOP10） |
| `config.py` | 数据库配置（独立配置文件，便于分享） |
| `cinema2.sql` | 完整数据库备份（含表结构 + 数据） |
| `setup_database.bat` | Windows 一键建库脚本 |
| `setup_database.sh` | macOS/Linux 一键建库脚本 |

### 修改文件
| 文件 | 说明 |
|------|------|
| `image/cinema.html` | 完全重写为新首页 |
| `image/app.py` | 新增 `/api/movie/boxoffice` 票房排行端点；数据库配置改从 config.py 导入 |
| `js/movie.js` | 支持 `?movie_id=X` URL 参数自动定位电影 |
| `css/head.css` | 导航栏布局重构（绝对定位 → flex 流），解决间距问题 |
| `js/script.js` + 其余 13 个 JS 文件 | API 地址去掉硬编码 `http://localhost:5000`，改用相对路径 |
| `image/config.py` | 新增数据库配置文件，方便他人修改

## 后续待办 / 已知问题

1. **选座购票功能** — 点击排期后目前只弹 alert，未实现选座 UI 和购票流程
2. **"正在热映"/"即将上映" 标签** — `movie.html` 的标签切换只改了视觉样式，未过滤数据
3. **没有注册页面** — 无用户注册流程，用户从 SQL 种子数据加载
4. **没有管理面板** — `admin_user` 表存在但无管理 UI

## Session Ending Rule
At the end of every conversation, please:
1. Summarize the current project status and progress
2. Update the "Common Tasks" or "Architecture" section with any new useful commands, scripts or changes
3. Add next steps and pending issues for the project

## 本次会话 (2026-05-23) — 添加退票功能

### 完成内容
- **新增退票 API** `POST /api/ticket/refund`，更新 ticket 状态为"已退款"并写入 refund 表
- **票务表格新增"操作"列**，已支付票据显示"退票"按钮，已退票显示"已退票"标签
- **退票按钮交互**：点击确认 → 调用 API → 刷新列表
- **重复退票保护**：已退票的票据不可再次退票

### 修改文件
| 文件 | 说明 |
|------|------|
| `image/app.py` | 新增 `POST /api/ticket/refund` 退票端点 |
| `js/script.js` | `renderAllTickets()` 添加"操作"列、退票按钮和事件处理 |
| `css/user-panel.css` | 新增 `.refund-btn` / `.refunded-label` 样式 |