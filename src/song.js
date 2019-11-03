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
  Header,
  Dropdown,
  TextArea,
  Grid,
  Input,
  Form
} from "semantic-ui-react";
import { useQuery, useMutation } from "@apollo/react-hooks";

import FormatBody from "./formatBody";
import { findKeyInSong } from "./lib/utils";

import {
  SongContext,
  GET_SONG_CONTENT_BY_ID,
  GET_MOSTRECENTLY_ADDED,
  UPDATE_SONG,
  updateEntryInStore
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

function DatabaseErrorMsg(props) {
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

export function SearchDisplay(props) {
  const closeHandler = props.closeHandler;

  console.log("--- SearchDisplay");
  const [state, dispatch] = useContext(SongContext);
  const [authChoices, setAuthChoices] = useState(
    state.store.lastAuthorsSelected ? state.store.lastAuthorsSelected : []
  );
  const [authorSearchRes, setAuthorSearchRes] = useState([]);
  const [reInitRes, setReInitRes] = useState(
    authChoices != null && !authorSearchRes.length
  );
  const [selClose, setSelClose] = useState(true);
  const [authorSelOptions] = useState(() => {
    // TBD: should handle cases where songList in store is updated via other queries
    const opts = [];
    for (let entry of state.store.authorsOptions.keys()) {
      opts.push({
        key: entry.toLocaleLowerCase(),
        value: entry,
        text: entry
      });
    }
    opts.sort((a, b) => a.text.localeCompare(b.text));
    return opts;
  });
  let cumIdx = 0;

  const handleSongChoice = (ev, { name }) => {
    let ss = name.split("-");
    // ss[0] is language set index, ss[1] is index of song in result list
    let lindex = parseInt(ss[0], 10);
    let entry = authorSearchRes[lindex][parseInt(ss[1], 10)];
    dispatch({
      type: "selectSongByTitle",
      payload: entry
    });
    closeHandler();
  };

  const handleReset = () => {
    setAuthChoices([]);
    setAuthorSearchRes([]);
    state.store.lastAuthorsSelected = null;
  };

  const handleSearch = () => {
    const apl = new Map();
    const tempRes = [];

    // build author list per language
    authChoices.forEach(auth => {
      const lang = state.store.authorsOptions.get(auth);
      if (!apl.has(lang)) {
        apl.set(lang, [auth]);
      } else {
        const cur = apl.get(lang);
        apl.set(lang, [...cur, auth]);
      }
    });

    // search songlist for matching author(s)
    apl.forEach((values, key) => {
      let searchRegExp = new RegExp(values.join("|"), "i");
      const songList = state.store.songSets.get(key);
      let res = songList
        .filter(se => se.authors.match(searchRegExp))
        .sort((a, b) => a.authors.localeCompare(b.authors));
      tempRes.push(res);
    });
    // console.log(tempRes);
    setAuthorSearchRes(tempRes);
    setSelClose(true);
    state.store.lastAuthorsSelected = authChoices;
  };

  if (reInitRes) {
    // rebuild last search once if author choices was indeed saved
    handleSearch();
    setReInitRes(false);
  }

  return (
    <>
      <Button
        basic
        icon="cancel"
        color="black"
        floated="left"
        content="Reset"
        onClick={handleReset}
      />
      <Button
        basic
        color="pink"
        floated="left"
        content="Show results"
        onClick={handleSearch}
      />
      <Button
        basic
        icon="checkmark"
        color="green"
        floated="left"
        content="Close screen"
        onClick={closeHandler}
      />
      <pre>
        <br />
      </pre>
      <Dropdown
        deburr
        placeholder="(select on or more authors from this list)"
        onClick={() => setSelClose(false)}
        fluid
        search
        multiple
        selection
        open={!selClose}
        value={authChoices}
        options={authorSelOptions}
        onChange={(ev, data) => {
          if (ev.type === "keydown" && ev.key === "Enter") {
            handleSearch();
          } else setAuthChoices(data.value);
        }}
      />

      <Table striped fixed selectable size="large">
        <Table.Header>
          {authorSearchRes.length ? (
            <Table.Row>
              <Table.HeaderCell collapsing width={1}>
                No.
              </Table.HeaderCell>
              <Table.HeaderCell width={2}>Authors</Table.HeaderCell>
              <Table.HeaderCell width={4}>Title</Table.HeaderCell>
              <Table.HeaderCell width={2}>Keywords</Table.HeaderCell>
            </Table.Row>
          ) : (
            <Table.Row>
              <Table.HeaderCell>(Result will be shown here)</Table.HeaderCell>
            </Table.Row>
          )}
        </Table.Header>

        <Table.Body>
          {authorSearchRes.length
            ? authorSearchRes.map((langlist, lindex, asr) => {
                if (lindex > 0) cumIdx = cumIdx + asr[lindex - 1].length;
                return langlist.map((entry, index) => (
                  <React.Fragment key={entry.id}>
                    <Table.Row>
                      <Table.Cell collapsing>{index + 1 + cumIdx}.</Table.Cell>
                      <Table.Cell>{entry.authors}</Table.Cell>
                      <Table.Cell>
                        <Button
                          icon
                          compact
                          onClick={handleSongChoice}
                          name={lindex.toString() + "-" + index.toString()}
                        >
                          <Icon name="play" size="small" />
                        </Button>
                        &nbsp;&nbsp;
                        <b>{entry.title}</b>
                      </Table.Cell>
                      <Table.Cell>{entry.keywords}</Table.Cell>
                    </Table.Row>
                  </React.Fragment>
                ));
              })
            : null}
        </Table.Body>
      </Table>
    </>
  );
}

export function EditSongDisplay(props) {
  console.log("--- EditSongDisplay");
  const closeHandler = props.closeHandler;

  const [state, dispatch] = useContext(SongContext);
  const songId = state.songId;
  const songName = state.songName;
  const songLanguage = state.songLanguage;
  const [authors, setAuthors] = useState("");
  const [songKey, setSongKey] = useState("");
  const [songKeywords, setSongKeywords] = useState("");
  const [songTempo, setSongTempo] = useState("");
  const [songContent, setSongContent] = useState("");
  const [updateSong] = useMutation(UPDATE_SONG);
  const [changed, setChanged] = useState(false);
  const [closeAfterSave, setCloseAfterSave] = useState(false);
  const [editState, setEditState] = useState("readUpdates");

  const {
    data: queryData,
    loading: queryLoading,
    error: queryError
  } = useQuery(GET_SONG_CONTENT_BY_ID, {
    variables: { id: songId },
    skip: !(editState === "readUpdates"),
    fetchPolicy: editState === "readUpdates" ? "network-only" : "cache-first"
  });

  const handleSave = () => {
    if (changed) setEditState("save");
  };

  const handleSaveClose = () => {
    if (changed) {
      setEditState("save");
      setCloseAfterSave(true);
    }
  };

  const handleChange = (setCall, value) => {
    setCall(value);
    if (!changed) setChanged(true);
  };

  console.log("state: " + editState);

  switch (editState) {
    case "readUpdates":
      if (queryError)
        return (
          <DatabaseErrorMsg
            mesg={queryError.message}
            exitHdlr={() => setEditState("exit")}
          />
        );

      if (queryLoading) {
        return (
          <Dimmer active inverted>
            <Loader size="big" inverted>
              Resyncing song ...
            </Loader>
          </Dimmer>
        );
      }

      if (queryData) {
        updateEntryInStore(state.store, queryData.song);

        setAuthors(queryData.song.authors);
        setSongKey(queryData.song.key);
        setSongKeywords(queryData.song.keywords);
        setSongContent(queryData.song.content);
        setSongTempo(queryData.song.tempo);
        if (closeAfterSave) setEditState("exit");
        else setEditState("edit");
      }
      break;

    case "edit":
      break;

    case "save":
      if (changed) {
        let t = parseInt(songTempo, 10);
        updateSong({
          variables: {
            id: songId,
            authors: authors,
            key: songKey,
            keywords: songKeywords,
            tempo: isNaN(t) ? 0 : t,
            content: songContent
          }
        });
        setChanged(false);
      }

      setEditState("readUpdates");
      break;

    case "exit":
      dispatch({
        type: "selectSongByTitle",
        payload: { title: songName, language: songLanguage }
      });
      closeHandler();
      break;

    default:
      console.log("UNEXPECTED CASE");
      return;
  }

  return (
    <>
      <Grid>
        <Grid.Row columns={1}>
          <Grid.Column>
            <Button
              basic
              icon="cancel"
              color="black"
              floated="left"
              content="Cancel"
              onClick={() => setEditState("exit")}
            />
            <Button
              basic
              icon="save"
              color={changed ? "pink" : "green"}
              floated="left"
              content="Save"
              onClick={handleSave}
            />
            <Button
              basic
              icon="save"
              color={changed ? "pink" : "green"}
              floated="left"
              content="Save &amp; Close"
              onClick={handleSaveClose}
            />
          </Grid.Column>
        </Grid.Row>
      </Grid>
      <br></br>
      <Form size="large">
        <Form.Group>
          <Form.Field width={7}>
            <b>Authors</b>
            <br />
            <Input
              fluid
              value={authors}
              onChange={(ev, data) => handleChange(setAuthors, data.value)}
            />
          </Form.Field>
          <Form.Field width={2}>
            <b>Key</b>
            <br />
            <Input
              fluid
              value={songKey}
              onChange={(ev, data) => handleChange(setSongKey, data.value)}
            />
          </Form.Field>
          <Form.Field width={5}>
            <b>Keywords</b>
            <br />
            <Input
              fluid
              value={songKeywords}
              onChange={(ev, data) => handleChange(setSongKeywords, data.value)}
            />
          </Form.Field>
          <Form.Field width={2}>
            <b>Tempo</b>
            <br />
            <Input
              fluid
              value={songTempo}
              onChange={(ev, data) => handleChange(setSongTempo, data.value)}
            />
          </Form.Field>
        </Form.Group>

        <Form.Field width={16}>
          <b>Song</b>
          <br />
          <TextArea
            style={{
              minHeight: Math.floor(window.innerHeight * 0.6),
              fontSize: "1.18em"
            }}
            value={songContent}
            onChange={(ev, data) => handleChange(setSongContent, data.value)}
          />
        </Form.Field>
      </Form>
    </>
  );
}
