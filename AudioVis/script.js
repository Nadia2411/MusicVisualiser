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

    case 'particles':
      drawParticles(primaryColor, bassBoost);
      break;
    case 'spiral':
      drawSpiral(primaryColor, bassBoost);
      break;
    case 'concentricCircles':
      drawConcentricCircles(primaryColor, bassBoost);
      break;
    case 'waves':
      drawWaves(primaryColor, bassBoost);
      break;
  }
}

function drawBars(primaryColor, bassBoost) {
  let spectrum = fft.analyze();
  noStroke();

  let baseColor = color(document.getElementById('barBaseColor').value);
  let tipColor = color(document.getElementById('barTipColor').value);

  for (let i = 0; i < spectrum.length; i++) {
    let interColor = lerpColor(baseColor, tipColor, spectrum[i] / 255.0);
    fill(interColor);
    let x = map(i, 0, spectrum.length, 0, width);

    let barWidth = parseFloat(document.getElementById('barThickness').value);
    let barSpacing = parseFloat(document.getElementById('barSpacing').value);

    let h = -height + map(spectrum[i], 0, 255, height, 0);
    rect(x * barSpacing, height, barWidth, h * bassBoost);
  }
}

function drawCircles(primaryColor, bassBoost) {
  let lvl = amplitude.getLevel();
  let size = map(lvl, 0, 1, 0, 200) * bassBoost;

  let baseColor = color(document.getElementById('barBaseColor').value);
  let tipColor = color(document.getElementById('barTipColor').value);

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

function drawConcentricCircles(primaryColor, bassBoost) {
  let spectrum = fft.analyze();
  let bands = spectrum.length / 10;
  for (let i = 0; i < bands; i++) {
    let avg = 0;
    for (let j = 0; j < 10; j++) {
      avg += spectrum[i * 10 + j];
    }
    avg /= 10;
    let radius = map(avg, 0, 255, 10, height / 2) * bassBoost;
    noFill();
    stroke(primaryColor);
    ellipse(width / 2, height / 2, radius, radius);
  }
}

function drawSpiral(primaryColor, bassBoost) {
  let spectrum = fft.analyze();
  translate(width / 2, height / 2);
  for (let i = 0; i < spectrum.length; i++) {
    let angle = map(i, 0, spectrum.length, 0, TWO_PI * 5);
    let r = map(i, 0, spectrum.length, 20, height / 2);
    let x = r * cos(angle);
    let y = r * sin(angle);
    let h = -height + map(spectrum[i], 0, 255, height, 0);
    let w = map(spectrum[i], 0, 255, 0, 10);
    push();
    translate(x, y);
    rotate(angle + HALF_PI);
    fill(primaryColor);
    rect(0, 0, w, h * bassBoost);
    pop();
  }
}

let particles = [];

function drawParticles(primaryColor, bassBoost) {
  let spectrum = fft.analyze();
  let bassValue = fft.getEnergy('bass');

  // Add new particles based on bass value
  for (let i = 0; i < bassValue / 10; i++) {
    particles.push(new Particle(primaryColor));
  }

  // Update and display particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update(bassBoost);
    particles[i].display(spectrum);
    if (particles[i].isOffScreen()) {
      particles.splice(i, 1);
    }
  }
}

class Particle {
  constructor(primaryColor) {
    this.pos = createVector(width / 2, height / 2);
    this.vel = createVector(random(-1, 1), random(-1, 1)).mult(random(2, 5));
    this.size = random(2, 10);
    this.color = primaryColor;
  }

  update(bassBoost) {
    this.vel.mult(bassBoost);
    this.pos.add(this.vel);
  }

  display(spectrum) {
    noStroke();
    fill(this.color);
    ellipse(this.pos.x, this.pos.y, this.size, this.size);
  }

  isOffScreen() {
    return (
      this.pos.x < 0 ||
      this.pos.x > width ||
      this.pos.y < 0 ||
      this.pos.y > height
    );
  }
}
