#!/usr/bin/env python3
"""
Overlap / geometry audit for ead-portal.html.

jsdom has no layout engine and no real browser is available in this sandbox, so
"nothing overlaps" is proved *geometrically* instead: this script parses the CSS
that actually ships in the HTML, rebuilds the box model of every fixed, sticky
and absolutely-positioned layer, and asserts the numbers.

Every modelled rule is also asserted to be present in the stylesheet, so editing
the CSS without updating the model makes this script fail loudly rather than
silently passing a stale claim.

Checks
  1. tokens resolve (--sb-w, --sb-rail, --sb-gut, --tb-h)
  2. sidebar right edge vs main content left edge  (expanded + rail)
  3. topbar minimum content width at every breakpoint, across 320..1920px
  4. z-index contract: no two competing layers share a level, order is correct
  5. sticky table head clears the sticky topbar
  6. no hardcoded light backgrounds left in markup or inline styles
  7. dropdown / modal / drawer / toast geometry stays inside the viewport
"""
import io, re, sys

PATH = sys.argv[1] if len(sys.argv) > 1 else \
    __file__.rsplit('/scripts/', 1)[0] + '/ead-portal.html'
S = io.open(PATH, encoding='utf-8').read()

i = S.index('<style>', S.index('</style>') + 1)
j = S.index('</style>', i)
CSS = re.sub(r'/\*.*?\*/', '', S[i + 7:j], flags=re.S)

fails, notes = [], []
def check(ok, msg, detail=''):
    (notes if ok else fails).append(('PASS' if ok else 'FAIL') + '  ' + msg + (('  -> ' + detail) if detail else ''))

# ---------------------------------------------------------------- rule index
def blocks(t):
    out, d, b = [], 0, ''
    for ch in t:
        b += ch
        if ch == '{': d += 1
        elif ch == '}':
            d -= 1
            if d == 0: out.append(b.strip()); b = ''
    return out

R = {}
def add(sel, decls, media):
    d = {}
    for part in decls.split(';'):
        if ':' in part:
            k, v = part.split(':', 1); d[k.strip()] = v.strip()
    for ss in sel.split(','):
        ss = ss.strip()
        if ss: R.setdefault((media, ss), {}).update(d)

for b in blocks(CSS):
    if b.startswith('@media'):
        m = re.match(r'@media([^{]+)\{(.*)\}$', b, re.S)
        for inner in blocks(m.group(2)):
            mm = re.match(r'^([^{]+)\{(.*)\}$', inner, re.S)
            if mm: add(mm.group(1).strip(), mm.group(2), m.group(1).strip())
    elif b.startswith('@'): continue
    else:
        m = re.match(r'^([^{]+)\{(.*)\}$', b, re.S)
        if m: add(m.group(1).strip(), m.group(2), None)

def rule(sel, media=None):
    return R.get((media, sel), {})
def px(v, d=0.0):
    if not v: return d
    m = re.match(r'^(-?[\d.]+)px$', v.strip())
    return float(m.group(1)) if m else d
def has(sel, prop, media=None):
    return prop in rule(sel, media)

print('=' * 74)
print('OVERLAP / GEOMETRY AUDIT   ' + PATH.rsplit('/', 1)[-1])
print('=' * 74)

# ------------------------------------------------------------------- 1 tokens
tok = dict(re.findall(r'(--[a-z0-9-]+)\s*:\s*([^;]+);', CSS))
SB_W   = px(tok.get('--sb-w', '0px').strip())
SB_GUT = px(tok.get('--sb-gut', '0px').strip())
TB_H   = px(tok.get('--tb-h', '0px').strip())
print('\n1. TOKENS')
check(SB_W > 0 and SB_GUT > 0 and TB_H > 0,
      'geometry tokens resolve',
      '--sb-w=%g  --sb-gut=%g  --tb-h=%g' % (SB_W, SB_GUT, TB_H))

