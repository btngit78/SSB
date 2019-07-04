// Copyright 2019 by Nghia Nguyen
//
import React, { useState, useEffect, useContext } from "react";
import {
  Sidebar,
  Divider,
  Menu,
  Icon,
  Dropdown,
  List,
  Button,
  Label,
  Checkbox,
  Dimmer,
  Loader,
  Message,
  Modal
} from "semantic-ui-react";
import SongDisplay from "./song";
import { setStyle } from "./lib/styling";

import "./app.css";

import { SongContext, SongProvider } from "./store";

// from proper form of key in major or minor,
// just extract the root note which may have "b" or "#"
// return the key without the "m" if any
function getKeyForSelectControl(actualKey) {
  let l = actualKey.length;
  if (l > 1) {
    if (actualKey.charAt(l - 1) === "m") {
      return actualKey.substring(0, l - 1);
    }
  }
  return actualKey;
}

// set side effects from window width change
// return the width
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
      setStyle();
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  });
  return width;
}

function App() {
  const minWidth = 600;
  const altmenuWidth = 900;
  const width = useWindowWidth();
  const [visible, setVisible] = useState(false);

  const [searchModalOpen, setSearchModalOpen] = useState(false);

  setStyle();
  // console.log(
  //   "Song:",
  //   songSets[setChoice].list[songChoice].name,
  //   "Key:",
  //   currentKey
  // );

  function handleSidebarVisible(e, obj) {
    setVisible(true);
  }

  function handleSidebarHide(e, obj) {
    setVisible(false);
  }

  function handleUpKey(currentKey) {
    if (currentKey.length === 1) {
      // key currently not sharped nor flatted
      if (currentKey === "E") return "F";
      else if (currentKey === "B") return "C";
      else if (currentKey === "D") return "Eb";
      else if (currentKey === "G") return "Ab";
      else if (currentKey === "A") return "Bb";
      else return currentKey + "#";
    } else {
      // sharp and flat
      let next = "";
      if (currentKey.charAt(1) === "b") next = currentKey.charAt(0);
      else {
        if (currentKey.charAt(0) === "G") next = "A";
        else next = String.fromCharCode(currentKey.charCodeAt(0) + 1);
      }
      return next;
    }
  }

  function handleDownKey(currentKey) {
    if (currentKey.length === 1) {
      // key currently not sharped nor flatted
      if (currentKey === "F") return "E";
      else if (currentKey === "C") return "B";
      else return currentKey + "b";
    } else {
      // sharp and flat
      let next = "";
      if (currentKey.charAt(1) === "#") next = currentKey.charAt(0);
      else {
        if (currentKey.charAt(0) === "A") next = "G";
        else next = String.fromCharCode(currentKey.charCodeAt(0) - 1);
      }
      return next;
    }
  }

  function handleEditSong(e, obj) {
    alert("will do edit later");
    handleSidebarHide();
  }

  function handleEditSet(e, obj) {
    alert("will do edit later");
    handleSidebarHide();
  }

  function handleImport(e, obj) {
    alert("will do import later");
    handleSidebarHide();
  }

  function handleSettings(e, obj) {
    alert("will do settings later");
    handleSidebarHide();
  }

  function handleLogout(e, obj) {
    alert("will do logout later");
    handleSidebarHide();
  }

  function handleSearch(e, obj) {
    setSearchModalOpen(true);
    handleSidebarHide();
  }

  const SearchModal = () => {
    const handleClose = () => {
      setSearchModalOpen(false);
    };

    return (
      <Modal
        open={searchModalOpen}
        onClose={handleClose}
        centered={false}
        style={{ width: "70%" }}
      >
        <Modal.Header>Search for song</Modal.Header>
        <Modal.Content style={{ textAlign: "center" }}>
          <p>This will be implemented in the future.</p>
        </Modal.Content>
        <Modal.Actions>
          <Button basic color="red" onClick={handleClose}>
            <Icon name="remove" /> Cancel
          </Button>
          <Button color="green" onClick={handleClose}>
            <Icon name="checkmark" /> Import selected song
          </Button>
        </Modal.Actions>
      </Modal>
    );
  };

  const SidebarMain = () => {
    return (
      <>
        <SearchModal />
        <Sidebar
          as={Menu}
          animation="overlay"
          icon="labeled"
          onHide={handleSidebarHide}
          vertical
          visible={visible}
          width="thin"
          size="large"
        >
          <Menu.Item onClick={handleSearch}>
            <Icon name="search" /> Search
          </Menu.Item>
          <Menu.Item onClick={handleEditSong}>
            <Icon name="edit" /> Edit Song
          </Menu.Item>
          <Menu.Item onClick={handleEditSet}>
            <Icon name="paste" /> Edit Set
          </Menu.Item>
          <Menu.Item onClick={handleImport}>
            <Icon name="cloud upload" /> Upload files
          </Menu.Item>
          <Menu.Item onClick={handleSettings}>
            <Icon name="setting" /> Settings
          </Menu.Item>
          <Menu.Item onClick={handleLogout}>
            <Icon name="log out" /> Logout
          </Menu.Item>
        </Sidebar>
      </>
    );
  };

  const SetChoiceItem = () => {
    const [state, dispatch] = useContext(SongContext);

    return (
      <List.Item>
        <List.Content>
          <Label color="green" size="large">
            Set:
          </Label>
          <Dropdown
            selection
            compact
            onChange={(ev, obj) =>
              dispatch({ type: "selectSet", payload: obj.value })
            }
            value={state.setName}
            options={state.store.setChoiceOptions}
          />
        </List.Content>
      </List.Item>
    );
  };

  const SongChoiceItem = () => {
    const [state, dispatch] = useContext(SongContext);

    return (
      <List.Item>
        <List.Content>
          <Label color="green" size="large">
            Song:
          </Label>
          <Dropdown
            search
            selection
            onChange={(ev, obj) =>
              dispatch({ type: "selectSong", payload: obj.value })
            }
            value={state.songName}
            options={state.store.songChoiceOptions[state.setName]}
          />
        </List.Content>
      </List.Item>
    );
  };

  const SongKeySelect = () => {
    const [state, dispatch] = useContext(SongContext);

    const selectionKeys = [
      { key: 0, text: "C", value: "C" },
      { key: 1, text: "C#", value: "C#" },
      { key: 2, text: "Db", value: "Db" },
      { key: 3, text: "D", value: "D" },
      { key: 4, text: "D#", value: "D#" },
      { key: 5, text: "Eb", value: "Eb" },
      { key: 6, text: "E", value: "E" },
      { key: 7, text: "F", value: "F" },
      { key: 8, text: "F#", value: "F#" },
      { key: 9, text: "Gb", value: "Gb" },
      { key: 10, text: "G", value: "G" },
      { key: 11, text: "G#", value: "G#" },
      { key: 12, text: "Ab", value: "Ab" },
      { key: 13, text: "A", value: "A" },
      { key: 14, text: "A#", value: "A#" },
      { key: 15, text: "Bb", value: "Bb" },
      { key: 16, text: "B", value: "B" }
    ];

    if (state.chordOff) return null;

    return (
      <>
        <b>Key: </b>
        <Dropdown
          selection
          compact
          scrolling
          onChange={(ev, obj) =>
            dispatch({ type: "selectKey", payload: obj.value })
          }
          value={getKeyForSelectControl(state.songKey)}
          options={selectionKeys}
        />
      </>
    );
  };

  const KeyIncrementChoice = () => {
    const [state, dispatch] = useContext(SongContext);

    if (state.chordOff) return null;

    return (
      <>
        <b> </b>
        <Button
          basic
          size="tiny"
          icon="plus"
          onClick={() =>
            dispatch({ type: "selectKey", payload: handleUpKey(state.songKey) })
          }
        />
        <Button
          basic
          size="tiny"
          icon="minus"
          onClick={() =>
            dispatch({
              type: "selectKey",
              payload: handleDownKey(state.songKey)
            })
          }
        />
      </>
    );
  };

  const ChordOffOption = () => {
    const [state, dispatch] = useContext(SongContext);

    return (
      <List.Content verticalAlign="middle">
        <Checkbox
          label="Hide chords"
          name="chordOffOpt"
          toggle
          onClick={() =>
            dispatch({ type: "chordOff", payload: !state.chordOff })
          }
          defaultChecked={state.chordOff}
        />
      </List.Content>
    );
  };

  return (
    <SongProvider>
      <Sidebar.Pushable style={{ minWidth: minWidth }}>
        <div className="App">
          <SidebarMain />

          <Sidebar.Pusher dimmed={visible}>
            <Button icon onClick={handleSidebarVisible}>
              <Icon name="sidebar" />
            </Button>

            <span> </span>

            <List horizontal size="medium">
              {width > altmenuWidth && <SetChoiceItem />}
              <SongChoiceItem />
              <List.Item>
                <List.Content>
                  <SongKeySelect />
                  {width > altmenuWidth && <KeyIncrementChoice />}
                </List.Content>
              </List.Item>
              <List.Item>
                <List.Content>
                  {width > minWidth && <ChordOffOption />}
                </List.Content>
              </List.Item>
            </List>
            <Divider />

            <SongContext.Consumer>
              {([state]) => (
                <SongDisplay
                  keyVal={state.songKey}
                  song={state.songName}
                  chordOff={state.chordOff}
                />
              )}
            </SongContext.Consumer>
          </Sidebar.Pusher>
        </div>
      </Sidebar.Pushable>
    </SongProvider>
  );
}

export default App;
