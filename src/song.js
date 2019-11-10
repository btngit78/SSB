import React from "react";
import {
  Segment,
  Dimmer,
  Loader,
  Message,
  Icon,
  Button
} from "semantic-ui-react";
import { useQuery } from "@apollo/react-hooks";

import SongBody from "./songBody";
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

export function DatabaseErrorMsg(props) {
  const [mesg, exitHdlr] = { ...props };

  return (
    <div>
      <Message icon negative size="big">
        <Icon name="database" />
        <Message.Content>
          <Message.Header>Error in loading data.</Message.Header>
          <p>
            An error occurred in reading the database. Contact the admin if this
            error is persistent.
          </p>
          <p>{mesg}</p>
          {exitHdlr ? (
            <Button
              basic
              size="large"
              color="black"
              content="Close"
              onClick={exitHdlr}
            ></Button>
          ) : null}
        </Message.Content>
      </Message>
    </div>
  );
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
          <Loader size="big" inverted>
            Loading song {state.songName}...
          </Loader>
        </Dimmer>
      </div>
    );

  if (error) {
    return <DatabaseErrorMsg mesg={error.message} />;
  }

  // return error if song not found or song empty
  if (!data.song || !data.song.content) {
    return (
      <div>
        <Message icon negative size="big">
          <Icon name="database" />
          <Message.Content>
            <Message.Header>Song is not found!</Message.Header>
            <p>
              It's likely that the song has been removed from the database and
              the app hasn't been synced with the cloud for a while.
            </p>
            <p>Refresh the app to synchronize with the cloud DB.</p>
          </Message.Content>
        </Message>
      </div>
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
        <SongBody state={state} />
      </div>
    </Segment>
  );
}
