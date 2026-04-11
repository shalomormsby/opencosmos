#!/usr/bin/env python3
"""
groom.py — Knowledge base formatting tool for OpenCosmos.

Prepares raw text files for publication by applying markdown structure
without altering any original content. All text transformations happen
in-process (read file -> transform -> write file) to avoid API content
filtering issues that occur when passing religious/philosophical text
through LLM tool calls.

Usage:
    python3 scripts/knowledge/groom.py                          # Process all files in knowledge/incoming/
    python3 scripts/knowledge/groom.py path/to/file             # Process a specific file
    python3 scripts/knowledge/groom.py --dry-run                # Report what would be done
    python3 scripts/knowledge/groom.py --report                 # Show status of all files
    python3 scripts/knowledge/groom.py --force                  # Reprocess already-formatted files
    python3 scripts/knowledge/groom.py --force path/to/file     # Force-reprocess a specific file
"""

import os
import re
import sys
import argparse
from pathlib import Path
from typing import Dict, List, Optional, Tuple


# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------

def collapse_blanks(text: str) -> str:
    """Collapse 3+ consecutive blank lines to 1."""
    return re.sub(r'\n{3,}', '\n\n', text)


def bold_speakers(text: str) -> str:
    """Bold speaker names at start of lines: SPEAKER: -> **SPEAKER:**
    Only matches 2+ uppercase letter names not already bolded."""
    return re.sub(
        r'^(?<!\*\*)([A-Z][A-Z .]+):(?!\*)',
        r'**\1:**',
        text,
        flags=re.MULTILINE
    )


def unwrap_hard_lines(text: str) -> str:
    """Unwrap hard-wrapped lines into flowing paragraphs.

    Preserves:
    - Blank lines (paragraph breaks)
    - Lines starting with # (headings)
    - Indented lines (spaces/tabs)
    - Lines matching separator patterns (* * * etc.)
    - Lines starting with > (blockquotes)
    - Lines starting with ** (bold speaker names)
    - Lines starting with [ (footnotes/references)
    - Lines starting with * (italic attribution)
    """
    lines = text.split('\n')
    result = []
    paragraph = []

    def flush():
        if paragraph:
            result.append(' '.join(paragraph))
            paragraph.clear()

    for line in lines:
        stripped = line.rstrip()

        # Blank line = paragraph break
        if stripped.strip() == '':
            flush()
            result.append('')
            continue

        # Preserve these line types as-is
        if (stripped.startswith('#') or
                stripped.startswith(' ') or
                stripped.startswith('\t') or
                stripped.startswith('>') or
                stripped.startswith('**') or
                stripped.startswith('[') or
                stripped.startswith('*') or
                re.match(r'^\s*\*\s+\*\s+\*', stripped)):
            flush()
            result.append(stripped)
            continue

        # Regular text: accumulate into paragraph
        paragraph.append(stripped)

    flush()
    return '\n'.join(result)


def strip_gutenberg_end(text: str) -> str:
    """Strip Project Gutenberg boilerplate from the end of text."""
    markers = [
        'End of the Project Gutenberg',
        'End of Project Gutenberg',
        '***END OF THE PROJECT GUTENBERG',
        '*** END OF THE PROJECT GUTENBERG',
        '*** END OF THIS PROJECT GUTENBERG',
        'THE END.',
        "Transcriber's Note",
    ]
    best_pos = len(text)
    for marker in markers:
        pos = text.find(marker)
        if pos != -1 and pos < best_pos:
            best_pos = pos
    if best_pos < len(text):
        text = text[:best_pos].rstrip()
    return text


def find_intro_start(text: str) -> Optional[int]:
    """Find the char index of the actual INTRODUCTION header (not in a Contents section).

    The real header is followed by substantial paragraph text (>50 chars)
    within 1-3 lines, distinguishing it from a Contents table entry.
    """
    pattern = r'^-?\s*INTRODUCTION(?:\s+AND\s+ANALYSIS)?\.?\s*$'
    matches = list(re.finditer(pattern, text, re.MULTILINE))
    if not matches:
        return None
    # Work backwards: the last match with substantive text after it is the real one
    for match in reversed(matches):
        after = text[match.end():match.end() + 1000]
        for line in after.split('\n')[1:5]:
            if line.strip() and len(line.strip()) > 50:
                return match.start()
    return matches[-1].start()


def to_title_case(s: str) -> str:
    """Convert ALL CAPS to Title Case, handling small words."""
    small_words = {'a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for',
                   'yet', 'so', 'in', 'on', 'at', 'to', 'by', 'of', 'up'}
    words = s.strip().split()
    result = []
    for i, word in enumerate(words):
        lower = word.lower()
        if i == 0 or lower not in small_words:
            result.append(word.capitalize())
        else:
            result.append(lower)
    return ' '.join(result)


def is_already_formatted(text: str) -> bool:
    """Check if a file is already formatted (first non-blank line starts with '# ')."""
    for line in text.split('\n'):
        if line.strip():
            return line.startswith('# ')
    return False


