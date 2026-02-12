import { useState, useRef, useEffect } from "react";

/**
 * VoiceRecorder Component
 * Allows users to record audio directly from browser using MediaRecorder API
 * 
 * Props:
 * - onRecordingComplete(blob): Called when user stops recording and confirms
 * - onError(error): Called if there's an error
 */
export default function VoiceRecorder({ onRecordingComplete, onError }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const streamRef = useRef(null);

  // Format seconds to MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Start Recording
  const startRecording = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Collect audio chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // When recording stops
      mediaRecorder.onstop = () => {
        // Use webm format as it's more universally supported by MediaRecorder
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        
        // Log blob size for debugging
        console.log(`✅ VOICE RECORDER: Blob created, size: ${blob.size} bytes`);
        
        if (blob.size === 0) {
          console.error("❌ VOICE RECORDER: Blob is empty! Audio chunks:", audioChunksRef.current.length);
          onError?.("Recording failed - no audio data captured. Please try again.");
          return;
        }
        
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setRecordedBlob(blob);
        
        // Stop all tracks
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setAudioUrl(null);
      setRecordedBlob(null);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied or error:", err);
      const errorMsg =
        err.name === "NotAllowedError"
          ? "Microphone permission denied"
          : "Failed to access microphone: " + err.message;
      onError?.(errorMsg);
    }
  };

  // Pause Recording (optional feature)
  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      clearInterval(timerIntervalRef.current);
    }
  };

  // Resume Recording
  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  // Clear Recording
  const clearRecording = () => {
    setAudioUrl(null);
    setRecordedBlob(null);
    setRecordingTime(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerIntervalRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <h3 className="font-bold text-slate-900">🎤 Record Voice Message</h3>

      {/* Recording Status */}
      <div className="space-y-3">
        {isRecording && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-red-700">Recording...</span>
            <span className="ml-auto text-sm font-mono text-red-700">{formatTime(recordingTime)}</span>
          </div>
        )}

        {/* Recording Controls */}
        <div className="space-y-2">
          {!isRecording && !audioUrl && (
            <button
              onClick={startRecording}
              className="w-full py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold rounded-lg hover:from-red-600 hover:to-rose-700 transition text-sm flex items-center justify-center gap-2"
            >
              🎙️ Start Recording
            </button>
          )}

          {isRecording && (
            <div className="flex gap-2">
              <button
                onClick={pauseRecording}
                disabled={isPaused}
                className="flex-1 py-2 bg-yellow-500 text-white font-bold rounded-lg hover:bg-yellow-600 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ⏸ Pause
              </button>
              <button
                onClick={resumeRecording}
                disabled={!isPaused}
                className="flex-1 py-2 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ▶️ Resume
              </button>
              <button
                onClick={stopRecording}
                className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition text-sm"
              >
                ⏹ Stop
              </button>
            </div>
          )}
        </div>

        {/* Preview Audio Player */}
        {audioUrl && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-700 mb-2">✓ Recording saved</p>
              <audio controls className="w-full">
                <source src={audioUrl} type="audio/webm" />
                Your browser does not support the audio element.
              </audio>
            </div>

            <div className="flex gap-2">
              <button
                onClick={clearRecording}
                className="flex-1 py-2 bg-slate-300 text-slate-900 font-bold rounded-lg hover:bg-slate-400 transition text-sm"
              >
                🔄 Re-record
              </button>
              <button
                onClick={() => {
                  if (recordedBlob) {
                    onRecordingComplete?.(recordedBlob);
                  }
                }}
                className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-emerald-700 transition text-sm"
              >
                ✓ Use This Recording
              </button>
            </div>
          </div>
        )}
      </div>

      {/* File Size Info */}
      {recordedBlob && (
        <div className="text-xs text-slate-500 text-center">
          Recording size: {(recordedBlob.size / 1024).toFixed(2)} KB
        </div>
      )}
    </div>
  );
}
