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
import socket
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


class Nearby:
    """My Team's nearby sharing over the local network. Same protocol as the Android app (LanShare.java):
    every 2 s a UDP broadcast to port 47833 says "WRNEARBY1\n<device id>\n<tcp port>\n<info json>", and connecting
    to that TCP port returns the shared character's exported text. Runs only while the My Team page is open."""

    PORT = 47833
    MAGIC = "WRNEARBY1"
    MAX_TEXT = 256 * 1024

    def __init__(self, device_id):
        self.device_id = device_id
        self.open = True
        self.info = ""
        self.text = ""
        self.peers = {}
        self.lock = threading.Lock()
        self.tcp = None
        self.udp = None
        try:
            u = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            u.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            u.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
            u.bind(("", self.PORT))
            self.udp = u
            threading.Thread(target=self._listen, args=(u,), daemon=True).start()
        except OSError:
            self.udp = None  # the port is taken: this copy can still announce itself
        threading.Thread(target=self._announce, daemon=True).start()

    def close(self):
        self.open = False
        self.share("", "")
        if self.udp:
            try:
                self.udp.close()
            except OSError:
                pass
        self.udp = None

    def share(self, info, text):
        self.info = (info or "").replace("\n", " ")
        self.text = text or ""
        if not self.text:
            if self.tcp:
                try:
                    self.tcp.close()
                except OSError:
                    pass
            self.tcp = None
            return
        if self.tcp:
            return
        srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        srv.bind(("", 0))
        srv.listen(5)
        self.tcp = srv
        threading.Thread(target=self._serve, args=(srv,), daemon=True).start()

    def _serve(self, srv):
        while self.tcp is srv:
            try:
                conn, _ = srv.accept()
            except OSError:
                return
            try:
                conn.settimeout(5)
                conn.sendall(self.text.encode("utf-8"))
            except OSError:
                pass
            finally:
                conn.close()

    @staticmethod
    def _broadcast_addresses():
        out = ["255.255.255.255"]
        try:  # the subnet's own broadcast address, assuming the usual /24 home network
            for ip in socket.gethostbyname_ex(socket.gethostname())[2]:
                if not ip.startswith("127."):
                    out.append(ip.rsplit(".", 1)[0] + ".255")
        except OSError:
            pass
        return list(dict.fromkeys(out))

    def _announce(self):
        out = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        out.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        while self.open:
            srv = self.tcp
            if srv and self.text:
                data = f"{self.MAGIC}\n{self.device_id}\n{srv.getsockname()[1]}\n{self.info}".encode("utf-8")
                for addr in self._broadcast_addresses():
                    try:
                        out.sendto(data, (addr, self.PORT))
                    except OSError:
                        pass
            time.sleep(2)
        out.close()

    def _listen(self, u):
        while self.open:
            try:
                data, (host, _) = u.recvfrom(8192)
                parts = data.decode("utf-8", "replace").split("\n", 3)
                if len(parts) < 4 or parts[0] != self.MAGIC or parts[1] == self.device_id or len(parts[1]) > 64:
                    continue
                port = int(parts[2].strip())
                if not 0 < port < 65536:
                    continue
                with self.lock:
                    self.peers[parts[1]] = {"id": parts[1], "via": "wifi", "host": host, "port": port, "info": parts[3], "seen": time.time()}
            except (OSError, ValueError):
                if not self.open:
                    return

    def peers_json(self):
        now = time.time()
        with self.lock:
            return json.dumps([{"id": p["id"], "via": p["via"], "info": p["info"]} for p in self.peers.values() if now - p["seen"] < 8])

    def fetch(self, peer_id):
        with self.lock:
            p = self.peers.get(peer_id)
        if not p:
            return "ERROR: gone"
        try:
            with socket.create_connection((p["host"], p["port"]), timeout=4) as c:
                c.settimeout(5)
                chunks, size = [], 0
                while True:
                    b = c.recv(8192)
                    if not b:
                        break
                    chunks.append(b)
                    size += len(b)
                    if size > self.MAX_TEXT:
                        return "ERROR: too big"
            return b"".join(chunks).decode("utf-8", "replace")
        except OSError as e:
            return f"ERROR: {e}"


class Api:
    """Methods callable from JavaScript as window.pywebview.api.<name>()."""

    _window = None  # set at startup; underscore keeps it hidden from JavaScript

    _nearby = None

    # ---- nearby sharing (My Team)
    def nearby_open(self, device_id):
        device_id = str(device_id or "")
        if not device_id or len(device_id) > 64:
            return "ERROR: bad id"
        if self._nearby and self._nearby.device_id == device_id:
            return "OK"
        self.nearby_close()
        Api._nearby = Nearby(device_id)
        return "OK"

    def nearby_close(self):
        if self._nearby:
            self._nearby.close()
        Api._nearby = None
        return "OK"

    def nearby_share(self, info, text):
        if not self._nearby:
            return "ERROR: not open"
        self._nearby.share(str(info or ""), str(text or ""))
        return "OK"

    def nearby_peers(self):
        return self._nearby.peers_json() if self._nearby else "[]"

    def nearby_fetch(self, peer_id):
        return self._nearby.fetch(str(peer_id)) if self._nearby else "ERROR: not open"

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

    def copy_text(self, text):
        """Put text on the Windows clipboard (export a character)."""
        try:
            import ctypes
            from ctypes import wintypes
            k, u = ctypes.windll.kernel32, ctypes.windll.user32
            k.GlobalAlloc.restype, k.GlobalAlloc.argtypes = wintypes.HGLOBAL, [wintypes.UINT, ctypes.c_size_t]
            k.GlobalLock.restype, k.GlobalLock.argtypes = ctypes.c_void_p, [wintypes.HGLOBAL]
            k.GlobalUnlock.argtypes = [wintypes.HGLOBAL]
            u.SetClipboardData.restype, u.SetClipboardData.argtypes = wintypes.HANDLE, [wintypes.UINT, wintypes.HANDLE]
            data = (str(text) + "\0").encode("utf-16-le")
            for _ in range(10):  # another program may be holding the clipboard for a moment
                if u.OpenClipboard(None):
                    break
                time.sleep(0.05)
            else:
                return "ERROR: the clipboard is busy"
            try:
                u.EmptyClipboard()
                h = k.GlobalAlloc(0x0002, len(data))  # GMEM_MOVEABLE
                p = k.GlobalLock(h)
                ctypes.memmove(p, data, len(data))
                k.GlobalUnlock(h)
                if not u.SetClipboardData(13, h):  # CF_UNICODETEXT
                    return "ERROR: could not copy"
            finally:
                u.CloseClipboard()
            return "OK"
        except Exception as e:  # not on Windows, or the API failed
            return f"ERROR: {e}"

    def read_text(self):
        """Read text from the Windows clipboard (import a character)."""
        try:
            import ctypes
            from ctypes import wintypes
            k, u = ctypes.windll.kernel32, ctypes.windll.user32
            u.GetClipboardData.restype, u.GetClipboardData.argtypes = wintypes.HANDLE, [wintypes.UINT]
            k.GlobalLock.restype, k.GlobalLock.argtypes = ctypes.c_void_p, [wintypes.HGLOBAL]
            k.GlobalUnlock.argtypes = [wintypes.HGLOBAL]
            if not u.OpenClipboard(None):
                return ""
            try:
                h = u.GetClipboardData(13)
                if not h:
                    return ""
                p = k.GlobalLock(h)
                try:
                    return ctypes.wstring_at(p) if p else ""
                finally:
                    k.GlobalUnlock(h)
            finally:
                u.CloseClipboard()
        except Exception:
            return ""

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
