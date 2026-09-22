import os
import re
import sys
import pdfplumber

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
PDF_DIR = os.path.join(ROOT, "content/curriculum/pdfs")
OUT_DIR = os.path.join(ROOT, "content/curriculum")

def clean(t):
    return " ".join(t.split()) if t else ""

def norm_code(code):
    if not code: return ""
    c = re.sub(r'[^A-Z0-9]', ' ', code.upper())
    return ' '.join(c.split())

# Parse syllabi from all available PDFs
def build_all_syllabi():
    syllabi = {}
    pdfs = [f for f in os.listdir(PDF_DIR) if f.endswith(".pdf")]
    print(f"Building syllabi index from {len(pdfs)} PDFs in {PDF_DIR}...")
    
    for pdf_file in pdfs:
        path = os.path.join(PDF_DIR, pdf_file)
        try:
            with pdfplumber.open(path) as pdf:
                for page in pdf.pages:
                    text = page.extract_text() or ""
                    if len(text) < 40: continue

                    code = None
                    title = None
                    creds = None
                    cat = "PC"

                    # Header table check
                    tables = page.extract_tables() or []
                    for t in tables:
                        if not t: continue
                        for row in t:
                            for cell in row:
                                if not cell: continue
                                m = re.search(r'Course\s*Code[^\n]*\n([A-Z0-9\s/]+)', cell, re.I)
                                if m: code = norm_code(m.group(1))
                                m_t = re.search(r'(?:Course\s*Title[^\n]*\n)?([A-Za-z\s&,()]+(?:Methods|Algorithms|Systems|Design|Programming|Mathematics|Physics|Chemistry|Science|Engineering|Networks|Intelligence|Electronics|Technology|Data|Management|Materials|Mechanics|Machines|Graphics|Communication)[^\n]*)', cell, re.I)
                                if m_t and not code: title = clean(m_t.group(1))

                    if not code:
                        m_code = re.search(r'Course\s*Code\s*[:\-]?\s*([A-Z]{2,4}\s*(?:IC|PC|NC|PE|OE)?\s*\d{2,3}[A-Z]?)', text, re.I)
                        if m_code:
                            code = norm_code(m_code.group(1))
                        else:
                            m_direct = re.search(r'\b([A-Z]{2,4}\s*(?:IC|PC|NC|PE|OE)\s*\d{3}[A-Z]?)\b', text[:200])
                            if m_direct: code = norm_code(m_direct.group(1))

                    if not code or len(code) < 4: continue

                    if not title:
                        m_title = re.search(r'Course\s*Title\s*[:\-]?\s*([^\n]+)', text, re.I)
                        if m_title:
                            title = clean(m_title.group(1))
                        else:
                            lines = [l.strip() for l in text.split('\n') if l.strip()]
                            for l in lines[:4]:
                                if not re.search(r'Course|Code|B\.Tech|Department|Semester|Credits|Page', l, re.I) and len(l) > 5:
                                    title = clean(l)
                                    break

                    m_creds = re.search(r'(?:Number\s*of\s*Credits|Credits)[^:\n]*[:\-]?\s*([^\n]+)', text, re.I)
                    if m_creds: creds = clean(m_creds.group(1))

                    m_cat = re.search(r'Course\s*(?:Category|Type)\s*[:\-]?\s*([A-Z]+)', text, re.I)
                    if m_cat: cat = clean(m_cat.group(1))

                    objs = []
                    obj_sec = re.search(r'(?:Course\s*Learning\s*Objectives|Course\s*Objectives)\s*[:\-]?\s*(.*?)(?=(?:Course\s*Content|Course\s*Contents?|Units?|Text\s*Books?|References?|$))', text, re.S | re.I)
                    if obj_sec:
                        for l in obj_sec.group(1).split('\n'):
                            l = l.strip()
                            if not l: continue
                            if re.match(r'^\d+\.', l): objs.append(re.sub(r'^\d+\.\s*', '', l).strip())
                            elif objs: objs[-1] += ' ' + l

                    units = []
                    content_sec = re.search(r'(?:Course\s*Content|Course\s*Contents?)\s*[:\-]?\s*(.*?)(?=(?:Text\s*Books?|Reference\s*Books?|References?|Course\s*Outcomes?|$))', text, re.S | re.I)
                    if content_sec:
                        raw_content = content_sec.group(1).strip()
                        parts = list(re.finditer(r'(?:^|\n)(?:(?:Unit\s*(\d+)[:\-]?\s*|(\d+)\.\s*)([^\n]+))', raw_content, re.I))
                        for i, m in enumerate(parts):
                            u_num = m.group(1) or m.group(2)
                            u_title = clean(m.group(3))
                            start = m.end()
                            end = parts[i+1].start() if i + 1 < len(parts) else len(raw_content)
                            body = clean(raw_content[start:end])
                            units.append((f'Unit {u_num}: {u_title}', body))

                    books = []
                    books_sec = re.search(r'(?:Text\s*Books?|Reference\s*Books?|References?)\s*[:\-]?\s*(.*?)(?=(?:Course\s*Outcomes?|Prerequisites?|$))', text, re.S | re.I)
                    if books_sec:
                        for l in books_sec.group(1).split('\n'):
                            l = l.strip()
                            if not l: continue
                            if re.match(r'^\d+\.', l): books.append(re.sub(r'^\d+\.\s*', '', l).strip())
                            elif books: books[-1] += ' ' + l

                    syllabi[code] = {
                        "title": title or code,
                        "category": cat or "PC",
                        "credits": creds or "4",
                        "objectives": objs,
                        "units": units,
                        "references": books[:5]
                    }
                    syllabi[code.replace(" ", "")] = syllabi[code]
        except Exception as e:
            print(f"  Error reading {pdf_file}: {e}")

    print(f"Indexed {len(syllabi)} course syllabi from PDFs.")
    return syllabi