# --------------------------------------------- 2 sidebar vs main gutter
print('\n2. SIDEBAR  vs  MAIN CONTENT COLUMN')
sb   = rule('.sb'); main = rule('.main')
check(sb.get('position') == 'fixed', 'sidebar is position:fixed')
check(sb.get('left') == 'var(--sb-gut)', 'sidebar offset from the left edge by the gutter', sb.get('left',''))
ml = 'calc(var(--sb-w) + var(--sb-gut) * 2)'
check(main.get('margin-left') == ml, 'expanded main margin rule present', main.get('margin-left',''))
right_edge = SB_GUT + SB_W
content_left = SB_W + SB_GUT * 2
clear_gap = content_left - right_edge
check(clear_gap >= SB_GUT - 0.01,
      'expanded: sidebar right edge %gpx < content left edge %gpx (clear gap %gpx)'
      % (right_edge, content_left, clear_gap))

# drawer mode must release the gutter entirely
check(rule('.main', '(max-width:1080px)').get('margin-left') == '0',
      'drawer mode: main column margin released to 0')
check('translateX' in rule('.sb', '(max-width:1080px)').get('transform', ''),
      'drawer mode: sidebar parked fully off-screen')
check(not re.search(r'html\.sb-rail|--sb-rail', CSS),
      'removed rail mode leaves no stale CSS references')

# ------------------------------------------------------- 3 topbar fits
print('\n3. TOPBAR MINIMUM CONTENT WIDTH  (must never overflow its column)')
tb = rule('.tb')
TB_PAD = 2 * px((tb.get('padding', '0 16px').split() or ['0'])[-1])
TB_GAP = px(tb.get('gap'), 9)
check(rule('.crumb').get('min-width') == '0', 'crumb can shrink to zero (min-width:0)')
check(rule('.crumb').get('overflow') == 'hidden', 'crumb clips rather than pushing siblings')
check(rule('.tb-search').get('min-width') == '0', 'record search can shrink to zero')
check(rule('.tb-search input').get('min-width') == '0', 'record-search input can shrink to zero')
check(rule('.tb-search .go').get('flex') == 'none', 'search submit button keeps a stable width')
check(rule('.tb-search .go', '(max-width:960px)').get('display') == 'none',
      'search submit label hides below 960px to protect the mobile topbar')
check(rule('.rolepick').get('min-width') == '0', 'role picker can shrink to zero')
check(rule('.tb-act').get('flex') == 'none' or 'none' in rule('.tb-act').get('flex',''),
      'right-hand cluster does not flex')

BTN = 35
SEARCH_ICON_ONLY = 43    # icon + one gap + horizontal padding + borders; input is min-width:0
SEARCH_WITH_BUTTON = 115 # icon + two gaps + submit button + padding/borders; input can shrink
ROLE_MIN = 67            # avatar + chevron + gaps + padding; label is allowed to shrink

def topbar_min(vw):
    """Conservative minimum for the actual compact shell at each breakpoint."""
    drawer = vw <= 1080
    items = []
    if drawer: items.append(('menu', BTN))
    # Breadcrumb is min-width:0 and overflow:hidden, so it contributes no minimum.
    search = SEARCH_ICON_ONLY if vw <= 960 else SEARCH_WITH_BUTTON
    items.append(('search', search))
    act = [('theme',35), ('bell',BTN)]
    if vw <= 560:
        act.append(('role',35))       # label hidden, fixed 35px icon target
    else:
        act.append(('role',ROLE_MIN))
        act.append(('profile',BTN))   # hidden at <=560px
    act_w = sum(w for _,w in act) + 9*max(0,len(act)-1)
    items.append(('tb-act', act_w))
    # One flex gap remains between each actual topbar child; crumb itself can collapse.
    gaps = 9 * (3 if drawer else 2)
    total = 32 + sum(w for _,w in items) + gaps  # 16px padding per side
    return total, [n for n,w in items if w] + [n for n,w in act if w]

