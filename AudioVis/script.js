let song;
let fft;
let amplitude;
let cnv;
let visualizerColor = '#FFFFFF';
let backgroundColor = '#000000';

function setup() {
  cnv = createCanvas(600, 400);
  cnv.parent('canvasContainer');
  fft = new p5.FFT();
  amplitude = new p5.Amplitude();
  noLoop();
  document.getElementById('playButton').disabled = true;
  background(backgroundColor);
}

function playMusic() {
  let btn = document.getElementById('playButton');
  if (song && song.isPlaying()) {
    song.pause();
    btn.innerText = 'Play Music';
    noLoop();
  } else if (song) {
    song.play();
    btn.innerText = 'Pause Music';
    loop();
  }
}

function draw() {
  background(backgroundColor);
  stroke(visualizerColor);
  let bassBoost = parseFloat(document.getElementById('bassBoost').value);
  let spectrum = fft.analyze();
  let shape = document.getElementById('shapeSelector').value;

  switch (shape) {
    case 'bars':
      drawBars(spectrum, bassBoost);
      break;
    case 'circles':
      drawCircles(spectrum, bassBoost);
      break;
    case 'waves':
      drawWaves(spectrum, bassBoost);
      break;
  }
}

function drawBars(spectrum, bassBoost) {
  for (let i = 0; i < spectrum.length; i++) {
    let x = map(i, 0, spectrum.length, 0, width);
    let h = -height + map(spectrum[i], 0, 255, height, 0);
    rect(x, height, width / spectrum.length, h * bassBoost);
  }
}

function drawCircles(spectrum, bassBoost) {
  fill(visualizerColor);
  let r = map(spectrum[0], 0, 255, 10, width / 4) * bassBoost;
  ellipse(width / 2, height / 2, r);
}

function drawWaves(spectrum, bassBoost) {
  let waveformData = fft.waveform();
  noFill();
  beginShape();
  for (let i = 0; i < waveformData.length; i++) {
    let x = map(i, 0, waveformData.length, 0, width);
    let y = map(waveformData[i] * bassBoost, -1, 1, 0, height);
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

function setDefaultMode() {
  visualizerColor = '#FFFFFF';
  backgroundColor = '#000000';
  background(backgroundColor);
}

function setColorMode() {
  visualizerColor = '#FF0000'; // Example color, can be changed
  backgroundColor = '#0000FF'; // Example color, can be changed
  background(backgroundColor);
}

let isDefaultMode = true;

function toggleMode() {
  if (isDefaultMode) {
    setColorMode();
    document.getElementById('modeToggleButton').innerText = 'Color Mode';
  } else {
    setDefaultMode();
    document.getElementById('modeToggleButton').innerText = 'Default Mode';
  }
  isDefaultMode = !isDefaultMode;
}
