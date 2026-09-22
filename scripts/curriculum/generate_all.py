import os
import re
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

def build_syllabi_db():
    syllabi = {}
    pdfs = [f for f in os.listdir(PDF_DIR) if f.endswith(".pdf")]
    print(f"Extracting syllabi from {len(pdfs)} PDF archives in {PDF_DIR}...")
    for pdf_file in pdfs:
        p = os.path.join(PDF_DIR, pdf_file)
        try:
            with pdfplumber.open(p) as doc:
                for page in doc.pages:
                    text = page.extract_text() or ""
                    if len(text) < 40: continue

                    code = None
                    title = None
                    creds = None
                    cat = "PC"

                    m_code = re.search(r'Course\s*Code\s*[:\-]?\s*([A-Z0-9\s/]+)', text, re.I)
                    if m_code:
                        raw = m_code.group(1).split('\n')[0]
                        m_clean = re.search(r'([A-Z]{2,4}\s*(?:IC|PC|NC|PE|OE|IR)?\s*\d{2,3}[A-Z]?)', raw, re.I)
                        if m_clean:
                            code = norm_code(m_clean.group(1))

                    if not code:
                        m_dir = re.search(r'\b([A-Z]{2,4}\s*(?:IC|PC|NC|PE|OE)\s*\d{3}[A-Z]?)\b', text[:200])
                        if m_dir:
                            code = norm_code(m_dir.group(1))

                    if not code or len(code) < 4:
                        continue

                    m_title = re.search(r'Course\s*Title\s*[:\-]?\s*([^\n]+)', text, re.I)
                    if m_title:
                        title = clean(m_title.group(1))
                    else:
                        lines = [l.strip() for l in text.split('\n') if l.strip()]
                        for l in lines[:4]:
                            if not re.search(r'Course|Code|B\.Tech|Department|Semester|Credits|Page|Scheme', l, re.I) and len(l) > 5:
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
                    if not content_sec:
                        m_u = re.search(r'(?:^|\n)((?:Unit|Module|Section)\s*(?:[0-9]+|[IVXLCDM]+)[:\-]?\s*.*?)(?=(?:Text\s*Books?|Reference\s*Books?|References?|Course\s*Outcomes?|$))', text, re.S | re.I)
                        if m_u:
                            content_sec = m_u
                    if content_sec:
                        raw_content = content_sec.group(1).strip()
                        parts = list(re.finditer(r'(?:^|\n)(?:(?:Unit|Module|Section)\s*([0-9IVXLCDM]+)[:\-]?\s*|(\d+)\.\s*)([^\n]+)', raw_content, re.I))
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
            print(f"  Note: {pdf_file} parse: {e}")

    print(f"Loaded {len(syllabi)} course syllabi into memory.")
    return syllabi

def write_sem_file(branch, sem, year, total_credits, contact_hours, batch, source, courses, db):
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
        code_n = norm_code(code)
        syl = db.get(code_n) or db.get(code_n.replace(" ", "")) or {}
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

# Branch groups
GRP1 = ["CSE", "IT", "AIML", "AIDS", "IIOT", "MNC", "ECE"]
GRP2 = ["EE", "CIVIL", "MECH", "PIE", "SE", "RA", "VLSI"]

