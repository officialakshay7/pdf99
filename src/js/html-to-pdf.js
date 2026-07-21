/* HTML to PDF */
'use strict';
(function() {
  const P = window.PDF99;
  P.$('convertBtn')?.addEventListener('click', async()=>{
    const html=P.$('optHtml')?.value.trim();
    if(!html){P.toast('Paste some HTML content first.');return;}
    if(!window.jspdf?.jsPDF){P.toast('PDF engine loading — please wait.');return;}
    const btn=P.$('convertBtn');btn.disabled=true;const lbl=btn.textContent;btn.textContent='Converting…';
    try{
      const{jsPDF}=window.jspdf;
      const pdf=new jsPDF({orientation:'p',unit:'mm',format:'a4'});
      const div=document.createElement('div');
      div.innerHTML=html;
      div.style.cssText='position:fixed;top:-9999px;left:-9999px;width:794px;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#000;background:#fff;padding:20px;';
      document.body.appendChild(div);
      await pdf.html(div,{x:10,y:10,width:190,windowWidth:794});
      document.body.removeChild(div);
      const blob=pdf.output('blob');
      P.showResult('html-to-pdf-'+new Date().toISOString().slice(0,10)+'.pdf',`${(blob.size/1024).toFixed(1)} KB`,blob, ()=>{ P.$('optHtml').value=''; });
      P.toast('✓ Done! Click Download to save.');
    }catch(err){console.error(err);P.toast('Conversion failed — please try again.');}
    finally{btn.disabled=false;btn.textContent=lbl;}
  });
})();
