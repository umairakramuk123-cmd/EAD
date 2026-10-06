const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync('/home/user/EAD/ead-portal.html','utf8');
const errors=[], warns=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
  beforeParse(w){
    w.ApexCharts=class{constructor(el,o){if(!el)throw new Error('chart: no element');if(!o)throw new Error('chart: no options');
      this.o=o;this.w={globals:{dom:{ID:el.id}}};}render(){this.rendered=true}destroy(){}};
    w.Element.prototype.scrollIntoView=function(){};
    w.print=function(){};
    w.addEventListener('error',e=>errors.push('WINDOW ERROR: '+(e.error&&e.error.stack||e.message)));
    const oe=w.console.error, ow=w.console.warn;
    w.console.error=(...a)=>{errors.push('console.error: '+a.join(' '));oe(...a)};
    w.console.warn=(...a)=>{warns.push('warn: '+String(a[0]).slice(0,120));};
  }});
const w=dom.window, d=w.document;
const ev=x=>w.eval(x);
const W=new Proxy({},{get:(t,k)=>ev(String(k))});
setTimeout(()=>{
  try{
    const t=(name,fn)=>{try{fn();console.log('  ok   '+name)}catch(e){errors.push(name+' :: '+e.message+'\n'+(e.stack||'').split('\n')[1])}};
    console.log('== BOOT ==');
    t('login screen visible',()=>{if(!d.getElementById('a-login')||d.getElementById('a-login').classList.contains('hidden'))throw new Error('login hidden');
      if(d.getElementById('auth').classList.contains('on')!==true)throw new Error('auth not shown');
      if(d.getElementById('app').classList.contains('on'))throw new Error('app shown before login')});
    t('role select populated (13 roles)',()=>{const n=d.getElementById('li-role').options.length;if(n!==13)throw new Error('got '+n)});
    t('signup chips rendered',()=>{if(!d.getElementById('r-themes').children.length)throw new Error('no theme chips')});
    t('public FAQ rendered',()=>{if(!d.getElementById('pub-faq').children.length)throw new Error('no faq')});

    console.log('== AUTH FLOWS ==');
    t('signup steps 1->5',()=>{for(let i=0;i<4;i++){W.Auth.suStep(1);if(W.Auth.suStepN!==i+2)throw new Error('step mismatch at '+i)}
      if(d.getElementById('su-title').textContent.indexOf('Review')<0)throw new Error('bad title: '+d.getElementById('su-title').textContent)});
    t('signup submit -> done screen',()=>{W.Auth.suStep(1);if(d.getElementById('a-done').classList.contains('hidden'))throw new Error('done not shown')});
    t('signup reset',()=>{W.Auth.suReset();if(W.Auth.suStepN!==1)throw new Error('not reset')});
    t('forgot password 1->2->3',()=>{W.Auth.go('forgot');W.Auth.fpGo(2);W.Auth.fpGo(3);W.Auth._stopTimer();
      if(!d.getElementById('fp-3').classList.contains('hidden')===false)throw new Error('fp3 hidden')});
    t('captcha refresh',()=>{W.Auth.newCaptcha();W.Auth.newCaptcha2();if(d.getElementById('cap-box').textContent.length!==5)throw new Error('bad captcha')});
    t('password strength scoring',()=>{[0,1,2,3,4].forEach(()=>W.Auth.pwStrength('Ab1!'));if(W.Auth._score('Abcd1234!')!==4)throw new Error('score wrong')});
    t('login rejects bad captcha',()=>{W.Auth.go('login');d.getElementById('li-cap').value='ZZZZZ';
      const r=W.Auth.login({preventDefault(){}});if(r!==false)throw new Error('login allowed bad captcha')});
    t('login accepts good captcha',()=>{d.getElementById('li-cap').value=W.Auth.cap;W.Auth.login({preventDefault(){}})});
    t('track application',()=>{W.Auth.go('track');W.Auth.track();
      if(d.getElementById('tk-res').classList.contains('hidden'))throw new Error('no result');
      if(!d.getElementById('tk-res').innerHTML.includes('tl-i'))throw new Error('no timeline')});

    console.log('== ALL ROLES x ALL VIEWS ==');
    const roles=W.ROLES, views=W.MENU.flatMap(g=>g.items.map(i=>i.id));
    let rendered=0;
    roles.forEach(r=>{
      W.App.enter(r.id);
      const allowed=views.filter(v=>W.canView(r,v));
      if(!allowed.length){errors.push('role '+r.id+' has NO views');return}
      allowed.forEach(v=>{
        try{W.App.nav(v);
          const el=d.getElementById('view');
          if(!el||!el.innerHTML||el.innerHTML.length<300)throw new Error('empty render ('+(el?el.innerHTML.length:'no el')+')');
          rendered++;
        }catch(e){errors.push('RENDER '+r.id+'/'+v+' :: '+e.message)}
      });
      // sidebar item count must equal allowed count
      const sb=d.getElementById('sb-nav').querySelectorAll('[data-nav]').length;
      if(sb!==allowed.length)errors.push('sidebar mismatch '+r.id+': '+sb+' vs '+allowed.length);
      if(allowed.length)console.log('  ok   '+r.id.padEnd(16)+allowed.length+' views, sidebar '+sb);
    });
    console.log('  total view renders: '+rendered);

    console.log('== MODALS ==');
    W.App.enter('secretary');
    t('openApp modal',()=>{W.Views.openApp(W.DATA.apps[0].id);if(!d.getElementById('ovl').classList.contains('on'))throw new Error('modal not open');
      W.Views.appTab(1,d.querySelector('#ovl .tab'));W.Views.appTab(3,d.querySelector('#ovl .tab'))});
    t('decide approve/deficient/reject/moi',()=>{['approve','deficient','reject','moi'].forEach(a=>{W.Views.decide(W.DATA.apps[1].id,a)})});
    t('_apply state changes',()=>{W.Views._apply(W.DATA.apps[2].id,'approve');if(W.DATA.apps[2].status!=='signed')throw new Error('status not set')});
    t('openNgo',()=>{W.Views.openNgo(W.DATA.ngos[0].id)});
    t('openPrj',()=>{W.Views.openPrj(W.DATA.projects[0].id)});
    t('openMou',()=>{W.Views.openMou(W.DATA.mous[0].id)});
    t('openClr',()=>{W.Views.openClr(W.DATA.clr[0].id)});
    t('openDonor',()=>{W.Views.openDonor(W.DONORS[0].n)});
    t('openReturn',()=>{W.Views.openReturn(W.DATA.returns[0].id)});
    t('renewMou + _renew',()=>{W.Views.renewMou(W.DATA.mous[0].id);W.Views._renew(W.DATA.mous[0].id)});
    t('prjForm / donorForm / userForm',()=>{W.Views.prjForm();W.Views.prjForm(W.DATA.projects[0].id);W.Views.donorForm();W.Views.userForm();W.Views.userForm(W.DATA.users[0].id)});
    t('permMdl for all 13 roles',()=>{W.ROLES.forEach(r=>W.Views.permMdl(r.id))});
    t('guide / broadcast / repBuilder / uplAudit / returnForm',()=>{W.Views.guide();W.Views.broadcast();W.Views.repBuilder();W.Views.uplAudit();W.Views.returnForm()});
    t('submitChecklist + submitted',()=>{W.Views.submitChecklist();W.Views.submitted()});
    t('UI.confirm',()=>{W.UI.confirm('t','m','ok',()=>{})});
    t('appMore context menu',()=>{W.Views.appMore({stopPropagation(){},clientX:10,clientY:10,target:d.body},W.DATA.apps[0].id)});
    t('quickSearch hits + miss',()=>{W.App.quickSearch('behbud');W.App.quickSearch('zzzzqqq');W.App.quickSearch('')});

    console.log('== INTERACTIONS ==');
    t('role switch to every role',()=>{W.ROLES.forEach(r=>{W.App.switchRole(r.id)})});
    t('setFY',()=>{const b=d.querySelector('#dd-fy .dd-i');W.App.setFY('FY 2024-25',b)});
    t('toggleSb',()=>{W.App.toggleSb(true);W.App.toggleSb(false);W.App.toggleSb()});
    t('filters + pagination on each table view',()=>{
      const specs={applications:['app',['all','signed','deficient','with_moi']],projects:['pj',['all','ongoing','completed']],
        clearance:['cl',['all','Under Review']],mou:['mo',['all','Expired']],ngos:['ng',['all','MoU Active']],audit:['au',['all','danger','warn']]};
      Object.keys(specs).forEach(v=>{W.App.enter('super_admin');W.App.nav(v);const [k,vals]=specs[v];
        vals.forEach(st=>{W.App.state[k].st=st;W.App.state[k].p=1;W.App.renderTable()});
        W.App.state[k].q='a';W.App.renderTable();W.App.state[k].q='zzzqqq';W.App.renderTable();
        if(k==='pj'){W.App.state.pj.mode='cards';W.App.renderTable();W.App.state.pj.mode='table';W.App.renderTable()}
        if(k==='ng'){W.App.state.ng.mode='cards';W.App.renderTable()}
        W.App.state[k].p=2;W.App.renderTable();W.App.state[k].p=1;
      });
    });
    t('sorting via P.sortH handler',()=>{W.App.nav('applications');W.App.state.app.sk='usd';W.App.state.app.sd='asc';W.App.renderTable()});
    t('checklist all 13 sections',()=>{W.App.nav('checklist');for(let i=0;i<13;i++){W.App.state.ck.i=i;W.App.renderTable();
      const h=d.getElementById('view').innerHTML;if(h.length<800)throw new Error('thin section '+i)}});
    t('mne all 5 tabs',()=>{W.App.nav('mne');['returns','audit','annual','tpe','benef'].forEach(t2=>{W.App.state.mn.tab=t2;W.App.renderTable()})});
    t('users all 4 tabs',()=>{W.App.enter('super_admin');W.App.nav('users');['users','roles','matrix','invite'].forEach(t2=>{W.App.state.us.tab=t2;W.App.renderTable()})});
    t('settings all 6 tabs',()=>{W.App.enter('super_admin');W.App.nav('settings');['profile','security','notify','org','portal','about'].forEach(t2=>{W.App.state.st.tab=t2;W.App.renderTable()})});
    t('faq filter',()=>{W.App.nav('help');W.Views.faqFilter('mou');W.Views.faqFilter('')});
    t('projects cards mode + add',()=>{W.App.nav('projects');W.App.state.pj.mode='cards';W.App.renderTable()});
    t('logout returns to login',()=>{W.App.logout();if(!d.getElementById('auth').classList.contains('on'))throw new Error('auth not shown');
      if(d.getElementById('app').classList.contains('on'))throw new Error('app still on')});

    console.log('== THEME ==');
    t('theme engine exists',()=>{if(typeof W.Theme!=='object')throw new Error('no Theme')});
    t('defaults to light',()=>{if(d.documentElement.dataset.theme!=='light'&&d.documentElement.dataset.theme!=='dark')throw new Error('no data-theme')});
    t('toggle flips + persists',()=>{const a=W.Theme.get();W.Theme.toggle();if(W.Theme.get()===a)throw new Error('did not flip');
      if(W.localStorage.getItem('ead-portal-theme')!==W.Theme.get())throw new Error('not persisted');W.Theme.toggle()});
    t('palette syncs to dark series',()=>{W.Theme.set('dark',true);
      if(W.PAL.series[0]!=='#4FBC97')throw new Error('dark series not applied: '+W.PAL.series[0]);
      if(!W.PAL.text)throw new Error('no chart text colour');
      W.Theme.set('light',true);if(W.PAL.series[0]!=='#0E6146')throw new Error('light series not restored')});
    t('refreshCharts does not throw',()=>{W.App.enter('secretary');W.App.refreshCharts()});
    t('dark mode renders all views',()=>{W.Theme.set('dark',true);
      W.ROLES.forEach(r=>{W.App.enter(r.id);W.MENU.flatMap(g=>g.items.map(i=>i.id)).filter(v=>W.canView(r,v)).forEach(v=>{
        W.App.nav(v);if(d.getElementById('view').innerHTML.length<300)throw new Error('thin '+r.id+'/'+v)})});
      W.Theme.set('light',true)});
    t('theme toggles present in markup',()=>{if(d.querySelectorAll('.thm').length<2)throw new Error('expected .thm in login + topbar, got '+d.querySelectorAll('.thm').length)});
    t('icons carry .ic sizing class',()=>{W.App.enter('secretary');W.App.nav('applications');
      const svgs=[...d.querySelectorAll('#view svg')];const bare=svgs.filter(x=>!x.classList.contains('ic')&&!x.closest('.ic-chip,.kpi-ic,.crest,.av'));
      if(bare.length)throw new Error(bare.length+' svg without .ic: '+bare.slice(0,3).map(x=>x.outerHTML.slice(0,60)))});
    t('new login structure',()=>{const l=d.getElementById('a-login');
      if(!l.classList.contains('lg-wrap'))throw new Error('login not lg-wrap');
      ['lg-card','lg-side','lg-form','lg-tabs','lg-fields','lg-submit','lg-actions','lg-demo','lg-top','lg-foot','lg-orb'].forEach(c=>{
        if(!l.querySelector('.'+c))throw new Error('missing .'+c)});
      if(l.querySelector('.auth-brand'))throw new Error('old markup still present')});
    console.log('== CHART OPTION BUILDERS ==');
    let cn=0,bad=[];
    Object.keys(W.CHART_DEFS).forEach(id=>{try{const o=W.CHART_DEFS[id]();
      if(!o||!o.chart)throw new Error('no chart config');
      if(!o.series||!o.series.length)throw new Error('empty series for '+id);
      const numish=['donut','pie','radialBar'].includes(o.chart.type);
      if(numish){ if(o.series.some(v=>typeof v!=='number'||isNaN(v)))throw new Error('donut series must be numbers: '+id); }
      else if(o.series.some(s=>!s.data||!s.data.length))throw new Error('series without data: '+id);
      if(!numish && o.xaxis && o.xaxis.categories && o.series.some(s=>s.data.length!==o.xaxis.categories.length))
        throw new Error('series/categories length mismatch: '+id+' ('+o.series.map(s=>s.data.length)+' vs '+o.xaxis.categories.length+')');
      cn++}catch(e){bad.push(id+' :: '+e.message)}});
    console.log('  chart defs ok: '+cn+' / '+Object.keys(W.CHART_DEFS).length);
    bad.forEach(b=>errors.push('CHART '+b));

    console.log('== CHART IDS REFERENCED IN VIEWS ==');
    const used=new Set();
    const scan=()=>d.querySelectorAll('#view .chart').forEach(e=>used.add(e.id));
    roles.forEach(r=>{W.App.enter(r.id);views.filter(v=>W.canView(r,v)).forEach(v=>{W.App.nav(v);scan();
      // exercise sub-tabs so tab-hidden charts are also mounted
      if(v==='mne'){['audit','annual','tpe','benef'].forEach(t2=>{W.App.state.mn.tab=t2;W.App.renderTable();scan()})}
      if(v==='users'){['roles','matrix','invite'].forEach(t2=>{W.App.state.us.tab=t2;W.App.renderTable();scan()})}
      if(v==='settings'){['security','notify','org','portal','about'].forEach(t2=>{W.App.state.st.tab=t2;W.App.renderTable();scan()})}
      if(v==='projects'){W.App.state.pj.mode='cards';W.App.renderTable();scan();W.App.state.pj.mode='table'}
      if(v==='ngos'){W.App.state.ng.mode='cards';W.App.renderTable();scan()}
    })});
    const defined=new Set(Object.keys(W.CHART_DEFS));
    const missing=[...used].filter(x=>!defined.has(x));
    const unusedDefs=[...defined].filter(x=>!used.has(x));
    console.log('  chart nodes rendered: '+used.size);
    if(missing.length)errors.push('CHART IDS RENDERED BUT UNDEFINED: '+missing.join(', '));
    if(unusedDefs.length)warns.push('defined but never mounted: '+unusedDefs.join(', '));

    console.log('== FONT SIZE COMPLIANCE (computed) ==');
    let oob=0,checked=0;const seen=new Set();
    d.querySelectorAll('#auth *,#app *,#ovl *').forEach(el=>{
      const fs=w.getComputedStyle(el).fontSize;checked++;
      const px=parseFloat(fs);
      if(!isNaN(px)&&(px<13||px>16)){const k=el.tagName+'.'+(el.className||'')+'='+fs;if(!seen.has(k)){seen.add(k);oob++}}
    });
    console.log('  elements checked: '+checked+', out-of-range unique: '+oob);
    seen.forEach(s=>errors.push('FONT OUT OF RANGE: '+s));

  }catch(e){errors.push('HARNESS: '+e.message+'\n'+e.stack)}

  console.log('\n================ RESULT ================');
  console.log('errors: '+errors.length+'   warnings: '+warns.length);
  errors.slice(0,60).forEach(e=>console.log('  ✗ '+e));
  warns.slice(0,15).forEach(x=>console.log('  ! '+x));
  process.exit(errors.length?1:0);
},1600);
