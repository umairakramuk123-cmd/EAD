const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync('/home/user/EAD/ead-portal.html','utf8');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://ngo.ead.gov.pk/'});
const w=dom.window,d=w.document;
const W=new Proxy(w,{get:(t,k)=>{try{const v=w.eval(String(k));return v}catch(e){return t[k]}}});
w.addEventListener('error',e=>console.log('JSERR',e.message));
setTimeout(()=>{
  const seen=new Map();let bad=[];
  const scan=ctx=>{
    d.querySelectorAll('svg').forEach(sv=>{
      if(sv.closest('#i-star')||sv.tagName==='symbol')return;
      if(sv.ownerSVGElement)return;                       // inner shapes
      if(sv.querySelector('symbol'))return;                // the sprite sheet itself
      const cs=w.getComputedStyle(sv);
      const px=v=>v&&v.endsWith('px')?parseFloat(v):null;
      const wd=px(cs.width),ht=px(cs.height);
      const cls=sv.getAttribute('class')||'(none)';
      const key=cls+'|'+(sv.closest('[class]')?sv.closest('[class]').className:'');
      if(wd===null||ht===null)return;                      // jsdom could not resolve -> auto
      if(wd<8||wd>30||ht<8||ht>30){ if(!seen.has(key)){seen.set(key,[wd,ht]);bad.push([ctx,key,wd,ht])} }
      else if(!seen.has(key)) seen.set(key,[wd,ht]);
    });
  };
  scan('login');
  W.App.enter('super_admin');
  W.MENU.flatMap(g=>g.items.map(i=>i.id)).forEach(v=>{try{W.App.nav(v)}catch(e){}scan('app:'+v)});
  console.log('distinct svg class contexts resolved:',seen.size);
  const sizes=[...new Set([...seen.values()].map(a=>a[0]+'x'+a[1]))].sort();
  console.log('observed icon sizes:',sizes.join(', '));
  if(bad.length){console.log('OUT-OF-RANGE ICONS:');bad.slice(0,25).forEach(b=>console.log('  ',b.join(' :: ')))}
  else console.log('  every resolved svg is within 8-30px  ✔');
  process.exit(0);
},2500);
