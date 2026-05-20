/* JPG to PDF — defer script, DOM is ready */
'use strict';
(function() {
  const P = window.PDF99;
  const SIZES = {A0:[841,1189],A1:[594,841],A2:[420,594],A3:[297,420],A4:[210,297],A5:[148,210],A6:[105,148],LETTER:[215.9,279.4],LEGAL:[215.9,355.6]};
  let files = [];

  // Zoom modal
  const zModal=P.$('zoomModal'), zBack=P.$('zoomBackdrop'), zClose=P.$('zoomClose'), zImg=P.$('zoomImg'), zName=P.$('zoomName');
  const openZoom=(url,name,rot)=>{ zImg.src=url; zImg.style.transform=`rotate(${rot}deg)`; zName.textContent=name; zModal.removeAttribute('hidden'); document.body.style.overflow='hidden'; };
  const closeZoom=()=>{ zModal.setAttribute('hidden',''); zImg.src=''; document.body.style.overflow=''; };
  zClose?.addEventListener('click',closeZoom); zBack?.addEventListener('click',closeZoom);

  P.initDropzone({
    multiple:true,
    accept: f => /^image\//i.test(f.type)||/\.(jpe?g|png|webp|gif|bmp|tiff?|avif)$/i.test(f.name),
    onFiles: list => { list.forEach(f=>files.push({file:f,url:URL.createObjectURL(f),rotation:0})); renderThumbs(); }
  });

  P.$('sortAzBtn')?.addEventListener('click',()=>{files.sort((a,b)=>a.file.name.localeCompare(b.file.name));renderThumbs();P.toast('Sorted A→Z');});
  P.$('sortZaBtn')?.addEventListener('click',()=>{files.sort((a,b)=>b.file.name.localeCompare(a.file.name));renderThumbs();P.toast('Sorted Z→A');});

  function renderThumbs() {
    const el=P.$('thumbs'); el.innerHTML='';
    files.forEach((entry,idx)=>{
      const card=document.createElement('div');
      card.className='thumb'; card.draggable=true; card.dataset.idx=idx; card.setAttribute('role','listitem');
      card.innerHTML=`<div class="thumb-actions">
        <button class="thumb-action-btn thumb-rotate-left" aria-label="Rotate left"><img src="/src/icon/rotate-left.svg" class="icon" alt=""></button>
        <button class="thumb-action-btn thumb-rotate-right" aria-label="Rotate right"><img src="/src/icon/rotate-right.svg" class="icon" alt=""></button>
        <button class="thumb-action-btn thumb-zoom" aria-label="Preview"><img src="/src/icon/zoom.svg" class="icon" alt=""></button>
        <button class="thumb-action-btn thumb-delete" aria-label="Remove"><img src="/src/icon/trash.svg" class="icon" alt=""></button>
      </div>
      <div class="thumb-img-wrap"><img src="${P.escHtml(entry.url)}" alt="${P.escHtml(entry.file.name)}" style="transform:rotate(${entry.rotation}deg)"></div>
      <span class="thumb-name" title="${P.escHtml(entry.file.name)}">${P.escHtml(entry.file.name)}</span>`;
      const pi=card.querySelector('.thumb-img-wrap img');
      card.querySelector('.thumb-rotate-left').onclick=e=>{e.stopPropagation();entry.rotation=(entry.rotation-90+360)%360;pi.style.transform=`rotate(${entry.rotation}deg)`;};
      card.querySelector('.thumb-rotate-right').onclick=e=>{e.stopPropagation();entry.rotation=(entry.rotation+90)%360;pi.style.transform=`rotate(${entry.rotation}deg)`;};
      card.querySelector('.thumb-zoom').onclick=e=>{e.stopPropagation();openZoom(entry.url,entry.file.name,entry.rotation);};
      card.querySelector('.thumb-delete').onclick=e=>{
        e.stopPropagation(); URL.revokeObjectURL(entry.url); files.splice(idx,1);
        if(!files.length){P.$('toolArea').setAttribute('hidden','');P.$('resultArea').setAttribute('hidden','');P.$('dropzoneWrap').removeAttribute('hidden');}
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

  function readURL(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});}
  function loadImg(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src;});}
  async function rotated(img,deg,isPng){
    if(deg===0)return null;
    const c=document.createElement('canvas'),ctx=c.getContext('2d'),sw=deg===90||deg===270;
    c.width=sw?img.height:img.width; c.height=sw?img.width:img.height;
    ctx.translate(c.width/2,c.height/2); ctx.rotate(deg*Math.PI/180); ctx.drawImage(img,-img.width/2,-img.height/2);
    return c.toDataURL(isPng?'image/png':'image/jpeg',0.92);
  }
  async function addPage(jsPDF,pdf,entry,opts){
    const sz=SIZES[opts.pageSize]||SIZES.A4,m=opts.margin,du=await readURL(entry.file),img=await loadImg(du);
    const sw=entry.rotation===90||entry.rotation===270,iw=sw?img.height:img.width,ih=sw?img.width:img.height,isPng=/png/i.test(entry.file.type);
    let o=opts.orientation; if(o==='AUTO')o=iw>=ih?'l':'p'; else o=o.toLowerCase();
    const pw=o==='l'?Math.max(...sz):Math.min(...sz),ph=o==='l'?Math.min(...sz):Math.max(...sz);
    if(!pdf)pdf=new jsPDF({orientation:o,unit:'mm',format:[pw,ph]});else pdf.addPage([pw,ph],o);
    const aw=pw-m*2,ah=ph-m*2,r=Math.min(aw/iw,ah/ih),dw=iw*r,dh=ih*r;
    pdf.addImage((await rotated(img,entry.rotation,isPng))||du,isPng?'PNG':'JPEG',(pw-dw)/2,(ph-dh)/2,dw,dh,undefined,'FAST');
    return pdf;
  }

  P.$('convertBtn')?.addEventListener('click', async()=>{
    if(!files.length){P.toast('Add some images first.');return;}
    if(!window.jspdf?.jsPDF){P.toast('PDF engine still loading — please try in a moment.');return;}
    const btn=P.$('convertBtn');btn.disabled=true;const lbl=btn.textContent;btn.textContent='Converting…';
    try{
      const opts={mergeAll:P.$('optMergeAll').checked,pageSize:P.$('optPageSize').value,orientation:P.$('optOrientation').value,margin:parseFloat(P.$('optMargin').value)||0};
      const{jsPDF}=window.jspdf;
      if(opts.mergeAll){
        let pdf=null; for(const e of files)pdf=await addPage(jsPDF,pdf,e,opts);
        const blob=pdf.output('blob');
        P.showResult((files.length===1?files[0].file.name.replace(/\.[^.]+$/,''):'images-to-pdf-'+new Date().toISOString().slice(0,10))+'.pdf',`${files.length} page${files.length>1?'s':''} · ${(blob.size/1024).toFixed(1)} KB`,blob);
      }else{
        if(!window.JSZip){P.toast('ZIP engine loading…');return;}
        const zip=new window.JSZip();
        for(const e of files){let pdf=null;pdf=await addPage(jsPDF,pdf,e,opts);zip.file(e.file.name.replace(/\.[^.]+$/,'')+'.pdf',pdf.output('blob'));}
        const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
        P.showResult('converted-pdfs-'+new Date().toISOString().slice(0,10)+'.zip',`${files.length} PDFs in ZIP · ${(blob.size/1024).toFixed(1)} KB`,blob);
      }
      P.toast('✓ Done! Click Download to save.');
    }catch(err){console.error(err);P.toast('Conversion failed — please try again.');}
    finally{btn.disabled=false;btn.textContent=lbl;}
  });
})();
