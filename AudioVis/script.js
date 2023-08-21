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
      drawCircularWaveform(spectrum);
      break;
    case 'waves':
      drawWaves(spectrum);
      break;
    case 'particlesFall':
      drawParticlesFall();
      break;
    case 'particlesEruption':
      drawParticleEruptions();
      break;
    case 'mandala':
      drawMandala(spectrum);
      break;
  }
}

function drawBars(spectrum) {
  for (let i = 0; i < spectrum.length; i++) {
    let x = map(i, 0, spectrum.length, 0, width);
    let h = -height + map(spectrum[i], 0, 255, height, 0);
    rect(x, height, width / spectrum.length, h);
  }
}

function drawCircularWaveform() {
  let waveformData = fft.waveform();

  // Average the first and last points for a seamless connection
  let avgValue = (waveformData[0] + waveformData[waveformData.length - 1]) / 2;
  waveformData[0] = avgValue;
  waveformData[waveformData.length - 1] = avgValue;

  // Filling the waveform with the mood color
  fill(visualiserColor);
  beginShape();
  for (let i = 0; i < waveformData.length; i++) {
    // Calculate the angle and radius for each point with an offset to start from the correct south point
    let angle = map(i, 0, waveformData.length, 0.5 * PI, 2.5 * PI);

    // Adjusted size of the circle
    let rad = map(waveformData[i], -1, 1, width / 6, width / 4);

    // Convert polar coordinates to Cartesian coordinates
    let x = width / 2 + rad * cos(angle);
    let y = height / 2 + rad * sin(angle);
    vertex(x, y);
  }
  endShape(CLOSE);
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
    fill(this.color);
    noStroke();
    ellipse(this.position.x, this.position.y, this.radius * 2);
  }

  offScreen() {
    return this.position.y > height + 50;
  }
}

let fallingParticles = [];

function drawParticlesFall() {
  // Get amplitude from p5's amplitude analyzer
  let level = amplitude.getLevel();
  let spectrum = fft.analyze();

  // Create particles based on amplitude
  if (random(1) < level) {
    let particle = new Particle(
      random(width),
      0,
      map(level, 0, 1, 5, 50),
      visualiserColor
    );
    fallingParticles.push(particle);
  }

  // Move and render particles
  for (let i = fallingParticles.length - 1; i >= 0; i--) {
    fallingParticles[i].move();
    fallingParticles[i].show();

    // Remove off-screen particles
    if (fallingParticles[i].offScreen()) {
      fallingParticles.splice(i, 1);
    }
  }
}

class EruptionParticle {
  constructor(x, y, color) {
    this.position = createVector(x, y);
    this.velocity = p5.Vector.random2D().mult(random(2, 7));
    this.acceleration = createVector(0, 0);
    this.lifeSpan = 600;
    this.color = color;
  }

  move() {
    this.velocity.add(this.acceleration);
    this.position.add(this.velocity);
    this.lifeSpan -= 2;
  }

  show() {
    fill(red(this.color), green(this.color), blue(this.color), this.lifeSpan);
    noStroke();
    ellipse(this.position.x, this.position.y, 5);
  }

  isDead() {
    return this.lifeSpan <= 0;
  }
}

let eruptionParticles = [];
let prevLevel = 0;
const AMPLITUDE_THRESHOLD = 0.05;

function drawParticleEruptions() {
  // Get current amplitude level
  let level = amplitude.getLevel();

  // Detect a sudden spike in amplitude
  if (level - prevLevel > AMPLITUDE_THRESHOLD) {
    for (let i = 0; i < 100; i++) {
      let particle = new EruptionParticle(
        width / 2,
        height / 2,
        visualiserColor
      );
      eruptionParticles.push(particle);
    }
  }
  prevLevel = level;

  // Move and render eruption particles
  for (let i = eruptionParticles.length - 1; i >= 0; i--) {
    eruptionParticles[i].move();
    eruptionParticles[i].show();

    // Remove dead particles
    if (eruptionParticles[i].isDead()) {
      eruptionParticles.splice(i, 1);
    }
  }
}

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
    scale(1, -1); // Mirror the segment vertically
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
    let x = radius * cos(angle);
    let y = radius * sin(angle);
    vertex(x, y);
  }
  endShape(CLOSE);
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

      song.jump(newTime);
    }
  });
