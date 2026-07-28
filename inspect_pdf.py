import pdfplumber

pdf_path = r'E:\Internship\Angular\booktracker\Frontend\9781474402095_Three_Short_Novels_Introduction.pdf'

with pdfplumber.open(pdf_path) as pdf:
    for page_num in [30, 31]:  # 0-indexed: 30=page31, 31=page32
        page = pdf.pages[page_num]
        page_height = page.height

        # Get raw chars to simulate PDF.js transform[4]=x, transform[5]=y (from bottom)
        words = page.extract_words(x_tolerance=3, y_tolerance=3)
        print(f'\n=== PAGE {page_num+1} (height={round(page_height,1)}) ===')
        print(f'Total words: {len(words)}')
        print()

        # Convert pdfplumber top-relative y to PDF.js bottom-relative y
        all_pdfjs_y = [round(page_height - w['top'], 1) for w in words]
        if all_pdfjs_y:
            min_y = min(all_pdfjs_y)
            max_y = max(all_pdfjs_y)
            y_range = max_y - min_y
            print(f'  PDF.js Y range: min={min_y}, max={max_y}, range={round(y_range,1)}')
            print()

        print(f'  {"pdfplumber_top_y":>17}  {"pdfjs_y":>8}  {"relY":>6}  {"x":>6}  text')
        for w in words:
            pdfjs_y = round(page_height - w['top'], 1)
            rel_y = round((pdfjs_y - min_y) / y_range, 3) if y_range > 0 else 0.5
            x0 = round(w['x0'], 1)
            # Flag lines near top (>0.88) or bottom (<0.12)
            flag = ''
            if rel_y > 0.88: flag = ' <-- TOP MARGIN (filtered?)'
            if rel_y < 0.12: flag = ' <-- BOTTOM MARGIN (filtered?)'
            print(f'  y_top={round(w["top"],1):>7}  pdfjs_y={pdfjs_y:>7}  relY={rel_y:.3f}  x={x0:>6}  {w["text"]}{flag}')
        print()
