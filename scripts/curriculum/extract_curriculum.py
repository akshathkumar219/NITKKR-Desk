import os
import re
import pdfplumber

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
PDF_DIR = os.path.join(ROOT, "content/curriculum/pdfs")
OUT_DIR = os.path.join(ROOT, "content/curriculum")

def clean(text):
    if not text:
        return ""
    return " ".join(text.split())

def extract_pdf_syllabi(pdf_filename):
    pdf_path = os.path.join(PDF_DIR, pdf_filename)
    if not os.path.exists(pdf_path):
        print(f"Warning: {pdf_filename} not found")
        return {}

    syllabi = {}
    with pdfplumber.open(pdf_path) as pdf:
        for p_idx, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            if not text:
                continue

            # Check if there's a table header with Course Code
            tables = page.extract_tables() or []
            code = None
            title = None
            creds = None
            cat = "PC"
            ltp = None

            for table in tables:
                if not table: continue
                for row in table:
                    for cell in row:
                        if not cell: continue
                        m = re.search(r'Course\s*Code[^\n]*\n([A-Z0-9\s/]+)', cell, re.I)
                        if m:
                            code = clean(m.group(1))
                        m_t = re.search(r'(?:Course\s*Title[^\n]*\n)?([A-Za-z\s&,()]+(?:Methods|Algorithms|Systems|Design|Programming|Mathematics|Physics|Chemistry|Science|Engineering|Networks|Intelligence|Electronics|Technology|Data|Management)[^\n]*)', cell, re.I)
                        if m_t and not code:
                            title = clean(m_t.group(1))

            # If not in table, regex match text
            if not code:
                m_code = re.search(r'Course\s*Code\s*[:\-]?\s*([A-Z]{2,4}\s*(?:IC|PC|NC|PE|OE)?\s*\d{2,3}[A-Z]?)', text, re.I)
                if m_code:
                    code = clean(m_code.group(1))
                else:
                    m_direct = re.search(r'\b([A-Z]{2,4}\s*(?:IC|PC|NC|PE|OE)\s*\d{3}[A-Z]?)\b', text[:200])
                    if m_direct:
                        code = clean(m_direct.group(1))

            if not code:
                continue

            # Standardize code
            code = re.sub(r'[^A-Z0-9]', ' ', code.upper())
            code = ' '.join(code.split())
            if len(code) < 4 or len(code) > 12:
                continue

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
            if m_creds:
                creds = clean(m_creds.group(1))

            m_cat = re.search(r'Course\s*(?:Category|Type)\s*[:\-]?\s*([A-Z]+)', text, re.I)
            if m_cat:
                cat = clean(m_cat.group(1))

            # Objectives
            objs = []
            obj_sec = re.search(r'(?:Course\s*Learning\s*Objectives|Course\s*Objectives)\s*[:\-]?\s*(.*?)(?=(?:Course\s*Content|Course\s*Contents?|Units?|Text\s*Books?|References?|$))', text, re.S | re.I)
            if obj_sec:
                lines = [l.strip() for l in obj_sec.group(1).split('\n') if l.strip()]
                for l in lines:
                    if re.match(r'^\d+\.', l):
                        objs.append(re.sub(r'^\d+\.\s*', '', l).strip())
                    elif objs:
                        objs[-1] += ' ' + l.strip()

            # Content
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

            # References
            books = []
            books_sec = re.search(r'(?:Text\s*Books?|Reference\s*Books?|References?)\s*[:\-]?\s*(.*?)(?=(?:Course\s*Outcomes?|Prerequisites?|$))', text, re.S | re.I)
            if books_sec:
                lines = [l.strip() for l in books_sec.group(1).split('\n') if l.strip()]
                for l in lines:
                    if re.match(r'^\d+\.', l):
                        books.append(re.sub(r'^\d+\.\s*', '', l).strip())
                    elif books:
                        books[-1] += ' ' + l.strip()

            syllabi[code] = {
                "title": title or code,
                "category": cat or "PC",
                "credits": creds or "4",
                "objectives": objs,
                "units": units,
                "references": books[:5]
            }

    return syllabi

def write_sem_file(branch, sem, year, total_credits, contact_hours, batch, source, courses, syllabi_map):
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
        syl = syllabi_map.get(code) or syllabi_map.get(code.replace(" ", "")) or {}
        title = c.get("title", "")
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
    print(f"  [OK] Wrote {branch} sem-{sem}.md ({len(courses)} courses)")

print("Loaded extract_curriculum.py")
