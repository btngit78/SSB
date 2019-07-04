import React, { useContext, useReducer, useState } from "react";
import ApolloClient from "apollo-boost";
import {
  ApolloProvider,
  useQuery
  // useMutation
} from "@apollo/react-hooks";
import gql from "graphql-tag";
import { Dimmer, Loader, Message } from "semantic-ui-react";
import { findKey } from "./mockup";

const client = new ApolloClient({
  uri: "http://localhost:1337/graphql"
});

const GET_SONGS_SORT = gql`
  query GetSongSort {
    songs(sort: "language") {
      id
      title
      authors
      language
    }
  }
`;

const GET_SONG_CONTENT_BY_ID = gql`
  query GetSongContentByID($id: String!) {
    song(id: $id) {
      title
      authors
      content
    }
  }
`;

export const SongContext = React.createContext();

export function songStoreReducer(state, action) {
  switch (action.type) {
    case "selectSet":
      const firstSong = state.store.songSets.get(action.payload)[0].title;
      return {
        ...state,
        setName: action.payload,
        songName: firstSong,
        songKey: findKey(firstSong)
      };
    case "selectSong":
      return {
        ...state,
        songName: action.payload,
        songKey: findKey(action.payload)
      };
    case "selectKey":
      return {
        ...state,
        songKey: action.payload
      };
    case "chordOff":
      return {
        ...state,
        chordOff: action.payload
      };
    default:
      return state;
  }
}

// song in-mem DB, built at init time.
// Theoritically shoud be in context state too but separate into this object
// to avoid the cost of copying the whole song DB due to 'reducer/dispatch' coupling.
// Therefore, only the reference to songStore is duplicated normally.
// When we eventually do add/delete set/song, another reducer & context is needed or
// we can use useState to handle this separately from mere set/song selection changes.
const songStore = {
  songSets: new Map(),
  setChoiceOptions: [],
  songChoiceOptions: []
};

const initialState = {
  setName: "",
  songName: "",
  songKey: "C",
  chordOff: false,
  store: songStore
};

function SongStoreInit(props) {
  const { data, loading, error } = useQuery(GET_SONGS_SORT);
  const [state] = useContext(SongContext);

  const songSets = state.store.songSets;

  function installSong(song) {
    let songList;

    if (!songSets.has(song.language)) {
      // create new set for language
      songSets.set(song.language, []);
    }
    // add song to pre-existing language set
    songList = songSets.get(song.language);
    songList.push({
      title: song.title,
      authors: song.authors,
      songkey: null,
      id: song.id
    });
  }

  if (loading)
    return (
      <div>
        <Dimmer active inverted>
          <Loader size="huge" inverted>
            Loading ...
          </Loader>
        </Dimmer>
      </div>
    );

  if (error) {
    props.errorCallback(true);
    return (
      <div>
        <Message size="huge">
          <Message.Header>Error in loading data.</Message.Header>
          <p>{error.message}</p>
        </Message>
      </div>
    );
  }

  // build song tables grouped by language
  data.songs.map(song => installSong(song));
  // sorted the 'language' song sets
  songSets.forEach((value, key, map) =>
    map.set(key, value.sort((a, b) => a.title.localeCompare(b.title)))
  );

  // initalize the default song to display first
  state.setName = Array.from(songSets.keys())[0];
  const list = songSets.get(state.setName);
  state.songName = list[0].title;
  state.songKey = findKey(state.songName);

  // TODO: queyry to fetch the default song; modify the above if we gonna extract the defaul song's name from local storage

  // build set select list (text/value) for display
  songSets.forEach((value, key, map) =>
    state.store.setChoiceOptions.push({ text: key.concat("   "), value: key })
  );

  // build song select list (text/value) for display
  songSets.forEach((value, key, map) => {
    state.store.songChoiceOptions[key] = [];
    value.forEach((cur, index) =>
      state.store.songChoiceOptions[key].push({
        text: cur.title,
        value: cur.title
      })
    );
  });

  props.readyCallback(true);
  return null;
}

/* ========================================================================= */
// for testing state tracking (copying/changes)
let testCount = 0;
let storeRef;

function Test(props) {
  const [state] = useContext(SongContext);

  if (testCount === 0) {
    storeRef = state.store;
  } else {
    console.log("Same store: ", storeRef === state.store);
    if (storeRef !== state.store) storeRef = state.store;
  }
  console.log(`Test rendering ${testCount++} :`, state);

  return null;
}
/* ========================================================================= */

export function SongProvider(props) {
  const [state, dispatch] = useReducer(songStoreReducer, initialState);
  const [loadingError, setLoadingError] = useState(false);
  const [storeReady, setStoreReady] = useState(false);

  return (
    <SongContext.Provider value={[state, dispatch]}>
      <ApolloProvider client={client}>
        {!storeReady && (
          <SongStoreInit
            errorCallback={setLoadingError}
            readyCallback={setStoreReady}
          />
        )}
      </ApolloProvider>
      {!loadingError && storeReady && props.children}
      <Test />
    </SongContext.Provider>
  );
}
