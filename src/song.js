import React from "react";
import { Label, Segment, Dimmer, Loader, Message } from "semantic-ui-react";
import { useQuery } from "@apollo/react-hooks";
import FormatBody from "./formatBody";
import "./lib/utils";
import { GET_SONG_CONTENT_BY_ID } from "./store";

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
