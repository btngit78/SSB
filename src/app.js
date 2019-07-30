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
  let l;

  if (actualKey === "") return "C"; // default
  l = actualKey.length;
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
  const altmenuWidth = 800;
  const width = useWindowWidth();
  const [visible, setVisible] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  console.log("--- App");
  setStyle();

  function handleSidebarVisible(e, obj) {
    setVisible(true);
  }

  function handleSidebarHide(e, obj) {
    setVisible(false);
  }

  function handleUpKey(currentKey) {
    let minor = currentKey.endsWith("m");
    if (minor) currentKey = currentKey.split("m")[0];

    if (currentKey.length === 1) {
      //  no sharp or flat
      currentKey =
        currentKey === "E" ? "F" : currentKey === "B" ? "C" : currentKey + "#";
    } else {
      // sharp and flat
      currentKey =
        currentKey.charAt(1) === "b"
          ? currentKey.charAt(0)
          : currentKey.charAt(0) === "G"
          ? "A"
          : String.fromCharCode(currentKey.charCodeAt(0) + 1);
    }
    return currentKey + (minor ? "m" : "");
  }

  function handleDownKey(currentKey) {
    let minor = currentKey.endsWith("m");
    if (minor) currentKey = currentKey.split("m")[0];

    if (currentKey.length === 1) {
      //  no sharp or flat
      currentKey =
        currentKey === "C" ? "B" : currentKey === "F" ? "E" : currentKey + "b";
    } else {
      // sharp and flat
      currentKey =
        currentKey.charAt(1) === "#"
          ? currentKey.charAt(0)
          : currentKey.charAt(0) === "A"
          ? "G"
          : String.fromCharCode(currentKey.charCodeAt(0) - 1);
    }
    return currentKey + (minor ? "m" : "");
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

  // - return null component if there's only one song set or
  // screen width is smaller than an acceptable size and chord selection
  // must be on
  const SetChoiceItem = () => {
    const [state, dispatch] = useContext(SongContext);

    if (state.store.songSets.size < 2) return null;
    if (width < altmenuWidth && !state.chordOff) return null;

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
            style={{ minWidth: "110px" }}
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
            deburr
            selection
            onChange={(ev, obj) => {
              console.log(obj);
              dispatch({ type: "selectSong", payload: obj.value });
            }}
            value={state.songSetIndex}
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
          disabled={state.songKey === ""}
          selection
          compact
          scrolling
          onChange={(ev, obj) =>
            dispatch({ type: "selectKey", payload: obj.value })
          }
          value={getKeyForSelectControl(state.songToKey)}
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
          disabled={state.songKey === ""}
          basic
          size="tiny"
          icon="plus"
          onClick={() =>
            dispatch({
              type: "selectKey",
              payload: handleUpKey(state.songToKey)
            })
          }
        />
        <Button
          disabled={state.songKey === ""}
          basic
          size="tiny"
          icon="minus"
          onClick={() =>
            dispatch({
              type: "selectKey",
              payload: handleDownKey(state.songToKey)
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
              <SetChoiceItem />
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
              {([state]) => <SongDisplay state={state} />}
            </SongContext.Consumer>
          </Sidebar.Pusher>
        </div>
      </Sidebar.Pushable>
    </SongProvider>
  );
}

export default App;
