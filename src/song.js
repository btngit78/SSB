import React, { useContext } from "react";
import {
  Label,
  Segment,
  Dimmer,
  Loader,
  Message,
  Table,
  Icon,
  Button
} from "semantic-ui-react";
import { useQuery } from "@apollo/react-hooks";

import FormatBody from "./formatBody";
import { findKeyInSong } from "./lib/utils";

import {
  SongContext,
  GET_SONG_CONTENT_BY_ID,
  GET_MOSTRECENTLY_ADDED
} from "./store";
import moment from "moment";

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

export function RecentlyAddedDisplay(props) {
  const closeHandler = props.closeHandler;

  console.log("--- RecentlyAddedDisplay");
  const [state, dispatch] = useContext(SongContext);

  const { data, loading, error, refetch, networkStatus } = useQuery(
    GET_MOSTRECENTLY_ADDED,
    {
      notifyOnNetworkStatusChange: true
    }
  );

  const handleSelection = (ev, { name }) => {
    const mra = state.store.mostRecentlyAdded;
    if (mra && mra.length) {
      const entry = mra.filter(e => e.title === name);
      // console.log(entry);
      dispatch({
        type: "selectSongById",
        payload: entry[0]
      });
      closeHandler();
    }
  };

  if (networkStatus === 4)
    return (
      <div>
        <Dimmer active inverted>
          <Loader size="huge" inverted>
            Refetching ...
          </Loader>
        </Dimmer>
      </div>
    );

  if (loading)
    return (
      <div>
        <Dimmer active inverted>
          <Loader size="huge" inverted>
            Fetching updates from database ...
          </Loader>
        </Dimmer>
      </div>
    );

  if (error) {
    return (
      <div>
        <Message size="huge">
          <Message.Header>Error in fetching updates.</Message.Header>
          <p>{error.message}</p>
        </Message>
      </div>
    );
  }

  // return warning if no song
  if (data.songs.length === 0) {
    return (
      <Segment>
        <Label basic color="red" size="huge">
          Something wrong! Database appears to be empty.
        </Label>
      </Segment>
    );
  }
  state.store.mostRecentlyAdded = data.songs;

  return (
    <>
      <Button
        content="Refetch"
        icon="redo"
        labelPosition="left"
        floated="left"
        basic
        compact
        color="pink"
        onClick={() => refetch()}
      />
      <pre>&nbsp;</pre>
      <Table striped celled singleLine selectable size="large">
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell width={1}>Time added</Table.HeaderCell>
            <Table.HeaderCell>Title</Table.HeaderCell>
            <Table.HeaderCell width={4}>Authors</Table.HeaderCell>
            <Table.HeaderCell width={1}>Language</Table.HeaderCell>
            <Table.HeaderCell width={2}>Keywords</Table.HeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {data.songs.length
            ? data.songs.map(entry => (
                <React.Fragment key={entry.id}>
                  <Table.Row>
                    <Table.Cell>{moment(entry.createdAt).fromNow()}</Table.Cell>
                    <Table.Cell>
                      <Button
                        icon
                        compact
                        onClick={handleSelection}
                        name={entry.title}
                      >
                        <Icon name="play" size="small" />
                      </Button>
                      &nbsp;&nbsp;
                      <b>{entry.title}</b>
                    </Table.Cell>
                    <Table.Cell>{entry.authors}</Table.Cell>
                    <Table.Cell>{entry.language}</Table.Cell>
                    <Table.Cell>{entry.keywords}</Table.Cell>
                  </Table.Row>
                </React.Fragment>
              ))
            : null}
        </Table.Body>
      </Table>
    </>
  );
}
