import re
path = "knowledge/collections/philosophy-essays-by-ralph-waldo-emerson.md"
with open(path, "r") as f:
    content = f.read()
# Remove [#] artifacts
content = re.sub(r'\[\d+\]', '', content)
# Standardize headers
content = re.sub(r'## ([A-Z][a-z ]+)\[\d+\]', r'## \1', content)
with open(path, "w") as f:
    f.write(content)