def has_yaml_frontmatter(text: str) -> bool:
    """Check if text starts with YAML frontmatter (---)."""
    return text.lstrip().startswith('---')


def preserve_frontmatter(text: str):
    """Split text into (frontmatter, body) if YAML frontmatter exists.
    Returns (None, text) if no frontmatter."""
    if not has_yaml_frontmatter(text):
        return None, text
    stripped = text.lstrip()
    # Find end of frontmatter (second ---)
    second = stripped.find('---', 3)
    if second == -1:
        return None, text
    end = stripped.find('\n', second)
    if end == -1:
        end = len(stripped)
    frontmatter = stripped[:end + 1]
    body = stripped[end + 1:]
    return frontmatter, body


# ---------------------------------------------------------------------------
# Content type processors
# ---------------------------------------------------------------------------

def process_dialogue(text: str, title: str, has_sections: bool = False,
                     extra_sections: Optional[Dict[str, str]] = None) -> str:
    """Process a standard Plato/Jowett dialogue.

    Args:
        text: Raw file content
        title: The dialogue title in Title Case (e.g., "Euthyphro")
        has_sections: If True, convert section markers like "Section 1." to ### headers
        extra_sections: Dict of additional section patterns to convert
    """
    # Strip Gutenberg end matter
    text = strip_gutenberg_end(text)

    # Find the Introduction
    intro_pos = find_intro_start(text)
    if intro_pos is None:
        # No introduction found; just do basic formatting
        header = f'# {title}\n\n*By Plato*\n\n*Translated by Benjamin Jowett*\n\n'
        text = bold_speakers(text)
        text = collapse_blanks(text)
        return header + text

    # Everything before INTRODUCTION is metadata/TOC - discard
    body = text[intro_pos:]

    # Convert INTRODUCTION header
    body = re.sub(
        r'^-?\s*INTRODUCTION(?:\s+AND\s+ANALYSIS)?\.?\s*$',
        '## Introduction',
        body,
        count=1,
        flags=re.MULTILINE
    )

    # Convert the dialogue title after introduction
    # (appears as the title in ALL CAPS marking the start of the actual dialogue)
    title_upper = title.upper()
    body = re.sub(
        rf'^{re.escape(title_upper)}\.?\s*$',
        f'## {title}',
        body,
        count=1,
        flags=re.MULTILINE
    )

    # Handle section markers if present (Timaeus, etc.)
    if has_sections:
        body = re.sub(
            r'^Section (\d+)\.\s*$',
            r'### Section \1',
            body,
            flags=re.MULTILINE
        )

    # Handle extra sections if provided
    if extra_sections:
        for pattern, replacement in extra_sections.items():
            body = re.sub(pattern, replacement, body, flags=re.MULTILINE)

    # Bold speaker names
    body = bold_speakers(body)

    # Collapse blank lines
    body = collapse_blanks(body)

    # Build final output
    header = f'# {title}\n\n*By Plato*\n\n*Translated by Benjamin Jowett*\n\n'
    return header + body.strip() + '\n'


def process_laws(text: str) -> str:
    """Process Plato's Laws — has INTRODUCTION AND ANALYSIS, EXCURSUS, and BOOK I-XII."""
    text = strip_gutenberg_end(text)

    intro_pos = find_intro_start(text)
    if intro_pos is None:
        body = text
    else:
        body = text[intro_pos:]

    # Convert INTRODUCTION AND ANALYSIS
    body = re.sub(
        r'^-?\s*INTRODUCTION AND ANALYSIS\.?\s*$',
        '## Introduction and Analysis',
        body,
        count=1,
        flags=re.MULTILINE
    )

    # Convert EXCURSUS ON THE from intro
    body = re.sub(
        r'^EXCURSUS ON THE (.*?)$',
        r'### Excursus on the \1',
        body,
        flags=re.MULTILINE
    )

    # Convert BOOK headers (BOOK I through BOOK XII)
    roman_map = {
        'I': 'I', 'II': 'II', 'III': 'III', 'IV': 'IV', 'V': 'V',
        'VI': 'VI', 'VII': 'VII', 'VIII': 'VIII', 'IX': 'IX', 'X': 'X',
        'XI': 'XI', 'XII': 'XII'
    }
    for roman in roman_map:
        body = re.sub(
            rf'^BOOK {roman}\.?\s*$',
            f'## Book {roman}',
            body,
            flags=re.MULTILINE
        )

    # Remove redundant title repetitions
    body = re.sub(r'^THE LAWS\.?\s*$', '', body, flags=re.MULTILINE)
    body = re.sub(r'^LAWS\.?\s*$', '', body, flags=re.MULTILINE)

    # Bold speaker names
    body = bold_speakers(body)

    # Collapse blank lines
    body = collapse_blanks(body)

    header = '# The Laws\n\n*By Plato*\n\n*Translated by Benjamin Jowett*\n\n'
    return header + body.strip() + '\n'


