// ==UserScript==
// @name         Tool OLM EZ
// @namespace    http://tampermonkey.net/
// @version      5.4.0
// @description  Tool OLM EZ - Purple Hacker Edition with Math Support, Night Mode, Search, Auto-refresh, Settings & Shortcuts
// @author       Quan Ngọc Thành
// @match        https://olm.vn/*
// @grant        unsafeWindow
// @run-at       document-end
// @require      https://cdn.jsdelivr.net/npm/lz-string@1.4.4/libs/lz-string.min.js
// ==/UserScript==

(function() {

    // ════════════════════════════════════════════════════════════════════════════════
    // TOOL OLM EZ v5.4 - Purple Hacker Edition
    // ════════════════════════════════════════════════════════════════════════════════
    // 
    // ✨ FEATURES:
    //   🔧 Auto-detect XOR key & endpoints (tự động phát hiện API)
    //   📐 Math symbols support (ký hiệu toán học: √, π, α, β, γ, Σ, Ω, ...)
    //   🎨 Purple Hacker theme (theme tím siêu đẹp cho hacker)
    //   🌙 Night Mode (chế độ đêm siêu tối)
    //   🔍 Search/Filter answers (tìm kiếm câu trả lời)
    //   ⟳ Auto-refresh (tự động cập nhật)
    //   ⚙️  Settings panel (cấu hình chi tiết)
    //   ⌨️  Keyboard shortcuts (phím tắt)
    //   💾 LocalStorage cache (lưu cache câu hỏi)
    //   📊 Batch questions display (hiển thị theo nhóm)
    //   📥 Export to TXT (xuất kết quả ra file)
    //
    // ⌨️  KEYBOARD SHORTCUTS:
    //   Shift + Right    : Toggle panel visibility
    //   Ctrl + F         : Search answers
    //   Ctrl + E         : Export to TXT
    //   Ctrl + R         : Toggle auto-refresh
    //   Ctrl + L         : Toggle night mode
    //   Ctrl + K         : Show shortcuts
    //
    // 🔧 FIXES IN v5.2:
    //   🐛 Fixed: mathTextToHtml LaTeX escaping order (Unicode trước, HTML escape sau)
    //   🐛 Fixed: KaTeX font loading - thêm preconnect & fallback CDN
    //   🐛 Fixed: clearBtn không xóa cache - now clears both UI & localStorage
    //   🐛 Fixed: renderMathInElement tự load KaTeX nếu page không có
    //   ✨ New: Night mode siêu tối
    //   ✨ New: Search/Filter by keyword
    //   ✨ New: Auto-refresh with configurable interval
    //   ✨ New: Settings panel
    //   ✨ New: Keyboard shortcuts
    //   🎨 Theme: Xanh lá (#39ff14) → Tím hacker (#bf5fff)
    //
    // 📝 NOTE: Đây là tool học tập cá nhân - sử dụng đúng mục đích!
    // ════════════════════════════════════════════════════════════════════════════════

    'use strict';

    // ────────────────────────────────────────────────────────────────────
    // PANEL CUSTOMIZATION SETTINGS (v5.4)
    // ────────────────────────────────────────────────────────────────────
    const PANEL_CONFIG = {
        width: parseInt(localStorage.getItem('olm_panel_width') || '25'),
        height: parseInt(localStorage.getItem('olm_panel_height') || '80'),
        theme: localStorage.getItem('olm_panel_theme') || 'purple',
        zoom: parseInt(localStorage.getItem('olm_panel_zoom') || '100'),
        save() {
            localStorage.setItem('olm_panel_width', this.width);
            localStorage.setItem('olm_panel_height', this.height);
            localStorage.setItem('olm_panel_theme', this.theme);
            localStorage.setItem('olm_panel_zoom', this.zoom);
        }
    };

    const COLORS = {
        purple: { main: '#bf5fff', accent: '#d480ff', text: '#e8c8ff', bg: '#0d0a12' },
        blue: { main: '#00bfff', accent: '#1e90ff', text: '#b0e0e6', bg: '#0a0f1a' },
        green: { main: '#00ff7f', accent: '#32cd32', text: '#98ff98', bg: '#0a1a0a' },
        red: { main: '#ff4444', accent: '#ff6666', text: '#ffcccc', bg: '#1a0a0a' },
        cyan: { main: '#00ffff', accent: '#00eeee', text: '#b0ffff', bg: '#0a1515' },
        pink: { main: '#ff69b4', accent: '#ff1493', text: '#ffb0d9', bg: '#1a0a10' }
    };

    function setZoom(percent) {
        PANEL_CONFIG.zoom = Math.max(50, Math.min(200, percent));
        PANEL_CONFIG.save();
        const container = document.getElementById('olm-answers-container');
        if (container) container.style.fontSize = (PANEL_CONFIG.zoom / 100) + 'em';
    }

    function zoomIn() { setZoom(PANEL_CONFIG.zoom + 10); }
    function zoomOut() { setZoom(PANEL_CONFIG.zoom - 10); }

    function applyTheme(themeName) {
        const colors = COLORS[themeName];
        if (!colors) return;
        PANEL_CONFIG.theme = themeName;
        PANEL_CONFIG.save();
        const style = document.getElementById('olm-theme-style') || document.createElement('style');
        style.id = 'olm-theme-style';
        style.textContent = `
            #olm-answers-container { border-color: ${colors.main} !important; background: ${colors.bg} !important; }
            .olm-answers-header { border-color: ${colors.main} !important; }
            .olm-hack-answer-ul li { border-left-color: ${colors.main} !important; color: ${colors.main} !important; }
            .qa-block { border-left-color: ${colors.main} !important; }
        `;
        if (!document.getElementById('olm-theme-style')) document.head.appendChild(style);
    }

        function openSettings() {
        const themes = Object.keys(COLORS);
        let themeOpts = themes.map(t => `<option value="${t}" ${PANEL_CONFIG.theme === t ? 'selected' : ''}>${t}</option>`).join('');
        const html = `
            <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#0d0a12;border:2px solid #bf5fff;padding:20px;z-index:9999999;width:90%;max-width:450px;border-radius:4px;box-shadow:0 0 30px rgba(191,95,255,0.4);color:#e8c8ff;font-family:inherit;max-height:85vh;overflow-y:auto;">
                <h3 style="margin:0 0 15px 0;color:#bf5fff;font-size:14px;">⚙️ Panel Settings (v5.4)</h3>
                <div style="margin:10px 0;padding:10px;background:rgba(191,95,255,0.08);border-radius:3px;border-left:2px solid #bf5fff;">
                    <label style="display:block;margin-bottom:5px;font-weight:600;color:#d480ff;">Panel Width (vw)</label>
                    <input type="range" min="20" max="80" value="${PANEL_CONFIG.width}" id="set-width" style="width:100%;cursor:pointer;">
                    <span id="w-display" style="font-size:11px;color:#bf5fff;">${PANEL_CONFIG.width}vw</span>
                </div>
                <div style="margin:10px 0;padding:10px;background:rgba(191,95,255,0.08);border-radius:3px;border-left:2px solid #bf5fff;">
                    <label style="display:block;margin-bottom:5px;font-weight:600;color:#d480ff;">Panel Height (vh)</label>
                    <input type="range" min="30" max="95" value="${PANEL_CONFIG.height}" id="set-height" style="width:100%;cursor:pointer;">
                    <span id="h-display" style="font-size:11px;color:#bf5fff;">${PANEL_CONFIG.height}vh</span>
                </div>
                <div style="margin:10px 0;padding:10px;background:rgba(191,95,255,0.08);border-radius:3px;border-left:2px solid #bf5fff;">
                    <label style="display:block;margin-bottom:5px;font-weight:600;color:#d480ff;">Zoom Level</label>
                    <input type="range" min="50" max="200" value="${PANEL_CONFIG.zoom}" id="set-zoom" style="width:100%;cursor:pointer;">
                    <span id="z-display" style="font-size:11px;color:#bf5fff;">${PANEL_CONFIG.zoom}%</span>
                </div>
                <div style="margin:10px 0;padding:10px;background:rgba(191,95,255,0.08);border-radius:3px;border-left:2px solid #bf5fff;">
                    <label style="display:block;margin-bottom:5px;font-weight:600;color:#d480ff;">Theme Color</label>
                    <select id="set-theme" style="width:100%;padding:6px;background:#0d0a12;border:1px solid #bf5fff;color:#bf5fff;border-radius:3px;cursor:pointer;font-family:inherit;font-weight:600;">
                        ${themeOpts}
                    </select>
                </div>
                <div style="margin:15px 0 0;display:flex;gap:8px;">
                    <button id="close-set" style="flex:1;padding:8px;background:#bf5fff;color:#000;border:none;border-radius:3px;cursor:pointer;font-weight:700;font-size:12px;font-family:inherit;">✕ Close</button>
                </div>
            </div>
        `;
        const panel = document.createElement('div');
        panel.innerHTML = html;
        document.body.appendChild(panel);

        const wInput = document.getElementById('set-width');
        const hInput = document.getElementById('set-height');
        const zInput = document.getElementById('set-zoom');
        const tSelect = document.getElementById('set-theme');
        const container = document.getElementById('olm-answers-container');

        // Real-time update on input change
        const applyChanges = () => {
            const w = parseInt(wInput.value);
            const h = parseInt(hInput.value);
            const z = parseInt(zInput.value);
            
            PANEL_CONFIG.width = w;
            PANEL_CONFIG.height = h;
            PANEL_CONFIG.zoom = z;
            PANEL_CONFIG.save();
            
            if (container) {
                container.style.width = w + 'vw';
                container.style.maxHeight = h + 'vh';
                container.style.fontSize = (z / 100) + 'em';
            }
            
            document.getElementById('w-display').textContent = w + 'vw';
            document.getElementById('h-display').textContent = h + 'vh';
            document.getElementById('z-display').textContent = z + '%';
        };

        // Kéo slider → apply ngay (real-time)
        wInput.oninput = applyChanges;
        hInput.oninput = applyChanges;
        zInput.oninput = applyChanges;
        
        // Thay đổi theme → apply ngay
        tSelect.onchange = () => {
            applyTheme(tSelect.value);
        };

        document.getElementById('close-set').onclick = () => panel.remove();
        
        panel.addEventListener('click', (e) => { if (e.target === panel) panel.remove(); });
    }

    console.log("[OLM v5.2] ╔════════════════════════════════╗");console.log("[OLM v5.2] ║  TOOL OLM EZ - Purple Edition  ║");console.log("[OLM v5.2] ║  Author: Quan Ngọc Thành       ║");console.log("[OLM v5.2] ║  Features: Math, Night Mode    ║");console.log("[OLM v5.2] ║           Search, Auto-refresh ║");console.log("[OLM v5.2] ║           Settings, Shortcuts   ║");console.log("[OLM v5.2] ╚════════════════════════════════╝");

    // ─── GLOBAL STATE ────────────────────────────────────────────────────────────
    let globalQuestionCounter = 0;          // số thứ tự câu tổng toàn session
    const seenQuestionIds = new Set();      // dedup: tránh render câu đã hiện
    const LS_KEY = 'olm_ez_cache_v5';      // localStorage key

    // ─── LOCALSTORAGE CACHE (with in-memory layer - Fix #2) ─────────────────────

    // FEATURE: Keyboard shortcuts panel
    function showShortcuts() {
        const panel = document.createElement('div');
        panel.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#0d0a12;border:2px solid #bf5fff;padding:20px;border-radius:4px;z-index:9999999;box-shadow:0 0 30px rgba(191,95,255,0.4);font-family:monospace;color:#e8c8ff;max-width:450px;width:90%;max-height:70vh;overflow-y:auto;';
        panel.innerHTML = `
            <h2 style="margin:0 0 15px 0;color:#bf5fff;font-size:16px;text-align:center;">⌨️ KEYBOARD SHORTCUTS</h2>
            <table style="width:100%;border-collapse:collapse;font-size:11px;">
                <tr><td style="padding:5px;border-bottom:1px solid rgba(191,95,255,0.2);color:#bf5fff;">Shift + Right</td><td style="padding:5px;border-bottom:1px solid rgba(191,95,255,0.2);">Toggle panel visibility</td></tr>
                <tr><td style="padding:5px;border-bottom:1px solid rgba(191,95,255,0.2);color:#bf5fff;">Ctrl + F</td><td style="padding:5px;border-bottom:1px solid rgba(191,95,255,0.2);">Search answers</td></tr>
                <tr><td style="padding:5px;border-bottom:1px solid rgba(191,95,255,0.2);color:#bf5fff;">Ctrl + E</td><td style="padding:5px;border-bottom:1px solid rgba(191,95,255,0.2);">Export to TXT</td></tr>
                <tr><td style="padding:5px;border-bottom:1px solid rgba(191,95,255,0.2);color:#bf5fff;">Ctrl + R</td><td style="padding:5px;border-bottom:1px solid rgba(191,95,255,0.2);">Toggle auto-refresh</td></tr>
                <tr><td style="padding:5px;border-bottom:1px solid rgba(191,95,255,0.2);color:#bf5fff;">Ctrl + L</td><td style="padding:5px;border-bottom:1px solid rgba(191,95,255,0.2);">Toggle night mode</td></tr>
                <tr><td style="padding:5px;border-bottom:1px solid rgba(191,95,255,0.2);color:#bf5fff;">Ctrl + K</td><td style="padding:5px;border-bottom:1px solid rgba(191,95,255,0.2);">Show shortcuts</td></tr>
            </table>
            <p style="font-size:10px;color:rgba(191,95,255,0.6);margin:10px 0 0 0;text-align:center;">> Click anywhere to close</p>
        `;
        document.body.appendChild(panel);
        panel.onclick = () => panel.remove();
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') panel.remove();
        }, { once: true });
    }
    
    // === Global keyboard shortcuts ===
    document.addEventListener('keydown', (e) => {
        const uw = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
        if (e.ctrlKey || e.metaKey) {
            switch(e.key.toLowerCase()) {
                case 'e':
                    e.preventDefault();
                    document.getElementById('export-btn')?.click();
                    break;
                case 'f':
                    e.preventDefault();
                    document.getElementById('search-filter-btn')?.click();
                    break;
                case 'r':
                    e.preventDefault();
                    document.getElementById('auto-refresh-btn')?.click();
                    break;
                case 'l':
                    e.preventDefault();
                    document.getElementById('night-mode-btn')?.click();
                    break;
                case 'k':
                    e.preventDefault();
                    showShortcuts();
                    break;
            }
        }
    });

    // FEATURE: Settings configuration
    const OLM_SETTINGS = {
        showQuestionIndex: localStorage.getItem('olm_show_idx') !== 'false',
        showTimestamp: localStorage.getItem('olm_show_ts') === 'true',
        autoCollapseAfter: parseInt(localStorage.getItem('olm_auto_collapse') || '0'),
        compactMode: localStorage.getItem('olm_compact') === 'true',
        
        save() {
            localStorage.setItem('olm_show_idx', this.showQuestionIndex);
            localStorage.setItem('olm_show_ts', this.showTimestamp);
            localStorage.setItem('olm_auto_collapse', this.autoCollapseAfter);
            localStorage.setItem('olm_compact', this.compactMode);
        },
        
        toggle(key) {
            if (typeof this[key] === 'boolean') {
                this[key] = !this[key];
                this.save();
            }
        }
    };
    
    

    // FEATURE: Auto-refresh with configurable interval
    let AUTO_REFRESH_ENABLED = localStorage.getItem('olm_auto_refresh') === 'true';
    let AUTO_REFRESH_INTERVAL = parseInt(localStorage.getItem('olm_refresh_interval') || '30');
    let autoRefreshTimer = null;
    
    function setAutoRefresh(enabled, intervalSeconds = null) {
        AUTO_REFRESH_ENABLED = enabled;
        if (intervalSeconds) AUTO_REFRESH_INTERVAL = intervalSeconds;
        localStorage.setItem('olm_auto_refresh', enabled);
        localStorage.setItem('olm_refresh_interval', AUTO_REFRESH_INTERVAL);
        
        if (autoRefreshTimer) clearInterval(autoRefreshTimer);
        if (enabled) {
            console.log(`[OLM] Auto-refresh ON every ${AUTO_REFRESH_INTERVAL}s`);
            autoRefreshTimer = setInterval(() => {
                console.log('[OLM] Auto-refresh triggered');
                // Reload page nếu có câu mới (API sẽ gọi renderData tự động)
            }, AUTO_REFRESH_INTERVAL * 1000);
        } else {
            console.log('[OLM] Auto-refresh OFF');
        }
        
        const btn = document.getElementById('auto-refresh-btn');
        if (btn) {
            btn.style.background = enabled ? 'rgba(191,95,255,0.2)' : 'transparent';
            btn.style.borderColor = enabled ? 'rgba(191,95,255,0.6)' : 'rgba(191,95,255,0.3)';
        }
    }
    if (AUTO_REFRESH_ENABLED) setAutoRefresh(true);

    // FEATURE: Night Mode - siêu tối cho hacker
    let NIGHT_MODE = localStorage.getItem('olm_night_mode') === 'true';
    function toggleNightMode() {
        NIGHT_MODE = !NIGHT_MODE;
        localStorage.setItem('olm_night_mode', NIGHT_MODE);
        applyNightModeStyles();
        const btn = document.getElementById('night-mode-btn');
        if (btn) {
            btn.textContent = NIGHT_MODE ? '☀ Light' : '🌙 Night';
            btn.style.background = NIGHT_MODE ? 'rgba(191,95,255,0.2)' : 'transparent';
        }
    }
    
    function applyNightModeStyles() {
        if (!NIGHT_MODE) return;
        const style = document.getElementById('olm-night-mode-style');
        if (style) return; // đã apply
        const s = document.createElement('style');
        s.id = 'olm-night-mode-style';
        s.textContent = `
            #olm-answers-container {
                background: #05020a !important;
                border-color: #8b4fbf !important;
                box-shadow: 0 0 30px rgba(191,95,255,0.2), inset 0 0 60px rgba(0,0,0,0.98) !important;
            }
            #olm-answers-content {
                background: #05020a !important;
            }
            .olm-answers-header {
                background: #03010a !important;
                border-color: #8b4fbf !important;
            }
            #olm-answers-footer {
                background: #03010a !important;
            }
            .qa-block {
                background: rgba(139,79,191,0.02) !important;
                border-color: #8b4fbf !important;
            }
            .question-content { color: #b89aff !important; }
            .olm-hack-answer-ul li {
                background: rgba(139,79,191,0.05) !important;
                color: #bf5fff !important;
            }
        `;
        (document.head || document.documentElement).appendChild(s);
    }
    if (NIGHT_MODE) applyNightModeStyles();

    const Cache = {
        _mem: null,  // in-memory cache, loaded once from localStorage
        _dirty: false,
        _saveTimer: null,
        _ensureLoaded() {
            if (this._mem !== null) return;
            try {
                const raw = localStorage.getItem(LS_KEY);
                this._mem = raw ? JSON.parse(raw) : {};
            } catch (_) { this._mem = {}; }
        },
        _scheduleSave() {
            if (this._saveTimer) return;
            this._saveTimer = setTimeout(() => {
                this._saveTimer = null;
                if (!this._dirty) return;
                try { localStorage.setItem(LS_KEY, JSON.stringify(this._mem)); } catch (_) {}
                this._dirty = false;
            }, 500);
        },
        get(qid) {
            this._ensureLoaded();
            return this._mem[String(qid)] || null;
        },
        set(qid, val) {
            this._ensureLoaded();
            this._mem[String(qid)] = { val, ts: Date.now() };
            // Giới hạn 500 câu
            const keys = Object.keys(this._mem);
            if (keys.length > 500) {
                keys.sort((a, b) => (this._mem[a].ts || 0) - (this._mem[b].ts || 0))
                    .slice(0, keys.length - 500)
                    .forEach(k => delete this._mem[k]);
            }
            this._dirty = true;
            this._scheduleSave();
        },
        clear() {
            this._mem = {};
            this._dirty = false;
            if (this._saveTimer) { clearTimeout(this._saveTimer); this._saveTimer = null; }
            try { localStorage.removeItem(LS_KEY); } catch (_) {}
        }
    };

    // ─── AUTO-DETECT: endpoint keyword ───────────────────────────────────────
    let TARGET_URL_KEYWORD = 'get-question-of-ids';
    const DETECTED_ENDPOINTS = new Set([TARGET_URL_KEYWORD]);

    function looksLikeQuestionList(data) {
        let list = data;
        if (!Array.isArray(list)) {
            list = (data && (data.list || data.data || data.questions || data.items)) || null;
        }
        if (!Array.isArray(list) || list.length === 0) return false;
        const sample = list[0];
        if (!sample || typeof sample !== 'object') return false;
        const hasId = sample.id != null || sample._id != null;
        const hasContent = sample.content != null || sample.json_content != null || sample.title != null;
        return hasId && hasContent;
    }

    function learnEndpoint(url) {
        if (!url || typeof url !== 'string') return;
        try {
            const u = new URL(url);
            const segments = u.pathname.split('/').filter(s => s && !/^\d+$/.test(s));
            const keyword = segments[segments.length - 1] || '';
            if (keyword && keyword.length > 4 && !DETECTED_ENDPOINTS.has(keyword)) {
                DETECTED_ENDPOINTS.add(keyword);
                TARGET_URL_KEYWORD = keyword;
                console.info('[Hack olm] Tự học endpoint mới:', keyword);
            }
        } catch (_) { /* ignore */ }
    }

    function isTrackedUrl(url) {
        if (!url || typeof url !== 'string') return false;
        for (const kw of DETECTED_ENDPOINTS) {
            if (url.includes(kw)) return true;
        }
        return false;
    }

    // ─── AUTO-DETECT: XOR key từ bundle JS ───────────────────────────────────
    let OLM_XOR_KEY = '1047823200';
    let xorKeyLearned = false;

    function tryExtractXorKeyFromText(text) {
        if (!text || typeof text !== 'string') return null;
        const patterns = [
            /xor[A-Za-z_]*\s*[=:]\s*['"](\d{6,14})['"]/i,
            /encode[A-Za-z_]*Key\s*[=:]\s*['"](\d{6,14})['"]/i,
            /OlmEncode[\s\S]{0,300}['"](\d{8,14})['"]/,
            /charCodeAt\s*\(\s*\w+\s*%\s*\w+\.length\s*\)[\s\S]{0,200}['"](\d{8,14})['"]/,
            /['"](\d{8,14})['"]\s*;?\s*\/\/[^\n]*(key|xor|mã|khóa)/i,
        ];
        for (const re of patterns) {
            const m = text.match(re);
            if (m) {
                const key = m[m.length - 1];
                if (/^\d{6,14}$/.test(key)) return key;
            }
        }
        return null;
    }

    function scanForXorKey() {
        if (xorKeyLearned) return;
        try {
            // Quét inline scripts trước (nhanh, không tốn network)
            document.querySelectorAll('script:not([src])').forEach(s => {
                if (xorKeyLearned) return;
                const found = tryExtractXorKeyFromText(s.textContent || '');
                if (found) {
                    OLM_XOR_KEY = found;
                    xorKeyLearned = true;
                    console.info('[Hack olm] XOR key (inline):', found);
                }
            });
            // Quét external bundles: tối đa 2 file, tuần tự để không block network
            if (!xorKeyLearned) {
                const candidates = Array.from(document.querySelectorAll('script[src]'))
                    .filter(s => /olm|app|chunk|main|bundle/i.test(s.src))
                    .slice(0, 2); // chỉ lấy 2 file đầu
                const fetchNext = (i) => {
                    if (i >= candidates.length || xorKeyLearned) return;
                    fetch(candidates[i].src)
                        .then(r => r.text())
                        .then(text => {
                            if (!xorKeyLearned) {
                                const found = tryExtractXorKeyFromText(text);
                                if (found) {
                                    OLM_XOR_KEY = found;
                                    xorKeyLearned = true;
                                    console.info('[Hack olm] XOR key (bundle):', found);
                                }
                            }
                            fetchNext(i + 1);
                        })
                        .catch(() => fetchNext(i + 1));
                };
                fetchNext(0);
            }
        } catch (_) { /* ignore */ }
    }

    function scheduleScanXorKey() {
        const run = () => scanForXorKey();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', run, { once: true });
        } else {
            run();
        }
        // Thêm lần scan sau cho lazy-loaded chunks
        setTimeout(run, 3000);
        setTimeout(run, 8000);
    }
    scheduleScanXorKey();

    // ─── KATEX CSS: load stylesheet của OLM nếu chưa có ─────────────────────
    function ensureKatexCss() {
        if (document.querySelector('link[href*="katex"]')) return; // đã có
        // BUG FIX: Thêm font-display:swap và preconnect để font ký hiệu toán học load đúng
        const preconnect = document.createElement('link');
        preconnect.rel = 'preconnect';
        preconnect.href = 'https://cdn.jsdelivr.net';
        (document.head || document.documentElement).appendChild(preconnect);
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
        link.crossOrigin = 'anonymous';
        link.onerror = () => {
            // Fallback sang cdnjs nếu jsdelivr lỗi
            const fallback = document.createElement('link');
            fallback.rel = 'stylesheet';
            fallback.href = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/katex.min.css';
            (document.head || document.documentElement).appendChild(fallback);
        };
        (document.head || document.documentElement).appendChild(link);
        // Inject CSS fix cho KaTeX font symbols hiển thị đúng trong panel tối
        const fixStyle = document.createElement('style');
        fixStyle.id = 'olm-katex-fix';
        if (!document.getElementById('olm-katex-fix')) {
            fixStyle.textContent = `
                #olm-answers-container .katex { font-size: 1em !important; color: inherit !important; }
                #olm-answers-container .katex-display { margin: 2px 0 !important; color: #d4aaff !important; }
                #olm-answers-container .katex .mord, 
                #olm-answers-container .katex .mbin,
                #olm-answers-container .katex .mrel { color: #d4aaff !important; }
                #olm-answers-container .katex-html { white-space: normal !important; }
            `;
            (document.head || document.documentElement).appendChild(fixStyle);
        }
    }

    /**
     * Render toán học dùng engine của trang (KaTeX / MathJax OLM tự load).
     * KHÔNG import KaTeX riêng để tránh conflict với trang.
     */
    // BUG FIX: Load KaTeX standalone nếu trang không có sẵn
    let _katexAutoRenderLoaded = false;
    function ensureKatexAutoRender(callback) {
        const uw = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
        if (uw.renderMathInElement) { callback(); return; }
        if (_katexAutoRenderLoaded) { setTimeout(callback, 100); return; }
        _katexAutoRenderLoaded = true;
        ensureKatexCss();
        // Load KaTeX core
        const s1 = document.createElement('script');
        s1.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
        s1.crossOrigin = 'anonymous';
        s1.onload = () => {
            // Load auto-render extension
            const s2 = document.createElement('script');
            s2.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js';
            s2.crossOrigin = 'anonymous';
            s2.onload = callback;
            s2.onerror = callback;
            document.head.appendChild(s2);
        };
        s1.onerror = callback;
        document.head.appendChild(s1);
    }

    function renderMathInElement(el) {
        if (!el) return;
        try {
            const uw = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
            // Ưu tiên auto-render KaTeX của trang
            if (uw.renderMathInElement) {
                uw.renderMathInElement(el, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '$', right: '$', display: false },
                        { left: '\\(', right: '\\)', display: false },
                        { left: '\\[', right: '\\]', display: true }
                    ],
                    throwOnError: false,
                    ignoredTags: ['script', 'noscript', 'style', 'textarea'],
                    ignoredClasses: ['olm-no-math']
                });
                ensureKatexCss();
                return;
            }
            // BUG FIX: Nếu trang không có KaTeX, load riêng
            if (!uw.katex) {
                ensureKatexAutoRender(() => renderMathInElement(el));
                return;
            }
            // Fallback: dùng katex.renderToString từng span
            if (uw.katex) {
                ensureKatexCss();
                el.querySelectorAll('span[data-latex]').forEach(span => {
                    try {
                        span.innerHTML = uw.katex.renderToString(span.dataset.latex, {
                            throwOnError: false, displayMode: false
                        });
                    } catch (_) { /* ignore */ }
                });
                // BUG FIX: Cũng render inline $...$ patterns trong text nodes
                if (uw.renderMathInElement) {
                    uw.renderMathInElement(el, {
                        delimiters: [
                            { left: '$$', right: '$$', display: true },
                            { left: '$', right: '$', display: false },
                            { left: '\\(', right: '\\)', display: false },
                            { left: '\\[', right: '\\]', display: true }
                        ],
                        throwOnError: false
                    });
                }
                return;
            }
            // MathJax fallback
            if (uw.MathJax) {
                if (uw.MathJax.typeset) uw.MathJax.typeset([el]);
                else if (uw.MathJax.Hub) uw.MathJax.Hub.Queue(['Typeset', uw.MathJax.Hub, el]);
            }
        } catch (_) { /* ignore */ }
    }

    /**
     * Chuyển chuỗi OLM #n# @n@ và LaTeX thành HTML có thể render.
     * Bao LaTeX trong thẻ <span data-latex> để renderMathInElement xử lý sau.
     */
    function mathTextToHtml(s) {
        if (!s || typeof s !== 'string') return escapeHtml(s || '');
        const SUB = ['₀','₁','₂','₃','₄','₅','₆','₇','⁸','₉'];
        const SUP = ['⁰','¹','²','³','⁴','⁵','⁶','⁷','⁸','⁹'];
        // BUG FIX: Xử lý OLM ký hiệu và LaTeX TRƯỚC khi escape HTML
        // Tách phần trong $...$ và $$...$$ ra, xử lý riêng
        let r = s
            .replace(/#(\d+)#/g, (_, n) => n.split('').map(c => SUB[+c] ?? c).join(''))
            .replace(/@(\d+)@/g, (_, n) => n.split('').map(c => SUP[+c] ?? c).join(''));
        // Chuyển LaTeX phổ biến sang unicode TRƯỚC khi escape HTML
        r = r
            .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
            .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
            .replace(/\\cdot/g, '·').replace(/\\times/g, '×').replace(/\\div/g, '÷')
            .replace(/\\pm/g, '±').replace(/\\leq/g, '≤').replace(/\\geq/g, '≥')
            .replace(/\\neq/g, '≠').replace(/\\approx/g, '≈').replace(/\\infty/g, '∞')
            .replace(/\\alpha/g, 'α').replace(/\\beta/g, 'β').replace(/\\gamma/g, 'γ')
            .replace(/\\delta/g, 'δ').replace(/\\Delta/g, 'Δ').replace(/\\pi/g, 'π')
            .replace(/\\theta/g, 'θ').replace(/\\lambda/g, 'λ').replace(/\\mu/g, 'μ')
            .replace(/\\sigma/g, 'σ').replace(/\\Sigma/g, 'Σ').replace(/\\Omega/g, 'Ω')
            .replace(/\\omega/g, 'ω').replace(/\\vec\{([^}]+)\}/g, '$1⃗')
            .replace(/\\overrightarrow\{([^}]+)\}/g, '$1⃗')
            .replace(/\\widehat\{([^}]+)\}/g, '$1̂')
            .replace(/\\hat\{([^}]+)\}/g, '$1̂')
            .replace(/\\bar\{([^}]+)\}/g, '$1̄')
            .replace(/\\underline\{([^}]+)\}/g, '$1̲')
            .replace(/\\left/g, '').replace(/\\right/g, '')
            .replace(/\\\w+/g, '').replace(/[{}]/g, '');
        // Escape HTML SAU khi đã xử lý xong toán học
        r = r
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return r;
    }

    /**
     * Làm sạch text thuần (không HTML) - dùng cho textContent.
     */
    function cleanMathText(s) {
        if (!s || typeof s !== 'string') return s;
        const SUB = ['₀','₁','₂','₃','₄','₅','₆','₇','₈','₉'];
        const SUP = ['⁰','¹','²','³','⁴','⁵','⁶','⁷','⁸','⁹'];
        return s
            .replace(/#(\d+)#/g, (_, n) => n.split('').map(c => SUB[+c] ?? c).join(''))
            .replace(/@(\d+)@/g, (_, n) => n.split('').map(c => SUP[+c] ?? c).join(''))
            .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
            .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
            .replace(/\\cdot/g, '·').replace(/\\times/g, '×').replace(/\\div/g, '÷')
            .replace(/\\pm/g, '±').replace(/\\leq/g, '≤').replace(/\\geq/g, '≥')
            .replace(/\\neq/g, '≠').replace(/\\approx/g, '≈').replace(/\\infty/g, '∞')
            .replace(/\\alpha/g, 'α').replace(/\\beta/g, 'β').replace(/\\gamma/g, 'γ')
            .replace(/\\delta/g, 'δ').replace(/\\Delta/g, 'Δ').replace(/\\pi/g, 'π')
            .replace(/\\theta/g, 'θ').replace(/\\lambda/g, 'λ').replace(/\\mu/g, 'μ')
            .replace(/\\sigma/g, 'σ').replace(/\\Omega/g, 'Ω').replace(/\\omega/g, 'ω')
            .replace(/\\vec\{([^}]+)\}/g, '$1⃗')
            .replace(/\\\w+/g, '').replace(/[{}]/g, '')
            .trim();
    }

    /** Set nội dung cho li với hỗ trợ ký hiệu toán học */
    function setAnswerText(li, text) {
        const s = String(text || '');
        li.innerHTML = mathTextToHtml(s);
    }

    function normalizeBase64(s) {
        if (s == null || typeof s !== 'string') return '';
        let t = s.trim().replace(/\s/g, '');
        t = t.replace(/-/g, '+').replace(/_/g, '/');
        const pad = t.length % 4;
        if (pad) t += '='.repeat(4 - pad);
        return t;
    }

    function looksLikeHtml(str) {
        return typeof str === 'string' && /^\s*</.test(str);
    }

    function getLZ() {
        try {
            if (typeof LZString !== 'undefined') return LZString;
            const uw = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
            return uw.LZString || null;
        } catch (_) {
            return null;
        }
    }

    /** Base64 "DUAK..." → byte 0x0d 0x40 0x0a: định dạng nén/đóng gói riêng của OLM (không phải HTML UTF-8). */
    function isOlmPackedPayload(bytes) {
        if (!bytes || bytes.length < 4) return false;
        if (bytes[0] === 0x0d && bytes[1] === 0x40 && bytes[2] === 0x0a) return true;
        let ctrl = 0;
        const n = Math.min(80, bytes.length);
        for (let i = 0; i < n; i++) {
            const b = bytes[i];
            if (b < 32 && b !== 9 && b !== 10 && b !== 13) ctrl++;
        }
        return ctrl > n * 0.25;
    }

    function isGarbageDecodedHtml(str) {
        if (str == null || str === '') return true;
        const bad = (str.match(/\uFFFD/g) || []).length;
        if (str.length > 0 && bad / str.length > 0.02) return true;
        if (str.length > 40 && !str.includes('<') && /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(str)) return true;
        return false;
    }

    let cachedOlmDecoder = null;

    /**
     * Trùng CATE_UI.OlmEncode.xorDecodeBase64: atob → XOR lặp khóa → new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array([......].map(c => c.charCodeAt(0))))
     * Khóa được tự động phát hiện từ bundle OLM, fallback về giá trị mặc định.
     */

    function olmXorDecodeBase64(b64) {
        if (!b64) return null;
        const normalized = normalizeBase64(typeof b64 === 'string' ? b64 : String(b64));
        if (!normalized || !/^[A-Za-z0-9+/=]+$/.test(normalized)) return null;
        try {
            const raw = atob(normalized);
            const kl = OLM_XOR_KEY.length;
            // XOR bytes
            const xored = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) {
                xored[i] = raw.charCodeAt(i) ^ OLM_XOR_KEY.charCodeAt(i % kl);
            }
            // Fix #3: dùng TextDecoder thay vì escape() (deprecated, lỗi Unicode)
            try {
                return new TextDecoder('utf-8', { fatal: true }).decode(xored);
            } catch (_) {
                // Nếu không phải UTF-8 hợp lệ, thử latin-1 fallback
                return new TextDecoder('iso-8859-1').decode(xored);
            }
        } catch (_) {
            return null;
        }
    }

    function getOlmXorDecodeFn() {
        try {
            const uw = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
            if (uw.CATE_UI && uw.CATE_UI.OlmEncode && typeof uw.CATE_UI.OlmEncode.xorDecodeBase64 === 'function') {
                return uw.CATE_UI.OlmEncode.xorDecodeBase64.bind(uw.CATE_UI.OlmEncode);
            }
            if (uw.OlmEncode && typeof uw.OlmEncode.xorDecodeBase64 === 'function') {
                return uw.OlmEncode.xorDecodeBase64.bind(uw.OlmEncode);
            }
        } catch (_) { /* ignore */ }
        return null;
    }

    /**
     * Gọi hàm giải mã trên cửa sổ trang (bundle OLM) nếu có — đây là cách duy nhất đúng với payload nhị phân.
     */
    function tryDecodeViaOlmRuntime(b64) {
        if (!b64) return null;
        try {
            const uw = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
            const localXor = olmXorDecodeBase64(b64);
            if (typeof localXor === 'string' && localXor.length > 0 && !isGarbageDecodedHtml(localXor)
                && (localXor.includes('<') || localXor.trim().startsWith('{') || localXor.length > 20)) {
                cachedOlmDecoder = (x) => olmXorDecodeBase64(x) || '';
                return localXor;
            }
            /** Trang luyện tập (CATE_QUIZ.orgList): CATE_UI.OlmEncode.xorDecodeBase64 — cùng thuật toán với olmXorDecodeBase64. */
            const xorFn = getOlmXorDecodeFn();
            if (xorFn) {
                try {
                    const r = xorFn(b64);
                    if (typeof r === 'string' && !isGarbageDecodedHtml(r) && (r.includes('<') || r.length > 20)) {
                        cachedOlmDecoder = xorFn;
                        return r;
                    }
                } catch (_) { /* ignore */ }
            }
            if (cachedOlmDecoder) {
                try {
                    const r = cachedOlmDecoder(b64);
                    if (typeof r === 'string' && !isGarbageDecodedHtml(r) && (r.includes('<') || r.length > 20)) return r;
                } catch (_) {
                    cachedOlmDecoder = null;
                }
            }
            const named = [
                'decodeQuestionContent', 'decodeHtmlContent', 'decodeContent', 'decodeQuizContent',
                'unpackQuestionContent', 'b64DecodeHtml', 'decodeBase64Content', 'decodeQuestionHtml'
            ];
            for (const name of named) {
                if (typeof uw[name] === 'function') {
                    try {
                        const r = uw[name](b64);
                        if (typeof r === 'string' && !isGarbageDecodedHtml(r) && (r.includes('<') || r.trim().startsWith('{'))) {
                            cachedOlmDecoder = uw[name];
                            return r;
                        }
                    } catch (_) { /* ignore */ }
                }
            }
            for (const k of Object.keys(uw)) {
                if (k.length > 80) continue;
                if (!/decode|unpack|decompress|parse.*content|question.*html/i.test(k)) continue;
                if (typeof uw[k] !== 'function') continue;
                try {
                    const r = uw[k](b64);
                    if (typeof r === 'string' && !isGarbageDecodedHtml(r) && (r.includes('<') || (r.trim().startsWith('{') && r.length < 500000))) {
                        cachedOlmDecoder = uw[k];
                        return r;
                    }
                } catch (_) { /* ignore */ }
            }
        } catch (_) { /* ignore */ }
        return null;
    }

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    /**
     * OLM: UTF-8 base64, gzip+base64, LZString, hoặc gói nhị phân (cần hàm trên trang).
     */
    async function decodeQuestionContent(raw) {
        if (raw == null) return '';
        let s = typeof raw === 'string' ? raw : String(raw);
        const trimmed = s.trim();
        if (!trimmed) return '';
        if (looksLikeHtml(trimmed)) return trimmed;

        const b64 = normalizeBase64(trimmed);
        if (!b64 || !/^[A-Za-z0-9+/=]+$/.test(b64)) return trimmed;

        const xorEarly = olmXorDecodeBase64(b64);
        if (xorEarly && !isGarbageDecodedHtml(xorEarly)
            && (xorEarly.includes('<') || xorEarly.trim().startsWith('{') || xorEarly.length > 30)) {
            return xorEarly;
        }

        let binaryString;
        let bytes;
        try {
            binaryString = atob(b64);
            bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        } catch (e) {
            return trimmed;
        }

        const tryRuntime = async () => {
            for (const delay of [0, 200, 600]) {
                if (delay) await sleep(delay);
                const r = tryDecodeViaOlmRuntime(b64);
                if (r && !isGarbageDecodedHtml(r)) return r;
            }
            return null;
        };

        if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b && typeof DecompressionStream !== 'undefined') {
            try {
                const blob = new Blob([bytes]);
                const ds = new DecompressionStream('gzip');
                const out = await new Response(blob.stream().pipeThrough(ds)).arrayBuffer();
                return new TextDecoder('utf-8').decode(out);
            } catch (e) {
                console.warn('[Hack olm] gzip:', e);
            }
        }

        const LZ = getLZ();
        if (LZ) {
            try {
                const lz = LZ.decompressFromBase64(b64) || LZ.decompressFromEncodedURIComponent(trimmed);
                if (lz && !isGarbageDecodedHtml(lz) && (looksLikeHtml(lz) || lz.length > 40)) return lz;
            } catch (_) { /* ignore */ }
        }

        let utf8 = '';
        try {
            utf8 = new TextDecoder('utf-8').decode(bytes);
        } catch (_) {
            utf8 = '';
        }
        const legacy = (() => {
            try {
                // Fix #3b: dùng TextDecoder thay escape() (deprecated)
                return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
            } catch (_) {
                return null;
            }
        })();

        const candidate = (!isGarbageDecodedHtml(utf8) && utf8) ? utf8 : (legacy && !isGarbageDecodedHtml(legacy) ? legacy : null);
        if (candidate && (looksLikeHtml(candidate) || (candidate.length < 5000 && !isOlmPackedPayload(bytes)))) {
            return candidate;
        }

        if (isOlmPackedPayload(bytes) || isGarbageDecodedHtml(utf8)) {
            const fromOlm = await tryRuntime();
            if (fromOlm) return fromOlm;
            return '';
        }

        if (candidate && !isGarbageDecodedHtml(candidate)) return candidate;
        const fallback = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        return isGarbageDecodedHtml(fallback) ? '' : fallback;
    }

    function escapeHtml(text) {
        if (text == null) return '';
        const d = document.createElement('div');
        d.textContent = String(text);
        return d.innerHTML;
    }

    function normText(s) {
        return String(s || '').replace(/\s+/g, ' ').trim();
    }

    /**
     * Chỉ giữ phần đề/thân câu: bỏ khối chọn đáp án (OLM thường không bọc hết trong ul.quiz-list).
     */
    function stripQuestionDisplayElements(root) {
        if (!root || !root.querySelectorAll) return;
        const rm = (sel) => {
            try {
                root.querySelectorAll(sel).forEach(el => {
                    try { el.remove(); } catch (_) { /* ignore */ }
                });
            } catch (_) { /* ignore */ }
        };
        rm('ol.quiz-list, ul.quiz-list, .quiz-list, .interaction, .form-group, .loigiai, .huong-dan-giai, .explain, .solution, #solution, .guide, .exp');
        rm('.quiz-option, .quiz-item, .quiz-answer, .q-option, .answer-option, .ds-dapan, .list-dapan, .list-group-item');
        rm('[class*="quiz-option"], [class*="quiz_item"], [class*="answer-list"], [class*="list-answer"]');
        rm('[class*="match"], [class*="ghep"], [class*="pair-list"], [class*="drag-drop"], [class*="olm-match"], .cau-ghep-noi, .match-quiz');
        try {
            root.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(inp => {
                const el = inp.closest('label') || inp.closest('li') || inp.closest('.form-check')
                    || inp.closest('[class*="option"]') || inp.parentElement;
                if (el && el !== root) {
                    try { el.remove(); } catch (_) { /* ignore */ }
                }
            });
        } catch (_) { /* ignore */ }
    }

    /** Truy vấn selector trong root và mọi shadowRoot (OLM/Vue có thể dùng shadow). */
    function querySelectorDeep(root, sel) {
        if (!root) return null;
        try {
            const direct = root.querySelector(sel);
            if (direct) return direct;
        } catch (_) { /* ignore */ }
        const all = root.querySelectorAll ? root.querySelectorAll('*') : [];
        for (let i = 0; i < all.length; i++) {
            const el = all[i];
            if (el.shadowRoot) {
                const hit = querySelectorDeep(el.shadowRoot, sel);
                if (hit) return hit;
            }
        }
        return null;
    }

    function querySelectorAllDeep(root, sel) {
        // Fix #4: scan '*' only to find shadowRoots — but only on elements
        // that actually might have shadowRoot (custom elements, not all of DOM)
        const out = [];
        if (!root || !root.querySelectorAll) return out;
        try {
            root.querySelectorAll(sel).forEach(el => out.push(el));
        } catch (_) { /* ignore */ }
        // Only scan custom elements for shadowRoot (tag with dash or known shadow hosts)
        try {
            root.querySelectorAll('*').forEach(el => {
                if (el.shadowRoot && el.tagName && (el.tagName.includes('-') || /^(DETAILS|SUMMARY)$/.test(el.tagName))) {
                    querySelectorAllDeep(el.shadowRoot, sel).forEach(x => out.push(x));
                }
            });
        } catch (_) { /* ignore */ }
        return out;
    }

    /** Bộ chọn đáp án trên giao diện OLM (có thể khác tên class theo thời điểm). */
    const ANSWER_DOM_SELECTORS = [
        '.correctAnswer', '.correct-answer',
        '[data-correct="true"]', '[data-correct="1"]', '[data-is-correct="true"]',
        '.is-correct', '.answer-correct', '.answer.true', '.answer--correct',
        '.quiz-answer.correct', '.item-correct', '.dap-an-dung', '.true-answer',
        '[class*="correctAnswer"]', '[class*="answer-correct"]',
        '[data-solution]', '[data-dap-an]',
        '.olm-correct', '.quiz-correct', '.item--correct',
        '.match-correct', '.pair-correct',
        'option[selected][data-correct]',
        '.drag-answer-correct', '[class*="dap-an-dung"]',
        // Drag-drop / fill-blank selectors
        '[data-answer]', '[data-blank-answer]',
        '.drag-result', '.drop-result', '.fill-result',
        '[class*="drag-correct"]', '[class*="drop-correct"]',
        '.answer-filled', '.blank-filled', '.slot-filled',
        '[class*="fill-correct"]', '[class*="blank-answer"]'
    ].join(', ');

    /**
     * OLM không public hàm giải mã lên window — sau khi trang render, đáp án nằm trong DOM.
     * ── FIX 3: Chỉ tìm theo id câu hỏi, KHÔNG dùng title text để tránh nhầm khi đề bị đảo.
     */
    function findQuestionBlockInPage(question) {
        try {
            const root = document.body;
            if (!root) return null;
            const qid = question.id != null ? String(question.id) : '';
            const oid = question._id != null ? String(question._id) : '';
            const idCandidates = [qid, oid].filter(Boolean);
            if (!idCandidates.length) return null; // không có id → không tìm để tránh nhầm

            const selectors = [];
            for (const id of idCandidates) {
                selectors.push(
                    `[data-id="${id}"]`,
                    `[data-idquestion="${id}"]`,
                    `[data-question-id="${id}"]`,
                    `[data-question="${id}"]`,
                    `[data-qid="${id}"]`,
                    `[data-questionid="${id}"]`,
                    `[data-id_question="${id}"]`,
                    `[data-question_id="${id}"]`,
                    `#question-${id}`,
                    `#cauhoi-${id}`,
                    `#q-${id}`,
                    `[id="q-${id}"]`,
                    `[name="question_${id}"]`
                );
            }
            for (const sel of selectors) {
                try {
                    const el = querySelectorDeep(document, sel);
                    if (el && !el.closest('#olm-answers-container')) return el;
                } catch (_) { /* ignore */ }
            }
            // Không tìm thấy theo id → trả null, KHÔNG fallback sang text search
            // vì đề đảo câu sẽ làm text search trả về câu sai
        } catch (_) { /* ignore */ }
        return null;
    }

    function buildAnswersListFromElements(answerEls) {
        if (!answerEls || !answerEls.length) return null;
        const listElement = document.createElement('ul');
        answerEls.forEach(ans => {
            const li = document.createElement('li');
            while (ans.firstChild) li.appendChild(ans.firstChild.cloneNode(true));
            listElement.appendChild(li);
        });
        return listElement;
    }

    function extractAnswersFromDomForQuestion(question) {
        const block = findQuestionBlockInPage(question);
        if (!block) return null;
        let els = querySelectorAllDeep(block, ANSWER_DOM_SELECTORS);
        if (!els.length) {
            try {
                els = Array.from(block.querySelectorAll(ANSWER_DOM_SELECTORS));
            } catch (_) {
                els = [];
            }
        }
        els = els.filter(el => !el.closest('#olm-answers-container'));
        if (els.length) return buildAnswersListFromElements(els);
        const fillIn = block.querySelector('input[data-accept]') || querySelectorDeep(block, 'input[data-accept]');
        const fillAll = block.querySelectorAll ? block.querySelectorAll('input[data-accept], textarea[data-accept]') : [];
        const listFromFill = document.createElement('ul');
        const fillEls = fillAll.length ? Array.from(fillAll) : (fillIn ? [fillIn] : []);
        fillEls.forEach(inp => {
            const raw = inp.getAttribute('data-accept') || '';
            raw.split('|').forEach(a => {
                const t = a.trim();
                if (!t) return;
                const li = document.createElement('li');
                li.textContent = t;
                listFromFill.appendChild(li);
            });
        });
        if (listFromFill.childNodes.length) return listFromFill;

        // ── Drag-drop: tìm slot/blank đã có giá trị hoặc data-answer ─────────
        const ddSelectors = [
            '[data-answer]', '[data-blank-answer]',
            'input[data-correct]', 'span[data-answer]',
            '.drag-result span', '.drop-result span',
            '.blank-filled', '.slot-filled'
        ];
        const ddList = document.createElement('ul');
        let ddIdx = 0;
        for (const sel of ddSelectors) {
            try {
                const els = Array.from(block.querySelectorAll(sel))
                    .filter(el => !el.closest('#olm-answers-container'));
                if (els.length) {
                    els.forEach(el => {
                        ddIdx++;
                        const ans = el.getAttribute('data-answer') || el.getAttribute('data-blank-answer')
                            || el.getAttribute('data-correct') || el.textContent.trim();
                        if (ans) {
                            const li = document.createElement('li');
                            li.textContent = `Chỗ ${ddIdx}: ${cleanMathText(ans)}`;
                            ddList.appendChild(li);
                        }
                    });
                    if (ddList.childNodes.length) return ddList;
                    break;
                }
            } catch (_) { /* ignore */ }
        }

        return null;
    }

    /** Một số bản API trả thêm trường đáp án tường minh (không nằm trong content base64). */
    function extractAnswersFromPlainApiFields(question) {
        if (!question || typeof question !== 'object') return null;
        const pick = (v) => {
            if (v == null) return null;
            if (typeof v === 'string' && v.trim()) return v.trim();
            if (typeof v === 'number' && !Number.isNaN(v)) return String(v);
            return null;
        };
        const direct = pick(question.answer) || pick(question.correct_answer) || pick(question.correctAnswer)
            || pick(question.da) || pick(question.dap_an) || pick(question.key) || pick(question.result)
            || pick(question.true_answer);
        if (direct) {
            const ul = document.createElement('ul');
            const li = document.createElement('li');
            setAnswerText(li, direct);
            ul.appendChild(li);
            return ul;
        }
        const arr = question.answers || question.options || question.list_answer || question.listAnswer;
        if (Array.isArray(arr)) {
            const texts = [];
            for (const item of arr) {
                if (item == null) continue;
                if (typeof item === 'object') {
                    if (item.correct === true || item.is_correct === true || item.isCorrect === true || item.dung === true) {
                        const t = pick(item.text) || pick(item.label) || pick(item.content) || pick(item.value) || pick(item.title);
                        if (t) texts.push(t);
                    }
                }
            }
            if (texts.length) {
                const ul = document.createElement('ul');
                texts.forEach(t => {
                    const li = document.createElement('li');
                    setAnswerText(li, t);
                    ul.appendChild(li);
                });
                return ul;
            }
        }
        return null;
    }

    /**
     * Chỉ lấy phần đề: các khối paragraph/heading trước olm-list đầu tiên (trắc nghiệm, ghép, nhóm…).
     * Tránh cột "câu hỏi" trùng hết phần ghép nối / phương án.
     */
    function extractStemTextFromLexical(jsonData) {
        try {
            const root = jsonData && (jsonData.root != null ? jsonData.root : jsonData);
            if (!root || !Array.isArray(root.children)) return '';
            const parts = [];
            for (const child of root.children) {
                if (!child) continue;
                if (child.type === 'olm-list') break;
                if (child.type === 'paragraph' || child.type === 'heading') {
                    const t = normText(lexicalPlainText(child));
                    if (t) parts.push(t);
                }
            }
            return parts.length ? parts.join('\n') : '';
        } catch (_) {
            return '';
        }
    }

    function htmlLooksLikeHasMath(html) {
        if (!html || typeof html !== 'string') return false;
        return /katex|mathjax|data-math|\\frac|\\sum|class=\"math/i.test(html);
    }

    /** Gắn style cho danh sách đáp án (tách biệt với khối đề). */
    function applyAnswerListPanelStyles(ul) {
        if (!ul || ul.tagName !== 'UL') return;
        ul.classList.add('olm-hack-answer-ul');
        ul.style.cssText = 'list-style:none;margin:0;padding:0;';
        try {
            ul.querySelectorAll(':scope > li').forEach(li => {
                li.style.cssText = 'border-left:2px solid #bf5fff;padding:4px 8px;margin:4px 0;background:rgba(191,95,255,0.08);border-radius:0;color:#bf5fff;';
            });
        } catch (_) { /* ignore */ }
    }

    function decorateAnswerPanel(contentContainer, answersElement) {
        if (!contentContainer || !answersElement) return;
        contentContainer.innerHTML = '';
        contentContainer.dataset.type = 'answer';
        contentContainer.style.cssText = 'font-weight: 500; color: #bf5fff; padding: 4px 0 0 8px; border-top: 1px solid rgba(57,255,20,0.2); margin-top: 4px;';
        const ansText = answersElement.textContent || '';
        if (ansText.includes('↔')) {
            const cap = document.createElement('div');
            cap.textContent = '🔗 Đáp án (cặp ghép)';
            cap.style.cssText = 'font-size:10px;font-weight:700;color:#bf5fff;margin-bottom:4px;';
            contentContainer.appendChild(cap);
        } else if (ansText.includes('Cấu trúc nhóm')) {
            const cap = document.createElement('div');
            cap.textContent = '📦 Gợi ý phân nhóm (không có đáp án chuẩn trong API)';
            cap.style.cssText = 'font-size:10px;font-weight:700;color:#ffcc00;margin-bottom:4px;';
            contentContainer.appendChild(cap);
        }
        contentContainer.appendChild(answersElement);
        applyAnswerListPanelStyles(answersElement);
    }

    /** Lexical / OLM: gom toàn bộ chữ trong cây (extended-text, paragraph, olm-list-item, …). */
    function lexicalPlainText(node) {
        if (node == null) return '';
        if (typeof node === 'string') return node;
        if (typeof node === 'number') return String(node);
        if (Array.isArray(node)) return node.map(lexicalPlainText).join('');
        if (typeof node !== 'object') return '';
        let s = '';
        if (typeof node.text === 'string') s += node.text;
        if (Array.isArray(node.children)) s += node.children.map(lexicalPlainText).join('');
        return s;
    }

    /** ── FIX 1: Câu đúng/sai ──────────────────────────────────────────────────
     * Duyệt cây JSON tìm các node kiểu true-false hoặc olm-list-item có trường
     * isTrue / answer / correct kiểu boolean + text mô tả.
     */
    function extractTrueFalseAnswers(root) {
        const results = [];
        const seen = new Set();

        function walk(node, depth) {
            if (!node || typeof node !== 'object' || depth > 30) return;
            if (Array.isArray(node)) {
                node.forEach(n => walk(n, depth + 1));
                return;
            }
            // Nhận dạng node đúng/sai: có trường isTrue hoặc answer kiểu boolean
            // kèm text mô tả nội dung
            const hasIsTrue = typeof node.isTrue === 'boolean';
            const hasAnswerBool = typeof node.answer === 'boolean';
            const hasCorrectBool = typeof node.correct === 'boolean' &&
                // phân biệt với phương án trắc nghiệm: node đúng/sai có thêm 'statement' hoặc nằm trong list kiểu 'true-false'
                (node.statement != null || node.type === 'true-false-item' || node.type === 'olm-true-false-item');

            if (hasIsTrue || hasAnswerBool || hasCorrectBool) {
                const correctVal = hasIsTrue ? node.isTrue : hasAnswerBool ? node.answer : node.correct;
                const text = normText(
                    node.statement || node.text || node.label || node.content ||
                    lexicalPlainText(node.children ? { children: node.children } : node)
                );
                if (text && !seen.has(text)) {
                    seen.add(text);
                    results.push({ text, correct: correctVal });
                }
            }
            // Danh sách statements dạng array: [{statement, isTrue}, ...]
            if (Array.isArray(node.statements)) {
                node.statements.forEach(s => {
                    if (!s || typeof s !== 'object') return;
                    const text = normText(s.statement || s.text || s.label || '');
                    const correctVal = typeof s.isTrue === 'boolean' ? s.isTrue
                        : typeof s.correct === 'boolean' ? s.correct
                        : typeof s.answer === 'boolean' ? s.answer : null;
                    if (text && correctVal !== null && !seen.has(text)) {
                        seen.add(text);
                        results.push({ text, correct: correctVal });
                    }
                });
            }
            // Tiếp tục duyệt children
            if (Array.isArray(node.children)) node.children.forEach(c => walk(c, depth + 1));
            // Duyệt các key khác (tránh vòng lặp)
            for (const k of Object.keys(node)) {
                if (k === 'children' || k === 'parent' || k === 'statements' || k === '__ob__') continue;
                const v = node[k];
                if (v && typeof v === 'object') walk(v, depth + 1);
            }
        }

        walk(root, 0);
        return results;
    }

    /**
     * Đọc đáp án drag-drop từ Vue reactive state của element trên trang.
     * OLM dùng Vue 3 — đáp án nằm trong component instance, không phải DOM attribute.
     */
    function extractDragDropFromVue(question) {
        try {
            const qid = question.id != null ? String(question.id) : '';
            if (!qid) return [];
            // Tìm element câu hỏi trên trang
            const block = findQuestionBlockInPage(question);
            if (!block) return [];

            // Duyệt element và con tìm Vue instance
            const findVue = (el, depth = 0) => {
                if (!el || depth > 8) return null;
                // Vue 3
                const vk = Object.keys(el).find(k => k.startsWith('__vueParentComponent') || k === '__vue_app__' || k.startsWith('__vue__'));
                if (vk) return el[vk];
                for (const child of (el.children || [])) {
                    const found = findVue(child, depth + 1);
                    if (found) return found;
                }
                return null;
            };

            const vueInst = findVue(block);
            if (!vueInst) return [];

            // Duyệt props/data của Vue component tìm đáp án
            const results = [];
            const seen = new Set();
            const checkObj = (obj, depth = 0) => {
                if (!obj || typeof obj !== 'object' || depth > 6) return;
                // Tìm mảng answers/blanks/slots
                for (const key of Object.keys(obj)) {
                    const v = obj[key];
                    if (/answer|correct|blank|slot|result/i.test(key)) {
                        if (typeof v === 'string' && v.trim() && !seen.has(v)) {
                            seen.add(v);
                            results.push({ slot: results.length + 1, answer: cleanMathText(v.trim()) });
                        } else if (Array.isArray(v)) {
                            v.forEach((item, i) => {
                                const t = typeof item === 'string' ? item
                                    : (item && (item.answer || item.text || item.value || item.content));
                                if (t && typeof t === 'string' && t.trim() && !seen.has(t)) {
                                    seen.add(t);
                                    results.push({ slot: i + 1, answer: cleanMathText(t.trim()) });
                                }
                            });
                        }
                    }
                    if (v && typeof v === 'object' && !Array.isArray(v)) checkObj(v, depth + 1);
                }
            };

            // Thử props, setupState, data
            const inst = vueInst.exposed || vueInst.setupState || vueInst.props || vueInst.data;
            if (inst) checkObj(inst);
            return results;
        } catch (_) { return []; }
    }

    /**
     * ── Câu kéo thả / điền vào chỗ trống (drag-drop / fill-blank) ──────────────
     * OLM lưu dạng:
     *   - node type "olm-fill-blank" hoặc "fill-blank" có children là các slot
     *   - mỗi slot có: { type: "blank", answer/accepts/correctAnswer: "Trần Quốc Tuấn" }
     *   - hoặc dạng mảng blanks: [{ id, answer }, ...]
     *   - hoặc node type "drag-item" / "drop-zone" với trường "answer"
     *
     * Kết quả trả về: mảng { slot: số thứ tự, answer: chuỗi đáp án }
     */
    function extractDragDropAnswers(root) {
        const results = [];
        const seen = new Set();
        // Fix #5: dùng counter object chia sẻ thay vì truyền slotIdx qua tham số
        // để tránh slot đánh số sai khi children có index không liên tục
        const slotCounter = { n: 0 };

        function pushAnswer(text) {
            const t = cleanMathText(normText(String(text || '')));
            if (!t) return;
            slotCounter.n++;
            const key = `${slotCounter.n}:${t}`;
            if (seen.has(key)) return;
            seen.add(key);
            results.push({ slot: slotCounter.n, answer: t });
        }

        function walk(node, depth) {
            if (!node || typeof node !== 'object' || depth > 35) return;
            if (Array.isArray(node)) {
                node.forEach(n => walk(n, depth + 1));
                return;
            }

            const t = node.type || '';

            // Dạng 0: short-answer / math-input / fill-answer (câu điền đáp số toán)
            if (/math.?input|short.?answer|math.?answer|fill.?answer|olm.?input|input.?answer|answer.?box/i.test(t)) {
                const ans = node.correctAnswer || node.correct_answer || node.answer
                    || node.accepts || node.value;
                if (ans != null) {
                    if (Array.isArray(ans)) ans.forEach(a => pushAnswer(a));
                    else pushAnswer(ans);
                    return;
                }
            }

            // Dạng 1: node là blank/slot trực tiếp
            if (/blank|slot|drop.?zone|fill/i.test(t)) {
                const ans = node.answer || node.accepts || node.correctAnswer
                    || node.correct_answer || node.value || node.text;
                if (ans != null) {
                    if (Array.isArray(ans)) ans.forEach(a => pushAnswer(a));
                    else pushAnswer(ans);
                    return; // đã lấy, không cần duyệt sâu hơn
                }
            }

            // Dạng 2: node type drag-item có answer/text
            if (/drag.?item|drag.?answer|answer.?item/i.test(t)) {
                const ans = node.answer || node.text || node.label || node.content;
                if (ans) { pushAnswer(ans); return; }
            }

            // Dạng 3: mảng "blanks" hoặc "answers" hoặc "slots" trong node
            for (const key of ['blanks', 'answers', 'slots', 'items', 'correctAnswers', 'correct_answers']) {
                if (Array.isArray(node[key])) {
                    node[key].forEach(item => {
                        if (!item) return;
                        const ans = typeof item === 'string' ? item
                            : item.answer || item.text || item.label || item.value || item.content;
                        if (ans) pushAnswer(ans);
                    });
                    if (results.length) return;
                }
            }

            // Dạng 4: paragraph có inline blank/math-input nodes
            if (Array.isArray(node.children)) {
                let blankCount = 0;
                node.children.forEach(child => {
                    if (!child) return;
                    const ct = child.type || '';
                    const isFillNode = /blank|slot|fill|math.?input|short.?answer|math.?answer|fill.?answer|olm.?input|input.?answer|answer.?box/i.test(ct);
                    if (isFillNode) {
                        blankCount++;
                        const ans = child.correctAnswer || child.correct_answer
                            || child.answer || child.accepts || child.value;
                        if (ans != null) {
                            if (Array.isArray(ans)) ans.forEach(a => pushAnswer(a));
                            else pushAnswer(ans);
                        }
                    }
                });
                if (blankCount > 0) return; // đã xử lý inline blanks, dừng
                // Tiếp tục duyệt children bình thường
                node.children.forEach(c => walk(c, depth + 1));
                return;
            }

            // Duyệt các key còn lại
            for (const k of Object.keys(node)) {
                if (k === 'parent' || k === '__ob__' || k === 'children') continue;
                const v = node[k];
                if (v && typeof v === 'object') walk(v, depth + 1);
            }
        }

        walk(root, 0);
        return results;
    }

    /**
     * Từ HTML đã giải mã: tìm input[data-answer] hoặc span.blank có data-answer
     * — đây là fallback khi JSON không có trường đáp án drag-drop
     */
    function extractDragDropFromHtml(html) {
        if (!html || isGarbageDecodedHtml(html)) return [];
        const div = document.createElement('div');
        div.innerHTML = html;
        const results = [];
        let idx = 0;

        // Dạng input với data-answer hoặc value
        div.querySelectorAll('input[data-answer], input[data-correct], span[data-answer], [data-blank-answer]')
            .forEach(el => {
                idx++;
                const ans = el.getAttribute('data-answer') || el.getAttribute('data-correct')
                    || el.getAttribute('data-blank-answer') || el.value || '';
                if (ans.trim()) results.push({ slot: idx, answer: cleanMathText(ans.trim()) });
            });

        // Dạng select với option[selected][data-correct]
        div.querySelectorAll('select').forEach(sel => {
            idx++;
            const correct = sel.querySelector('option[data-correct="true"], option[data-correct="1"]');
            if (correct) results.push({ slot: idx, answer: cleanMathText(correct.textContent.trim()) });
        });

        return results;
    }
    function collectCorrectTextsFromJsonTree(node, out, textSeen, visited) {
        if (node == null || out.length > 50) return;
        if (typeof node === 'object' && node !== null) {
            if (visited.has(node)) return;
            visited.add(node);
        }
        if (typeof node === 'string' || typeof node === 'number') return;
        if (Array.isArray(node)) {
            node.forEach(ch => collectCorrectTextsFromJsonTree(ch, out, textSeen, visited));
            return;
        }
        if (typeof node !== 'object') return;
        const markCorrect = node.correct === true || node.isCorrect === true || node.is_correct === true
            || node.dung === true || node.type === 'correct';
        if (markCorrect) {
            const parts = [node.text, node.label, node.content, node.value, node.title, node.html]
                .filter(v => v != null && String(v).trim())
                .map(v => String(v).trim());
            let s = parts.join(' ').trim();
            if (!s && (node.type === 'olm-list-item' || node.type === 'olu-list-item' || !parts.length)) {
                s = normText(lexicalPlainText(node));
            }
            if (s && !textSeen.has(s)) { textSeen.add(s); out.push(s); }
        }
        // Nhận dạng correctAnswer string (câu điền đáp số, math-input)
        if (!markCorrect && node.correctAnswer != null) {
            const ans = node.correctAnswer;
            const vals = Array.isArray(ans) ? ans : [ans];
            vals.forEach(v => {
                const s = normText(String(v || ''));
                if (s && s !== '.' && s.length > 0 && !textSeen.has(s)) {
                    textSeen.add(s);
                    out.push(s);
                }
            });
        }
        if (Array.isArray(node.options)) {
            node.options.forEach(opt => {
                if (opt && (opt.correct === true || opt.isCorrect === true)) {
                    collectCorrectTextsFromJsonTree(opt, out, textSeen, visited);
                }
            });
        }
        for (const k of Object.keys(node)) {
            if (k === 'parent' || k === '__ob__') continue;
            const ch = node[k];
            if (ch && typeof ch === 'object') collectCorrectTextsFromJsonTree(ch, out, textSeen, visited);
        }
    }

    /**
     * Chỉ ghép nối / thứ tự: KHÔNG quét key "text"/"label" (mỗi phương án trắc nghiệm đều có — sẽ thành “đáp án” giả).
     */
    function collectAnswersFromJsonLoose(node, out, textSeen, depth) {
        if (node == null || depth > 28 || out.length > 100) return;
        if (typeof node === 'string' || typeof node === 'number') return;
        if (Array.isArray(node)) {
            node.forEach(item => {
                if (item && typeof item === 'object') {
                    const L = item.left != null ? String(item.left).trim() : '';
                    const R = item.right != null ? String(item.right).trim() : '';
                    if (L && R) {
                        const line = L + ' ↔ ' + R;
                        if (!textSeen.has(line)) {
                            textSeen.add(line);
                            out.push(line);
                        }
                    }
                    const a = item.a != null ? String(item.a).trim() : '';
                    const b = item.b != null ? String(item.b).trim() : '';
                    if (a && b && !item.left) {
                        const line = a + ' ↔ ' + b;
                        if (!textSeen.has(line)) {
                            textSeen.add(line);
                            out.push(line);
                        }
                    }
                }
                collectAnswersFromJsonLoose(item, out, textSeen, depth + 1);
            });
            return;
        }
        if (typeof node !== 'object') return;
        for (const k of Object.keys(node)) {
            if (k === 'parent' || k === '__ob__') continue;
            const v = node[k];
            if (Array.isArray(v) && /^(correctorder|rightorder|order|keys)$/i.test(k)) {
                v.forEach((x, i) => {
                    const s = x != null ? String(x).trim() : '';
                    if (s && !textSeen.has(s)) {
                        textSeen.add(s);
                        out.push((i + 1) + '. ' + s);
                    }
                });
            }
            if (v && typeof v === 'object') collectAnswersFromJsonLoose(v, out, textSeen, depth + 1);
        }
    }

    /** group-list: group-title + position-column (pairID) — API thường không có correct. */
    function collectLexicalGroupListStructure(node, out, textSeen, depth, visited) {
        if (depth > 28 || out.length > 25) return;
        if (!node || typeof node !== 'object') return;
        if (!visited) visited = new WeakSet();
        if (visited.has(node)) return;
        visited.add(node);
        if (node.type === 'olm-list' && node.name === 'group-list' && Array.isArray(node.children)) {
            const lines = [];
            for (const item of node.children) {
                if (!item || item.type !== 'olm-list-item') continue;
                const children = item.children || [];
                let title = '';
                const pieces = [];
                for (const c of children) {
                    if (c.type === 'group-title' && typeof c.text === 'string') title = normText(c.text);
                    else if (c.type === 'position-column' && c.position === 'group') {
                        const t = normText(lexicalPlainText(c));
                        if (t) pieces.push(t);
                    }
                }
                if (title || pieces.length) {
                    const line = title ? `${cleanMathText(title)} — ${pieces.map(cleanMathText).join(', ')}` : pieces.map(cleanMathText).join(', ');
                    const norm = normText(line);
                    if (norm) lines.push(norm);
                }
            }
            if (lines.length) {
                const block = '[Cấu trúc nhóm — OLM không gửi đáp án đúng trong JSON]\n' + lines.join('\n');
                if (!textSeen.has(block)) {
                    textSeen.add(block);
                    out.push(block);
                }
            }
        }
        if (Array.isArray(node.children)) node.children.forEach(ch => collectLexicalGroupListStructure(ch, out, textSeen, depth + 1, visited));
        for (const k of Object.keys(node)) {
            if (k === 'children' || k === 'parent') continue;
            const v = node[k];
            if (v && typeof v === 'object') collectLexicalGroupListStructure(v, out, textSeen, depth + 1, visited);
        }
    }

    /** Một số câu ghép: một olm-list-item chỉ có một cặp A||B. */
    function collectLexicalPipePairRows(node, out, textSeen, depth) {
        if (depth > 28 || out.length > 40) return;
        if (!node || typeof node !== 'object') return;
        if (node.type === 'olm-list-item') {
            const raw = normText(lexicalPlainText(node));
            if (raw && /\|\|/.test(raw) && raw.indexOf('↔') === -1) {
                const segs = raw.split('||').map(x => normText(x)).filter(Boolean);
                if (segs.length === 2) {
                    const line = segs[0] + ' ↔ ' + segs[1];
                    if (!textSeen.has(line)) {
                        textSeen.add(line);
                        out.push(line);
                    }
                }
            }
        }
        if (Array.isArray(node.children)) node.children.forEach(ch => collectLexicalPipePairRows(ch, out, textSeen, depth + 1));
        for (const k of Object.keys(node)) {
            if (k === 'children' || k === 'parent') continue;
            const v = node[k];
            if (v && typeof v === 'object') collectLexicalPipePairRows(v, out, textSeen, depth + 1);
        }
    }

    /**
     * Bỏ kết quả giả: trùng đề dài, hoặc 4+ dòng giống hệt 4 phương án trắc nghiệm.
     */
    function sanitizeAnswerStrings(collected, question) {
        if (!collected || !collected.length) return [];
        const title = normText(question && question.title || '');
        const out = [];
        for (const s of collected) {
            const t = normText(String(s));
            if (!t || t.length > 1500) continue;
            // Lọc các chuỗi vô nghĩa: chỉ dấu câu, khoảng trắng, hoặc quá ngắn không có chữ/số
            if (/^[.\s,;:!?·\-–—]+$/.test(t)) continue;
            if (t.length === 1 && !/[\w\dÀ-ỹ]/.test(t)) continue;
            if (title.length > 20 && t.length >= title.length * 0.75 && (t.indexOf(title) === 0 || t.includes(title))) continue;
            out.push(t);
        }
        if (out.length === 4 && out.every(x => !x.includes('↔'))) {
            const lens = out.map(x => x.length);
            const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
            if (avg > 25 && avg < 400 && lens.every(x => Math.abs(x - avg) < avg * 0.65)) return [];
        }
        return out;
    }

    /** Đáp án trong HTML: nhiều ô điền, data-answer, v.v. */
    function extractStructuredAnswersFromHtml(root) {
        if (!root || !root.querySelectorAll) return [];
        const parts = [];
        const seen = new Set();
        const push = (s) => {
            const t = normText(s);
            if (t && !seen.has(t)) {
                seen.add(t);
                parts.push(t);
            }
        };
        try {
            root.querySelectorAll('input[data-accept], textarea[data-accept]').forEach(inp => {
                const raw = inp.getAttribute('data-accept') || '';
                raw.split('|').forEach(a => push(a));
            });
        } catch (_) { /* ignore */ }
        try {
            root.querySelectorAll('[data-solution], [data-dap-an]').forEach(el => {
                const t = el.textContent || el.getAttribute('data-solution') || el.getAttribute('data-dap-an');
                if (t) push(t);
            });
        } catch (_) { /* ignore */ }
        return parts;
    }

    /** json_content có thể là JSON thuần hoặc cùng kiểu gói nhị phân (cần giải qua runtime). */
    function tryParseQuestionJsonTree(question) {
        const raw = question.json_content;
        if (raw == null) return null;
        if (typeof raw === 'object') return raw;
        const str = String(raw).trim();
        if (str.startsWith('{')) {
            try {
                return JSON.parse(str);
            } catch (_) { /* ignore */ }
        }
        const b64 = normalizeBase64(str);
        if (b64 && /^[A-Za-z0-9+/=]+$/.test(b64)) {
            const decoded = tryDecodeViaOlmRuntime(b64);
            if (decoded && decoded.trim().startsWith('{')) {
                try {
                    return JSON.parse(decoded);
                } catch (_) { /* ignore */ }
            }
        }
        return null;
    }

    /** Dùng trong getAnswersAsDOM khi đã có chuỗi HTML giải mã */
    function decodeBase64Utf8(base64) {
        const sync = (b64) => {
            try {
                const binaryString = atob(b64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) return null;
                return new TextDecoder('utf-8').decode(bytes);
            } catch (e) {
                return null;
            }
        };
        const b64 = normalizeBase64(base64 || '');
        if (!b64) return '';
        const xrLocal = olmXorDecodeBase64(b64);
        if (typeof xrLocal === 'string' && !isGarbageDecodedHtml(xrLocal) && (xrLocal.includes('<') || xrLocal.trim().startsWith('{') || xrLocal.length > 30)) {
            return xrLocal;
        }
        const xorFn = getOlmXorDecodeFn();
        if (xorFn) {
            try {
                const xr = xorFn(b64);
                if (typeof xr === 'string' && !isGarbageDecodedHtml(xr) && (xr.includes('<') || xr.length > 30)) return xr;
            } catch (_) { /* ignore */ }
        }
        const LZ = getLZ();
        if (LZ) {
            try {
                const lz = LZ.decompressFromBase64(b64);
                if (lz) return lz;
            } catch (_) { /* ignore */ }
        }
        let out = sync(b64);
        if (out != null) {
            const badRatio = (out.match(/\uFFFD/g) || []).length / Math.max(out.length, 1);
            if (badRatio < 0.02) return out;
        }
        try {
            const binaryString = atob(b64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
            return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        } catch (e) {
            console.error('Lỗi giải mã Base64:', e);
            return '';
        }
    }

    // FEATURE: Copy answer to clipboard
    function copyToClipboard(text) {
        if (!text) return;
        const clean = text.replace(/\[slot\.\d+\]/g, '').trim();
        navigator.clipboard.writeText(clean).then(() => {
            console.log('[OLM] Copied to clipboard');
        }).catch(err => {
            console.error('[OLM] Copy failed:', err);
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = clean;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        });
    }

    // FEATURE: Search/Filter answers by keyword
    function filterAnswers(keyword) {
        const blocks = document.querySelectorAll('.qa-block');
        if (!keyword || keyword.trim() === '') {
            blocks.forEach(b => b.style.display = '');
            return;
        }
        const k = keyword.toLowerCase();
        let count = 0;
        blocks.forEach(block => {
            const question = block.querySelector('.question-content')?.textContent || '';
            const answer = block.querySelector('.content-container')?.textContent || '';
            const match = question.toLowerCase().includes(k) || answer.toLowerCase().includes(k);
            block.style.display = match ? '' : 'none';
            if (match) count++;
        });
        console.log(`[OLM Filter] Found ${count} matching questions`);
    }

    class AnswerDisplay {
        constructor() {
            this.isVisible = true;
            this.dragState = { isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0 };
            this.onMouseDown = this.onMouseDown.bind(this);
            this.onMouseMove = this.onMouseMove.bind(this);
            this.onMouseUp = this.onMouseUp.bind(this);
            this.onKeyDown = this.onKeyDown.bind(this);
            this.exportToTxt = this.exportToTxt.bind(this);
        }

        init() {
            const doInit = () => {
                this.injectCSS();
                this.createUI();
                this.addEventListeners();
            };
            if (document.body) doInit();
            else document.addEventListener('DOMContentLoaded', doInit, { once: true });
        }

        injectCSS() {
            // Fix #7: z-index stacking context on header + Terminal/Hacker theme
            const styles = `
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');

                #olm-answers-container {
                    position: fixed; top: 12px; right: 12px; width: 420px; max-height: 88vh;
                    border-radius: 4px; z-index: 2147483647;
                    display: flex; flex-direction: column;
                    font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
                    font-size: 12px; resize: both; overflow: hidden;
                    background: #0d0a12;
                    border: 1px solid #bf5fff;
                    box-shadow: 0 0 24px rgba(191,95,255,0.3), 0 0 4px rgba(191,95,255,0.6), inset 0 0 60px rgba(0,0,0,0.95);
                    transition: opacity 0.2s, transform 0.2s;
                    color: #e8c8ff;
                    /* Fix #7: force stacking context so header/container is above page overlays */
                    isolation: isolate;
                    will-change: transform;
                }
                #olm-answers-container.hidden {
                    opacity: 0; transform: scale(0.95) translateY(-6px); pointer-events: none;
                }

                /* Fix #7b: header always above content */
                .olm-answers-header {
                    position: relative;
                    z-index: 1;
                    padding: 10px 14px 8px;
                    background: #09060f;
                    border-bottom: 1px solid #bf5fff;
                    cursor: move; user-select: none;
                    display: flex; flex-direction: column; align-items: flex-start; gap: 1px;
                }
                .olm-answers-header::before {
                    content: '> TOOL_OLM_EZ v5.2 [PURPLE HACKER EDITION]';
                    display: block;
                    font-size: 10px;
                    color: #bf5fff;
                    letter-spacing: 0.5px;
                    margin-bottom: 2px;
                    opacity: 0.7;
                }
                .olm-header-title {
                    font-size: 13px; font-weight: 700; letter-spacing: 1px;
                    color: #bf5fff;
                    text-shadow: 0 0 10px rgba(191,95,255,0.7), 0 0 20px rgba(191,95,255,0.4);
                }
                .olm-header-sub {
                    font-size: 10px; color: rgba(200,255,200,0.5); font-weight: 400;
                }
                .olm-header-hint {
                    font-size: 9px; color: rgba(57,255,20,0.35); margin-top: 1px;
                }

                /* Content area */
                #olm-answers-content {
                    padding: 8px; margin: 0; flex-grow: 1; overflow-y: auto;
                    background: #0d0a12;
                    scrollbar-width: thin;
                    scrollbar-color: #bf5fff #110a1a;
                }
                #olm-answers-content::-webkit-scrollbar { width: 5px; }
                #olm-answers-content::-webkit-scrollbar-track { background: #110a1a; }
                #olm-answers-content::-webkit-scrollbar-thumb { background: #bf5fff; border-radius: 0; }
                #olm-answers-content::-webkit-scrollbar-thumb:hover { background: #d480ff; }

                /* Question block */
                .qa-block {
                    padding: 8px 10px;
                    border-left: 2px solid #bf5fff;
                    margin-bottom: 8px;
                    background: rgba(191,95,255,0.04);
                    border-radius: 0;
                    border-top: 1px solid rgba(191,95,255,0.12);
                }
                .qa-block .question-content {
                    font-weight: 500; color: #c89aff; margin-bottom: 4px; font-size: 11px;
                    line-height: 1.4;
                }

                /* Answer items */
                .olm-hack-answer-ul {
                    list-style: none !important; margin: 0 !important; padding: 0 !important;
                }
                .olm-hack-answer-ul li {
                    border-left: 2px solid #bf5fff !important;
                    padding: 4px 8px !important; margin: 4px 0 !important;
                    background: rgba(191,95,255,0.08) !important;
                    border-radius: 0 !important;
                    color: #bf5fff !important; font-size: 11px !important;
                    font-family: inherit !important;
                }
                .olm-hack-answer-ul li:hover { background: rgba(191,95,255,0.16) !important; }

                /* Timestamp */
                #olm-answers-content p[style*="monospace"] {
                    background: rgba(191,95,255,0.05) !important;
                    color: rgba(191,95,255,0.7) !important;
                    border-radius: 0 !important; font-size: 10px !important;
                }

                /* Footer */
                #olm-answers-footer {
                    padding: 6px 10px;
                    background: #09060f;
                    border-top: 1px solid rgba(191,95,255,0.3);
                    display: flex; align-items: center; flex-wrap: wrap; gap: 4px;
                }
                #export-btn {
                    padding: 5px 12px;
                    background: #bf5fff;
                    border: none;
                    color: #000; border-radius: 0; cursor: pointer;
                    font-weight: 700; font-size: 11px;
                    font-family: inherit;
                    letter-spacing: 0.5px;
                    transition: background 0.15s, box-shadow 0.15s;
                    box-shadow: 0 0 8px rgba(191,95,255,0.5);
                }
                #export-btn:hover {
                    background: #d480ff;
                    box-shadow: 0 0 16px rgba(191,95,255,0.8);
                }
                .olm-batch { margin-bottom: 10px; }
                .olm-batch-header-row {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 3px 6px; margin-bottom: 5px;
                    background: rgba(191,95,255,0.07);
                    border-radius: 0;
                    font-size: 10px; color: rgba(191,95,255,0.8);
                    border-left: 2px solid rgba(191,95,255,0.4);
                }
            `;
            const styleSheet = document.createElement('style');
            styleSheet.innerText = styles;
            (document.head || document.documentElement).appendChild(styleSheet);
        }

        createUI() {
            this.container = document.createElement('div');
            this.container.id = 'olm-answers-container';
            this.header = document.createElement('div');
            this.header.className = 'olm-answers-header';
            this.header.innerHTML = `
                <div class="olm-header-title">// TOOL_OLM_EZ</div>
                <div class="olm-header-sub">author: Quan Ngọc Thành</div>
                <div class="olm-header-hint">[ShiftRight] toggle panel</div>
            `;
            this.contentArea = document.createElement('div');
            this.contentArea.id = 'olm-answers-content';
            const footer = document.createElement('div');
            footer.id = 'olm-answers-footer';
            const exportButton = document.createElement('button');
            exportButton.id = 'export-btn';
            exportButton.textContent = 'Xuất TXT';
            const settingsBtn = document.createElement('button');
            settingsBtn.id = 'settings-btn';
            settingsBtn.textContent = '⚙️ Settings';
            settingsBtn.style.cssText = 'padding:6px 14px;background:linear-gradient(90deg, #bf5fff, #a855f7);border:1px solid rgba(191,95,255,0.4);color:#fff;border-radius:8px;cursor:pointer;font-weight:600;font-size:12px;transition:background 0.2s, transform 0.1s, box-shadow 0.2s;box-shadow: 0 2px 8px rgba(191,95,255,0.3);margin-left:6px;';
            settingsBtn.onmouseover = () => { settingsBtn.style.background = 'linear-gradient(90deg, #a855f7, #9333ea)'; settingsBtn.style.boxShadow = '0 4px 14px rgba(191,95,255,0.5)'; };
            settingsBtn.onmouseout = () => { settingsBtn.style.background = 'linear-gradient(90deg, #bf5fff, #a855f7)'; settingsBtn.style.boxShadow = '0 2px 8px rgba(191,95,255,0.3)'; };
            settingsBtn.onclick = openSettings;
            const clearBtn = document.createElement('button');
            clearBtn.id = 'clear-btn';
            clearBtn.textContent = 'Xóa tất cả';
            clearBtn.style.cssText = 'padding:5px 10px;background:transparent;border:1px solid #ff4444;color:#ff6666;border-radius:0;cursor:pointer;font-weight:700;font-size:10px;margin-left:4px;font-family:inherit;letter-spacing:0.5px;';
            clearBtn.onclick = () => {
                this.contentArea.innerHTML = '';
                seenQuestionIds.clear();
                globalQuestionCounter = 0;
                // BUG FIX: Xóa cache khi xóa tất cả để tránh dữ liệu lỗi thời
                Cache.clear();
            };
            const cacheBtn = document.createElement('button');
            cacheBtn.textContent = '🗑 Cache';
            cacheBtn.title = 'Xóa cache đáp án đã lưu';
            cacheBtn.style.cssText = 'padding:5px 10px;background:transparent;border:1px solid rgba(57,255,20,0.3);color:rgba(191,95,255,0.6);border-radius:0;cursor:pointer;font-size:10px;margin-left:4px;font-family:inherit;';
            cacheBtn.onclick = () => { Cache.clear(); cacheBtn.textContent = '✓ Đã xóa'; setTimeout(() => { cacheBtn.textContent = '🗑 Cache'; }, 1500); };
            // Night Mode button
            const nightModeBtn = document.createElement('button');
            nightModeBtn.id = 'night-mode-btn';
            nightModeBtn.textContent = NIGHT_MODE ? '☀ Light' : '🌙 Night';
            nightModeBtn.title = 'Toggle night mode (siêu tối)';
            nightModeBtn.style.cssText = 'padding:5px 10px;background:' + (NIGHT_MODE ? 'rgba(191,95,255,0.2)' : 'transparent') + ';border:1px solid rgba(191,95,255,0.4);color:rgba(191,95,255,0.8);border-radius:0;cursor:pointer;font-size:10px;margin-left:4px;font-family:inherit;transition:all 0.2s;';
            nightModeBtn.onclick = toggleNightMode;
            
            // Search filter
            const searchBtn = document.createElement('button');
            searchBtn.id = 'search-filter-btn';
            searchBtn.textContent = '🔍 Filter';
            searchBtn.title = 'Tìm kiếm câu (Ctrl+F)';
            searchBtn.style.cssText = 'padding:5px 10px;background:transparent;border:1px solid rgba(191,95,255,0.3);color:rgba(191,95,255,0.6);border-radius:0;cursor:pointer;font-size:10px;margin-left:2px;font-family:inherit;transition:all 0.2s;';
            searchBtn.onclick = () => {
                const keywords = prompt('Nhập từ khóa tìm kiếm (để trống để xóa filter):');
                if (keywords !== null) {
                    filterAnswers(keywords);
                }
            };
            
            // Auto-refresh button
            const autoRefreshBtn = document.createElement('button');
            autoRefreshBtn.id = 'auto-refresh-btn';
            autoRefreshBtn.textContent = '⟳ Auto';
            autoRefreshBtn.title = 'Toggle auto-refresh mỗi ' + AUTO_REFRESH_INTERVAL + 's (Ctrl+R)';
            autoRefreshBtn.style.cssText = 'padding:5px 10px;background:' + (AUTO_REFRESH_ENABLED ? 'rgba(191,95,255,0.2)' : 'transparent') + ';border:1px solid ' + (AUTO_REFRESH_ENABLED ? 'rgba(191,95,255,0.6)' : 'rgba(191,95,255,0.3)') + ';color:rgba(191,95,255,0.8);border-radius:0;cursor:pointer;font-size:10px;margin-left:2px;font-family:inherit;transition:all 0.2s;';
            autoRefreshBtn.onclick = () => {
                setAutoRefresh(!AUTO_REFRESH_ENABLED);
                const newInterval = prompt(`Nhập khoảng refresh (giây)`, String(AUTO_REFRESH_INTERVAL));
                if (newInterval) {
                    const n = parseInt(newInterval);
                    if (n > 5) setAutoRefresh(AUTO_REFRESH_ENABLED, n);
                }
            };
            
            // Settings button
            footer.append(exportButton, settingsBtn, clearBtn, cacheBtn);
            this.container.append(this.header, this.contentArea, footer);
            // Apply panel configuration (v5.4)
            this.container.style.width = PANEL_CONFIG.width + 'vw';
            this.container.style.maxHeight = PANEL_CONFIG.height + 'vh';
            this.container.style.fontSize = (PANEL_CONFIG.zoom / 100) + 'em';
            applyTheme(PANEL_CONFIG.theme);
            
            const appendToBody = () => document.body.appendChild(this.container);
            if (document.body) appendToBody();
            else document.addEventListener('DOMContentLoaded', appendToBody, { once: true });
        }

        addEventListeners() {
            setTimeout(() => {
                this.header.addEventListener('mousedown', this.onMouseDown);
                window.addEventListener('keydown', this.onKeyDown);
                const exportBtn = document.getElementById('export-btn');
                if (exportBtn) exportBtn.addEventListener('click', this.exportToTxt);
            }, 500);
        }

        exportToTxt() {
            const oneLine = (s) => normText(String(s || '').replace(/\r/g, ''));
            let fullText = `Tool OLM EZ - by NgocThanh | Quan Ngoc Thanh\nXuất lúc: ${new Date().toLocaleString('vi-VN')}\n${'='.repeat(50)}\n`;
            const questionBlocks = this.contentArea.querySelectorAll('.qa-block');
            questionBlocks.forEach((block, index) => {
                const questionElement = block.querySelector('.question-content');
                const contentElement = block.querySelector('.content-container');
                if (questionElement && contentElement) {
                    const type = contentElement.dataset.type || 'answer';
                    let label = '--> Đáp án:';
                    if (type === 'solution') {
                        label = '--> Hướng dẫn giải:';
                    } else if (type === 'not-found') {
                        label = '--> (chưa có đáp án trong API/DOM) ';
                    }
                    const questionText = oneLine(questionElement.textContent);
                    const contentText = oneLine(contentElement.textContent);
                    fullText += `---\nCâu ${index + 1}\n${questionText}\n`;
                    fullText += `${label}${contentText}\n\n`;
                }
            });
            const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `dap-an-olm-${Date.now()}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        onMouseDown(event) {
            this.dragState.isDragging = true; const rect = this.container.getBoundingClientRect(); this.container.style.right = 'auto'; this.container.style.bottom = 'auto'; this.container.style.left = `${rect.left}px`; this.container.style.top = `${rect.top}px`; this.dragState.initialX = rect.left; this.dragState.initialY = rect.top; this.dragState.startX = event.clientX; this.dragState.startY = event.clientY; window.addEventListener('mousemove', this.onMouseMove); window.addEventListener('mouseup', this.onMouseUp);
        }
        onMouseMove(event) {
            if (!this.dragState.isDragging) return; event.preventDefault(); const dx = event.clientX - this.dragState.startX; const dy = event.clientY - this.dragState.startY; this.container.style.left = `${this.dragState.initialX + dx}px`; this.container.style.top = `${this.dragState.initialY + dy}px`;
        }
        onMouseUp() {
            this.dragState.isDragging = false; window.removeEventListener('mousemove', this.onMouseMove); window.removeEventListener('mouseup', this.onMouseUp);
        }
        onKeyDown(event) { if (event.code === 'ShiftRight') this.toggleVisibility(); }
        toggleVisibility() { this.isVisible = !this.isVisible; this.container.classList.toggle('hidden', !this.isVisible); }

        getAnswersAsDOM(question, decodedHtml) {
            const plain = extractAnswersFromPlainApiFields(question);
            if (plain) return plain;

            const listElement = document.createElement('ul');
            const jsonData = tryParseQuestionJsonTree(question);
            if (jsonData) {
                try {
                    const rootNode = jsonData.root != null ? jsonData.root : jsonData;

                    // ── Câu đúng/sai (true-false) ────────────────────────────────────
                    const tfAnswers = extractTrueFalseAnswers(rootNode);
                    if (tfAnswers.length) {
                        tfAnswers.forEach(({ text, correct }) => {
                            const li = document.createElement('li');
                            const label = correct === true ? '✔ Đúng' : correct === false ? '✘ Sai' : '?';
                            li.textContent = `[${label}] ${cleanMathText(text)}`;
                            li.style.color = correct === true ? '#bf5fff' : correct === false ? '#ff4444' : 'rgba(191,95,255,0.3)';
                            listElement.appendChild(li);
                        });
                        return listElement;
                    }

                    // ── Câu kéo thả / điền chỗ trống (drag-drop / fill-blank) ─────
                    const ddAnswers = extractDragDropAnswers(rootNode);
                    const vueDD = ddAnswers.length ? ddAnswers : extractDragDropFromVue(question);
                    if (vueDD.length) {
                        vueDD.forEach(({ slot, answer }) => {
                            const li = document.createElement('li');
                            li.innerHTML = `<span style="color:rgba(191,95,255,0.6);font-size:10px;">[slot.${slot}]</span> ${mathTextToHtml(answer)}`;
                            listElement.appendChild(li);
                        });
                        return listElement;
                    }

                    const collected = [];
                    const textSeen = new Set();
                    const visited = new WeakSet();
                    collectCorrectTextsFromJsonTree(rootNode, collected, textSeen, visited);
                    collectAnswersFromJsonLoose(rootNode, collected, textSeen, 0);
                    let sanitized = sanitizeAnswerStrings(collected, question);
                    if (!sanitized.length) {
                        const hSeen = new Set();
                        const hints = [];
                        collectLexicalGroupListStructure(rootNode, hints, hSeen, 0);
                        sanitized = sanitizeAnswerStrings(hints, question);
                    }
                    if (!sanitized.length) {
                        const hSeen = new Set();
                        const hints = [];
                        collectLexicalPipePairRows(rootNode, hints, hSeen, 0);
                        sanitized = sanitizeAnswerStrings(hints, question);
                    }
                    if (sanitized.length) {
                        sanitized.forEach(text => {
                            const li = document.createElement('li');
                            setAnswerText(li, text);
                            listElement.appendChild(li);
                        });
                        return listElement;
                    }
                    const findCorrect = (node) => {
                        if (!node) return null;
                        if (node.correct === true || node.isCorrect === true) return node;
                        if (node.children) {
                            for (const child of node.children) {
                                const found = findCorrect(child);
                                if (found) return found;
                            }
                        }
                        return null;
                    };
                    const correctAnswerNode = findCorrect(rootNode);
                    if (correctAnswerNode) {
                        const answerText = normText(lexicalPlainText(correctAnswerNode));
                        if (answerText) {
                            const li = document.createElement('li');
                            setAnswerText(li, answerText);
                            listElement.appendChild(li);
                            return listElement;
                        }
                    }
                } catch (e) { console.error('Lỗi phân tích JSON:', e); }
            }
            const html = decodedHtml != null ? decodedHtml : decodeBase64Utf8(question.content || '');
            if (!html || isGarbageDecodedHtml(html)) return null;

            // Thử lấy drag-drop từ HTML trước khi quét DOM selectors
            const ddFromHtml = extractDragDropFromHtml(html);
            if (ddFromHtml.length) {
                ddFromHtml.forEach(({ slot, answer }) => {
                    const li = document.createElement('li');
                    li.textContent = `Chỗ ${slot}: ${answer}`;
                    listElement.appendChild(li);
                });
                return listElement;
            }

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const correctAnswers = tempDiv.querySelectorAll(ANSWER_DOM_SELECTORS);
            if (correctAnswers.length > 0) {
                correctAnswers.forEach(ans => {
                    const li = document.createElement('li');
                    while (ans.firstChild) li.appendChild(ans.firstChild.cloneNode(true));
                    listElement.appendChild(li);
                });
                return listElement;
            }
            const fillInputs = tempDiv.querySelectorAll('input[data-accept], textarea[data-accept]');
            if (fillInputs.length) {
                fillInputs.forEach(inp => {
                    const raw = inp.getAttribute('data-accept') || '';
                    raw.split('|').forEach(a => {
                        const t = a.trim();
                        if (!t) return;
                        const li = document.createElement('li');
                        setAnswerText(li, t);
                        listElement.appendChild(li);
                    });
                });
                if (listElement.childNodes.length) return listElement;
            }
            const structured = extractStructuredAnswersFromHtml(tempDiv);
            if (structured.length) {
                structured.forEach(text => {
                    const li = document.createElement('li');
                    setAnswerText(li, text);
                    listElement.appendChild(li);
                });
                return listElement;
            }
            return null;
        }
        getSolutionAsDOM(decodedContent) {
            if (!decodedContent || isGarbageDecodedHtml(decodedContent)) return null;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = decodedContent;
            // Thử tìm block lời giải rõ ràng
            const solSel = [
                '.loigiai', '.huong-dan-giai', '.explain', '.solution', '#solution',
                '.guide', '.exp', '.exp-in', '.giai', '.huong-dan', '.cach-giai',
                '[class*="solution"]', '[class*="loigiai"]', '[class*="explain"]',
                '[class*="huong-dan"]', '.answer-explanation', '.result-explain'
            ].join(', ');
            const solutionNode = tempDiv.querySelector(solSel);
            if (solutionNode) {
                const clone = solutionNode.cloneNode(true);
                clone.querySelectorAll('h3, h4').forEach(h => h.remove());
                return clone;
            }
            // Không tìm thấy → trả toàn bộ nội dung (bỏ phần chọn đáp án)
            const clone = tempDiv.cloneNode(true);
            clone.querySelectorAll(
                'ol.quiz-list, ul.quiz-list, .quiz-list, .interaction, ' +
                'input[type=radio], input[type=checkbox], .form-group, button, ' +
                '.quiz-option, .answer-option, [class*="quiz-option"]'
            ).forEach(el => el.remove());
            // Nếu còn nội dung có nghĩa thì trả về
            const text = (clone.textContent || '').trim();
            return text.length > 10 ? clone : null;
        }

        renderContentWithOLM(element) {
            setTimeout(() => {
                const uw = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
                const renderFunc = uw.renderKatex || (uw.MathJax && (uw.MathJax.typeset || (uw.MathJax.Hub && uw.MathJax.Hub.Queue)));
                if (typeof renderFunc === 'function') {
                    try {
                        if (uw.MathJax && uw.MathJax.typeset) uw.MathJax.typeset([element]);
                        else if (uw.MathJax && uw.MathJax.Hub) uw.MathJax.Hub.Queue(["Typeset", uw.MathJax.Hub, element]);
                        else renderFunc(element);
                    } catch (e) { console.error("Lỗi khi thực thi hàm render của OLM:", e); }
                }
            }, 500);
        }

        /**
         * Thử lặp lại: DOM bài làm có thể render sau API get-question-of-ids.
         */
        scheduleDomAnswerEnrichment(responseContainer, list) {
            const tryFillSolution = (question, cc) => {
                const dec = decodeBase64Utf8(question.content || '');
                if (dec && !isGarbageDecodedHtml(dec)) {
                    const sol = this.getSolutionAsDOM(dec);
                    if (sol) {
                        cc.dataset.type = 'solution';
                        cc.style.cssText = 'padding:4px 0 0 8px;border-top:1px solid rgba(191,95,255,0.25);margin-top:4px;color:#c89aff;';
                        cc.innerHTML = '<div style="font-size:10px;color:rgba(191,95,255,0.8);margin-bottom:4px;font-weight:700;">// SOLUTION</div>';
                        cc.appendChild(sol);
                        setTimeout(() => renderMathInElement(cc), 300);
                        return true;
                    }
                }
                cc.innerHTML = '<p style="margin:0;font-style:italic;color:rgba(191,95,255,0.4);font-size:10px;">> null — no answer or solution found.</p>';
                return false;
            };

            const tryFill = (isFinal = false) => {
                list.forEach(question => {
                    const qid = question.id != null ? String(question.id) : '';
                    if (!qid) return;
                    const row = responseContainer.querySelector(`[data-olm-qid="${CSS.escape(qid)}"]`);
                    if (!row) return;
                    const cc = row.querySelector('.content-container');
                    if (!cc || cc.dataset.type !== 'not-found') return;

                    // Thử lấy đáp án từ DOM trang
                    let fromDom = extractAnswersFromPlainApiFields(question)
                        || extractAnswersFromDomForQuestion(question);
                    if (!fromDom) {
                        const dec = decodeBase64Utf8(question.content || '');
                        if (dec && !isGarbageDecodedHtml(dec)) {
                            fromDom = this.getAnswersAsDOM(question, dec);
                        } else {
                            fromDom = this.getAnswersAsDOM(question, '');
                        }
                    }
                    if (fromDom) {
                        decorateAnswerPanel(cc, fromDom);
                        this.renderContentWithOLM(cc);
                        const qid = question.id != null ? String(question.id) : null;
                        if (qid) Cache.set(qid, { type: 'answer', html: cc.innerHTML });
                        return;
                    }
                    // Nếu là lần cuối hoặc đã đủ thời gian → lấy lời giải
                    if (isFinal) tryFillSolution(question, cc);
                });
            };

            // Thử sớm, và sau 3s thì fallback lời giải
            [80, 400, 1200, 3000].forEach((ms, idx) =>
                setTimeout(() => tryFill(idx === 3), ms)
            );

            // MutationObserver nhẹ - chỉ childList
            let debounce;
            try {
                const obs = new MutationObserver(() => {
                    clearTimeout(debounce);
                    debounce = setTimeout(() => tryFill(false), 400);
                });
                if (document.body) obs.observe(document.body, { childList: true, subtree: true });
                setTimeout(() => { try { obs.disconnect(); } catch (_) { /* ignore */ } }, 20000);
            } catch (_) { /* ignore */ }
        }

        async renderData(data) {
            let list = data;
            if (!Array.isArray(list)) {
                list = (data && (data.list || data.data || data.questions || data.items)) || null;
            }
            if (!Array.isArray(list)) return;

            // Lọc câu đã hiển thị (dedup nhiều trang)
            const newList = list.filter(q => {
                const qid = q.id != null ? String(q.id) : null;
                if (!qid) return true;
                if (seenQuestionIds.has(qid)) return false;
                seenQuestionIds.add(qid);
                return true;
            });
            if (!newList.length) return;

            const responseContainer = document.createElement('div');
            const batchNum = this.contentArea.querySelectorAll('.olm-batch').length + 1;
            const timestamp = new Date().toLocaleTimeString();
            responseContainer.className = 'olm-batch';
            responseContainer.dataset.batch = batchNum;

            // Header batch: có nút xóa batch này
            const batchHeader = document.createElement('div');
            batchHeader.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:3px 6px;margin-bottom:5px;background:rgba(57,255,20,0.07);border-radius:0;font-size:10px;color:rgba(191,95,255,0.8);border-left:2px solid rgba(57,255,20,0.4);font-family:inherit;';
            batchHeader.innerHTML = `<span>> batch_${batchNum} [${newList.length} items] @${timestamp}</span>`;
            const delBtn = document.createElement('button');
            delBtn.textContent = '✕ Xóa';
            delBtn.style.cssText = 'background:transparent;border:1px solid #ff4444;color:#ff6666;border-radius:0;padding:2px 6px;cursor:pointer;font-size:10px;font-family:inherit;';
            delBtn.onclick = () => {
                // Xóa câu khỏi seenQuestionIds khi xóa batch
                responseContainer.querySelectorAll('[data-olm-qid]').forEach(el => {
                    seenQuestionIds.delete(el.dataset.olmQid);
                });
                responseContainer.remove();
            };
            batchHeader.appendChild(delBtn);
            responseContainer.appendChild(batchHeader);

            for (const question of newList) {
                globalQuestionCounter++;
                const questionNum = globalQuestionCounter;
                const qid = question.id != null ? String(question.id) : null;

                // Thử lấy từ cache trước
                const cached = qid ? Cache.get(qid) : null;

                const jsonTree = tryParseQuestionJsonTree(question);
                const stemFromJson = extractStemTextFromLexical(jsonTree);
                const decodedContent = await decodeQuestionContent(question.content || '');
                const htmlUsable = decodedContent && !isGarbageDecodedHtml(decodedContent);
                const hasRichMath = htmlUsable && htmlLooksLikeHasMath(decodedContent);
                const useStemText = stemFromJson && stemFromJson.length >= 8 && !hasRichMath;
                let answersElement = this.getAnswersAsDOM(question, htmlUsable ? decodedContent : '');
                if (!answersElement) answersElement = extractAnswersFromDomForQuestion(question);
                const solutionElement = htmlUsable ? this.getSolutionAsDOM(decodedContent) : null;
                const tempDiv = document.createElement('div');
                if (htmlUsable && !useStemText) {
                    tempDiv.innerHTML = decodedContent;
                    tempDiv.querySelectorAll('ol.quiz-list, ul.quiz-list, .interaction, .form-group, .loigiai, .huong-dan-giai, .explain, .solution, #solution, .guide, .exp').forEach(el => el.remove());
                    stripQuestionDisplayElements(tempDiv);
                }
                const questionDiv = document.createElement('div');
                questionDiv.className = 'qa-block';
                if (qid) questionDiv.setAttribute('data-olm-qid', qid);
                questionDiv.style.cssText = 'padding:8px 10px;border-left:2px solid #bf5fff;margin-bottom:8px;background:rgba(191,95,255,0.04);';

                // Số thứ tự câu
                const numBadge = document.createElement('div');
                numBadge.style.cssText = 'font-size:9px;color:rgba(191,95,255,0.6);margin-bottom:2px;font-weight:700;letter-spacing:1px;';
                numBadge.textContent = `CÂU ${questionNum}`;
                if (cached) numBadge.textContent += ' [cache]';

                const questionDisplayContainer = document.createElement('div');
                questionDisplayContainer.className = 'question-content';
                questionDisplayContainer.style.cssText = 'font-weight:500;color:#c89aff;margin-bottom:4px;font-size:11px;line-height:1.4;';
                if (useStemText) {
                    questionDisplayContainer.textContent = stemFromJson;
                    questionDisplayContainer.style.whiteSpace = 'pre-wrap';
                } else if (htmlUsable) {
                    while (tempDiv.firstChild) questionDisplayContainer.appendChild(tempDiv.firstChild);
                }
                if (!questionDisplayContainer.hasChildNodes() && question.title) {
                    questionDisplayContainer.innerHTML = escapeHtml(question.title);
                } else if (!questionDisplayContainer.hasChildNodes()) {
                    questionDisplayContainer.innerHTML = '<span style="color:#999;">(Không có nội dung câu)</span>';
                }

                const contentContainer = document.createElement('div');
                contentContainer.className = 'content-container';

                // Nếu có cache thì dùng cache
                if (cached) {
                    contentContainer.dataset.type = cached.val.type || 'answer';
                    contentContainer.style.cssText = 'padding:4px 0 0 8px;border-top:1px solid rgba(191,95,255,0.2);margin-top:4px;';
                    contentContainer.innerHTML = cached.val.html || '';
                } else if (answersElement) {
                    decorateAnswerPanel(contentContainer, answersElement);
                    // Lưu vào cache
                    if (qid) Cache.set(qid, { type: 'answer', html: contentContainer.innerHTML });
                } else if (solutionElement) {
                    contentContainer.dataset.type = 'solution';
                    contentContainer.style.cssText = 'padding:4px 0 0 8px;border-top:1px solid rgba(191,95,255,0.25);margin-top:4px;color:#c89aff;';
                    const label = document.createElement('div');
                    label.innerHTML = '// <b style="color:#bf5fff;">SOLUTION</b>';
                    label.style.cssText = 'font-size:10px;margin-bottom:4px;color:rgba(191,95,255,0.8);';
                    contentContainer.appendChild(label);
                    contentContainer.appendChild(solutionElement);
                    setTimeout(() => renderMathInElement(contentContainer), 300);
                    if (qid) Cache.set(qid, { type: 'solution', html: contentContainer.innerHTML });
                } else {
                    contentContainer.dataset.type = 'not-found';
                    contentContainer.style.cssText = 'padding:4px 0 0 8px;';
                    contentContainer.innerHTML = '<p style="margin:0;font-style:italic;color:rgba(191,95,255,0.5);font-size:10px;">> scanning... no answer found yet</p>';
                }

                questionDiv.append(numBadge, questionDisplayContainer, contentContainer);
                responseContainer.appendChild(questionDiv);
            }
            this.contentArea.prepend(responseContainer);
            this.scheduleDomAnswerEnrichment(responseContainer, newList);
            this.renderContentWithOLM(this.contentArea);
        }
    }
    const answerUI = new AnswerDisplay();
    answerUI.init()
    applyTheme(PANEL_CONFIG.theme);
    // Apply saved panel dimensions
    setTimeout(() => {
        const container = document.getElementById('olm-answers-container');
        if (container) {
            container.style.width = PANEL_CONFIG.width + 'vw';
            container.style.maxHeight = PANEL_CONFIG.height + 'vh';
            container.style.fontSize = (PANEL_CONFIG.zoom / 100) + 'em';
        }
    }, 100);;

    // ─── ANTI-BAN: giới hạn tốc độ xử lý, không gây spike bất thường ─────────
    const RATE_LIMITER = {
        lastRender: 0,
        minInterval: 800,
        queue: [],
        processing: false,
        push(fn) {
            this.queue.push(fn);
            if (!this.processing) this.processNext();
        },
        processNext() {
            // Fix #6: kiểm tra queue ngay tại đầu mỗi vòng lặp thay vì trước setTimeout
            // để không bỏ sót item được push trong lúc đang xử lý item trước
            if (!this.queue.length) { this.processing = false; return; }
            this.processing = true;
            const now = Date.now();
            const wait = Math.max(0, this.minInterval - (now - this.lastRender));
            setTimeout(async () => {
                // Snapshot fn tại thời điểm chạy (queue có thể đã có thêm items)
                const fn = this.queue.shift();
                if (fn) {
                    try { await fn(); } catch (_) { /* ignore */ }
                    this.lastRender = Date.now();
                }
                // Tiếp tục xử lý — dùng setImmediate-like để không block microtask
                setTimeout(() => this.processNext(), 0);
            }, wait);
        }
    };

    // ─── CHỐNG CÂU ẨN: OLM dùng visibility:hidden / opacity:0 để chống script ─
    function tryUnhideQuestions() {
        try {
            const style = document.createElement('style');
            style.id = 'olm-unhide-style';
            style.textContent = `
                [data-question-id] *, [data-id] *, [data-qid] * {
                    visibility: visible !important;
                }
            `;
            if (!document.getElementById('olm-unhide-style')) {
                (document.head || document.documentElement).appendChild(style);
            }
        } catch (_) { /* ignore */ }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryUnhideQuestions, { once: true });
    } else {
        tryUnhideQuestions();
    }

    const uw = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const originalFetch = uw.fetch.bind(uw);
    uw.fetch = function(...args) {
        const requestUrl = args[0] instanceof Request ? args[0].url : (typeof args[0] === 'string' ? args[0] : '');
        const promise = originalFetch.apply(this, args);
        if (requestUrl) {
            promise.then(response => {
                if (!response.ok) return;
                if (isTrackedUrl(requestUrl)) {
                    response.clone().json().then(data => {
                        RATE_LIMITER.push(() => answerUI.renderData(data));
                    }).catch(() => { /* ignore */ });
                    return;
                }
                response.clone().json().then(data => {
                    if (looksLikeQuestionList(data)) {
                        learnEndpoint(requestUrl);
                        RATE_LIMITER.push(() => answerUI.renderData(data));
                    }
                }).catch(() => { /* ignore */ });
            }).catch(() => { /* ignore */ });
        }
        return promise;
    };
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(...args) {
        this.addEventListener('load', function onLoad() {
            if (this.status !== 200) return;
            const url = this.responseURL || '';
            if (isTrackedUrl(url)) {
                try {
                    if (!this.responseText) return;
                    const data = JSON.parse(this.responseText);
                    RATE_LIMITER.push(() => answerUI.renderData(data));
                } catch (e) { console.error(e); }
                return;
            }
            if (url && this.responseText) {
                try {
                    const data = JSON.parse(this.responseText);
                    if (looksLikeQuestionList(data)) {
                        learnEndpoint(url);
                        RATE_LIMITER.push(() => answerUI.renderData(data));
                    }
                } catch (_) { /* ignore */ }
            }
        });
        return originalSend.apply(this, args);
    };
})();
