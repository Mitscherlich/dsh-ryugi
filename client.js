window.__ModuleLoader__.load({
  id: 'dsh-ryugi',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const VIEW_ID = 'ryugi';
    const TAB_ID = 'ryugi-artboard';
    const TAB_KIND = 'ryugi-artboard';
    const PRESET = 'design';
    const STATE_URL = '/ryugi/state';
    const POLL_MS = 2500;

    const DICT = {
      en: {
        title: 'Artboard',
        tab: 'Artboard',
        sidebarTab: 'Artboard',
        refresh: 'Refresh',
        error: 'Could not load artboards.',
        comments: 'comments',
        updated: 'Updated',
        loading: 'Loading…',
        emptyTitle: 'No artboards yet',
        emptyBody:
          'Ryugi mode draws the options on the Artboard: a screen, a flow, a mockup to pick between, or a design document to read.',
        emptyHint:
          'Start a Ryugi mode session and describe the task; the artboard appears here as soon as the agent opens one.',
        serverOffTitle: 'The artboard server is not running',
        serverOffBody:
          'The local artboard server starts the first time an agent opens an artifact in this project.',
        serverOffHint: 'Pick Refresh once a session has opened an artifact.',
        notServing:
          'This artifact belongs to another project than the one the local artboard server serves right now. Restart the server for that project to embed it.',
        external: 'Open in browser',
        switch: 'Artifact',
        blocked:
          'The inline artboard needs the Desktop app. Open it in the browser, or use DSH Desktop to see it here.',
        failed: 'The artboard page failed to load.',
        reload: 'Reload',
        surface: 'Ryugi artboard',
      },
      zh: {
        title: '画板',
        tab: '画板',
        sidebarTab: '画板',
        refresh: '刷新',
        error: '无法加载画板。',
        comments: '条评论',
        updated: '更新于',
        loading: '加载中…',
        emptyTitle: '还没有画板',
        emptyBody:
          '设计模式会把方案画在画板上：一个界面、一条流程、几版可挑选的稿子，或一份可阅读的设计文档。',
        emptyHint: '用设计模式开启会话并描述任务，智能体一打开画板就会显示在这里。',
        serverOffTitle: '画板服务尚未启动',
        serverOffBody: '智能体在这个项目里第一次打开产物时，本地画板服务会自动启动。',
        serverOffHint: '会话创建产物后点「刷新」即可。',
        notServing:
          '该产物属于另一个项目，本地画板服务当前服务的是别的项目。为该项目的画板重启服务后即可内嵌。',
        external: '在浏览器中打开',
        switch: '画板',
        blocked:
          '内嵌画板需要 Desktop 版；在浏览器里请用「在浏览器中打开」，或改用 DSH Desktop 查看。',
        failed: '画板页面加载失败。',
        reload: '重新加载',
        surface: 'Ryugi 画板',
      },
    };

    const ROOT_TOKENS =
      '--rg-bg:var(--dsw-alias-bg-base);--rg-layer:var(--dsw-alias-bg-layer-1);' +
      '--rg-text:var(--dsw-alias-label-primary,#1a1a1a);--rg-muted:var(--dsw-alias-label-secondary,#6b6b70);' +
      '--rg-tertiary:var(--dsw-alias-label-tertiary,#8e8e93);--rg-border:var(--dsw-alias-border-l1,rgba(0,0,0,.12));' +
      '--rg-hover:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05));--rg-accent:var(--dsw-alias-brand-primary,#3b82f6);' +
      '--rg-error:var(--dsw-alias-state-error-primary,#d9534f);--rg-font:var(--dsw-font-family,system-ui,-apple-system,sans-serif)';

    const CSS = [
      // The view is the page: no card, no toolbar, no composer underneath it.
      '[data-conversation-scroll]:has([data-ryugi-view])>[data-composer-seat]{display:none}',
      '.ryugi-view{' +
        ROOT_TOKENS +
        ';position:relative;display:flex;flex-direction:column;flex:1 1 auto;height:100%;min-height:0;overflow:hidden;background:var(--rg-bg);color:var(--rg-text);font-family:var(--rg-font)}',
      '.ryugi-float{position:absolute;top:10px;right:12px;z-index:5;display:flex;align-items:center;gap:2px;padding:3px;border:1px solid var(--rg-border);border-radius:10px;background:var(--rg-layer);background:color-mix(in srgb,var(--rg-layer) 88%,transparent);box-shadow:0 4px 14px rgba(0,0,0,.12);backdrop-filter:blur(8px)}',
      '.ryugi-iconbtn{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border:0;border-radius:7px;background:transparent;color:var(--rg-muted);cursor:pointer;text-decoration:none;font:inherit}',
      '.ryugi-iconbtn:hover{background:var(--rg-hover);color:var(--rg-text)}',
      '.ryugi-iconbtn:focus-visible{outline:2px solid var(--rg-accent);outline-offset:1px}',
      '.ryugi-picker-compact{height:28px;max-width:200px;padding:0 6px;border:0;background:transparent;color:var(--rg-text);font:inherit;font-size:12px}',
      '.ryugi-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 12px;border-bottom:1px solid var(--rg-border);background:var(--rg-layer);flex:0 0 auto}',
      '.ryugi-bar-left{display:flex;align-items:center;gap:8px;min-width:0}',
      '.ryugi-type{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--rg-tertiary)}',
      '.ryugi-name{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:46ch;color:var(--rg-text)}',
      '.ryugi-bar-right{display:flex;align-items:center;gap:8px;flex:0 0 auto}',
      '.ryugi-btn{border:1px solid var(--rg-border);background:var(--rg-layer);color:var(--rg-text);border-radius:8px;padding:4px 10px;cursor:pointer;font:inherit;font-size:12px}',
      '.ryugi-btn:hover{background:var(--rg-hover)}',
      '.ryugi-btn:focus-visible{outline:2px solid var(--rg-accent);outline-offset:2px}',
      '.ryugi-primary{border:1px solid transparent;background:var(--rg-accent);color:var(--dsw-alias-label-primary-inverted,#fff);border-radius:8px;padding:6px 14px;cursor:pointer;font:inherit;font-size:12px;font-weight:600}',
      '.ryugi-primary:hover{filter:brightness(1.06)}',
      '.ryugi-primary:focus-visible{outline:2px solid var(--rg-accent);outline-offset:3px}',
      '.ryugi-primary:disabled{cursor:default;opacity:.6}',
      '.ryugi-picker{border:1px solid var(--rg-border);background:var(--rg-layer);color:var(--rg-text);border-radius:8px;padding:4px 8px;font:inherit;font-size:12px;max-width:220px}',
      '.ryugi-surface{position:relative;flex:1 1 auto;min-height:0;background:var(--rg-bg)}',
      '.ryugi-frame{width:100%;height:100%;border:0;display:flex;background:var(--rg-bg)}',
      '.ryugi-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:10px;padding:24px;color:var(--rg-muted);background:var(--rg-bg)}',
      '.ryugi-overlay-card{display:flex;flex-direction:column;align-items:center;gap:12px;max-width:420px;padding:18px;border:1px solid var(--rg-border);border-radius:12px;background:var(--rg-layer);text-align:center}',
      '.ryugi-panel{display:flex;flex-direction:column;gap:10px;padding:16px;overflow:auto;flex:1 1 auto;min-height:0}',
      '.ryugi-list{display:flex;flex-direction:column;gap:8px;margin:0;padding:0;list-style:none}',
      '.ryugi-item{display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;padding:10px 12px;border:1px solid var(--rg-border);border-radius:10px;background:var(--rg-layer);color:var(--rg-text);font:inherit;text-align:left;cursor:pointer;text-decoration:none}',
      '.ryugi-item:hover{background:var(--rg-hover)}',
      '.ryugi-item[data-active=true]{border-color:var(--rg-accent)}',
      '.ryugi-item-name{font-weight:500;flex:1 1 160px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.ryugi-meta{font-size:12px;color:var(--rg-muted)}',
      '.ryugi-path{flex-basis:100%;font-size:11px;color:var(--rg-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.ryugi-note{margin:0;padding:8px 10px;border:1px solid var(--rg-border);border-radius:8px;background:var(--rg-bg);color:var(--rg-muted);font-size:12px;line-height:1.5}',
      '.ryugi-error{border:1px solid var(--rg-error);color:var(--rg-error);border-radius:8px;padding:8px 12px;margin:12px;font-size:12px}',
      '.ryugi-link{color:var(--rg-accent);text-decoration:none;font-size:12px}',
      '.ryugi-link:hover{text-decoration:underline}',
      '.ryugi-empty-state{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:36px 24px;text-align:center;background:var(--rg-bg)}',
      '.ryugi-empty-glyph{display:flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:16px;border:1px solid var(--rg-border);background:var(--rg-layer);color:var(--rg-accent)}',
      '.ryugi-empty-title{margin:6px 0 0;font-size:15px;font-weight:600;color:var(--rg-text)}',
      '.ryugi-empty-body{margin:0;max-width:46ch;font-size:13px;line-height:1.55;color:var(--rg-muted)}',
      '.ryugi-empty-hint{margin:0;max-width:46ch;font-size:12px;line-height:1.5;color:var(--rg-tertiary)}',
      '.ryugi-empty-actions{display:flex;align-items:center;gap:8px;margin-top:10px}',
      '.ryugi-sidebar{' +
        ROOT_TOKENS +
        ';display:flex;flex-direction:column;height:100%;min-height:0;background:var(--rg-layer);color:var(--rg-text);font-family:var(--rg-font)}',
      '.ryugi-sidebar .ryugi-bar{padding:6px 10px}',
      '.ryugi-sidebar .ryugi-name{max-width:26ch}',
      '.ryugi-sidebar .ryugi-empty-state{padding:28px 16px;gap:8px}',
      '.ryugi-sidebar .ryugi-empty-glyph{width:44px;height:44px;border-radius:13px}',
      '.ryugi-sidebar .ryugi-empty-title{font-size:14px}',
      '.ryugi-sidebar .ryugi-empty-body,.ryugi-sidebar .ryugi-empty-hint{font-size:12px}',
      '@media (max-width:640px){.ryugi-float{top:8px;right:8px}}',
    ];

    function langOf() {
      try {
        const html = typeof document !== 'undefined' ? document.documentElement.lang || '' : '';
        return /^zh/i.test(html) ? 'zh' : 'en';
      } catch {
        return 'en';
      }
    }

    function detectLang(ctx) {
      try {
        const loc = ctx && (ctx.locale || (ctx.get && ctx.get('locale')));
        const snap =
          loc && (loc.getSnapshot ? loc.getSnapshot() : loc.getLocale && loc.getLocale());
        const id = (snap && (snap.locale || snap.id)) || (typeof snap === 'string' ? snap : '');
        if (String(id).toLowerCase().startsWith('zh')) return 'zh';
        if (String(id).length > 0) return 'en';
      } catch {
        // Best effort: never block the artboard surface.
      }
      return langOf();
    }

    function useT(ctx) {
      const [, bump] = React.useReducer((n) => n + 1, 0);
      React.useEffect(() => {
        try {
          const loc = ctx.locale || (ctx.get && ctx.get('locale'));
          if (loc && loc.subscribe) return loc.subscribe(bump);
        } catch {
          // Best effort: never block the artboard surface.
        }
        return undefined;
      }, []);
      const lang = detectLang(ctx);
      return (k) => (DICT[lang] && DICT[lang][k]) || DICT.en[k] || k;
    }

    function createStore(initial) {
      let value = initial;
      const listeners = new Set();
      return {
        get() {
          return value;
        },
        set(next) {
          value = next;
          for (const listener of listeners) {
            try {
              listener();
            } catch {
              // Best effort: never block the artboard surface.
            }
          }
        },
        subscribe(listener) {
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        },
      };
    }

    function useSnapshot(store) {
      const [snapshot, setSnapshot] = React.useState(store.get());
      React.useEffect(() => store.subscribe(() => setSnapshot(store.get())), []);
      return snapshot;
    }

    function desktopBridge() {
      try {
        const desktop = globalThis.dshDesktop;
        if (
          desktop &&
          desktop.protocolVersion === 1 &&
          desktop.browser &&
          typeof desktop.browser.acquire === 'function'
        ) {
          return desktop.browser;
        }
      } catch {
        // Best effort: never block the artboard surface.
      }
      return undefined;
    }

    function belongsTo(project, cwd) {
      if (!project || !cwd) return true;
      const a = String(project).replace(/[\\/]+$/, '');
      const b = String(cwd).replace(/[\\/]+$/, '');
      return a === b || a.indexOf(b + '/') === 0 || b.indexOf(a + '/') === 0;
    }

    function fmtDate(ms) {
      try {
        const d = new Date(ms);
        return Number.isFinite(d.getTime()) ? d.toLocaleString() : '—';
      } catch {
        return '—';
      }
    }

    function ArtboardSurface({ url, workspace, reloadToken, t }) {
      const hostRef = React.useRef(null);
      const runtime = React.useRef({
        el: null,
        lease: null,
        bridge: null,
        ready: false,
        pending: null,
        loaded: null,
        disposed: false,
      });
      const [status, setStatus] = React.useState('loading');

      const applyUrl = React.useCallback((next) => {
        if (!next) return;
        const rt = runtime.current;
        if (!rt.ready || !rt.el) {
          rt.pending = next;
          return;
        }
        if (rt.loaded === next) return;
        rt.loaded = next;
        setStatus('loading');
        try {
          const result = rt.el.loadURL(next);
          if (result && typeof result.catch === 'function')
            result.catch(() => {
              setStatus('failed');
            });
        } catch {
          setStatus('failed');
        }
      }, []);

      React.useEffect(() => {
        const bridge = desktopBridge();
        const rt = runtime.current;
        if (!bridge) {
          setStatus('blocked');
          return undefined;
        }
        rt.bridge = bridge;
        let dead = false;
        (async () => {
          try {
            const reservation = await bridge.acquire(workspace || 'dsh-ryugi');
            if (dead) {
              Promise.resolve(bridge.release(reservation.lease)).catch(() => {});
              return;
            }
            rt.lease = reservation.lease;
            const host = hostRef.current;
            if (!host) {
              rt.lease = null;
              Promise.resolve(bridge.release(reservation.lease)).catch(() => {});
              return;
            }
            const el = document.createElement('webview');
            el.className = 'ryugi-frame';
            el.setAttribute('partition', reservation.partition);
            el.setAttribute('allowpopups', '');
            el.setAttribute('src', 'about:blank#' + reservation.lease);
            el.addEventListener('dom-ready', () => {
              rt.ready = true;
              setStatus('ready');
              if (rt.pending) {
                const pending = rt.pending;
                rt.pending = null;
                applyUrl(pending);
              }
            });
            el.addEventListener('did-fail-load', (event) => {
              if (event && event.isMainFrame && event.errorCode !== -3) setStatus('failed');
            });
            el.addEventListener('render-process-gone', () => {
              rt.ready = false;
              setStatus('failed');
            });
            host.appendChild(el);
            rt.el = el;
            if (url) applyUrl(url);
          } catch {
            if (!dead) setStatus('failed');
          }
        })();
        return () => {
          dead = true;
          rt.disposed = true;
          rt.ready = false;
          const el = rt.el;
          rt.el = null;
          if (el) {
            try {
              el.remove();
            } catch {
              // Best effort: never block the artboard surface.
            }
          }
          const lease = rt.lease;
          rt.lease = null;
          if (lease) {
            try {
              Promise.resolve(bridge.release(lease)).catch(() => {});
            } catch {
              // Best effort: never block the artboard surface.
            }
          }
        };
      }, []);

      React.useEffect(() => {
        applyUrl(url);
      }, [url, applyUrl]);

      React.useEffect(() => {
        if (!reloadToken) return;
        const rt = runtime.current;
        if (rt.el && rt.ready) {
          setStatus('loading');
          try {
            const result = rt.el.loadURL(url || rt.loaded || 'about:blank');
            if (result && typeof result.catch === 'function')
              result.catch(() => {
                setStatus('failed');
              });
          } catch {
            setStatus('failed');
          }
        }
      }, [reloadToken]);

      let overlay = null;
      if (status === 'loading') overlay = h('div', { className: 'ryugi-overlay' }, t('loading'));
      else if (status === 'failed')
        overlay = h(
          'div',
          { className: 'ryugi-overlay' },
          h(
            'div',
            { className: 'ryugi-overlay-card' },
            h('p', { className: 'ryugi-note' }, t('failed')),
            h(
              'button',
              {
                className: 'ryugi-primary',
                type: 'button',
                onClick: () => {
                  const rt = runtime.current;
                  if (!rt.el) return;
                  setStatus('loading');
                  try {
                    const result = rt.el.loadURL(url || rt.loaded || 'about:blank');
                    if (result && typeof result.catch === 'function')
                      result.catch(() => setStatus('failed'));
                  } catch {
                    setStatus('failed');
                  }
                },
              },
              t('reload'),
            ),
          ),
        );
      else if (status === 'blocked')
        overlay = h('div', { className: 'ryugi-overlay' }, t('blocked'));

      return h(
        'div',
        { className: 'ryugi-surface', 'aria-label': t('surface') },
        h('div', { ref: hostRef, style: { position: 'absolute', inset: 0 } }),
        overlay,
      );
    }

    function formatList(items, t) {
      return h(
        'ul',
        { className: 'ryugi-list' },
        items.map((item) => {
          const key = item.project + '::' + item.type + '::' + item.id;
          return h(
            'li',
            { key },
            h(
              'a',
              {
                className: 'ryugi-item',
                href: item.url || '#',
                target: '_blank',
                rel: 'noopener noreferrer',
              },
              h('span', { className: 'ryugi-type' }, item.type),
              h('span', { className: 'ryugi-item-name' }, item.title || item.id),
              h('span', { className: 'ryugi-meta' }, (item.comments || 0) + ' ' + t('comments')),
              h('span', { className: 'ryugi-meta' }, t('updated') + ' ' + fmtDate(item.mtime)),
              h('span', { className: 'ryugi-path' }, item.project),
            ),
          );
        }),
      );
    }

    function ArtboardGlyph({ size = 24 }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          'aria-hidden': true,
        },
        h('rect', {
          x: 3,
          y: 4,
          width: 18,
          height: 16,
          rx: 3.5,
          stroke: 'currentColor',
          strokeWidth: 1.5,
        }),
        h('path', { d: 'M3 9h18M9 9v10.5', stroke: 'currentColor', strokeWidth: 1.5 }),
        h('path', {
          d: 'M12.5 13h5M12.5 16.5h3',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
        }),
      );
    }

    function Notice({ children }) {
      return h('p', { className: 'ryugi-note' }, children);
    }

    /** Placeholder while a session has no artifact yet, or no server to serve one. */
    function EmptyState({ t, running, loading, compact, onRefresh }) {
      return h(
        'div',
        { className: 'ryugi-empty-state' },
        h('div', { className: 'ryugi-empty-glyph' }, h(ArtboardGlyph, { size: compact ? 20 : 26 })),
        h(
          'h2',
          { className: 'ryugi-empty-title' },
          running ? t('emptyTitle') : t('serverOffTitle'),
        ),
        h('p', { className: 'ryugi-empty-body' }, running ? t('emptyBody') : t('serverOffBody')),
        h('p', { className: 'ryugi-empty-hint' }, running ? t('emptyHint') : t('serverOffHint')),
        h(
          'div',
          { className: 'ryugi-empty-actions' },
          h(
            'button',
            {
              className: 'ryugi-primary',
              type: 'button',
              onClick: onRefresh,
              disabled: loading === true,
            },
            loading ? t('loading') : t('refresh'),
          ),
        ),
      );
    }

    function disposeOf(value) {
      try {
        if (typeof value === 'function') {
          value();
          return;
        }
        if (value && typeof value.dispose === 'function') {
          value.dispose();
          return;
        }
        if (value && typeof value[Symbol.dispose] === 'function') {
          value[Symbol.dispose]();
        }
      } catch {
        // Best effort: never block the artboard surface.
      }
    }

    function toolbarOf(chosen, snapshot, activeKey, picked, setPicked, options) {
      const { t, bridge, reload, refresh } = options;
      return h(
        'div',
        { className: 'ryugi-bar' },
        h(
          'div',
          { className: 'ryugi-bar-left' },
          chosen ? h('span', { className: 'ryugi-type' }, chosen.type) : null,
          h('span', { className: 'ryugi-name' }, chosen ? chosen.title || chosen.id : t('title')),
        ),
        h(
          'div',
          { className: 'ryugi-bar-right' },
          snapshot.artifacts.length > 1 && setPicked
            ? h(
                'select',
                {
                  className: 'ryugi-picker',
                  'aria-label': t('switch'),
                  value: picked || activeKey || '',
                  onChange: (event) => setPicked(event.target.value || null),
                },
                snapshot.artifacts.map((item) => {
                  const value = item.project + '::' + item.type + '::' + item.id;
                  return h(
                    'option',
                    { key: value, value },
                    (item.title || item.id) + ' · ' + item.type,
                  );
                }),
              )
            : null,
          bridge && chosen && chosen.url && reload
            ? h(
                'button',
                { className: 'ryugi-btn', type: 'button', onClick: () => reload() },
                t('reload'),
              )
            : null,
          h(
            'button',
            {
              className: 'ryugi-btn',
              type: 'button',
              onClick: () => {
                refresh();
              },
            },
            t('refresh'),
          ),
          chosen && chosen.url
            ? h(
                'a',
                {
                  className: 'ryugi-link',
                  href: chosen.url,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                },
                t('external'),
              )
            : null,
        ),
      );
    }

    return {
      inject: ['slots', 'sessions', 'uiSession', 'uiConversation'],
      apply(ctx) {
        const store = createStore({
          loading: true,
          error: false,
          server: { running: false },
          active: null,
          artifacts: [],
        });
        let offTab = null;
        let timer = null;
        let lastTickAt = 0;
        let lastSession;
        let lastKey = null;
        let registered = false;

        const currentSessionId = () => {
          try {
            const snapshot = ctx.uiSession.adapter.current.getSnapshot();
            return snapshot && typeof snapshot.key === 'string' ? snapshot.key : undefined;
          } catch {
            return undefined;
          }
        };
        const rowOf = (id) => {
          try {
            return ctx.sessions.list.getSnapshot().byId[id];
          } catch {
            return undefined;
          }
        };
        const presetOf = (id) => {
          const row = rowOf(id);
          const value = row && row.projectionValues ? row.projectionValues.agentPreset : undefined;
          return typeof value === 'string' ? value : undefined;
        };
        const cwdOf = (id) => {
          const row = rowOf(id);
          return row && typeof row.cwd === 'string' ? row.cwd : '';
        };
        /** A client service, whether or not this module declares it in inject. */
        const serviceOf = (name) => {
          try {
            const direct = ctx[name];
            if (direct) return direct;
          } catch {
            // Best effort: never block the artboard surface.
          }
          try {
            return ctx.get ? ctx.get(name) : undefined;
          } catch {
            return undefined;
          }
        };
        let openController;
        const sidebarRight = () => {
          if (openController) return openController;
          const service = serviceOf('sidebarRight');
          return service && typeof service.openTab === 'function' ? service : undefined;
        };
        const loadState = async (cwd) => {
          try {
            const query = cwd ? STATE_URL + '?cwd=' + encodeURIComponent(cwd) : STATE_URL;
            const response = await fetch(query, { credentials: 'same-origin', cache: 'no-store' });
            if (!response.ok) throw new Error(String(response.status));
            const json = await response.json();
            return {
              loading: false,
              error: false,
              server: json.server || { running: false },
              active: json.active || null,
              artifacts: Array.isArray(json.artifacts) ? json.artifacts : [],
            };
          } catch {
            return { ...store.get(), loading: false, error: true };
          }
        };
        const refresh = () => {
          const id = currentSessionId();
          if (!id) {
            store.set({ ...store.get(), loading: false });
            return Promise.resolve(store.get());
          }
          store.set({ ...store.get(), loading: true });
          return loadState(cwdOf(id)).then((next) => {
            store.set(next);
            return next;
          });
        };
        /** Open the right sidebar on the artboard; the conversation keeps its view. */
        let warnedOpen = false;
        const openArtboard = (key) => {
          const service = sidebarRight();
          if (!service) {
            if (!warnedOpen) {
              warnedOpen = true;
              console.warn(
                '[ryugi] the right sidebar is unavailable; the artboard stays in the 画板 view',
              );
            }
            return false;
          }
          try {
            service.openTab(TAB_KIND, { params: key ? { artifact: key } : {} });
            return true;
          } catch (error) {
            if (!warnedOpen) {
              warnedOpen = true;
              console.warn('[ryugi] cannot open the artboard tab:', error);
            }
            return false;
          }
        };
        const keyOf = (state) =>
          state && state.active
            ? state.active.project + '::' + state.active.type + '::' + state.active.id
            : null;
        const projectionRetries = new Set();
        const tick = async () => {
          const id = currentSessionId();
          if (!id) return;
          if (Date.now() - lastTickAt < 800) return;
          lastTickAt = Date.now();
          try {
            const cwd = cwdOf(id);
            const next = await loadState(cwd);
            const key = keyOf(next);
            const isNewSession = id !== lastSession;
            if (isNewSession) {
              lastSession = id;
              lastKey = key;
            }
            store.set(next);
            if (registered && !isNewSession && key !== lastKey) {
              lastKey = key;
              // A new artifact is the moment the human needs to see it, so the
              // right sidebar opens on the artboard instead of waiting to be found.
              if (key && belongsTo(next.active.project, cwd)) openArtboard(key);
            }
          } catch {
            // A failed poll keeps the last good snapshot; the next tick retries.
          }
        };

        function View() {
          const t = useT(ctx);
          const snapshot = useSnapshot(store);
          const [picked, setPicked] = React.useState(null);
          const activeKey = keyOf(snapshot);
          React.useEffect(() => {
            setPicked(null);
          }, [activeKey]);

          const chosen = picked
            ? snapshot.artifacts.find(
                (item) => item.project + '::' + item.type + '::' + item.id === picked,
              ) || snapshot.active
            : snapshot.active;
          const bridge = desktopBridge();
          const id = currentSessionId();
          const cwd = id ? cwdOf(id) : '';
          const workspace = cwd ? 'cwd:' + cwd : id ? 'session:' + id : 'dsh-ryugi';
          const running = snapshot.server && snapshot.server.running;

          let body;
          if (!snapshot.artifacts.length) {
            body = h(EmptyState, {
              t,
              running,
              loading: snapshot.loading,
              onRefresh: () => {
                refresh().catch(function () {});
              },
            });
          } else if (bridge && running && chosen && chosen.url) {
            body = h(ArtboardSurface, {
              key: 'surface',
              url: chosen.url,
              workspace,
              t,
            });
          } else {
            body = h(
              'div',
              { className: 'ryugi-panel' },
              !running ? h(Notice, null, t('serverOffBody')) : null,
              !bridge ? h(Notice, null, t('blocked')) : null,
              formatList(snapshot.artifacts, t),
            );
          }

          return h(
            React.Fragment,
            null,
            h('style', null, CSS),
            h(
              'section',
              {
                className: 'ryugi-view',
                'data-ryugi-view': '',
                'data-conversation-composer-overlay': '',
                'aria-label': t('title'),
              },
              snapshot.artifacts.length > 1
                ? h(
                    'div',
                    { className: 'ryugi-float' },
                    h(
                      'select',
                      {
                        className: 'ryugi-picker-compact',
                        'aria-label': t('switch'),
                        value: picked || activeKey || '',
                        onChange: (event) => setPicked(event.target.value || null),
                      },
                      snapshot.artifacts.map((item) => {
                        const value = item.project + '::' + item.type + '::' + item.id;
                        return h(
                          'option',
                          { key: value, value },
                          (item.title || item.id) + ' · ' + item.type,
                        );
                      }),
                    ),
                  )
                : null,
              snapshot.error
                ? h('div', { className: 'ryugi-error', role: 'alert' }, t('error'))
                : null,
              body,
            ),
          );
        }

        function SidebarArtboard(props) {
          const t = useT(ctx);
          const snapshot = useSnapshot(store);
          const [reloadToken, setReloadToken] = React.useState(0);
          const sessionId =
            props && typeof props.sessionId === 'string' ? props.sessionId : currentSessionId();
          const cwd = sessionId ? cwdOf(sessionId) : '';
          const bridge = desktopBridge();
          const running = snapshot.server && snapshot.server.running;
          const scoped = snapshot.artifacts.filter((item) => belongsTo(item.project, cwd));
          const chosen = scoped[0] || snapshot.active;

          React.useEffect(() => {
            if (!sessionId) return;
            refresh().catch(function () {});
          }, [sessionId]);

          let body;
          if (!chosen) {
            body = h(EmptyState, {
              t,
              running,
              loading: snapshot.loading,
              compact: true,
              onRefresh: () => {
                refresh().catch(function () {});
              },
            });
          } else if (bridge && running && chosen.url) {
            body = h(ArtboardSurface, {
              url: chosen.url,
              workspace: cwd ? 'cwd:' + cwd : 'dsh-ryugi',
              reloadToken,
              t,
            });
          } else {
            body = h(
              'div',
              { className: 'ryugi-panel' },
              !running ? h(Notice, null, t('serverOffBody')) : null,
              !chosen.url ? h(Notice, null, t('notServing')) : null,
              !bridge && chosen.url ? h(Notice, null, t('blocked')) : null,
              chosen.url
                ? h(
                    'a',
                    {
                      className: 'ryugi-link',
                      href: chosen.url,
                      target: '_blank',
                      rel: 'noopener noreferrer',
                    },
                    t('external'),
                  )
                : null,
            );
          }

          return h(
            React.Fragment,
            null,
            h('style', null, CSS),
            h(
              'section',
              { className: 'ryugi-sidebar', 'aria-label': t('surface') },
              toolbarOf(chosen, snapshot, keyOf(snapshot), null, null, {
                t,
                bridge,
                reload: () => setReloadToken((n) => n + 1),
                refresh: () => {
                  refresh().catch(function () {});
                },
              }),
              snapshot.error
                ? h('div', { className: 'ryugi-error', role: 'alert' }, t('error'))
                : null,
              body,
            ),
          );
        }

        const show = () => {
          if (offTab) return;
          const disposer = ctx.slots.inject('conversation.view', () =>
            ctx.slots.register(
              {
                name: 'conversation.view',
                id: VIEW_ID,
                // After 对话 (0) and 轨迹 (10).
                order: 20,
                label: () => DICT[detectLang(ctx)].tab,
              },
              View,
            ),
          );
          offTab = disposer || (() => {});
        };
        const hide = () => {
          if (!offTab) return;
          const disposer = offTab;
          offTab = null;
          disposeOf(disposer);
        };
        const sync = () => {
          const id = currentSessionId();
          const preset = id === undefined ? undefined : presetOf(id);
          if (id !== undefined && preset === undefined && !projectionRetries.has(id)) {
            projectionRetries.add(id);
            try {
              const pending = ctx.sessions.refreshProjections(id);
              if (pending && typeof pending.catch === 'function') pending.catch(function () {});
            } catch {
              // Best effort: never block the artboard surface.
            }
          }
          const wanted = preset === PRESET;
          try {
            if (wanted) show();
            else hide();
          } catch {
            // Best effort: never block the artboard surface.
          }
          registered = wanted;
          if (!wanted) {
            lastSession = undefined;
            lastKey = null;
            const current = store.get();
            if (
              current.active ||
              current.artifacts.length ||
              current.error ||
              (current.server && current.server.running)
            ) {
              store.set({
                loading: false,
                error: false,
                server: { running: false },
                active: null,
                artifacts: [],
              });
            }
          } else {
            tick().catch(function () {});
          }
        };

        ctx.effect(() => {
          // The right sidebar owns the artboard tab type; its body renders the
          // same surface as the full 画板 view. Registered once for the plugin's
          // lifetime so an open tab survives a preset switch.
          const disposers = [];
          // The service may not be provided yet while this module applies, so
          // the tab type is registered as soon as the sidebar exists.
          try {
            ctx.inject(['sidebarRight'], (child) => {
              openController = child.sidebarRight;
            });
          } catch {
            // Best effort: never block the artboard surface.
          }
          try {
            ctx.inject(['sidebarRightTabs'], (child) => {
              child.effect(
                () =>
                  child.sidebarRightTabs.register({
                    id: TAB_ID,
                    kind: TAB_KIND,
                    title: () => DICT[detectLang(ctx)].sidebarTab,
                  }),
                'ryugi: artboard tab type',
              );
            });
          } catch {
            // Best effort: never block the artboard surface.
          }
          try {
            const dispose = ctx.slots.inject('sidebar.right.pane.tab', () =>
              ctx.slots.register(
                {
                  name: 'sidebar.right.pane.tab',
                  key: TAB_ID,
                  inject: (sessionId) => ({ sessionId }),
                },
                SidebarArtboard,
              ),
            );
            if (dispose) disposers.push(dispose);
          } catch {
            // Best effort: never block the artboard surface.
          }

          const offCurrent = ctx.uiSession.adapter.current.subscribe(sync);
          const offList = ctx.sessions.list.subscribe(sync);
          timer = setInterval(() => {
            tick().catch(function () {});
          }, POLL_MS);
          if (timer && typeof timer.unref === 'function') timer.unref();
          sync();
          return () => {
            if (timer) {
              clearInterval(timer);
              timer = null;
            }
            try {
              offCurrent();
            } catch {
              // Best effort: never block the artboard surface.
            }
            try {
              offList();
            } catch {
              // Best effort: never block the artboard surface.
            }
            for (const dispose of disposers) disposeOf(dispose);
            hide();
          };
        }, 'ryugi: artboard views');
      },
    };
  },
});
