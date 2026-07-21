/* PDF to JPG — render with PDF.js, zip output */
'use strict';
(function() {
  const P = window.PDF99;
  let file=null;

  function showThumb(f) {
    const el=P.$('thumbs'); if(!el) return;
    el.innerHTML='';
    const card=document.createElement('div');
    card.className='thumb';
    card.innerHTML=`<div class="thumb-actions"><button class="thumb-action-btn thumb-delete" aria-label="Remove"><img src="/src/icon/trash.svg" class="icon" alt=""></button></div>
      <div class="thumb-img-wrap" style="display:flex;align-items:center;justify-content:center;background:#f0f4f8">
        <img src="/src/icon/pdf-file.svg" style="width:48px;height:48px;filter:var(--f-red)" alt="PDF">
      </div>
      <span class="thumb-name">${P.escHtml(f.name)}</span>`;
    card.querySelector('.thumb-delete').onclick=()=>{
      file=null; el.innerHTML=''; P.$('toolArea').setAttribute('hidden','');P.$('resultArea').setAttribute('hidden','');P.$('dropzoneWrap').removeAttribute('hidden');
    };
    el.appendChild(card);
  }

  P.initDropzone({
    accept: f=>f.type==='application/pdf'||f.name.toLowerCase().endsWith('.pdf'),
    onFiles: list=>{file=list[0];showThumb(file);const fi=P.$('fileInfo');if(fi){fi.textContent=`${file.name} — ${(file.size/1024).toFixed(1)} KB`;fi.removeAttribute('hidden');}}
  });

  P.$('convertBtn')?.addEventListener('click',async()=>{
    if(!file){P.toast('Please select a PDF first.');return;}
    if(!window.pdfjsLib){P.toast('PDF.js engine loading — please wait.');return;}
    if(!window.JSZip){P.toast('ZIP engine loading…');return;}
    const btn=P.$('convertBtn');btn.disabled=true;const lbl=btn.textContent;btn.textContent='Converting…';
    try{
      pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const scale=parseFloat(P.$('optScale')?.value||'2');
      const quality=parseInt(P.$('qualitySlider')?.value||'92',10)/100;
      const ab=await file.arrayBuffer();
      const pdf=await pdfjsLib.getDocument({data:ab}).promise;
      const zip=new window.JSZip();
      const status=P.$('convertStatus');
      for(let i=1;i<=pdf.numPages;i++){
        if(status) status.textContent=`Rendering page ${i} of ${pdf.numPages}…`;
        const page=await pdf.getPage(i);
        const vp=page.getViewport({scale});
        const canvas=document.createElement('canvas');
        canvas.width=vp.width; canvas.height=vp.height;
        await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
        const blob=await new Promise(res=>canvas.toBlob(res,'image/jpeg',quality));
        zip.file(`page-${String(i).padStart(3,'0')}.jpg`,await blob.arrayBuffer());
      }
      if(status) status.textContent='';
      const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:4}});
      P.showResult(file.name.replace(/\.pdf$/i,'')+'-images.zip',`${pdf.numPages} JPG image${pdf.numPages>1?'s':''} · ${(blob.size/1024).toFixed(1)} KB`,blob, ()=>{ file=null; P.$('thumbs').innerHTML=''; const fi=P.$('fileInfo'); if(fi){ fi.setAttribute('hidden',''); fi.textContent=''; } });
      P.toast('✓ Done! Click Download to save.');
    }catch(err){console.error(err);P.toast('Conversion failed — please try again.');}
    finally{btn.disabled=false;btn.textContent=lbl;}
  });
})();
