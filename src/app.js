// Copyright 2019 by Nghia Nguyen
//
import React, { useState, useEffect } from "react";
import { Sidebar, Divider, Menu, Icon, Dropdown,
  List, Button, Label, Checkbox
  } from "semantic-ui-react";
import SongDisplay from "./song";
import { setStyle } from "./lib/styling";
import { songSets } from "./mockup";
import "./app.css";

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

  const [visible, setVisible] = useState(false);
  const [setChoice, setSetChoice] = useState(0);
  const [songChoice, setSongChoice] = useState(0);
  const [keyChoice, setKeyChoice] = useState(
    getKeyForSelectControl(songSets[0].list[0].songkey)
  );
  const [chordOffOpt, setChordOffOpt] = useState(true);
  const width = useWindowWidth();

  setStyle();
  console.log("Song:", songSets[setChoice].list[songChoice].name, "Key:", keyChoice);

  function handleSidebarVisible(e, obj) {
    setVisible(true);
  }
  function handleSidebarHide(e, obj) {
    setVisible(false);
  }

  function handleSetChoice(e, obj) {
    let i = 0;
    console.log(obj.value);
    if (obj.value !== songSets[setChoice].name) {
      for (i in songSets) {
        if (obj.value === songSets[i].name) {
          break;
        }
      }

      setSetChoice(i);
      setSongChoice(0);
      setKeyChoice(getKeyForSelectControl(songSets[i].list[0].songkey));
    }
  }

  function handleSongChoice(e, obj) {
    let i = 0;
    console.log(obj.value);
    if (obj.value !== songSets[setChoice].list[songChoice].name) {
      for (i in songSets[setChoice].list) {
        if (obj.value === songSets[setChoice].list[i].name) {
          break;
        }
      }
      setSongChoice(i);
      setKeyChoice(getKeyForSelectControl(songSets[setChoice].list[i].songkey));
    }
  }

  function handleKeyChoice(e, obj) {
    console.log(obj.value);
    setKeyChoice(obj.value);
  }

  function handleUpKey() {
    if (keyChoice.length === 1) {
      if (keyChoice === "E") setKeyChoice("F");
      else if (keyChoice === "B") setKeyChoice("C");
      else setKeyChoice(keyChoice + "#");
    } else {
      // sharp and flat
      let next = "";
      if (keyChoice.charAt(1) === "b") next = keyChoice.charAt(0);
      else {
        if (keyChoice.charAt(0) === "G") next = "A";
        else next = String.fromCharCode(keyChoice.charCodeAt(0) + 1);
      }
      setKeyChoice(next);
    }
  }

  function handleDownKey() {
    if (keyChoice.length === 1) {
      if (keyChoice === "F") setKeyChoice("E");
      else if (keyChoice === "C") setKeyChoice("B");
      else setKeyChoice(keyChoice + "b");
    } else {
      // sharp and flat
      let next = "";
      if (keyChoice.charAt(1) === "#") next = keyChoice.charAt(0);
      else {
        if (keyChoice.charAt(0) === "A") next = "G";
        else next = String.fromCharCode(keyChoice.charCodeAt(0) - 1);
      }
      setKeyChoice(next);
    }
  }

  function handleChordOffOpt(e, obj) {
    console.log(obj.checked);
    setChordOffOpt(!chordOffOpt);
  }
  function handleSearch(e, obj) {
    alert("will do search later");
    handleSidebarHide();
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

  return (
    <Sidebar.Pushable>
      <div className="App">
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

        <Sidebar.Pusher dimmed={visible}>
          <Button icon onClick={handleSidebarVisible}>
            <Icon name="sidebar" />
          </Button>
          <span> </span>
          <List horizontal size="medium">
            {width > altmenuWidth && (
            <List.Item>
              <List.Content>
                <Label color="green" size="large">
                  Set:
                </Label>
                <Dropdown
                  selection
                  onChange={handleSetChoice}
                  value={songSets[setChoice].name}
                  options={songSets}
                />
              </List.Content>
            </List.Item>
            )}
            <List.Item>
              <List.Content>
                <Label color="green" size="large">
                  Song:
                </Label>
                <Dropdown
                  search
                  selection
                  onChange={handleSongChoice}
                  value={songSets[setChoice].list[songChoice].name}
                  options={songSets[setChoice].list}
                />
              </List.Content>
            </List.Item>
            <List.Item>
              <List.Content>
                {!chordOffOpt && 
                  <>  
                  <b>Key: </b> 
                  <Dropdown selection compact scrolling onChange={handleKeyChoice} value={keyChoice} options={selectionKeys} />
                  </>
                 }
                 {(!chordOffOpt && (width > altmenuWidth)) && 
                  <>
                  <b> </b> 
                  <Button basic size="tiny" icon="plus" onClick={handleUpKey} /> 
                  <Button basic size="tiny" icon="minus" onClick={handleDownKey} />
                  </>
                }
              </List.Content>
            </List.Item>
            <List.Item>
              {width > minWidth && (
                <List.Content verticalAlign="middle">
                  <span>
                    <b>Chords off: </b>
                  </span>
                  <Checkbox
                    name="chordOffOpt"
                    onClick={handleChordOffOpt}
                    defaultChecked={chordOffOpt}
                    toggle
                  />
                </List.Content>
              )}
            </List.Item>
          </List>
          <Divider />
          <SongDisplay
            keyVal={keyChoice}
            song={songSets[setChoice].list[songChoice].value}
            chordOff={chordOffOpt}
          />
        </Sidebar.Pusher>
      </div>
    </Sidebar.Pushable>
  );
}

export default App;