import { useEffect, useRef, useState } from "react";

/**
 * Reusable audio player with consistent UI.
 * Features: play/pause, seek, time display, loading/error, single-instance playback.
 */
export default function AudioPlayer({ src }) {
  const audioRef = useRef(null);
  const progressRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errored, setErrored] = useState(false);

  // Pause any other audio elements when this starts
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    const handlePlay = () => {
      document.querySelectorAll("audio").forEach((el) => {
        if (el !== audioEl) el.pause();
      });
    };
    audioEl.addEventListener("play", handlePlay);
    return () => audioEl.removeEventListener("play", handlePlay);
  }, []);

  const fmt = (t) => {
    if (!Number.isFinite(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  const togglePlay = async () => {
    if (!src || errored) return;
    const audio = audioRef.current;
    if (!audio) return;
    try {
      setIsLoading(true);
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Audio play error:", err);
      setErrored(true);
    } finally {
      setIsLoading(false);
    }
  };

  const onTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
  };

  const onLoadedMeta = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration || 0);
    setErrored(false);
  };

  const onSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const value = Number(e.target.value);
    audio.currentTime = value;
    setCurrentTime(value);
  };

  const onEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const onError = () => {
    setErrored(true);
    setIsPlaying(false);
    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900/70 p-3 flex items-center gap-3 shadow-lg text-slate-100">
      <button
        type="button"
        onClick={togglePlay}
        disabled={!src || errored}
        className="h-11 w-11 flex items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 transition"
      >
        {errored ? "!" : isPlaying ? "⏸️" : isLoading ? "…" : "▶️"}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <input
          ref={progressRef}
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={Math.min(currentTime, duration || 0)}
          onChange={onSeek}
          className="w-full accent-emerald-500"
        />
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span>{fmt(currentTime)}</span>
          <span>{duration ? fmt(duration) : "0:00"}</span>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={src}
        preload="none"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMeta}
        onEnded={onEnded}
        onError={onError}
        className="hidden"
      />

      {errored && <span className="text-xs text-red-400 ml-2 whitespace-nowrap">Audio unavailable</span>}
    </div>
  );
}
