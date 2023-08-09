let song;
let fft;
let amplitude;
let cnv;

function setup() {
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume();
  }

  cnv = createCanvas(600, 400);
  cnv.parent('canvasContainer');
  fft = new p5.FFT();
  amplitude = new p5.Amplitude();
  noLoop();
  document.getElementById('playButton').disabled = true;
}

let visualizationStarted = false;
function playMusic() {
  let btn = document.querySelector('button');
  if (song && song.isPlaying()) {
    song.pause();
    btn.innerText = 'Play Music';
    noLoop();
    visualizationStarted = false;
  } else {
    if (song) {
      song.play();
      btn.innerText = 'Pause Music';

      setTimeout(() => {
        visualizationStarted = true;
        loop();
      }, 100);
    }
  }
}

let btn = document.querySelector('button');
if (song && song.isPlaying()) {
  song.pause();
  btn.innerText = 'Play Music';
} else {
  if (song) {
    song.play();
    btn.innerText = 'Pause Music';
  }
}

function draw() {
  if (!visualizationStarted) return;
  clear();

  let bgColor = color(document.getElementById('bgColor').value);
  let primaryColor = color(document.getElementById('primaryColor').value);
  let shape = document.getElementById('shapeSelector').value;
  let bassBoost = parseFloat(document.getElementById('bassBoost').value);

  background(bgColor);

  switch (shape) {
    case 'bars':
      drawBars(primaryColor, bassBoost);
      break;
    case 'circles':
      drawCircles(primaryColor, bassBoost);
      break;
    case 'waves':
      drawWaves(primaryColor, bassBoost);
      break;
  }
}

function drawBars(primaryColor, bassBoost) {
  let spectrum = fft.analyze();
  noStroke();
  fill(primaryColor);
  for (let i = 0; i < spectrum.length; i++) {
    let x = map(i, 0, spectrum.length, 0, width);
    let h = -height + map(spectrum[i], 0, 255, height, 0);
    rect(x, height, width / spectrum.length, h * bassBoost);
  }
}

function drawCircles(primaryColor, bassBoost) {
  let lvl = amplitude.getLevel();
  let size = map(lvl, 0, 1, 0, 200) * bassBoost;
  fill(primaryColor);
  ellipse(width / 2, height / 2, size, size);
}

function drawWaves(primaryColor, bassBoost) {
  let waveform = fft.waveform();
  noFill();
  beginShape();
  stroke(primaryColor);
  for (let i = 0; i < waveform.length; i++) {
    let x = map(i, 0, waveform.length, 0, width);
    let y = map(waveform[i] * bassBoost, -1, 1, 0, height);
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
