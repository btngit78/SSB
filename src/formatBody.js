import React from "react";
import { chordRegExp, chordRegExp1, findKeyInSong } from "./lib/utils";
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

const typeLine = (type = "text", line = "") => ({ type, line });

const isSharpOrFlat = c => c === "#" || c === "b";

const getKeynum = keyStr =>
  keyMap.get(keyStr.charAt(0)) +
  (keyStr.length > 1
    ? keyStr.charAt(1) === "#"
      ? 1
      : keyStr.charAt(1) === "b"
      ? -1
      : 0
    : 0);

// create new line with the chords transposed
// return the new line
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
// call back 'resp' to return the side (sharp/flat) and count of accidentals
function findSideAndKeyindex(key, resp) {
  let s = 0,
    idx = 0;

  if (key === "C" || key === "Am") {
    return resp(0, 0);
  }

  if (key.charAt(key.length - 1) !== "m") {
    // search major keys
    idx = sharps.majorKeys.indexOf(key);
    s = idx > -1 ? 1 : 0;
    if (idx < 0) {
      idx = flats.majorKeys.indexOf(key);
      if (idx < 0) {
        console.log("Problem: not a major key:", key);
        return resp(0, 0);
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
        return resp(0, 0);
      }
      s = -1;
    }
  }
  idx = idx + 1; // from index 0

  return resp(s, idx);
}

// from interval number (number 0-11 offset from A), get the transposed note
// return the transposed note
function transposeToNewNote(inum, side, accidentals) {
  let idx = 0;
  let note = "";

  // what note is the target num ? get the note that is equal or one seminote above
  idx = inum < 11 ? keyTab.findIndex(item => item[1] >= inum) : 7;

  if (inum < 11 && inum === keyTab[idx][1]) note = keyTab[idx][0];
  else {
    switch (side) {
      case 1:
        // one or more sharps, scan forward to find the 'greater' note or equal
        // in between intervals
        if (accidentals.indexOf(keyTab[idx - 1][0]) > -1)
          note = keyTab[idx - 1][0] + "#";
        else note = idx === 7 ? "G#" : keyTab[idx][0] + "b";
        break;
      case -1:
        // one or more flats, scan forward to find the 'greater' note or equal
        // in between intervals
        if (accidentals.indexOf(keyTab[idx % 7][0]) > -1)
          note = keyTab[idx % 7][0] + "b";
        else note = idx === 7 ? "Ab" : keyTab[idx - 1][0] + "#";
        break;
      case 0:
      default:
        // in C key, prefer to name in-between chords in flatted
        // except for root+1 and 4th+1
        note =
          idx === 7
            ? "Ab"
            : inum === 4 || inum === 9
            ? keyTab[idx - 1][0] + "#"
            : inum === keyTab[idx][1]
            ? keyTab[idx][0]
            : keyTab[idx][0] + "b";
    }
  }
  return note;
}

// transpose one chord in quoted notation w/o bass to new key
// return the new chord
function transposeOneChord(fromChord, delta, side, accidentals) {
  let frNum = getKeynum(fromChord.substring(1));
  let cindex = isSharpOrFlat(fromChord.charAt(2)) ? 3 : 2; // anything after the main note
  let toNum = (frNum + delta) % 12;
  let newchord = "";

  // console.log(fromChord, delta, side, accidentals);
  if (!delta) return fromChord; // no transposition

  newchord = "[" + transposeToNewNote(toNum, side, accidentals);

  let bidx = fromChord.indexOf("/");
  if (bidx > 0) {
    // bass part
    newchord = newchord + fromChord.substring(cindex, bidx + 1); // capture part thus far
    frNum = getKeynum(fromChord.substring(bidx + 1));
    toNum = (frNum + delta) % 12;
    newchord = newchord + transposeToNewNote(toNum, side, accidentals) + "]";
  }
  // no bass part
  else newchord = newchord + fromChord.substring(cindex);

  // console.log(fromChord, newchord);
  return newchord;
}

