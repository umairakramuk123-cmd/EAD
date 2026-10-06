const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync('/home/user/EAD/ead-portal.html','utf8');
const errors=[], warns=[];
/* ApexCharts cannot render in jsdom at all (no layout, no getBBox, no screenCTM),
   and its render() rejects from inside a nested promise that escapes any synchronous
   try/catch -- which under Node 22 aborts the process. So the suite validates chart
   *configurations* against this stub instead of pixels. The vendored library overwrites
   window.ApexCharts when it executes, hence the re-install inside the test callback. */
const MockApex=class{
  constructor(el,o){
    if(!el)throw new Error('chart: no element');
    if(!o)throw new Error('chart: no options');
    this.el=el;this.o=o;this.w={globals:{dom:{ID:el.id}}};
  }
  render(){this.rendered=true;return Promise.resolve(this)}
  destroy(){this.destroyed=true}
};
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
  beforeParse(w){
    w.ApexCharts=MockApex;
    w.Element.prototype.scrollIntoView=function(){};
    /* jsdom has no ResizeObserver; ApexCharts uses it for redrawOnParentResize */
    w.ResizeObserver=class{constructor(cb){this.cb=cb}observe(){}unobserve(){}disconnect(){}};
    w.requestAnimationFrame=w.requestAnimationFrame||(cb=>setTimeout(()=>cb(Date.now()),16));
    /* an unhandled rejection would otherwise escape the synchronous try/catch */
    w.addEventListener('unhandledrejection',e=>warns.push('unhandled rejection: '+String(e.reason).slice(0,140)));
    w.print=function(){};
    w.addEventListener('error',e=>errors.push('WINDOW ERROR: '+(e.error&&e.error.stack||e.message)));
    const oe=w.console.error, ow=w.console.warn;
    w.console.error=(...a)=>{errors.push('console.error: '+a.join(' '));oe(...a)};
    w.console.warn=(...a)=>{warns.push('warn: '+String(a[0]).slice(0,120));};
  }});
