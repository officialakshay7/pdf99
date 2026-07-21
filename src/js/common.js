/* ================================================
   PDF99 — common.js
   Load with defer. DOM is ready when defer runs.
   ================================================ */
'use strict';


// Google Analytics lazy loading
(function(){
  var loaded=false;
  function loadGA(){
    if(loaded)return;
    loaded=true;
    var s=document.createElement('script');
    s.src='https://www.googletagmanager.com/gtag/js?id=G-Y576NQ0ESJ';
    s.async=true;
    document.head.appendChild(s);
    window.dataLayer=window.dataLayer||[];
    function gtag(){dataLayer.push(arguments);}
    gtag('js',new Date());
    gtag('config','G-Y576NQ0ESJ',{'transport_type':'beacon','send_page_view':true});
    window.gtag=gtag;
  }
  window.addEventListener('scroll',loadGA,{once:true,passive:true});
  window.addEventListener('click',loadGA,{once:true,passive:true});
  window.addEventListener('touchstart',loadGA,{once:true,passive:true});
  setTimeout(loadGA,5000);
})();
// Google Analytics lazy loading ends here

window.PDF99 = (function () {
  const P = {};

  P.$ = id => document.getElementById(id);
  P.escHtml = s => String(s).replace(/[&<>"']/g,
    c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  /* ── Toast ─────────────────────────────────── */
  let _toastTimer = null;
  P.toast = msg => {
    const el = P.$('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  };

  /* ── Theme ──────────────────────────────────── */
  P.applyTheme = dark => {
    if (dark) document.documentElement.setAttribute('data-theme', 'dark');
    else      document.documentElement.removeAttribute('data-theme');
    const m = P.$('moonIcon'), s = P.$('sunIcon');
    if (m) m.style.display = dark ? 'none'  : 'block';
    if (s) s.style.display = dark ? 'block' : 'none';
  };
  P.applyTheme(localStorage.getItem('pdf99-theme') === 'dark');
  P.$('themeToggle')?.addEventListener('click', () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    P.applyTheme(!dark);
    localStorage.setItem('pdf99-theme', dark ? 'light' : 'dark');
  });

  /* ── Drawer ─────────────────────────────────── */
  function openDrawer()  { P.$('drawer')?.classList.add('open');    P.$('drawerOverlay')?.classList.add('open'); }
  function closeDrawer() { P.$('drawer')?.classList.remove('open'); P.$('drawerOverlay')?.classList.remove('open'); }
  P.$('drawerClose')?.addEventListener('click', closeDrawer);
  P.$('drawerOverlay')?.addEventListener('click', closeDrawer);
  document.querySelectorAll('.drawer-item, .drawer-link')
    .forEach(a => a.addEventListener('click', closeDrawer));

  /* ── Mega Menu ──────────────────────────────── */
  const megaMenu   = P.$('megaMenu');
  const megaToggle = P.$('megaMenuToggle');
  function openMegaMenu()  { megaMenu?.removeAttribute('hidden'); megaToggle?.setAttribute('aria-expanded','true'); }
  function closeMegaMenu() { megaMenu?.setAttribute('hidden',''); megaToggle?.setAttribute('aria-expanded','false'); }
  if (megaToggle) {
    megaToggle.addEventListener('click', e => {
      e.stopPropagation();
      window.innerWidth <= 900 ? openDrawer()
        : (megaMenu?.hasAttribute('hidden') ? openMegaMenu() : closeMegaMenu());
    });
  }
  P.$('megaMenuBackdrop')?.addEventListener('click', closeMegaMenu);
  document.querySelectorAll('.mega-link').forEach(a => a.addEventListener('click', closeMegaMenu));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeMegaMenu(); closeDrawer(); }
  });

  /* ── QA Accordion ────────────────────────────── */
  document.querySelectorAll('.qa-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const exp = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!exp));
      const panel = P.$(btn.getAttribute('aria-controls'));
      if (panel) panel.toggleAttribute('hidden', exp);
    });
  });

  /* ── Tools list ─────────────────────────────── */
  P.TOOLS = [
    {name:'JPG to PDF',            icon:'image',        href:'/jpg-to-pdf/'           },
    {name:'Compress PDF',          icon:'compress',     href:'/compress-pdf/'         },
    {name:'Merge PDF',             icon:'merge',        href:'/merge-pdf/'            },
    {name:'Split PDF',             icon:'split',        href:'/split-pdf/'            },
    {name:'PDF to JPG',            icon:'image',        href:'/pdf-to-jpg/'           },
    {name:'HTML to PDF',           icon:'html',         href:'/html-to-pdf/'          },
    {name:'Rotate PDF',            icon:'rotate',       href:'/rotate-pdf/'           },
    {name:'Watermark PDF',         icon:'watermark',    href:'/watermark-pdf/'        },
    {name:'Compress to 500KB',     icon:'compress',     href:'/compress-pdf-to-500kb/'},
    {name:'Compress to 200KB',     icon:'compress',     href:'/compress-pdf-to-200kb/'},
    {name:'Compress to 100KB',     icon:'compress',     href:'/compress-pdf-to-100kb/'},
    {name:'Compress to 50KB',      icon:'compress',     href:'/compress-pdf-to-50kb/' },
    {name:'Protect PDF',           icon:'protect',      href:'/protect-pdf/'          },
    {name:'Unlock PDF',            icon:'unlock',       href:'/unlock-pdf/'           },
    {name:'Sign PDF',              icon:'sign',         href:'/sign-pdf/'             },
    {name:'Edit PDF',              icon:'edit',         href:'/edit-pdf/'             },
    {name:'Extract Images',        icon:'extract',      href:'#'                      },
    {name:'Remove Pages',          icon:'remove-pages', href:'#'                      },
    {name:'Extract Pages',         icon:'extract',      href:'#'                      },
    {name:'Rearrange Pages',       icon:'rearrange',    href:'#'                      },
    {name:'Web to PDF',            icon:'web',          href:'#'                      },
    {name:'PDF OCR',               icon:'ocr',          href:'#'                      },
    {name:'Page Numbers',          icon:'page-numbers', href:'#'                      },
    {name:'Compare PDFs',          icon:'compare',      href:'#'                      },
    {name:'Optimize PDF',          icon:'optimize',     href:'#'                      },
    {name:'Redact PDF',            icon:'redact',       href:'#'                      },
    {name:'Create PDF',            icon:'create',       href:'#'                      },
    {name:'PDF Converter',         icon:'convert',      href:'#'                      },
  ];

  /* ── Tools grid ──────────────────────────────── */
  const grid = P.$('toolsGrid');
  if (grid) {
    P.TOOLS.forEach(({ name, icon, href }) => {
      const a = document.createElement('a');
      a.href = href; a.className = 'tool-card'; a.setAttribute('role','listitem');
      if (href === '#') a.addEventListener('click', e => { e.preventDefault(); P.toast(name + ' — coming soon'); });
      a.innerHTML =
        `<img src="/src/icon/star.svg" class="star-icon" alt="" aria-hidden="true">` +
        `<div class="tool-thumb"><img src="/src/icon/${P.escHtml(icon)}.svg" class="icon-lg tool-icon" alt="" aria-hidden="true"></div>` +
        `<span class="tool-name">${P.escHtml(name)}</span>`;
      grid.appendChild(a);
    });
  }

  /* ── Smart filename truncation ───────────────── */
  P.truncateName = (filename, maxLen = 40) => {
    if (!filename || filename.length <= maxLen) return filename;
    const dotIdx = filename.lastIndexOf('.');
    if (dotIdx === -1) return filename.slice(0, maxLen - 3) + '...';
    const ext  = filename.slice(dotIdx);              // e.g. ".pdf"
    const base = filename.slice(0, dotIdx);
    const half = Math.floor((maxLen - ext.length - 3) / 2);
    if (half < 3) return filename.slice(0, maxLen - 3) + '...';
    return base.slice(0, half) + '…' + base.slice(-half) + ext;
  };

  /* ── Shared dropzone ─────────────────────────── */
  P.initDropzone = function({ accept, onFiles, multiple = false }) {
    const wrap  = P.$('dropzoneWrap');
    const zone  = P.$('dropzone');
    const input = P.$('fileInput');
    if (!zone || !input) return;

    if (multiple) input.setAttribute('multiple', '');
    else          input.removeAttribute('multiple');

    const process = list => {
      const ok = Array.from(list).filter(accept);
      if (!ok.length) { P.toast('Unsupported file type — please try again.'); return; }
      onFiles(ok);
      const ta = P.$('toolArea');
      const firstUpload = ta && ta.hasAttribute('hidden');
      wrap?.setAttribute('hidden', '');
      if (ta) {
        ta.removeAttribute('hidden');
        if (firstUpload) ta.scrollIntoView({ behavior:'smooth', block:'nearest' });
      }
    };

    P.$('chooseBtn')?.addEventListener('click',  () => input.click());
    P.$('addMoreBtn')?.addEventListener('click', () => input.click());
    input.addEventListener('change', e => { process(e.target.files); input.value = ''; });
    zone.addEventListener('dragenter', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', e => { e.preventDefault(); zone.classList.remove('dragover'); });
    zone.addEventListener('drop', e => {
      e.preventDefault(); zone.classList.remove('dragover');
      if (e.dataTransfer?.files?.length) process(e.dataTransfer.files);
    });
    P.$('protectionInfo')?.addEventListener('click', () =>
      P.toast('Files are SSL-encrypted and auto-deleted within 1 hour.'));
  };

  /* ── Show result + start-over ────────────────── */
  P.showResult = function(filename, meta, blob, onStartOver) {
    const rn = P.$('resultName');
    const rm = P.$('resultMeta');
    const ra = P.$('resultArea');
    const db = P.$('downloadBtn');
    const sb = P.$('startOverBtn');
    if (!rn || !rm || !ra || !db) return;

    rn.textContent = P.truncateName(filename);
    rn.title = filename;   // full name on hover
    rm.textContent = meta;
    ra.removeAttribute('hidden');
    ra.scrollIntoView({ behavior:'smooth', block:'nearest' });

    db.onclick = () => {
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href:url, download:filename });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    };

    if (sb) {
      sb.onclick = () => {
        ra.setAttribute('hidden', '');
        if (typeof onStartOver === 'function') {
          onStartOver();
        } else {
          // Default: reset the page
          P.$('toolArea')?.setAttribute('hidden', '');
          P.$('dropzoneWrap')?.removeAttribute('hidden');
          P.$('thumbs') && (P.$('thumbs').innerHTML = '');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
    }
  };

  return P;
})();
