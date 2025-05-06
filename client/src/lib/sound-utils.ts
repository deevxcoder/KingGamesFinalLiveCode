/**
 * Sound utilities for the game
 * Uses Web Audio API to generate simple sound effects
 */

// Audio context for sound generation
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
 * Play a coin flip sound
 */
export function playCoinFlipSound() {
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
 * Play a lose sound
 */
export function playLoseSound() {
  const ctx = initAudio();
  if (!ctx) return;
  
  try {
    // Create a sad lose sound
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(300, ctx.currentTime);
    oscillator.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.3);
  } catch (error) {
    console.error('Error playing lose sound:', error);
  }
}