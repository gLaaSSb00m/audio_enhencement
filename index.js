// CrystalClear AI Audio Enhancer - Vanilla JS
// Features: file selection, playback controls, canvas visualizer, POST multipart to API, download/play enhanced audio

(() => {
  const $ = (sel) => document.querySelector(sel);
  const fileInput = $('#fileInput');
  const audioEl = $('#audio');
  const playBtn = $('#playBtn');
  const pauseBtn = $('#pauseBtn');
  const visualizer = $('#visualizer');
  const fileMeta = $('#fileMeta');
  const enhanceBtn = $('#enhanceBtn');
  const stopEnhanceBtn = $('#stopEnhanceBtn');
  const statusEl = $('#status');
  const progressEl = $('#progress');
  const processingBar = document.querySelector('#processingBar');
  const processingInner = document.querySelector('#processingInner');
  // API URL is hardcoded to avoid displaying it in the UI
  const API_URL = 'http://127.0.0.1:7860/direct-enhance';
  const downloadRow = $('#downloadRow');
  const downloadLink = $('#downloadLink');
  const enhancedAudio = $('#enhancedAudio');
  const playEnhancedBtn = $('#playEnhancedBtn');

  let audioCtx; let sourceNode; let analyser; let dataArray; let rafId;
  let currentFile; let currentObjectUrl; let enhancedObjectUrl;
  let abortController = null;

  function setStatus(text) { statusEl.textContent = text; }
  function setBusy(busy) {
    enhanceBtn.disabled = busy || !currentFile;
    stopEnhanceBtn.disabled = !busy;
    fileInput.disabled = busy;
  }
  function resetEnhanced() {
    downloadRow.style.display = 'none';
    enhancedAudio.style.display = 'none';
    if (enhancedObjectUrl) {
      URL.revokeObjectURL(enhancedObjectUrl);
      enhancedObjectUrl = null;
    }
  }

  // File handling
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    currentFile = file;
    fileMeta.textContent = `${file.name} • ${(file.size / (1024*1024)).toFixed(2)} MB`;
    playBtn.disabled = false;
    pauseBtn.disabled = false;
    enhanceBtn.disabled = false;
    resetEnhanced();

    // Load into audio tag
    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = URL.createObjectURL(file);
    audioEl.src = currentObjectUrl;
  });

  // Playback controls
  playBtn.addEventListener('click', () => audioEl.play());
  pauseBtn.addEventListener('click', () => audioEl.pause());

  // Visualizer init
  function ensureAudioGraph() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    sourceNode = audioCtx.createMediaElementSource(audioEl);
    sourceNode.connect(analyser);
    analyser.connect(audioCtx.destination);
  }

  // Draw loop
  const ctx = visualizer.getContext('2d');
  function draw() {
    const { width, height } = visualizer;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0a0f1e';
    ctx.fillRect(0, 0, width, height);

    analyser.getByteTimeDomainData(dataArray);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#60a5fa';
    ctx.beginPath();
    const sliceWidth = width * 1.0 / dataArray.length;
    let x = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * height / 2;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    rafId = requestAnimationFrame(draw);
  }

  audioEl.addEventListener('play', async () => {
    ensureAudioGraph();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    cancelAnimationFrame(rafId);
    draw();
  });
  audioEl.addEventListener('pause', () => cancelAnimationFrame(rafId));
  audioEl.addEventListener('ended', () => cancelAnimationFrame(rafId));

  // Enhancement flow
  enhanceBtn.addEventListener('click', async () => {
    if (!currentFile) return;
    const url = API_URL;
    setBusy(true);
    setStatus('Uploading...');
    resetEnhanced();

    // reset progress and processing bars
    progressEl.style.display = 'none';
    progressEl.value = 0;
    processingBar.style.display = 'none';
    processingInner.style.width = '0%';

    abortController = new AbortController();

    try {
      const fd = new FormData();
      // Match your curl: -F "file=@..."
      fd.append('file', currentFile, currentFile.name || 'input_audio.wav');

      // Track upload progress using XHR for better visibility
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);

      xhr.responseType = 'blob';
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          progressEl.style.display = 'block';
          progressEl.value = e.loaded / e.total;
        }
      };

      xhr.onloadstart = () => {
        progressEl.style.display = 'block';
        progressEl.value = 0;
      };
      xhr.onloadend = () => {
        // hide upload progress and start processing indicator
        progressEl.style.display = 'none';
        processingBar.style.display = 'block';
        // simple looping animation 0->100%
        let w = 0;
        const tick = () => {
          if (processingBar.style.display === 'none') return; // stop when hidden
          w = (w + 5) % 105;
          processingInner.style.width = w + '%';
          setTimeout(tick, 100);
        };
        tick();
      };

      xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
          const ct = xhr.getResponseHeader('Content-Type') || '';
          // Not strictly required; your API returns audio bytes.
        }
      };

      xhr.onerror = () => { throw new Error('Network error'); };

      xhr.onload = () => {
        // stop processing indicator
        processingBar.style.display = 'none';
        processingInner.style.width = '0%';
        if (xhr.status >= 200 && xhr.status < 300) {
          setStatus('Enhancement complete');
          const blob = xhr.response instanceof Blob ? xhr.response : new Blob([xhr.response]);
          if (enhancedObjectUrl) URL.revokeObjectURL(enhancedObjectUrl);
          enhancedObjectUrl = URL.createObjectURL(blob);
          downloadLink.href = enhancedObjectUrl;
          downloadRow.style.display = 'flex';
          enhancedAudio.src = enhancedObjectUrl;
          enhancedAudio.style.display = 'block';
        } else {
          setStatus(`Error ${xhr.status}: ${xhr.statusText}`);
        }
        setBusy(false);
      };

      // Hook abort controller to XHR
      const signal = abortController.signal;
      signal.addEventListener('abort', () => {
        xhr.abort();
        // reset indicators
        progressEl.style.display = 'none';
        processingBar.style.display = 'none';
        processingInner.style.width = '0%';
      });

      xhr.send(fd);
      setStatus('Processing...');
    } catch (err) {
      console.error(err);
      setStatus(err?.message || 'Enhancement failed');
      setBusy(false);
    }
  });

  stopEnhanceBtn.addEventListener('click', () => {
    if (abortController) {
      abortController.abort();
      setStatus('Cancelled');
      setBusy(false);
    }
  });

  playEnhancedBtn.addEventListener('click', () => {
    if (!enhancedObjectUrl) return;
    enhancedAudio.play();
  });

  // Initialize UI state
  setStatus('Idle');
})();
