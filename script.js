let song;
let fft;
let amplitude;
let cnv;
let visualiserColor;
let backgroundColor = '#000000';
let buffer;
let isMusicPlaying = false;
let worker = new Worker('smokeyWorker.js');
let particleBuffer;
let meydaAnalyzer;
let currentColor = { r: 255, g: 255, b: 255 };
let transitionDuration = 1.0;
let transitionStartTime = 0;
let currentChroma;

worker.onmessage = function (e) {
  let data = e.data;
  switch (data.cmd) {
    case 'updatedFlowField':
      flowField.field = data.field;
      break;
  }
};

function setup() {
  cnv = createCanvas(windowWidth, windowHeight);
  cnv.parent('canvasContainer');
  fft = new p5.FFT();
  amplitude = new p5.Amplitude();
  noLoop();
  document.getElementById('playButton').disabled = true;
  background(backgroundColor);
  setupSmokeyFlow();
  particleBuffer = createGraphics(width, height);
  particleBuffer.blendMode(ADD);
}

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
  isMusicPlaying = true;
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

function mapAmplitudeToColor(amplitude, chroma) {
  let brightness = map(amplitude, 0, 1, 50, 255);

  let dominantPitchIndex = chroma ? chroma.indexOf(Math.max(...chroma)) : 0;

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

  let randomOffset = Math.floor(Math.random() * 60) - 30;
  hue = (hue + randomOffset) % 360;

  let saturation = map(amplitude, 0, 1, 60, 100);

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

function draw() {
  background(backgroundColor);
  let currentAmplitude = amplitude.getLevel();
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
    case 'waves':
      drawWaves(spectrum);
      break;
    case 'particlesFall':
      drawParticlesFall();
      break;
    case 'mandala':
      drawMandala(spectrum);
      break;
    case 'smokeyFlow':
      if (isMusicPlaying) {
        drawSmokeyFlow();
      }
      break;
    case 'cCMandala':
      drawCCMandala(spectrum);
      break;
  }
}

//////////////////////////////////////////////////////WAVES////////////////////////////////////////////////////////

function drawWaves(spectrum) {
  if (!isMusicPlaying) return;
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

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////// FALLING ORBS ///////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
let fallingParticles = [];

class Particle {
  constructor(x, y, radius, color) {
    this.position = createVector(x, y);
    this.velocity = createVector(0, 0);
    this.acceleration = createVector(0, random(0.05, 0.2));
    this.radius = radius;
    this.color = color;
  }

  move() {
    this.velocity.add(this.acceleration);
    this.position.add(this.velocity);
  }

  show() {
    let r = red(this.color);
    let g = green(this.color);
    let b = blue(this.color);

    particleBuffer.clear();

    let gradient = particleBuffer.drawingContext.createRadialGradient(
      this.position.x,
      this.position.y,
      0,
      this.position.x,
      this.position.y,
      this.radius
    );
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
    gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.8)`);
    gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.4)`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    particleBuffer.drawingContext.fillStyle = gradient;
    particleBuffer.noStroke();
    particleBuffer.ellipse(this.position.x, this.position.y, this.radius * 2);

    image(particleBuffer, 0, 0);
  }

  offScreen() {
    return this.position.y > height + 50;
  }
}

function drawParticlesFall() {
  particleBuffer.background(0, 0, 0, 25);

  let level = amplitude.getLevel();

  if (random(1) < level) {
    let size = map(level, 0, 1, 5, 50);
    let particle = new Particle(random(width), -size, size, visualiserColor);
    fallingParticles.push(particle);
  }

  for (let i = fallingParticles.length - 1; i >= 0; i--) {
    fallingParticles[i].move();
    fallingParticles[i].show();

    if (fallingParticles[i].offScreen()) {
      fallingParticles.splice(i, 1);
    }
  }

  image(particleBuffer, 0, 0);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////// MANDALA ///////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function drawMandala(spectrum) {
  let currentAmplitude = amplitude.getLevel();
  let numSegments = map(currentAmplitude, 0, 1, 6, 12);
  let angleOffset = TWO_PI / numSegments;
  let currentChroma;
  if (meydaAnalyzer) {
    currentChroma = meydaAnalyzer.get('chroma');
  }

  push();
  translate(width / 2, height / 2);
  for (let i = 0; i < numSegments; i++) {
    push();
    rotate(angleOffset * i);
    drawMandalaPattern(spectrum, currentAmplitude, currentChroma);
    scale(1, -1);
    drawMandalaPattern(spectrum, currentAmplitude, currentChroma);
    pop();
  }
  pop();
}

