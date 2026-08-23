import { readFileSync, writeFileSync } from 'node:fs';

const CONDITION_VALUES = {
  arxiv: true,
  comment: false,
  icmlworkshop: false,
  todo: false
};

function stripComments(text) {
  let output = '';
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '\\' && text[index + 1] === '%') {
      output += char + text[index + 1];
      index += 1;
    } else if (char === '%') {
      while (index < text.length && text[index] !== '\n') {
        index += 1;
      }
      output += '\n';
    } else {
      output += char;
    }
  }
  return output;
}

function skipWhitespace(text, start) {
  let cursor = start;
  while (/\s/.test(text[cursor] ?? '')) {
    cursor += 1;
  }
  return cursor;
}

function parseGroup(text, start) {
  if (text[start] !== '{') {
    throw new Error(`Expected { at ${start}: ${JSON.stringify(text.slice(Math.max(0, start - 30), start + 30))}`);
  }
  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return { content: text.slice(start + 1, index), end: index + 1 };
      }
    }
  }
  throw new Error(`Unbalanced group at ${start}`);
}

export function expandToggles(text) {
  let output = '';
  let index = 0;
  const source = stripComments(text);

  while (index < source.length) {
    const match = /\\iftoggle\s*\{([^}]*)\}/y.exec(source.slice(index));
    if (!match) {
      output += source[index];
      index += 1;
      continue;
    }

    const start = index + match.index;
    const afterCondition = start + match[0].length;
    let cursor = skipWhitespace(source, afterCondition);
    const condition = match[1];
    const first = parseGroup(source, cursor);
    const secondStart = skipWhitespace(source, first.end);
    const hasSecond = source[secondStart] === '{';
    const second = hasSecond ? parseGroup(source, secondStart) : { content: '', end: first.end };
    const chosen = CONDITION_VALUES[condition] === false ? second.content : first.content;
    output += expandToggles(chosen);
    index = hasSecond ? second.end : first.end;
  }

  return output;
}

const inputPath = process.argv[2];
const outputPath = process.argv[3];
if (process.argv[1]?.endsWith('expand-tex-toggles.mjs')) {
  if (!inputPath || !outputPath) {
    throw new Error('Usage: expand-tex-toggles.mjs <input.tex> <output.tex>');
  }
  writeFileSync(outputPath, expandToggles(readFileSync(inputPath, 'utf8')));
}
