/**
 * A small RFC 4180 reader: quoted fields, doubled quotes, CRLF, a leading BOM. The delimiter is
 * a comma or, from a spreadsheet saved in French, a semicolon — whichever the header uses.
 */

export function detectDelimiter(headerLine: string): ',' | ';' {
  const count = (char: string) => headerLine.split(char).length - 1;
  return count(';') > count(',') ? ';' : ',';
}

type ReaderState = { rows: string[][]; row: string[]; field: string; quoted: boolean };

function endField(state: ReaderState) {
  state.row.push(state.field);
  state.field = '';
}

function endRow(state: ReaderState) {
  endField(state);
  if (state.row.some((field) => field.trim() !== '')) {
    state.rows.push(state.row);
  }
  state.row = [];
}

function readQuoted(state: ReaderState, text: string, index: number): number {
  if (text[index] !== '"') {
    state.field += text[index];
    return index;
  }
  if (text[index + 1] === '"') {
    state.field += '"';
    return index + 1;
  }
  state.quoted = false;
  return index;
}

function readPlain(state: ReaderState, char: string, delimiter: string) {
  if (char === '"') {
    state.quoted = true;
  } else if (char === delimiter) {
    endField(state);
  } else if (char === '\n') {
    endRow(state);
  } else if (char !== '\r') {
    state.field += char;
  }
}

export function parseCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(source.split('\n', 1)[0]!);
  const state: ReaderState = { rows: [], row: [], field: '', quoted: false };
  for (let index = 0; index < source.length; index += 1) {
    if (state.quoted) {
      index = readQuoted(state, source, index);
    } else {
      readPlain(state, source[index]!, delimiter);
    }
  }
  endRow(state);
  return state.rows;
}
