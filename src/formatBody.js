import React from "react";
import { chordRegExp, chordRegExp1 } from "./lib/utils";
import { textStyling, chordStyling, structStyling } from "./lib/styling";

const keyTab = [
  ["A", 0],
  ["B", 2],
  ["C", 3],
  ["D", 5],
  ["E", 7],
  ["F", 8],
  ["G", 10]
];

const sharps = {
  list: "FCGDAEB",
  majorKeys: ["G", "D", "A", "E", "B", "F#", "C#"],
  minorKeys: ["Em", "Bm", "F#m", "C#m", "G#m", "D#m", "A#m"]
};
const flats = {
  list: "BEADGCF",
  majorKeys: ["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"],
  minorKeys: ["Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm", "Abm"]
};

const keyMap = new Map(keyTab);
const rootNoteExp = /[A-G][#b]?/;
const dimChordExp = /[A-G][#b]?dim7/;
const keyExp = /[A-G][#b]?m?/;

const isSharpOrFlat = c => c === "#" || c === "b";
// const majorScaleOffSeq = [0, 2, 2, 1, 2, 2, 2, 1];
// const minorScaleOffSeq = [0, 2, 1, 2, 2, 2, 1, 1];

// when transposing, notes on same side are preferred except for C major
const forSharps = [
  "A",
  "A#",
  "B",
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#"
];
const forFlats = [
  "A",
  "Bb",
  "B",
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab"
];
const forNeutral = [
  "A",
  "Bb",
  "B",
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab"
];

const typeLineObj = (type = "text", line = "") => ({ type, line });

// given a note, get the key number per keyTab
const getKeynum = keyStr =>
  keyMap.get(keyStr.charAt(0)) +
  (keyStr.length > 1
    ? keyStr.charAt(1) === "#"
      ? 1
      : keyStr.charAt(1) === "b"
      ? -1
      : 0
    : 0);

// given a key number, get the note string, sharp if between as default
const getKeytxt = (keyNum, sharp = true) => {
  let i;
  let k = keyNum % 12;

  for (i = keyTab.length - 1; i >= 0; i--) {
    if (keyTab[i][1] <= k) break;
  }
  return k > keyTab[i][1]
    ? sharp
      ? keyTab[i][0] + "#"
      : keyTab[(i + 1) % keyTab.length][0] + "b"
    : keyTab[i][0];
};

// get the accidental series given side and count
const getAccidentals = (side, count) => {
  return side > 0
    ? sharps.list.substring(0, count)
    : side < 1
    ? flats.list.substring(0, count)
    : "";
};

// if the main key of the song is on sharp key, proposed new key should also
// be sharp, and vice versa.  if main key is C, then proposed new key should be
// one of the flats
// - return the bias key
const biasSelectKey = (pkey, mainKey) => {
  const unisons = [
    ["F#", "Gb"],
    ["C#", "Db"],
    ["C#m", "Dbm"],
    ["G#m", "Abm"],
    ["D#m", "Ebm"],
    ["A#m", "Bbm"]
  ];

  if (
    flats.majorKeys.indexOf(mainKey) >= 0 ||
    flats.minorKeys.indexOf(mainKey) >= 0
  ) {
    // bias flat
    if (pkey.length > 1) {
      if (pkey.charAt(1) === "#") {
        let idx = unisons.findIndex(e => e[0] === pkey);
        if (idx >= 0) return unisons[idx][1];
      }
    }
    // not in list or already flatted
    return pkey;
  } else if (
    sharps.majorKeys.indexOf(mainKey) >= 0 ||
    sharps.minorKeys.indexOf(mainKey) >= 0
  ) {
    // bias sharp
    if (pkey.length > 1) {
      if (pkey.charAt(1) === "b") {
        let idx = unisons.findIndex(e => e[1] === pkey);
        if (idx >= 0) return unisons[idx][0];
      }
    }
    // not in list or already sharped
    return pkey;
  } else {
    // mainKey = 'C'
    return pkey;
  }
};

// create new line with the chords transposed
// - return the new line
function editLine(cline, chordMap) {
  let newline = "";
  let oldchord = "";
  let newchord = "";
  let res;
  let l = cline.length;
  let j = 0;

  if (!l) return newline;

  do {
    res = cline.substring(j).match(chordRegExp1);
    if (res != null) {
      oldchord = res[0];
      newline = newline + cline.substring(j, j + res.index); // the part before the chord
      newchord = chordMap.get(oldchord); // get the transposed chord
      newline += newchord;
      j = j + res.index + res[0].length;
    } else {
      // no more chord found, get the rest of string
      newline = newline + cline.substring(j);
      j = l;
    }
  } while (j < l);
  // console.log(newline);

  return newline;
}

// find the sharp or flat side that the key is in and its index for number of accidentals
// - call back 'resp' to return the side (sharp/flat) and count of accidentals
function findSideAndKeyindex(key, respCB) {
  let s = 0,
    idx = 0;

  if (key === "C" || key === "Am") {
    return respCB(0, 0);
  }

  if (!key.endsWith("m")) {
    // search major keys
    idx = sharps.majorKeys.indexOf(key);
    s = idx > -1 ? 1 : 0;
    if (idx < 0) {
      idx = flats.majorKeys.indexOf(key);
      if (idx < 0) {
        console.log("Problem: not a major key:", key);
        return respCB(0, 0);
      }
      s = -1;
    }
  } else {
    // search minor keys
    idx = sharps.minorKeys.indexOf(key);
    s = idx > -1 ? 1 : 0;
    if (idx < 0) {
      idx = flats.minorKeys.indexOf(key);
      if (idx < 0) {
        console.log("Problem: not a minor key:", key);
        return respCB(0, 0);
      }
      s = -1;
    }
  }
  idx = idx + 1; // from index 0

  return respCB(s, idx);
}

function transposeToNewNote(inum, side, accidentals, prefs) {
  let note = "";

  switch (side) {
    case 1:
      note = prefs[inum];
      break;
    case -1:
      note = prefs[inum];
      break;
    case 0:
    default:
      note = prefs[inum];
  }
  return note;
}

// transpose one chord in quoted notation to new key
// - return the new chord
function transposeOneChord(fromChord, delta, side, accidentals, prefs) {
  let frNum = getKeynum(fromChord.substring(1));
  let cindex = isSharpOrFlat(fromChord.charAt(2)) ? 3 : 2; // anything after the main note
  let toNum = (frNum + delta) % 12;
  let newchord = "";
  let bSide = 0;
  let bAccCount = 0;
  let bAccidentals = "";

  // console.log(fromChord, delta, side, accidentals);
  if (!delta) return fromChord; // no transposition

  newchord = "[" + transposeToNewNote(toNum, side, accidentals, prefs);

  let bidx = fromChord.indexOf("/");
  if (bidx > 0) {
    // bass part
    newchord = newchord + fromChord.substring(cindex, bidx + 1); // capture part thus far
    frNum = getKeynum(fromChord.substring(bidx + 1));
    toNum = (frNum + delta) % 12;
    // use scale of the bass chord
    findSideAndKeyindex(newchord.match(keyExp)[0], (s, count) => {
      bSide = s;
      bAccCount = count;
    });
    bAccidentals = getAccidentals(bSide, bAccCount);
    newchord =
      newchord +
      transposeToNewNote(
        toNum,
        bSide,
        bAccidentals,
        bSide === 0 ? forNeutral : bSide > 0 ? forSharps : forFlats
      ) +
      "]";
  }
  // no bass part
  else newchord = newchord + fromChord.substring(cindex);

  return newchord;
}

// compute real key from fromKey and targeted toKey due to the fact that
// only certain major scales and minor scales are possible given their accidentals
// - return the real key
function computeRealKey(fromKey, toKey) {
  let realKey = toKey,
    temp = "";

  if (
    (fromKey.endsWith("m") && !toKey.endsWith("m")) ||
    (!fromKey.endsWith("m") && toKey.endsWith("m"))
  ) {
    console.log(
      "Problem: mismatched major/minor from: " + fromKey + " and to: " + toKey
    );
  }

  if (!realKey.endsWith("m")) {
    // major keys: change sharp to flat or vice versa if necessary
    temp = realKey;
    if (temp.charAt(1) === "#") {
      realKey =
        temp === "G#"
          ? "Ab"
          : temp === "D#"
          ? "Eb"
          : temp === "A#"
          ? "Bb"
          : temp;
    } else if (temp.charAt(1) === "b") {
      realKey = temp === "Cb" ? "B" : temp === "Fb" ? "E" : temp;
    }
  } else {
    // minor keys: change sharp to flat or vice versa if necessary
    temp = realKey;
    if (temp.charAt(1) === "#") {
      realKey = temp === "E#m" ? "Fm" : temp === "B#m" ? "Cm" : temp;
    } else if (temp.charAt(1) === "b") {
      realKey =
        temp === "Dbm"
          ? "C#m"
          : temp === "Gbm"
          ? "F#m"
          : temp === "Cbm"
          ? "Bm"
          : temp;
    }
  }

  return realKey;
}

// transpose all chords in chordMap to new key; fromKey is [A-G][#b][m]
// - return the actual key transposed to
function transposeToNewKey(fromKey, toKey, chordMap) {
  let keynum = 0;
  let targetKeynum = 0;
  let diff = 0;
  let actualNewKey = "";
  let side = 0; // 0: at C key, +1: sharps, -1: flats
  let accCount = 0;
  let accidentals = "";

  const setSideAndAccCount = (s, count) => {
    side = s;
    accCount = count;
    return;
  };

  keynum = getKeynum(fromKey);
  targetKeynum = getKeynum(toKey);

  // this is the delta to transpose by
  diff =
    targetKeynum < keynum ? 12 + targetKeynum - keynum : targetKeynum - keynum;

  actualNewKey = computeRealKey(fromKey, toKey);

  findSideAndKeyindex(actualNewKey, setSideAndAccCount);

  accidentals = getAccidentals(side, accCount);

  // compute new chords for the map
  chordMap.forEach((value, oldChord) =>
    chordMap.set(
      oldChord,
      transposeOneChord(
        oldChord,
        diff,
        side,
        accidentals,
        side === 0 ? forNeutral : side > 0 ? forSharps : forFlats
      )
    )
  );

  // console.log(...chordMap);
  return actualNewKey;
}

// analyze if the chords found is within scale or normal pattern
// of normal scale; diminished chord of 'between' notes are considered
// transitional and thus likely to remain 'in key'
// - return new key if chord is considered to be of a different key
// or null if within same key
function isOfDifferentKey(xc, fromKey, side, accidentals) {
  let scaleMain = [];
  let fNote = fromKey.match(rootNoteExp);
  let xNote;
  let outScaleCount = 0;

  // this is an inscale note or wiil be assumed to be root of a new key
  xNote = xc[0];

  if (xNote.match(rootNoteExp)[0] === fNote) {
    // same root, then the only difference is if it goes from
    // minor to major (or vice versa)
    if (xNote.length !== fromKey.length) {
      if (xNote.match(dimChordExp))
        // a diminished chord! assume no key change (TBD ?)
        return null;
      return xNote.match(keyExp)[0];
    }
    return null;
  }

  // not same root; see if not within scale of fromKey; build all notes in scale and compare
  // the set is considered to be of different key only if at least 2 chords (not diminished chords)
  // with root note not in the scale of the main key

  scaleMain = [...keyMap.keys()];
  if (accidentals.length)
    scaleMain = scaleMain.map(note =>
      accidentals.indexOf(note) >= 0 ? note + (side > 0 ? "#" : "b") : note
    );
  // console.log("scaleMain: ", scaleMain);
  // console.log("4 chords to examine: ", xc);

  for (var i = 0; i < 3; i++) {
    if (xc[i] === undefined) break;

    // if note is not in scale
    if (scaleMain.indexOf(xc[i].match(rootNoteExp)[0]) >= 0) {
      // note is inscale of main key
      if (outScaleCount === 0 && i === 2)
        // 3rd one examined already but no out-of-scale chord, skip the last
        break;
    } else {
      if (xc[i].match(dimChordExp))
        // diminished chord; assume it's a transition chord only; no change
        continue;

      outScaleCount++;
      if (outScaleCount > 1)
        // 2 out-of-scale chords already, it's a different key
        break;
    }
  }

  if (outScaleCount > 1) {
    return xNote.match(keyExp)[0];
  }
  return null;
}

// if song is to be transposed, go thru all chord maps and transpose each chord,
// then go thru the text to actually replace each chord with the transposed chords inline
// - return the typeLines with chords transposed
function transposeStructText(
  fromKey,
  toKey,
  typeLines,
  primChordMap,
  chorusChordMap,
  bridgeChordMap,
  codaChordMap,
  chorusBlocks,
  bridgeBlocks,
  codaBlock
) {
  let side = 0;
  let accCount = 0;
  let accidentals = "";

  // analyze given block (chorus or coda) and determine proper key
  // then transpose the chordmap
  // - return null
  function analyzeAndTransposeMap(
    idx1,
    idx2,
    chordMap,
    fromKey,
    side,
    accidentals,
    toKey
  ) {
    let xc = new Array(4);
    let fkey;
    let altKeynum;
    let altKey;

    const get4chords = cmap => {
      [xc[0], xc[1], xc[2], xc[3]] = [...cmap.keys()];
    };

    // heuristic algo: grab first 4 chords; assume they will either be in scale (thus same key)
    // or not in scale (thus a new key)
    if (chordMap.size > 0) {
      get4chords(chordMap);

      xc[0] = xc[0].substring(1, xc[0].length - 1); // without the []
      if (xc[1]) xc[1] = xc[1].substring(1, xc[1].length - 1);
      if (xc[2]) xc[2] = xc[2].substring(1, xc[2].length - 1);
      if (xc[3]) xc[3] = xc[3].substring(1, xc[3].length - 1);

      fkey = isOfDifferentKey(xc, fromKey, side, accidentals);

      if (fkey) {
        // compute different key from main chordMap (but with same delta)
        altKeynum =
          (getKeynum(toKey) + (getKeynum(fkey) + 12 - getKeynum(fromKey))) % 12;
        altKey = computeRealKey(
          fkey,
          getKeytxt(altKeynum, side >= 0) + (fkey.endsWith("m") ? "m" : "")
        );
        altKey = biasSelectKey(altKey, toKey);

        transposeToNewKey(fkey, altKey, chordMap);
      } else {
        // same key as main body
        transposeToNewKey(fromKey, toKey, chordMap);
      }
    }
  }

  // go thru structured text and transpose the chords inline
  // by replacing the old chords with new chords in the map
  // - return nothing
  function editLines() {
    const withinBlock = (idx, A, B) => idx >= A && idx <= B;

    typeLines.forEach((tline, index) => {
      if (tline.type === "text") {
        tline.line = editLine(
          tline.line,
          chorusBlocks.length &&
            withinBlock(index, chorusBlocks[0], chorusBlocks[1])
            ? chorusChordMap
            : bridgeBlocks.length &&
              withinBlock(index, bridgeBlocks[0], bridgeBlocks[1])
            ? bridgeChordMap
            : codaBlock.length && withinBlock(index, codaBlock[0], codaBlock[1])
            ? codaChordMap
            : primChordMap
        );
      }
      if (chorusBlocks.length && index === chorusBlocks[1]) {
        // done with this block, remove pair
        chorusBlocks.shift();
        chorusBlocks.shift();
      } else if (bridgeBlocks.length && index === bridgeBlocks[1]) {
        // done with this block, remove pair
        bridgeBlocks.shift();
        bridgeBlocks.shift();
      } else if (codaBlock.length && index === codaBlock[1]) {
        // done with this block, remove pair
        codaBlock.shift();
        codaBlock.shift();
      }
    });
  }

  /*---- main of transpose ----*/

  toKey = toKey + (fromKey.endsWith("m") && !toKey.endsWith("m") ? "m" : "");
  if (toKey === fromKey) return typeLines;

  // at least, primary chord map must be transposed
  // get the real key to use for other sections too
  toKey = transposeToNewKey(fromKey, toKey, primChordMap);

  // analyze chorus & coda sections to see if key has changed
  // and transpose accordingly
  findSideAndKeyindex(fromKey, (s, count) => {
    side = s;
    accCount = count;
  });
  accidentals = getAccidentals(side, accCount);

  // right now, assume that chorus is different from main key
  // at most once, and other chorus section (if any) would share same chords
  if (chorusBlocks.length >= 2) {
    analyzeAndTransposeMap(
      chorusBlocks[0],
      chorusBlocks[1],
      chorusChordMap,
      fromKey,
      side,
      accidentals,
      toKey
    );
  }

  if (bridgeBlocks.length >= 2) {
    analyzeAndTransposeMap(
      bridgeBlocks[0],
      bridgeBlocks[1],
      bridgeChordMap,
      fromKey,
      side,
      accidentals,
      toKey
    );
  }

  // would be an error if more than one coda block
  if (codaBlock.length >= 2) {
    analyzeAndTransposeMap(
      codaBlock[0],
      codaBlock[1],
      codaChordMap,
      fromKey,
      side,
      accidentals,
      toKey
    );
  }

  editLines();
  return typeLines;
}

// collect structured text and if chords are to be displayed, indent (4 spaces) if flag is on
// collect the chords in chord map for possible translation later
// - return nothing
function collectStructText(
  recCB,
  line,
  textOnly,
  chordMap = null,
  indentFlag = false
) {
  if (textOnly) {
    let nl = line.replace(chordRegExp, "");
    if (nl.charAt(0) === " " && line.charAt(0) === "[") {
      // first chord was offset from first word in lyric line to account for beat difference
      // remove leading spaces so that lyric lines will line up correctly
      nl = nl.trimStart();
    }

    // record the line stripped of chords
    recCB(typeLineObj("text", indentFlag ? "    " + nl : nl));
    return;
  }

  recCB(typeLineObj("text", indentFlag ? "    " + line : line));

  // record chord if not in map yet
  let chords = line.match(chordRegExp);
  if (chords != null && chordMap) {
    chords.forEach(chord =>
      !chordMap.has(chord) ? chordMap.set(chord, "") : true
    );
  }
}

//  expand text line with chords to two lines: chord line + text line
function mapLinesToDisplayFormat(tlines) {
  let rlines = [];

  function expandToFormat(tl) {
    let lbd;
    let lc = "";
    let lt = "";

    if (tl.type === "struct") {
      rlines.push(tl); // copy the line over
      return;
    }
    if (tl.type === "text") {
      // expand to possibly a 'chord' line and a 'text' line
      if (tl.line === "") {
        rlines.push(tl); // copy empty text line
        return;
      }

      lbd = tl.line.split("["); // split at begin of each chord segment
      if (lbd.length === 1 && lbd[0].indexOf("]") < 0) {
        // only text, no chord
        rlines.push(tl);
        return;
      }

      for (let item of lbd.values()) {
        // for each chord+text fragment
        const parts = item.split("]"); // split between chord and lyric

        if (parts.length === 1 && parts[0].indexOf("]") < 0) {
          // no chord for this (first) fragment
          lt = lt.concat(parts[0]);
        } else {
          // chord line: a chord must be present
          lc = lc.concat(parts[0], " "); // at least one space for next chord

          // text line
          lt = lt.concat(parts[1]);
        }

        if (lt.length > lc.length) lc = lc.padEnd(lt.length);
        else if (lc.length > lt.length) lt = lt.padEnd(lc.length);
      }
      rlines.push({ type: "chord", line: lc });
      rlines.push({ type: "text", line: lt });
      return;
    }
  }

  tlines.forEach(tl => expandToFormat(tl));
  return rlines;
}

// go thru content line by line and transform each line into text for display
// - return React content for rendering
export default function formatBody(props) {
  const state = props.state;
  const textOnly = state.chordOff || state.noChords;
  let lines = [];
  let index = 0;

  let chorusSection = false;
  let bridgeSection = false;
  let codaSection = false;
  let manualChorus = false;
  let typeLines = [];
  let chorusBlocks = [];
  let bridgeBlocks = [];
  let codaBlock = [];
  const primChordMap = new Map();
  const chorusChordMap = new Map();
  const bridgeChordMap = new Map();
  const codaChordMap = new Map();

  const recLineCB = typeLineObj => typeLines.push(typeLineObj);

  console.log("--- formatBody");

  // extract lines from songContent first
  // then trim front and back spaces
  lines = state.songContent.split("\n");
  for (index = 0; index < lines.length; index++) {
    lines[index] = lines[index].trim();
  }

  // title, authors, key, and keywords have been edited out
  // before insertion into DB already; skip any empty lines
  while (lines[0] === "") lines.splice(0, 1);

  // transform the song (maybe transposed) to structured lines
  // that can be formatted for display
  for (index = 0; index < lines.length; index++) {
    if (lines[index] === "") {
      collectStructText(
        recLineCB,
        "",
        textOnly,
        null,
        chorusSection || bridgeSection
      );
      if (manualChorus) {
        // chorus section was spelled out, line space delineated
        // we can turn off flag to signify end of chorus section
        chorusSection = false;
        manualChorus = false;
        chorusBlocks.push(typeLines.length - 1);
      }
      if (bridgeSection) {
        // bridge section was spelled out, empty line indicates end of section
        bridgeSection = false;
        bridgeBlocks.push(typeLines.length - 1);
      }
      continue;
    }

    // skip comment lines
    if (lines[index].charAt(0) === "#") continue;

    // detect explicit verse marker
    const match = lines[index].match(/verse[\s]*.*:$/i);
    if (
      match != null &&
      match.index === 0 &&
      lines[index].charAt(lines[index].length - 1) === ":"
    ) {
      // if there was no empty line before the marker, add one
      if (lines[index - 1] !== "") collectStructText(recLineCB, "", textOnly);

      collectStructText(
        recLineCB,
        "Verse ".concat(lines[index].substring(6)),
        textOnly
      );
      typeLines[typeLines.length - 1].type = "struct";
      continue;
    }

    // detect chorus section
    if (
      lines[index].substring(0, 5).toLowerCase() === "{soc}" ||
      lines[index].substring(0, 7).toLowerCase() === "chorus:"
    ) {
      // begin of chorus section
      chorusSection = true;
      if (lines[index].substring(0, 7).toLowerCase() === "chorus:") {
        // section should have had a line prior
        manualChorus = true;
      }

      // if there was no empty line before chorus marker, add one
      if (lines[index - 1] !== "") collectStructText(recLineCB, "", textOnly);

      collectStructText(recLineCB, "Chorus:", textOnly, null, true);
      typeLines[typeLines.length - 1].type = "struct";

      // record begin index of chorus section
      chorusBlocks.push(typeLines.length);
      continue;
    }

    // detect chorus end
    if (lines[index].substring(0, 5).toLowerCase() === "{eoc}") {
      chorusSection = false;
      // if the line after the end of chorus marker isn't a space, add one
      if (lines[index + 1] !== "") collectStructText(recLineCB, "", textOnly);

      // record end index of chorus
      chorusBlocks.push(typeLines.length - 1);
      continue;
    }

    // detect bridge section
    if (lines[index].substring(0, 7).toLowerCase() === "bridge:") {
      // begin of chorus section
      bridgeSection = true;

      // if there was no empty line before bridge marker, add one
      if (lines[index - 1] !== "") collectStructText(recLineCB, "", textOnly);

      collectStructText(recLineCB, "Bridge:", textOnly, null, true);
      typeLines[typeLines.length - 1].type = "struct";

      // record begin index of chorus section
      bridgeBlocks.push(typeLines.length);
      continue;
    }

    if (lines[index].substring(0, 4).toLowerCase() === "coda") {
      codaSection = true;
      collectStructText(recLineCB, "Coda:", textOnly);
      typeLines[typeLines.length - 1].type = "struct";

      // record begin index of coda
      codaBlock.push(typeLines.length);
      continue;
    }

    // normal lyric lines
    collectStructText(
      recLineCB,
      lines[index],
      textOnly,
      chorusSection
        ? chorusChordMap
        : bridgeSection
        ? bridgeChordMap
        : codaSection
        ? codaChordMap
        : primChordMap,
      chorusSection || bridgeSection
    );
  }

  // no more lines
  // ensure blocks closed balanced
  if (chorusSection) {
    chorusSection = false;
    chorusBlocks.push(typeLines.length - 1);
  }
  if (bridgeSection) {
    bridgeSection = false;
    bridgeBlocks.push(typeLines.length - 1);
  }
  if (codaSection) {
    codaSection = false;
    codaBlock.push(typeLines.length - 1);
  }
  // console.log(typeLines);

  if (!(textOnly || state.fromKey === ""))
    typeLines = transposeStructText(
      state.songKey,
      state.songToKey,
      typeLines,
      primChordMap,
      chorusChordMap,
      bridgeChordMap,
      codaChordMap,
      chorusBlocks,
      bridgeBlocks,
      codaBlock
    );

  typeLines = mapLinesToDisplayFormat(typeLines);

  return typeLines.map((typeline, idx) => fmtLine(typeline, idx));
}

// return a typed line as React content formatted for rendering
function fmtLine(typeLine, idx) {
  switch (typeLine.type) {
    case "text":
      return (
        <pre key={"line" + idx} style={textStyling()}>
          {typeLine.line.length ? typeLine.line : "\n"}
        </pre>
      );
    case "chord":
      return (
        <pre key={"line" + idx} style={chordStyling()}>
          {typeLine.line.length ? typeLine.line : ""}
        </pre>
      );
    case "struct":
      return (
        <pre key={"line" + idx} style={structStyling()}>
          {typeLine.line.length ? typeLine.line : ""}
        </pre>
      );
    default:
      return <br />;
  }
}
