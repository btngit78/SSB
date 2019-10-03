import React, { useContext, useState } from "react";
import {
  Segment,
  Dimmer,
  Loader,
  Message,
  Table,
  Icon,
  Button,
  Modal,
  Header
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
        <Message icon negative size="big">
          <Icon name="database" />
          <Message.Content>
            <Message.Header>Error in loading data.</Message.Header>
            <p>{error.message}</p>
          </Message.Content>
        </Message>
      </div>
    );
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
        <FormatBody state={state} />
      </div>
    </Segment>
  );
}

export function RecentlyAddedDisplay(props) {
  const closeHandler = props.closeHandler;

  console.log("--- RecentlyAddedDisplay");
  const [state, dispatch] = useContext(SongContext);
  const [resyncModalOpen, setResyncModalOpen] = useState(false);
  let inMemDBIsCurrent = false;
  let newCount = 0;

  const { data, loading, error, refetch, networkStatus } = useQuery(
    GET_MOSTRECENTLY_ADDED,
    {
      notifyOnNetworkStatusChange: true
    }
  );

  const handleSelection = (ev, { name }) => {
    const mra = data.songs;
    if (mra && mra.length) {
      const entry = mra.filter(e => e.title === name);
      const songList = state.store.songSets.get(entry[0].language);
      const sle = songList.filter(e => e.title === entry[0].title);
      if (!songList || !sle.length) {
        // either set or song is not the store, need to refresh
        setResyncModalOpen(true);
        return;
      }
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
        <Message icon negative size="big">
          <Icon name="database" />
          <Message.Content>
            <Message.Header>Error in fetching updates.</Message.Header>
            <p>{error.message}</p>
          </Message.Content>
        </Message>
      </div>
    );
  }

  if (!data.songs || !data.songs.length) {
    return (
      <Message icon negative size="big">
        <Icon name="database" />
        <Message.Content>
          Unexpected error condition. Try refesh the app.
        </Message.Content>
      </Message>
    );
  }

  inMemDBIsCurrent =
    moment(state.store.timeInit).diff(data.songs[0].createdAt) > 0;
  for (var i = 0; i < data.songs.length; i++) {
    if (moment(state.store.timeInit).diff(data.songs[i].createdAt) < 0)
      newCount++;
  }

  return (
    <>
      <Button
        content={inMemDBIsCurrent ? "Refetch query" : "Reload app"}
        icon="redo"
        labelPosition="left"
        floated="left"
        basic
        compact
        color="pink"
        onClick={() => {
          inMemDBIsCurrent ? refetch() : window.location.reload();
        }}
      />
      {!inMemDBIsCurrent ? (
        <Header size="small" floated="right">
          {newCount} new song{newCount > 1 ? "s" : ""} have been added since
          last synced on: {moment(state.store.timeInit).format("LLL")}
        </Header>
      ) : null}
      <pre>&nbsp;</pre>
      <Table striped fixed selectable size="large">
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell width={2}>Time added</Table.HeaderCell>
            <Table.HeaderCell width={5}>Title</Table.HeaderCell>
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
      <Modal centered={true} size="small" open={resyncModalOpen}>
        <Header
          icon="archive"
          content="Database and directory not in sync!"
          color="orange"
        />
        <Modal.Content>
          <Header size="small">
            The song selected was not found locally. It appears that the current
            directory of song sets and the cloud database is not in sync. Some
            songs may have been added while others deleted.
          </Header>
          <Header size="small">
            Do you want to refesh the app now? (You may reload the app directly
            on this browser's refresh button later, or click 'Refresh' to reload
            the directory now.)
          </Header>
        </Modal.Content>
        <Modal.Actions>
          <Button basic color="red" onClick={() => setResyncModalOpen(false)}>
            <Icon name="remove" /> Later
          </Button>
          <Button basic color="green" onClick={() => window.location.reload()}>
            <Icon name="checkmark" /> Refresh
          </Button>
        </Modal.Actions>
      </Modal>
    </>
  );
}
