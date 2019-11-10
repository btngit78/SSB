import React, { useContext, useState } from "react";
import { Table, Icon, Button, Dropdown } from "semantic-ui-react";

import { SongContext } from "./store";

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
