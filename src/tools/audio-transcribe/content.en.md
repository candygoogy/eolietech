---
title: "Transcribe audio to text privately | Eolietech"
description: "Turn recordings, voice memos and videos into text and subtitles with Whisper running in your browser. Download TXT, SRT or VTT. Nothing is uploaded."
h1: "Transcribe audio to text"
intro: "Turn an interview, a lecture, a voice memo or the soundtrack of a video into text with timestamps. The speech recognition model runs on your own device, so your recording is never uploaded."
howTo:
  - "Choose an audio or video file (MP3, M4A, WAV, OGG, FLAC, MP4, WebM and most other formats your browser can play), or drop it on the box above."
  - "Leave the language on Detect automatically, or pick the language that is spoken if you already know it."
  - "Press Transcribe. The first time, your browser downloads the speech model and its engine once from this site: about 90 MB, or about 110 MB on computers where it runs on the graphics card."
  - "Read the transcript on the page, copy it, or download it as plain text (.txt) or as subtitles (.srt or .vtt)."
faq:
  - q: "Is my recording uploaded?"
    a: "No. The file is decoded by your browser and the speech recognition model runs inside this tab. The only download is the model itself, which comes from this website. The transcript is created on your device and stays there until you save or copy it."
  - q: "How long does it take?"
    a: "It depends on your device and the length of the recording. On a recent desktop computer it runs several times faster than the recording plays: in our tests about 15 seconds for two minutes of speech, and less on a graphics card. Laptops are usually two to three times slower than that, and phones and older computers slower still. Very long recordings may run out of memory. Keep the tab open while it works."
  - q: "Which languages does it understand?"
    a: "The Whisper model knows about 100 languages and works best in widely spoken ones such as English, Spanish, Italian, French, German and Portuguese. It detects the language from the first 30 seconds. If a recording starts with music or a different language, choose the language yourself to avoid a transcript in the wrong one."
  - q: "How accurate is it?"
    a: "Clear speech with little background noise comes out well, with occasional mistakes in names, numbers and technical terms. Heavy accents, people talking over each other, phone-quality audio and music under the voice all lower the accuracy. The model does not tell speakers apart. Read the transcript through before you rely on it."
  - q: "Why does it download about 90 MB first?"
    a: "That is the Whisper speech model (about 76 MB) plus the engine that runs it (about 14 MB). Where the browser can use your graphics card, it downloads a version of the model's first half that suits graphics cards instead, about 110 MB in total. The page shows the exact size for your device before you start. Nothing is downloaded until you press Transcribe, and your browser keeps the files in its storage, so the next transcription starts without downloading them again."
  - q: "Can it record from my microphone?"
    a: "No, this tool only works with files. Record with your phone's voice memo app or any recorder, then choose the file here."
ui:
  asr.modelNote: "Transcribing uses a speech recognition model that your browser downloads once from this site ({size}) when you press Transcribe. It then runs on your device."
  asr.listLabel: "Recording"
  asr.added: "Added {name}."
  asr.language.label: "Spoken language"
  asr.language.auto: "Detect automatically"
  asr.language.note: "Automatic detection listens to the first 30 seconds. Pick the language yourself if the recording starts with music or another language."
  asr.action: "Transcribe"
  asr.decoding: "Reading the audio…"
  asr.loading: "Preparing the speech model ({size}, one time only)…"
  asr.downloading: "Downloading the speech model: {loaded} of {total}"
  asr.fromCache: "Loading the speech model from your browser's storage…"
  asr.starting: "Starting the speech model…"
  asr.backend.webgpu: "Running on your graphics card (WebGPU)."
  asr.backend.wasm: "Running on your processor (WebAssembly, {threads} thread(s)). Keep this tab open while it works."
  asr.detecting: "Detecting the language…"
  asr.languageFound: "Language: {language}. Transcribing…"
  asr.progress: "Transcribing… {percent}%"
  asr.working: "Transcribing {length} of audio…"
  asr.done: "Transcript ready."
  asr.doneMeta: "{length} of audio, {words} words"
  asr.summary: "{language}, {length}, {words} words. Check names and numbers before you use it."
  asr.empty: "No speech was recognised in this recording."
  asr.resultLabel: "Transcript"
  asr.transcriptLabel: "Transcript text"
  asr.copy: "Copy text"
  asr.copied: "Transcript copied to the clipboard."
  asr.copyFailed: "Could not copy. Select the text and copy it instead."
  asr.download.txt: "Download .txt"
  asr.download.srt: "Download .srt"
  asr.download.vtt: "Download .vtt"
  asr.error.decode: "{name} could not be read as audio. Use a common format such as MP3, M4A, WAV or MP4. Very long recordings may be too big for your browser's memory."
  asr.error.decodeShort: "Could not read the audio"
  asr.error.load: "The speech model could not be loaded. Check your connection and try again. If this keeps happening, your browser may be short of memory: close other tabs and reload the page."
  asr.error.failed: "Something went wrong while transcribing {name}. If the recording is very long, try a shorter one."
  asr.error.failedShort: "Transcription failed"
---

## How it works

This tool runs [Whisper](https://github.com/openai/whisper), OpenAI's open speech recognition model, inside your browser using Transformers.js and ONNX Runtime Web. Your browser first decodes the file, keeps the sound and drops any video, and converts it to the 16 kHz mono audio Whisper expects. The model then listens to the recording in 30-second windows that overlap a little, writes down what it hears, and marks where each sentence starts and ends.

We use the multilingual "base" size of Whisper, mostly compressed to 8-bit numbers so it downloads faster and fits in a browser's memory. It is a balance: the smallest Whisper is quicker but makes many more mistakes outside English, and the larger ones are too heavy to download and run in a web page. When your browser supports WebGPU, the part of the model that listens to the audio runs on your graphics card and the part that writes the text runs on your processor; otherwise everything runs on your processor with WebAssembly.

## Subtitles and text

The .txt file has one line per sentence, without timestamps, for notes and documents. The .srt and .vtt files are subtitle formats with a start and end time for each line: SRT works with most video editors and players, and VTT is the format web video players use. Timings follow the model's own sentence breaks, so check them in your editor and split long lines if you need to.

## Privacy, limits and licences

Your recording never leaves your device. Files up to 200 MB are accepted; what really limits a file is its length, because your browser holds the whole decoded audio in memory. If a long recording fails, split it into parts or extract just the audio first. The model files are served by this website, checked against fixed checksums, and kept in your browser's storage. Whisper is by OpenAI, released under the MIT licence; the ONNX conversion is by the Hugging Face ONNX community. Transformers.js is by Hugging Face (Apache 2.0) and ONNX Runtime by Microsoft (MIT).
