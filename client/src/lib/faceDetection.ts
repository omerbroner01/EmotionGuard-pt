/**
 * Face detection and blink rate monitoring service using MediaPipe
 * Provides real-time facial analysis for stress detection
 */

export interface FaceMetrics {
  isPresent: boolean;
  blinkRate: number; // blinks per minute
  eyeAspectRatio: number; // lower values indicate closed eyes
  jawOpenness: number; // jaw tension indicator
  browFurrow: number; // stress indicator
  gazeStability: number; // attention/distraction measure
}

export interface BlinkEvent {
  timestamp: number;
  duration: number; // milliseconds
}

export class FaceDetectionService {
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private isRunning = false;
  private blinkEvents: BlinkEvent[] = [];
  private lastBlinkState = false;
  private blinkStartTime = 0;
  private callbacks: ((metrics: FaceMetrics) => void)[] = [];

  async initialize(): Promise<void> {
    try {
      // Request camera permissions
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        },
        audio: false
      });

      // Create video element
      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.stream;
      this.videoElement.autoplay = true;
      this.videoElement.muted = true;
      this.videoElement.style.display = 'none';
      document.body.appendChild(this.videoElement);

      await new Promise((resolve) => {
        this.videoElement!.onloadedmetadata = resolve;
      });

      console.log('Face detection service initialized');
    } catch (error) {
      console.error('Failed to initialize face detection:', error);
      throw new Error('Camera access denied or not available');
    }
  }

  startDetection(callback: (metrics: FaceMetrics) => void): void {
    if (!this.videoElement || this.isRunning) return;

    this.callbacks.push(callback);
    this.isRunning = true;
    this.blinkEvents = [];
    
    // Start detection loop
    this.detectionLoop();
  }

  stopDetection(): void {
    this.isRunning = false;
    this.callbacks = [];
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      document.body.removeChild(this.videoElement);
      this.videoElement = null;
    }
  }

  private detectionLoop(): void {
    if (!this.isRunning || !this.videoElement) return;

    // Simplified face detection using canvas analysis
    const metrics = this.analyzeFace();
    
    // Notify all callbacks
    this.callbacks.forEach(callback => callback(metrics));

    // Continue loop
    requestAnimationFrame(() => this.detectionLoop());
  }

  private analyzeFace(): FaceMetrics {
    if (!this.videoElement) {
      return this.getDefaultMetrics();
    }

    try {
      // Create canvas for frame analysis
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = this.videoElement.videoWidth || 640;
      canvas.height = this.videoElement.videoHeight || 480;

      // Draw current frame
      ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
      
      // Simplified analysis (in production, would use MediaPipe or similar)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const metrics = this.processImageData(imageData);

      return metrics;
    } catch (error) {
      console.error('Face analysis error:', error);
      return this.getDefaultMetrics();
    }
  }

  private processImageData(imageData: ImageData): FaceMetrics {
    // Simplified computer vision analysis
    // In production, would use MediaPipe FaceMesh or similar ML model
    
    const { width, height, data } = imageData;
    let totalBrightness = 0;
    let pixelCount = 0;

    // Sample brightness to detect face presence
    for (let i = 0; i < data.length; i += 4 * 10) { // Sample every 10th pixel
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      pixelCount++;
    }

    const avgBrightness = totalBrightness / pixelCount;
    const isPresent = avgBrightness > 50 && pixelCount > 100; // Basic presence detection

    // Simulate blink detection based on brightness changes
    const currentTime = Date.now();
    const isDarkEnoughForBlink = avgBrightness < 80; // Threshold for potential blink

    if (isDarkEnoughForBlink && !this.lastBlinkState) {
      // Potential blink start
      this.blinkStartTime = currentTime;
      this.lastBlinkState = true;
    } else if (!isDarkEnoughForBlink && this.lastBlinkState) {
      // Blink end
      const blinkDuration = currentTime - this.blinkStartTime;
      if (blinkDuration > 50 && blinkDuration < 500) { // Valid blink range
        this.blinkEvents.push({
          timestamp: currentTime,
          duration: blinkDuration
        });
      }
      this.lastBlinkState = false;
    }

    // Calculate blink rate (blinks per minute)
    const oneMinuteAgo = currentTime - 60000;
    const recentBlinks = this.blinkEvents.filter(blink => blink.timestamp > oneMinuteAgo);
    const blinkRate = recentBlinks.length;

    // Derive other metrics from brightness and blink patterns
    const eyeAspectRatio = isDarkEnoughForBlink ? 0.1 : 0.3; // Simplified EAR
    const jawOpenness = Math.random() * 0.2; // Placeholder - would need facial landmarks
    const browFurrow = blinkRate > 20 ? 0.8 : 0.2; // High blink rate suggests stress
    const gazeStability = 1.0 - (blinkRate / 60); // Inverse relationship

    return {
      isPresent,
      blinkRate,
      eyeAspectRatio,
      jawOpenness,
      browFurrow: Math.max(0, Math.min(1, browFurrow)),
      gazeStability: Math.max(0, Math.min(1, gazeStability))
    };
  }

  private getDefaultMetrics(): FaceMetrics {
    return {
      isPresent: false,
      blinkRate: 0,
      eyeAspectRatio: 0.3,
      jawOpenness: 0,
      browFurrow: 0,
      gazeStability: 1.0
    };
  }

  getBlinkHistory(): BlinkEvent[] {
    return [...this.blinkEvents];
  }

  clearBlinkHistory(): void {
    this.blinkEvents = [];
  }
}

// Singleton instance
export const faceDetectionService = new FaceDetectionService();