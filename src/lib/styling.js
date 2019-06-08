import { getWidth } from "./utils";

const contentStyle = {
  fsize: 0,
  margin: 0,
  paddingTop: 0,
  textColor: "black",
  chordColor: "blue" // alternative: "#0101da"
};

// Song styling will be dynamic:
// fontsize to accommodate about 40 characters plus spacing
// minimum of 13 pixels, maximum of 25 pixels
// set margin to commodate larger font, minimum is 3 pixels; add padding for chord lines

export function setStyle() {
  contentStyle.fsize = Math.min(Math.max(Math.round(getWidth() / 40), 13), 25);
  contentStyle.margin = Math.max(Math.round(contentStyle.fsize / 5), 3);
  contentStyle.paddingTop = Math.max(Math.round(contentStyle.fsize / 6), 2);

  // console.log(contentStyle);
}

export function textStyling() {
  return {
    fontSize: contentStyle.fsize,
    margin: contentStyle.margin
  };
}

export function chordStyling() {
  return {
    fontSize: contentStyle.fsize,
    margin: contentStyle.margin,
    paddingTop: contentStyle.paddingTop,
    color: contentStyle.chordColor
  };
}

export function structStyling() {
  return {
    fontSize: contentStyle.fsize,
    margin: contentStyle.margin,
    paddingTop: contentStyle.paddingTop,
    fontWeight: "bold"
  };
}
