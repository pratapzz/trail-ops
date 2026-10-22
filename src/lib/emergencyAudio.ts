/**
 * TRAIL OPS — Emergency Web Audio Siren & Haptic Vibration Engine
 * Generates an urgent, continuous multi-tone oscillating emergency siren entirely
 * in the browser using the Web Audio API with zero external audio assets.
 */

let audioCtx: AudioContext | null = null;
let carrierOsc: OscillatorNode | null = null;
let modOsc: OscillatorNode | null = null;
let modGain: GainNode | null = null;
let masterGain: GainNode | null = null;
let isSirenActive = false;
let vibrationInterval: any = null;

export function isAudioSirenPlaying(): boolean {
  return isSirenActive;
}

export function startEmergencySiren(): void {
  if (isSirenActive) return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('Web Audio API not supported on this browser.');
      return;
    }

    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
      const resumeOnGesture = () => {
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }
      };
      window.addEventListener('click', resumeOnGesture, { once: true });
      window.addEventListener('touchstart', resumeOnGesture, { once: true });
      window.addEventListener('pointerdown', resumeOnGesture, { once: true });
    }

    // Master volume gain
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.85, audioCtx.currentTime + 0.15);
    masterGain.connect(audioCtx.destination);

    // Modulation oscillator (LFO that creates the rising-and-falling siren sweep)
    modOsc = audioCtx.createOscillator();
    modOsc.type = 'sawtooth';
    modOsc.frequency.setValueAtTime(2.2, audioCtx.currentTime); // 2.2 Hz sweep rate

    // Modulation gain (amplitude of frequency sweep in Hz)
    modGain = audioCtx.createGain();
    modGain.gain.setValueAtTime(350, audioCtx.currentTime); // sweeps +/- 350 Hz

    // Main carrier tone (center frequency at 950 Hz)
    carrierOsc = audioCtx.createOscillator();
    carrierOsc.type = 'square'; // penetrating acoustic square wave
    carrierOsc.frequency.setValueAtTime(950, audioCtx.currentTime);

    // Route: LFO -> modGain -> carrierOsc.frequency
    modOsc.connect(modGain);
    modGain.connect(carrierOsc.frequency);

    // Route: carrierOsc -> masterGain -> output
    carrierOsc.connect(masterGain);

    const now = audioCtx.currentTime;
    modOsc.start(now);
    carrierOsc.start(now);

    isSirenActive = true;

    // Start mobile device vibration pattern
    startEmergencyVibration();
  } catch (err) {
    console.warn('Failed to start emergency audio siren:', err);
  }
}

export function stopEmergencySiren(): void {
  if (!isSirenActive) {
    stopEmergencyVibration();
    return;
  }

  isSirenActive = false;

  try {
    if (carrierOsc) {
      try {
        carrierOsc.stop();
        carrierOsc.disconnect();
      } catch {}
      carrierOsc = null;
    }
    if (modOsc) {
      try {
        modOsc.stop();
        modOsc.disconnect();
      } catch {}
      modOsc = null;
    }
    if (modGain) {
      try {
        modGain.disconnect();
      } catch {}
      modGain = null;
    }
    if (masterGain) {
      try {
        masterGain.disconnect();
      } catch {}
      masterGain = null;
    }
    stopEmergencyVibration();
  } catch (err) {
    console.warn('Error stopping emergency siren:', err);
    stopEmergencyVibration();
  }
}

export function startEmergencyVibration(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      // Emergency SOS Morse-inspired pulsing vibration
      navigator.vibrate([500, 200, 500, 200, 1000, 400]);
      if (vibrationInterval) clearInterval(vibrationInterval);
      vibrationInterval = setInterval(() => {
        if (isSirenActive && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([500, 200, 500, 200, 1000, 400]);
        } else {
          clearInterval(vibrationInterval);
          vibrationInterval = null;
        }
      }, 3000);
    } catch (e) {
      // Haptics unavailable or restricted by browser
    }
  }
}

export function stopEmergencyVibration(): void {
  if (vibrationInterval) {
    clearInterval(vibrationInterval);
    vibrationInterval = null;
  }
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch (e) {
      // ignore
    }
  }
}
