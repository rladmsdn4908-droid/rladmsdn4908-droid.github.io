"""Claude 디자인 캔버스의 .dc.html 페이지를 일반 정적 웹사이트로 변환한다.
사용: python3 build.py <src/project 폴더> <출력 폴더>"""
import re, sys, os

SRC, OUT = sys.argv[1], sys.argv[2]
PAGES = {
    'Main.dc.html': 'index.html',
    'Works.dc.html': 'works.html',
    'Exhibitions.dc.html': 'exhibitions.html',
    'Text.dc.html': 'text.html',
    'CV.dc.html': 'cv.html',
    'Contact.dc.html': 'contact.html',
}
BASE = 'https://rladmsdn4908-droid.github.io/'
DESC = '화가 김은우의 포트폴리오. 손과 잡초의 형상을 통해 관계가 생겨나고 변해가는 과정을 그린다.'

def convert(src, outname):
    m_helmet = re.search(r'<helmet>(.*?)</helmet>', src, re.S)
    helmet = m_helmet.group(1).strip() if m_helmet else ''
    body = re.search(r'<x-dc>(.*)</x-dc>', src, re.S).group(1)
    body = re.sub(r'<helmet>.*?</helmet>', '', body, flags=re.S).strip()
    script = re.search(r'<script type="text/x-dc"[^>]*>(.*?)</script>', src, re.S).group(1).strip()
    title = re.search(r'<title>(.*?)</title>', src, re.S).group(1)
    if outname == 'index.html': title = '김은우 포트폴리오'
    url = BASE + ('' if outname == 'index.html' else outname)
    html = f'''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{DESC}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{DESC}">
<meta property="og:type" content="website">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{BASE}og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
{helmet}
<link rel="stylesheet" href="site.css">
</head>
<body>
<template id="dc">
{body}
</template>
<div id="dc-root"></div>
<script src="dc.js"></script>
<script>
{script}
</script>
</body>
</html>
'''
    for a, b in PAGES.items():
        html = html.replace(f'href="{a}"', f'href="{b}"')
    html = re.sub(r'/_blob/([0-9a-f]{32})', r'images/\1.jpg', html)
    html = html.replace("img: '/_blob/' + id", "img: 'images/' + id + '.jpg'")
    return html

os.makedirs(OUT, exist_ok=True)
for a, b in PAGES.items():
    src = open(os.path.join(SRC, a), encoding='utf-8').read()
    out = convert(src, b)
    assert '_blob' not in out and '.dc.html' not in out, a
    open(os.path.join(OUT, b), 'w', encoding='utf-8').write(out)
    print(a, '->', b, len(out))
