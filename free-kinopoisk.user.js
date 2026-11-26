// ==UserScript==
// @name         Free Kinopoisk
// @namespace    https://github.com/accidenttrauma/free-kinopoisk-button
// @version      2.0
// @description  Смотрите фильмы бесплатно
// @author       accidenttrauma
// @match        https://www.kinopoisk.ru/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @grant        GM_addValueChangeListener
// @run-at       document-end
// @icon         https://raw.githubusercontent.com/accidenttrauma/free-kinopoisk-button/main/icon_black.png
// ==/UserScript==

(function () {
    'use strict';

    // ===== Константы =====
    const MODE_KEY          = 'kinobox_mode';
    const THEME_KEY         = 'kinobox_theme';
    const ACCENT_KEY        = 'kinobox_accent';
    const POS_KEY           = 'kinobox_floating_pos';
    const HOTKEY_KEY        = 'kinobox_hotkey';
    const PROVIDER_KEY      = 'kinobox_provider';
    const CUSTOM_URL_KEY    = 'kinobox_custom_url';

    const DEFAULT_MODE      = 'inline';
    const DEFAULT_THEME     = 'light';
    const DEFAULT_ACCENT    = '#ff5500';
    const DEFAULT_HOTKEY    = 'Alt+Q';
    const DEFAULT_PROVIDER  = 'kinobox';

    let currentMode     = GM_getValue(MODE_KEY, DEFAULT_MODE);
    let currentTheme    = GM_getValue(THEME_KEY, DEFAULT_THEME);
    let currentAccent   = GM_getValue(ACCENT_KEY, DEFAULT_ACCENT);
    let floatingPos     = GM_getValue(POS_KEY, { left: 25, top: 45 });
    let currentHotkey   = GM_getValue(HOTKEY_KEY, DEFAULT_HOTKEY);
    let currentProvider = GM_getValue(PROVIDER_KEY, DEFAULT_PROVIDER);
    let customUrl       = GM_getValue(CUSTOM_URL_KEY, '');

    // ===== Стили =====
    GM_addStyle(`
        #kinobox-inline-btn {
            width: 52px !important; height: 52px !important; min-width: 52px !important;
            padding: 0 !important;
            display: flex !important; align-items: center !important; justify-content: center !important;
            border-radius: 50% !important;
            background: var(--kb-bg) !important;
            border: 1px solid var(--kb-border) !important;
            cursor: pointer !important;
            transition: background 0.25s ease, box-shadow 0.25s ease, transform 0.15s ease !important;
            box-shadow: 0 2px 6px rgba(0,0,0,0.18) !important;
            color: var(--kb-text) !important;
            text-decoration: none !important;
            box-sizing: border-box !important;
        }
        #kinobox-inline-btn svg { transition: color 0.2s ease, transform 0.2s ease; }
        #kinobox-inline-btn:hover {
            background: var(--kb-hover-bg) !important;
            transform: scale(1.05) !important;
            box-shadow: 0 0 12px var(--kb-accent-glow), 0 3px 10px rgba(0,0,0,0.22) !important;
        }
        #kinobox-inline-btn:hover svg { color: var(--kb-accent); transform: scale(1.1); }
        #kinobox-inline-btn.kb-pressed {
            transform: scale(0.85) !important;
            transition: background 0.25s ease, box-shadow 0.25s ease, transform 0.1s ease !important;
        }

        #kinobox-floating-btn {
            position: fixed;
            width: 62px; height: 62px;
            background: var(--kb-bg);
            border: 3px solid var(--kb-border);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            cursor: grab;
            z-index: 999999;
            box-shadow: 0 8px 25px rgba(0,0,0,0.35);
            transition: background 0.25s, border-color 0.25s, transform 0.15s, box-shadow 0.25s, left 0.2s ease, top 0.2s ease;
            user-select: none;
            transform: translateY(-50%);
            text-decoration: none;
            box-sizing: border-box;
        }
        #kinobox-floating-btn path { transition: fill 0.2s ease; fill: var(--kb-text); }
        #kinobox-floating-btn:hover {
            background: var(--kb-hover-bg);
            box-shadow: 0 0 18px var(--kb-accent-glow), 0 8px 25px rgba(0,0,0,0.4);
        }
        #kinobox-floating-btn:hover path { fill: var(--kb-accent); }
        #kinobox-floating-btn.kb-pressed {
            transform: translateY(-50%) scale(0.85) !important;
            transition: background 0.25s, border-color 0.25s, transform 0.1s, box-shadow 0.25s !important;
        }
        #kinobox-floating-btn.kb-dragging,
        #kinobox-floating-btn.kb-dragging:hover {
            background: var(--kb-bg) !important;
            box-shadow: 0 8px 25px rgba(0,0,0,0.35) !important;
            transform: translateY(-50%) !important;
            transition: none !important;
        }
        #kinobox-floating-btn.kb-dragging path { fill: var(--kb-text) !important; }
    `);

    // ===== Хоткей =====
    function parseHotkey(str) {
        if (!str || str === 'disabled') return null;
        const parts = str.split('+').map(s => s.trim().toLowerCase());
        const r = { ctrl: false, alt: false, shift: false, meta: false, key: null };
        for (const p of parts) {
            if (p === 'alt') r.alt = true;
            else if (p === 'ctrl' || p === 'control') r.ctrl = true;
            else if (p === 'shift') r.shift = true;
            else if (p === 'meta' || p === 'cmd') r.meta = true;
            else r.key = p.toUpperCase();
        }
        return r.key ? r : null;
    }

    function matchesHotkey(e, hk) {
        if (!hk) return false;
        return e.altKey === hk.alt && e.ctrlKey === hk.ctrl &&
               e.shiftKey === hk.shift && e.metaKey === hk.meta &&
               e.code === 'Key' + hk.key;
    }

    // ===== Провайдер =====
    function getProviderUrl(filmId) {
        if (currentProvider === 'custom' && customUrl) {
            return customUrl.replace(/\$\{id\}/g, filmId);
        }
        return `https://kinobox.in/movie/${filmId}/`;
    }

    // ===== Кеш цветов =====
    let cachedColors = null;

    function isDarkTheme() {
        if (currentTheme === 'light') return false;
        if (currentTheme === 'dark')  return true;

        const candidates = [
            document.querySelector('[class*="styles_root"]'),
            document.querySelector('[class*="media-player"]'),
            document.querySelector('main'),
            document.querySelector('#__next'),
            document.body
        ];

        for (const el of candidates) {
            if (!el) continue;
            const bg = getComputedStyle(el).backgroundColor;
            const m = bg.match(/\d+/g);
            if (m && m.length >= 3) {
                const brightness = (m[0]*299 + m[1]*587 + m[2]*114) / 1000;
                if (brightness < 60) return true;
                if (brightness > 200) return false;
            }
        }

        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            const content = meta.getAttribute('content') || '';
            if (content.includes('#000') || content.includes('#111') || content.includes('#1a') || content.includes('#1c')) return true;
        }

        return false;
    }

    function computeColors() {
        const dark = isDarkTheme();
        return {
            dark,
            bg:      dark ? '#1c1c1c' : '#f2f2f2',
            hoverBg: dark ? '#2a2a2a' : '#e0e0e0',
            border:  dark ? '#333333' : '#cccccc',
            text:    dark ? '#eeeeee' : '#222222',
            accent:  currentAccent
        };
    }

    function getColors() {
        if (!cachedColors) cachedColors = computeColors();
        return cachedColors;
    }

    function applyColors(el, c) {
        el.style.setProperty('--kb-bg', c.bg);
        el.style.setProperty('--kb-hover-bg', c.hoverBg);
        el.style.setProperty('--kb-border', c.border);
        el.style.setProperty('--kb-text', c.text);
        el.style.setProperty('--kb-accent', c.accent);
        el.style.setProperty('--kb-accent-glow', c.accent + '55');
    }

    // ===== Меню: режим =====
    GM_registerMenuCommand('Режим → Кнопка рядом',     () => { currentMode = 'inline';   GM_setValue(MODE_KEY, currentMode);  init(true); });
    GM_registerMenuCommand('Режим → Плавающая кнопка', () => { currentMode = 'floating'; GM_setValue(MODE_KEY, currentMode);  init(true); });
    GM_registerMenuCommand('Режим → Флажок',           () => { currentMode = 'flag';     GM_setValue(MODE_KEY, currentMode);  init(true); });

    // ===== Меню: тема =====
    GM_registerMenuCommand('Тема → Светлая', () => { currentTheme = 'light'; GM_setValue(THEME_KEY, currentTheme); init(true); });
    GM_registerMenuCommand('Тема → Тёмная',  () => { currentTheme = 'dark';  GM_setValue(THEME_KEY, currentTheme); init(true); });
    GM_registerMenuCommand('Тема → Авто',    () => { currentTheme = 'auto';  GM_setValue(THEME_KEY, currentTheme); init(true); });

    // ===== Меню: акцент =====
    GM_registerMenuCommand('Акцент → Оранжевый (#ff5500)', () => setAccent('#ff5500'));
    GM_registerMenuCommand('Акцент → Красный (#e53935)',   () => setAccent('#e53935'));
    GM_registerMenuCommand('Акцент → Синий (#1e88e5)',     () => setAccent('#1e88e5'));
    GM_registerMenuCommand('Акцент → Чёрный (#111111)',    () => setAccent('#111111'));
    GM_registerMenuCommand('Акцент → Бирюзовый (#45edbb)', () => setAccent('#45edbb'));

    function setAccent(color) {
        currentAccent = color;
        GM_setValue(ACCENT_KEY, color);
        init(true);
    }

    // ===== Меню: провайдер =====
    GM_registerMenuCommand((currentProvider === 'kinobox' ? '● ' : '○ ') + 'Провайдер → Kinobox', () => {
        currentProvider = 'kinobox';
        GM_setValue(PROVIDER_KEY, 'kinobox');
    });
    GM_registerMenuCommand((currentProvider === 'custom' ? '● ' : '○ ') + 'Провайдер → Свой URL…', () => {
        const custom = prompt(
            'URL с плейсхолдером ${id} для ID фильма.\nПример: https://example.com/movie/${id}/\n\nОставь пустым — останется текущий.',
            customUrl || ''
        );
        if (custom !== null && custom.trim()) {
            customUrl = custom.trim();
            GM_setValue(CUSTOM_URL_KEY, customUrl);
            currentProvider = 'custom';
            GM_setValue(PROVIDER_KEY, 'custom');
        }
    });

    // ===== Меню: горячая клавиша =====
    const hotkeyPresets = ['Alt+Q', 'Alt+K', 'Alt+Z', 'Ctrl+Shift+K'];
    for (const hk of hotkeyPresets) {
        const marker = currentHotkey === hk ? '● ' : '○ ';
        GM_registerMenuCommand(marker + 'Клавиша → ' + hk, () => {
            currentHotkey = hk;
            GM_setValue(HOTKEY_KEY, hk);
        });
    }
    GM_registerMenuCommand((currentHotkey === 'disabled' ? '● ' : '○ ') + 'Клавиша → Отключить', () => {
        currentHotkey = 'disabled';
        GM_setValue(HOTKEY_KEY, 'disabled');
    });

    // ===== Меню: сброс позиции =====
    GM_registerMenuCommand('Сбросить позицию кнопки', () => {
        floatingPos = { left: 25, top: 45 };
        GM_setValue(POS_KEY, floatingPos);
        const btn = document.getElementById('kinobox-floating-btn');
        if (btn) {
            btn.style.left = floatingPos.left + 'px';
            btn.style.top  = floatingPos.top  + '%';
        }
    });

    // ===== Cleanup =====
    let observer = null;
    let dragAbort = null;
    let lastInitKey = null;
    let initTimer = null;
    let removeTimer = null;

    function cleanup() {
        if (dragAbort) { dragAbort.abort(); dragAbort = null; }
        document.getElementById('kinobox-inline-btn')?.parentElement?.remove();
        document.getElementById('kinobox-floating-btn')?.remove();
        document.getElementById('kinobox-flag')?.remove();
    }

    function getFilmId() {
        return location.pathname.match(/\/(film|series)\/(\d+)/)?.[2] || null;
    }

    function currentButtonId() {
        return {
            inline:   'kinobox-inline-btn',
            floating: 'kinobox-floating-btn',
            flag:     'kinobox-flag'
        }[currentMode];
    }

    function openNewTab(filmId) {
        window.open(getProviderUrl(filmId), '_blank');
    }

    function openCurrentTab(filmId) {
        window.location.href = getProviderUrl(filmId);
    }

    // ===== INLINE =====
    function createInlineButton(filmId, container) {
        if (document.getElementById('kinobox-inline-btn')) return;

        const c = getColors();
        const btn = document.createElement('a');
        btn.id = 'kinobox-inline-btn';
        btn.href = getProviderUrl(filmId);
        btn.target = '_blank';
        btn.rel = 'noopener noreferrer';
        applyColors(btn, c);

        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24"><path fill="currentColor" d="m10 16.5l6-4.5l-6-4.5zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8"/></svg>`;

        btn.addEventListener('mouseleave', () => btn.classList.remove('kb-pressed'));

        btn.addEventListener('mousedown', (e) => {
            if (e.button === 0 || e.button === 1 || e.button === 2) {
                btn.classList.add('kb-pressed');
            }
        });

        btn.addEventListener('mouseup', (e) => {
            if (e.button === 0) btn.classList.remove('kb-pressed');
        });

        btn.addEventListener('auxclick', (e) => {
            if (e.button === 1) setTimeout(() => btn.classList.remove('kb-pressed'), 300);
        });

        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            setTimeout(() => openCurrentTab(filmId), 140);
        });

        // Оборачиваем в ту же обёртку, что и штатные кнопки — для одинакового отступа
        const existingWrapper = container.querySelector(':scope > div[class*="styles_button__"]');
        if (existingWrapper) {
            const wrapper = document.createElement('div');
            wrapper.className = existingWrapper.className;
            wrapper.appendChild(btn);
            container.appendChild(wrapper);
        } else {
            container.appendChild(btn);
        }
    }

    // ===== FLOATING =====
    function applySnap(btn) {
        let left = parseFloat(btn.style.left);
        const w = window.innerWidth;
        const btnW = 62;
        const threshold = 60;
        const edgeOffset = 5;
        if (left < threshold) {
            left = edgeOffset;
        } else if (left > w - btnW - threshold) {
            left = w - btnW - edgeOffset;
        } else {
            return left;
        }
        btn.style.left = left + 'px';
        return left;
    }

    function createFloatingButton(filmId) {
        if (document.getElementById('kinobox-floating-btn')) return;

        const c = getColors();
        const btn = document.createElement('a');
        btn.id = 'kinobox-floating-btn';
        btn.href = getProviderUrl(filmId);
        btn.target = '_blank';
        btn.rel = 'noopener noreferrer';
        btn.draggable = false;
        applyColors(btn, c);

        const left = floatingPos.left ?? 25;
        const top  = floatingPos.top  ?? 45;
        btn.style.left = left + 'px';
        btn.style.top  = top + '%';

        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24"><path d="m10 16.5l6-4.5l-6-4.5zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8"/></svg>`;

        let isDragging = false;
        let moved = false;
        let startX, startY, startLeft, startTop;
        let pendingX = 0, pendingY = 0, hasFrame = false;

        btn.addEventListener('dragstart', (e) => e.preventDefault());

        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (moved) return;
            btn.classList.add('kb-pressed');
            setTimeout(() => openCurrentTab(filmId), 140);
        });

        btn.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                isDragging = true;
                moved = false;
                btn.classList.add('kb-pressed');
                startX = e.clientX;
                startY = e.clientY;
                startLeft = parseFloat(btn.style.left);
                startTop  = parseFloat(btn.style.top);
                btn.style.cursor = 'grabbing';
            } else if (e.button === 1 || e.button === 2) {
                btn.classList.add('kb-pressed');
            }
        });

        btn.addEventListener('mouseup', (e) => {
            if (e.button === 0 && !moved) btn.classList.remove('kb-pressed');
        });

        btn.addEventListener('auxclick', (e) => {
            if (e.button === 1) setTimeout(() => btn.classList.remove('kb-pressed'), 300);
        });

        btn.addEventListener('click', (e) => {
            if (moved) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        });

        dragAbort = new AbortController();
        const signal = dragAbort.signal;

        function onMouseMove(e) {
            if (!isDragging) return;
            pendingX = e.clientX;
            pendingY = e.clientY;
            if (hasFrame) return;
            hasFrame = true;
            requestAnimationFrame(() => {
                hasFrame = false;
                if (!isDragging) return;
                const dx = pendingX - startX;
                const dy = pendingY - startY;

                if (!moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
                    moved = true;
                    btn.classList.remove('kb-pressed');
                    btn.classList.add('kb-dragging');
                }
                if (!moved) return;

                let newLeft = startLeft + dx;
                let newTop  = startTop + (dy / window.innerHeight * 100);
                newLeft = Math.max(5, Math.min(window.innerWidth - 70, newLeft));
                newTop  = Math.max(5, Math.min(95, newTop));
                btn.style.left = newLeft + 'px';
                btn.style.top  = newTop + '%';
            });
        }

        function onMouseUp(e) {
            if (!isDragging) return;
            if (e.button !== 0) return;
            isDragging = false;
            btn.classList.remove('kb-pressed', 'kb-dragging');
            btn.style.cursor = 'grab';
            if (moved) {
                const snappedLeft = applySnap(btn);
                floatingPos = {
                    left: snappedLeft,
                    top:  parseFloat(btn.style.top)
                };
                GM_setValue(POS_KEY, floatingPos);
            }
        }

        document.addEventListener('mousemove', onMouseMove, { signal });
        document.addEventListener('mouseup',   onMouseUp,   { signal });

        document.body.appendChild(btn);
    }

    // ===== FLAG =====
    function createFlag(filmId) {
        if (document.getElementById('kinobox-flag')) return;

        const flag = document.createElement('a');
        flag.id = 'kinobox-flag';
        flag.href = getProviderUrl(filmId);
        flag.target = '_blank';
        flag.rel = 'noopener noreferrer';
        flag.innerHTML = `
            <svg width="34" height="150" viewBox="0 0 128 512" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                <path d="M128 0H0V512L64 480L128 512Z" fill="#000000" stroke="#ffffff" stroke-width="4" stroke-linejoin="round"/>
                <path d="M40 358 L100 390 L40 423 Z" fill="#ffffff"/>
            </svg>`;
        flag.style.cssText = `
            position: fixed; left: 8px; top: -48px;
            width: 32px; height: 128px;
            z-index: 2147483647; cursor: pointer;
            transition: transform 0.35s ease;
            transform: translateY(0);
            text-decoration: none;
        `;
        flag.onmouseenter = () => flag.style.transform = 'translateY(12px)';
        flag.onmouseleave = () => flag.style.transform = 'translateY(0)';

        flag.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            openCurrentTab(filmId);
        });

        document.body.appendChild(flag);
    }

    // ===== Создание по текущему состоянию =====
    function createCurrentButton() {
        const filmId = getFilmId();
        if (!filmId) return false;

        if (currentMode === 'inline') {
            const container = document.querySelector('div[class*="buttonsContainer"]');
            if (container) { createInlineButton(filmId, container); return true; }
            return false;
        }
        if (currentMode === 'floating') { createFloatingButton(filmId); return true; }
        if (currentMode === 'flag')     { createFlag(filmId);          return true; }
        return false;
    }

    // ===== Debounced observer =====
    function ensureObserver() {
        if (observer) return;
        let timer = null;
        observer = new MutationObserver(() => {
            if (timer) return;
            timer = setTimeout(() => {
                timer = null;
                if (document.getElementById(currentButtonId())) return;
                if (!getFilmId()) return;
                createCurrentButton();
            }, 250);
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // ===== init с защитой от мигания =====
    function init(immediate = false) {
        if (initTimer) { clearTimeout(initTimer); initTimer = null; }
        if (removeTimer) { clearTimeout(removeTimer); removeTimer = null; }

        const filmId = getFilmId();
        if (!filmId) {
            removeTimer = setTimeout(() => {
                removeTimer = null;
                if (!getFilmId()) {
                    cleanup();
                    lastInitKey = null;
                }
            }, 1000);
            return;
        }

        const key = [filmId, currentMode, currentTheme, currentAccent].join('|');
        if (lastInitKey === key && document.getElementById(currentButtonId())) {
            ensureObserver();
            return;
        }
        lastInitKey = key;
        cachedColors = null;

        const perform = () => {
            initTimer = null;
            cleanup();
            createCurrentButton();
            ensureObserver();
        };

        if (immediate) {
            perform();
        } else {
            initTimer = setTimeout(perform, 400);
        }
    }

    // ===== SPA-детект =====
    let scheduleTimer = null;
    function scheduleInit() {
        if (scheduleTimer) clearTimeout(scheduleTimer);
        scheduleTimer = setTimeout(() => {
            scheduleTimer = null;
            init(false);
        }, 600);
    }

    if (window.navigation) {
        window.navigation.addEventListener('navigate', scheduleInit);
    }
    window.addEventListener('popstate', scheduleInit);

    try {
        const _pushState = history.pushState;
        history.pushState = function (...args) {
            const ret = _pushState.apply(this, args);
            try { scheduleInit(); } catch (_) {}
            return ret;
        };
    } catch (_) {}

    try {
        const _replaceState = history.replaceState;
        history.replaceState = function (...args) {
            const ret = _replaceState.apply(this, args);
            try { scheduleInit(); } catch (_) {}
            return ret;
        };
    } catch (_) {}

    // ===== Горячая клавиша =====
    document.addEventListener('keydown', (e) => {
        const hk = parseHotkey(currentHotkey);
        if (!hk) return;
        if (matchesHotkey(e, hk)) {
            e.preventDefault();
            openNewTab(getFilmId());
        }
    }, true);

    // ===== Синхронизация вкладок =====
    if (typeof GM_addValueChangeListener === 'function') {
        GM_addValueChangeListener(MODE_KEY,   (n, o, v) => { if (v !== currentMode)    { currentMode = v;    init(true); } });
        GM_addValueChangeListener(THEME_KEY,  (n, o, v) => { if (v !== currentTheme)   { currentTheme = v;   init(true); } });
        GM_addValueChangeListener(ACCENT_KEY, (n, o, v) => { if (v !== currentAccent) { currentAccent = v;  init(true); } });
        GM_addValueChangeListener(POS_KEY, (n, o, v) => {
            floatingPos = v;
            const btn = document.getElementById('kinobox-floating-btn');
            if (btn && v) {
                btn.style.left = v.left + 'px';
                btn.style.top  = v.top  + '%';
            }
        });
        GM_addValueChangeListener(HOTKEY_KEY,     (n, o, v) => { currentHotkey = v; });
        GM_addValueChangeListener(PROVIDER_KEY,   (n, o, v) => { currentProvider = v; });
        GM_addValueChangeListener(CUSTOM_URL_KEY, (n, o, v) => { customUrl = v || ''; });
    }

    // ===== bfcache =====
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) init(false);
    });

    init(false);
})();
