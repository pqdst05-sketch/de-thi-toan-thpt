from pathlib import Path
from html.parser import HTMLParser
import json,re
ROOT=Path(__file__).resolve().parents[1]
class P(HTMLParser):
 def __init__(self): super().__init__(); self.title=False; self.parts=[]; self.meta={}
 def handle_starttag(self,t,a):
  a=dict(a)
  if t.lower()=="title": self.title=True
  if t.lower()=="meta":
   n=(a.get("name") or a.get("property") or "").lower()
   if n in {"exam-title","school","location","school-year"}: self.meta[n]=a.get("content","").strip()
 def handle_endtag(self,t):
  if t.lower()=="title": self.title=False
 def handle_data(self,d):
  if self.title:self.parts.append(d.strip())
def main():
 exams=[]
 for gd in sorted(ROOT.glob("lop[0-9]*")):
  m=re.fullmatch(r"lop(\d+)",gd.name)
  if not m:continue
  for f in sorted(gd.rglob("*.html")):
   if f.name.lower()=="index.html":continue
   rel=f.relative_to(ROOT).as_posix(); parts=f.relative_to(gd).parts
   p=P()
   try:p.feed(f.read_text(encoding="utf-8",errors="replace")[:300000])
   except OSError:continue
   title=p.meta.get("exam-title") or " ".join(p.parts).strip() or re.sub(r"[-_]+"," ",f.stem).title()
   exams.append({"grade":int(m.group(1)),"category":parts[0] if len(parts)>1 else "khac","title":title,"school":p.meta.get("school",""),"location":p.meta.get("location",""),"year":p.meta.get("school-year",""),"path":rel})
 exams.sort(key=lambda x:(x["grade"],x["category"],x["year"],x["title"].casefold()))
 (ROOT/"catalog.json").(ROOT/"catalog.json").write_text(json.dumps({"exam_count":len(exams),"exams":exams},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print(f"Đã tạo danh mục gồm {len(exams)} đề.")
if __name__=="__main__":main()