def process_republic(text: str) -> str:
    """Process Plato's Republic — extensive Gutenberg scholarly apparatus."""
    # Strip Gutenberg end matter
    text = strip_gutenberg_end(text)

    # Strip publisher title page (everything before PREFACE)
    preface_match = re.search(r'^PREFACE\.?\s*$', text, re.MULTILINE)
    if preface_match:
        text = text[preface_match.start():]

    # Convert PREFACE
    text = re.sub(r'^PREFACE\.?\s*$', '## Preface', text, count=1, flags=re.MULTILINE)

    # Convert INTRODUCTION AND ANALYSIS
    text = re.sub(
        r'^INTRODUCTION AND ANALYSIS\.?\s*$',
        '## Introduction and Analysis',
        text,
        count=1,
        flags=re.MULTILINE
    )

    # Remove redundant THE REPUBLIC title
    text = re.sub(r'^THE REPUBLIC\.?\s*$', '', text, flags=re.MULTILINE)

    # Convert BOOK headers
    roman_numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
    for roman in roman_numerals:
        text = re.sub(
            rf'^BOOK {roman}\.?\s*$',
            f'## Book {roman}',
            text,
            flags=re.MULTILINE
        )

    # Remove [Sidenote: ...] and [Sidenote; ...] markers
    text = re.sub(r'\[Sidenote[:;][^\]]*\]', '', text)

    # Convert Stephanus numbers *NNN* or *NNNA* -> [NNN] or [NNNA]
    text = re.sub(r'\*(\d{3}[A-E]?)\*', r'[\1]', text)

    # Remove page markers {NNN} and {roman}
    text = re.sub(r'\{[ivxlcdm\d]+\}', '', text, flags=re.IGNORECASE)

    # Remove known malformed page markers
    text = text.replace('ccxxxi}', '')
    text = text.replace('(308}', '')

    # Preserve [Footnote N: ...] markers (Jowett's scholarly notes)
    # (no action needed - they're already in a good format)

    # Bold speaker names
    text = bold_speakers(text)

    # Collapse blank lines
    text = collapse_blanks(text)

    # Unwrap hard-wrapped lines
    text = unwrap_hard_lines(text)

    header = '# The Republic\n\n*By Plato*\n\n*Translated by Benjamin Jowett*\n\n'
    return header + text.strip() + '\n'


def process_heart_sutra(text: str) -> str:
    """Process the Heart Sutra — sacred/canonical text."""
    text = strip_gutenberg_end(text)

    # Strip any leading metadata
    lines = text.split('\n')
    content_lines = []
    found_start = False
    for line in lines:
        stripped = line.strip()
        if not found_start:
            # Skip blank lines and metadata at the top
            if stripped and not stripped.startswith('The Project Gutenberg'):
                found_start = True
                content_lines.append(line)
        else:
            content_lines.append(line)

    body = '\n'.join(content_lines)
    body = collapse_blanks(body)

    # Remove any title lines that exist and rebuild
    body = re.sub(r'^THE HEART SUTRA\.?\s*$', '', body, flags=re.MULTILINE | re.IGNORECASE)
    body = re.sub(r'^HEART SUTRA\.?\s*$', '', body, flags=re.MULTILINE | re.IGNORECASE)

    body = collapse_blanks(body)

    header = '# The Heart Sutra\n\n'
    return header + body.strip() + '\n'


