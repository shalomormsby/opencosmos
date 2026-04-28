import re
paths = [
    "knowledge/sources/philosophy-the-journal-of-george-fox.md",
    "knowledge/sources/philosophy-the-journal-of-george-fox-volume-ii.md"
]
for path in paths:
    with open(path, "r") as f:
        content = f.read()
    # Remove numbers at start of words (e.g. 4notice -> notice)
    content = re.sub(r'\b\d+([a-zA-Z])', r'\1', content)
    # Remove standalone numbers at start of lines (common page artifacts)
    content = re.sub(r'^\d+\s*$', '', content, flags=re.MULTILINE)
    # Remove standalone numbers between paragraphs
    content = re.sub(r'\n\n\d+\n\n', r'\n\n', content)
    # Standardize headers (fix uppercase CHAPTER)
    content = re.sub(r'## CHAPTER', r'## Chapter', content)
    with open(path, "w") as f:
        f.write(content)
