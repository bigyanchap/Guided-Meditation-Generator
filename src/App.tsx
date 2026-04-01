/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  Volume2, 
  VolumeX, 
  Sparkles,
  Loader2,
  Wind,
  Leaf,
  Flower2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { KokoroTTS, env } from 'kokoro-js';

// Configure transformers.js environment
if (env) {
  // Ensure we fetch from Hugging Face
  (env as any).allowLocalModels = false;
  (env as any).useBrowserCache = true;
}

// Initialize Gemini (keeping for potential other uses, though TTS is moving to Kokoro)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type Segment = {
  type: 'text' | 'pause';
  content?: string;
  duration?: number;
  audioUrl?: string;
  isGenerating?: boolean;
};

export default function App() {
  const [text, setText] = useState(`Guided meditation for Software Engineers......

Namaste and Welcome...
Close all screens if you haven't already... 

Silence your phone...

Sit comfortably on a chair or on the floor......
Keep your spine erect but not too rigid......
Keep your chin slightly up......
Keep your hands resting naturally over the knees...
Close your eyes...

Take a slow breath in through your nose…...

and exhale gently through your mouth…...

Again......

Take a slow breath in through your nose…...

and exhale gently through your mouth…...

Again......

Take a slow breath in through your nose…...

and exhale gently through your mouth…...

Let your breathing return to normal......

Now notice the mental tabs open in your mind......

Notice the Deadlines...

The Unfinished tasks...

Bugs to fix.

Features to ship.

Messages waiting.

You don’t need to close them on the computer...

Just don't engage with it for now...

Just observe what's going on in your mind...

Let it drop if it drops easily......

Don't force it though...

Just let it go if it goes...

Bring attention to your body...

Notice your jaw.

Just look at it with awareness.

Don't give any words...

Just give your attention......

Similarly, notice your shoulders...

Let them drop slightly...

If there is tension, rotate your shoulders slowly 3 times...

1......

2......

3......

and rotate it in the opposite direction 3 times.

1......

2......

3......

Then, notice your forehead...

Imagine a cool breeze is flowing touching your forehead......

Just enjoy it......

Now observe the inner drive......

The part of you that wants to improve everything......

Observe that drive which wants to optimize everything...

Ship faster.

Do better.

Stay ahead.

Do not judge that feeling......

Just observe its energy...

Where do you feel it in the body?
...

Chest?
...

Head?
...

Stomach?
...

Throat?
...

Just observe that sensation......

Now ask silently:

Is this clarity? Or is this just a pressure?
......

Clarity feels steady...

Pressure feels tight...

If you feel tightness, breathe into it......

Slowly and deeply inhale into where you feel the tightness......

Give it some Prana (the life energy)......

Then, exhale slowly......

Next, notice your thoughts......

Is there any thoughts like:

“I must prove myself.”

“I must not fall behind.”

“I can’t fail.”
...

Notice how the body reacts.

Now gently say inside:

My worth is not measured in output......

Next...

Visualize yourself working.

You are coding.

You are solving problems.

You are building.

But there is no rush inside.

No anxiety.

No comparison with co-workers.

Just clean thinking.

Just elegant code.

Simple.

Clear.

Stable...

Feel that state......

Now ask quietly:

If this project fails…

Am I still whole?

If this sprint goes badly…

Am I still enough?

Do not answer with logic...

Just feel...

Now drop all roles from mind and be nothing.

Drop the engineer in you.

Drop the performer.

Drop the achiever.

Just stillness and silence.

Nothing to debug.

Nothing to optimize.

Nothing to deploy.

Awareness is already complete...

Rest in this state and space of observing those thoughts......

Let the thoughts drop if they drop...

Let it stay if it stays......

You just observe......
......
......
......
......
......

Now, slowly, very slowly open your eyes...

Decide to carry this calm into your work...

Do not carry work into your nerves...

Thank You for doing this Meditation with us...

Namaste...`);
  const [title, setTitle] = useState('Zen for Engineers');
  const [description, setDescription] = useState('Guided Meditation for software Engineer.');
  const [pace, setPace] = useState(0.8); // 0.5 to 2.0
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(-1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const ttsRef = useRef<any>(null);

  // Voice options (Kokoro voices)
  const voices = [
    { id: 'af_heart', label: 'Heart (US Female)' },
    { id: 'af_bella', label: 'Bella (US Female)' },
    { id: 'af_sky', label: 'Sky (US Female)' },
    { id: 'am_adam', label: 'Adam (US Male)' },
    { id: 'am_michael', label: 'Michael (US Male)' },
    { id: 'bf_emma', label: 'Emma (UK Female)' },
    { id: 'bm_george', label: 'George (UK Male)' },
  ];
  const [selectedVoice, setSelectedVoice] = useState('am_michael');

  // Initialize Kokoro
  useEffect(() => {
    const initTTS = async () => {
      console.log("Starting Kokoro TTS initialization...");
      try {
        setIsModelLoading(true);
        setModelLoadProgress(0);
        
        // Using the ONNX version of Kokoro-82M
        const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
          dtype: "q8", // Use quantized model for faster loading/execution
          device: "wasm", // Default to wasm for compatibility
          progress_callback: (progress: any) => {
            if (progress.status === 'progress') {
              console.log(`Model loading: ${Math.round(progress.progress)}%`);
              setModelLoadProgress(progress.progress);
            } else if (progress.status === 'done') {
              console.log(`Model file loaded: ${progress.file}`);
            } else if (progress.status === 'ready') {
              console.log("Model is ready!");
            }
          }
        });
        
        ttsRef.current = tts;
        setIsModelLoading(false);
        console.log("Kokoro TTS initialized successfully.");
      } catch (error: any) {
        console.error("Failed to load Kokoro model:", error);
        setIsModelLoading(false);
        // Provide a more helpful error message in the UI if possible
        alert(`Model loading failed: ${error.message || 'Unknown error'}. This is likely due to network restrictions in the preview environment. Downloading the code and running it locally is recommended for this feature.`);
      }
    };
    initTTS();
  }, []);

  const parseText = (input: string) => {
    // Split by line breaks first
    const lines = input.split(/\n/);
    const result: Segment[] = [];

    lines.forEach((line, lineIdx) => {
      if (!line.trim()) {
        if (lineIdx < lines.length - 1) {
          result.push({ type: 'pause', duration: 10 / pace });
        }
        return;
      }

      // Within each line, handle dots
      const tokens = line.split(/(\.+)/);
      
      tokens.forEach(token => {
        if (!token) return;
        
        if (token.startsWith('.')) {
          const dotCount = token.length;
          const duration = (Math.floor(dotCount / 3) * 5 + (dotCount % 3)) / pace;
          result.push({ type: 'pause', duration });
        } else {
          const trimmed = token.trim();
          if (trimmed) {
            result.push({ type: 'text', content: trimmed });
          }
        }
      });

      // Add line break pause if not the last line
      if (lineIdx < lines.length - 1) {
        result.push({ type: 'pause', duration: 10 / pace });
      }
    });

    return result;
  };

  const addWavHeaderFromFloat32 = (audioData: Float32Array, sampleRate: number) => {
    const len = audioData.length;
    const buffer = new ArrayBuffer(44 + len * 2);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + len * 2, true);    // file length
    view.setUint32(8, 0x57415645, false); // "WAVE"

    // fmt sub-chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true);          // sub-chunk size
    view.setUint16(20, 1, true);           // PCM format
    view.setUint16(22, 1, true);           // mono
    view.setUint32(24, sampleRate, true);  // sample rate
    view.setUint32(28, sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true);           // block align
    view.setUint16(34, 16, true);          // bits per sample

    // data sub-chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, len * 2, true);         // data length

    // Convert Float32 to Int16
    for (let i = 0; i < len; i++) {
      const s = Math.max(-1, Math.min(1, audioData[i]));
      view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const generateAudio = async () => {
    setIsGenerating(true);
    setIsPlaying(false);
    setCurrentSegmentIndex(-1);
    setProgress(0);
    
    const parsedSegments = parseText(text);
    setSegments(parsedSegments.map(s => ({ ...s, isGenerating: s.type === 'text' })));

    try {
      if (!ttsRef.current) {
        throw new Error("TTS model not loaded yet.");
      }

      const updatedSegments = [...parsedSegments];
      
      for (let i = 0; i < updatedSegments.length; i++) {
        const seg = updatedSegments[i];
        if (seg.type === 'text' && seg.content) {
          setSegments(prev => prev.map((s, idx) => idx === i ? { ...s, isGenerating: true } : s));

          // Generate audio using local Kokoro model
          const result = await ttsRef.current.generate(seg.content, {
            voice: selectedVoice,
          });

          if (result && result.data) {
            const audioBlob = addWavHeaderFromFloat32(result.data, result.sampling_rate);
            updatedSegments[i].audioUrl = URL.createObjectURL(audioBlob);
          }
          
          setSegments(prev => prev.map((s, idx) => idx === i ? { ...s, isGenerating: false, audioUrl: updatedSegments[i].audioUrl } : s));
        }
      }
    } catch (error: any) {
      console.error("Generation failed:", error);
      alert(`Generation failed: ${error.message || error}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const playNext = (index: number) => {
    if (index >= segments.length) {
      setIsPlaying(false);
      setCurrentSegmentIndex(-1);
      setProgress(100);
      return;
    }

    setCurrentSegmentIndex(index);
    const segment = segments[index];
    setProgress((index / segments.length) * 100);

    if (segment.type === 'text' && segment.audioUrl) {
      if (audioRef.current) {
        audioRef.current.src = segment.audioUrl;
        audioRef.current.playbackRate = pace;
        audioRef.current.play().catch(e => console.error("Playback failed:", e));
      }
    } else if (segment.type === 'pause' && segment.duration) {
      const timer = setTimeout(() => {
        if (isPlaying) playNext(index + 1);
      }, segment.duration * 1000);
      return () => clearTimeout(timer);
    } else {
      playNext(index + 1);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (audioRef.current) audioRef.current.pause();
    } else {
      if (segments.length === 0) {
        alert("Please generate audio first.");
        return;
      }
      setIsPlaying(true);
      if (currentSegmentIndex === -1) {
        playNext(0);
      } else {
        if (segments[currentSegmentIndex].type === 'text' && audioRef.current) {
          audioRef.current.play();
        } else {
          playNext(currentSegmentIndex);
        }
      }
    }
  };

  const reset = () => {
    setIsPlaying(false);
    setCurrentSegmentIndex(-1);
    setProgress(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const downloadFullAudio = async () => {
    if (segments.length === 0 || isGenerating) return;
    
    setIsGenerating(true); // Reuse loading state for merging
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const decodedBuffers: AudioBuffer[] = [];
      
      // Decode all audio segments
      for (const seg of segments) {
        if (seg.type === 'text' && seg.audioUrl) {
          const response = await fetch(seg.audioUrl);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          decodedBuffers.push(audioBuffer);
        } else if (seg.type === 'pause' && seg.duration) {
          // Create silent buffer
          const silentBuffer = audioCtx.createBuffer(
            1, 
            Math.floor(audioCtx.sampleRate * seg.duration), 
            audioCtx.sampleRate
          );
          decodedBuffers.push(silentBuffer);
        }
      }

      // Merge buffers
      const totalLength = decodedBuffers.reduce((acc, buf) => acc + buf.length, 0);
      const mergedBuffer = audioCtx.createBuffer(
        1, 
        totalLength, 
        audioCtx.sampleRate
      );
      
      let offset = 0;
      for (const buf of decodedBuffers) {
        mergedBuffer.getChannelData(0).set(buf.getChannelData(0), offset);
        offset += buf.length;
      }

      // Convert to WAV
      const wavBlob = bufferToWav(mergedBuffer);
      const url = URL.createObjectURL(wavBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.replace(/\s+/g, '_') || 'meditation'}.wav`;
      link.click();
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to merge audio for download.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper to convert AudioBuffer to WAV
  function bufferToWav(abuffer: AudioBuffer) {
    const numOfChan = abuffer.numberOfChannels;
    const length = abuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0;

    // write WAVE header
    setUint32(0x46464952);                         // "RIFF"
    setUint32(length - 8);                         // file length - 8
    setUint32(0x45564157);                         // "WAVE"

    setUint32(0x20746d66);                         // "fmt " chunk
    setUint32(16);                                 // length = 16
    setUint16(1);                                  // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2);                      // block-align
    setUint16(16);                                 // 16-bit (hardcoded)

    setUint32(0x61746164);                         // "data" - chunk
    setUint32(length - pos - 4);                   // chunk length

    // write interleaved data
    for (i = 0; i < abuffer.numberOfChannels; i++)
      channels.push(abuffer.getChannelData(i));

    while (pos < length) {
      for (i = 0; i < numOfChan; i++) {             // interleave channels
        sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
        view.setInt16(pos, sample, true);          // write 16-bit sample
        pos += 2;
      }
      offset++;                                     // next sample
    }

    return new Blob([buffer], { type: "audio/wav" });

    function setUint16(data: number) {
      view.setUint16(pos, data, true);
      pos += 2;
    }

    function setUint32(data: number) {
      view.setUint32(pos, data, true);
      pos += 4;
    }
  }

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => {
        if (isPlaying) {
          playNext(currentSegmentIndex + 1);
        }
      };
    }
  }, [isPlaying, currentSegmentIndex, segments]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0] font-sans selection:bg-orange-500/30">
      <audio ref={audioRef} muted={isMuted} />
      
      {/* Background Atmosphere */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-900/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 md:py-20">
        {/* Header */}
        <header className="mb-12 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium uppercase tracking-widest mb-4"
          >
            <Sparkles size={14} />
            Gemini 3.1 Powered
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-light tracking-tighter mb-4 text-white"
          >
            Dhyāna
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 text-lg max-w-xl mx-auto font-light"
          >
            Transform your meditation scripts into deep, resonant Indian English audio with precise pauses.
          </motion.p>
        </header>

        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Input */}
          <div className="lg:col-span-7 space-y-6">
          <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="relative group"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500/20 to-indigo-500/20 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000" />
              <div className="relative bg-[#121212] border border-white/5 rounded-2xl p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-gray-500">Session Title</label>
                    <input 
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Morning Zen"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-orange-500/50 outline-none transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-gray-500">Short Description</label>
                    <input 
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Focus on breath"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-orange-500/50 outline-none transition"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-gray-500">Script Content</label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter your meditation script..."
                    className="w-full h-48 bg-white/5 border border-white/10 rounded-lg p-4 text-lg font-light leading-relaxed resize-none placeholder:text-gray-600 focus:ring-1 focus:ring-orange-500/50 outline-none transition"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/5">
                  <div className="flex gap-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Voice</span>
                      <select 
                        value={selectedVoice}
                        onChange={(e) => setSelectedVoice(e.target.value)}
                        className="bg-transparent text-sm text-gray-300 border-none p-0 focus:ring-0 cursor-pointer hover:text-white transition"
                      >
                        {voices.map(v => <option key={v.id} value={v.id} className="bg-[#121212]">{v.label}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Pace ({pace}x)</span>
                      <input 
                        type="range" 
                        min="0.5" 
                        max="1.5" 
                        step="0.1" 
                        value={pace}
                        onChange={(e) => setPace(parseFloat(e.target.value))}
                        className="w-24 accent-orange-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={downloadFullAudio}
                      disabled={segments.length === 0 || isGenerating}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 text-white border border-white/10 rounded-full font-medium hover:bg-white/10 transition-all disabled:opacity-20"
                      title="Download as WAV (High Fidelity)"
                    >
                      <Download size={18} />
                    </button>
                    <button
                      onClick={generateAudio}
                      disabled={isGenerating || isModelLoading || !text.trim()}
                      className="flex items-center gap-2 px-6 py-2 bg-white text-black rounded-full font-medium hover:bg-orange-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/5"
                    >
                      {isGenerating || isModelLoading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                      {isModelLoading 
                        ? `Loading Model (${Math.round(modelLoadProgress)}%)...` 
                        : isGenerating ? 'Processing...' : 'Generate Audio'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Legend */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap gap-4 text-[11px] uppercase tracking-widest text-gray-500"
            >
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                <span className="text-orange-400 font-bold">.</span> 1s Pause
              </div>
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                <span className="text-orange-400 font-bold">...</span> 5s Pause
              </div>
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                <span className="text-orange-400 font-bold">......</span> 10s Pause
              </div>
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                <span className="text-orange-400 font-bold">↵</span> 10s Pause
              </div>
            </motion.div>
          </div>

          {/* Right: Player & Visuals */}
          <div className="lg:col-span-5 space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-[#121212] border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[400px]"
            >
              {/* Visualizer Circle */}
              <div className="relative w-48 h-48 mb-8">
                <AnimatePresence>
                  {isPlaying && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.1, 0.3]
                      }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ 
                        duration: 4, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                      }}
                      className="absolute inset-0 bg-orange-500 rounded-full blur-3xl"
                    />
                  )}
                </AnimatePresence>
                <div className={`relative w-full h-full rounded-full border-2 border-white/10 flex items-center justify-center transition-all duration-1000 ${isPlaying ? 'border-orange-500/50 scale-110' : ''}`}>
                  {isPlaying ? (
                    <div className="flex gap-1 items-end h-12">
                      {[...Array(5)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{ height: [20, 48, 20] }}
                          transition={{ 
                            duration: 0.8, 
                            repeat: Infinity, 
                            delay: i * 0.1,
                            ease: "easeInOut"
                          }}
                          className="w-1.5 bg-orange-500 rounded-full"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-600">
                      <Wind size={48} strokeWidth={1} />
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full space-y-6">
                <div>
                  <h3 className="text-xl font-light mb-1">
                    {currentSegmentIndex >= 0 ? (
                      segments[currentSegmentIndex].type === 'text' ? 'Chanting...' : 'Mindful Silence...'
                    ) : (title || 'Ready to begin')}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {currentSegmentIndex >= 0 && segments[currentSegmentIndex].type === 'text' 
                      ? `"${segments[currentSegmentIndex].content}"` 
                      : currentSegmentIndex >= 0 ? `${segments[currentSegmentIndex].duration.toFixed(1)}s pause` : (description || 'Press play to start your journey')}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-orange-500"
                  />
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-6">
                  <button 
                    onClick={reset}
                    className="p-3 text-gray-500 hover:text-white transition"
                  >
                    <RotateCcw size={20} />
                  </button>
                  <button 
                    onClick={togglePlay}
                    disabled={segments.length === 0 || isGenerating}
                    className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:bg-orange-500 hover:text-white transition-all transform active:scale-95 disabled:opacity-20"
                  >
                    {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                  </button>
                  <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-3 text-gray-500 hover:text-white transition"
                  >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Segment List (Mini) */}
            <div className="bg-[#121212] border border-white/5 rounded-2xl p-4 max-h-[200px] overflow-y-auto custom-scrollbar">
              <h4 className="text-[10px] uppercase tracking-widest text-gray-500 mb-3 px-2">Sequence</h4>
              <div className="space-y-2">
                {segments.length === 0 ? (
                  <p className="text-xs text-gray-600 px-2 italic">Generate audio to see the sequence...</p>
                ) : (
                  segments.map((seg, i) => (
                    <div 
                      key={i} 
                      className={`flex items-center justify-between p-2 rounded-lg text-xs transition ${currentSegmentIndex === i ? 'bg-orange-500/10 text-orange-400' : 'text-sky-400'}`}
                    >
                      <div className="flex items-center gap-3">
                        {seg.type === 'text' ? <Leaf size={12} /> : <Flower2 size={12} />}
                        <span className="truncate max-w-[180px]">
                          {seg.type === 'text' ? seg.content : `${seg.duration}s Pause`}
                        </span>
                      </div>
                      {seg.isGenerating && <Loader2 size={12} className="animate-spin" />}
                      {seg.audioUrl && !seg.isGenerating && <div className="w-1 h-1 bg-orange-500 rounded-full" />}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto px-6 py-12 text-center border-t border-white/5">
        <p className="text-gray-600 text-xs tracking-widest uppercase">
          Crafted for inner peace & clarity
        </p>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
