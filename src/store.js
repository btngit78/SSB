import React, { useContext, useReducer, useState } from "react";
import ApolloClient from "apollo-boost";
import {
  ApolloProvider,
  useQuery
  // useMutation
} from "@apollo/react-hooks";
import gql from "graphql-tag";
import { Dimmer, Loader, Message } from "semantic-ui-react";

// song in-mem DB, built at init time.
// Theoritically shoud be in context state too but separate into this object
// to avoid the cost of copying the whole song DB due to 'reducer' method of updating
// state separately through 'dispatch'.
// Therefore, only the reference to songStore is duplicated normally.
// When we eventually do add/delete set/song, another reducer & context is needed or
// we can use useState to handle this separately from mere set/song selection changes.
const songStore = {
  songSets: new Map(),
  setChoiceOptions: [],
  songChoiceOptions: {}
};

// initial state values
const initialState = {
  setName: "",
  songSetIndex: 0,
  songName: "",
  authors: "",
  songKey: "C",
  songToKey: "C",
  songKeywords: "",
  songId: "",
  songContent: "",
  noChords: true,
  chordOff: false,
  store: songStore
};

let CMSHOST = process.env.CMSHOST || "";
// the above should've work in heroku env (but doesn't - ?)
// temporary hard coded value for cms host in 'production' for now
CMSHOST =
  CMSHOST ||
  (process.env.NODE_ENV === "production"
    ? "enigmatic-refuge-55577.herokuapp.com"
    : "");

const client = new ApolloClient({
  uri: CMSHOST ? `https://${CMSHOST}/graphql` : "http://localhost:1337/graphql"
});

// no pagination or caching scheme to hangle larger DB (yet!)
// this should be plenty for majority of cases
const songsInMemLimit = 2000;

const GET_SONGS_SORT = gql`
  query GetSongSort($limit: Int!) {
    songs(sort: "title", limit: $limit) {
      id
      title
      authors
      key
      keywords
      language
      tempo
    }
  }
`;

export const GET_SONG_CONTENT_BY_ID = gql`
  query GetSongContentByID($id: ID!) {
    song(id: $id) {
      title
      authors
      content
      key
      keywords
    }
  }
`;

export const SongContext = React.createContext();

// this is the 'reducer' function that got dispatched
// to update the state
export function songStoreReducer(state, action) {
  const store = state.store;
  let songList;

  // update state display values by reading from in-mem Map DB
  const songValues = (songList, index) => {
    return {
      songSetIndex: index,
      songName: songList[index].title,
      authors: songList[index].authors,
      songKey: songList[index].key,
      songKeywords: songList[index].keywords,
      songId: songList[index].id,
      songToKey: songList[index].key,
      noChords: songList[index].key === "" ? true : false
    };
  };

  switch (action.type) {
    case "selectSet":
      // select set name and set song default to the first in list
      songList = store.songSets.get(action.payload);
      return {
        ...state,
        setName: action.payload,
        ...songValues(songList, 0)
      };
    case "selectSong":
      // update state with song's values
      const index = action.payload;
      songList = store.songSets.get(state.setName);
      return {
        ...state,
        ...songValues(songList, index)
      };
    case "selectKey":
      return {
        ...state,
        songToKey: action.payload
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

function installSong(songSets, song) {
  let songList;

  if (!songSets.has(song.language)) {
    // create new set for language
    songSets.set(song.language, []);
  }
  // add song to pre-existing language set
  songList = songSets.get(song.language);
  songList.push({
    title: song.title,
    authors: song.authors !== null ? song.authors : "",
    key: song.key !== null ? song.key : "",
    keywords: song.keywords !== null ? song.keywords : "",
    tempo: song.tempo > 0 ? song.tempo : "",
    id: song.id
  });
}

// Initialize the store by doing query the entire DB's song titles.
// This is feasible for DB with just a few thousand entries but perhaps
// will need to move to a cache+LRUs later.
// -- Return a "loading" component while loading, "error" if running into one,
// or "null" componext (for display) but not before initialize the store.
function SongStoreInit(props) {
  const { data, loading, error } = useQuery(GET_SONGS_SORT, {
    variables: { limit: songsInMemLimit }
  });
  const [state] = useContext(SongContext);
  const songSets = state.store.songSets;

  console.log("--- SongStoreInit");

  // TODO: queyry to fetch all 'saved' values from local-storage
  // and set initial default set/song/etc. to saved values.

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

  if (!data.songs.length) {
    props.errorCallback(true);
    return (
      <div>
        <Message size="huge">
          <Message.Header>
            Database is empty.
            <br />
            There is no song in the database.
          </Message.Header>
        </Message>
      </div>
    );
  }

  console.log("Total song entries fetched: " + data.songs.length);

  // build song tables grouped by language
  data.songs.map(song => installSong(songSets, song));

  // build set select list (text/value) for display
  const tmp = [...songSets.keys()].sort();
  tmp.forEach(val =>
    state.store.setChoiceOptions.push({ text: val, value: val })
  );

  // build song select list (text/value) for display
  songSets.forEach((value, key, map) => {
    console.log(
      "Set [" + key + "] has " + songSets.get(key).length + " entries."
    );
    state.store.songChoiceOptions[key] = [];
    value.forEach((cur, index) =>
      state.store.songChoiceOptions[key].push({
        text: cur.title,
        value: index
      })
    );
  });

  props.readyCallback(true);
  return null;
}

/* ========================================================================= */
// for testing state tracking (copying/changes)
// let testCount = 0;
// let stateRef;
// let storeRef;

// function Test(props) {
//   const [state] = useContext(SongContext);

//   if (testCount === 0) {
//     stateRef = state;
//     storeRef = state.store;
//   } else {
//     console.log(
//       "Same state: ",
//       stateRef === state,
//       "   ",
//       "Same store: ",
//       storeRef === state.store
//     );
//     if (stateRef !== state) stateRef = state;
//     if (storeRef !== state.store) storeRef = state.store;
//   }
//   console.log(`Test rendering ${testCount++} :`, state);

//   return null;
// }

/* ========================================================================= */

// Component to provide song context/store for the React UI
export function SongProvider(props) {
  const [state, dispatch] = useReducer(songStoreReducer, initialState);
  const [loadingError, setLoadingError] = useState(false);
  const [storeReady, setStoreReady] = useState(false);
  const [initDefault, setInitDefault] = useState(false);
  const songSets = state.store.songSets;

  console.log("--- Song Provider");

  const initDefaultSetSong = () => {
    if (!initDefault) {
      // set the default set to the first item in the alphabetical select list
      dispatch({
        type: "selectSet",
        payload: [...Array.from(songSets.keys()).sort()][0]
      });
      setInitDefault(true);
    }
    return initDefault ? true : false;
  };

  // The <Test /> component can be put at the end of the SongContext.Provider component
  // to track state change if need be.
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
      {!loadingError && storeReady && initDefaultSetSong() && props.children}
    </SongContext.Provider>
  );
}
