const fs = require('fs');

// Audio Format Constants
const sampleRate = 22050; // 22.05 kHz
const duration = 12; // 12 seconds loopable track
const numSamples = sampleRate * duration;
const numChannels = 1;
const bytesPerSample = 2; // 16-bit PCM

const dataSize = numSamples * numChannels * bytesPerSample;
const buffer = Buffer.alloc(44 + dataSize);

// Write WAV Header
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16); // Subchunk1Size
buffer.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
buffer.writeUInt16LE(numChannels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28); // ByteRate
buffer.writeUInt16LE(numChannels * bytesPerSample, 32); // BlockAlign
buffer.writeUInt16LE(bytesPerSample * 8, 34); // BitsPerSample
buffer.write('data', 36);
buffer.writeUInt32LE(dataSize, 40);

// Generate Procedural Epic War Drums & Brass Chords (Warcraft / League Style Loop)
const bpm = 120;
const beatInterval = sampleRate * (60 / bpm);

for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  let sample = 0;

  // 1. Heavy War Drums (Kick & Timpani on beats)
  const beatPhase = i % beatInterval;
  const beatNum = Math.floor(i / beatInterval);
  
  // Heavy Bass Drum on every beat
  if (beatPhase < sampleRate * 0.3) {
    const drumT = beatPhase / sampleRate;
    const freq = 120 * Math.exp(-drumT * 25);
    const drumVal = Math.sin(2 * Math.PI * freq * drumT) * Math.exp(-drumT * 12);
    sample += drumVal * 0.55;
  }

  // Snare / Metal March Percussion on beats 2 & 4
  if ((beatNum % 2 === 1) && beatPhase < sampleRate * 0.2) {
    const noiseT = beatPhase / sampleRate;
    const noise = (Math.random() * 2 - 1) * Math.exp(-noiseT * 18);
    sample += noise * 0.3;
  }

  // 2. Epic Brass / Horn Chords Progression (Low D Minor -> F -> C -> G Minor)
  const chordProg = [
    [146.83, 174.61, 220.00], // D Minor (D3, F3, A3)
    [174.61, 220.00, 261.63], // F Major (F3, A3, C4)
    [130.81, 164.81, 196.00], // C Major (C3, E3, G3)
    [116.54, 146.83, 174.61]  // Bb Major (Bb2, D3, F3)
  ];
  const chordIdx = Math.floor(t / 3) % chordProg.length;
  const currentChord = chordProg[chordIdx];

  currentChord.forEach((freq) => {
    // Sawtooth / Brass wave warmth
    const phase = (t * freq) % 1;
    const saw = (2 * phase - 1);
    const subSub = Math.sin(2 * Math.PI * (freq / 2) * t);
    sample += (saw * 0.12 + subSub * 0.15) * 0.4;
  });

  // 3. Dark Anvil / Cymbal accent at chord changes
  if (i % (sampleRate * 3) < sampleRate * 0.4) {
    const anvilT = (i % (sampleRate * 3)) / sampleRate;
    const metallicFreq = Math.sin(2 * Math.PI * 1850 * anvilT) + Math.sin(2 * Math.PI * 2420 * anvilT);
    sample += metallicFreq * Math.exp(-anvilT * 8) * 0.12;
  }

  // Master Volume Clipping Prevention & 16-bit PCM Conversion
  const clamped = Math.max(-1, Math.min(1, sample));
  const pcmVal = Math.floor(clamped * 32767);
  buffer.writeInt16LE(pcmVal, 44 + i * 2);
}

fs.writeFileSync('/home/milan/Projects/monster/public/sounds/lobby_war.wav', buffer);
console.log('Epic War Theme generated successfully at public/sounds/lobby_war.wav');