def get_first_year(branch, sem):
    is_grp1 = branch in GRP1
    if is_grp1:
        if sem == 1:
            return {
                "credits": 22, "contact": 26, "source": "Scheme & Syllabi of B.Tech. 1st year 2023 batch onwards",
                "courses": [
                    {"code": "HSIC 101", "title": "Communication Skills in English", "category": "IC", "type": "Theory", "l": 2, "t": 0, "p": 2, "credits": 3, "contact": 4},
                    {"code": "MAIC 101", "title": "Differential Calculus and Differential Equations", "category": "IC", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
                    {"code": "PHIC 101", "title": "Engineering Physics", "category": "IC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
                    {"code": "MEIC 102", "title": "Engineering Practice", "category": "IC", "type": "Practical", "l": 1, "t": 0, "p": 3, "credits": 2, "contact": 4},
                    {"code": "CSIC 101", "title": "Problems Solving and Programming Using C", "category": "IC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
                    {"code": "CHIC 101", "title": "Energy and Environmental Science", "category": "IC", "type": "Integrated", "l": 2, "t": 0, "p": 2, "credits": 3, "contact": 4},
                    {"code": "HSNC 101", "title": "Human Values and Social Responsibility", "category": "NC", "type": "Theory", "l": 2, "t": 0, "p": 0, "credits": "2*", "contact": 2},
                    {"code": "SWNC 101", "title": "NCC/Sports/Yoga", "category": "NC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": "2*", "contact": 4},
                ]
            }
        else:
            return {
                "credits": 22, "contact": 25, "source": "Scheme & Syllabi of B.Tech. 1st year 2023 batch onwards",
                "courses": [
                    {"code": "HSIC 102", "title": "Economics for Engineers", "category": "IC", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
                    {"code": "MAIC 102", "title": "Integral Calculus and Difference Equations", "category": "IC", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
                    {"code": "CSIC 100", "title": "Digital System Design", "category": "IC", "type": "Theory", "l": 4, "t": 0, "p": 0, "credits": 4, "contact": 4},
                    {"code": "CSIC 102", "title": "Engineering Graphics (Web Design)", "category": "IC", "type": "Practical", "l": 1, "t": 0, "p": 3, "credits": 2, "contact": 4},
                    {"code": "CSIC 104", "title": "Programming using Python", "category": "IC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
                    {"code": "CHIC 102", "title": "Chemistry", "category": "IC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
                    {"code": "HSNC 106", "title": "Indian Knowledge Systems", "category": "NC", "type": "Theory", "l": 2, "t": 0, "p": 0, "credits": "2*", "contact": 2},
                    {"code": "SWNC 102", "title": "NSS/Clubs/Technical Societies", "category": "NC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": "2*", "contact": 4},
                ]
            }
    else:
        if sem == 1:
            return {
                "credits": 22, "contact": 26, "source": "Scheme & Syllabi of B.Tech. 1st year 2023 batch onwards",
                "courses": [
                    {"code": "HSIC 102", "title": "Economics for Engineers", "category": "IC", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
                    {"code": "MAIC 101", "title": "Differential Calculus and Differential Equations", "category": "IC", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
                    {"code": "PHIC 101", "title": "Engineering Physics", "category": "IC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
                    {"code": "CEIC 101", "title": "Engineering Graphics", "category": "IC", "type": "Practical", "l": 1, "t": 0, "p": 3, "credits": 2, "contact": 4},
                    {"code": "CSIC 103", "title": "Problems Solving and Programming using C", "category": "IC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
                    {"code": "CHIC 101", "title": "Energy and Environmental Science", "category": "IC", "type": "Integrated", "l": 2, "t": 0, "p": 2, "credits": 3, "contact": 4},
                    {"code": "HSNC 106", "title": "Indian Knowledge Systems", "category": "NC", "type": "Theory", "l": 2, "t": 0, "p": 0, "credits": "2*", "contact": 2},
                    {"code": "SWNC 101", "title": "NCC/Sports/Yoga", "category": "NC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": "2*", "contact": 4},
                ]
            }
        else:
            return {
                "credits": 22, "contact": 26, "source": "Scheme & Syllabi of B.Tech. 1st year 2023 batch onwards",
                "courses": [
                    {"code": "HSIC 101", "title": "Communication Skills in English", "category": "IC", "type": "Theory", "l": 2, "t": 0, "p": 2, "credits": 3, "contact": 4},
                    {"code": "MAIC 102", "title": "Integral Calculus and Difference Equations", "category": "IC", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
                    {"code": "PHIC 102", "title": "Advanced Engineering Physics", "category": "IC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
                    {"code": "MEIC 102", "title": "Engineering Practice", "category": "IC", "type": "Practical", "l": 1, "t": 0, "p": 3, "credits": 2, "contact": 4},
                    {"code": "CHIC 102", "title": "Chemistry", "category": "IC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
                    {"code": "HSNC 101", "title": "Human Values and Social Responsibility", "category": "NC", "type": "Theory", "l": 2, "t": 0, "p": 0, "credits": "2*", "contact": 2},
                    {"code": "SWNC 102", "title": "NSS/Clubs/Technical Societies", "category": "NC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": "2*", "contact": 4},
                ]
            }

def run():
    db = build_syllabi_db()

    # 1. 1st Year for all branches
    all_branches = ["CSE", "IT", "AIML", "AIDS", "MNC", "IIOT", "ECE", "EE", "MECH", "CIVIL", "PIE", "VLSI", "RA", "SE"]
    for b in all_branches:
        for s in [1, 2]:
            info = get_first_year(b, s)
            write_sem_file(b, s, 1, info["credits"], info["contact"], "2023 onwards", info["source"], info["courses"], db)

    # Architecture Sem 1 & 2
    arch_sem1 = [
        {"code": "ARPC 101", "title": "Architectural Design - I", "category": "PC", "type": "Practical", "l": 1, "t": 0, "p": 6, "credits": 5, "contact": 7},
        {"code": "ARPC 103", "title": "Building Construction - I", "category": "PC", "type": "Practical", "l": 1, "t": 0, "p": 4, "credits": 4, "contact": 5},
        {"code": "ARPC 105", "title": "Architectural Graphics - I", "category": "PC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": 3, "contact": 4},
        {"code": "ARPC 107", "title": "History of Architecture - I", "category": "PC", "type": "Theory", "l": 2, "t": 0, "p": 0, "credits": 2, "contact": 2},
        {"code": "ARIC 101", "title": "Structural Mechanics - I", "category": "IC", "type": "Theory", "l": 2, "t": 1, "p": 0, "credits": 3, "contact": 3},
        {"code": "HSIC 101", "title": "Communication Skills in English", "category": "IC", "type": "Theory", "l": 2, "t": 0, "p": 2, "credits": 3, "contact": 4},
        {"code": "SWNC 101", "title": "NCC/Sports/Yoga", "category": "NC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": "2*", "contact": 4},
    ]
    arch_sem2 = [
        {"code": "ARPC 102", "title": "Architectural Design - II", "category": "PC", "type": "Practical", "l": 1, "t": 0, "p": 6, "credits": 5, "contact": 7},
        {"code": "ARPC 104", "title": "Building Construction - II", "category": "PC", "type": "Practical", "l": 1, "t": 0, "p": 4, "credits": 4, "contact": 5},
        {"code": "ARPC 106", "title": "Architectural Graphics - II", "category": "PC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": 3, "contact": 4},
        {"code": "ARPC 108", "title": "History of Architecture - II", "category": "PC", "type": "Theory", "l": 2, "t": 0, "p": 0, "credits": 2, "contact": 2},
        {"code": "ARIC 102", "title": "Structural Mechanics - II", "category": "IC", "type": "Theory", "l": 2, "t": 1, "p": 0, "credits": 3, "contact": 3},
        {"code": "CSIC 102", "title": "Architectural Computing & Visual Arts", "category": "IC", "type": "Practical", "l": 1, "t": 0, "p": 3, "credits": 3, "contact": 4},
        {"code": "SWNC 102", "title": "NSS/Clubs/Technical Societies", "category": "NC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": "2*", "contact": 4},
    ]
    write_sem_file("ARCH", 1, 1, 20, 29, "2024 onwards", "Scheme & Syllabus of B.Arch.", arch_sem1, db)
    write_sem_file("ARCH", 2, 1, 20, 29, "2024 onwards", "Scheme & Syllabus of B.Arch.", arch_sem2, db)

    # 2. CSE Sem 3 to 8
    cse_sem3 = [
        {"code": "MAIC 201", "title": "Discrete Mathematics and Statistical Methods", "category": "IC", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
        {"code": "CSPC 201", "title": "Design and Analysis of Algorithms", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "CSPC 203", "title": "Computer Organization and Architecture", "category": "PC", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
        {"code": "CSPC 205", "title": "Object-Oriented Programming using Java", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "CSPC 207", "title": "Software Engineering", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "CSPC 209", "title": "IoT Programming", "category": "PC", "type": "Practical", "l": 1, "t": 0, "p": 2, "credits": 2, "contact": 3},
        {"code": "SWNC 101", "title": "NCC/Sports/Yoga", "category": "NC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": "2*", "contact": 4},
        {"code": "SWNC 102", "title": "NSS/Club/Technical Societies", "category": "NC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": "2*", "contact": 4},
    ]
    cse_sem4 = [
        {"code": "CSIC 221", "title": "Machine Learning and Data Analytics", "category": "IC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "CSPC 200", "title": "Operating Systems", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "CSPC 202", "title": "Computer Networks", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "CSPC 204", "title": "Artificial Intelligence and Soft Computing", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "CSPC 206", "title": "Database Management Systems", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "CSPE 210", "title": "Software Development using UML and Agile Methodology", "category": "PE", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "CSPE 212", "title": "Competitive Programming and Efficient Coding", "category": "PE", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "CSPE 214", "title": "Scripting Language", "category": "PE", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "SWNC 101", "title": "NCC/Sports/Yoga", "category": "NC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": "2*", "contact": 4},
        {"code": "SWNC 102", "title": "NSS/Club/Technical Societies", "category": "NC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": "2*", "contact": 4},
    ]
    cse_sem5 = [
        {"code": "CSPC 31", "title": "Advanced Data Structures and Algorithms", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "CSPC 33", "title": "Soft Computing", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "CSPC 35", "title": "Software Development using UML and Agile Methodology", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "CSPC 37", "title": "Automata Theory", "category": "PC", "type": "Theory", "l": 3, "t": 1, "p": 0, "credits": 4, "contact": 4},
        {"code": "CSPC 39", "title": "Seminar", "category": "PC", "type": "Practical", "l": 0, "t": 0, "p": 2, "credits": 1, "contact": 2},
        {"code": "CSPE 31", "title": "Advanced Database Systems", "category": "PE", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "CSPE 33", "title": "Embedded System Development", "category": "PE", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "CSPE 71", "title": "Software Verification and Validation", "category": "PE", "type": "Theory", "l": 3, "t": 1, "p": 0, "credits": 4, "contact": 4},
        {"code": "CSPE 75", "title": "Advanced Computer Architecture", "category": "PE", "type": "Theory", "l": 3, "t": 1, "p": 0, "credits": 4, "contact": 4},
    ]
    cse_sem6 = [
        {"code": "CSIR 30", "title": "Internship / Industrial Training", "category": "PC", "type": "Practical", "l": 0, "t": 0, "p": 0, "credits": 10, "contact": 0},
        {"code": "CSIR 32", "title": "Project Work", "category": "PC", "type": "Practical", "l": 0, "t": 0, "p": 0, "credits": 10, "contact": 0},
    ]
    cse_sem7 = [
        {"code": "HSIR 13", "title": "Business Management", "category": "IC", "type": "Theory", "l": 2, "t": 1, "p": 0, "credits": 3, "contact": 3},
        {"code": "CSPC 41", "title": "Machine Learning", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "CSPC 43", "title": "Distributed Computing", "category": "PC", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
        {"code": "CSPC 45", "title": "Information Security", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "CSPE 41", "title": "Cloud and Grid Computing", "category": "PE", "type": "Theory", "l": 3, "t": 1, "p": 0, "credits": 4, "contact": 4},
        {"code": "CSPE 43", "title": "Natural Language Processing", "category": "PE", "type": "Theory", "l": 3, "t": 1, "p": 0, "credits": 4, "contact": 4},
        {"code": "CSPE 45", "title": "Computer Vision", "category": "PE", "type": "Theory", "l": 3, "t": 1, "p": 0, "credits": 4, "contact": 4},
        {"code": "CSOE 41", "title": "Open Elective I (Operating Systems)", "category": "OE", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
    ]
    cse_sem8 = [
        {"code": "HSIR 14", "title": "Professional Ethics & IPR", "category": "IC", "type": "Practical", "l": 1, "t": 0, "p": 2, "credits": 2, "contact": 3},
        {"code": "CSPC 40", "title": "Big Data Analytics", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "CSPE 40", "title": "Project", "category": "PC", "type": "Practical", "l": 0, "t": 0, "p": 3, "credits": 4, "contact": 6},
        {"code": "CSIR 40", "title": "Comprehensive Viva Voce", "category": "PC", "type": "Practical", "l": 0, "t": 0, "p": 0, "credits": 3, "contact": 0},
        {"code": "CSPE 42", "title": "High Performance Computing", "category": "PE", "type": "Theory", "l": 3, "t": 1, "p": 0, "credits": 4, "contact": 4},
        {"code": "CSPE 44", "title": "Human Computer Interaction", "category": "PE", "type": "Theory", "l": 3, "t": 1, "p": 0, "credits": 4, "contact": 4},
        {"code": "CSPE 46", "title": "Compiler Design", "category": "PE", "type": "Theory", "l": 3, "t": 1, "p": 0, "credits": 4, "contact": 4},
        {"code": "CSOE 40", "title": "Open Elective II (Database Systems)", "category": "OE", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
        {"code": "CSOE 42", "title": "Open Elective III (Soft Computing)", "category": "OE", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
    ]
    write_sem_file("CSE", 3, 2, 21, 25, "2023 onwards", "Scheme & Syllabi of B.Tech. (2nd Year) COE", cse_sem3, db)
    write_sem_file("CSE", 4, 2, 20, 25, "2023 onwards", "Scheme & Syllabi of B.Tech. (2nd Year) COE", cse_sem4, db)
    write_sem_file("CSE", 5, 3, 25, 30, "B.Tech Scheme 5th Sem w.e.f 2017-18", "Computer-UG-New-Scheme", cse_sem5, db)
    write_sem_file("CSE", 6, 3, 10, 0, "B.Tech Scheme 6th Sem w.e.f 2017-18", "Computer-UG-New-Scheme", cse_sem6, db)
    write_sem_file("CSE", 7, 4, 21, 23, "B.Tech Scheme 7th Sem w.e.f 2017-18", "Computer-UG-New-Scheme", cse_sem7, db)
    write_sem_file("CSE", 8, 4, 23, 21, "B.Tech Scheme 8th Sem w.e.f 2017-18", "Computer-UG-New-Scheme", cse_sem8, db)

    # 3. IT Sem 3 to 8
    it_sem3 = [
        {"code": "MAIC 201", "title": "Mathematics III", "category": "IC", "type": "Theory", "l": 3, "t": 1, "p": 0, "credits": 4, "contact": 4},
        {"code": "ITPC 201", "title": "Design and Analysis of Algorithms", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "ITPC 203", "title": "Computer Organization and Architecture", "category": "PC", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
        {"code": "ITPC 205", "title": "Object-Oriented Programming using Java", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "ITPC 207", "title": "Software Engineering", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "ITPC 209", "title": "IoT Programming", "category": "PC", "type": "Practical", "l": 1, "t": 0, "p": 2, "credits": 2, "contact": 3},
        {"code": "SWNC 101", "title": "NCC/Sports/Yoga", "category": "NC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": "1*", "contact": 4},
        {"code": "SWNC 102", "title": "NSS/Club/Technical Societies", "category": "NC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": "1*", "contact": 4},
    ]
    it_sem4 = [
        {"code": "CSIC 221", "title": "Machine Learning and Data Analytics", "category": "IC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "ITPC 200", "title": "Operating Systems", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "ITPC 202", "title": "Computer Networks", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "ITPC 204", "title": "Artificial Intelligence and Soft Computing", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "ITPC 206", "title": "Database Management Systems", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "ITPE 210", "title": "Software Development using UML and Agile Methodology", "category": "PE", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "ITPE 212", "title": "Competitive Programming and Efficient Coding", "category": "PE", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "ITPE 214", "title": "Scripting Language", "category": "PE", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "SWNC 101", "title": "NCC/Sports/Yoga", "category": "NC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": "1*", "contact": 4},
        {"code": "SWNC 102", "title": "NSS/Club/Technical Societies", "category": "NC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": "1*", "contact": 4},
    ]
    it_sem5 = [
        {"code": "ITPC 31", "title": "Mobile Application Development", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "ITPC 33", "title": "Web Technologies", "category": "PC", "type": "Integrated", "l": 2, "t": 0, "p": 2, "credits": 3, "contact": 4},
        {"code": "ITPC 35", "title": "Software Development using UML and Agile Methodology", "category": "PC", "type": "Integrated", "l": 3, "t": 1, "p": 2, "credits": 5, "contact": 6},
        {"code": "ITPC 37", "title": "Automata Theory", "category": "PC", "type": "Theory", "l": 3, "t": 1, "p": 0, "credits": 4, "contact": 4},
        {"code": "ITPC 39", "title": "Seminar", "category": "PC", "type": "Practical", "l": 0, "t": 0, "p": 2, "credits": 1, "contact": 2},
        {"code": "ITPE 31", "title": "Unix and Linux Programming", "category": "PE", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "ITPE 35", "title": "Information Security", "category": "PE", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "ITPE 71", "title": "Advanced Database Systems", "category": "PE", "type": "Theory", "l": 3, "t": 1, "p": 0, "credits": 4, "contact": 4},
        {"code": "ITPE 75", "title": "Computer Vision", "category": "PE", "type": "Theory", "l": 3, "t": 1, "p": 0, "credits": 4, "contact": 4},
    ]
    it_sem6 = [
        {"code": "ITIR 30", "title": "Internship / Industrial Training", "category": "PC", "type": "Practical", "l": 0, "t": 0, "p": 0, "credits": 10, "contact": 0},
        {"code": "ITIR 32", "title": "Project Work", "category": "PC", "type": "Practical", "l": 0, "t": 0, "p": 0, "credits": 10, "contact": 0},
    ]
    it_sem7 = [
        {"code": "HSIR 13", "title": "Business Management", "category": "IC", "type": "Theory", "l": 2, "t": 1, "p": 0, "credits": 3, "contact": 3},
        {"code": "ITPC 41", "title": "Machine Learning", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "ITPC 43", "title": "Human Computer Interaction", "category": "PC", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
        {"code": "ITPC 45", "title": "Advanced Data Structures and Algorithms", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "ITPE 41", "title": "Graphics and Visualization", "category": "PE", "type": "Theory", "l": 3, "t": 1, "p": 0, "credits": 4, "contact": 4},
        {"code": "ITPE 45", "title": "Compiler Design", "category": "PE", "type": "Theory", "l": 3, "t": 1, "p": 0, "credits": 4, "contact": 4},
        {"code": "ITOE 41", "title": "Open Elective I (Operating Systems)", "category": "OE", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
    ]
    it_sem8 = [
        {"code": "HSIR 14", "title": "Professional Ethics & IPR", "category": "IC", "type": "Practical", "l": 1, "t": 0, "p": 2, "credits": 2, "contact": 3},
        {"code": "ITPC 40", "title": "Big Data Analytics", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        {"code": "ITPE 40", "title": "Project", "category": "PC", "type": "Practical", "l": 0, "t": 0, "p": 3, "credits": 4, "contact": 6},
        {"code": "ITIR 40", "title": "Comprehensive Viva Voce", "category": "PC", "type": "Practical", "l": 0, "t": 0, "p": 0, "credits": 3, "contact": 0},
        {"code": "ITPE 44", "title": "Distributed Computing", "category": "PE", "type": "Theory", "l": 3, "t": 1, "p": 0, "credits": 4, "contact": 4},
        {"code": "ITPE 46", "title": "Cloud and Grid Computing", "category": "PE", "type": "Theory", "l": 3, "t": 1, "p": 0, "credits": 4, "contact": 4},
        {"code": "ITOE 40", "title": "Open Elective II (Database Systems)", "category": "OE", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
        {"code": "ITOE 42", "title": "Open Elective III (Soft Computing)", "category": "OE", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
    ]
    write_sem_file("IT", 3, 2, 21, 25, "2023 onwards", "Scheme & Syllabi of B.Tech. (2nd Year) IT", it_sem3, db)
    write_sem_file("IT", 4, 2, 20, 25, "2023 onwards", "Scheme & Syllabi of B.Tech. (2nd Year) IT", it_sem4, db)
    write_sem_file("IT", 5, 3, 25, 30, "B.Tech Scheme 5th Sem w.e.f 2017-18", "IT-UG-New-Scheme", it_sem5, db)
    write_sem_file("IT", 6, 3, 10, 0, "B.Tech Scheme 6th Sem w.e.f 2017-18", "IT-UG-New-Scheme", it_sem6, db)
    write_sem_file("IT", 7, 4, 21, 23, "B.Tech Scheme 7th Sem w.e.f 2017-18", "IT-UG-New-Scheme", it_sem7, db)
    write_sem_file("IT", 8, 4, 23, 21, "B.Tech Scheme 8th Sem w.e.f 2017-18", "IT-UG-New-Scheme", it_sem8, db)

    # 4. Core Branches (CIVIL, EE, ECE, MECH, PIE) Sem 3 to 8
    # Template for core engineering courses
    core_configs = [
        ("CIVIL", "CEPC", "Civil Engineering", "Civil_2nd_Year.pdf", "Civil_3rd_4th_Year.pdf", [
            ("CEPC 201", "Fluid Mechanics - I", 3, 0, 0, 3, 3),
            ("CEPC 202", "Building Construction and Materials", 3, 0, 0, 3, 3),
            ("CEPC 203", "Structural Analysis - I", 3, 0, 0, 3, 3),
            ("CEPC 204", "Surveying - I", 3, 0, 0, 3, 3),
            ("CEPC 205", "Civil Engineering Drawing", 1, 0, 3, 2, 4),
            ("CEPC 206", "Fluid Mechanics Lab", 0, 0, 2, 1, 2),
        ], [
            ("CEPC 208", "Soil Mechanics", 3, 0, 0, 3, 3),
            ("CEPC 209", "Fluid Mechanics - II", 3, 0, 0, 3, 3),
            ("CEPC 210", "Surveying - II", 3, 0, 0, 3, 3),
            ("CEPC 211", "Structural Analysis - II", 3, 0, 0, 3, 3),
            ("CEPC 212", "Concrete Technology", 3, 0, 0, 3, 3),
            ("CEPC 213", "Soil Mechanics Lab", 0, 0, 2, 1, 2),
        ]),
        ("EE", "EEPC", "Electrical Engineering", "EE_2nd_Year.pdf", "EE_3rd_4th_Year.pdf", [
            ("EEPC 201", "AC Machines", 3, 0, 0, 3, 3),
            ("EEPC 202", "Analog and Digital Electronics", 3, 0, 0, 3, 3),
            ("EEPC 203", "Generation, Transmission and Distribution", 3, 0, 0, 3, 3),
            ("EEPC 204", "Circuit Theory", 3, 0, 0, 3, 3),
            ("EEPC 205", "Electrical Machines Lab - I", 0, 0, 2, 1, 2),
            ("EEPC 206", "Electronics Lab", 0, 0, 2, 1, 2),
        ], [
            ("EEPC 207", "Power Electronics", 3, 0, 0, 3, 3),
            ("EEPC 208", "Control Systems", 3, 0, 0, 3, 3),
            ("EEPC 209", "Electromagnetic Field Theory", 3, 0, 0, 3, 3),
            ("EEPC 210", "Power Systems - I", 3, 0, 0, 3, 3),
            ("EEPC 211", "Power Electronics Lab", 0, 0, 2, 1, 2),
            ("EEPC 212", "Control Systems Lab", 0, 0, 2, 1, 2),
        ]),
        ("ECE", "ECPC", "Electronics & Communication", "ECE_2nd_Year.pdf", "ECE_3rd_4th_Year.pdf", [
            ("ECPC 201", "Electronic Devices and Circuits", 3, 1, 0, 3, 4),
            ("ECPC 202", "Digital Design", 3, 1, 0, 3, 4),
            ("ECPC 203", "Signals, Systems & Random Variables", 3, 1, 0, 3, 4),
            ("ECPC 204", "Network Analysis & Synthesis", 3, 0, 0, 3, 3),
            ("ECPC 205", "Electronic Devices and Circuits Lab", 0, 0, 2, 1, 2),
            ("ECPC 206", "Digital Design Lab", 0, 0, 2, 1, 2),
        ], [
            ("ECPC 208", "Analog Integrated Circuits", 3, 1, 0, 3, 4),
            ("ECPC 209", "Analog Electronics", 3, 1, 0, 3, 4),
            ("ECPC 210", "Digital Communication", 3, 1, 0, 3, 4),
            ("ECPC 211", "Computer Architecture", 3, 1, 0, 3, 4),
            ("ECPC 212", "Communication Lab", 0, 0, 2, 1, 2),
            ("ECPC 213", "Analog Circuits Lab", 0, 0, 2, 1, 2),
        ]),
        ("MECH", "MEPC", "Mechanical Engineering", "MECH_2nd_Year.pdf", "MECH_3rd_4th_Year.pdf", [
            ("MEPC 201", "Manufacturing Processes", 3, 0, 0, 3, 3),
            ("MEPC 202", "Fluid Mechanics", 3, 0, 0, 3, 3),
            ("MEPC 203", "Strength of Materials - I", 3, 0, 0, 3, 3),
            ("MEPC 204", "Thermodynamics", 3, 0, 0, 3, 3),
            ("MEPC 205", "Manufacturing Practice", 0, 0, 3, 2, 3),
            ("MEPC 206", "Fluid Mechanics Lab", 0, 0, 2, 1, 2),
        ], [
            ("MEPC 208", "Dynamics of Machines", 3, 0, 0, 3, 3),
            ("MEPC 209", "Strength of Materials - II", 3, 0, 0, 3, 3),
            ("MEPC 210", "Fluid Machines", 3, 0, 0, 3, 3),
            ("MEPC 211", "Material Science", 3, 0, 0, 3, 3),
            ("MEPC 212", "Dynamics of Machines Lab", 0, 0, 2, 1, 2),
            ("MEPC 213", "Strength of Materials Lab", 0, 0, 2, 1, 2),
        ]),
        ("PIE", "PIPC", "Production & Industrial", "PIE_2nd_Year.pdf", "PIE_3rd_4th_Year.pdf", [
            ("PIPC 201", "Thermodynamics", 3, 0, 0, 3, 3),
            ("PIPC 202", "Production Technology - I", 3, 0, 0, 3, 3),
            ("PIPC 203", "Facilities Design", 3, 0, 0, 3, 3),
            ("PIPC 204", "Engineering Metallurgy", 3, 0, 0, 3, 3),
            ("PIPC 205", "Production Technology Lab - I", 0, 0, 2, 1, 2),
            ("PIPC 206", "Metallurgy Lab", 0, 0, 2, 1, 2),
        ], [
            ("PIPC 208", "Machining Science", 3, 0, 0, 3, 3),
            ("PIPC 209", "Production Technology - II", 3, 0, 0, 3, 3),
            ("PIPC 210", "Operations Research", 3, 0, 0, 3, 3),
            ("PIPC 211", "Strength of Materials", 3, 0, 0, 3, 3),
            ("PIPC 212", "Production Technology Lab - II", 0, 0, 2, 1, 2),
            ("PIPC 213", "Operations Research Lab", 0, 0, 2, 1, 2),
        ]),
    ]

    for br, prefix, dept_name, pdf2, pdf34, s3_courses, s4_courses in core_configs:
        # Sem 3
        sem3_list = [
            {"code": "MAIC 201", "title": "Mathematics III", "category": "IC", "type": "Theory", "l": 3, "t": 1, "p": 0, "credits": 4, "contact": 4},
            {"code": "CSIC 221", "title": "Machine Learning and Data Analytics", "category": "IC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
        ]
        for c in s3_courses:
            sem3_list.append({"code": c[0], "title": c[1], "category": "PC", "type": "Theory" if c[4] == 0 else "Practical", "l": c[2], "t": c[3], "p": c[4], "credits": c[5], "contact": c[6]})
        sem3_list.extend([
            {"code": "SWNC 101", "title": "NCC/Sports/Yoga", "category": "NC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": "2*", "contact": 4},
            {"code": "SWNC 102", "title": "NSS/Club/Technical Societies", "category": "NC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": "2*", "contact": 4},
        ])
        write_sem_file(br, 3, 2, 22, 27, "2023 onwards", f"Scheme & Syllabi of B.Tech. (2nd Year) {dept_name}", sem3_list, db)

        # Sem 4
        sem4_list = []
        for c in s4_courses:
            sem4_list.append({"code": c[0], "title": c[1], "category": "PC", "type": "Theory" if c[4] == 0 else "Practical", "l": c[2], "t": c[3], "p": c[4], "credits": c[5], "contact": c[6]})
        sem4_list.extend([
            {"code": f"{prefix} 214", "title": "Department Elective - I", "category": "PE", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
            {"code": "SWNC 101", "title": "NCC/Sports/Yoga", "category": "NC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": "2*", "contact": 4},
            {"code": "SWNC 102", "title": "NSS/Club/Technical Societies", "category": "NC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": "2*", "contact": 4},
        ])
        write_sem_file(br, 4, 2, 21, 26, "2023 onwards", f"Scheme & Syllabi of B.Tech. (2nd Year) {dept_name}", sem4_list, db)

        # Sem 5
        sem5_list = [
            {"code": f"{prefix} 301", "title": f"{dept_name} Core I", "category": "PC", "type": "Theory", "l": 3, "t": 1, "p": 0, "credits": 4, "contact": 4},
            {"code": f"{prefix} 302", "title": f"{dept_name} Core II", "category": "PC", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
            {"code": f"{prefix} 303", "title": f"{dept_name} Core III", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
            {"code": f"{prefix} 304", "title": f"{dept_name} Core IV", "category": "PC", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
            {"code": f"{prefix} 305", "title": "Program Elective I", "category": "PE", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
            {"code": f"{prefix} 306", "title": "Practical / Lab Session", "category": "PC", "type": "Practical", "l": 0, "t": 0, "p": 2, "credits": 1, "contact": 2},
        ]
        write_sem_file(br, 5, 3, 22, 24, "2023 onwards", f"Proposed Scheme B.Tech. {dept_name} 5-8 sem", sem5_list, db)

        # Sem 6
        sem6_list = [
            {"code": f"{prefix} 308", "title": f"{dept_name} Advanced Core I", "category": "PC", "type": "Theory", "l": 3, "t": 1, "p": 0, "credits": 4, "contact": 4},
            {"code": f"{prefix} 309", "title": f"{dept_name} Advanced Core II", "category": "PC", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
            {"code": f"{prefix} 310", "title": f"{dept_name} Advanced Core III", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
            {"code": f"{prefix} 311", "title": "Program Elective II", "category": "PE", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
            {"code": f"{prefix} 312", "title": "Seminar / Industrial Visit", "category": "PC", "type": "Practical", "l": 0, "t": 0, "p": 2, "credits": 1, "contact": 2},
            {"code": f"{prefix} 314", "title": "Industrial Training / Internship", "category": "PC", "type": "Practical", "l": 0, "t": 0, "p": 0, "credits": 2, "contact": 0},
        ]
        write_sem_file(br, 6, 3, 21, 23, "2023 onwards", f"Proposed Scheme B.Tech. {dept_name} 5-8 sem", sem6_list, db)

        # Sem 7
        sem7_list = [
            {"code": "HSIR 13", "title": "Business Management", "category": "IC", "type": "Theory", "l": 2, "t": 1, "p": 0, "credits": 3, "contact": 3},
            {"code": f"{prefix} 401", "title": f"{dept_name} Capstone Theory", "category": "PC", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
            {"code": f"{prefix} 402", "title": "Program Elective III", "category": "PE", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
            {"code": f"{prefix} 403", "title": "Open Elective I", "category": "OE", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
            {"code": f"{prefix} 405", "title": "Major Project - Part 1", "category": "PC", "type": "Practical", "l": 0, "t": 0, "p": 6, "credits": 4, "contact": 6},
        ]
        write_sem_file(br, 7, 4, 18, 20, "2023 onwards", f"Proposed Scheme B.Tech. {dept_name} 5-8 sem", sem7_list, db)

        # Sem 8
        sem8_list = [
            {"code": "HSIR 14", "title": "Professional Ethics & IPR", "category": "IC", "type": "Practical", "l": 1, "t": 0, "p": 2, "credits": 2, "contact": 3},
            {"code": f"{prefix} 408", "title": "Program Elective IV", "category": "PE", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
            {"code": f"{prefix} 409", "title": "Open Elective II", "category": "OE", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
            {"code": f"{prefix} 410", "title": "Major Project - Part 2", "category": "PC", "type": "Practical", "l": 0, "t": 0, "p": 8, "credits": 6, "contact": 8},
            {"code": f"{prefix} 412", "title": "Comprehensive Viva-Voce", "category": "PC", "type": "Practical", "l": 0, "t": 0, "p": 0, "credits": 2, "contact": 0},
        ]
        write_sem_file(br, 8, 4, 16, 17, "2023 onwards", f"Proposed Scheme B.Tech. {dept_name} 5-8 sem", sem8_list, db)

    # 5. Specialized Branches (AIDS, AIML, MNC, IIOT, VLSI, RA, SE) Sem 3 & 4
    spec_branches = [
        ("AIDS", "AIPC", "Artificial Intelligence & Data Science", "AIDS_Scheme_Syllabus.pdf", "Data Science Foundation", "Machine Learning Techniques"),
        ("AIML", "AIPC", "Artificial Intelligence & Machine Learning", "1st_Year_All_Programs_2023.pdf", "Deep Learning Principles", "Natural Language Processing"),
        ("MNC", "MAPC", "Mathematics & Computing", "1st_Year_All_Programs_2023.pdf", "Advanced Linear Algebra", "Scientific Computing"),
        ("IIOT", "IOTPC", "Industrial Internet of Things", "1st_Year_All_Programs_2023.pdf", "Sensors and Actuators", "Industrial Communication Protocols"),
        ("VLSI", "VLSIPC", "Microelectronics & VLSI", "VLSI_Scheme_Syllabus.pdf", "Semiconductor Device Physics", "Digital VLSI Design"),
        ("RA", "RAPC", "Robotics & Automation", "RA_Scheme_Syllabus.pdf", "Robotics Kinematics", "Automation & Control Systems"),
        ("SE", "SEPC", "Sustainable Energy Technologies", "SE_Scheme_Syllabus.pdf", "Renewable Energy Systems", "Energy Storage and Management"),
    ]

    for br, prefix, name, source_doc, course1, course2 in spec_branches:
        sem3_spec = [
            {"code": "MAIC 201", "title": "Discrete Mathematics and Statistical Methods", "category": "IC", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
            {"code": f"{prefix} 201", "title": course1, "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
            {"code": f"{prefix} 203", "title": "Data Structures and Algorithms", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
            {"code": f"{prefix} 205", "title": "Object-Oriented Programming", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
            {"code": f"{prefix} 207", "title": "Computer Organization & Systems", "category": "PC", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
            {"code": "SWNC 101", "title": "NCC/Sports/Yoga", "category": "NC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": "2*", "contact": 4},
            {"code": "SWNC 102", "title": "NSS/Club/Technical Societies", "category": "NC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": "2*", "contact": 4},
        ]
        sem4_spec = [
            {"code": "CSIC 221", "title": "Machine Learning and Data Analytics", "category": "IC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
            {"code": f"{prefix} 202", "title": course2, "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
            {"code": f"{prefix} 204", "title": "Operating Systems & Architecture", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
            {"code": f"{prefix} 206", "title": "Database Management Systems", "category": "PC", "type": "Integrated", "l": 3, "t": 0, "p": 2, "credits": 4, "contact": 5},
            {"code": f"{prefix} 208", "title": "Program Elective I", "category": "PE", "type": "Theory", "l": 3, "t": 0, "p": 0, "credits": 3, "contact": 3},
            {"code": "SWNC 101", "title": "NCC/Sports/Yoga", "category": "NC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": "2*", "contact": 4},
            {"code": "SWNC 102", "title": "NSS/Club/Technical Societies", "category": "NC", "type": "Practical", "l": 0, "t": 0, "p": 4, "credits": "2*", "contact": 4},
        ]
        write_sem_file(br, 3, 2, 20, 25, "2024 onwards", f"Scheme & Syllabus of B.Tech ({name})", sem3_spec, db)
        write_sem_file(br, 4, 2, 21, 26, "2024 onwards", f"Scheme & Syllabus of B.Tech ({name})", sem4_spec, db)

    print("\nAll batches generated successfully!")

if __name__ == "__main__":
    run()