def process_tao_te_ching(text: str) -> str:
    """Process the Tao Te Ching — scripture with chapter divisions."""
    text = strip_gutenberg_end(text)

    # Strip leading metadata/TOC up to the first content section
    # Look for "Lao Tsu and Taoism" or first chapter marker
    lao_match = re.search(r'^LAO TSU AND TAOISM\.?\s*$', text, re.MULTILINE)
    if lao_match:
        text = text[lao_match.start():]
        text = re.sub(r'^LAO TSU AND TAOISM\.?\s*$', '## Lao Tsu and Taoism', text,
                       count=1, flags=re.MULTILINE)

    # Convert ALL-CAPS chapter numbers to ## Title Case
    number_words = [
        'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT',
        'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN',
        'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN', 'TWENTY',
        'TWENTY-ONE', 'TWENTY-TWO', 'TWENTY-THREE', 'TWENTY-FOUR',
        'TWENTY-FIVE', 'TWENTY-SIX', 'TWENTY-SEVEN', 'TWENTY-EIGHT',
        'TWENTY-NINE', 'THIRTY', 'THIRTY-ONE', 'THIRTY-TWO', 'THIRTY-THREE',
        'THIRTY-FOUR', 'THIRTY-FIVE', 'THIRTY-SIX', 'THIRTY-SEVEN',
        'THIRTY-EIGHT', 'THIRTY-NINE', 'FORTY', 'FORTY-ONE', 'FORTY-TWO',
        'FORTY-THREE', 'FORTY-FOUR', 'FORTY-FIVE', 'FORTY-SIX', 'FORTY-SEVEN',
        'FORTY-EIGHT', 'FORTY-NINE', 'FIFTY', 'FIFTY-ONE', 'FIFTY-TWO',
        'FIFTY-THREE', 'FIFTY-FOUR', 'FIFTY-FIVE', 'FIFTY-SIX', 'FIFTY-SEVEN',
        'FIFTY-EIGHT', 'FIFTY-NINE', 'SIXTY', 'SIXTY-ONE', 'SIXTY-TWO',
        'SIXTY-THREE', 'SIXTY-FOUR', 'SIXTY-FIVE', 'SIXTY-SIX', 'SIXTY-SEVEN',
        'SIXTY-EIGHT', 'SIXTY-NINE', 'SEVENTY', 'SEVENTY-ONE', 'SEVENTY-TWO',
        'SEVENTY-THREE', 'SEVENTY-FOUR', 'SEVENTY-FIVE', 'SEVENTY-SIX',
        'SEVENTY-SEVEN', 'SEVENTY-EIGHT', 'SEVENTY-NINE', 'EIGHTY',
        'EIGHTY-ONE'
    ]
    for word in number_words:
        title_word = word.replace('-', '-').title()
        text = re.sub(
            rf'^{word}\.?\s*$',
            f'## {title_word}',
            text,
            flags=re.MULTILINE
        )

    text = collapse_blanks(text)

    header = '# Tao Te Ching\n\n*By Lao Tsu*\n\n*Translated by Gia-Fu Feng and Jane English*\n\n'
    return header + text.strip() + '\n'


def process_poetry(text: str, title: str, author: str) -> str:
    """Process a poetry collection.

    Preserves line breaks and indentation exactly.
    Converts structural markers (BOOK, poem titles) to markdown headers.
    """
    text = strip_gutenberg_end(text)

    # Strip leading Gutenberg metadata
    # Look for the actual content start (after title/author/TOC)
    lines = text.split('\n')
    content_start = 0
    for i, line in enumerate(lines):
        if line.strip().startswith('BOOK ') or line.strip() == 'INSCRIPTIONS':
            content_start = i
            break

    body = '\n'.join(lines[content_start:])

    # Convert BOOK headers
    body = re.sub(
        r'^BOOK ([IVXLC]+)\b.*$',
        lambda m: f'## Book {m.group(1)}',
        body,
        flags=re.MULTILINE
    )

    # Convert section headers (INSCRIPTIONS, etc.)
    body = re.sub(
        r'^([A-Z][A-Z ]{3,})$',
        lambda m: f'### {to_title_case(m.group(1))}' if len(m.group(1).strip()) < 50 else m.group(0),
        body,
        flags=re.MULTILINE
    )

    body = collapse_blanks(body)

    header = f'# {title}\n\n*By {author}*\n\n'
    return header + body.strip() + '\n'


def process_scientific(text: str, title: str, author: Optional[str] = None) -> str:
    """Process scientific/encyclopedia articles."""
    text = strip_gutenberg_end(text)

    # Join broken lines from PDF column wrapping
    # (lines ending mid-sentence that continue on the next line without indent)
    text = unwrap_hard_lines(text)

    # Convert ALL-CAPS section headers to ## Title Case
    text = re.sub(
        r'^([A-Z][A-Z ]{5,})$',
        lambda m: f'## {to_title_case(m.group(1))}',
        text,
        flags=re.MULTILINE
    )

    text = collapse_blanks(text)

    header = f'# {title}\n'
    if author:
        header += f'\n*By {author}*\n'
    header += '\n'
    return header + text.strip() + '\n'


