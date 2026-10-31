// Fork additions for the AuroraUnraid, loaded on every page by AuroraUnraid.page:
//   - Quick Actions buttons: hidden / re-ordered as chosen on the settings page
//   - the "Hidden groups" eye button (hides chosen Docker groups on the Docker tab and Dashboard)
//   - tiles hidden on the Settings and Tools pages
//   - the Unraid logo link switched off or pointed somewhere else
//   - the footer's "manual" button
// The settings come from window.auroraUi and window.auroraHidden (set in AuroraUnraid.page).
(function () {
  'use strict';

  const BASE = ((document.currentScript && document.currentScript.src) || '').replace(/\/scripts\/[^/]*$/, '');
  const UI = window.auroraUi || {};
  const UNGROUPED = '__ungrouped__';
  const state = {
    enabled: Boolean(window.auroraHidden && window.auroraHidden.enabled),
    names: Array.isArray(window.auroraHidden && window.auroraHidden.names) ? window.auroraHidden.names.slice() : [],
  };

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // ---------------------------------------------------------------- Quick Actions

  function quickBox() {
    return document.querySelector('.nav-tile.right');
  }

  // The buttons of the Quick Actions: Unraid's own (lock, terminal, help, ...), plugins' and ours.
  function quickItems(box) {
    box = box || quickBox();
    if (!box) return [];
    return [...box.children].filter(function (node) {
      if (node.matches('.usage-bar, .tp-usage') || !node.matches('.nav-item, .nav-user')) return false;
      return node.children.length > 0 || node.textContent.trim() !== '';
    });
  }

  // A stable name for a button: our own data attribute, else its classes ("HelpButton"), else
  // the end of its address, else its title.
  function quickKey(node) {
    let key = node.dataset && node.dataset.tpQa;
    if (!key) {
      const classes = [...node.classList].filter(function (name) {
        return !/^(nav-item|nav-user|util|active|hidden|show|hide|open)$/.test(name) && !/^tp-/.test(name);
      });
      const anchor = node.querySelector('a[href]');
      const href = (anchor && anchor.getAttribute('href')) || '';
      if (classes.length) key = classes.join('.');
      else if (href && href !== '#' && !/^javascript:/i.test(href)) key = 'href:' + (href.replace(/[?#].*$/, '').split('/').filter(Boolean).pop() || href);
      else key = 'text:' + ((anchor && (anchor.title || anchor.textContent)) || node.title || 'button').trim().toLowerCase();
    }
    return key.replace(/[^A-Za-z0-9_.:-]+/g, '_').slice(0, 120);
  }

  function quickLabel(node) {
    if (node.dataset && node.dataset.tpLabel) return node.dataset.tpLabel;
    const anchor = node.querySelector('a');
    const label = (anchor && anchor.getAttribute('title')) || node.getAttribute('title')
      || (anchor && anchor.querySelector('span') && anchor.querySelector('span').textContent) || '';
    return label.replace(/\s+/g, ' ').trim() || quickKey(node).replace(/^(href|text):/, '');
  }

  function quickIcon(node) {
    const icon = node.querySelector('a b, a i, a svg, a img');
    return icon ? icon.cloneNode(true) : null;
  }

  // Whether the menu really shows the button (some plugins add empty entries).
  function quickShown(node) {
    // Disk Viewer and Stream Viewer add a dummy button here and show their own badge in the
    // header instead (they hide the dummy a moment after the page loads).
    if (node.matches('.DiskViewerButton, .StreamViewerButton')) return false;
    const wasHidden = node.classList.contains('tp-qa-hidden');
    if (wasHidden) node.classList.remove('tp-qa-hidden');
    const shown = node.offsetWidth > 0 && node.offsetHeight > 0;
    if (wasHidden) node.classList.add('tp-qa-hidden');
    return shown;
  }

  function applyQuickActions() {
    const box = quickBox();
    if (!box) return;
    const hidden = new Set(UI.qaHidden || []);
    const order = UI.qaOrder || [];
    quickItems(box).forEach(function (node) {
      const key = quickKey(node);
      node.classList.toggle('tp-qa-hidden', hidden.has(key));
      if (!order.length) {
        if (node.style.order) node.style.order = '';
        return;
      }
      const index = order.indexOf(key);
      // Buttons the list does not know (new plugins) go last.
      node.style.order = String(index === -1 ? order.length + 1 : index + 1);
    });
  }

  // ---------------------------------------------------------------- Hidden groups

  const EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>';
  const EYE_SHOWN = EYE + '</svg>';
  const EYE_HIDDEN = EYE + '<path d="M4 4l16 16"/></svg>';

  let eyeItem = null;
  let popup = null;

  function saveHidden() {
    const body = new URLSearchParams({ state: JSON.stringify({ enabled: state.enabled, names: state.names }), csrf_token: window.csrf_token || '' });
    fetch(BASE + '/include/hidden-groups.php', { method: 'POST', credentials: 'same-origin', body: body })
      .then(function (response) { if (!response.ok) throw new Error('status ' + response.status); })
      .catch(function (error) { console.error('AuroraUnraid: hidden groups not saved', error); });
  }

  function refreshEye() {
    if (!eyeItem) return;
    eyeItem.classList.toggle('tp-hg-on', state.enabled);
    const icon = eyeItem.querySelector('b');
    // The picture shows what a click does: the plain eye shows the hidden groups again, the
    // crossed-out eye hides them.
    if (icon) icon.innerHTML = state.enabled ? EYE_SHOWN : EYE_HIDDEN;
    const anchor = eyeItem.querySelector('a');
    anchor.title = state.enabled ? 'Hidden groups are hidden (click to choose or show them)' : 'Hidden groups';
    anchor.setAttribute('aria-label', anchor.title);
  }

  function ensureEyeButton() {
    const box = quickBox();
    if (!box) return;
    if (eyeItem && eyeItem.parentElement === box) return;
    eyeItem = box.querySelector('.tp-hide-groups');
    if (eyeItem) return;
    eyeItem = el('div', 'nav-item tp-hide-groups');
    eyeItem.dataset.tpQa = 'hide-groups';
    eyeItem.dataset.tpLabel = 'Hidden groups';
    const anchor = el('a');
    anchor.href = '#';
    anchor.append(el('b', 'system'), el('span', '', 'Hidden groups'));
    anchor.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (popup) closePopup();
      else openPopup(anchor);
    });
    eyeItem.append(anchor);
    box.append(eyeItem);
    refreshEye();
    applyQuickActions();
  }

  function groupNames() {
    const fallback = (Array.isArray(window.auroraDockerGroups) ? window.auroraDockerGroups : []).map(function (group) { return group.name; });
    // The saved groups, so a group created a moment ago is in the list.
    return fetch(BASE + '/include/docker-groups.php', { credentials: 'same-origin' })
      .then(function (response) { return response.json(); })
      .then(function (data) { return (data.groups || []).map(function (group) { return group.name; }); })
      .catch(function () { return fallback; });
  }

  function placePopup(anchor) {
    if (!popup) return;
    const rect = anchor.getBoundingClientRect();
    const width = popup.offsetWidth;
    const height = popup.offsetHeight;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    let top = rect.top > window.innerHeight / 2 ? rect.top - height - 10 : rect.bottom + 10;
    top = Math.max(8, Math.min(top, window.innerHeight - height - 8));
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
  }

  function closePopup() {
    if (popup) popup.remove();
    popup = null;
    document.removeEventListener('pointerdown', outside, true);
    document.removeEventListener('keydown', escape, true);
  }

  function outside(event) {
    if (popup && !popup.contains(event.target) && !(eyeItem && eyeItem.contains(event.target))) closePopup();
  }

  function escape(event) {
    if (event.key === 'Escape') closePopup();
  }

  function openPopup(anchor) {
    popup = el('div', 'tp-hg-popup');
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-label', 'Hidden groups');
    popup.append(el('h3', '', 'Hidden groups'));
    const master = el('button', 'tp-hg-master');
    master.type = 'button';
    const list = el('div', 'tp-hg-list');
    popup.append(master, list);
    const showMaster = function () {
      master.textContent = state.enabled ? 'Hiding is ON - click to show' : 'Hiding is OFF - click to hide';
      master.classList.toggle('tp-on', state.enabled);
    };
    master.addEventListener('click', function () {
      state.enabled = !state.enabled;
      showMaster();
      refreshEye();
      saveHidden();
      applyHiddenGroups();
    });
    showMaster();
    document.body.append(popup);
    placePopup(anchor);
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', escape, true);

    groupNames().then(function (names) {
      if (!popup) return;
      if (!names.length) {
        list.append(el('p', 'tp-hg-note', 'There are no Docker groups yet. Create groups on the Docker tab, then choose here which of them to hide.'));
      } else {
        names.concat([UNGROUPED]).forEach(function (name) {
          const row = el('label', 'tp-hg-row');
          const box = el('input');
          box.type = 'checkbox';
          box.checked = state.names.includes(name);
          box.addEventListener('change', function () {
            state.names = state.names.filter(function (other) { return other !== name; });
            if (box.checked) state.names.push(name);
            saveHidden();
            applyHiddenGroups();
          });
          row.append(box, el('span', '', name === UNGROUPED ? 'Ungrouped' : name));
          list.append(row);
        });
        list.append(el('p', 'tp-hg-note', 'Tick the groups to hide, then switch hiding on. Hidden groups disappear from the Docker tab and the Dashboard.'));
      }
      placePopup(anchor);
    });
  }

  // Docker tab: a section's header row and its container rows. Dashboard: the group's chip and
  // the panel under it. Only the theme's own groups; FolderView's folders are left alone.
  function applyHiddenGroups() {
    const current = [...document.querySelectorAll('.tp-hidden-group')];
    if (!current.length && !(state.enabled && state.names.length)) return;
    const wanted = new Set();
    if (state.enabled && state.names.length) {
      const names = new Set(state.names);
      if (/^\/Docker\/?$/.test(location.pathname)) {
        document.querySelectorAll('tr.tp-group').forEach(function (row) {
          const key = row.tpKey;
          if (typeof key !== 'string') return;
          const name = key === '\u0000ungrouped' ? UNGROUPED : key.startsWith('g:') ? key.slice(2) : null;
          if (name === null || !names.has(name)) return;
          wanted.add(row);
          (row.tpItems || []).forEach(function (item) { if (item && item.row) wanted.add(item.row); });
        });
      }
      document.querySelectorAll('.tp-group-chip.apps').forEach(function (chip) {
        const nameNode = chip.querySelector('.tp-group-chip-name');
        const text = nameNode ? nameNode.textContent.trim() : '';
        if (!names.has(text === 'Ungrouped' && !names.has('Ungrouped') ? UNGROUPED : text)) return;
        wanted.add(chip);
        const panel = chip.nextElementSibling;
        if (panel && panel.classList.contains('tp-group-panel')) wanted.add(panel);
      });
    }
    current.forEach(function (node) { if (!wanted.has(node)) node.classList.remove('tp-hidden-group'); });
    wanted.forEach(function (node) { if (!node.classList.contains('tp-hidden-group')) node.classList.add('tp-hidden-group'); });
  }

  // ---------------------------------------------------------------- Settings and Tools tiles

  // "Tools/Diagnostics" for a tile linking to /Tools/Diagnostics; empty for any other link.
  function panelKey(anchor, kind) {
    let parts;
    try { parts = new URL(anchor.getAttribute('href'), location.origin).pathname.split('/').filter(Boolean); } catch (error) { return ''; }
    if (parts.length < 2 || (kind && parts[0].toLowerCase() !== kind.toLowerCase())) return '';
    if (!/^(Settings|Tools)$/i.test(parts[0])) return '';
    return (parts[0][0].toUpperCase() + parts[0].slice(1).toLowerCase() + '/' + parts[1]).replace(/[^A-Za-z0-9_.:/-]+/g, '_');
  }

  // Never hidden, so the settings can always be reached again.
  const KEEP = new Set(['Settings/AuroraUnraidSettings']);

  function applyPanels() {
    const page = (location.pathname.split('/')[1] || '').toLowerCase();
    const hidden = page === 'settings' ? UI.hideSettings : page === 'tools' ? UI.hideTools : null;
    if (!hidden) return;
    const set = new Set(hidden);
    let heading = null;
    let total = 0;
    let hiddenCount = 0;
    // A category whose tiles are all hidden loses its title too.
    const finish = function () {
      if (heading) heading.classList.toggle('tp-hidden-item', total > 0 && hiddenCount === total);
    };
    document.querySelectorAll('div.title, .Panel').forEach(function (node) {
      if (!node.classList.contains('Panel')) {
        finish();
        heading = node;
        total = 0;
        hiddenCount = 0;
        return;
      }
      const anchor = node.querySelector('a[href]');
      const key = anchor ? panelKey(anchor, page) : '';
      const hide = Boolean(key) && set.has(key) && !KEEP.has(key);
      node.classList.toggle('tp-hidden-item', hide);
      if (key) {
        total += 1;
        if (hide) hiddenCount += 1;
      }
    });
    finish();
  }

  // The tiles of the Settings or Tools page for the settings page's toggles: read from the page
  // itself, so plugins' tiles are in the list too. [{ key, label, section }]
  function fetchPanels(kind) {
    return fetch('/' + kind, { credentials: 'same-origin' })
      .then(function (response) { return response.text(); })
      .then(function (html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const found = [];
        const seen = new Set();
        let section = '';
        doc.querySelectorAll('div.title, .Panel').forEach(function (node) {
          if (!node.classList.contains('Panel')) {
            const text = node.textContent.replace(/\s+/g, ' ').trim();
            if (text) section = text;
            return;
          }
          const anchor = node.querySelector('a[href]');
          const key = anchor ? panelKey(anchor, kind) : '';
          if (!key || seen.has(key) || KEEP.has(key)) return;
          seen.add(key);
          const textNode = node.querySelector('.PanelText');
          const iconNode = node.querySelector('a > span > *');
          found.push({ key: key, label: ((textNode || anchor).textContent || '').replace(/\s+/g, ' ').trim() || key, section: section, icon: iconNode ? document.importNode(iconNode, true) : null });
        });
        return found;
      });
  }

  // ---------------------------------------------------------------- Unraid logo link

  function logoAnchor() {
    const root = document.querySelector('#header unraid-header-os-version');
    if (!root) return null;
    return [...root.querySelectorAll('a')].find(function (anchor) {
      return anchor.querySelector('svg, img') && !anchor.closest('[role="button"]');
    }) || null;
  }

  function applyLogo() {
    const logo = UI.logo || {};
    if (logo.mode !== 'disabled' && logo.mode !== 'custom') return;
    const anchor = logoAnchor();
    if (!anchor) return;
    if (logo.mode === 'disabled') {
      anchor.classList.add('tp-logo-off');
      anchor.setAttribute('tabindex', '-1');
      anchor.setAttribute('aria-disabled', 'true');
      return;
    }
    if (anchor.getAttribute('href') !== logo.url) anchor.setAttribute('href', logo.url);
    if (logo.target === 'blank') {
      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'noopener noreferrer');
    } else if (anchor.hasAttribute('target')) {
      anchor.removeAttribute('target');
    }
  }

  // Taken before Unraid's own handlers, so the logo never goes where it used to.
  document.addEventListener('click', function (event) {
    const logo = UI.logo || {};
    if (logo.mode !== 'disabled' && logo.mode !== 'custom') return;
    const anchor = event.target.closest && event.target.closest('#header unraid-header-os-version a');
    if (!anchor || anchor !== logoAnchor()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (logo.mode !== 'custom') return;
    if (logo.target === 'blank') window.open(logo.url, '_blank', 'noopener,noreferrer');
    else location.href = logo.url;
  }, true);

  // ---------------------------------------------------------------- Footer

  function trimFooter() {
    const footer = document.getElementById('copyright');
    if (!footer) return;
    footer.querySelectorAll('a').forEach(function (anchor) {
      if (/^\s*manual\s*$/i.test(anchor.textContent)) anchor.classList.add('tp-hidden-item');
    });
  }

  // ---------------------------------------------------------------- Apps: collapsible categories

  const CA_KEY = 'auroraunraid.caCollapsed';
  const CA_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/></svg>';

  function refreshCaButton(button) {
    const collapsed = document.documentElement.classList.contains('tp-ca-collapsed');
    button.title = collapsed ? 'Show the categories' : 'Hide the categories';
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
  }

  // Community Applications' menu on the left ("Home", "Installed Apps", the categories) gets a
  // button to fold it away. The choice is kept in this browser, also across reloads.
  function applyApps() {
    const menu = document.querySelector('.menuItems');
    if (!menu || !menu.parentElement) return;
    const before = menu.previousElementSibling;
    if (before && before.classList.contains('tp-ca-toggle-wrap')) return;
    const wrap = el('div', 'tp-ca-toggle-wrap');
    const button = el('button', 'tp-ca-toggle');
    button.type = 'button';
    button.innerHTML = CA_ICON;
    button.addEventListener('click', function () {
      const collapsed = !document.documentElement.classList.contains('tp-ca-collapsed');
      document.documentElement.classList.toggle('tp-ca-collapsed', collapsed);
      try { localStorage.setItem(CA_KEY, collapsed ? '1' : '0'); } catch (error) { /* private mode */ }
      refreshCaButton(button);
    });
    refreshCaButton(button);
    wrap.append(button);
    menu.parentElement.insertBefore(wrap, menu);
  }

  // The Quick Actions stay out of sight until they are in their final order, so they appear
  // together instead of one by one while the page loads.
  function revealQuickActions() {
    document.documentElement.classList.remove('tp-qa-pending');
  }

  // ---------------------------------------------------------------- Docker: ports of routed and host containers

  // Unraid's "LAN IP:Port" is empty for a container routed through another one (qbittorrent
  // through nordlynx) and shows only the address, with "all", for one on the host network
  // (Jellyfin, Homebridge). include/docker-ports.php reads their ports from their templates.
  let dockerPorts = null;
  let dockerPortsAt = 0;
  let dockerPortsLoading = false;

  function loadDockerPorts() {
    if (dockerPortsLoading || (dockerPorts && Date.now() - dockerPortsAt < 60000)) return;
    dockerPortsLoading = true;
    fetch(BASE + '/include/docker-ports.php', { credentials: 'same-origin' })
      .then(function (response) { return response.json(); })
      .then(function (data) { dockerPorts = data; dockerPortsAt = Date.now(); schedule(); })
      .catch(function () { dockerPorts = dockerPorts || { host: '', containers: {} }; dockerPortsAt = Date.now(); })
      .then(function () { dockerPortsLoading = false; });
  }

  function applyDockerPorts() {
    if (!/^\/Docker\/?$/.test(location.pathname)) return;
    const rows = document.querySelectorAll('#docker_list > tr');
    let wanted = false;
    rows.forEach(function (row) {
      const portCell = row.querySelector('td.tp-c-ports');
      const nameNode = row.querySelector('td.ct-name .appname');
      if (!portCell || !nameNode || row.dataset.tpPorts) return;
      wanted = true;
      if (!dockerPorts) return;
      const entry = dockerPorts.containers && dockerPorts.containers[nameNode.textContent.trim()];
      row.dataset.tpPorts = '1';
      if (!entry || !entry.running || !entry.ports.length) return;
      const address = dockerPorts.host || (portCell.textContent.match(/\d+\.\d+\.\d+\.\d+/) || [''])[0];
      if (!address) return;
      const fill = function (cell, lines) {
        const box = cell && (cell.querySelector('.docker_readmore') || cell);
        if (box) box.innerHTML = lines.map(function (line) { return line.replace(/[&<>]/g, ''); }).join('<br>');
        if (cell) cell.classList.remove('tp-c-empty');
      };
      fill(portCell, entry.ports.map(function (port) { return address + ':' + port.host; }));
      fill(row.querySelector('td.tp-c-cport'), entry.ports.map(function (port) { return port.target + ':' + port.proto.toUpperCase(); }));
    });
    if (wanted && !dockerPorts) loadDockerPorts();
  }

  // ---------------------------------------------------------------- Run

  function run() {
    ensureEyeButton();
    applyQuickActions();
    applyHiddenGroups();
    applyPanels();
    applyLogo();
    trimFooter();
    applyApps();
    applyDockerPorts();
  }

  let timer = 0;
  function schedule() {
    if (timer) return;
    timer = setTimeout(function () {
      timer = 0;
      try { run(); } catch (error) { console.error('AuroraUnraid:', error); }
    }, 120);
  }

  // For the settings page.
  window.auroraTweaks = { quickItems: quickItems, quickKey: quickKey, quickLabel: quickLabel, quickIcon: quickIcon, quickShown: quickShown, fetchPanels: fetchPanels, run: run };

  try { run(); } catch (error) { console.error('AuroraUnraid:', error); }
  // Unraid's header parts, the Docker list and the Dashboard tiles draw themselves after the page.
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('load', function () {
    schedule();
    const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    fonts.then(function () { setTimeout(revealQuickActions, 60); });
  });
  // In case the page never finishes loading.
  setTimeout(revealQuickActions, 4000);
})();
