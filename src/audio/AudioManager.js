import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

/**
 * Manages audio loading and playback within the game.
 */
export class AudioManager {
    constructor(camera) {
        if (!camera) {
            console.error("AudioManager requires a camera to attach the listener.");
            return;
        }
        // Create an AudioListener and add it to the camera
        this.listener = new THREE.AudioListener();
        camera.add(this.listener);

        // Audio loader
        this.audioLoader = new THREE.AudioLoader();
        
        this.ambientSound = null; // To hold the loaded ambient sound
        this.soundCache = {}; // Cache for loaded sounds

        console.log("AudioManager initialized.");
    }

    /**
     * Loads the main ambient background sound.
     * @param {string} filePath - Path to the audio file.
     * @param {number} volume - Playback volume (0 to 1).
     * @param {function} [onLoadCallback] - Optional callback when loading is complete.
     */
    loadAmbientSound(filePath, volume = 0.5, onLoadCallback) {
        console.log(`Loading ambient sound from: ${filePath}`);
        this.audioLoader.load(
            filePath,
            // onLoad callback
            (buffer) => {
                console.log("Ambient sound loaded successfully.");
                // Create a global audio source
                this.ambientSound = new THREE.Audio(this.listener);
                this.ambientSound.setBuffer(buffer);
                this.ambientSound.setLoop(true);
                this.ambientSound.setVolume(volume);
                
                if (onLoadCallback) {
                    onLoadCallback();
                }
            },
            // onProgress callback (optional)
            (xhr) => {
                // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            // onError callback
            (err) => {
                console.error('An error happened while loading the ambient sound:', err);
            }
        );
    }

    /**
     * Plays the loaded ambient sound if it exists.
     */
    playAmbientSound() {
        if (this.ambientSound && !this.ambientSound.isPlaying) {
            console.log("Playing ambient sound.");
            // Play the sound. User interaction might be required first time on some browsers.
             try {
                this.ambientSound.play();
            } catch (error) {
                console.error("Error playing ambient sound:", error);
                console.warn("Audio playback might require user interaction (e.g., a click) to start.");
                // Optionally, add a button or listener to start audio on user interaction
                 this._addInteractionListener();
            }
        } else if (!this.ambientSound) {
            console.warn("Ambient sound not loaded yet, cannot play.");
        } else if (this.ambientSound.isPlaying) {
             console.log("Ambient sound is already playing.");
        }
    }

    /**
     * Stops the ambient sound if playing.
     */
    stopAmbientSound() {
        if (this.ambientSound && this.ambientSound.isPlaying) {
            console.log("Stopping ambient sound.");
            this.ambientSound.stop();
        }
    }
    
    /**
     * Sets the volume for the ambient sound.
     * @param {number} volume - Volume level (0 to 1).
     */
    setAmbientVolume(volume) {
        if (this.ambientSound) {
            this.ambientSound.setVolume(Math.max(0, Math.min(1, volume))); // Clamp volume between 0 and 1
        }
    }

    /**
     * Loads and plays a sound effect once.
     * Caches loaded sounds for efficiency.
     * @param {string} filePath - Path to the audio file.
     * @param {number} [volume=0.5] - Playback volume (0 to 1).
     * @param {boolean} [positional=false] - If true, create a PositionalAudio.
     * @param {THREE.Object3D} [sourceObject=null] - If positional, the object emitting the sound.
     */
    playSound(filePath, volume = 0.5, positional = false, sourceObject = null) {
        // Check cache first
        if (this.soundCache[filePath]) {
            this._playCachedSound(this.soundCache[filePath], volume, positional, sourceObject);
            return;
        }

        console.log(`Loading sound effect: ${filePath}`);
        this.audioLoader.load(
            filePath,
            (buffer) => {
                console.log(`Sound effect loaded: ${filePath}`);
                // Cache the buffer
                this.soundCache[filePath] = buffer;
                this._playCachedSound(buffer, volume, positional, sourceObject);
            },
            undefined, // onProgress not needed for short sounds
            (err) => {
                console.error(`Error loading sound effect ${filePath}:`, err);
            }
        );
    }

    _playCachedSound(buffer, volume, positional, sourceObject) {
        let sound;
        if (positional && sourceObject) {
            // Create positional audio attached to the source object
            sound = new THREE.PositionalAudio(this.listener);
            sourceObject.add(sound); // Attach sound to the object
        } else {
            // Create non-positional (global) audio
            sound = new THREE.Audio(this.listener);
        }

        sound.setBuffer(buffer);
        sound.setLoop(false);
        sound.setVolume(volume);
        
        // Ensure audio context is running
        if (this.listener.context.state === 'suspended') {
            this.listener.context.resume().then(() => {
                console.log("Audio context resumed for sound effect.");
                sound.play();
                // Optional: Clean up positional sound after playing if needed
                if (positional && sourceObject) {
                    sound.onEnded = () => {
                        sourceObject.remove(sound);
                        // console.log("Removed positional sound after playing.");
                    };
                }
            }).catch(e => console.error("Error resuming audio context for sound effect:", e));
        } else {
            sound.play();
             // Optional: Clean up positional sound after playing if needed
             if (positional && sourceObject) {
                 sound.onEnded = () => {
                     sourceObject.remove(sound);
                     // console.log("Removed positional sound after playing.");
                 };
             }
        }
    }

    /**
     * Helper to add a listener for the first user interaction to enable audio playback.
     * This addresses browser autoplay restrictions.
     */
    _addInteractionListener() {
        const playAudioOnInteraction = () => {
            if (this.listener.context.state === 'suspended') {
                this.listener.context.resume().then(() => {
                     console.log("Audio context resumed after user interaction.");
                     if (this.ambientSound && !this.ambientSound.isPlaying) {
                         this.ambientSound.play();
                     }
                     // Remove the listener after the first interaction
                     document.body.removeEventListener('click', playAudioOnInteraction);
                     document.body.removeEventListener('keydown', playAudioOnInteraction);
                }).catch(e => console.error("Error resuming audio context:", e));
            } else {
                 // If context is already running, just remove listener
                 document.body.removeEventListener('click', playAudioOnInteraction);
                 document.body.removeEventListener('keydown', playAudioOnInteraction);
            }
        };

        // Listen for the first click or keydown
        document.body.addEventListener('click', playAudioOnInteraction, { once: true });
        document.body.addEventListener('keydown', playAudioOnInteraction, { once: true });
        console.log("Added interaction listener to resume audio context.");
    }
} 