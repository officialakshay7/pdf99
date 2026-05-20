/* Split PDF — render page thumbnails, click-select, page range input, zip/single */
'use strict';
(function() {
  const P = window.PDF99;
  let srcDoc=null, pdfJsDoc=null, file=null, pageCount=0;
  let selectedPages=new Set(); // empty = all selected

  P.initDropzone({
    accept: f => f.type==='application/pdf'||f.name.toLowerCase().endsWith('.pdf'),
    onFiles: async list => { file=list[0]; await loadPdf(file); }
  });

  async function loadPdf(f) {
    if(!window.PDFLib||!window.pdfjsLib){ P.toast('PDF engines loading — please wait a moment then try again.'); return; }
    const btn=P.$('convertBtn'); if(btn){btn.disabled=true;btn.textContent='Loading PDF…';}
    try{
      pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const ab=await f.arrayBuffer();
      srcDoc=await window.PDFLib.PDFDocument.load(ab,{ignoreEncryption:true});
      pdfJsDoc=await pdfjsLib.getDocument({data:ab.slice(0)}).promise;
      pageCount=srcDoc.getPageCount();
      selectedPages=new Set(); // all by default
      // Show controls
      const pi=P.$('pageInfo'); if(pi) pi.textContent=`${pageCount} page${pageCount>1?'s':''}`;
      const ri=P.$('optRange'); if(ri) ri.placeholder=`e.g. 1-3, 5, 7-${pageCount}`;
      ['selectAll','selectNone'].forEach(id=>{ const el=P.$(id); if(el) el.style.display='inline-flex'; });
      renderPageThumbs();
      updateInfo();
    }catch(e){ P.toast('Could not read PDF — it may be password-protected.'); }
    finally{ if(btn){btn.disabled=false;btn.textContent='Extract Pages';} }
  }

  function renderPageThumbs() {
    const el=P.$('thumbs'); if(!el) return;
    el.innerHTML='';
    for(let i=0;i<pageCount;i++){
      const idx=i;
      const card=document.createElement('div');
      card.className='thumb thumb-selectable'; card.dataset.idx=idx; card.setAttribute('role','listitem');
      if(selectedPages.size===0||selectedPages.has(idx)) card.classList.add('thumb-selected');
      const canvas=document.createElement('canvas'); canvas.width=96; canvas.height=126;
      card.innerHTML=`<div class="thumb-actions"><span class="thumb-page-num">p.${idx+1}</span></div><div class="thumb-img-wrap"></div><span class="thumb-name">Page ${idx+1}</span>`;
      card.querySelector('.thumb-img-wrap').appendChild(canvas);
      renderPageToCanvas(idx, canvas);
      card.addEventListener('click', ()=>{
        if(selectedPages.size===0){ for(let j=0;j<pageCount;j++) if(j!==idx) selectedPages.add(j); }
        else { if(selectedPages.has(idx)) selectedPages.delete(idx); else selectedPages.add(idx); if(selectedPages.size===pageCount) selectedPages.clear(); }
        el.querySelectorAll('.thumb').forEach((c,j)=>{ c.classList.toggle('thumb-selected', selectedPages.size===0||selectedPages.has(j)); });
        syncRangeInput();
        updateInfo();
      });
      el.appendChild(card);
    }
  }

  async function renderPageToCanvas(pageIdx, canvas) {
    if(!pdfJsDoc) return;
    try{
      const page=await pdfJsDoc.getPage(pageIdx+1);
      const vp=page.getViewport({scale:0.4});
      canvas.width=Math.round(vp.width); canvas.height=Math.round(vp.height);
      await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
    }catch(e){}
  }

  // Sync range input to reflect current thumbnail selection
  function syncRangeInput() {
    const ri=P.$('optRange'); if(!ri) return;
    if(selectedPages.size===0){ ri.value=''; return; }
    const sorted=[...selectedPages].sort((a,b)=>a-b);
    // Compress to ranges
    const ranges=[];
    let start=sorted[0], prev=sorted[0];
    for(let i=1;i<sorted.length;i++){
      if(sorted[i]===prev+1){ prev=sorted[i]; }
      else{ ranges.push(start===prev?`${start+1}`:`${start+1}-${prev+1}`); start=prev=sorted[i]; }
    }
    ranges.push(start===prev?`${start+1}`:`${start+1}-${prev+1}`);
    ri.value=ranges.join(', ');
  }

  // Apply typed range to thumbnail selection
  function applyRangeInput() {
    const ri=P.$('optRange'); if(!ri||!ri.value.trim()){ selectedPages.clear(); }
    else{
      selectedPages.clear();
      ri.value.split(',').forEach(part=>{
        part=part.trim();
        if(part.includes('-')){
          const[a,b]=part.split('-').map(n=>parseInt(n.trim())-1);
          for(let i=Math.max(0,a);i<=Math.min(pageCount-1,b);i++) selectedPages.add(i);
        } else { const n=parseInt(part)-1; if(n>=0&&n<pageCount) selectedPages.add(n); }
      });
      if(selectedPages.size===pageCount) selectedPages.clear();
    }
    // Refresh thumb highlights
    P.$('thumbs')?.querySelectorAll('.thumb').forEach((c,j)=>{ c.classList.toggle('thumb-selected', selectedPages.size===0||selectedPages.has(j)); });
    updateInfo();
  }

  P.$('optRange')?.addEventListener('change', applyRangeInput);
  P.$('applyRange')?.addEventListener('click', applyRangeInput);
  P.$('optRange')?.addEventListener('keyup', e => { if(e.key==='Enter') applyRangeInput(); });

  function updateInfo() {
    const count=selectedPages.size===0?pageCount:selectedPages.size;
    const info=P.$('selectionInfo'); if(info) info.textContent=`${count} of ${pageCount} page${pageCount>1?'s':''} selected`;
  }

  P.$('selectAll')?.addEventListener('click', ()=>{
    selectedPages.clear();
    P.$('thumbs')?.querySelectorAll('.thumb').forEach(c=>c.classList.add('thumb-selected'));
    const ri=P.$('optRange'); if(ri) ri.value='';
    updateInfo();
  });
  P.$('selectNone')?.addEventListener('click', ()=>{
    for(let i=0;i<pageCount;i++) selectedPages.add(i); selectedPages.clear();
    P.$('thumbs')?.querySelectorAll('.thumb').forEach(c=>c.classList.remove('thumb-selected'));
    const info=P.$('selectionInfo'); if(info) info.textContent='0 pages selected';
    const ri=P.$('optRange'); if(ri) ri.value='';
  });

  P.$('convertBtn')?.addEventListener('click', async ()=>{
    if(!srcDoc){ P.toast('Upload a PDF first.'); return; }
    if(!window.JSZip){ P.toast('ZIP engine loading — please wait.'); return; }

    // Re-apply typed range just in case
    if(P.$('optRange')?.value.trim()) applyRangeInput();

    const indices=selectedPages.size===0?[...Array(pageCount).keys()]:[...selectedPages].sort((a,b)=>a-b);
    if(!indices.length){ P.toast('Select at least one page to extract.'); return; }

    const asSingle=P.$('optSingle')?.checked;
    const btn=P.$('convertBtn'); btn.disabled=true; const lbl=btn.textContent; btn.textContent='Extracting…';
    try{
      const{PDFDocument}=window.PDFLib;
      const status=P.$('splitStatus');
      if(asSingle){
        const out=await PDFDocument.create();
        const copied=await out.copyPages(srcDoc,indices);
        copied.forEach(p=>out.addPage(p));
        const blob=new Blob([await out.save()],{type:'application/pdf'});
        P.showResult(file.name.replace(/\.pdf$/i,'')+'-extracted.pdf',`${indices.length} page${indices.length>1?'s':''} · ${(blob.size/1024).toFixed(1)} KB`,blob, ()=>{ srcDoc=null; pdfJsDoc=null; file=null; pageCount=0; selectedPages=new Set(); P.$('thumbs').innerHTML=''; ['selectAll','selectNone'].forEach(id=>{const el=P.$(id);if(el)el.style.display='none';}); P.$('selectionInfo').textContent=''; P.$('pageInfo').textContent=''; });
      } else {
        const zip=new window.JSZip();
        for(const pi of indices){
          if(status) status.textContent=`Extracting page ${pi+1}…`;
          const out=await PDFDocument.create();
          const[cp]=await out.copyPages(srcDoc,[pi]); out.addPage(cp);
          zip.file(`page-${String(pi+1).padStart(3,'0')}.pdf`, await out.save());
        }
        if(status) status.textContent='';
        const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
        P.showResult(file.name.replace(/\.pdf$/i,'')+'-split.zip',`${indices.length} page${indices.length>1?'s':''} as ZIP · ${(blob.size/1024).toFixed(1)} KB`,blob);
      }
      P.toast('✓ Done! Click Download to save.');
    }catch(err){ console.error(err); P.toast('Extraction failed — please try again.'); }
    finally{ btn.disabled=false; btn.textContent=lbl; }
  });
})();
