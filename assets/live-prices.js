/* MEProfile — live client-side pricing from the user-owned public Google Sheet.
   Reads ONLY A (size), B (final price), C (inquiry). Do NOT expose D/E internal columns. */
(() => {
'use strict';
const SHEET_ID='11OpZ5fPZMHEQrFq-O-iwY7SGnOVf_bL-1v5nBfJGtK8';
const PRICE_SOURCE=`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq`;
const sections=[...document.querySelectorAll('[data-price-rows]')].map(rows=>rows.closest('.mep-pricing-section')).filter(Boolean);
if(!sections.length)return;
const fa=document.documentElement.lang.toLowerCase().startsWith('fa');
const t=(x,y)=>fa?x:y;
const CAT={square:t('قوطی پروفیل مربع','Square hollow sections'),rectangle:t('قوطی پروفیل مستطیلی','Rectangular hollow sections'),pipes:t('لوله فولادی صنعتی','Industrial steel tubes'),french:t('چهارچوب فرانسوی','French-style steel door frames')};
const normalizeDigits=s=>String(s??'').replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
const normalizeSize=s=>normalizeDigits(s).trim().replace(/\s*[xX×*]\s*/g,'×').replace(/(\d)\/(\d)(?=\s*$)/,'$1.$2').replace(/\s+/g,' ');
const classify=s=>{if(/چهارچوب|فرانسه|french/i.test(s))return 'french';if(/لوله|tube/i.test(s))return 'pipes';const arr=normalizeSize(s).split('×');return arr.length>=2&&arr[0]===arr[1]?'square':'rectangle';};
function visibleSize(size,category){let x=normalizeSize(size);if(category==='pipes'){x=x.replace(/لوله\s*/,'').trim();return t('لوله ','Tube ')+x;}if(category==='french')return t('چهارچوب فرانسوی','French-style frame');return x;}
function numeric(cell){if(!cell)return null;let value=cell.v;if(value==null||String(value).trim()==='')value=cell.f;if(value==null)return null;if(typeof value==='number')return Number.isFinite(value)?value:null;const txt=normalizeDigits(value).replace(/[٬,\s\u200e\u200f]/g,'');if(!/^\d+(\.\d+)?$/.test(txt))return null;const n=Number(txt);return Number.isFinite(n)&&n>=0?n:null;}
function parseSheet(body){const first=body.indexOf('{');const last=body.lastIndexOf('}');if(first===-1||last<=first)throw new Error('Invalid Google Sheets data');const obj=JSON.parse(body.slice(first,last+1));if(obj.status==='error'||!obj.table)throw new Error('Google Sheets query unavailable');const items=[];
 for(const row of obj.table.rows||[]){const c=row.c||[];const size=String(c[0]?.v??c[0]?.f??'').trim();if(!size||/^(سایز|size)$/i.test(size))continue;
  const category=classify(size);const price=numeric(c[1]);const inquiry=String(c[2]?.v??c[2]?.f??'').trim();
  items.push({size,shown:visibleSize(size,category),category,thickness:normalizeSize(size).split('×')[2]||'',price,status:price!==null?'priced':('inquiry'||inquiry)});
 }
 if(!items.length)throw new Error('No prices returned');return items;
}
const fmt=new Intl.NumberFormat(fa?'fa-IR':'en-US',{maximumFractionDigits:0});
const noPrice=t('استعلام از دفتر تهران','Contact Tehran office');
const parseSortKey=it=>{const s=normalizeSize(it.size);return s.match(/^\d+/)?parseFloat(s):Infinity};
const escapeId=x=>String(x).replace(/[^0-9A-Za-z_-]/g,'-');
const configs=sections.map((node,idx)=>{
 const scroll=node.querySelector('.mep-price-scroll');
 let pagination=node.querySelector('[data-price-pagination]');
 if(!pagination&&scroll){pagination=document.createElement('nav');pagination.className='mep-price-pagination';pagination.dataset.pricePagination='';pagination.setAttribute('aria-label',t('صفحه‌بندی فهرست محصولات','Product list pagination'));pagination.hidden=true;scroll.insertAdjacentElement('afterend',pagination);}
 return {node,idx,rows:node.querySelector('[data-price-rows]'),status:node.querySelector('[data-price-status]'),light:node.querySelector('.mep-price-indicator'),count:node.querySelector('[data-price-count]'),empty:node.querySelector('[data-price-empty]'),refresh:node.querySelector('[data-price-refresh]'),search:node.querySelector('[data-price-search]'),thickness:node.querySelector('[data-price-thickness]'),sort:node.querySelector('[data-price-sort]'),tabs:[...node.querySelectorAll('[data-category]')],pagination,category:node.dataset.priceFilter||'all',size:node.dataset.priceSize||'',query:'',items:[],page:1,pageSize:7};
});
function status(conf,text,type){conf.status.textContent=text;conf.light.classList.remove('is-ok','is-error');if(type)conf.light.classList.add(type);}
function cell(tr,txt,cls){const td=document.createElement('td');if(cls)td.className=cls;if(txt!=null)td.textContent=txt;tr.append(td);return td;}
function renderPagination(conf,totalPages,totalItems){
 const nav=conf.pagination;if(!nav)return;
 nav.replaceChildren();nav.hidden=totalPages<=1;
 if(totalPages<=1)return;
 const makeButton=(label,page,kind,disabled=false,current=false,aria='')=>{
  const b=document.createElement('button');b.type='button';b.className='mep-page-button'+(kind?' '+kind:'');b.dataset.page=String(page);b.textContent=label;b.disabled=disabled;
  if(current)b.setAttribute('aria-current','page');
  if(aria)b.setAttribute('aria-label',aria);
  return b;
 };
 const prevLabel=t('قبلی','Previous');
 const nextLabel=t('بعدی','Next');
 nav.append(makeButton('‹',Math.max(1,conf.page-1),'mep-page-arrow',conf.page===1,false,prevLabel));
 let pages=[];
 if(totalPages<=7){pages=Array.from({length:totalPages},(_,i)=>i+1);}
 else{
  pages=[1];
  const from=Math.max(2,conf.page-1),to=Math.min(totalPages-1,conf.page+1);
  if(from>2)pages.push('…');
  for(let p=from;p<=to;p++)pages.push(p);
  if(to<totalPages-1)pages.push('…');
  pages.push(totalPages);
 }
 for(const p of pages){
  if(p==='…'){const span=document.createElement('span');span.className='mep-page-ellipsis';span.textContent='…';nav.append(span);continue;}
  nav.append(makeButton(fmt.format(p),p,'',false,p===conf.page,t('صفحه ','Page ')+fmt.format(p)));
 }
 nav.append(makeButton('›',Math.min(totalPages,conf.page+1),'mep-page-arrow',conf.page===totalPages,false,nextLabel));
}
function draw(conf){
 const query=normalizeSize(conf.query).toLowerCase();const selectedThick=conf.thickness.value;
 let list=conf.items.filter(it=>conf.category==='all'||it.category===conf.category);
 if(conf.size){const match=normalizeSize(conf.size);list=list.filter(it=>normalizeSize(it.size)===match);}
 if(query)list=list.filter(it=>normalizeSize(it.size).toLowerCase().includes(query)||it.shown.toLowerCase().includes(query)||CAT[it.category]?.toLowerCase().includes(query));
 if(selectedThick!=='all')list=list.filter(it=>it.thickness===selectedThick);
 if(conf.sort.value==='price-asc')list.sort((a,b)=>(a.price??Infinity)-(b.price??Infinity));else if(conf.sort.value==='price-desc')list.sort((a,b)=>(b.price??-1)-(a.price??-1));
 const total=list.length;const totalPages=Math.max(1,Math.ceil(total/conf.pageSize));
 conf.page=Math.min(Math.max(1,conf.page),totalPages);
 const first=total?(conf.page-1)*conf.pageSize+1:0;const last=Math.min(conf.page*conf.pageSize,total);
 conf.count.textContent=total?(
  fa?`${fmt.format(total)} مورد · نمایش ${fmt.format(first)} تا ${fmt.format(last)}`:`${fmt.format(total)} items · Showing ${fmt.format(first)}–${fmt.format(last)}`
 ):fmt.format(0)+' '+t('مورد','items');
 conf.tabs.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===conf.category)));
 conf.rows.replaceChildren();conf.empty.hidden=!!total;
 if(!total){conf.empty.textContent=t('موردی با این جست‌وجو پیدا نشد. فیلترها را تغییر دهید.','No matching product. Try another search or filter.');renderPagination(conf,0,0);return;}
 const visible=list.slice((conf.page-1)*conf.pageSize,conf.page*conf.pageSize);
 const frag=document.createDocumentFragment();for(const item of visible){const tr=document.createElement('tr');
  const name=cell(tr,null);const size=document.createElement('b');size.className='mep-size-title';size.textContent=item.shown;name.append(size);const cat=document.createElement('small');cat.className='mep-price-category';cat.textContent=CAT[item.category];name.append(cat);
  const price=cell(tr,null);const val=document.createElement('span');val.className=item.price!==null?'mep-price-number':'mep-price-no-number';val.textContent=item.price!==null?fmt.format(item.price):noPrice;price.append(val);if(item.price!==null){const currency=document.createElement('small');currency.className='mep-price-currency';currency.textContent=t('ریال','Rial');currency.setAttribute('aria-label',t('واحد پول: ریال','Currency: Iranian Rial (IRR)'));price.append(currency);}
  const action=cell(tr,null);const b=document.createElement('button');b.type='button';b.className='mep-price-quote spec-action';b.dataset.product=CAT[item.category];b.dataset.size=item.shown;
  b.textContent=t('درخواست استعلام ↗','Request a quote ↗');b.setAttribute('aria-label',t('استعلام ','Quote for ')+item.shown);action.append(b);frag.append(tr);
 }
 conf.rows.append(frag);renderPagination(conf,totalPages,total);
}
function updateThickness(conf){const prev=conf.thickness.value;const thicks=[...new Set(conf.items.filter(it=>(conf.category==='all'||it.category===conf.category)&&it.thickness).map(it=>it.thickness))].sort((a,b)=>parseFloat(a)-parseFloat(b));
 const opt=document.createElement('option');opt.value='all';opt.textContent=t('همه ضخامت‌ها','All thicknesses');conf.thickness.replaceChildren(opt);
 for(const x of thicks){const option=document.createElement('option');option.value=x;option.textContent=t('ضخامت ','Thickness ')+x;conf.thickness.append(option);}conf.thickness.value=thicks.includes(prev)?prev:'all';}
