package com.wasteland.recruit;

import android.Manifest;
import android.app.Activity;
import android.app.PendingIntent;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

import org.json.JSONObject;

/** Hosts the shared web app in a WebView and gives it storage, photo picking, saving and sharing. */
public class MainActivity extends Activity {
    private static final int PICK_FILE = 7;
    private static final String ACTION_INSTALL_DONE = "com.wasteland.recruit.INSTALL_DONE";
    private WebView web;
    private ValueCallback<Uri[]> pendingPick;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(16, 18, 22));
        getWindow().setNavigationBarColor(Color.rgb(22, 24, 29));
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(22, 24, 29));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setAllowFileAccess(true);
        s.setDomStorageEnabled(true);
        s.setBuiltInZoomControls(false);
        web.addJavascriptInterface(new Bridge(), "AndroidBridge");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                Uri u = req.getUrl();
                if ("file".equals(u.getScheme())) return false;
                startActivity(new Intent(Intent.ACTION_VIEW, u)); // wiki links open in the browser
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (pendingPick != null) pendingPick.onReceiveValue(null);
                pendingPick = cb;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("image/*");
                try {
                    startActivityForResult(Intent.createChooser(i, "Choose a photo"), PICK_FILE);
                } catch (Exception e) {
                    pendingPick = null;
                    return false;
                }
                return true;
            }
        });
        setContentView(web);
        if (state != null) web.restoreState(state);
        else web.loadUrl("file:///android_asset/www/index.html");
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == PICK_FILE && pendingPick != null) {
            Uri u = (res == RESULT_OK && data != null) ? data.getData() : null;
            pendingPick.onReceiveValue(u == null ? null : new Uri[]{u});
            pendingPick = null;
        }
    }

    // ---------------------------------------------------------------- self-update
    private void js(String code) {
        runOnUiThread(() -> web.evaluateJavascript(code, null));
    }

    private void updateStatus(String msg, boolean finished) {
        js("window.onUpdateStatus && onUpdateStatus(" + JSONObject.quote(msg) + "," + finished + ")");
    }

    /** Streams the APK straight into an Android install session; Android then asks the user to confirm. */
    private void downloadAndInstall(String url, String version) {
        PackageInstaller pi = getPackageManager().getPackageInstaller();
        int sessionId = -1;
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
            c.setInstanceFollowRedirects(true);
            c.setRequestProperty("User-Agent", "WastelandRecruit-updater");
            c.setConnectTimeout(30000);
            c.setReadTimeout(60000);
            if (c.getResponseCode() != 200) throw new IllegalStateException("download answered " + c.getResponseCode());
            long total = c.getContentLengthLong();
            PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
            params.setAppPackageName(getPackageName());
            if (total > 0) params.setSize(total);
            sessionId = pi.createSession(params);
            try (PackageInstaller.Session s = pi.openSession(sessionId);
                 InputStream in = c.getInputStream();
                 OutputStream out = s.openWrite("update.apk", 0, total > 0 ? total : -1)) {
                byte[] buf = new byte[1 << 16];
                long done = 0;
                int n, last = -1;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                    done += n;
                    int pct = total > 0 ? (int) (done * 100 / total) : 0;
                    if (pct != last) {
                        last = pct;
                        js("window.onUpdateProgress && onUpdateProgress(" + pct + ")");
                    }
                }
                s.fsync(out);
            }
            Intent done = new Intent(this, MainActivity.class).setAction(ACTION_INSTALL_DONE)
                    .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0);
            PendingIntent result = PendingIntent.getActivity(this, sessionId, done, flags);
            try (PackageInstaller.Session s = pi.openSession(sessionId)) {
                s.commit(result.getIntentSender());
            }
            updateStatus("Downloaded version " + version + ". Confirm the install on the next screen.", false);
        } catch (Exception e) {
            if (sessionId >= 0) {
                try { pi.abandonSession(sessionId); } catch (Exception ignored) { }
            }
            updateStatus("Update failed: " + e.getMessage(), true);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (!ACTION_INSTALL_DONE.equals(intent.getAction())) return;
        int st = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        if (st == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirm = intent.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirm != null) startActivity(confirm); // Android's own "Do you want to update this app?" screen
        } else if (st == PackageInstaller.STATUS_SUCCESS) {
            updateStatus("Updated! Reopen the app if it doesn't restart by itself.", true);
        } else {
            String why = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
            if (st == PackageInstaller.STATUS_FAILURE_CONFLICT || st == PackageInstaller.STATUS_FAILURE_INCOMPATIBLE)
                why = "the update is signed with a different key. Uninstall this version once and install the new APK by hand.";
            updateStatus(st == PackageInstaller.STATUS_FAILURE_ABORTED ? "Update cancelled." : "Install failed: " + why, true);
        }
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.handleBack ? String(window.handleBack()) : 'false'", r -> {
            if (!"\"true\"".equals(r) && !"true".equals(r)) MainActivity.super.onBackPressed();
        });
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    private static byte[] decode(String dataUrl) {
        int comma = dataUrl.indexOf(',');
        return Base64.decode(comma >= 0 ? dataUrl.substring(comma + 1) : dataUrl, Base64.DEFAULT);
    }

    private File dataFile(String key) {
        String safe = key.replaceAll("[^A-Za-z0-9_-]", "");
        return new File(getFilesDir(), (safe.isEmpty() ? "data" : safe) + ".json");
    }

    /** Writes the PNG into Pictures/Fallout Characters and returns its content URI (or null). */
    private Uri store(byte[] png, String name) throws Exception {
        ContentResolver cr = getContentResolver();
        if (Build.VERSION.SDK_INT >= 29) {
            ContentValues v = new ContentValues();
            v.put(MediaStore.Images.Media.DISPLAY_NAME, name);
            v.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
            v.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Fallout Characters");
            v.put(MediaStore.Images.Media.IS_PENDING, 1);
            Uri uri = cr.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v);
            if (uri == null) return null;
            try (OutputStream os = cr.openOutputStream(uri)) {
                os.write(png);
            }
            v.clear();
            v.put(MediaStore.Images.Media.IS_PENDING, 0);
            cr.update(uri, v, null, null);
            return uri;
        }
        if (checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            runOnUiThread(() -> requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, 1));
            throw new IllegalStateException("allow storage access, then tap again");
        }
        Bitmap bmp = BitmapFactory.decodeByteArray(png, 0, png.length);
        String s = MediaStore.Images.Media.insertImage(cr, bmp, name, "Fallout character sheet");
        return s == null ? null : Uri.parse(s);
    }

    class Bridge {
        @JavascriptInterface
        public String installUpdate(String url, String version) {
            Uri u = Uri.parse(url);
            String host = u.getHost() == null ? "" : u.getHost();
            if (!"https".equals(u.getScheme()) || !(host.equals("github.com") || host.endsWith(".githubusercontent.com")))
                return "ERROR: refusing to download from " + host;
            if (!getPackageManager().canRequestPackageInstalls()) {
                runOnUiThread(() -> startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                        Uri.parse("package:" + getPackageName()))));
                return "NEED_PERMISSION";
            }
            new Thread(() -> downloadAndInstall(url, version)).start();
            return "STARTED";
        }

        // the clipboard: export copies a character's text, import can paste it back
        @JavascriptInterface
        public String copyText(String text) {
            final String[] out = { "OK" };
            final java.util.concurrent.CountDownLatch done = new java.util.concurrent.CountDownLatch(1);
            runOnUiThread(() -> {
                try {
                    ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                    cm.setPrimaryClip(ClipData.newPlainText("Wasteland Recruit", text));
                } catch (Exception e) {
                    out[0] = "ERROR: " + e.getMessage();
                }
                done.countDown();
            });
            try { done.await(2, java.util.concurrent.TimeUnit.SECONDS); } catch (InterruptedException e) { return "ERROR: interrupted"; }
            return out[0];
        }

        @JavascriptInterface
        public String readText() {
            final String[] out = { "" };
            final java.util.concurrent.CountDownLatch done = new java.util.concurrent.CountDownLatch(1);
            runOnUiThread(() -> {
                try {
                    ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                    ClipData clip = cm.getPrimaryClip();
                    if (clip != null && clip.getItemCount() > 0) {
                        CharSequence t = clip.getItemAt(0).coerceToText(MainActivity.this);
                        if (t != null) out[0] = t.toString();
                    }
                } catch (Exception e) {
                    out[0] = "";
                }
                done.countDown();
            });
            try { done.await(2, java.util.concurrent.TimeUnit.SECONDS); } catch (InterruptedException e) { return ""; }
            return out[0];
        }

        @JavascriptInterface
        public String load(String key) {
            File f = dataFile(key);
            if (!f.exists()) return "";
            try (FileInputStream in = new FileInputStream(f)) {
                byte[] b = new byte[(int) f.length()];
                int off = 0;
                while (off < b.length) {
                    int n = in.read(b, off, b.length - off);
                    if (n < 0) break;
                    off += n;
                }
                return new String(b, 0, off, StandardCharsets.UTF_8);
            } catch (Exception e) {
                return "";
            }
        }

        @JavascriptInterface
        public String save(String key, String text) {
            File f = dataFile(key), tmp = new File(f.getPath() + ".tmp");
            try (FileOutputStream out = new FileOutputStream(tmp)) {
                out.write(text.getBytes(StandardCharsets.UTF_8));
            } catch (Exception e) {
                return "ERROR: " + e.getMessage();
            }
            if (!tmp.renameTo(f)) {
                f.delete();
                if (!tmp.renameTo(f)) return "ERROR: could not save";
            }
            return "OK";
        }

        @JavascriptInterface
        public String saveImage(String dataUrl, String name) {
            try {
                Uri uri = store(decode(dataUrl), name);
                return uri == null ? "ERROR: could not save" : uri.toString();
            } catch (Exception e) {
                return "ERROR: " + e.getMessage();
            }
        }

        @JavascriptInterface
        public String shareImage(String dataUrl, String name, String title) {
            try {
                Uri uri = store(decode(dataUrl), name);
                if (uri == null) return "ERROR: could not prepare image";
                Intent send = new Intent(Intent.ACTION_SEND);
                send.setType("image/png");
                send.putExtra(Intent.EXTRA_STREAM, uri);
                send.putExtra(Intent.EXTRA_TEXT, title + " - Fallout 2d20 character");
                send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                Intent chooser = Intent.createChooser(send, "Share character sheet");
                runOnUiThread(() -> startActivity(chooser));
                return "OK";
            } catch (Exception e) {
                return "ERROR: " + e.getMessage();
            }
        }
    }
}