function drawMandalaPattern(spectrum, currentAmplitude, currentChroma) {
  noFill();
  let rMax = min(windowWidth, windowHeight) / 2.5;
  let index = floor(map(currentAmplitude, 0, 1, 0, spectrum.length - 1));
  let size = map(spectrum[index], 0, 255, 5, 25);
  let moodColor = mapAmplitudeToColor(currentAmplitude, currentChroma);
  let clr = color(moodColor.r, moodColor.g, moodColor.b);
  stroke(clr);
  let numPoints = map(spectrum[index], 0, 255, 6, 24);
  let angleOffset = TWO_PI / numPoints;
  beginShape();
  for (let i = 0; i < numPoints; i++) {
    let angle = angleOffset * i;
    let radius = rMax * (spectrum[i] / 255.0);

    let averageSpectrum = spectrum.reduce((a, b) => a + b, 0) / spectrum.length;
    let threshold = 0.7;
    let peakDetection = spectrum[index] > 255 * threshold;
    let dynamicMinRadius;
    if (peakDetection) {
      dynamicMinRadius = rMax * 0.01;
    } else {
      dynamicMinRadius = map(averageSpectrum, 0, 255, rMax * 0.05, rMax * 0.15);
    }
    let smoothingFactor = 0.2;
    if (i < numPoints * smoothingFactor) {
      radius = lerp(
        dynamicMinRadius,
        radius,
        i / (numPoints * smoothingFactor)
      );
    }

    let x = radius * cos(angle);
    let y = radius * sin(angle);
    vertex(x, y);
  }
  endShape(CLOSE);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////// FLOW FIELD //////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const NUM_PARTICLES = 50;
const MAX_COLOR_HISTORY = 50;
let colorHistory = [];
let offscreenGraphics;
let smokeyParticles = [];
let flowField;

class SmokeParticle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.prevPos = this.pos.copy();
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
    this.size = 2;
    this.history = [];
    this.colorHistory = [];
  }

  move(acc) {
    if (acc) {
      this.acc.add(acc);
    }

    this.vel.add(this.acc);
    this.pos.add(this.vel);

    this.vel.mult(1 + amplitude.getLevel() * 2);

    this.acc.mult(0);

    if (this.vel.mag() > 3) {
      this.vel.setMag(3);
    }
  }

  show() {
    this.history.push(this.pos.copy());
    this.colorHistory.push(visualiserColor);

    if (this.history.length > MAX_COLOR_HISTORY) {
      this.history.shift();
      this.colorHistory.shift();
    }

    for (let i = 0; i < this.history.length - 1; i++) {
      let startPos = this.history[i];
      let endPos = this.history[i + 1];
      let segmentColor = this.colorHistory[i];

      let alphaValue = map(i, 0, this.history.length, 0, 255);
      let strokeSize = map(i, 0, this.history.length, 1, 4);

      let nextSegmentColor = this.colorHistory[i + 1];
      let gradientColor = lerpColor(segmentColor, nextSegmentColor, 0.5);

      offscreenGraphics.stroke(
        gradientColor.levels[0],
        gradientColor.levels[1],
        gradientColor.levels[2],
        alphaValue
      );

      offscreenGraphics.strokeWeight(strokeSize);
      offscreenGraphics.line(startPos.x, startPos.y, endPos.x, endPos.y);
    }

    this.prevPos = this.pos.copy();
  }

  wrap() {
    if (this.pos.x > width + this.size) {
      this.pos.x = 0;
      this.prevPos.x = this.pos.x;
      this.history = [];
    } else if (this.pos.x < -this.size) {
      this.pos.x = width;
      this.prevPos.x = this.pos.x;
      this.history = [];
    }

    if (this.pos.y > height + this.size) {
      this.pos.y = 0;
      this.prevPos.y = this.pos.y;
      this.history = [];
    } else if (this.pos.y < -this.size) {
      this.pos.y = height;
      this.prevPos.y = this.pos.y;
      this.history = [];
    }
  }
}

class FlowField {
  constructor(resolution) {
    this.resolution = resolution;
    this.cols = Math.floor(width / this.resolution);
    this.rows = Math.floor(height / this.resolution);
    this.field = new Array(this.cols)
      .fill(null)
      .map(() => new Array(this.rows).fill(createVector()));
  }

  update() {
    worker.postMessage({
      cmd: 'updateFlowField',
      cols: this.cols,
      rows: this.rows,
      resolution: this.resolution,
      amplitudeLevel: amplitude.getLevel(),
    });
  }

  lookup(lookup) {
    const column = Math.floor(
      constrain(lookup.x / this.resolution, 0, this.cols - 1)
    );
    const row = Math.floor(
      constrain(lookup.y / this.resolution, 0, this.rows - 1)
    );
    return createVector(this.field[column][row].x, this.field[column][row].y);
  }
}