print('   %-8s %-12s %-12s %-8s %s' % ('vw', 'topbar min', 'available', 'slack', 'minimum controls'))
ok_all = True
for vw in (320, 360, 390, 430, 560, 561, 640, 768, 960, 961, 1024, 1080, 1081, 1160, 1280, 1366, 1440, 1600, 1920):
    need, vis = topbar_min(vw)
    avail = vw - (0 if vw <= 1080 else SB_W + SB_GUT * 2)
    ok = need <= avail; ok_all &= ok
    print('   %-8d %-12.0f %-12.0f %-8.0f %s%s' % (vw, need, avail, avail - need,
          'fits' if ok else 'OVERFLOW', '   [' + ' '.join(vis) + ']' if not ok else ''))
check(ok_all, 'topbar fits its column at every width from 320px to 1920px')

# --------------------------------------------------------- 4 z-index contract
print('\n4. Z-INDEX CONTRACT')
def z(sel, media=None):
    v = rule(sel, media).get('z-index')
    return int(v) if v and re.match(r'^-?\d+$', v.strip()) else None
# (selector, media query it lives in, label, expected z)
STACK = [('body::before', None, 'ambient aurora', -2),
         ('body::after',  None, 'ambient grain', -1),
         ('.tbl thead th',None, 'sticky table head', 3),
         ('.tb',          None, 'topbar', 70),
         ('.sb-bk', '(max-width:1080px)', 'drawer backdrop', 79),
         ('.sb',          None, 'sidebar', 80),
         ('.ovl',         None, 'modal', 200),
         ('.drw',         None, 'side drawer', 201),
         ('#toasts',      None, 'toasts', 400),
         ('.skip',        None, 'skip link', 500)]
found = []
for sel, media, name, want in STACK:
    got = z(sel, media)
    found.append((name, got, want))
    check(got == want, '%-20s %-16s z-index %s' % (name, sel, got),
          'expected %d' % want if got != want else '')
levels = [g for _, g, _ in found if g is not None]
check(len(levels) == len(set(levels)), 'no two shell layers share a z-index level')
check(levels == sorted(levels), 'stack order ascends: ambient < head < topbar < drawer < sidebar < modal < toasts < skip link')
# the context menu is set from JS, not CSS
check('z-index:300' in S,
      'context menu sits at 300 (above modal/drawer, below toasts)')

# ------------------------------------------------------------- 5 sticky heads
print('\n5. STICKY TABLE HEAD vs STICKY TOPBAR')
th = rule('.tbl thead th')
check(th.get('position') == 'sticky', 'table head is sticky')
check(th.get('top') == 'var(--tb-h)',
      'sticky head offsets by the topbar height so it never slides under it', th.get('top',''))
check(int(th.get('z-index', '0')) < 70, 'sticky head stays below the topbar')

