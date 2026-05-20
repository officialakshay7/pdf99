/* Rotate PDF */
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

  P.$('convertBtn')?.addEventListener('click',async()=>{
    if(!file){P.toast('Please select a PDF first.');return;}
    if(!window.PDFLib){P.toast('PDF engine loading — please wait.');return;}
    const btn=P.$('convertBtn');btn.disabled=true;const lbl=btn.textContent;btn.textContent='Rotating…';
    try{
      const{PDFDocument,degrees}=window.PDFLib;
      const doc=await PDFDocument.load(await file.arrayBuffer(),{ignoreEncryption:true});
      const angle=parseInt(P.$('optAngle')?.value||'90',10);
      const which=P.$('optPages')?.value||'all';
      doc.getPages().forEach((page,i)=>{
        const apply=which==='all'||(which==='odd'&&i%2===0)||(which==='even'&&i%2===1);
        if(apply) page.setRotation(degrees((page.getRotation().angle+angle)%360));
      });
      const blob=new Blob([await doc.save()],{type:'application/pdf'});
      P.showResult(file.name.replace(/\.pdf$/i,'')+'-rotated.pdf',`${doc.getPageCount()} pages · ${(blob.size/1024).toFixed(1)} KB`,blob, ()=>{ file=null; P.$('thumbs').innerHTML=''; });
      P.toast('✓ Rotated! Click Download to save.');
    }catch(err){console.error(err);P.toast('Rotation failed — please try again.');}
    finally{btn.disabled=false;btn.textContent=lbl;}
  });
})();
