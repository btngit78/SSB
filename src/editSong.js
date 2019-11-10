import React, { useContext, useState } from "react";
import {
  Dimmer,
  Loader,
  Button,
  TextArea,
  Grid,
  Input,
  Form,
  Message
} from "semantic-ui-react";
import { useQuery, useMutation } from "@apollo/react-hooks";
import { DatabaseErrorMsg } from "./song";
import { generateTextFormatForCurrentState } from "./songBody";

import {
  SongContext,
  GET_SONG_CONTENT_BY_ID,
  UPDATE_SONG,
  updateEntryInStore,
  updateStateInSync
} from "./store";

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
  let modifiedSongState =
    (!state.noChords && state.chordOff) || state.songKey !== state.songToKey;

  const {
    data: queryData,
    loading: queryLoading,
    error: queryError
  } = useQuery(GET_SONG_CONTENT_BY_ID, {
    variables: { id: songId },
    skip: !(
      editState === "readUpdates" || editState === "readUpdatesAfterSave"
    ),
    fetchPolicy:
      editState === "readUpdates" || editState === "readUpdatesAfterSave"
        ? "network-only"
        : "cache-first"
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
    case "readUpdatesAfterSave":
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
        if (editState === "readUpdatesAfterSave") {
          // this is a must to align state with updated song values so that
          // editor will render things correctly after save when song was transposed or chords removed.
          updateStateInSync(state, queryData.song);
          modifiedSongState = false;
        }
        updateEntryInStore(state.store, queryData.song);

        setAuthors(queryData.song.authors);
        // setup changed key if transposed
        setSongKey(
          queryData.song.key !== state.songToKey
            ? (setChanged(true), state.songToKey)
            : queryData.song.key
        );
        setSongKeywords(queryData.song.keywords);
        // setup modified content if song is transposed or chord display is off
        setSongContent(
          modifiedSongState
            ? (setChanged(true), generateTextFormatForCurrentState(state))
            : queryData.song.content
        );
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
      setEditState("readUpdatesAfterSave");
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
      {modifiedSongState ? (
        <Message info>
          <Message.Header>Preset modified content!</Message.Header>
          <p>
            The song content shown below reflects either a condition where all
            chords have been removed or transposed to the key selected. If this
            is not what's desired, simply go back and reset to the condition
            desired and enter edit mode again.
          </p>
        </Message>
      ) : null}
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
