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
  timeInit: null,
  songSets: new Map(),
  setChoiceOptions: [],
  songChoiceOptions: {},
  authorsOptions: new Map(),
  lastAuthorsSelected: null
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
  songLanguage: "",
  songTempo: 0,
  songContent: "",
  noChords: true,
  chordOff: false,
  store: songStore
};

let CMSHOST = process.env.CMSHOST || "";
// the above should've work in heroku env (but doesn't - ?)
// temporary hard coded value for cms host in 'production' for now
CMSHOST = "enigmatic-refuge-55577.herokuapp.com";

const client = new ApolloClient({
  uri: CMSHOST ? `https://${CMSHOST}/graphql` : "http://localhost:1337/graphql"
});

// no pagination or caching scheme to hangle larger DB (yet!)
// this should be plenty for majority of cases
const songsInMemLimit = 2000;

const GET_SONGS_ALL = gql`
  query GetSongAll($limit: Int!) {
    songs(limit: $limit) {
      id
      title
      authors
      key
      keywords
      language
      tempo
      createdAt
      updatedAt
    }
  }
`;

export const GET_SONG_CONTENT_BY_ID = gql`
  query GetSongContentByID($id: ID!) {
    song(id: $id) {
      id
      title
      authors
      key
      keywords
      language
      tempo
      createdAt
      updatedAt
      content
    }
  }
`;

export const GET_MOSTRECENTLY_ADDED = gql`
  query GetMostrecentlyAdded {
    songs(sort: "createdAt:desc", limit: 50) {
      id
      title
      authors
      key
      keywords
      language
      tempo
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_SONG = gql`
  mutation UpdateSong(
    $id: ID!
    $authors: String
    $key: String
    $keywords: String
    $tempo: Int
    $content: String!
  ) {
    updateSong(
      input: {
        where: { id: $id }
        data: {
          authors: $authors
          key: $key
          keywords: $keywords
          tempo: $tempo
          content: $content
        }
      }
    ) {
      song {
        id
        title
        authors
        key
        keywords
        language
        tempo
        createdAt
        updatedAt
      }
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
      songTempo: songList[index].tempo,
      songId: songList[index].id,
      songLanguage: songList[index].language,
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
    case "selectSongByTitle":
      const language = action.payload.language;
      const title = action.payload.title;
      songList = store.songSets.get(language);
      if (songList) {
        const sel = store.songChoiceOptions[language].filter(
          e => e.text === title
        );
        if (sel.length) {
          return {
            ...state,
            setName: language,
            ...songValues(songList, sel[0] ? parseInt(sel[0].value, 10) : 0)
          };
        }
      }
      // no change since either language's set or song title is not found
      return state;
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

// update the store's directory of a song entry with data object which should contain all
// relevant fields except the song content itself
export function updateEntryInStore(store, song) {
  if (!song || !song.language || !song.title) {
    console.log(song);
    return;
  }

  const songList = store.songSets.get(song.language);
  if (songList) {
    const index = songList.findIndex(el => el.title === song.title);
    if (song.authors) songList[index].authors = song.authors;

    if (song.key) songList[index].key = song.key;
    if (song.keywords) songList[index].keywords = song.keywords;
    if (song.language) songList[index].language = song.language;
    if (song.tempo) songList[index].tempo = song.tempo;
    if (song.createdAt) songList[index].createdAt = song.createdAt;
    if (song.updatedAt) songList[index].updatedAt = song.updatedAt;
  }
}

// update safe editable fields only, not ID or title.
// it's 'in sync' with the overall state because the editor's state is within the app's song-selecting state
// and thus is safe to do.  if trying to do an update of state via the reducer 'dispatch' call, it will interfere
// with other editor's state changes, etc.
export function updateStateInSync(state, song) {
  state.authors = song.authors;
  state.songKey = song.key;
  state.songKeywordss = song.keywords;
  state.songTempo = song.tempo;
  state.songToKey = song.key !== "" ? song.key : "";
  // state.songContent = song.content;
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
    tempo:
      !song.tempo || song.tempo === "" || song.tempo === "0"
        ? 0
        : parseInt(song.tempo, 10),
    id: song.id,
    language: song.language,
    createdAt: song.createdAt,
    updatedAt: song.updatedAt
  });
}

// Initialize the store by doing query the entire DB's song titles.
// This is feasible for DB with just a few thousand entries but perhaps
// will need to move to a cache+LRUs later.
// -- Return a "loading" component while loading, "error" if running into one,
// or "null" componext (for display) but not before initialize the store.
function SongStoreInit(props) {
  const { data, loading, error } = useQuery(GET_SONGS_ALL, {
    variables: { limit: songsInMemLimit }
  });
  const [state] = useContext(SongContext);
  const songSets = state.store.songSets;

  function addAuthor(author, language) {
    // add the first name in the list of authors into the set
    if (author.length) {
      let names = author.split(/[,|&|(]/);
      if (names.length) {
        // drop author that is likely a comment (or unclear authorship)
        if (names[0].charAt(0) !== "(" && names[0].charAt(0) !== "#") {
          let newval = names[0].trim();
          for (var i = 0; i < newval.length; i++) {
            if (newval.charAt(i) === " ") {
              // uppercase the initial char to make sure names will be catalogued properly
              if (newval.charCodeAt(i + 1) > "Z".charCodeAt(0)) {
                let s = newval
                  .charAt(i + 1)
                  .toUpperCase()
                  .concat(newval.substring(i + 2));
                newval = newval.substring(0, i + 1).concat(s);
              }
            }
          }
          if (!state.store.authorsOptions.has(newval)) {
            state.store.authorsOptions.set(newval, language);
          }
        }
      }
    }
  }

  console.log("--- SongStoreInit");

  // TODO: queyry to fetch all 'saved' values from local-storage
  // and set initial default set/song/etc. to saved values.

  if (loading)
    return (
      <div>
        <Dimmer active inverted>
          <Loader size="big" inverted>
            Loading ...
          </Loader>
        </Dimmer>
      </div>
    );

  if (error) {
    props.errorCallback(true);
    return (
      <div>
        <Message size="big">
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
        <Message size="big">
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
  state.store.timeInit = Date.now();

  // build song tables grouped by language
  data.songs.map(song => installSong(songSets, song));
  // sort each list in-mem due to apparent bug in Strapi which may have to do with
  // mixed character set. By using localeCompare we get accurate sort results
  songSets.forEach((value, key, map) => {
    songSets.set(key, value.sort((a, b) => a.title.localeCompare(b.title)));
  });

  // build set select list (text/value) for display
  const tmp = [...songSets.keys()].sort();
  tmp.forEach(val =>
    state.store.setChoiceOptions.push({ text: val, value: val })
  );

  // build song select list (text/value) for display,
  // also add author name into set for selection later
  songSets.forEach((value, key, map) => {
    console.log(
      "Set [" + key + "] has " + songSets.get(key).length + " entries."
    );
    state.store.songChoiceOptions[key] = [];
    value.forEach((cur, index) => {
      state.store.songChoiceOptions[key].push({
        text: cur.title,
        value: index
      });
      addAuthor(cur.authors, key);
    });
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
    return initDefault;
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
        {!loadingError && storeReady && initDefaultSetSong() && props.children}
      </ApolloProvider>
    </SongContext.Provider>
  );
}
