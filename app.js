'use strict';
// Local-only travel wardrobe. Never sends personal records to a server.
const KEY='travel-wardrobe-v3';
const LEGACY_KEY=String.fromCharCode(112,104,100,114,101,115,115,101,100)+'-seoul-v1'; // legacy storage migration
const CATEGORIES=['Tops','Bottoms','Dresses','Outerwear','Shoes','Bags','Accessories','Other'];
function guessCategory(name){
 const n=name.toLowerCase();
 if(/perfume|fragrance|body spray|eau de |cologne|sample scent/.test(n))return 'Accessories';
 if(/backpack|belt bag|crossbody|tote|purse|handbag|shoulder bag|crescent bag|satchel|carryall|caryall|hobo bag|mini bag|pouch|baggu|bag$/.test(n))return 'Bags';
 if(/sneaker|samba|loafers?|boots?|sandals?|heels?|clogs?|flip.flops?|shoes?|slippers?|flats?|mary janes?|trainers?|oxfords?/.test(n))return 'Shoes';
 if(/necklace|bracelet|earrings?|rings?|scarf|belt|sunglasses|glasses|earmuffs|hair clip|watch|hat|beanie|gloves/.test(n))return 'Accessories';
 if(/jacket|coat|parka|trench|blazer|poncho|shacket|windbreaker|puffer/.test(n))return 'Outerwear';
 if(/dress|romper|jumpsuit|overall/.test(n))return 'Dresses';
 if(/pants?|jeans?|trousers?|leggings?|joggers?|shorts?|skirt|sweatpants|bloomers|capris|culottes/.test(n))return 'Bottoms';
 if(/shirt|tee|t-shirt|tshirt|top|tank|blouse|sweater|cardigan|hoodie|sweatshirt|bodysuit|cami|bra|vest|turtleneck|pullover|longsleeve|long sleeve/.test(n))return 'Tops';
 return 'Other';
}
const $=s=>document.getElementById(s);
const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
const day=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const blank=()=>({schema:3,items:[],trips:[{id:uid(),name:'Seoul 2026',itemIds:[],packedIds:[]}],outfits:[],activeTripId:null});
function migrateLegacy(x){const s=blank();s.items=x.items.map(i=>({id:i.id,name:i.name,category:CATEGORIES.includes(i.category)?i.category:'Other',sourceName:i.name}));s.trips[0].itemIds=s.items.map(i=>i.id);s.trips[0].packedIds=x.items.filter(i=>i.packed).map(i=>i.id);s.outfits=x.outfits.map(o=>({id:o.id,date:o.date,tripId:s.trips[0].id,itemIds:o.itemIds,notes:o.notes||'',snapshots:o.itemIds.map(id=>({id,name:s.items.find(i=>i.id===id)?.name||'[missing item]'}))}));s.activeTripId=s.trips[0].id;return s}
function load(){try{const x=JSON.parse(localStorage.getItem(KEY));if(valid(x))return x}catch{}try{const old=JSON.parse(localStorage.getItem(LEGACY_KEY));if(old&&Array.isArray(old.items)&&Array.isArray(old.outfits))return migrateLegacy(old)}catch{}const s=blank();s.activeTripId=s.trips[0].id;return s}
function valid(s){return !!(s&&Array.isArray(s.items)&&Array.isArray(s.trips)&&Array.isArray(s.outfits)&&s.items.every(i=>typeof i.id==='string'&&typeof i.name==='string')&&s.trips.every(t=>typeof t.id==='string'&&typeof t.name==='string'&&Array.isArray(t.itemIds)&&Array.isArray(t.packedIds))&&s.outfits.every(o=>typeof o.id==='string'&&typeof o.date==='string'&&/^\d{4}-\d\d-\d\d$/.test(o.date)&&Array.isArray(o.itemIds)&&typeof o.tripId==='string'))}
let state=load(),editing=null,selected=new Set();
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));$('saveStatus').textContent='Saved on this device';return true}catch(e){alert('Unable to save! Export a backup now. '+e.message);return false}}
persist();
const active=()=>state.trips.find(t=>t.id===state.activeTripId)||state.trips[0];
const itemBy=id=>state.items.find(i=>i.id===id);
function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
function btn(label,fn,cls=''){const b=node('button',label,cls);b.type='button';b.addEventListener('click',fn);return b}
function tab(t){document.querySelectorAll('main section').forEach(e=>e.classList.toggle('hidden',e.id!==t));document.querySelectorAll('[data-tab]').forEach(e=>e.classList.toggle('active',e.dataset.tab===t));render();window.scrollTo(0,0)}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>tab(b.dataset.tab)));
function checkbox(parent,item,checked,fn){const row=node('label',undefined,'item');const cb=node('input');cb.type='checkbox';cb.checked=checked;cb.addEventListener('change',()=>fn(cb.checked));row.append(cb,node('span',item.name));parent.append(row);return row}
function render(){const t=active();$('activeTripName').textContent=t.name;$('tripSelect').replaceChildren();for(const trip of state.trips){const o=node('option',trip.name);o.value=trip.id;o.selected=trip.id===t.id;$('tripSelect').append(o)}$('tripCount').textContent=state.trips.length;$('itemCount').textContent=t.itemIds.length;$('outfitCount').textContent=state.outfits.filter(o=>o.tripId===t.id).length;$('packCount').textContent=`${t.packedIds.length} / ${t.itemIds.length} checked`;renderWardrobe();renderLog();renderHistory();$('backupStatus').textContent=localStorage.getItem('travel-wardrobe-last-backup')||'No backup downloaded from v3 yet'}
$('tripSelect').addEventListener('change',e=>{state.activeTripId=e.target.value;editing=null;selected.clear();persist();render()});
$('newTrip').addEventListener('click',()=>{const name=prompt('New trip name:');if(!name?.trim())return;const t={id:uid(),name:name.trim(),itemIds:[],packedIds:[]};state.trips.push(t);state.activeTripId=t.id;selected.clear();persist();render()});
$('renameTrip').addEventListener('click',()=>{const name=prompt('Rename this trip:',active().name);if(name?.trim()){active().name=name.trim();persist();render()}});
$('date').value=day();
function renderWardrobe(){const t=active(),root=$('wardrobeItems');root.replaceChildren();const q=$('searchWardrobe').value.trim().toLowerCase();const arr=state.items.filter(i=>!q||i.name.toLowerCase().includes(q));$('catalogCount').textContent=`${state.items.length} catalog items · ${t.itemIds.length} in this trip`;
for(const category of CATEGORIES){const group=arr.filter(i=>i.category===category);if(!group.length)continue;root.append(node('h3',category));for(const i of group){const row=checkbox(root,i,t.itemIds.includes(i.id),yes=>{if(yes&&!t.itemIds.includes(i.id))t.itemIds.push(i.id);if(!yes){t.itemIds=t.itemIds.filter(x=>x!==i.id);t.packedIds=t.packedIds.filter(x=>x!==i.id)}persist();render()});const categorySelect=node('select');categorySelect.className='category-select';categorySelect.setAttribute('aria-label','Category for '+i.name);
 for(const cat of CATEGORIES){const opt=node('option',cat);opt.value=cat;opt.selected=cat===i.category;categorySelect.append(opt)}
 categorySelect.addEventListener('click',e=>e.stopPropagation());
 categorySelect.addEventListener('change',e=>{i.category=e.target.value;persist();render()});
 const removeButton=btn('Remove',()=>removeItem(i.id),'remove-item');
 removeButton.setAttribute('aria-label','Remove '+i.name+' from wardrobe');
 removeButton.addEventListener('click',e=>{e.preventDefault();e.stopPropagation()});
 row.append(categorySelect,removeButton,node('small',t.packedIds.includes(i.id)?'Packed':''))}}
if(!arr.length)root.append(node('p','No matching items.','empty'));
const pack=$('packingItems');pack.replaceChildren();for(const id of t.itemIds){const i=itemBy(id);if(!i)continue;checkbox(pack,i,t.packedIds.includes(id),yes=>{t.packedIds=yes?[...new Set([...t.packedIds,id])]:t.packedIds.filter(x=>x!==id);persist();render()})}if(!t.itemIds.length)pack.append(node('p','Choose trip items from your catalog first.','empty'))}
function removeItem(id){
 const item=itemBy(id);if(!item)return;
 const affected=state.outfits.filter(o=>o.itemIds.includes(id));
 const empty=affected.filter(o=>o.itemIds.length===1);
 const summary='Remove \"'+item.name+'\" from your entire wardrobe?\n\n'+
  affected.length+' outfit(s) reference this item. '+
  (empty.length?empty.length+' outfit(s) contain only this item and will also be deleted.\n':'')+
  'The remaining items in other outfits will stay.\n\nThis cannot be undone except by restoring a previous JSON backup. Export a fresh backup first.';
 if(!confirm(summary))return;
 const prior=JSON.stringify(state);
 state.items=state.items.filter(i=>i.id!==id);
 for(const trip of state.trips){trip.itemIds=trip.itemIds.filter(x=>x!==id);trip.packedIds=trip.packedIds.filter(x=>x!==id)}
 state.outfits=state.outfits.map(o=>({...o,itemIds:o.itemIds.filter(x=>x!==id),snapshots:o.snapshots?.filter(x=>x.id!==id)})).filter(o=>o.itemIds.length);
 selected.delete(id);
 if(affected.some(o=>o.id===editing))resetEditor();
 if(!persist()){state=JSON.parse(prior);return}
 render();alert('Removed '+item.name+'. '+affected.length+' outfit(s) affected, '+empty.length+' empty outfit(s) deleted.');
}
$('searchWardrobe').addEventListener('input',renderWardrobe);
$('categorizeItems').addEventListener('click',()=>{
 const changes=state.items.filter(i=>i.category==='Other').map(i=>({item:i,category:guessCategory(i.name)})).filter(x=>x.category!=='Other');
 if(!changes.length)return alert('No uncategorized items could be identified automatically. You can still change categories individually.');
 const counts={};for(const x of changes)counts[x.category]=(counts[x.category]||0)+1;
 if(!confirm('Suggest categories for '+changes.length+' items currently marked Other?\n\n'+Object.entries(counts).map(([k,v])=>k+': '+v).join('\n')+'\n\nExisting non-Other categories will not change. You can edit any result.'))return;
 for(const x of changes)x.item.category=x.category;
 if(persist())render();
});

