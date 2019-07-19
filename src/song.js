import React from "react";
import { Label, Segment, Dimmer, Loader, Message } from "semantic-ui-react";
import { useQuery } from "@apollo/react-hooks";

import FormatBody from "./formatBody";
import { findKeyInSong } from "./lib/utils";

import { GET_SONG_CONTENT_BY_ID } from "./store";

// song have been not assigned a key, see if we can
// determine its key (assuming song ends in normal pattern and
// did not change tone in the middle of the song).
// this auto-detect key will not work otherwise
// - return key (sharp/flat + "m" if minor)
function autoDetectKey(state) {
  let lastChord = "";
  let lines = [];

  if (state.songKey === "") {
    lines = state.songContent.split("\n");
    lastChord = findKeyInSong(lines);

    state.noChords = !lastChord;
    if (!state.noChords) {
      // get <key><flat/sharp> + "m" only if minor
      if (lastChord.length > 1) {
        let mret = lastChord.match(/m$/i);

        if (mret && mret.index > 0) {
          lastChord = lastChord.slice(
            0,
            lastChord[mret.index] === "M" ? mret.idx : mret.idx + 1
          );
        }
      }
      // console.log("assigned key to song: " + lastChord);

      // this is inconsistent with flow: changing header control while in
      // body display! May need to use useEffect to make it work?
      // TODO: this should be fixed later
      state.songKey = state.songToKey = lastChord;
      state.store.songSets.get(state.setName)[
        state.songSetIndex
      ].key = lastChord;
      return lastChord;
    } else return "";
  }
}

export default function SongDisplay(props) {
  const state = props.state;
  const { data, loading, error } = useQuery(GET_SONG_CONTENT_BY_ID, {
    variables: { id: state.songId }
  });

  console.log("--- SongDisplay");

  if (loading)
    return (
      <div>
        <Dimmer active inverted>
          <Loader size="huge" inverted>
            Loading song {state.songName}...
          </Loader>
        </Dimmer>
      </div>
    );

  if (error) {
    return (
      <div>
        <Message size="huge">
          <Message.Header>Error in loading data.</Message.Header>
          <p>{error.message}</p>
        </Message>
      </div>
    );
  }

  // return warning if song empty
  if (data.song.content.length === 0) {
    return (
      <Segment>
        <Label basic color="red" size="huge">
          Something wrong! File is empty
        </Label>
      </Segment>
    );
  }

  // set song content, the rest was set by dispatcher
  state.songContent = data.song.content;

  // wasn't autodetected for key or assigned one when entered into CMS
  if (state.songKey === "") {
    autoDetectKey(state);
    // can't dispatch reducer here; loop
  }

  return (
    <Segment basic>
      <div className="songTitle">{state.songName}</div>
      <div className="songAuthor">
        {state.authors}
        <br />
        <br />
      </div>
      <div className="songBody">
        <FormatBody state={state} />
      </div>
    </Segment>
  );
}