// compute real key from fromKey and targeted toKey due to the fact that
// only certain major scales and minor scales are possible given their accidentals
// return the real key
function computeRealKey(fromKey, toKey) {
  let realKey = "";

  realKey = toKey + (fromKey.charAt(fromKey.length - 1) === "m" ? "m" : "");

  if (realKey.charAt(realKey.length - 1) !== "m") {
    // major keys: change sharp to flat or vice versa if necessary
    let temp = realKey;
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
    let temp = realKey;
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

// transpose all chords in chordMap to new key
// fromKey is [A-G][#b][m]
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

  accidentals =
    side > 0
      ? sharps.list.substring(0, accCount)
      : side < 1
      ? flats.list.substring(0, accCount)
      : "";

  console.log(
    "from: ",
    fromKey,
    "to: ",
    toKey,
    "key index: ",
    keynum,
    "new key index: ",
    targetKeynum,
    "real key: ",
    actualNewKey,
    accidentals
  );

  // compute new chords for the map
  chordMap.forEach((value, key) =>
    chordMap.set(key, transposeOneChord(key, diff, side, accidentals))
  );
  // console.log(...chordMap);
}

// transpose the song if target key is different from default
// return the complete song via an array of lines
function transposeSong(props) {
  let { lines, keyVal } = props;
  let lastChord = "";
  const chordMap = new Map();
  let newLines;

  // collect all chords in the song into the chordMap
  function collectAllChords(lines, chordMap) {
    lines.forEach(cline => {
      let chords = cline.match(chordRegExp);
      if (chords != null) {
        chords.forEach(chord =>
          !chordMap.has(chord) ? chordMap.set(chord, "") : true
        );
      }
    });
  }

  // get <key><flat/sharp> + "m" only if minor
  lastChord = findKeyInSong(lines);
  console.log("lastChord: " + lastChord);
  if (!lastChord) {
    console.log("Song has no chords");
    return null;
  }
  if (lastChord.length > 1) {
    let idx = lastChord.match(/m$/i).index;
    if (idx > 0) {
      lastChord = lastChord.slice(0, lastChord[idx] === "M" ? idx : idx + 1);
    }
  }

  // create a temporary key pattern from selected value to compare
  // then do transpose if they are different
  let temp = keyVal.concat(
    lastChord.charAt(lastChord.length - 1) === "m" ? "m" : ""
  );
  if (temp !== lastChord) {
    console.log("keyVal: " + keyVal);
    collectAllChords(lines, chordMap);
    transposeToNewKey(lastChord, keyVal, chordMap);
    newLines = lines.map(oldline => editLine(oldline, chordMap));
    return newLines;
  }
  return lines;
}

// edit line for chord option and transpose
// return nothing; line edited is transferred back to caller by one or more callbacks
function editOrigText(receiveLine, line, chordOff) {
  let text = "";
  let cline = "";
  let i1, i2;
  let prev = 0;
  let count = 0;
  let cumaddspace = 0;

  if (chordOff) {
    // console.log(line.match(chordRegExp));
    receiveLine(typeLine("text", line.replace(chordRegExp, ""))); // text line
    return;
  }

  do {
    i1 = line.indexOf("[", prev);
    if (i1 >= 0) {
      i2 = line.indexOf("]", i1);
      if (i2 > 0) {
        // -- do the text line first --
        // get the text in front of the chord being processed
        text = text.concat(line.substring(prev, i1));

        // do chord line: pad with space to begin of chard
        cline = cline.padEnd(i1 - count + cumaddspace);

        // if no space between multiple chords, need to add one space in-between
        if (cline.length > 0 && cline.charAt(cline.length - 1) !== " ") {
          cline = cline.padEnd(cline.length + 1);
          cumaddspace += 1;
        }

        if (
          cline.length !== text.length &&
          line.charAt(i2 + 1) !== " " &&
          line.charAt(i2 + 1) !== "["
        ) {
          // text line shorter for next chord position
          if (text.length < cline.length) {
            text = text.padEnd(cline.length);
          } else {
            // chord line is shorter due to recently added text
            // console.log(text);
            cline = cline.padEnd(text.length);
          }
        }
        cline = cline.concat(line.substring(i1 + 1, i2)); // get the chord

        // account for the length (spaces taken up) by all the chords seen so far
        count += i2 - i1 + 1;
      }
    }
    if (i1 < 0 || i2 < 0) {
      // no more chords or none
      text = text.concat(line.substring(prev));
    }
    // set the start for next scan to the end of the chord examined
    prev = i1 >= 0 ? (i2 > 0 ? i2 + 1 : -1) : -1;
  } while (prev > 0);

  if (cline.length) receiveLine(typeLine("chord", cline));

  receiveLine(typeLine("text", text));
}

// go thru content line by line and transform each line into text for display
// return React content for rendering
export default function formatBody(props) {
  let { lines, skip, chordOff } = props;
  let chorusSection = false;
  // let codaSection = false;
  let index = 0;
  let manualChorus = false;
  let typeLines = [];

  const recLine = typeLine => typeLines.push(typeLine);

  console.log(props);

  // transpose all lines first
  if (!chordOff) lines = transposeSong(props);

  // skip title+author line, then skip empty lines
  lines.splice(0, skip);
  while (lines[0] === "") lines.splice(0, 1);

  //console.log(lines);
  for (index = 0; index < lines.length; index++) {
    if (lines[index] === "") {
      editOrigText(recLine, "", chordOff);
      if (manualChorus) {
        // chorus section was spelled out, line space delineated
        // we can turn off flag to signify end of chorus section
        chorusSection = false;
        manualChorus = false;
      }

      continue;
    }
    // skip comment lines
    if (lines[index].charAt(0) === "#") continue;

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
      if (lines[index - 1] !== "") editOrigText(recLine, "", chordOff);

      editOrigText(recLine, "     Chorus:", chordOff);
      typeLines[typeLines.length - 1].type = "struct";
      continue;
    }

    // detect chorus end
    if (lines[index].substring(0, 5).toLowerCase() === "{eoc}") {
      chorusSection = false;
      // if the line after the end of chorus marker isn't a space, add one
      if (lines[index + 1] !== "") editOrigText(recLine, "", chordOff);
      continue;
    }

    if (lines[index].substring(0, 4).toLowerCase() === "coda") {
      // codaSection = true;
      editOrigText(recLine, "Coda:", chordOff);
      typeLines[typeLines.length - 1].type = "struct";
      continue;
    }

    // normal lyric lines
    let newline = (chorusSection ? "     " : "") + lines[index];

    editOrigText(recLine, newline, chordOff);
  }
  // console.log(typeLines);

  return typeLines.map((typeline, idx) => fmtLine(typeline, idx));
}

// return a typed line as React content formatted for rendering
function fmtLine(typeLine, idx) {
  switch (typeLine.type) {
    case "text":
      return (
        <pre
          key={"line" + idx}
          style={ textStyling() }
        >
          {typeLine.line.length ? typeLine.line : "\n"}
        </pre>
      );
    case "chord":
      return (
        <pre
          key={"line" + idx}
          style={ chordStyling() }
        >
          {typeLine.line.length ? typeLine.line : ""}
        </pre>
      );
    case "struct":
      return (
        <pre
          key={"line" + idx}
          style={ structStyling() }
        >
          {typeLine.line.length ? typeLine.line : ""}
        </pre>
      );
    default:
      return <br />;
  }
}
