/**
 * One-time seeder for knowledge/iching/.
 *
 * Writes the FACTS of the sixty-four hexagrams and the eight trigrams — number,
 * character, pinyin, figure, trigram decomposition — and nothing else. Every
 * English rendering is left null with `status: draft`, because a rendering is a
 * translation decision and those are Shalom's, made one at a time in the form
 * the taoteching glossary already uses.
 *
 * After this runs once, the markdown files are the source of truth. Re-running
 * refuses to clobber any file whose status is no longer `draft`.
 *
 *   pnpm xenso:seed-iching
 *
 * Verification of the table itself lives in iching-check.ts and is not optional:
 * the King Wen sequence has a structural invariant (consecutive pairs are
 * inverses, or complements when a figure is its own inverse) that catches
 * essentially any transcription error, and it is asserted on every build.
 */

import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(__dirname, '..', '..', 'knowledge', 'iching')

/** Bottom → top, '1' = yang. Bottom-up is load-bearing everywhere in this system. */
const TRIGRAMS: Array<{ id: string; chinese: string; pinyin: string; binary: string; image: string }> = [
  { id: 'qian', chinese: '乾', pinyin: 'qián', binary: '111', image: '天' },
  { id: 'dui', chinese: '兌', pinyin: 'duì', binary: '110', image: '澤' },
  { id: 'li', chinese: '離', pinyin: 'lí', binary: '101', image: '火' },
  { id: 'zhen', chinese: '震', pinyin: 'zhèn', binary: '100', image: '雷' },
  { id: 'xun', chinese: '巽', pinyin: 'xùn', binary: '011', image: '風' },
  { id: 'kan', chinese: '坎', pinyin: 'kǎn', binary: '010', image: '水' },
  { id: 'gen', chinese: '艮', pinyin: 'gèn', binary: '001', image: '山' },
  { id: 'kun', chinese: '坤', pinyin: 'kūn', binary: '000', image: '地' },
]

/** The King Wen sequence: [character, pinyin, figure bottom→top]. */
const HEXAGRAMS: Array<[string, string, string]> = [
  ['乾', 'qián', '111111'], ['坤', 'kūn', '000000'], ['屯', 'zhūn', '100010'], ['蒙', 'méng', '010001'],
  ['需', 'xū', '111010'], ['訟', 'sòng', '010111'], ['師', 'shī', '010000'], ['比', 'bǐ', '000010'],
  ['小畜', 'xiǎo chù', '111011'], ['履', 'lǚ', '110111'], ['泰', 'tài', '111000'], ['否', 'pǐ', '000111'],
  ['同人', 'tóng rén', '101111'], ['大有', 'dà yǒu', '111101'], ['謙', 'qiān', '001000'], ['豫', 'yù', '000100'],
  ['隨', 'suí', '100110'], ['蠱', 'gǔ', '011001'], ['臨', 'lín', '110000'], ['觀', 'guān', '000011'],
  ['噬嗑', 'shì kè', '100101'], ['賁', 'bì', '101001'], ['剝', 'bō', '000001'], ['復', 'fù', '100000'],
  ['无妄', 'wú wàng', '100111'], ['大畜', 'dà chù', '111001'], ['頤', 'yí', '100001'], ['大過', 'dà guò', '011110'],
  ['坎', 'kǎn', '010010'], ['離', 'lí', '101101'], ['咸', 'xián', '001110'], ['恆', 'héng', '011100'],
  ['遯', 'dùn', '001111'], ['大壯', 'dà zhuàng', '111100'], ['晉', 'jìn', '000101'], ['明夷', 'míng yí', '101000'],
  ['家人', 'jiā rén', '101011'], ['睽', 'kuí', '110101'], ['蹇', 'jiǎn', '001010'], ['解', 'xiè', '010100'],
  ['損', 'sǔn', '110001'], ['益', 'yì', '100011'], ['夬', 'guài', '111110'], ['姤', 'gòu', '011111'],
  ['萃', 'cuì', '000110'], ['升', 'shēng', '011000'], ['困', 'kùn', '010110'], ['井', 'jǐng', '011010'],
  ['革', 'gé', '101110'], ['鼎', 'dǐng', '011101'], ['震', 'zhèn', '100100'], ['艮', 'gèn', '001001'],
  ['漸', 'jiàn', '001011'], ['歸妹', 'guī mèi', '110100'], ['豐', 'fēng', '101100'], ['旅', 'lǚ', '001101'],
  ['巽', 'xùn', '011011'], ['兌', 'duì', '110110'], ['渙', 'huàn', '010011'], ['節', 'jié', '110010'],
  ['中孚', 'zhōng fú', '110011'], ['小過', 'xiǎo guò', '001100'], ['既濟', 'jì jì', '101010'], ['未濟', 'wèi jì', '010101'],
]

