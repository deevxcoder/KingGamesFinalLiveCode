/**
 * Sound utilities for the game
 * Uses HTML Audio API with fallback to Web Audio API
 */

// Sound mute state
let isMuted = false;

// Audio context for sound generation fallback
let audioContext: AudioContext | null = null;

// Audio buffers to hold preloaded WAV files
let coinFlipBuffer: AudioBuffer | null = null;
let winSoundBuffer: AudioBuffer | null = null;

// Audio elements (more compatible with browsers but less reliable)
let coinFlipAudio: HTMLAudioElement | null = null;
let winAudio: HTMLAudioElement | null = null;

/**
 * Detect if Web Audio API is available
 */
function hasAudioSupport(): boolean {
  return typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined';
}

/**
 * Initialize audio (must be called after user interaction)
 */
export function initAudio() {
  try {
    // Initialize HTML audio elements
    if (!coinFlipAudio) {
      coinFlipAudio = new Audio('/sounds/coin-flip-sound.wav');
      coinFlipAudio.preload = 'auto';
    }
    
    if (!winAudio) {
      // For win sound, we'll continue to generate it via Web Audio API
      winAudio = new Audio();
      winAudio.src = '/sounds/coin-flip-sound.wav'; // Can also use the same sound for win
    }
    
    // Also initialize Web Audio as fallback and for effects
    if (!audioContext && hasAudioSupport()) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Preload coin flip WAV file
      fetch('/sounds/coin-flip-sound.wav')
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => {
          if (audioContext) {
            return audioContext.decodeAudioData(arrayBuffer);
          }
          return null;
        })
        .then(buffer => {
          if (buffer) {
            coinFlipBuffer = buffer;
          }
        })
        .catch(error => {
          console.error('Error loading coin flip sound:', error);
        });
    }
    
    console.log('Audio initialized');
  } catch (error) {
    console.error('Failed to initialize audio:', error);
  }
  
  return audioContext;
}

/**
 * Toggle the mute state
 */
export function toggleMute() {
  isMuted = !isMuted;
  return isMuted;
}

/**
 * Get the current mute state
 */
export function isSoundMuted() {
  return isMuted;
}

/**
 * Play an HTML audio element with fallback to Audio API
 */
function playAudio(audio: HTMLAudioElement | null, fallbackFn: () => void) {
  if (isMuted) return;
  
  if (audio) {
    try {
      // Reset the audio to the beginning
      audio.currentTime = 0;
      audio.volume = 0.8;
      
      // Play the sound
      const playPromise = audio.play();
      
      // Handle play promise (might be rejected by some browsers)
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Error playing HTML audio:', error);
          // Fallback to Web Audio API
          fallbackFn();
        });
      }
    } catch (error) {
      console.error('Error playing HTML audio element:', error);
      // Fallback to Web Audio API
      fallbackFn();
    }
  } else {
    // If no audio element, use fallback
    fallbackFn();
  }
}

/**
 * Play coin flip sound using Web Audio API (fallback)
 */
function playCoinFlipFallback() {
  if (isMuted || !audioContext) return;
  
  try {
    if (coinFlipBuffer) {
      // Use preloaded buffer if available
      const source = audioContext.createBufferSource();
      source.buffer = coinFlipBuffer;
      source.connect(audioContext.destination);
      source.start();
      return;
    }
    
    // Create short metallic sound if buffer not available
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (error) {
    console.error('Error playing coin flip fallback sound:', error);
  }
}

/**
 * Play a win sound using Web Audio API (fallback)
 */
function playWinFallback() {
  if (isMuted || !audioContext) return;
  
  try {
    // Create a cheerful win sound
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // First oscillator - higher note
    oscillator1.type = 'sine';
    oscillator1.frequency.setValueAtTime(500, audioContext.currentTime);
    oscillator1.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    oscillator1.frequency.setValueAtTime(700, audioContext.currentTime + 0.2);
    oscillator1.frequency.setValueAtTime(800, audioContext.currentTime + 0.3);
    
    // Second oscillator - harmony
    oscillator2.type = 'sine';
    oscillator2.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator2.frequency.setValueAtTime(500, audioContext.currentTime + 0.1);
    oscillator2.frequency.setValueAtTime(600, audioContext.currentTime + 0.2);
    oscillator2.frequency.setValueAtTime(700, audioContext.currentTime + 0.3);
    
    // Gain envelope
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime + 0.2);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator1.start();
    oscillator2.start();
    oscillator1.stop(audioContext.currentTime + 0.5);
    oscillator2.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.error('Error playing win fallback sound:', error);
  }
}

/**
 * Play a coin flip sound
 */
export function playCoinFlipSound() {
  if (!coinFlipAudio || !audioContext) {
    initAudio();
  }
  
  playAudio(coinFlipAudio, playCoinFlipFallback);
}

/**
 * Play a win sound
 */
export function playWinSound() {
  if (!winAudio || !audioContext) {
    initAudio();
  }
  
  playAudio(winAudio, playWinFallback);
}

/**
 * Placeholder for losing sound - not used as per user request
 * We keep the function for API consistency but it doesn't do anything
 */
export function playLoseSound() {
  // No sound played for losses as requested by the user
  return;
}