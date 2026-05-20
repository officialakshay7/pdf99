/* Merge PDF — thumbs UI */
'use strict';
(function() {
  const P = window.PDF99;
  let files = [];

  P.initDropzone({
    multiple:true,
    accept: f => f.type==='application/pdf'||f.name.toLowerCase().endsWith('.pdf'),
    onFiles: list => { list.forEach(f=>files.push(f)); renderThumbs(); }
  });

  function renderThumbs() {
    const el=P.$('thumbs'); if(!el) return;
    el.innerHTML='';
    files.forEach((f,idx)=>{
      const card=document.createElement('div');
      card.className='thumb'; card.draggable=true; card.dataset.idx=idx; card.setAttribute('role','listitem');
      card.innerHTML=`<div class="thumb-actions">
        <button class="thumb-action-btn thumb-delete" aria-label="Remove ${P.escHtml(f.name)}"><img src="/src/icon/trash.svg" class="icon" alt=""></button>
      </div>
      <div class="thumb-img-wrap" style="display:flex;align-items:center;justify-content:center;background:#f0f4f8">
        <img src="/src/icon/pdf-file.svg" style="width:44px;height:44px;filter:var(--f-red)" alt="PDF">
      </div>
      <span class="thumb-name" title="${P.escHtml(f.name)}">${P.escHtml(f.name)}<br><small style="color:var(--text-muted)">${(f.size/1024).toFixed(0)} KB</small></span>`;
      card.querySelector('.thumb-delete').onclick=e=>{
        e.stopPropagation(); files.splice(idx,1);
        if(!files.length){P.$('toolArea').setAttribute('hidden','');P.$('dropzoneWrap').removeAttribute('hidden');}
        else renderThumbs();
      };
      card.addEventListener('dragstart',e=>{card.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(idx));});
      card.addEventListener('dragend',()=>card.classList.remove('dragging'));
      card.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='move';});
      card.addEventListener('drop',e=>{
        e.preventDefault();
        const from=parseInt(e.dataTransfer.getData('text/plain'),10),to=parseInt(card.dataset.idx,10);
        if(!isNaN(from)&&!isNaN(to)&&from!==to){const[m]=files.splice(from,1);files.splice(to,0,m);renderThumbs();}
      });
      el.appendChild(card);
    });
  }


  P.$('sortAzBtn')?.addEventListener('click', () => {
    files.sort((a,b) => a.name.localeCompare(b.name));
    renderThumbs(); P.toast('Sorted A → Z');
  });
  P.$('sortZaBtn')?.addEventListener('click', () => {
    files.sort((a,b) => b.name.localeCompare(a.name));
    renderThumbs(); P.toast('Sorted Z → A');
  });
  P.$('convertBtn')?.addEventListener('click', async()=>{
    if(files.length<2){P.toast('Add at least 2 PDF files to merge.');return;}
    if(!window.PDFLib){P.toast('PDF engine loading — please wait.');return;}
    const btn=P.$('convertBtn');btn.disabled=true;const lbl=btn.textContent;btn.textContent='Merging…';
    try{
      const{PDFDocument}=window.PDFLib;
      const merged=await PDFDocument.create();
      for(const f of files){
        const doc=await PDFDocument.load(await f.arrayBuffer(),{ignoreEncryption:true});
        const pages=await merged.copyPages(doc,doc.getPageIndices());
        pages.forEach(p=>merged.addPage(p));
      }
      const blob=new Blob([await merged.save()],{type:'application/pdf'});
      P.showResult('merged-'+new Date().toISOString().slice(0,10)+'.pdf',`${merged.getPageCount()} pages · ${(blob.size/1024).toFixed(1)} KB`,blob, ()=>{ files=[]; P.$('thumbs').innerHTML=''; });
      P.toast('✓ Merged! Click Download to save.');
    }catch(err){console.error(err);P.toast('Merge failed — a file may be encrypted or damaged.');}
    finally{btn.disabled=false;btn.textContent=lbl;}
  });
})();
