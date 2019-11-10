import React, { useContext, useState } from "react";
import {
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

import { SongContext, GET_MOSTRECENTLY_ADDED } from "./store";
import { DatabaseErrorMsg } from "./song";

import moment from "moment";

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
        type: "selectSongByTitle",
        payload: entry[0]
      });
      closeHandler();
    }
  };

  if (networkStatus === 4)
    return (
      <div>
        <Dimmer active inverted>
          <Loader size="big" inverted>
            Refetching ...
          </Loader>
        </Dimmer>
      </div>
    );

  if (loading)
    return (
      <div>
        <Dimmer active inverted>
          <Loader size="big" inverted>
            Fetching updates from database ...
          </Loader>
        </Dimmer>
      </div>
    );

  if (error) {
    return <DatabaseErrorMsg mesg={error.message} />;
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
        basic
        content={inMemDBIsCurrent ? "Refetch query" : "Reload app"}
        icon="redo"
        floated="left"
        color="pink"
        onClick={() => {
          inMemDBIsCurrent ? refetch() : window.location.reload();
        }}
      />
      <Button
        basic
        icon="checkmark"
        color="green"
        content="Close screen"
        floated="left"
        onClick={closeHandler}
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
            <Table.HeaderCell collapsing width={1}>
              No.
            </Table.HeaderCell>
            <Table.HeaderCell width={2}>Time added</Table.HeaderCell>
            <Table.HeaderCell width={5}>Title</Table.HeaderCell>
            <Table.HeaderCell width={4}>Authors</Table.HeaderCell>
            <Table.HeaderCell width={1}>Language</Table.HeaderCell>
            <Table.HeaderCell width={2}>Keywords</Table.HeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {data.songs.length
            ? data.songs.map((entry, idx) => (
                <React.Fragment key={entry.id}>
                  <Table.Row>
                    <Table.Cell collapsing>{idx + 1}.</Table.Cell>
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
