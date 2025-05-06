/**
 * Sound utilities for the game
 * Uses Web Audio API to play sound effects
 */

// Audio context for sound generation
let audioContext: AudioContext | null = null;
// Sound mute state
let isMuted = false;

// Audio buffer cache
const audioBufferCache: { [key: string]: AudioBuffer } = {};

/**
 * Initialize the audio context (must be called after user interaction)
 */
export function initAudio() {
  if (!audioContext) {
    try {
      audioContext = new AudioContext();
      console.log('Audio context initialized');
      
      // Preload sound files
      loadSound('/sounds/coin-flip-sound.mp3');
      loadSound('/sounds/coin-flip-win.mp3');
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }
  return audioContext;
}

/**
 * Load a sound file and cache it
 */
async function loadSound(url: string): Promise<AudioBuffer | null> {
  if (!audioContext) return null;
  
  // If already cached, return from cache
  if (audioBufferCache[url]) {
    return audioBufferCache[url];
  }
  
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    
    return new Promise((resolve, reject) => {
      if (!audioContext) {
        reject('Audio context not initialized');
        return;
      }
      
      audioContext.decodeAudioData(
        arrayBuffer,
        (buffer) => {
          audioBufferCache[url] = buffer;  // Cache the decoded audio
          resolve(buffer);
        },
        (error) => {
          console.error('Error decoding audio data:', error);
          reject(error);
        }
      );
    });
  } catch (error) {
    console.error('Error loading sound:', error);
    return null;
  }
}

/**
 * Play a sound from URL
 */
async function playSound(url: string, volume: number = 1.0): Promise<void> {
  if (isMuted || !audioContext) return;
  
  try {
    // Get audio buffer (load if needed)
    let buffer = audioBufferCache[url];
    if (!buffer) {
      buffer = await loadSound(url);
      if (!buffer) return;
    }
    
    // Create audio source
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    
    // Create gain node for volume control
    const gainNode = audioContext.createGain();
    gainNode.gain.value = volume;
    
    // Connect nodes
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Play the sound
    source.start(0);
  } catch (error) {
    console.error('Error playing sound:', error);
  }
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
 * Play a coin flip sound
 */
export function playCoinFlipSound() {
  playSound('/sounds/coin-flip-sound.mp3', 0.8);
}

/**
 * Play a win sound
 */
export function playWinSound() {
  playSound('/sounds/coin-flip-win.mp3', 0.8);
}

/**
 * Play a lose sound
 */
export function playLoseSound() {
  // Since you didn't provide a lose sound, let's create a simple one
  if (isMuted || !audioContext) return;
  
  try {
    // Create a sad lose sound
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // First oscillator - main descending tone
    oscillator1.type = 'sine';
    oscillator1.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator1.frequency.linearRampToValueAtTime(200, audioContext.currentTime + 0.3);
    
    // Second oscillator - dissonant lower tone
    oscillator2.type = 'sine';
    oscillator2.frequency.setValueAtTime(380, audioContext.currentTime);
    oscillator2.frequency.linearRampToValueAtTime(190, audioContext.currentTime + 0.3);
    
    // Gain envelope
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.4);
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator1.start();
    oscillator2.start();
    oscillator1.stop(audioContext.currentTime + 0.4);
    oscillator2.stop(audioContext.currentTime + 0.4);
  } catch (error) {
    console.error('Error playing lose sound:', error);
  }
}