package com.wasteland.recruit;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.InterfaceAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Shares a main character with other copies of the app on the same Wi-Fi / local network (plain Java, no Android
 * classes, so it also runs on a PC for testing). The Windows app speaks the same protocol (desktop_app.py):
 *
 *   discovery  every 2 s a UDP broadcast to port 47833:  "WRNEARBY1\n" + deviceId + "\n" + tcpPort + "\n" + infoJson
 *   transfer   connecting to that TCP port returns the character's exported text (UTF-8), then the connection closes
 *
 * Nothing is shared until share() is called, and only while the My Team page is open.
 */
public class LanShare {
    public static final int PORT = 47833;
    static final String MAGIC = "WRNEARBY1";
    private static final int MAX_TEXT = 256 * 1024;

    private final String deviceId;
    private volatile boolean open;
    private volatile String info = "", text = "";
    private DatagramSocket udp;
    private ServerSocket tcp;
    private final Map<String, Peer> peers = Collections.synchronizedMap(new LinkedHashMap<>());

    static class Peer {
        String id, via, host, info, text;
        int port;
        long seen;
    }

    public LanShare(String deviceId) { this.deviceId = deviceId; }

    /** Starts listening for other devices' announcements. */
    public synchronized void open() {
        if (open) return;
        open = true;
        try {
            udp = new DatagramSocket(null);
            udp.setReuseAddress(true);
            udp.setBroadcast(true);
            udp.bind(new InetSocketAddress(PORT));
        } catch (Exception e) {
            udp = null; // the port is taken: we can still announce ourselves from another socket
        }
        final DatagramSocket in = udp;
        if (in != null) new Thread(() -> listen(in), "wr-nearby-listen").start();
        new Thread(this::announceLoop, "wr-nearby-announce").start();
    }

    public synchronized void close() {
        open = false;
        share("", "");
        if (udp != null) udp.close();
        udp = null;
        peers.clear();
    }

    /** Shares this character (empty text stops sharing). */
    public synchronized void share(String infoJson, String characterText) {
        info = infoJson == null ? "" : infoJson;
        text = characterText == null ? "" : characterText;
        if (text.isEmpty()) {
            if (tcp != null) try { tcp.close(); } catch (Exception ignored) { }
            tcp = null;
            return;
        }
        if (tcp != null) return;
        try {
            tcp = new ServerSocket(0);
            final ServerSocket srv = tcp;
            new Thread(() -> serve(srv), "wr-nearby-serve").start();
        } catch (Exception e) {
            tcp = null;
        }
    }

    public boolean sharing() { return tcp != null && !text.isEmpty(); }

    private void serve(ServerSocket srv) {
        while (!srv.isClosed()) {
            try (Socket s = srv.accept()) {
                s.setSoTimeout(5000);
                OutputStream out = s.getOutputStream();
                out.write(text.getBytes(StandardCharsets.UTF_8));
                out.flush();
            } catch (Exception e) { /* closed, or the other side went away */ }
        }
    }

    private void announceLoop() {
        try (DatagramSocket out = new DatagramSocket()) {
            out.setBroadcast(true);
            while (open) {
                ServerSocket srv = tcp;
                if (srv != null && !text.isEmpty()) {
                    byte[] b = (MAGIC + "\n" + deviceId + "\n" + srv.getLocalPort() + "\n" + info).getBytes(StandardCharsets.UTF_8);
                    for (InetAddress a : broadcastAddresses()) {
                        try { out.send(new DatagramPacket(b, b.length, a, PORT)); } catch (Exception ignored) { }
                    }
                }
                Thread.sleep(2000);
            }
        } catch (Exception e) { /* stopped */ }
    }

