<p align="center">
  <img src="icons/icon-96.png" width="80" alt="Quick Timer Pro icon">
</p>

<h1 align="center">Quick Timer Pro</h1>

<p align="center">
  <strong>Firefox extension timer premium — multi-timer, suara, label, history, keyboard shortcut</strong>
</p>

<p align="center">
  <a href="#fitur">Fitur</a> ·
  <a href="#instalasi">Instalasi</a> ·
  <a href="#keyboard-shortcuts">Shortcut</a> ·
  <a href="#pengaturan">Pengaturan</a> ·
  <a href="#teknologi">Teknologi</a>
</p>

---

## Fitur

| # | Fitur | Deskripsi |
|---|-------|-----------|
| 1 | **Multi-Timer** | Jalankan beberapa timer sekaligus — tiap timer punya kartu terpisah dengan warna berbeda |
| 2 | **Suara Notifikasi** | 3 pilihan nada (Bel, Digital, Lembut) + slider volume 0-100% |
| 3 | **Label Timer** | Beri nama tiap timer: Kerja, Masak, Istirahat, atau apapun |
| 4 | **Custom Presets** | Simpan preset sendiri dengan nama + warna — satu klik langsung jalan |
| 5 | **Tab Title Countdown** | Sisa waktu tampil di title tab Firefox — gak perlu buka popup buat cek |
| 6 | **Timer History** | Catat semua timer yang selesai — tau berapa lama kamu kerja hari ini |
| 7 | **Progress Ring** | Lingkaran visual + persentase di tiap timer card |
| 8 | **Keyboard Shortcuts** | `Ctrl+Shift+T` = 1 Jam, `Ctrl+Shift+Y` = 30 Menit |
| 9 | **Dark / Light Theme** | Toggle tema sesuai selera — satu klik di pojok kanan atas |
| 10 | **Snooze / Extend** | Timer selesai? Langsung +5 / +15 / +30 menit tanpa set ulang |

### Bonus

- **Badge timer** — sisa waktu di toolbar icon
- **Notifikasi system** — popup Firefox saat timer selesai
- **Input manual** — set jam : menit : detik bebas
- **State tersimpan** — timer jalan walau popup ditutup, lanjut kalau dibuka lagi
- **Animasi premium** — glassmorphism, transisi smooth, progress ring animasi

---

## Instalasi

### Developer Mode (Quick)

1. Buka Firefox, ketik `about:debugging#/runtime/this-firefox` di address bar
2. Klik **"Load Temporary Add-on..."**
3. Pilih file `manifest.json` dari folder project
4. Done — icon timer muncul di toolbar

### Permanent (via Firefox Add-ons)

1. Buat developer account di [addons.mozilla.org](https://addons.mozilla.org/)
2. Submit extension untuk review
3. Setelah approved, install langsung dari Firefox Add-ons

---

## Keyboard Shortcuts

| Shortcut | Aksi |
|----------|------|
| `Ctrl + Shift + T` | Timer 1 Jam |
| `Ctrl + Shift + Y` | Timer 30 Menit |

> Shortcut bisa diubah di `about:addons` → Quick Timer Pro → Preferences

---

## Pengaturan

Akses pengaturan lewat tombol gear (⚙) di pojok kanan atas popup.

| Setting | Default | Deskripsi |
|---------|---------|-----------|
| Suara Notifikasi | Bel | Nada yang diputar saat timer selesai |
| Volume | 70% | Keras suara notifikasi |
| Tab Title Countdown | Aktif | Tampilkan sisa waktu di title tab |

---

## Struktur Project

```
timer-extension/
├── manifest.json        # Konfigurasi extension
├── popup.html           # UI popup
├── popup.css            # Styling premium (dark/light theme)
├── popup.js             # Logic timer, presets, history, sound
├── background.js        # Keyboard shortcut handler, alarm
└── icons/
    ├── icon-16.png
    ├── icon-32.png
    ├── icon-48.png
    └── icon-96.png
```

---

## Teknologi

- **Manifest V2** — kompatibel dengan Firefox 57+
- **Web Audio API** — generate notifikasi suara tanpa file audio eksternal
- **browser.storage.local** — persistensi timer, preset, history, settings
- **CSS Custom Properties** — theme system (dark/light) tanpa library
- **Event Delegation** — performa tinggi untuk multiple timer cards

---

## License

MIT