const trigramFor = (binary: string) => {
  const t = TRIGRAMS.find(x => x.binary === binary)
  if (!t) throw new Error(`no trigram for ${binary}`)
  return t
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Refuse to overwrite anything a human has touched. */
const isDraft = (path: string) =>
  !existsSync(path) || /^status:\s*draft\s*$/m.test(readFileSync(path, 'utf8'))

function seedHexagrams() {
  const dir = join(ROOT, 'hexagrams')
  mkdirSync(dir, { recursive: true })
  let written = 0
  let skipped = 0

  HEXAGRAMS.forEach(([chinese, pinyin, binary], i) => {
    const number = i + 1
    const path = join(dir, `${pad(number)}.md`)
    if (!isDraft(path)) {
      skipped++
      return
    }
    const lower = trigramFor(binary.slice(0, 3))
    const upper = trigramFor(binary.slice(3, 6))

    writeFileSync(
      path,
      `---
number: ${number}
chinese: "${chinese}"
pinyin: "${pinyin}"
lines: "${binary}"
trigrams: { lower: "${lower.id}", upper: "${upper.id}" }
render: null
forbidden: []
status: draft
glossary_refs: []
judgment: null
image: null
line_texts: null
---

# ${chinese} — hexagram ${number}

The figure is \`${binary}\`, read bottom to top: ${lower.chinese} below, ${upper.chinese} above.

*Undrafted.* \`render\` is the single word a player sees, and it is a translation
decision — made in the form the [Tao Te Ching glossary](https://github.com/shalomormsby/taoteching)
uses, and constrained by its locks. Open with the live problem, read the
character as a picture changing over time, let cross-textual evidence argue,
name what is set aside, leave the real tension open.

Set \`status: locked\` when the rendering is settled. Until then this file is
regenerable and the seeder may overwrite it.
`,
      'utf8',
    )
    written++
  })
  return { written, skipped }
}

function seedTrigrams() {
  const dir = join(ROOT, 'trigrams')
  mkdirSync(dir, { recursive: true })
  let written = 0
  let skipped = 0

  TRIGRAMS.forEach((t, i) => {
    const path = join(dir, `${pad(i + 1)}-${t.id}.md`)
    if (!isDraft(path)) {
      skipped++
      return
    }
    writeFileSync(
      path,
      `---
id: "${t.id}"
chinese: "${t.chinese}"
pinyin: "${t.pinyin}"
lines: "${t.binary}"
image_chinese: "${t.image}"
render: null
forbidden: []
status: draft
glossary_refs: []
---

# ${t.chinese} — the ${t.id} trigram

Lines \`${t.binary}\`, bottom to top. The Shuogua associates it with ${t.image}.

*Undrafted.* The image is a textual fact; its English is not. Note especially
that 乾/天 must not become "heaven" — 天地 is locked to *sky and earth* in the
Tao Te Ching glossary, with "heaven and earth" forbidden, and the same overlay
is what rules Legge's I Ching out as a source here.
`,
      'utf8',
    )
    written++
  })
  return { written, skipped }
}

const h = seedHexagrams()
const t = seedTrigrams()
console.log(`hexagrams: ${h.written} written, ${h.skipped} left alone (not draft)`)
console.log(`trigrams:  ${t.written} written, ${t.skipped} left alone (not draft)`)