function setupSmokeyFlow() {
  colorMode(HSL);
  flowField = new FlowField(15);
  for (let i = 0; i < NUM_PARTICLES; i++) {
    let x = random(width);
    let y = random(height);
    smokeyParticles.push(new SmokeParticle(x, y));
  }

  offscreenGraphics = createGraphics(width, height);
}

function drawSmokeyFlow() {
  if (!isMusicPlaying) return;

  offscreenGraphics.blendMode(BLEND);
  offscreenGraphics.noStroke();
  offscreenGraphics.fill(0, 25);
  offscreenGraphics.rect(0, 0, width, height);

  if (flowField) {
    flowField.update();

    smokeyParticles.forEach((particle) => {
      particle.move(flowField.lookup(particle.pos));
      particle.show();
      particle.wrap();
    });
  }

  image(offscreenGraphics, 0, 0);
}

////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////

function drawCCMandala(spectrum) {
  let currentAmplitude = amplitude.getLevel();
  let numSegments = map(currentAmplitude, 0, 1, 6, 12);
  let angleOffset = TWO_PI / numSegments;
  let currentChroma;
  if (meydaAnalyzer) {
    currentChroma = meydaAnalyzer.get('chroma');
  }

  push();
  translate(width / 2, height / 2);
  for (let i = 0; i < numSegments; i++) {
    push();
    rotate(angleOffset * i);
    drawMandalaSegment(spectrum, currentAmplitude, currentChroma);
    scale(1, -1); // Mirror the segment vertically
    drawMandalaSegment(spectrum, currentAmplitude, currentChroma);
    pop();
  }
  pop();
}

function drawMandalaSegment(spectrum, currentAmplitude, currentChroma) {
  noFill();
  let rMax = max(width, height);
  for (let r = rMax; r > 10; r -= 20) {
    let index = floor(map(r, 10, rMax, 0, spectrum.length - 1));
    let size = map(spectrum[index], 0, 255, 5, 25);
    let moodColor = mapAmplitudeToColor(
      currentAmplitude + (r / rMax) * 0.5,
      currentChroma
    );
    let clr = color(moodColor.r, moodColor.g, moodColor.b);
    stroke(clr);
    let numPoints = map(spectrum[index], 0, 255, 6, 24);
    beginShape();
    for (let i = 0; i < numPoints; i++) {
      let angle = map(i, 0, numPoints, 0, TWO_PI);
      let innerRadius = r - 10;
      let outerRadius = r;
      let radius = i % 2 === 0 ? outerRadius : innerRadius;
      let x = radius * cos(angle);
      let y = radius * sin(angle);
      vertex(x, y);
    }
    endShape(CLOSE);
  }
}

document
  .getElementById('musicUpload')
  .addEventListener('change', function (event) {
    if (song) {
      song.stop();
    }

    smokeyParticles = [];
    setupSmokeyFlow();

    song = loadSound(URL.createObjectURL(event.target.files[0]), function () {
      document.getElementById('playButton').disabled = false;
    });
  });

document.getElementById('musicUpload').addEventListener('change', function () {
  var filename = this.value.split('\\').pop();
  document.getElementById('songNameDisplay').innerText = filename;
});

function updateProgressBar() {
  if (song && song.isPlaying()) {
    let currentTime = song.currentTime();
    let duration = song.duration();
    let progressPercentage = (currentTime / duration) * 100;

    document.getElementById('progressBar').style.width =
      progressPercentage + '%';
    document.getElementById('elapsedTime').innerText = formatTime(currentTime);
    document.getElementById('remainingTime').innerText = formatTime(
      duration - currentTime
    );
  }
}

function formatTime(seconds) {
  let min = Math.floor(seconds / 60);
  let sec = Math.floor(seconds % 60);
  return min + ':' + (sec < 10 ? '0' : '') + sec;
}

setInterval(updateProgressBar, 1000);

document
  .getElementById('progressContainer')
  .addEventListener('click', function (event) {
    if (song && song.buffer) {
      let clickPosition = event.offsetX;
      let containerWidth = this.offsetWidth;
      let newProgressPercentage = clickPosition / containerWidth;
      let newTime = song.duration() * newProgressPercentage;

      background(backgroundColor);

      if (offscreenGraphics) {
        offscreenGraphics.clear();
        offscreenGraphics.background(backgroundColor);
      }

      particleBuffer.clear();
      particleBuffer.background(backgroundColor);

      fallingParticles = [];
      smokeyParticles.forEach((particle) => {
        particle.history = [];
        particle.colorHistory = [];
        particle.pos = createVector(random(width), random(height));
        particle.prevPos = particle.pos.copy();
      });

      song.jump(newTime);
    }
  });