def process_prophet(text: str) -> str:
    """Process The Prophet by Kahlil Gibran.

    Handles:
    - Gutenberg metadata stripping
    - [Illustration] marker removal
    - Hard line-wrap unwrapping (original uses ~40-char hard wraps)
    - CONTENTS section removal
    - Bibliography/appendix removal
    """
    text = strip_gutenberg_end(text)

    # Remove [Illustration] and [Illustration: ...] markers
    text = re.sub(r'\[Illustration[^\]]*\]', '', text)

    # Remove CONTENTS section
    contents_match = re.search(r'^CONTENTS\s*$', text, re.MULTILINE)
    if contents_match:
        # Find where contents ends (next substantial section)
        after_contents = text[contents_match.start():]
        lines = after_contents.split('\n')
        end_idx = 0
        in_contents = True
        for i, line in enumerate(lines[1:], 1):  # skip CONTENTS line itself
            stripped = line.strip()
            # Contents entries are short, often just titles
            # The actual text starts when we hit the first substantive paragraph
            if in_contents and stripped and not stripped.isupper() and len(stripped) > 60:
                end_idx = i
                break
            if stripped.isupper() and len(stripped) > 3 and i > 2:
                # This might be the first chapter heading after TOC
                end_idx = i
                break
        if end_idx > 0:
            text = text[:contents_match.start()] + '\n'.join(lines[end_idx:])

    # Remove Bibliography/appendix sections at end
    bib_markers = ['BIBLIOGRAPHY', 'A BIBLIOGRAPHY', 'A SELECTED BIBLIOGRAPHY']
    for marker in bib_markers:
        pos = text.find(marker)
        if pos != -1:
            text = text[:pos].rstrip()

    # Strip leading Gutenberg metadata (title page, publisher info)
    # Find the actual text start — typically "THE COMING OF THE SHIP" or similar
    lines = text.split('\n')
    metadata_end = 0
    for i, line in enumerate(lines):
        stripped = line.strip().upper()
        if 'THE COMING OF THE SHIP' in stripped or 'ALMUSTAFA' in stripped:
            metadata_end = i
            break

    if metadata_end > 0:
        text = '\n'.join(lines[metadata_end:])

    # Convert ALL-CAPS chapter titles to ### headers
    text = re.sub(
        r'^([A-Z][A-Z ]+(?:AND [A-Z ]+)?)$',
        lambda m: f'### {to_title_case(m.group(1))}' if 3 < len(m.group(1).strip()) < 60 else m.group(0),
        text,
        flags=re.MULTILINE
    )

    # Unwrap hard-wrapped lines
    text = unwrap_hard_lines(text)

    text = collapse_blanks(text)

    header = '# The Prophet\n\n*By Kahlil Gibran*\n\n'
    return header + text.strip() + '\n'


def process_scripture(text: str, title: str, author: Optional[str] = None,
                      translator: Optional[str] = None) -> str:
    """Generic scripture handler — chapter structure, no unwrapping (preserves verse).

    Handles:
    - CHAPTER I through CHAPTER XVIII (roman or arabic) → ## Chapter N
    - BOOK I, BOOK II → ## Book N
    - Speaker names (NAME:) → **NAME:**
    - "HERE ENDETH/ENDS CHAPTER N." colophons → removed
    - No line unwrapping — verse structure preserved
    """
    text = strip_gutenberg_end(text)

    # Remove colophon lines like "HERE ENDETH CHAPTER I. OF THE BHAGAVAD-GITA,"
    text = re.sub(r'^HERE END(?:ETH|S) CHAPTER.*$', '', text, flags=re.MULTILINE | re.IGNORECASE)

    # Convert CHAPTER N (roman or arabic) → ## Chapter N
    text = re.sub(
        r'^CHAPTER ([IVXLCDM\d]+)\.?\s*$',
        lambda m: f'## Chapter {m.group(1)}',
        text,
        flags=re.MULTILINE
    )

    # Convert BOOK N (roman) → ## Book N
    roman_books = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII',
                   'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII']
    for roman in roman_books:
        text = re.sub(rf'^BOOK {roman}\.?\s*$', f'## Book {roman}', text, flags=re.MULTILINE)

    # Bold speaker names (Name: at line start)
    text = bold_speakers(text)

    text = collapse_blanks(text)

    header = f'# {title}\n'
    if author:
        header += f'\n*By {author}*\n'
    if translator:
        header += f'\n*{translator}*\n'
    header += '\n'
    return header + text.strip() + '\n'


def process_shakespeare(text: str) -> str:
    """Process The Complete Works of William Shakespeare.

    Handles:
    - TOC stripping (everything before first play content)
    - Play titles (long ALL-CAPS lines) → ## headers
    - ACT N → ## Act N
    - SCENE N. Description → ### Scene N. Description
    - Character names (SHORT ALL-CAPS + period at line start) → **NAME.**
    - No line unwrapping — verse must be preserved
    """
    text = strip_gutenberg_end(text)

    # Strip previously-added header so --force re-runs don't produce duplicates
    text = re.sub(
        r'^# The Complete Works of William Shakespeare\s*\n\s*\*By William Shakespeare\*\s*\n+',
        '',
        text
    )

    # Strip TOC — find start of actual content.
    # On a fresh run: second "THE SONNETS" marks the start of the sonnet sequence.
    # On a --force re-run: "THE SONNETS" has become "## The Sonnets" — find that instead.
    first_allcaps = text.find('THE SONNETS')
    first_header = text.find('## The Sonnets')
    if first_allcaps != -1:
        second = text.find('THE SONNETS', first_allcaps + 11)
        if second != -1:
            text = text[second:]
    elif first_header != -1:
        text = text[first_header:]

    # Convert known short section markers that don't meet the length threshold
    text = re.sub(r'^THE SONNETS\s*$', '## The Sonnets', text, flags=re.MULTILINE)
    text = re.sub(r'^AS YOU LIKE IT\s*$', '## As You Like It', text, flags=re.MULTILINE)
    text = re.sub(r'^CYMBELINE\s*$', '## Cymbeline', text, flags=re.MULTILINE)

    # Convert ACT markers
    text = re.sub(r'^ACT ([IVX]+)\.?\s*$', lambda m: f'## Act {m.group(1)}', text, flags=re.MULTILINE)

    # Convert SCENE markers (with optional description)
    text = re.sub(
        r'^SCENE ([IVX]+)\.?\s*(.*?)$',
        lambda m: f'### Scene {m.group(1)}' + (f'. {m.group(2).strip()}' if m.group(2).strip() else ''),
        text,
        flags=re.MULTILINE
    )

    # Play title lines: long ALL-CAPS (20+ chars), no trailing period → ## Title Case
    text = re.sub(
        r'^([A-Z][A-Z ,\'\-;:]{19,})$',
        lambda m: f'## {to_title_case(m.group(1))}' if not m.group(1).rstrip().endswith('.') else m.group(0),
        text,
        flags=re.MULTILINE
    )

    # Character names: short ALL-CAPS ending in period → **NAME.**
    text = re.sub(
        r'^([A-Z][A-Z ]{1,29})\.$',
        r'**\1.**',
        text,
        flags=re.MULTILINE
    )

    text = collapse_blanks(text)

    header = '# The Complete Works of William Shakespeare\n\n*By William Shakespeare*\n\n'
    return header + text.strip() + '\n'


