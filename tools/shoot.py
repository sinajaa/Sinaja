#!/usr/bin/env python3
"""Capture the four entry screenshots from the real game in headless Chromium."""
import http.server
import socketserver
import subprocess
import threading
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
GAME = ROOT / 'game'
SHOTS = ROOT / 'screenshots'
SCENES = [('1-street.jpg', 'street'), ('2-car.jpg', 'car'), ('3-chase.jpg', 'chase'), ('4-mission.jpg', 'mission')]
CHROME = '/usr/bin/chromium'
PORT = 8123


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    SHOTS.mkdir(exist_ok=True)
    socketserver.TCPServer.allow_reuse_address = True
    handler = lambda *a, **k: Handler(*a, directory=str(GAME), **k)
    with socketserver.TCPServer(('127.0.0.1', PORT), handler) as httpd:
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        for name, scene in SCENES:
            png = Path('/tmp') / f'suncoast-{scene}.png'
            url = f'http://127.0.0.1:{PORT}/index.html?shot={scene}&seed=1'
            subprocess.run([
                CHROME, '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
                '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars',
                '--window-size=1280,720', '--virtual-time-budget=14000',
                f'--screenshot={png}', url,
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            im = Image.open(png).convert('RGB')
            if im.size != (1280, 720):
                im = im.resize((1280, 720), Image.LANCZOS)
            quality = 88
            while quality > 60:
                out = SHOTS / name
                im.save(out, 'JPEG', quality=quality, optimize=True, progressive=True)
                if out.stat().st_size <= 256 * 1024:
                    break
                quality -= 4
            print(name, (SHOTS / name).stat().st_size, 'bytes q', quality)
        httpd.shutdown()


if __name__ == '__main__':
    main()
