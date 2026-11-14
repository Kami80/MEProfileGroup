/* Small, dependency-free interactions for the technical knowledge centre. */
(function(){
  'use strict';
  var form=document.querySelector('[data-quote-builder]');
  if(form){
    form.addEventListener('submit',function(event){
      event.preventDefault();
      var data=new FormData(form);
      var fa=document.documentElement.lang.indexOf('fa')===0;
      var labels=fa?{product:'نوع محصول',dimensions:'ابعاد / قطر',thickness:'ضخامت اسمی',quantity:'مقدار سفارش',length:'طول موردنیاز',destination:'مقصد تحویل',notes:'الزامات فنی / توضیحات'}:{product:'Product',dimensions:'Dimensions / diameter',thickness:'Nominal thickness',quantity:'Order quantity',length:'Required length',destination:'Delivery destination',notes:'Technical requirements / notes'};
      var lines=[fa?'سلام، برای محصول زیر درخواست استعلام دارم:':'Hello, I would like a quotation for the following product:'];
      ['product','dimensions','thickness','quantity','length','destination','notes'].forEach(function(key){var value=String(data.get(key)||'').trim();if(value)lines.push(labels[key]+': '+value);});
      lines.push(fa?'لطفاً قیمت و شرایط تأمین را اعلام فرمایید.':'Please advise the current price and supply terms.');
      var url='https://wa.me/989379995122?text='+encodeURIComponent(lines.join('\n'));
      var status=form.querySelector('.guide-form-status');
      if(status)status.textContent=fa?'در حال باز کردن واتس‌اپ…':'Opening WhatsApp…';
      window.open(url,'_blank','noopener');
    });
  }
  document.querySelectorAll('[data-choice-tool]').forEach(function(tool){
    var result=tool.querySelector('.guide-choice-result');var link=tool.querySelector('.guide-choice-link');
    var fa=document.documentElement.lang.indexOf('fa')===0;
    tool.querySelectorAll('button[data-choice]').forEach(function(button){button.addEventListener('click',function(){
      tool.querySelectorAll('button[data-choice]').forEach(function(b){b.setAttribute('aria-pressed',b===button?'true':'false');});
      var square=button.getAttribute('data-choice')==='square';
      result.textContent=fa?(square?'برای ابعاد با دو ضلع بیرونی برابر، کاتالوگ قوطی مربع را بررسی کنید. ضخامت و تناسب با نقشه باید جداگانه تأیید شود.':'برای ابعاد با دو ضلع بیرونی متفاوت، کاتالوگ قوطی مستطیلی را بررسی کنید. ترتیب عرض و ارتفاع را مطابق نقشه بنویسید.'):(square?'For equal outside dimensions, review the square-section catalogue. Thickness and suitability must still be checked against the drawing.':'For different outside dimensions, review the rectangular-section catalogue. Keep width and height in the same order as the drawing.');
      link.hidden=false;link.href=square?(fa?'../../products/square-profiles/index.html':'../../products/square-profiles/index.html'):'../../products/rectangular-profiles/index.html';link.textContent=fa?(square?'مشاهده قوطی پروفیل مربع ←':'مشاهده قوطی پروفیل مستطیلی ←'):(square?'View square hollow sections →':'View rectangular hollow sections →');
    });});
  });
  document.querySelectorAll('[data-checklist-tool]').forEach(function(tool){
    var checks=Array.from(tool.querySelectorAll('input[type=checkbox]'));var count=tool.querySelector('[data-check-count]');var bar=tool.querySelector('[data-check-progress]');
    function update(){var n=checks.filter(function(c){return c.checked;}).length;if(count)count.textContent=n+' / '+checks.length;if(bar)bar.style.width=(100*n/checks.length)+'%';}
    checks.forEach(function(c){c.addEventListener('change',update);});update();
  });
})();