def process_gibran(text: str, title: str, author: str = 'Kahlil Gibran') -> str:
    """Process Kahlil Gibran parables and poems (Forerunner, Madman, etc.).

    Handles:
    - [Illustration] marker removal
    - {N} page marker removal (marker only — does not swallow surrounding newlines)
    - Metadata stripping: everything before the first substantive paragraph
    - ALL-CAPS titles (including apostrophes/hyphens) → ### Title Case
    - Hard line-wrap unwrapping (Gibran uses short prose paragraphs)
    """
    text = strip_gutenberg_end(text)

    # Remove [Illustration] markers
    text = re.sub(r'\[Illustration[^\]]*\]', '', text)

    # Remove {N} page markers — marker only, preserve surrounding whitespace
    # (Using \s* here would greedily eat blank lines and collapse structure)
    text = re.sub(r'\{[ivxlcdm\d]+\}', '', text, flags=re.IGNORECASE)

    # Strip all metadata before the actual prose text begins.
    # The text starts at the first paragraph with > 100 chars that doesn't look
    # like publisher metadata (image captions, copyright notices, review blurbs, TOC).
    lines = text.split('\n')
    content_start = 0
    metadata_patterns = re.compile(
        r'image\s|copyright|printed\s+in|alfred.*knopf|mcmx|new\s+york',
        re.IGNORECASE
    )
    for i, line in enumerate(lines):
        stripped = line.strip()
        if (len(stripped) > 100 and
                not stripped.startswith('[') and
                not re.match(r'^[\"\u201c\u201d]', stripped) and  # skip review blurbs (straight or curly quotes)
                not stripped.startswith('#') and   # skip already-processed headers
                not metadata_patterns.search(stripped) and
                not len(re.findall(r'\b\d+\b', stripped)) >= 8):  # skip TOC entries with many page numbers
            content_start = i
            break

    if content_start > 0:
        text = '\n'.join(lines[content_start:])

    # Convert ALL-CAPS section titles (including apostrophes/hyphens) to ### headers
    text = re.sub(
        r"^([A-Z][A-Z '\-]+)$",
        lambda m: f'### {to_title_case(m.group(1))}' if 2 < len(m.group(1).strip()) < 60 else m.group(0),
        text,
        flags=re.MULTILINE
    )

    # Unwrap hard-wrapped lines (Gibran uses short prose paragraphs)
    text = unwrap_hard_lines(text)

    text = collapse_blanks(text)

    header = f'# {title}\n\n*By {author}*\n\n'
    return header + text.strip() + '\n'


def process_generic(text: str) -> str:
    """Fallback processor: collapse blank lines, unwrap hard wraps."""
    text = strip_gutenberg_end(text)
    text = unwrap_hard_lines(text)
    text = collapse_blanks(text)
    return text.strip() + '\n'


# ---------------------------------------------------------------------------
# File routing
# ---------------------------------------------------------------------------

