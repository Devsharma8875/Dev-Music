import "./App.css";
import { useState, useEffect, useRef, createContext } from "react";
import axios from "axios";

// Create Context
const MusicContext = createContext();
const Google_API_key = "AIzaSyAWLThp1erO5-sRBtT84RcWsy8_0EqQBM4";

function App() {
  // State Management
  const [keyword, setKeyword] = useState("");
  const [message, setMessage] = useState("");
  const [tracks, setTracks] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [prevPageToken, setPrevPageToken] = useState(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(50);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [likedMusic, setLikedMusic] = useState([]);
  const [pinnedMusic, setPinnedMusic] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showLiked, setShowLiked] = useState(false);
  const [showPinned, setShowPinned] = useState(false);

  const audioRef = useRef(null);
  const progressInterval = useRef(null);

  // Player Event Handlers
  const onPlayerReady = (event) => {
    event.target.setVolume(volume);
  };

  const onPlayerStateChange = (event) => {
    switch (event.data) {
      case window.YT.PlayerState.PLAYING:
        setIsPlaying(true);
        setDuration(audioRef.current.getDuration());
        startProgressTracker();
        break;
      case window.YT.PlayerState.PAUSED:
        setIsPlaying(false);
        stopProgressTracker();
        break;
      case window.YT.PlayerState.ENDED:
        handleTrackEnd();
        break;
    }
  };

  // Playback Controls
  const startProgressTracker = () => {
    progressInterval.current = setInterval(() => {
      if (audioRef.current?.getCurrentTime) {
        const current = audioRef.current.getCurrentTime();
        const dur = audioRef.current.getDuration();
        setCurrentTime(current);
        setDuration(dur);
        setProgress((current / dur) * 100);
      }
    }, 1000);
  };

  const stopProgressTracker = () => {
    if (progressInterval.current) clearInterval(progressInterval.current);
  };

  const handleTrackEnd = () => {
    if (currentTrackIndex !== null && currentTrackIndex < tracks.length - 1) {
      playTrack(currentTrackIndex + 1);
    } else {
      setIsPlaying(false);
      setCurrentTrackIndex(null);
    }
  };

  const playTrack = (index) => {
    if (index >= 0 && index < tracks.length) {
      setCurrentTrackIndex(index);
      audioRef.current.loadVideoById(tracks[index].id);
      audioRef.current.playVideo();
    }
  };

  const togglePlayPause = () => {
    if (currentTrackIndex === null && tracks.length > 0) {
      playTrack(0);
      return;
    }
    isPlaying ? audioRef.current.pauseVideo() : audioRef.current.playVideo();
  };

  const skipForward = () => {
    if (currentTrackIndex !== null && currentTrackIndex < tracks.length - 1) {
      playTrack(currentTrackIndex + 1);
    }
  };

  const skipBackward = () => {
    if (currentTrackIndex !== null && currentTrackIndex > 0) {
      playTrack(currentTrackIndex - 1);
    }
  };

  const seekTo = (percentage) => {
    if (audioRef.current?.seekTo) {
      const dur = audioRef.current.getDuration();
      audioRef.current.seekTo(dur * (percentage / 100));
    }
  };

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    if (audioRef.current?.setVolume) {
      audioRef.current.setVolume(newVolume);
    }
  };

  // Like/Pin Functionality
  const toggleLike = (track) => {
    const updated = likedMusic.some((t) => t.id === track.id)
      ? likedMusic.filter((t) => t.id !== track.id)
      : [...likedMusic, track];
    setLikedMusic(updated);
    localStorage.setItem("likedMusic", JSON.stringify(updated));
  };

  const togglePin = (track) => {
    const updated = pinnedMusic.some((t) => t.id === track.id)
      ? pinnedMusic.filter((t) => t.id !== track.id)
      : [...pinnedMusic, track];
    setPinnedMusic(updated);
    localStorage.setItem("pinnedMusic", JSON.stringify(updated));
  };

  // Format Time
  const formatTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Initialize YouTube Player and load trending music
  useEffect(() => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      audioRef.current = new window.YT.Player("youtube-player", {
        height: "0",
        width: "0",
        playerVars: {
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
        },
      });
    };

    // Initialize from localStorage
    const initializePlaylists = () => {
      if (!localStorage.getItem("likedMusic")) {
        localStorage.setItem("likedMusic", JSON.stringify([]));
      }
      if (!localStorage.getItem("pinnedMusic")) {
        localStorage.setItem("pinnedMusic", JSON.stringify([]));
      }
      setLikedMusic(JSON.parse(localStorage.getItem("likedMusic")));
      setPinnedMusic(JSON.parse(localStorage.getItem("pinnedMusic")));
    };

    initializePlaylists();
    fetchTrendingMusic();

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  // Fetch Trending Music
  const fetchTrendingMusic = async () => {
    setIsLoading(true);
    setMessage("");
    setKeyword("");
    setShowLiked(false);
    setShowPinned(false);
    setTracks([]);

    try {
      const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&videoCategoryId=10&maxResults=10&key=${Google_API_key}`
      );

      const videoData = response.data.items.map((item) => ({
        id: item.id,
        title: item.snippet.title,
        thumbnail:
          item.snippet.thumbnails.medium?.url ||
          item.snippet.thumbnails.default.url,
        channel: item.snippet.channelTitle,
      }));

      setTracks(videoData);
    } catch (error) {
      setMessage(
        error.response?.data?.error?.message || "Failed to load trending music"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Search Function
  const fetchMusicData = async (pageToken = "") => {
    if (!keyword.trim()) {
      fetchTrendingMusic();
      return;
    }

    setMessage("");
    setTracks([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setIsLoading(true);

    try {
      const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
          keyword
        )}&type=video&videoCategoryId=10&maxResults=10&key=${Google_API_key}&pageToken=${pageToken}`
      );

      const videoData = response.data.items.map((item) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail:
          item.snippet.thumbnails.medium?.url ||
          item.snippet.thumbnails.default.url,
        channel: item.snippet.channelTitle,
      }));

      setTracks(videoData);
      setNextPageToken(response.data.nextPageToken || null);
      setPrevPageToken(response.data.prevPageToken || null);
    } catch (error) {
      setMessage(error.response?.data?.error?.message || "Search failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MusicContext.Provider
      value={{
        isLoading,
        setIsLoading,
        likedMusic,
        setLikedMusic,
        pinnedMusic,
        setPinnedMusic,
      }}
    >
      <div id="youtube-player"></div>

      {/* Navbar Component */}
      <nav className="navbar navbar-dark navbar-expand-lg bg-dark sticky-top">
        <div className="container-fluid">
          <a className="navbar-brand" href="#" onClick={fetchTrendingMusic}>
            <i className="bi bi-music-note-list mx-3"></i> Dev-Music Player
          </a>

         {!showLiked && !showPinned && (
  <div className="d-flex">
    <input
      value={keyword}
      onChange={(e) => setKeyword(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && fetchMusicData()}
      className="form-control me-2"
      placeholder="Search songs..."
    />
    <button
      onClick={fetchMusicData}
      className="btn btn-outline-success"
    >
      Search
    </button>
  </div>
)}

          <div>
            <button
              className={`btn btn-${
                showLiked ? "success" : "secondary"
              } btn-sm mx-1`}
              onClick={() => {
                setShowLiked(!showLiked);
                setShowPinned(false);
                if (!showLiked) {
                  setTracks(likedMusic);
                } else {
                  fetchTrendingMusic();
                }
              }}
            >
              <i className="bi bi-heart-fill"></i> {likedMusic.length}
            </button>
            <button
              className={`btn btn-${
                showPinned ? "warning" : "secondary"
              } btn-sm mx-1`}
              onClick={() => {
                setShowPinned(!showPinned);
                setShowLiked(false);
                if (!showPinned) {
                  setTracks(pinnedMusic);
                } else {
                  fetchTrendingMusic();
                }
              }}
            >
              <i className="bi bi-pin-angle-fill"></i> {pinnedMusic.length}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mt-4" style={{ paddingBottom: "100px" }}>
        {isLoading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-success" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading music...</p>
          </div>
        ) : (
          <>
            {message && <div className="alert alert-danger">{message}</div>}

            {showLiked ? (
              <div className="mb-4">
                <h3 className="text-danger">
                  <i className="bi bi-heart-fill me-2"></i> Liked Songs
                </h3>
                <button
                  className="btn btn-outline-secondary mb-3"
                  onClick={fetchTrendingMusic}
                >
                  <i className="bi bi-arrow-left me-2"></i> Back to Trending
                </button>
              </div>
            ) : showPinned ? (
              <div className="mb-4">
                <h3 className="text-warning">
                  <i className="bi bi-pin-angle-fill me-2"></i> Pinned Songs
                </h3>
                <button
                  className="btn btn-outline-secondary mb-3"
                  onClick={fetchTrendingMusic}
                >
                  <i className="bi bi-arrow-left me-2"></i> Back to Trending
                </button>
              </div>
            ) : (
              !keyword &&
              tracks.length > 0 && (
                <div className="mb-4">
                  <h3>
                    <i className="bi bi-fire me-2"></i> Trending Now
                  </h3>
                </div>
              )
            )}

            <div className="row row-cols-1 row-cols-md-3 g-4">
              {tracks.map((track, index) => (
                <div key={track.id} className="col">
                  <div
                    className={`card h-100 ${
                      currentTrackIndex === index ? "border-success" : ""
                    }`}
                    onClick={() => playTrack(index)}
                  >
                    <img
                      src={track.thumbnail}
                      className="card-img-top"
                      alt={track.title}
                    />
                    <div className="card-body">
                      <h5 className="card-title">{track.title}</h5>
                      <p className="card-text text-muted">{track.channel}</p>
                      <div className="d-flex flex-wrap justify-content-between gap-2">
                        <button
                          className={`btn btn-outline-${
                            likedMusic.some((t) => t.id === track.id)
                              ? "danger"
                              : "secondary"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(track);
                          }}
                        >
                          <i
                            className={`bi bi-heart${
                              likedMusic.some((t) => t.id === track.id)
                                ? "-fill"
                                : ""
                            }`}
                          ></i>
                        </button>
                        <button
                          className={`btn btn-outline-${
                            pinnedMusic.some((t) => t.id === track.id)
                              ? "warning"
                              : "secondary"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePin(track);
                          }}
                        >
                          <i
                            className={`bi bi-pin${
                              pinnedMusic.some((t) => t.id === track.id)
                                ? "-fill"
                                : ""
                            }`}
                          ></i>
                        </button>
                        <button
                          className="btn btn-outline-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            playTrack(index);
                          }}
                        >
                          <i className="bi bi-play-fill"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!showLiked && !showPinned && (nextPageToken || prevPageToken) && (
              <div className="row mt-4">
                <div className="col-6">
                  <button
                    onClick={() => fetchMusicData(prevPageToken)}
                    className="btn btn-outline-success w-100"
                    disabled={!prevPageToken}
                  >
                    <i className="bi bi-arrow-left me-2"></i> Previous
                  </button>
                </div>
                <div className="col-6">
                  <button
                    onClick={() => fetchMusicData(nextPageToken)}
                    className="btn btn-outline-success w-100"
                    disabled={!nextPageToken}
                  >
                    Next <i className="bi bi-arrow-right ms-2"></i>
                  </button>
                </div>
              </div>
            )}

            {showLiked && likedMusic.length === 0 && (
              <div className="text-center py-5">
                <h4>No liked songs yet!</h4>
                <p>Like some songs to see them here</p>
                <button
                  className="btn btn-primary"
                  onClick={fetchTrendingMusic}
                >
                  <i className="bi bi-arrow-left me-2"></i> Back to Trending
                </button>
              </div>
            )}

            {showPinned && pinnedMusic.length === 0 && (
              <div className="text-center py-5">
                <h4>No pinned songs yet!</h4>
                <p>Pin some songs to see them here</p>
                <button
                  className="btn btn-primary"
                  onClick={fetchTrendingMusic}
                >
                  <i className="bi bi-arrow-left me-2"></i> Back to Trending
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Player Controls */}
      {tracks.length > 0 && (
        <div className="player-controls fixed-bottom bg-dark text-white p-3">
          <div className="container">
            <div className="row align-items-center">
              <div className="col-md-4 d-flex align-items-center">
                {currentTrackIndex !== null && (
                  <>
                    <img
                      src={tracks[currentTrackIndex].thumbnail}
                      className="img-thumbnail me-3"
                      style={{ width: "60px", height: "60px" }}
                    />
                    <div>
                      <h6 className="mb-0">
                        {tracks[currentTrackIndex].title}
                      </h6>
                      <small className="text-muted">
                        {tracks[currentTrackIndex].channel}
                      </small>
                    </div>
                  </>
                )}
              </div>

              <div className="col-md-4 text-center">
                <div className="d-flex justify-content-center align-items-center mb-2">
                  <button
                    className="btn btn-link text-white"
                    onClick={skipBackward}
                  >
                    <i className="bi bi-skip-backward-fill fs-4"></i>
                  </button>
                  <button
                    className="btn btn-link text-white mx-3"
                    onClick={togglePlayPause}
                  >
                    <i
                      className={`bi ${
                        isPlaying ? "bi-pause-fill" : "bi-play-fill"
                      } fs-2`}
                    ></i>
                  </button>
                  <button
                    className="btn btn-link text-white"
                    onClick={skipForward}
                  >
                    <i className="bi bi-skip-forward-fill fs-4"></i>
                  </button>
                </div>
                <div className="d-flex justify-content-between small">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <div
                  className="progress bg-secondary mt-1"
                  style={{ height: "5px", cursor: "pointer" }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    seekTo(((e.clientX - rect.left) / rect.width) * 100);
                  }}
                >
                  <div
                    className="progress-bar bg-success"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              <div className="col-md-4 d-flex align-items-center justify-content-end">
                <i className="bi bi-volume-down me-2"></i>
                <div
                  className="progress bg-secondary me-2"
                  style={{ height: "5px", width: "100px", cursor: "pointer" }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    handleVolumeChange(
                      ((e.clientX - rect.left) / rect.width) * 100
                    );
                  }}
                >
                  <div
                    className="progress-bar bg-white"
                    style={{ width: `${volume}%` }}
                  ></div>
                </div>
                <i className="bi bi-volume-up"></i>
              </div>
            </div>
          </div>
        </div>
      )}
    </MusicContext.Provider>
  );
}

export default App;