def write_sem_markdown(branch, sem, year, total_credits, contact_hours, batch, source, courses, syllabi_db):
    branch_dir = os.path.join(OUT_DIR, branch)
    os.makedirs(branch_dir, exist_ok=True)
    out_file = os.path.join(branch_dir, f"sem-{sem}.md")

    lines = [
        "---",
        f"branch: {branch}",
        f"semester: {sem}",
        f"year: {year}",
        f"totalCredits: {total_credits}",
        f"contactHours: {contact_hours}",
        f"batch: {batch}",
        f"source: {source}",
        "---",
        "",
        f"# {branch} · Semester {sem}",
        "",
        "## Courses",
        "",
        "| Code | Title | Category | Type | L | T | P | Credits | Contact |",
        "|---|---|---|---|---|---|---|---|---|",
    ]

    for c in courses:
        code = c.get("code", "").replace("|", "-")
        title = c.get("title", "").replace("|", "-")
        cat = c.get("category", "PC").replace("|", "-")
        ctype = c.get("type", "Theory").replace("|", "-")
        l = str(c.get("l", "0"))
        t = str(c.get("t", "0"))
        p = str(c.get("p", "0"))
        creds = str(c.get("credits", "0"))
        contact = str(c.get("contact", ""))
        lines.append(f"| {code} | {title} | {cat} | {ctype} | {l} | {t} | {p} | {creds} | {contact} |")

    lines.append("")
    lines.append("## Syllabi")
    lines.append("")

    for c in courses:
        code = c.get("code", "")
        code_norm = norm_code(code)
        syl = syllabi_db.get(code_norm) or syllabi_db.get(code_norm.replace(" ", "")) or {}
        title = c.get("title", syl.get("title", code))
        cat = c.get("category", syl.get("category", "PC"))
        creds = c.get("credits", syl.get("credits", "4"))
        contact = c.get("contact", "")
        lines.append(f"### {code}: {title}")
        meta = []
        if cat: meta.append(f"**Category**: {cat}")
        if creds: meta.append(f"**Credits**: {creds}")
        if contact: meta.append(f"**Contact Hours**: {contact}")
        if meta:
            lines.append("- " + " | ".join(meta))
            lines.append("")

        objs = syl.get("objectives", [])
        if objs:
            lines.append("#### Objectives")
            for i, obj in enumerate(objs, 1):
                lines.append(f"{i}. {obj}")
            lines.append("")

        units = syl.get("units", [])
        if units:
            lines.append("#### Units")
            lines.append("")
            for u_title, u_body in units:
                lines.append(f"##### {u_title}")
                lines.append(f"{u_body}")
                lines.append("")

        refs = syl.get("references", [])
        if refs:
            lines.append("#### References")
            for ref in refs:
                lines.append(f"- {ref}")
            lines.append("")

    with open(out_file, "w", encoding="utf-8") as f:
        f.write("\n".join(lines).strip() + "\n")

