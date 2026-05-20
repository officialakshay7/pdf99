/* Compress PDF — real compression with DPI and quality slider */
'use strict';
(function() {
  const P = window.PDF99;
  let file = null, pdfDoc = null;

  // Thumb card for the single PDF file
  function showThumb(f) {
    const el = P.$('thumbs');
    if (!el) return;
    el.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'thumb';
    card.innerHTML = `
      <div class="thumb-actions">
        <button class="thumb-action-btn thumb-delete" aria-label="Remove"><img src="/src/icon/trash.svg" class="icon" alt=""></button>
      </div>
      <div class="thumb-img-wrap" style="display:flex;align-items:center;justify-content:center;background:#f0f4f8">
        <img src="/src/icon/pdf-file.svg" style="width:48px;height:48px;filter:var(--f-red)" alt="PDF">
      </div>
      <span class="thumb-name" title="${P.escHtml(f.name)}">${P.escHtml(f.name)}</span>`;
    card.querySelector('.thumb-delete').onclick = () => {
      file=null; pdfDoc=null; el.innerHTML='';
      P.$('toolArea').setAttribute('hidden','');
      P.$('resultArea').setAttribute('hidden','');
      P.$('dropzoneWrap').removeAttribute('hidden');
    };
    el.appendChild(card);
  }

  P.initDropzone({
    accept: f => f.type==='application/pdf'||f.name.toLowerCase().endsWith('.pdf'),
    onFiles: async list => {
      file=list[0]; showThumb(file);
      const si=P.$('fileSize'); if(si) si.textContent=`Original: ${(file.size/1024).toFixed(1)} KB`;
      if(window.PDFLib){
        try{
          pdfDoc=await window.PDFLib.PDFDocument.load(await file.arrayBuffer(),{ignoreEncryption:true});
          const pi=P.$('pageInfo'); if(pi) pi.textContent=`${pdfDoc.getPageCount()} page${pdfDoc.getPageCount()>1?'s':''}`;
        }catch(e){}
      }
    }
  });

  // Slider live update
  const slider=P.$('qualitySlider'), sliderVal=P.$('qualityVal');
  if(slider&&sliderVal) slider.addEventListener('input',()=>{ sliderVal.textContent=slider.value+'%'; });

  P.$('convertBtn')?.addEventListener('click', async()=>{
    if(!file){P.toast('Please select a PDF file first.');return;}
    if(!window.PDFLib){P.toast('PDF engine loading — please wait.');return;}
    const btn=P.$('convertBtn');btn.disabled=true;const lbl=btn.textContent;btn.textContent='Compressing…';
    try{
      const{PDFDocument}=window.PDFLib;
      const quality=parseInt(P.$('qualitySlider')?.value||'75',10)/100;
      const targetDpi=parseInt(P.$('optDpi')?.value||'150',10);

      // Load doc fresh
      const ab=await file.arrayBuffer();
      const doc=await PDFDocument.load(ab,{ignoreEncryption:true});

      // Strip metadata (significant size reduction)
      doc.setTitle(''); doc.setAuthor(''); doc.setSubject(''); doc.setKeywords([]);
      doc.setProducer('PDF99'); doc.setCreator('PDF99');

      // Re-encode embedded images at lower quality using canvas
      const pages=doc.getPages();
      // Get all image references from the PDF XObjects
      // Real image re-encoding requires rasterising each page via PDF.js then rebuilding
      // We do this if pdfjsLib is available, else just metadata strip
      if(window.pdfjsLib && quality < 0.9){
        pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const status=P.$('compressStatus');
        const origAb=await file.arrayBuffer();
        const pdfjs=await pdfjsLib.getDocument({data:origAb}).promise;
        const newDoc=await PDFDocument.create();
        const scale=Math.max(0.5, targetDpi/144); // 144 = default 2x render

        for(let i=1;i<=pdfjs.numPages;i++){
          if(status) status.textContent=`Processing page ${i}/${pdfjs.numPages}…`;
          const page=await pdfjs.getPage(i);
          const vp=page.getViewport({scale});
          const canvas=document.createElement('canvas');
          canvas.width=vp.width; canvas.height=vp.height;
          await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
          const jpgDataUrl=canvas.toDataURL('image/jpeg',quality);
          const jpgBytes=await fetch(jpgDataUrl).then(r=>r.arrayBuffer());
          const jpgImg=await newDoc.embedJpg(jpgBytes);
          const origPage=doc.getPage(i-1);
          const{width,height}=origPage.getSize();
          const p=newDoc.addPage([width,height]);
          p.drawImage(jpgImg,{x:0,y:0,width,height});
        }
        if(status) status.textContent='';
        const bytes=await newDoc.save();
        const blob=new Blob([bytes],{type:'application/pdf'});
        const saved=Math.max(0,file.size-blob.size);
        const pct=((saved/file.size)*100).toFixed(1);
        const name=file.name.replace(/\.pdf$/i,'')+'-compressed.pdf';
        P.showResult(name,`${(blob.size/1024).toFixed(1)} KB — saved ${pct}% (was ${(file.size/1024).toFixed(1)} KB)`,blob);
      } else {
        // Metadata strip only
        const bytes=await doc.save({useObjectStreams:true});
        const blob=new Blob([bytes],{type:'application/pdf'});
        const saved=Math.max(0,file.size-blob.size);
        const pct=((saved/file.size)*100).toFixed(1);
        const name=file.name.replace(/\.pdf$/i,'')+'-compressed.pdf';
        P.showResult(name,`${(blob.size/1024).toFixed(1)} KB — saved ${pct}% (was ${(file.size/1024).toFixed(1)} KB)`,blob);
      }
      P.toast('✓ Compressed! Click Download to save.');
    }catch(err){console.error(err);P.toast('Compression failed — the PDF may be encrypted.');}
    finally{btn.disabled=false;btn.textContent=lbl;}
  });
})();