$('addItem').addEventListener('click',()=>{const name=$('newItem').value.trim();if(!name)return;let i=state.items.find(x=>x.name.toLowerCase()===name.toLowerCase());if(!i){i={id:uid(),name,sourceName:name,category:$('category').value};state.items.push(i)}if(!active().itemIds.includes(i.id))active().itemIds.push(i.id);$('newItem').value='';persist();render()});
function renderLog(){const root=$('logItems');root.replaceChildren();const t=active();const items=t.itemIds.map(itemBy).filter(Boolean);for(const cat of CATEGORIES){const group=items.filter(i=>i.category===cat);if(!group.length)continue;root.append(node('h3',cat));for(const i of group)checkbox(root,i,selected.has(i.id),yes=>{yes?selected.add(i.id):selected.delete(i.id)})}if(!items.length)root.append(node('p','Add items to this trip under Wardrobe.','empty'))}
$('saveOutfit').addEventListener('click',()=>{const date=$('date').value,ids=[...selected];if(!date||!ids.length)return alert('Choose a date and at least one item.');const outfit={id:editing||uid(),tripId:active().id,date,notes:$('outfitNotes').value.trim(),itemIds:ids,snapshots:ids.map(id=>({id,name:itemBy(id)?.name||'[missing item]',category:itemBy(id)?.category||'Other'}))};if(editing)state.outfits=state.outfits.map(o=>o.id===editing?outfit:o);else state.outfits.push(outfit);if(!persist())return;resetEditor();tab('history')});
function resetEditor(){editing=null;selected.clear();$('date').value=day();$('outfitNotes').value='';$('saveOutfit').textContent='Save outfit';$('cancelEdit').classList.add('hidden')}
$('cancelEdit').addEventListener('click',()=>{resetEditor();render()});
function renderHistory(){const root=$('historyItems');root.replaceChildren();const arr=state.outfits.filter(o=>o.tripId===active().id).sort((a,b)=>b.date.localeCompare(a.date));if(!arr.length){root.append(node('p','No outfits logged for this trip yet.','empty'));return}for(const o of arr){const p=node('div',undefined,'panel');p.append(node('strong',o.date));if(o.notes)p.append(node('p',o.notes,'muted'));p.append(node('p',o.itemIds.map(id=>itemBy(id)?.name||o.snapshots?.find(s=>s.id===id)?.name||'[unknown]').join(' · ')));const a=node('div',undefined,'actions');a.append(btn('Edit',()=>{state.activeTripId=o.tripId;editing=o.id;selected=new Set(o.itemIds);$('date').value=o.date;$('outfitNotes').value=o.notes||'';$('saveOutfit').textContent='Update outfit';$('cancelEdit').classList.remove('hidden');tab('log')}),btn('Delete',()=>{if(confirm('Delete this outfit? This removes its wears from exports.')){state.outfits=state.outfits.filter(x=>x.id!==o.id);persist();render()}},'danger'));p.append(a);root.append(p)}}
function csvParse(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){cell+='"';i++}else if(c==='"')quoted=false;else cell+=c}else if(c==='"')quoted=true;else if(c===','){row.push(cell);cell=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x!==''))rows.push(row);row=[];cell=''}else cell+=c}row.push(cell);if(row.some(x=>x!==''))rows.push(row);return rows}
$('importCsv').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{
  const rows=csvParse((await file.text()).replace(/^\uFEFF/,''));
  const header=rows.shift()?.map(x=>x.trim().toLowerCase());
  const ix=header?.indexOf('item');
  if(ix==null||ix<0)throw Error('Expected an Item column, as in itemColorKey.csv');
  const catIx=header.indexOf('category');
  const plannedNew=[],plannedUpdates=[],seen=new Set();let matched=0;
  for(const r of rows){
   const name=r[ix]?.trim();if(!name)continue;
   const key=name.normalize('NFKC').trim().toLocaleLowerCase();
   if(seen.has(key))throw Error('Duplicate Item in CSV: '+name);
   seen.add(key);
   const supplied=catIx>=0?r[catIx]?.trim():null;
   if(supplied&&!CATEGORIES.includes(supplied))throw Error('Unrecognized category for '+name+': '+supplied);
   const category=supplied||guessCategory(name);
   const existing=state.items.find(i=>i.name.normalize('NFKC').trim().toLocaleLowerCase()===key);
   if(existing){matched++;if(catIx>=0&&existing.category!==category)plannedUpdates.push({item:existing,category});}
   else plannedNew.push({id:uid(),name,sourceName:name,category});
  }
  if(!plannedNew.length&&!plannedUpdates.length){const message='Matched '+matched+' existing items. Categories are already up to date; no changes made.'; $('importStatus').textContent=message;alert(message);return;}
  const summary='CSV preview: '+rows.length+' CSV rows, '+matched+' matched items, '+plannedNew.length+' new items, '+plannedUpdates.length+' existing categories to update.\n\n'+
   'Existing item IDs, packing lists, outfits, and wear history will be preserved.\n\nApply these changes?';
  if(!confirm(summary))return;
  const prior=JSON.stringify(state);
  state.items.push(...plannedNew);
  for(const x of plannedUpdates)x.item.category=x.category;
  if(!persist()){state=JSON.parse(prior);return;}
  render();
  const message='Updated '+plannedUpdates.length+' existing categories; added '+plannedNew.length+' new items; matched '+matched+' existing items.';
  $('importStatus').textContent=message;alert(message);
 }catch(err){$('importStatus').textContent='Import failed: '+err.message;alert('CSV import failed: '+err.message)}finally{e.target.value=''}
});
function download(name,data,type){const blob=new Blob([data],{type}),url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
const cell=x=>'"'+String(x??'').replaceAll('"','""')+'"';
function records(){const out=[];for(const o of [...state.outfits].sort((a,b)=>a.date.localeCompare(b.date)))for(const id of o.itemIds){const i=itemBy(id),snap=o.snapshots?.find(s=>s.id===id);out.push({date:o.date,trip:state.trips.find(t=>t.id===o.tripId)?.name||'Archived trip',tripId:o.tripId,outfitId:o.id,itemId:id,item:i?.sourceName||snap?.name||'[unknown]',category:i?.category||snap?.category||'',notes:o.notes||''})}return out}
$('exportCsv').addEventListener('click',()=>{const rows=[['date','trip','trip_id','outfit_id','item_id','item','category','notes'],...records().map(r=>[r.date,r.trip,r.tripId,r.outfitId,r.itemId,r.item,r.category,r.notes])];download('travel-wardrobe-wears.csv',rows.map(r=>r.map(cell).join(',')).join('\r\n'),'text/csv;charset=utf-8')});
$('exportJson').addEventListener('click',()=>{download('travel-wardrobe-backup-'+day()+'.json',JSON.stringify({backupVersion:3,exportedAt:new Date().toISOString(),...state},null,2),'application/json');localStorage.setItem('travel-wardrobe-last-backup',new Date().toLocaleString());render()});
$('restoreJson').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{const x=JSON.parse(await f.text());let incoming;if(valid(x))incoming={schema:3,items:x.items,trips:x.trips,outfits:x.outfits,activeTripId:x.activeTripId};else if(Array.isArray(x.items)&&Array.isArray(x.outfits))incoming=migrateLegacy(x);else throw Error('Not a supported wardrobe backup');const unique=a=>new Set(a).size===a.length;
if(!unique(incoming.items.map(i=>i.id))||!unique(incoming.trips.map(t=>t.id))||!unique(incoming.outfits.map(o=>o.id)))throw Error('Backup contains duplicate IDs');
if(incoming.trips.some(t=>t.itemIds.some(id=>!incoming.items.some(i=>i.id===id))||t.packedIds.some(id=>!t.itemIds.includes(id))))throw Error('Backup contains invalid packing references');
const missing=incoming.outfits.filter(o=>!incoming.trips.some(t=>t.id===o.tripId));if(missing.length)throw Error('Backup has outfits without a trip');const summary=`Backup: ${incoming.items.length} items, ${incoming.trips.length} trips, ${incoming.outfits.length} outfits.\nCurrent: ${state.items.length} items, ${state.trips.length} trips, ${state.outfits.length} outfits.\n\nReplace all local data? Export your current backup first.`;if(!confirm(summary))return;const old=state;state=incoming;if(!persist()){state=old;return}resetEditor();render();alert('Restore complete. Check your outfit history and export a fresh backup.')}catch(err){alert('Restore failed: '+err.message)}finally{e.target.value=''}});
if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').then(()=>$('offlineStatus').textContent='Offline cache registered. Test in Airplane Mode.').catch(()=>$('offlineStatus').textContent='Offline cache registration failed.');else $('offlineStatus').textContent='Offline install requires HTTPS.';
render();