let busy=false;
async function refresh(){if(busy)return;busy=true;configs.forEach(c=>{c.refresh.disabled=true;status(c,t('در حال دریافت قیمت‌ها…','Loading prices…'),null);});
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
 try{const url=new URL(PRICE_SOURCE);url.searchParams.set('gid','0');url.searchParams.set('tqx','out:json');url.searchParams.set('headers','1');url.searchParams.set('range','A1:C500');url.searchParams.set('_',String(Date.now()));
 const response=await fetch(url.href,{method:'GET',cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error('HTTP '+response.status);const data=parseSheet(await response.text());
 const fetchedAt=new Date();const time=fetchedAt.toLocaleTimeString(fa?'fa-IR':'en-US',{hour:'2-digit',minute:'2-digit'});
 configs.forEach(conf=>{conf.items=data.slice();updateThickness(conf);draw(conf);status(conf,t('دریافت موفق · ساعت ','Updated · ')+time,'is-ok');});
 }catch(error){configs.forEach(conf=>{conf.items=[];conf.rows.replaceChildren();conf.count.textContent='';if(conf.pagination)conf.pagination.hidden=true;conf.empty.hidden=false;conf.empty.textContent=t('دریافت قیمت ممکن نشد. دوباره تلاش کنید یا از دفتر تهران استعلام بگیرید.','Prices are temporarily unavailable. Retry or contact our Tehran office.');status(conf,t('عدم دسترسی به قیمت آنلاین','Live prices unavailable'),'is-error');});}
 finally{clearTimeout(timer);busy=false;configs.forEach(c=>c.refresh.disabled=false);}
}
configs.forEach(conf=>{
 conf.search?.addEventListener('input',e=>{conf.query=e.target.value;conf.page=1;draw(conf)});
 conf.thickness?.addEventListener('change',()=>{conf.page=1;draw(conf)});
 conf.sort?.addEventListener('change',()=>{conf.page=1;draw(conf)});
 conf.tabs.forEach(btn=>btn.addEventListener('click',()=>{conf.category=btn.dataset.category;conf.page=1;updateThickness(conf);draw(conf)}));
 conf.refresh?.addEventListener('click',refresh);
 conf.pagination?.addEventListener('click',e=>{const button=e.target.closest('button[data-page]');if(!button||button.disabled)return;const next=Number(button.dataset.page);if(!Number.isInteger(next)||next<1)return;conf.page=next;draw(conf);});
});
// Product cards select a category and reveal the price table, preserving the destination anchor.
document.querySelectorAll('[data-select-category]').forEach(link=>link.addEventListener('click',()=>{const first=configs.find(x=>x.node.dataset.pricingMode==='home');if(!first)return;first.category=link.dataset.selectCategory;first.page=1;updateThickness(first);if(first.items.length)draw(first);else first.tabs.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===first.category)));}));
refresh();
// Refresh while the page is visible, so long-open tabs do not show old prices as live.
setInterval(()=>{if(document.visibilityState==='visible')refresh()},300000);
})();
