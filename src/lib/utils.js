export const getWidth = () => window.innerWidth;

export const chordRegExp = /\[[A-G][#b]?[+A-Za-z\d-]*(\(\d\))?(\/[A-G][#b]*)?\]/g;
export const chordRegExp1 = /\[[A-G][#b]?[+A-Za-z\d-]*(\(\d\))?(\/[A-G][#b]*)?\]/;

// find the key in the song which is passed as an array of lines
// return the key in standard notation (A-G and # or b) if found
// or null if no key was found
export function findKeyInSong(lines) {
  let index = 0;
  let chords = [];
  let lastChord = "";

  // scan backward for last chord
  for (index = lines.length - 1; index >= 0; index--) {
    chords = lines[index].match(chordRegExp);
    if (chords && chords.length > 0) {
      // console.log(chords[chords.length-1]);
      lastChord = chords[chords.length - 1].substring(
        1,
        chords[chords.length - 1].length - 1
      );
      break;
    }
  }

  if (lastChord.length) {
    if (lastChord.charAt(0).toUpperCase() > "G") {
      console.log("Invalid chord notation: " + lastChord);
      return null;
    }
    if (lastChord.length > 1) {
      let i = lastChord.indexOf("m");
      if (i > 0) return lastChord.substring(0, i + 1); // minor, may be flat or sharp
      let c = lastChord.charAt(1);
      if (c === "#" || c === "b") return lastChord.substring(0, 2); // major sharp or flat
    }
    return lastChord.slice(0, 1); // major key, not sharp nor flat
  }
  // no chord found
  return null;
}
