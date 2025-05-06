/**
 * Sound utilities for the game
 * Uses Web Audio API to generate sound effects directly
 */

// Sound mute state
let isMuted = false;

// Audio context for sound generation (shared)
let audioContext: AudioContext | null = null;

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
    // Create short metallic sound
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.2);
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
    // Create a cheerful win sound
    const oscillator1 = ctx.createOscillator();
    const oscillator2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // First oscillator - higher note
    oscillator1.type = 'sine';
    oscillator1.frequency.setValueAtTime(500, ctx.currentTime);
    oscillator1.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
    oscillator1.frequency.setValueAtTime(700, ctx.currentTime + 0.2);
    oscillator1.frequency.setValueAtTime(800, ctx.currentTime + 0.3);
    
    // Second oscillator - harmony
    oscillator2.type = 'sine';
    oscillator2.frequency.setValueAtTime(400, ctx.currentTime);
    oscillator2.frequency.setValueAtTime(500, ctx.currentTime + 0.1);
    oscillator2.frequency.setValueAtTime(600, ctx.currentTime + 0.2);
    oscillator2.frequency.setValueAtTime(700, ctx.currentTime + 0.3);
    
    // Gain envelope
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime + 0.2);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator1.start();
    oscillator2.start();
    oscillator1.stop(ctx.currentTime + 0.5);
    oscillator2.stop(ctx.currentTime + 0.5);
  } catch (error) {
    console.error('Error playing win sound:', error);
  }
}

/**
 * Placeholder for losing sound - not used as per user request
 * We keep the function for API consistency but it doesn't do anything
 */
export function playLoseSound() {
  // No sound played for losses as requested by the user
  return;
}