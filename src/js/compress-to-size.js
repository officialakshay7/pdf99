/* Compress PDF to target size
   The target KB comes from data-target-kb on the convert button.
   Algorithm: re-render pages via PDF.js at decreasing quality until
   the output fits within the target. Falls back to metadata-strip only
   if PDF.js is unavailable.
*/
'use strict';
(function() {
  const P = window.PDF99;
  let file = null;

  function showThumb(f) {
    const el = P.$('thumbs'); if (!el) return;
    el.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'thumb';
    card.innerHTML =
      `<div class="thumb-actions">
        <button class="thumb-action-btn thumb-delete" aria-label="Remove file">
          <img src="/src/icon/trash.svg" class="icon" alt="">
        </button>
       </div>
       <div class="thumb-img-wrap" style="display:flex;align-items:center;justify-content:center;background:#f0f4f8">
         <img src="/src/icon/pdf-file.svg" style="width:48px;height:48px;filter:var(--f-red)" alt="PDF file">
       </div>
       <span class="thumb-name">${P.escHtml(f.name)}</span>`;
    card.querySelector('.thumb-delete').onclick = () => {
      file = null;
      el.innerHTML = '';
      P.$('toolArea').setAttribute('hidden', '');
      P.$('resultArea')?.setAttribute('hidden', '');
      P.$('dropzoneWrap').removeAttribute('hidden');
    };
    el.appendChild(card);
    const si = P.$('fileSize');
    if (si) si.textContent = `Original: ${(f.size / 1024).toFixed(1)} KB`;
  }

  P.initDropzone({
    accept: f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
    onFiles: list => { file = list[0]; showThumb(file); }
  });

  P.$('convertBtn')?.addEventListener('click', async () => {
    if (!file) { P.toast('Please select a PDF first.'); return; }
    if (!window.PDFLib) { P.toast('PDF engine loading — please wait a moment.'); return; }

    // Read targetKB from the button's data attribute (set in HTML per page)
    const btn = P.$('convertBtn');
    const targetKB = parseInt(btn.dataset.targetKb || '100', 10);
    const targetBytes = targetKB * 1024;

    btn.disabled = true;
    const lbl = btn.textContent;
    btn.textContent = 'Compressing…';
    const status = P.$('compressStatus');

    try {
      const { PDFDocument } = window.PDFLib;

      // Read file once into a Uint8Array (avoids ArrayBuffer detachment issues)
      const rawBytes = new Uint8Array(await file.arrayBuffer());

      // ── Quick path: file already fits, just strip metadata ──────────────
      if (file.size <= targetBytes) {
        const doc = await PDFDocument.load(rawBytes.slice(), { ignoreEncryption: true });
        doc.setTitle(''); doc.setAuthor(''); doc.setSubject('');
        doc.setKeywords([]); doc.setProducer('PDF99'); doc.setCreator('PDF99');
        const bytes = await doc.save({ useObjectStreams: true });
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const name = file.name.replace(/\.pdf$/i, '') + `-${targetKB}kb.pdf`;
        P.showResult(name, `${(blob.size / 1024).toFixed(1)} KB — already within ${targetKB} KB target`, blob, ()=>{ file=null; P.$('thumbs').innerHTML=''; P.$('fileSize').textContent=''; });
        P.toast(`✓ Done! File was already under ${targetKB} KB.`);
        return;
      }

      // ── PDF.js path: re-render pages at lower quality ────────────────────
      if (!window.pdfjsLib) {
        // Fallback without PDF.js: metadata strip only
        if (status) status.textContent = 'PDF.js not loaded — stripping metadata only…';
        const doc = await PDFDocument.load(rawBytes.slice(), { ignoreEncryption: true });
        doc.setTitle(''); doc.setAuthor(''); doc.setSubject('');
        doc.setKeywords([]); doc.setProducer('PDF99'); doc.setCreator('PDF99');
        const bytes = await doc.save({ useObjectStreams: true });
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const name = file.name.replace(/\.pdf$/i, '') + `-${targetKB}kb.pdf`;
        const achieved = (blob.size / 1024).toFixed(1);
        const met = blob.size <= targetBytes;
        P.showResult(name, `${achieved} KB${met ? ' — ✓ within target' : ' — best metadata-strip result'} (target: ≤${targetKB} KB)`, blob, ()=>{ file=null; P.$('thumbs').innerHTML=''; P.$('fileSize').textContent=''; });
        P.toast(met ? `✓ Compressed to ${achieved} KB` : `Result: ${achieved} KB (target ${targetKB} KB)`);
        return;
      }

      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      // Load PDF.js doc once
      const pdfjs = await pdfjsLib.getDocument({ data: rawBytes.slice() }).promise;
      const totalPages = pdfjs.numPages;

      // Estimate a render scale proportional to desired compression ratio
      const ratio = targetBytes / file.size;
      const scale = Math.max(0.25, Math.min(1.2, Math.sqrt(ratio) * 1.8));

      // Load the original once for page size reference
      const srcDoc = await PDFDocument.load(rawBytes.slice(), { ignoreEncryption: true });

      let bestBlob = null;

      // Try quality levels from 0.7 down to 0.08
      const levels = [0.7, 0.55, 0.42, 0.3, 0.2, 0.12, 0.08];

      for (const q of levels) {
        if (status) status.textContent = `Trying quality ${Math.round(q * 100)}%…`;

        const newDoc = await PDFDocument.create();

        for (let i = 1; i <= totalPages; i++) {
          if (status) status.textContent = `Page ${i}/${totalPages} · quality ${Math.round(q * 100)}%`;

          const page = await pdfjs.getPage(i);
          const vp = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width  = Math.max(1, Math.round(vp.width));
          canvas.height = Math.max(1, Math.round(vp.height));
          await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;

          // Convert canvas to JPEG blob then to Uint8Array
          const jpgBlob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', q));
          const jpgBytes = new Uint8Array(await jpgBlob.arrayBuffer());
          const jpgImg   = await newDoc.embedJpg(jpgBytes);

          // Use original page dimensions
          const origPage = srcDoc.getPage(i - 1);
          const { width, height } = origPage.getSize();
          const p = newDoc.addPage([width, height]);
          p.drawImage(jpgImg, { x: 0, y: 0, width, height });
        }

        const outBytes = await newDoc.save();
        const blob = new Blob([outBytes], { type: 'application/pdf' });
        bestBlob = blob;

        if (blob.size <= targetBytes) break; // target met — stop
      }

      if (status) status.textContent = '';

      const name = file.name.replace(/\.pdf$/i, '') + `-${targetKB}kb.pdf`;
      const achieved = (bestBlob.size / 1024).toFixed(1);
      const met = bestBlob.size <= targetBytes;

      P.showResult(
        name,
        `${achieved} KB · ${met ? '✓ within target' : 'best result achieved'} (target: ≤${targetKB} KB)`,
        bestBlob
      );
      P.toast(met
        ? `✓ Compressed to ${achieved} KB!`
        : `Best result: ${achieved} KB (target was ${targetKB} KB)`
      );

    } catch (err) {
      console.error('compress-to-size error:', err);
      P.toast('Compression failed — the PDF may be encrypted or corrupted.');
    } finally {
      btn.disabled   = false;
      btn.textContent = lbl;
      if (status) status.textContent = '';
    }
  });
})();
