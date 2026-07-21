/* Watermark PDF */
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
    onFiles: list=>{file=list[0];showThumb(file);}
  });

  // Slider
  const slider=P.$('opacitySlider'),val=P.$('opacityVal');
  if(slider&&val) slider.addEventListener('input',()=>val.textContent=slider.value+'%');

  P.$('convertBtn')?.addEventListener('click',async()=>{
    if(!file){P.toast('Please select a PDF first.');return;}
    if(!window.PDFLib){P.toast('PDF engine loading — please wait.');return;}
    const btn=P.$('convertBtn');btn.disabled=true;const lbl=btn.textContent;btn.textContent='Adding watermark…';
    try{
      const{PDFDocument,rgb,degrees,StandardFonts}=window.PDFLib;
      const doc=await PDFDocument.load(await file.arrayBuffer(),{ignoreEncryption:true});
      const font=await doc.embedFont(StandardFonts.HelveticaBold);
      const text=(P.$('optWatermark')?.value.trim()||'CONFIDENTIAL').substring(0,50);
      const opacity=parseFloat(P.$('opacitySlider')?.value||'30')/100;
      doc.getPages().forEach(page=>{
        const{width,height}=page.getSize();
        const fsize=Math.min(width,height)*0.11;
        const tw=font.widthOfTextAtSize(text,fsize);
        page.drawText(text,{x:(width-tw)/2,y:(height-fsize)/2,size:fsize,font,color:rgb(0.65,0.65,0.65),opacity,rotate:degrees(45)});
      });
      const blob=new Blob([await doc.save()],{type:'application/pdf'});
      P.showResult(file.name.replace(/\.pdf$/i,'')+'-watermarked.pdf',`${doc.getPageCount()} pages · ${(blob.size/1024).toFixed(1)} KB`,blob, ()=>{ file=null; P.$('thumbs').innerHTML=''; });
      P.toast('✓ Watermark added! Click Download to save.');
    }catch(err){console.error(err);P.toast('Failed — please try again.');}
    finally{btn.disabled=false;btn.textContent=lbl;}
  });
})();
