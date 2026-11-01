(()=>{'use strict';
  const toggle=document.querySelector('.menu-toggle');
  const menu=document.getElementById('mobile-menu');
  if(toggle&&menu){
    toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));menu.classList.toggle('is-open',open);toggle.setAttribute('aria-label',open?'Close menu':'Open menu');});
    menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');}));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');}});
  }
  const form=document.getElementById('inquiry-form');if(!form)return;
  const fa=document.body.dataset.language==='fa';
  const email=document.body.dataset.email||'';
  const fields=()=>Object.fromEntries(new FormData(form).entries());
  function makeMessage(){const f=fields();return fa?[
    'درخواست استعلام - هولدینگ پویا پروفیل خاورمیانه','',
    'نوع محصول: '+(f.product||'—'),'سایز و ضخامت: '+(f.size||'—'),
    'مقدار سفارش: '+(f.quantity||'—'),'مقصد: '+(f.destination||'—'),
    'توضیحات: '+(f.note||'—')].join('\n'):[
    'Quotation inquiry - Middle East Profile Steel Group','',
    'Product: '+(f.product||'—'),'Size / wall thickness: '+(f.size||'—'),
    'Approx. quantity: '+(f.quantity||'—'),'Destination: '+(f.destination||'—'),
    'Additional details: '+(f.note||'—')].join('\n');}
  const status=document.getElementById('inquiry-status');
  document.getElementById('copy-inquiry')?.addEventListener('click',async()=>{
    const val=makeMessage();try{if(!navigator.clipboard||!window.isSecureContext)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(val);status.textContent=fa?'متن استعلام کپی شد.':'Inquiry copied to clipboard.';}
    catch(err){const target=document.getElementById('prepared-copy');target.classList.remove('sr-only');target.setAttribute('aria-hidden','false');target.style.cssText='display:block;width:100%;min-height:190px;margin-top:14px;';target.value=val;target.focus();target.select();try{document.execCommand('copy');status.textContent=fa?'متن استعلام آماده و انتخاب شد.':'Inquiry prepared and selected for copying.';}catch(e){status.textContent=fa?'متن استعلام را انتخاب و کپی کنید.':'Select and copy the prepared inquiry.';}}
  });
  document.getElementById('email-inquiry')?.addEventListener('click',()=>{
    const link=(document.body.dataset.whatsapp||'https://wa.me/989359995122')+'?text='+encodeURIComponent(makeMessage());
    const tab=window.open(link,'_blank','noopener,noreferrer');
    if(!tab){window.location.href=link;}
    status.textContent=fa?'واتس‌اپ باز می‌شود؛ پیام را بررسی و ارسال کنید.':'WhatsApp opens with your draft; review and send the message there.';
  });
})();
