let song;
let fft;
let amplitude;
let cnv;
let visualiserColor;
let backgroundColor = '#000000';

function setup() {
  cnv = createCanvas(windowWidth, windowHeight);
  cnv.parent('canvasContainer');
  fft = new p5.FFT();
  amplitude = new p5.Amplitude();
  noLoop();
  document.getElementById('playButton').disabled = true;
  background(backgroundColor);
}

let meydaAnalyzer;

function setupMeyda() {
  let audioContext = getAudioContext();
  let source = audioContext.createMediaElementSource(song.elt);

  meydaAnalyzer = Meyda.createMeydaAnalyzer({
    audioContext: audioContext,
    source: source,
    bufferSize: 512,
    featureExtractors: ['rms', 'chroma'],
    callback: (features) => {
      let amplitude = features.rms;
      let tonalContent = features.chroma;
      let color = mapAmplitudeToColor(amplitude, tonalContent);
    },
  });

  source.connect(audioContext.destination);
}

function playMusic() {
  let btn = document.getElementById('playButton');
  if (song && song.isPlaying()) {
    song.pause();
    btn.innerText = '▶';
    noLoop();
  } else if (song) {
    song.play();
    btn.innerText = '❚❚';
    loop();
  }
}

let hueLookup = [
  0, // C - Red
  30, // C# - Orange
  60, // D - Yellow
  90, // D# - Lime
  120, // E - Green
  150, // F - Spring Green
  180, // F# - Cyan
  210, // G - Azure
  240, // G# - Blue
  270, // A - Violet
  300, // A# - Magenta
  330, // B - Rose
];

function mapAmplitudeToColor(amplitude, chroma) {
  // Map amplitude to brightness (0 to 255)
  let brightness = map(amplitude, 0, 1, 50, 255);

  // Determine the dominant pitch class from chroma
  let dominantPitchIndex = chroma ? chroma.indexOf(Math.max(...chroma)) : 0;

  // Determine the mood based on amplitude and dominant pitch
  let mood = 'neutral';
  if (amplitude > 0.7) {
    if ([0, 7].includes(dominantPitchIndex)) {
      mood = 'happy'; // Major tones like C, G
    } else if ([3, 10].includes(dominantPitchIndex)) {
      mood = 'angry'; // Minor tones like D#, A# for high amplitude
    } else {
      mood = 'energetic';
    }
  } else if (amplitude > 0.5 && amplitude <= 0.7) {
    if ([0, 7].includes(dominantPitchIndex)) {
      mood = 'warm'; // Major tones for medium-high amplitude
    } else {
      mood = 'playful'; // Playfulness for medium-high amplitude with non-major/minor tones
    }
  } else if (amplitude > 0.3 && amplitude <= 0.5) {
    if ([0, 7].includes(dominantPitchIndex)) {
      mood = 'serene'; // Serenity for medium amplitude with major tones
    } else {
      mood = 'mysterious'; // Mystery for medium amplitude with non-major tones
    }
  } else if (amplitude < 0.3) {
    if ([3, 10].includes(dominantPitchIndex)) {
      mood = 'sad'; // Minor tones like D#, A#
    } else {
      mood = 'calm';
    }
  }

  // Map mood to hue
  let moodHues = {
    happy: 60, // Yellow
    energetic: 120, // Green
    sad: 240, // Blue
    calm: 270, // Purple
    angry: 0, // Red
    warm: 30, // Orange
    neutral: 180, // Cyan
    playful: 300, // Magenta
    serene: 210, // Azure
    mysterious: 150, // Spring Green
  };

  let hue = moodHues[mood];

  // Add a random offset to hue for variation
  let randomOffset = Math.floor(Math.random() * 60) - 30; // Random value between -30 and 30
  hue = (hue + randomOffset) % 360;

  // Saturation can be kept constant or varied based on requirements
  let saturation = map(amplitude, 0, 1, 60, 100); // Saturation varies with amplitude

  // Convert the HSB values to an RGB color
  let color = colorFromHSB(hue, saturation, brightness);

  return color;
}

function colorFromHSB(h, s, b) {
  colorMode(HSB);
  let rgbColor = color(h, s, b);
  colorMode(RGB);
  return {
    r: red(rgbColor),
    g: green(rgbColor),
    b: blue(rgbColor),
  };
}

let currentColor = { r: 255, g: 255, b: 255 };

let transitionDuration = 1.0;
let transitionStartTime = 0;

function draw() {
  background(backgroundColor);
  let currentAmplitude = amplitude.getLevel();
  let currentChroma;
  if (meydaAnalyzer) {
    currentChroma = meydaAnalyzer.get('chroma');
  }
  let targetColor = mapAmplitudeToColor(currentAmplitude, currentChroma);

  if (millis() - transitionStartTime < transitionDuration * 1000) {
    let t = (millis() - transitionStartTime) / (transitionDuration * 1000);
    visualiserColor = lerpColor(
      color(currentColor.r, currentColor.g, currentColor.b),
      color(targetColor.r, targetColor.g, targetColor.b),
      t
    );
  } else {
    visualiserColor = color(targetColor.r, targetColor.g, targetColor.b);
    currentColor = targetColor;
    transitionStartTime = millis();
  }

  stroke(visualiserColor);

  let spectrum = fft.analyze();
  let shape = document.getElementById('shapeSelector').value;
  switch (shape) {
    case 'bars':
      drawBars(spectrum);
      break;
    case 'circles':
      drawCircles(spectrum);
      break;
    case 'waves':
      drawWaves(spectrum);
      break;
    // case 'kaleidoscope':
    //   drawKaleidoscope(spectrum);
    //   break;
    // case 'particles':
    //   drawParticles(spectrum);
    //   break;
    // case 'fractalFlames':
    //   drawFractalFlames(spectrum);
    //   break;
    // case 'mandala':
    //   drawMandala(spectrum);
    //   break;
    // case 'wormhole':
    //   drawWormhole(spectrum);
    //   break;
    // case 'juliaSet':
    //   drawJuliaSet(spectrum);
    //   break;
  }
}

function drawBars(spectrum) {
  for (let i = 0; i < spectrum.length; i++) {
    let x = map(i, 0, spectrum.length, 0, width);
    let h = -height + map(spectrum[i], 0, 255, height, 0);
    rect(x, height, width / spectrum.length, h);
  }
}

function drawCircles(spectrum) {
  fill(visualiserColor);
  let r = map(spectrum[0], 0, 255, 10, width / 4);
  ellipse(width / 2, height / 2, r);
}

function drawWaves(spectrum) {
  let waveformData = fft.waveform();
  noFill();
  beginShape();
  for (let i = 0; i < waveformData.length; i++) {
    let x = map(i, 0, waveformData.length, 0, width);
    let y = map(waveformData[i], -1, 1, 0, height);
    vertex(x, y);
  }
  endShape();
}

document
  .getElementById('musicUpload')
  .addEventListener('change', function (event) {
    if (song) {
      song.stop();
    }
    song = loadSound(URL.createObjectURL(event.target.files[0]), function () {
      document.getElementById('playButton').disabled = false;
    });
  });

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

document.getElementById('musicUpload').addEventListener('change', function () {
  var filename = this.value.split('\\').pop();
  document.getElementById('songNameDisplay').innerText = filename;
});