    static List<InetAddress> broadcastAddresses() {
        List<InetAddress> list = new ArrayList<>();
        try {
            Enumeration<NetworkInterface> ifs = NetworkInterface.getNetworkInterfaces();
            while (ifs != null && ifs.hasMoreElements()) {
                NetworkInterface n = ifs.nextElement();
                if (!n.isUp() || n.isLoopback()) continue;
                for (InterfaceAddress ia : n.getInterfaceAddresses()) {
                    InetAddress b = ia.getBroadcast();
                    if (b != null && !list.contains(b)) list.add(b);
                }
            }
        } catch (Exception ignored) { }
        try {
            InetAddress all = InetAddress.getByName("255.255.255.255");
            if (!list.contains(all)) list.add(all);
        } catch (Exception ignored) { }
        return list;
    }

    private void listen(DatagramSocket in) {
        byte[] buf = new byte[8192];
        while (open && !in.isClosed()) {
            try {
                DatagramPacket p = new DatagramPacket(buf, buf.length);
                in.receive(p);
                String[] parts = new String(p.getData(), 0, p.getLength(), StandardCharsets.UTF_8).split("\n", 4);
                if (parts.length < 4 || !MAGIC.equals(parts[0]) || parts[1].equals(deviceId) || parts[1].length() > 64) continue;
                Peer peer = new Peer();
                peer.id = parts[1];
                peer.via = "wifi";
                peer.host = p.getAddress().getHostAddress();
                peer.port = Integer.parseInt(parts[2].trim());
                peer.info = parts[3];
                peer.seen = System.currentTimeMillis();
                if (peer.port <= 0 || peer.port > 65535) continue;
                peers.put(peer.id, peer);
            } catch (Exception e) { /* a bad packet, or closed */ }
        }
    }

    /** Adds a device found another way (Bluetooth), with its character's text already read. */
    public void addPeer(String id, String via, String infoJson, String characterText) {
        if (id == null || id.equals(deviceId)) return;
        Peer p = new Peer();
        p.id = id; p.via = via; p.info = infoJson; p.text = characterText; p.seen = System.currentTimeMillis();
        peers.put(id, p);
    }

    /** The devices heard recently, as a JSON array: [{"id","via","info"}] (info is the JSON text they sent). */
    public String peersJson() {
        long now = System.currentTimeMillis();
        StringBuilder sb = new StringBuilder("[");
        synchronized (peers) {
            for (Peer p : peers.values()) {
                // Wi-Fi devices announce every 2 s; a Bluetooth one is kept until the next Bluetooth search
                if ("wifi".equals(p.via) && now - p.seen > 8000) continue;
                if (sb.length() > 1) sb.append(',');
                sb.append("{\"id\":").append(quote(p.id)).append(",\"via\":").append(quote(p.via))
                  .append(",\"info\":").append(quote(p.info)).append('}');
            }
        }
        return sb.append(']').toString();
    }

    public void forgetVia(String via) {
        synchronized (peers) { peers.values().removeIf(p -> via.equals(p.via)); }
    }

    /** The character text of a device found earlier, or "ERROR: ...". Blocks for up to a few seconds. */
    public String fetch(String id) {
        Peer p = peers.get(id);
        if (p == null) return "ERROR: gone";
        if (p.text != null) return p.text;
        try (Socket s = new Socket()) {
            s.connect(new InetSocketAddress(p.host, p.port), 4000);
            s.setSoTimeout(5000);
            return readAll(s.getInputStream());
        } catch (Exception e) {
            return "ERROR: " + e.getMessage();
        }
    }

    static String readAll(InputStream in) throws Exception {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) {
            b.write(buf, 0, n);
            if (b.size() > MAX_TEXT) throw new IllegalStateException("too big");
        }
        return new String(b.toByteArray(), StandardCharsets.UTF_8);
    }

    static String quote(String s) {
        if (s == null) return "\"\"";
        StringBuilder sb = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"': sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default:
                    if (c < 0x20 || c == 0x2028 || c == 0x2029) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
            }
        }
        return sb.append('"').toString();
    }
}