const w=dom.window, d=w.document;
const ev=x=>w.eval(x);
const W=new Proxy({},{get:(t,k)=>ev(String(k))});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  try{
    w.ApexCharts=MockApex;   // the vendored UMD library replaced it during page load
    const t=(name,fn)=>{try{fn();console.log('  ok   '+name)}catch(e){errors.push(name+' :: '+e.message+'\n'+(e.stack||'').split('\n')[1])}};
    /* App.nav() defers chart/sparkline/tool mounting to requestAnimationFrame,
       so tests that assert post-render work must let a frame elapse first. */
    const ta=async(name,fn)=>{try{await fn();console.log('  ok   '+name)}catch(e){errors.push(name+' :: '+e.message+'\n'+(e.stack||'').split('\n')[1])}};
    const go=async v=>{W.App.nav(v);await sleep(60)};
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
    t('guide / broadcast / uplAudit / returnForm',()=>{W.Views.guide();W.Views.broadcast();W.Views.uplAudit();W.Views.returnForm()});
    t('submitChecklist + submitted',()=>{W.Views.submitChecklist();W.Views.submitted()});
    t('UI.confirm',()=>{W.UI.confirm('t','m','ok',()=>{})});
    t('appMore context menu',()=>{W.Views.appMore({stopPropagation(){},clientX:10,clientY:10,target:d.body},W.DATA.apps[0].id)});
    t('quickSearch hits + miss',()=>{W.App.quickSearch('behbud');W.App.quickSearch('zzzzqqq');W.App.quickSearch('')});

    console.log('== INTERACTIONS ==');
    t('role switch to every role',()=>{W.ROLES.forEach(r=>{W.App.switchRole(r.id)})});
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
    console.log('== SHELL (no added command actions) ==');
    t('sidebar contains the role navigation without injected quick actions',()=>{const sb=d.getElementById('sb');
      ['sb-hd','sb-scroll','sb-ft','sb-status','sb-role','crest'].forEach(c=>{
        if(!sb.querySelector('.'+c))throw new Error('missing .'+c)});
      if(sb.querySelector('.sb-brand'))throw new Error('old .sb-brand markup still present');
      if(sb.querySelector('.sb-qa,.sb-collapse'))throw new Error('extra sidebar action is present')});
    t('topbar contains record search and only the account controls',()=>{const tb=d.querySelector('.tb');
      const form=tb.querySelector('.tb-search');
      if(!form||!form.querySelector('input[name="q"]'))throw new Error('missing record search');
      if(!tb.querySelector('.tb-act'))throw new Error('missing .tb-act cluster');
      if(tb.querySelector('.cmdk,#cmdk-ovl,.fy-pick,#dd-fy,.tb-refresh'))
        throw new Error('an unrequested command, year or refresh control remains');
      ['dd-bell','dd-role','dd-me'].forEach(id=>{if(!tb.querySelector('#'+id))throw new Error('missing #'+id)});
      ['dd-bell','dd-role','dd-me'].forEach(id=>{if(!tb.querySelector('.tb-act #'+id))throw new Error(id+' not inside .tb-act')})});
    t('nav items keep descriptive titles',()=>{W.App.enter('super_admin');
      const it=[...d.querySelectorAll('#sb-nav [data-nav]')];
      if(!it.length)throw new Error('no nav items');
      const noTitle=it.filter(x=>!x.getAttribute('title'));
      if(noTitle.length)throw new Error(noTitle.length+' items without title')});
    t('topbar search submits to the existing record-search flow',()=>{
      W.App.enter('super_admin');
      const f=d.querySelector('.tb-search'),q=f&&f.querySelector('input[name="q"]');
      if(!f||!q||typeof f.onsubmit!=='function')throw new Error('search form is not wired');
      q.value=W.DATA.ngos[0].name.slice(0,8);
      const result=f.onsubmit({preventDefault(){}});
      if(result!==false)throw new Error('form did not cancel page navigation');
      if(!d.getElementById('ovl').classList.contains('on'))throw new Error('search did not show results');
      W.UI.modalClose()});
    t('removed optional controls are absent after table render',()=>{
      W.App.enter('super_admin');W.App.nav('applications');
      if(d.querySelector('#view .tb-tools,.tb-dense,.tb-ic'))throw new Error('table tools remain');
      if(d.body.classList.contains('dense'))throw new Error('compact-density state remains');
      if(d.getElementById('cmdk-ovl')||d.documentElement.classList.contains('sb-rail'))
        throw new Error('palette or collapsed rail remains')});
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

    console.log('== KPI SPARKLINES + COUNT-UP ==');
    t('sparkSeries is deterministic and bounded',()=>{
      const a=W.sparkSeries('Total Cases',12,12), b=W.sparkSeries('Total Cases',12,12);
      if(a.join()!==b.join())throw new Error('not stable across calls');
      if(a.length!==12)throw new Error('wrong length '+a.length);
      if(a.some(v=>!isFinite(v)||v<0))throw new Error('bad value in '+a.join());
      if(W.sparkSeries('Other',12,12).join()===a.join())throw new Error('seed ignored');
      const up=W.sparkSeries('X',40,12), dn=W.sparkSeries('X',-40,12);
      if(up[11]<=up[0])throw new Error('positive delta did not trend up');
      if(dn[11]>=dn[0])throw new Error('negative delta did not trend down')});
    await ta('every KPI tile carries a mounted sparkline',async()=>{W.App.enter('super_admin');await go('dashboard');
      const kpis=[...d.querySelectorAll('#view .kpi')];
      if(!kpis.length)throw new Error('no KPI tiles on the dashboard');
      const sp=[...d.querySelectorAll('#view .kpi-spark[data-spark]')];
      if(sp.length!==kpis.length)throw new Error(kpis.length+' tiles but '+sp.length+' sparklines');
      sp.forEach(el=>{const pts=el.dataset.spark.split(',').map(Number);
        if(pts.length!==12||pts.some(v=>!isFinite(v)))throw new Error('bad spark data '+el.dataset.spark);
        if(el.dataset.done!=='1')throw new Error('sparkline not marked mounted')});
      if(!d.querySelector('#view .kpi[data-tone]'))throw new Error('tile lost its tone for colouring');
      if(W.App.charts.length<kpis.length)throw new Error('sparkline instances not tracked for teardown')});
    await ta('sparklines re-mount after a theme switch',async()=>{
      const before=d.querySelectorAll('#view .kpi-spark[data-done]').length;
      W.App.refreshCharts(); await sleep(60);
      const after=d.querySelectorAll('#view .kpi-spark[data-done]').length;
      if(!after||after<before)throw new Error('sparklines not remounted ('+before+' -> '+after+')');
      W.Theme.set('light',true)});
    await ta('numeric KPI values get a counter, text values are left alone',async()=>{await go('dashboard');
      const kv=[...d.querySelectorAll('#view .kpi-val .kv[data-count]')];
      if(!kv.length)throw new Error('no countable values found');
      kv.forEach(el=>{if(!/^\d+$/.test(el.dataset.count))throw new Error('bad data-count '+el.dataset.count);
        if(el.dataset.counted!=='1')throw new Error('count-up did not run');
        if(!/^[\d,]+$/.test(el.textContent.trim()))throw new Error('counter left non-numeric text: '+el.textContent)});
      [...d.querySelectorAll('#view .kpi-val')].forEach(el=>{
        if(!el.querySelector('.kv')&&!/[A-Za-z$%]/.test(el.textContent))
          throw new Error('unhandled numeric value without a counter: '+el.textContent)})});
    await ta('count-up is idempotent and honours reduced motion',async()=>{await go('dashboard');
      const kv=d.querySelector('#view .kv[data-count]');
      const target=kv.dataset.count;
      kv.dataset.counted='';delete kv.dataset.counted;
      W.Spark.count(d.getElementById('view'));
      if(kv.dataset.counted!=='1')throw new Error('re-run did not mark the element');
      await sleep(900);
      if(kv.textContent.replace(/,/g,'')!==target)
        throw new Error('counter did not settle on '+target+', got '+kv.textContent)});

    console.log('== NO INJECTED TABLE ACTIONS ==');
    await ta('rendered table toolbars contain only view-specific actions',async()=>{
      for(const v of ['applications','projects','clearance','mou','ngos','audit']){
        W.App.enter('super_admin');await go(v);
        if(!d.querySelector('#view .tbar'))throw new Error(v+' has no .tbar');
        if(d.querySelector('#view .tb-tools,.tb-ic,.tb-dense'))throw new Error(v+': injected export/density action remains');
      }
    });

    console.log('== ACCESSIBILITY ==');
    t('skip link is the first focusable thing in the document',()=>{
      const sk=d.querySelector('a.skip');
      if(!sk)throw new Error('no skip link');
      if(sk.getAttribute('href')!=='#view')throw new Error('skip link does not target #view');
      if(sk.previousElementSibling)throw new Error('skip link is not first in <body>');
      if(!d.getElementById('view'))throw new Error('skip link target missing')});
    t('landmarks and live regions',()=>{
      const v=d.getElementById('view');
      if(v.getAttribute('role')!=='main')throw new Error('#view is not role=main');
      const ts=d.getElementById('toasts');
      if(ts.getAttribute('aria-live')!=='polite'||ts.getAttribute('role')!=='status')
        throw new Error('toasts are not a live region');
      if(!d.querySelector('#sb-nav[aria-label]'))throw new Error('sidebar nav has no label');
      W.UI.modal('<div class="mdl-bd">landmark test</div>','narrow');
      const mdl=d.querySelector('#ovl-c .mdl[role="dialog"][aria-modal="true"]');
      if(!mdl)throw new Error('opened modal is not a dialog');
      W.UI.modalClose();
      if(d.getElementById('cmdk-ovl'))throw new Error('unrequested command palette remains')});
    t('active module is announced with aria-current',()=>{W.App.enter('secretary');W.App.nav('analytics');
      const cur=[...d.querySelectorAll('#sb-nav [aria-current="page"]')];
      if(cur.length!==1)throw new Error('expected exactly 1 aria-current, got '+cur.length);
      if(cur[0].dataset.nav!=='analytics')throw new Error('aria-current on '+cur[0].dataset.nav);
      W.App.nav('mou');
      const cur2=d.querySelector('#sb-nav [aria-current="page"]');
      if(!cur2||cur2.dataset.nav!=='mou')throw new Error('aria-current did not follow navigation')});
    t('dropdown triggers expose aria-expanded and it tracks state',()=>{
      W.UI.ddClose();
      const t1=d.querySelector('#dd-bell button');
      if(t1.getAttribute('aria-expanded')!=='false')throw new Error('not false when closed');
      W.UI.dd('dd-bell');
      if(t1.getAttribute('aria-expanded')!=='true')throw new Error('not true when open');
      W.UI.ddClose();
      if(t1.getAttribute('aria-expanded')!=='false')throw new Error('not reset on close');
      ['dd-bell','dd-role','dd-me'].forEach(id=>{
        const b=d.querySelector('#'+id+' button');
        if(!b||!b.hasAttribute('aria-expanded'))throw new Error(id+' trigger has no aria-expanded')})});
    t('modals are dialogs that take and restore focus',()=>{
      const before=d.activeElement;
      W.UI.modal(W.UI.mdlHd('info','Focus test','Body','info')+'<div class="mdl-bd"><button id="fx-a">A</button><button id="fx-b">B</button></div>','narrow');
      const mdl=d.querySelector('#ovl-c .mdl');
      if(mdl.getAttribute('role')!=='dialog'||mdl.getAttribute('aria-modal')!=='true')
        throw new Error('modal is not marked as a dialog');
      const f=W.UI.focusables(d.getElementById('ovl-c'));
      if(f.length<3)throw new Error('focusables() found only '+f.length);
      if(f[0].getAttribute('aria-label')!=='Close')throw new Error('close is not the first focusable');
      W.UI.trap(d.getElementById('ovl-c'),{key:'Tab',shiftKey:false,preventDefault(){}});
      W.UI.trap(d.getElementById('ovl-c'),{key:'Tab',shiftKey:true,preventDefault(){}});
      W.UI.trap(d.getElementById('ovl-c'),{key:'a',preventDefault(){}});
      W.UI.modalClose();
      if(d.getElementById('ovl').classList.contains('on'))throw new Error('modal did not close');
      if(d.body.style.overflow)throw new Error('body scroll left locked after modal close')});
    t('Tab trap wraps at both ends',()=>{
      W.UI.modal('<div class="mdl-bd"><button id="t-a">A</button><button id="t-b">B</button></div>','narrow');
      const root=d.getElementById('ovl-c');
      d.getElementById('t-b').focus();
      let blocked=false;
      W.UI.trap(root,{key:'Tab',shiftKey:false,preventDefault(){blocked=true}});
      if(!blocked)throw new Error('forward Tab at the end was not wrapped');
      if(d.activeElement.id!=='t-a')throw new Error('did not wrap to the first, got '+d.activeElement.id);
      blocked=false;
      W.UI.trap(root,{key:'Tab',shiftKey:true,preventDefault(){blocked=true}});
      if(!blocked)throw new Error('backward Tab at the start was not wrapped');
      if(d.activeElement.id!=='t-b')throw new Error('did not wrap to the last');
      W.UI.modalClose()});
    t('Escape closes an open modal',()=>{
      W.App.enter('secretary');
      W.UI.modal('<div class="mdl-bd">x</div>','narrow');
      d.dispatchEvent(new W.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
      if(d.getElementById('ovl').classList.contains('on'))throw new Error('Escape did not close modal');
      if(d.body.style.overflow)throw new Error('scroll left locked after modal close')});

    console.log('== FONT SIZE COMPLIANCE (computed) ==');
    /* sweep a KPI-heavy view, a data table and an open modal so the new
       sparkline strips, counters and injected toolbar buttons are covered */
    W.App.enter('super_admin');
    ['dashboard','analytics','applications','mne','settings'].forEach(v=>{try{W.App.nav(v)}catch(e){}});
    W.App.nav('dashboard');
    W.UI.modal(W.UI.mdlHd('info','Sweep','Body','info')+'<div class="mdl-bd"><button class="btn">OK</button></div>','');
    W.UI.modalClose();
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