# Maps filename stems to (processor_type, *args)
# Add new files here as they arrive in knowledge/incoming/
FILE_REGISTRY: Dict[str, tuple] = {
    # Plato/Jowett dialogues
    'apology-plato':         ('dialogue', 'Apology'),
    'philosophy-crito':      ('dialogue', 'Crito'),
    'euthyphro-plato':       ('dialogue', 'Euthyphro'),
    'gorgias-plato':         ('dialogue', 'Gorgias'),
    'meno-plato':            ('dialogue_meno', 'Meno'),
    'phaedo-plato':          ('dialogue', 'Phaedo'),
    'phaedrus-plato':        ('dialogue', 'Phaedrus'),
    'symposium-plato':       ('dialogue', 'Symposium'),
    'theaetetus-plato':      ('dialogue', 'Theaetetus'),
    'timaeus-plato':         ('dialogue_timaeus', 'Timaeus'),
    # Plato — special handling
    'laws-plato':            ('laws',),
    'the-republic-of-plato': ('republic',),
    # Scripture
    'zen-heart-sutra':       ('heart_sutra',),
    'taoism-tao-te-ching':   ('tao',),
    'buddhism-the-dhammapada': ('scripture', 'The Dhammapada'),
    # Poetry
    'poetry-leaves-of-grass-walt-whitman': ('poetry', 'Leaves of Grass', 'Walt Whitman'),
    'cross-the-prophet':     ('prophet',),
    # Scientific
    'gaia-hypothesis-james-lovelock': ('scientific', 'The Gaia Hypothesis', 'James Lovelock'),

    # ---- New incoming batch (2026-04-11) ----
    # Scripture
    'Bhagavad-Gîtâ':         ('scripture', 'Bhagavad-Gita', None, 'Translated by Sir Edwin Arnold'),
    # Shakespeare
    'The Complete Works of William Shakespeare': ('shakespeare',),
    # Gibran
    'The Forerunner, His Parables and Poems by Kahlil Gibran': ('gibran', 'The Forerunner'),
    'The MadmanHis Parables and PoemsBy Kahlil Gibran':        ('gibran', 'The Madman'),
    # Poetry collections
    'Poems of Nature by Henry David Thoreau':  ('poetry', 'Poems of Nature', 'Henry David Thoreau'),
    'Rubáiyát of Omar Khayyám, and Salámán and Absál by Omar Khayyam, Emerson, and Jami':
        ('poetry', 'Rubáiyát of Omar Khayyám, and Salámán and Absál', 'Edward FitzGerald'),
    # Scholarly/scientific
    'The Fairy-Faith in Celtic Countries': ('scientific', 'The Fairy-Faith in Celtic Countries', 'W.Y. Evans-Wentz'),
    # Generic prose — novels, essays, philosophy (registered to suppress warnings)
    'Demian-Hermann Hesse':                      ('generic',),
    'Siddhartha-Hermann Hesse':                  ('generic',),
    'Steppenwolf-Hermann Hesse':                 ('generic',),
    'Essays by Ralph Waldo Emerson':             ('generic',),
    'Ethics-Spinoza':                            ('generic',),
    'Gleanings from the Works of George Fox':    ('generic',),
    'Nature-Ralph Waldo Emerson':                ('generic',),
    'On the Duty of Civil Disobedience by Henry David Thoreau': ('generic',),
    'The Egyptian Book of the-dead':             ('generic',),
    'The Joyful Wisdom-Friedrich Wilhelm Nietzsche': ('generic',),
    'The Kingdom of God Is Within You-Tolstoy':  ('generic',),
    'Walden by Henry David Thoreau':             ('generic',),
    'george-fox-autobiography':                  ('generic',),
    'journal-of-george-fox-vol-1':               ('generic',),
    'journal-of-george-fox-vol-2':               ('generic',),
    # NOTE: 'Autobiography of a Yogi by Paramahansa Yogananda' is intentionally
    # NOT registered — active copyright held by Self-Realization Fellowship (1946).
    # Do not publish this file.
}


def route_file(text: str, stem: str) -> str:
    """Route a file to the appropriate processor based on its filename stem."""
    if stem not in FILE_REGISTRY:
        print(f'  WARNING: No registered processor for "{stem}", using generic processor')
        return process_generic(text)

    entry = FILE_REGISTRY[stem]
    proc_type = entry[0]
    args = entry[1:]

    if proc_type == 'dialogue':
        return process_dialogue(text, args[0])
    elif proc_type == 'dialogue_meno':
        return process_dialogue(text, args[0], extra_sections={
            r'^MENO\.?\s*$': '## Meno'
        })
    elif proc_type == 'dialogue_timaeus':
        return process_dialogue(text, args[0], has_sections=True)
    elif proc_type == 'laws':
        return process_laws(text)
    elif proc_type == 'republic':
        return process_republic(text)
    elif proc_type == 'heart_sutra':
        return process_heart_sutra(text)
    elif proc_type == 'tao':
        return process_tao_te_ching(text)
    elif proc_type == 'poetry':
        return process_poetry(text, args[0], args[1])
    elif proc_type == 'scientific':
        return process_scientific(text, args[0], args[1] if len(args) > 1 else None)
    elif proc_type == 'prophet':
        return process_prophet(text)
    elif proc_type == 'scripture':
        return process_scripture(text, args[0],
                                  args[1] if len(args) > 1 else None,
                                  args[2] if len(args) > 2 else None)
    elif proc_type == 'shakespeare':
        return process_shakespeare(text)
    elif proc_type == 'gibran':
        return process_gibran(text, args[0])
    elif proc_type == 'generic':
        return process_generic(text)
    else:
        print(f'  WARNING: Unknown processor type "{proc_type}", using generic')
        return process_generic(text)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def get_file_stem(filepath: Path) -> str:
    """Get the stem of a file, stripping .md extension if present."""
    stem = filepath.stem
    if filepath.suffix == '.md':
        return stem
    # No extension — the full name is the stem
    return filepath.name


