"""检查影院页面是否正常显示"""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # 捕获控制台错误
    errors = []
    page.on('console', lambda msg:
        errors.append(f'[{msg.type}] {msg.text}') if msg.type in ('error', 'warning') else None
    )
    page.on('pageerror', lambda err: errors.append(f'[PAGE ERROR] {err.message}'))

    # 访问影院列表页
    print('=== 1. 影院列表页 (cinema-detail.html 无参数) ===')
    page.goto('http://localhost:5000/cinema-detail.html')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)
    page.screenshot(path='cinema_list.png', full_page=True)
    content = page.content()
    print(f'页面长度: {len(content)} 字符')
    print(f'标题: {page.title()}')

    # 检查关键元素
    cd_header = page.locator('#cdHeader').inner_text()
    print(f'#cdHeader: {cd_header[:200]}')
    cd_movie_list = page.locator('#cdMovieList').inner_text()
    print(f'#cdMovieList: {cd_movie_list[:300]}')

    # 检查日期栏
    date_bar = page.locator('#dateBar').inner_text()
    print(f'#dateBar: {date_bar[:200]}')

    # 访问影院详情页
    print('\n=== 2. 影院详情页 (cinema-detail.html?id=1) ===')
    page.goto('http://localhost:5000/cinema-detail.html?id=1')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)
    page.screenshot(path='cinema_detail.png', full_page=True)

    cd_header = page.locator('#cdHeader').inner_text()
    print(f'#cdHeader: {cd_header[:200]}')
    date_bar = page.locator('#dateBar').inner_text()
    print(f'#dateBar: {date_bar[:200]}')
    cd_movie_list = page.locator('#cdMovieList').inner_text()
    print(f'#cdMovieList: {cd_movie_list[:500]}')

    print('\n=== 控制台错误 ===')
    for e in errors:
        print(e)
    if not errors:
        print('无错误')

    browser.close()
