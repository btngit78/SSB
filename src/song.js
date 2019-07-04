import React from "react";
import { Label, Segment } from "semantic-ui-react";
import FormatBody from "./formatBody";
import "./lib/utils";
import { song1, song2, song3, song4, song5 } from "./mockup";

let songContent = "";

export default function SongDisplay(props) {
  const { song, keyVal, chordOff } = props;
  let lines = [];
  let title = "";
  let author = "";
  let index = 0;

  // console.log("songDisplay", props);
  // setup with mockup data for now
  if (song === "My Way") {
    songContent = `

    `;
  } else if (song === "Gửi Gió Cho Mây Ngàn Bay") {
    songContent = song2;
  } else if (song === "Beyond The Sea") {
    songContent = song3;
  } else if (song === "This Masquerade") {
    songContent = song4;
  } else if (song === "Để Nhớ Một Thời Ta Đã Yêu") {
    songContent = song5;
  } else songContent = song1;

  lines = songContent.split("\n");

  // trim front and back spaces
  for (index = 0; index < lines.length; index++) {
    lines[index] = lines[index].trim();
  }
  //  console.log(lines);

  // find first non-empty line for title
  // The song structure is mostly fixed; parse for
  // - title line
  // - authors line
  // - "key:" (optional)
  // TODO: "keywords:" parsing
  for (index = 0; index < lines.length; index++) {
    title = lines[index];
    if (title.length > 0) {
      author = lines[index + 1]; // next line must be author
      index += 2; // song content start index
      if (lines[index].indexOf("key:", 0) === 0)
        // skip the key line too
        index++;
      break;
    }
  }

  // return warning if song empty
  if (title.length === 0) {
    return (
      <Segment>
        <Label basic color="red" size="huge">
          Something wrong! File is empty
        </Label>
      </Segment>
    );
  }

  return (
    <Segment basic>
      <div className="songTitle">{title}</div>
      <div className="songAuthor">
        {author}
        <br />
        <br />
      </div>
      <div className="songBody">
        <FormatBody
          lines={lines}
          skip={index}
          keyVal={keyVal}
          chordOff={chordOff}
        />
      </div>
    </Segment>
  );
}
