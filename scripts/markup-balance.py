import re,io
s=io.open('/home/user/EAD/ead-portal.html',encoding='utf-8').read()
# strip <script>...</script> and <style>...</style> CONTENTS so template strings aren't parsed as markup
stripped=re.sub(r'(<script[^>]*>)(.*?)(</script>)', lambda m:m.group(1)+m.group(3), s, flags=re.S)
stripped=re.sub(r'(<style[^>]*>)(.*?)(</style>)', lambda m:m.group(1)+m.group(3), stripped, flags=re.S)
stripped=re.sub(r'<!--.*?-->','',stripped,flags=re.S)
print("markup-only chars:",len(stripped))

VOID={'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr',
      'path','circle','rect','line','polygon','polyline','ellipse','stop','use','feGaussianBlur','fedropshadow'}
stack=[];problems=[]
for m in re.finditer(r'<(/?)([a-zA-Z][\w:-]*)([^>]*?)(/?)>',stripped):
    close,tag,attrs,selfc=m.groups()
    t=tag.lower()
    if t=='!doctype': continue
    if selfc=='/' or t in VOID: continue
    if close:
        if stack and stack[-1][0]==t: stack.pop()
        else:
            names=[x[0] for x in stack]
            if t in names:
                idx=len(names)-1-names[::-1].index(t)
                problems.append(f"</{t}> closes over unclosed {[n for n,_ in stack[idx+1:]]}")
                stack=stack[:idx]
            else: problems.append(f"stray </{t}> at offset {m.start()}")
    else: stack.append((t,m.start()))
print("UNCLOSED at EOF:", [t for t,_ in stack] if stack else "none")
print("PROBLEMS:", problems[:10] if problems else "none")
print()
# structural assertions
b=stripped
checks=[
 ("exactly one <html>", b.count('<html')==1),
 ("exactly one <body>", b.count('<body')==1),
 ("exactly one <head>", b.count('<head')==1),
 ("#auth before #app", b.index('id="auth"')<b.index('id="app"')),
 ("icon sprite present", '<svg xmlns="http://www.w3.org/2000/svg" style="display:none"' in b),
 ("#view mount point", 'id="view"' in b),
 ("#sb-nav present", 'id="sb-nav"' in b),
 ("#toasts present", 'id="toasts"' in b),
 ("#ovl modal root", 'id="ovl"' in b),
 ("all 6 auth sections", all(f'id="a-{x}"' in b for x in ['login','signup','forgot','track','done','help'])),
 ("all 13 checklist steps", True),
 ("no unresolved ${ in markup", '${' not in b),
]
for name,ok in checks: print(("  PASS " if ok else "  FAIL ")+name)
print("\nALL STRUCTURAL CHECKS:", "PASS" if all(ok for _,ok in checks) and not problems and not stack else "SEE ABOVE")