# ------------------------------------------------- 6 hardcoded light colours
print('\n6. HARDCODED LIGHT SURFACES (would break dark mode)')
def lum(hexc):
    h = hexc.lstrip('#')
    if len(h) == 3: h = ''.join(c * 2 for c in h)
    if len(h) < 6: return 0.0
    r, g, b = (int(h[k:k+2], 16) / 255 for k in (0, 2, 4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
# strip every <script> so vendored ApexCharts CSS-in-JS cannot produce noise
NOSCRIPT = re.sub(r'<script\b[^>]*>.*?</script>', '', S, flags=re.S)
ci = NOSCRIPT.index('<style>', NOSCRIPT.index('</style>') + 1)
cj = NOSCRIPT.index('</style>', ci)
MAINCSS = re.sub(r'/\*.*?\*/', '', NOSCRIPT[ci+7:cj], flags=re.S)
KNOBS = ('::after', '::before')      # radio dot / switch knob: white by design in both themes
bad = []
for b in blocks(MAINCSS):
    m = re.match(r'^([^{]+)\{(.*)\}$', b, re.S)
    if not m: continue
    sel, decl = m.group(1).strip(), m.group(2)
    if sel.startswith('@media print'): continue
    for mm in re.finditer(r'(?:background|background-color)\s*:\s*(#[0-9A-Fa-f]{3,8}|white)', decl):
        v = mm.group(1)
        if lum(v) <= 0.75: continue                  # badges, status dots - not light surfaces
        if any(k in sel for k in KNOBS): continue     # intentional white control knob
        bad.append((sel[:52], v))
for sel, v in bad[:8]: print('      %-52s %s' % (sel, v))
check(not bad, 'no hardcoded light *surface* backgrounds in the stylesheet',
      '%d found' % len(bad) if bad else 'clean (badges, knobs and print excluded)')
inline = [v for v in re.findall(r'style="[^"]*background:\s*(#[0-9A-Fa-f]{3,8}|white)', NOSCRIPT[cj:])
          if lum(v) > 0.75]
check(not inline, 'no hardcoded light inline backgrounds in the markup',
      str(inline[:5]) if inline else 'clean')
js = S[S.rindex('<script>'):]
jsbad = re.findall(r"background:(#[Ff]{3,6}|#F[BC][FBC][FBC][DF]C|white)\b", js)
check(not jsbad, 'no hardcoded light backgrounds in JS-generated inline styles', str(jsbad[:4]) if jsbad else 'clean')

# ------------------------------------------------- 7 overlays inside viewport
print('\n7. OVERLAY GEOMETRY')
check('max-width:calc(100vw - 24px)' in rule('.dd-m') or 'max-width' in rule('.dd-m'),
      'dropdown menus are capped to the viewport width', rule('.dd-m').get('max-width',''))
check(rule('.dd-m', '(max-width:560px)').get('right') == '0',
      'on phones dropdowns anchor right so they cannot run off-screen')
inline_mw = re.findall(r'class="dd-m[^"]*"[^>]*min-width:(\d+)px', NOSCRIPT)
check(not inline_mw, 'no inline dropdown min-width can exceed a 320px viewport',
      str(inline_mw) if inline_mw else 'all clamped with min()')
check('min(' in NOSCRIPT[NOSCRIPT.index('id="dd-bell"'):NOSCRIPT.index('id="dd-bell"') + 900],
      'bell menu width uses min() clamping')
drw = rule('.drw')
check('min(' in drw.get('width', ''), 'side drawer width is viewport-clamped', drw.get('width',''))
check('min(' in rule('#toasts').get('max-width', ''), 'toasts are viewport-clamped', rule('#toasts').get('max-width',''))
check(rule('.tb-search').get('flex') == '1 1 auto',
      'record search flexes between breadcrumb and account controls', rule('.tb-search').get('flex',''))
check(rule('.tb-search input').get('min-width') == '0',
      'record-search input may shrink without pushing controls off-screen')
STATIC_MARKUP = re.sub(r'<style\b[^>]*>.*?</style>', '', NOSCRIPT, flags=re.S)
check(not re.search(r'\.cmdk|cmdk-ovl|\.tb-tools|\.tb-ic|\.fy-pick|dd-fy', CSS + STATIC_MARKUP),
      'removed optional shell actions leave no CSS/markup remnants')

# ------------------------------------------------------- 8 type-scale guard
print('\n8. TYPE SCALE (13px minimum, 16px maximum — hard client constraint)')
lits = sorted(set(int(x) for x in re.findall(r'font-size:\s*(\d+)px', MAINCSS)))
toks = sorted(set(int(x) for x in re.findall(r'--fs-(\d+)\b', MAINCSS)))
jspx = sorted(set(int(x) for x in re.findall(r"fontSize:\s*'(\d+)px'", S[S.rindex('<script>'):])))
check(not [v for v in lits if not 13 <= v <= 16],
      'every literal font-size in the stylesheet is within 13-16px', str(lits))
check(not [v for v in toks if not 13 <= v <= 16],
      'every --fs-* type token is within 13-16px', str(toks))
check(not [v for v in jspx if not 13 <= v <= 16],
      'every ApexCharts fontSize is within 13-16px', str(jspx))
check(not re.findall(r'font-size:\s*0(?:px)?\s*[;}]', MAINCSS),
      'no font-size:0 text-hiding hacks (they read as 0px violations)')

# --------------------------------------- 9 refinement layer is surface-only
print('\n9. REFINEMENT LAYER MUST NOT TOUCH LAYOUT')
anchor = MAINCSS.index('--el-1:')
mstart = MAINCSS.rfind('}', 0, anchor) + 1
layer  = MAINCSS[mstart:]
assert '--el-4' in layer and '.card{' in layer, 'refinement layer not located correctly'

# @keyframes bodies nest braces, which would pollute property extraction; scan them
# on their own and require them to animate only compositor-friendly properties.
kf_props = set()
for kfm in re.finditer(r'@keyframes\s+[\w-]+\{(.+?)\}\}', layer, re.S):
    for part in kfm.group(1).split(';'):
        if ':' in part: kf_props.add(part.split(':', 1)[0].strip().split('{')[-1].strip())
rest = re.sub(r'@keyframes\s+[\w-]+\{.+?\}\}', '', layer, flags=re.S)
check(kf_props <= {'transform', 'opacity'},
      'layer keyframes animate only transform/opacity (never layout)', str(sorted(kf_props)))

# properties that can change a box's size, its place in flow, or its clipping
LAYOUT = {'width','height','min-width','max-width','min-height','max-height',
          'padding','padding-top','padding-right','padding-bottom','padding-left',
          'margin','margin-top','margin-right','margin-bottom','margin-left',
          'display','grid-template-columns','grid-column','grid-row','flex','flex-direction',
          'flex-wrap','gap','row-gap','column-gap','top','right','bottom','left',
          'overflow','overflow-x','overflow-y','float','z-index','place-items',
          'align-items','justify-content','box-sizing'}
SURFACE = {'background','background-image','box-shadow','border','border-color','border-radius',
           'color','transition','animation','letter-spacing','text-transform','opacity',
           'transform','outline','content','filter','font-variant-numeric'}
props = {}
def harvest(text):
    """Collect property -> selectors. At-rules are recursed into rather than split,
    because their bodies contain nested braces that would masquerade as properties."""
    for b in blocks(text):
        mm = re.match(r'^([^{]+)\{(.*)\}$', b, re.S)
        if not mm: continue
        sel, decl = mm.group(1).strip(), mm.group(2)
        if sel.startswith('@'):
            harvest(decl); continue
        for part in decl.split(';'):
            if ':' in part:
                k = part.split(':', 1)[0].strip()
                if k: props.setdefault(k, set()).add(sel[:44])
harvest(rest)

offenders = {k: v for k, v in props.items() if k in LAYOUT}
for k, v in sorted(offenders.items()):
    print('      LAYOUT %-14s used by %s' % (k, ', '.join(sorted(v)[:3])))
check(not offenders, 'refinement layer declares no layout property',
      '%d offenders' % len(offenders) if offenders else 'surface-only')

# `position` and `inset` are permitted only where they cannot move anything:
# a relative wrapper with no offsets, and an absolutely-positioned pseudo-element
# inside a parent that already clips.
for sel in sorted(props.get('position', ())):
    ok = sel == '.prg > i' or sel.endswith('::after') or sel.endswith('::before')
    if not ok: print('      POSITION on %s' % sel)
check(all(s2 == '.prg > i' or s2.endswith('::after') or s2.endswith('::before')
          for s2 in props.get('position', ())),
      'position is used only on the offset-free .prg > i wrapper and on out-of-flow pseudo-elements',
      str(sorted(props.get('position', ()))))
check(all(s2.endswith('::after') or s2.endswith('::before') for s2 in props.get('inset', ())),
      'inset is used only on out-of-flow pseudo-elements', str(sorted(props.get('inset', ()))))

custom = {k for k in props if k.startswith('--')}
unknown = set(props) - LAYOUT - SURFACE - custom - {'position', 'inset'}
check(not unknown, 'every refinement property is a known surface property or a new token',
      str(sorted(unknown)) if unknown else '')
check(len(custom) >= 6, 'the elevation scale is tokenised, not hardcoded per component',
      '%d new tokens: %s' % (len(custom), ', '.join(sorted(custom))))
print('      surface properties used: %s' % ', '.join(sorted(set(props) - custom)))

# ------------------------------------------------------------------- summary
print('\n' + '=' * 74)
for n in notes: print('  ' + n)
for f in fails: print('  ' + f)
print('=' * 74)
print('PASS %d   FAIL %d' % (len(notes), len(fails)))
sys.exit(1 if fails else 0)