# Common 1st Year course templates
def get_1st_year_courses(group_type, sem):
    if group_type == 1: # CSE, IT, AIML, AIDS, IIOT, MNC, ECE
        if sem == 1:
            return [
                {"code": "HSIC 101", "title": "Communication Skills in English", "category": "IC", "type": "Theory", "l": 2, "t": 0, "p": 2, "credits": 3, "contact": 4},
                {"code": "MAIC 101", "title": "Differential Calculus and Differential Equations", "category": "IC", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
                {"code": "PHIC 101", "title": "Engineering Physics", "category": "IC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
                {"code": "MEIC 102", "title": "Engineering Practice", "category": "IC", "type": "Practical", "l": 1, "t": 0, "p": 3, "credits": 2, "contact": 4},
                {"code": "CSIC 101", "title": "Problems Solving and Programming Using C", "category": "IC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
                {"code": "CHIC 101", "title": "Energy and Environmental Science", "category": "IC", "type": "Integrated", "l": 2, "t": 0, "p": 2, "credits": 3, "contact": 4},
                {"code": "HSNC 101", "title": "Human Values and Social Responsibility", "category": "NC", "type": "Theory", "l": 2, "t": 0, "p": 0, "credits": "2*", "contact": 2},
                {"code": "SWNC 101", "title": "NCC/Sports/Yoga", "category": "NC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": "2*", "contact": 4},
            ]
        else:
            return [
                {"code": "HSIC 102", "title": "Economics for Engineers", "category": "IC", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
                {"code": "MAIC 102", "title": "Integral Calculus and Difference Equations", "category": "IC", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
                {"code": "CSIC 100", "title": "Digital System Design", "category": "IC", "type": "Theory", "l": 4, "t": 0, "p": 0, "credits": 4, "contact": 4},
                {"code": "CSIC 102", "title": "Engineering Graphics (Web Design)", "category": "IC", "type": "Practical", "l": 1, "t": 0, "p": 3, "credits": 2, "contact": 4},
                {"code": "CSIC 104", "title": "Programming using Python", "category": "IC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
                {"code": "CHIC 102", "title": "Chemistry", "category": "IC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
                {"code": "HSNC 106", "title": "Indian Knowledge Systems", "category": "NC", "type": "Theory", "l": 2, "t": 0, "p": 0, "credits": "2*", "contact": 2},
                {"code": "SWNC 102", "title": "NSS/Clubs/Technical Societies", "category": "NC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": "2*", "contact": 4},
            ]
    else: # EE, CIVIL, MECH, PIE, SE, RA, VLSI
        if sem == 1:
            return [
                {"code": "HSIC 102", "title": "Economics for Engineers", "category": "IC", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
                {"code": "MAIC 101", "title": "Differential Calculus and Differential Equations", "category": "IC", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
                {"code": "PHIC 101", "title": "Engineering Physics", "category": "IC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
                {"code": "CEIC 101", "title": "Engineering Graphics", "category": "IC", "type": "Practical", "l": 1, "t": 0, "p": 3, "credits": 2, "contact": 4},
                {"code": "CSIC 103", "title": "Problems Solving and Programming using C", "category": "IC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
                {"code": "CHIC 101", "title": "Energy and Environmental Science", "category": "IC", "type": "Integrated", "l": 2, "t": 0, "p": 2, "credits": 3, "contact": 4},
                {"code": "HSNC 106", "title": "Indian Knowledge Systems", "category": "NC", "type": "Theory", "l": 2, "t": 0, "p": 0, "credits": "2*", "contact": 2},
                {"code": "SWNC 101", "title": "NCC/Sports/Yoga", "category": "NC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": "2*", "contact": 4},
            ]
        else:
            return [
                {"code": "HSIC 101", "title": "Communication Skills in English", "category": "IC", "type": "Theory", "l": 2, "t": 0, "p": 2, "credits": 3, "contact": 4},
                {"code": "MAIC 102", "title": "Integral Calculus and Difference Equations", "category": "IC", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
                {"code": "PHIC 102", "title": "Advanced Engineering Physics", "category": "IC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
                {"code": "MEIC 102", "title": "Engineering Practice", "category": "IC", "type": "Practical", "l": 1, "t": 0, "p": 3, "credits": 2, "contact": 4},
                {"code": "CHIC 102", "title": "Chemistry", "category": "IC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
                {"code": "HSNC 101", "title": "Human Values and Social Responsibility", "category": "NC", "type": "Theory", "l": 2, "t": 0, "p": 0, "credits": "2*", "contact": 2},
                {"code": "SWNC 102", "title": "NSS/Clubs/Technical Societies", "category": "NC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": "2*", "contact": 4},
            ]

print("Course templates initialized")
