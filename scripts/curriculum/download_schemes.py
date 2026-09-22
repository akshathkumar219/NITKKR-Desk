import os
import ssl
import urllib.request

SCHEMES = [
    ("1st_Year_All_Programs_2023.pdf", "https://nitkkr.ac.in/wp-content/uploads/2023/12/Scheme-Syllabi-of-B.Tech_.-1st-year-2023-batch-onwards-All-Programs.pdf"),
    ("1st_Year_New_Scheme_2024_25.pdf", "https://nitkkr.ac.in/wp-content/uploads/2025/05/B.Tech_.-new-scheme-of-Ist-year-for-AY-2024-25-onwards.pdf"),
    ("BTech_New_Scheme_2023_24_Onwards.pdf", "https://nitkkr.ac.in/wp-content/uploads/2025/03/B.Tech_.-New-Scheme-for-AY-2023-24-Onwards.pdf"),
    ("CSE_2nd_Year.pdf", "https://nitkkr.ac.in/wp-content/uploads/2023/12/Scheme-Syllabi-of-B.Tech_.-2nd-Year-COE-1.pdf"),
    ("CSE_3rd_4th_Year_Scheme.pdf", "https://nitkkr.ac.in/wp-content/uploads/2021/12/Computer-UG-New-Scheme..pdf"),
    ("CSE_3rd_4th_Year_Syllabus.pdf", "https://nitkkr.ac.in/wp-content/uploads/2021/12/Computer-UG-New-Syllabus..pdf"),
    ("IT_2nd_Year.pdf", "https://nitkkr.ac.in/wp-content/uploads/2023/12/Scheme-Syllabi-of-B.Tech_.-2nd-Year-IT-1.pdf"),
    ("IT_3rd_4th_Year_Scheme.pdf", "https://nitkkr.ac.in/wp-content/uploads/2021/12/IT-UG-New-Scheme.pdf"),
    ("IT_3rd_4th_Year_Syllabus.pdf", "https://nitkkr.ac.in/wp-content/uploads/2021/12/IT-UG-New-Syllabus.pdf"),
    ("Civil_2nd_Year.pdf", "https://nitkkr.ac.in/wp-content/uploads/2023/12/Scheme-Syllabi-of-B.Tech_.-2nd-Year-Civil.pdf"),
    ("Civil_3rd_4th_Year.pdf", "https://nitkkr.ac.in/wp-content/uploads/2023/12/Proposed-Scheme-Syllabi-B.Tech_.-Civil-5-8-sem.pdf"),
    ("EE_2nd_Year.pdf", "https://nitkkr.ac.in/wp-content/uploads/2023/12/Scheme-Syllabi-of-B.Tech_.-2nd-Year-EE-1.pdf"),
    ("EE_3rd_4th_Year.pdf", "https://nitkkr.ac.in/wp-content/uploads/2023/12/Proposed-Scheme-Syllabi-B.Tech_.-Electrical-5-8-Semester.pdf"),
    ("ECE_2nd_Year.pdf", "https://nitkkr.ac.in/wp-content/uploads/2023/12/Scheme-Syllabi-of-B.Tech_.-2nd-Year-ECE-1.pdf"),
    ("ECE_3rd_4th_Year.pdf", "https://nitkkr.ac.in/wp-content/uploads/2023/12/Proposed-Scheme-Syllabi-of-B.Tech_.-ECE-5-8-Semester.pdf"),
    ("MECH_2nd_Year.pdf", "https://nitkkr.ac.in/wp-content/uploads/2023/12/Scheme-Syllabi-of-B.Tech_.-2nd-Year-Mechanical-1.pdf"),
    ("MECH_3rd_4th_Year.pdf", "https://nitkkr.ac.in/wp-content/uploads/2023/12/Proposed-Scheme-Syllabi-of-B.Tech_.-Mechanical-5-8-Semester.pdf"),
    ("PIE_2nd_Year.pdf", "https://nitkkr.ac.in/wp-content/uploads/2023/12/Scheme-Syllabi-of-B.Tech_.-2nd-Year-PIE-1.pdf"),
    ("PIE_3rd_4th_Year.pdf", "https://nitkkr.ac.in/wp-content/uploads/2023/12/Proposed-Scheme-Syllabi-of-B.Tech_.-PIE-5-8-Semester.pdf"),
    ("AIDS_Scheme_Syllabus.pdf", "https://nitkkr.ac.in/wp-content/uploads/2024/07/Scheme-and-Syllabus-of-B.Tech-in-Artificial-Intelligence-and-Data-Science-1.pdf"),
    ("VLSI_Scheme_Syllabus.pdf", "https://nitkkr.ac.in/wp-content/uploads/2024/07/Micro-Electronics-VLSI-Engg.pdf"),
    ("RA_Scheme_Syllabus.pdf", "https://nitkkr.ac.in/wp-content/uploads/2024/07/Robotics-Automation.pdf"),
    ("SE_Scheme_Syllabus.pdf", "https://nitkkr.ac.in/wp-content/uploads/2024/07/Sustainable-Energy-Technology.pdf"),
    ("ARCH_1st_Year.pdf", "https://nitkkr.ac.in/wp-content/uploads/2024/07/B.Arch_.-Syllabus-Ist-and-IInd-Sem-1.pdf")
]

OUT_DIR = os.path.join(os.path.dirname(__file__), "../../content/curriculum/pdfs")
os.makedirs(OUT_DIR, exist_ok=True)

ctx = ssl._create_unverified_context()

def download_all(batch=None):
    print(f"Downloading PDFs into {OUT_DIR}...")
    for filename, url in SCHEMES:
        dest = os.path.join(OUT_DIR, filename)
        if os.path.exists(dest) and os.path.getsize(dest) > 1000:
            print(f"  [cached] {filename} ({os.path.getsize(dest)} bytes)")
            continue
        print(f"  Fetching {filename} from {url}...")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
                data = resp.read()
            with open(dest, "wb") as f:
                f.write(data)
            print(f"  [OK] Saved {filename} ({len(data)} bytes)")
        except Exception as e:
            print(f"  [ERROR] {filename}: {e}")

if __name__ == "__main__":
    download_all()
