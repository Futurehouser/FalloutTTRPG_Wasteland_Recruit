"""Wasteland Recruit for Windows: shows the shared web app (../web) in a native window.

Everything is stored next to the .exe so the app stays portable:
  Fallout Characters/   saved character sheet images
  Wasteland Data/       saved characters, edited loot tables, perk cache

Updates: the web app checks GitHub Releases and, after the user agrees, calls install_update().
The new exe is downloaded next to this one, checked against GitHub's SHA-256, swapped in, and started.
"""
import base64
import hashlib
import json
import os
import re
import subprocess
import sys
import threading
import time
import urllib.parse
import urllib.request
import webbrowser

import webview


def base_dir():
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


def web_dir():
    if hasattr(sys, "_MEIPASS"):
        return os.path.join(sys._MEIPASS, "web")
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "web")


def safe(name, default="file"):
    return re.sub(r"[^A-Za-z0-9 ._-]+", "", str(name)).strip() or default


ALLOWED_HOSTS = ("github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com")


def cleanup_old_exe():
    """Remove the previous version left behind by an update (it may still be closing)."""
    if not getattr(sys, "frozen", False):
        return
    stem, _ = os.path.splitext(sys.executable)
    old = stem + ".old.exe"
    for _ in range(20):
        if not os.path.exists(old):
            return
        try:
            os.remove(old)
            return
        except OSError:
            time.sleep(0.5)


class Api:
    """Methods callable from JavaScript as window.pywebview.api.<name>()."""

    _window = None  # set at startup; underscore keeps it hidden from JavaScript

    def _js(self, code):
        try:
            self._window.evaluate_js(code)
        except Exception:  # noqa: BLE001 - progress display is best effort
            pass

    def install_update(self, url, version, digest=""):
        if not getattr(sys, "frozen", False):
            return "ERROR: updates only work in the built WastelandRecruit.exe"
        host = urllib.parse.urlparse(url).hostname or ""
        if not url.startswith("https://") or host not in ALLOWED_HOSTS:
            return "ERROR: refusing to download from " + host
        exe = sys.executable
        stem, _ = os.path.splitext(exe)
        new, old = stem + ".new.exe", stem + ".old.exe"
        try:
            # 1. download with progress
            req = urllib.request.Request(url, headers={"User-Agent": "WastelandRecruit-updater"})
            sha = hashlib.sha256()
            with urllib.request.urlopen(req, timeout=60) as r, open(new, "wb") as f:
                total = int(r.headers.get("Content-Length") or 0)
                done, last = 0, -1
                while True:
                    chunk = r.read(1 << 16)
                    if not chunk:
                        break
                    f.write(chunk)
                    sha.update(chunk)
                    done += len(chunk)
                    pct = int(done * 100 / total) if total else 0
                    if pct != last:
                        last = pct
                        self._js(f"window.onUpdateProgress && onUpdateProgress({pct})")
            # 2. make sure it is the file GitHub published, and really a Windows program
            if digest.startswith("sha256:") and sha.hexdigest() != digest.split(":", 1)[1].lower():
                raise ValueError("the download is corrupted (checksum mismatch)")
            with open(new, "rb") as f:
                if f.read(2) != b"MZ":
                    raise ValueError("the downloaded file is not a Windows program")
            # 3. a running exe can be renamed but not overwritten: move it aside, put the new one in place
            if os.path.exists(old):
                os.remove(old)
            os.replace(exe, old)
            try:
                os.replace(new, exe)
            except OSError:
                os.replace(old, exe)  # roll back
                raise
        except Exception as e:  # noqa: BLE001 - message goes back to the UI
            try:
                os.remove(new)
            except OSError:
                pass
            return f"ERROR: {e}"
        # 4. start the new version and close this one
        self._js("window.onUpdateStatus && onUpdateStatus(" + json.dumps(f"Updated to {version}. Restarting…") + ", false)")
        env = dict(os.environ, PYINSTALLER_RESET_ENVIRONMENT="1")  # don't reuse this process's unpacked files
        subprocess.Popen([exe], cwd=os.path.dirname(exe), env=env, close_fds=True,
                         creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP)
        threading.Timer(1.0, lambda: (self._window.destroy(), os._exit(0))).start()
        return "STARTED"

    def _data(self, key):
        d = os.path.join(base_dir(), "Wasteland Data")
        os.makedirs(d, exist_ok=True)
        return os.path.join(d, safe(key, "data") + ".json")

    def load(self, key):
        try:
            with open(self._data(key), encoding="utf-8") as f:
                return f.read()
        except OSError:
            return None

    def save(self, key, text):
        try:
            path = self._data(key)
            tmp = path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                f.write(text)
            os.replace(tmp, path)  # never leaves a half-written file behind
            return "OK"
        except OSError as e:
            return f"ERROR: {e}"

    def open_url(self, url):
        """Open a web link (the radio stations) in the default browser."""
        if not re.match(r"^https://", str(url)):
            return "ERROR: only https links"
        webbrowser.open(url)
        return "OK"

    def save_image(self, data_url, name):
        try:
            d = os.path.join(base_dir(), "Fallout Characters")
            os.makedirs(d, exist_ok=True)
            path = os.path.join(d, safe(name, "character.png"))
            with open(path, "wb") as f:
                f.write(base64.b64decode(data_url.split(",", 1)[1]))
            return path
        except Exception as e:  # noqa: BLE001 - message goes back to the UI
            return f"ERROR: {e}"


if __name__ == "__main__":
    threading.Thread(target=cleanup_old_exe, daemon=True).start()
    api = Api()
    api._window = webview.create_window("Wasteland Recruit", os.path.join(web_dir(), "index.html"),
                                        js_api=api, width=1180, height=880, min_size=(420, 600),
                                        background_color="#16181D", text_select=True)
    webview.start(http_server=True)
