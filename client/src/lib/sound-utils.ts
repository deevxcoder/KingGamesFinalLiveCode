/**
 * Sound utilities for the game
 * Uses Web Audio API to generate simple sound effects
 */

// Audio context for sound generation
let audioContext: AudioContext | null = null;
// Sound mute state
let isMuted = false;

/**
 * Initialize the audio context (must be called after user interaction)
 */
export function initAudio() {
  if (!audioContext) {
    try {
      audioContext = new AudioContext();
      console.log('Audio context initialized');
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
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
 * Play a coin flip sound
 */
export function playCoinFlipSound() {
  if (isMuted) return;
  
  const ctx = initAudio();
  if (!ctx) return;
  
  try {
    // Create more complex metallic sound (like a real coin)
    const oscillator1 = ctx.createOscillator();
    const oscillator2 = ctx.createOscillator();
    const filterNode = ctx.createBiquadFilter();
    const gainNode = ctx.createGain();
    
    // First oscillator - base flip sound
    oscillator1.type = 'triangle';
    oscillator1.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator1.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
    
    // Second oscillator - metal "ping" effect
    oscillator2.type = 'sine';
    oscillator2.frequency.setValueAtTime(1200, ctx.currentTime);
    oscillator2.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.05);
    
    // Filter for more metallic sound
    filterNode.type = 'bandpass';
    filterNode.frequency.setValueAtTime(800, ctx.currentTime);
    filterNode.Q.value = 7.0;
    
    // Amplitude envelope
    gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    // Connect nodes
    oscillator1.connect(filterNode);
    oscillator2.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Play sounds
    oscillator1.start();
    oscillator2.start();
    oscillator1.stop(ctx.currentTime + 0.3);
    oscillator2.stop(ctx.currentTime + 0.3);
  } catch (error) {
    console.error('Error playing coin flip sound:', error);
  }
}

/**
 * Play a win sound
 */
export function playWinSound() {
  if (isMuted) return;
  
  const ctx = initAudio();
  if (!ctx) return;
  
  try {
    // Create a more exciting win sound
    const oscillator1 = ctx.createOscillator();
    const oscillator2 = ctx.createOscillator();
    const oscillator3 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // First oscillator - ascending notes
    oscillator1.type = 'sine';
    oscillator1.frequency.setValueAtTime(440, ctx.currentTime); // A4
    oscillator1.frequency.setValueAtTime(523.25, ctx.currentTime + 0.1); // C5
    oscillator1.frequency.setValueAtTime(659.25, ctx.currentTime + 0.2); // E5
    oscillator1.frequency.setValueAtTime(880, ctx.currentTime + 0.3); // A5
    
    // Second oscillator - harmony
    oscillator2.type = 'triangle';
    oscillator2.frequency.setValueAtTime(440 * 1.5, ctx.currentTime + 0.1);
    oscillator2.frequency.setValueAtTime(523.25 * 1.5, ctx.currentTime + 0.2);
    oscillator2.frequency.setValueAtTime(659.25 * 1.5, ctx.currentTime + 0.3);
    
    // Third oscillator - decorative trill
    oscillator3.type = 'sine';
    oscillator3.frequency.setValueAtTime(880 * 2, ctx.currentTime + 0.3);
    oscillator3.frequency.setValueAtTime(1046.50 * 2, ctx.currentTime + 0.35);
    oscillator3.frequency.setValueAtTime(1318.51 * 2, ctx.currentTime + 0.4);
    
    // Gain envelope
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.2);
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.4);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.7);
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    oscillator3.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator1.start();
    oscillator2.start(ctx.currentTime + 0.05);
    oscillator3.start(ctx.currentTime + 0.3);
    
    oscillator1.stop(ctx.currentTime + 0.7);
    oscillator2.stop(ctx.currentTime + 0.7);
    oscillator3.stop(ctx.currentTime + 0.7);
  } catch (error) {
    console.error('Error playing win sound:', error);
  }
}

/**
 * Play a lose sound
 */
export function playLoseSound() {
  if (isMuted) return;
  
  const ctx = initAudio();
  if (!ctx) return;
  
  try {
    // Create a sad lose sound
    const oscillator1 = ctx.createOscillator();
    const oscillator2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // First oscillator - main descending tone
    oscillator1.type = 'sine';
    oscillator1.frequency.setValueAtTime(400, ctx.currentTime);
    oscillator1.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.3);
    
    // Second oscillator - dissonant lower tone
    oscillator2.type = 'sine';
    oscillator2.frequency.setValueAtTime(380, ctx.currentTime);
    oscillator2.frequency.linearRampToValueAtTime(190, ctx.currentTime + 0.3);
    
    // Gain envelope
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator1.start();
    oscillator2.start();
    oscillator1.stop(ctx.currentTime + 0.4);
    oscillator2.stop(ctx.currentTime + 0.4);
  } catch (error) {
    console.error('Error playing lose sound:', error);
  }
}