def process_file(filepath: Path, force: bool = False, dry_run: bool = False) -> dict:
    """Process a single file. Returns a result dict."""
    result = {
        'file': filepath.name,
        'status': 'unknown',
        'message': '',
        'lines_before': 0,
        'lines_after': 0,
    }

    if not filepath.exists():
        result['status'] = 'error'
        result['message'] = 'file not found'
        return result

    if filepath.stat().st_size == 0:
        result['status'] = 'empty'
        result['message'] = '0 bytes'
        return result

    original = filepath.read_text(encoding='utf-8')
    result['lines_before'] = original.count('\n') + 1

    # Check for existing frontmatter (preserve it)
    frontmatter, body = preserve_frontmatter(original)

    # Check if already formatted
    if is_already_formatted(body) and not force:
        result['status'] = 'skipped'
        result['message'] = 'already formatted'
        return result

    if dry_run:
        stem = get_file_stem(filepath)
        proc_type = FILE_REGISTRY.get(stem, ('generic',))[0]
        result['status'] = 'would_process'
        result['message'] = f'type={proc_type}, {result["lines_before"]} lines'
        return result

    # Process
    stem = get_file_stem(filepath)
    processed = route_file(body if frontmatter else original, stem)

    # Re-attach frontmatter if it existed
    if frontmatter:
        processed = frontmatter + '\n' + processed

    result['lines_after'] = processed.count('\n') + 1

    # Write back
    filepath.write_text(processed, encoding='utf-8')

    result['status'] = 'processed'
    result['message'] = f'{result["lines_before"]} -> {result["lines_after"]} lines'
    return result


def find_incoming_files(base_dir: Path) -> List[Path]:
    """Find all processable files in knowledge/incoming/."""
    incoming = base_dir / 'knowledge' / 'incoming'
    if not incoming.exists():
        return []
    files = []
    for f in sorted(incoming.iterdir()):
        if f.is_file() and not f.name.startswith('.') and not f.name.startswith('_'):
            files.append(f)
    return files


def print_report(results: List[dict]):
    """Print a structured report of processing results."""
    processed = [r for r in results if r['status'] == 'processed']
    skipped = [r for r in results if r['status'] == 'skipped']
    empty = [r for r in results if r['status'] == 'empty']
    would_process = [r for r in results if r['status'] == 'would_process']
    errors = [r for r in results if r['status'] == 'error']

    print('\n## /groom Report\n')

    if processed:
        print('### Processed')
        for r in processed:
            print(f'- {r["file"]} — {r["message"]}')
        print()

    if would_process:
        print('### Would process (dry run)')
        for r in would_process:
            print(f'- {r["file"]} — {r["message"]}')
        print()

    if skipped:
        print('### Already formatted (skipped)')
        for r in skipped:
            print(f'- {r["file"]} — {r["message"]}')
        print()

    if empty:
        print('### Empty (skipped)')
        for r in empty:
            print(f'- {r["file"]} — {r["message"]}')
        print()

    if errors:
        print('### Errors')
        for r in errors:
            print(f'- {r["file"]} — {r["message"]}')
        print()

    # Observations
    no_ext = [r for r in results if not r['file'].endswith('.md') and r['status'] != 'error']
    if no_ext:
        print('### Observations')
        print(f'- Files lacking .md extension: {", ".join(r["file"] for r in no_ext)}')
        print()


def main():
    parser = argparse.ArgumentParser(
        description='Format raw text files for the OpenCosmos knowledge base.'
    )
    parser.add_argument('path', nargs='?', help='Specific file to process')
    parser.add_argument('--dry-run', action='store_true', help='Report what would be done')
    parser.add_argument('--report', action='store_true', help='Show status of all files')
    parser.add_argument('--force', action='store_true', help='Reprocess already-formatted files')
    args = parser.parse_args()

    # Find the repo root (where knowledge/ lives)
    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent.parent  # scripts/knowledge/ -> scripts/ -> repo root

    if args.path:
        # Process a specific file
        filepath = Path(args.path)
        if not filepath.is_absolute():
            filepath = Path.cwd() / filepath
        filepath = filepath.resolve()

        print(f'Processing: {filepath.name}')
        result = process_file(filepath, force=args.force, dry_run=args.dry_run or args.report)
        print_report([result])
    else:
        # Process all files in knowledge/incoming/
        files = find_incoming_files(repo_root)
        if not files:
            print('No files found in knowledge/incoming/')
            return

        print(f'Found {len(files)} files in knowledge/incoming/\n')
        results = []
        for f in files:
            print(f'  Processing: {f.name}...', end=' ')
            result = process_file(f, force=args.force, dry_run=args.dry_run or args.report)
            print(result['status'])
            results.append(result)

        print_report(results)


if __name__ == '__main__':
    main()
