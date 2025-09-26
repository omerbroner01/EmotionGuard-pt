export interface BiometricData {
  mouseMovements: number[];
  keystrokeTimings: number[];
  clickLatency?: number;
}

export class BiometricTracker {
  private mouseMovements: number[] = [];
  private keystrokeTimings: number[] = [];
  private clickLatency?: number;
  private lastKeyTime = 0;
  private isTracking = false;
  private clickStartTime?: number;

  start(): void {
    if (this.isTracking) return;
    
    this.isTracking = true;
    this.mouseMovements = [];
    this.keystrokeTimings = [];
    this.clickLatency = undefined;
    this.lastKeyTime = 0;
    this.clickStartTime = undefined;

    // Mouse movement tracking
    document.addEventListener('mousemove', this.handleMouseMove);
    
    // Keystroke timing tracking
    document.addEventListener('keydown', this.handleKeyDown);
    
    // Click latency tracking
    document.addEventListener('mousedown', this.handleMouseDown);
    document.addEventListener('mouseup', this.handleMouseUp);
  }

  stop(): BiometricData {
    if (!this.isTracking) {
      return {
        mouseMovements: [],
        keystrokeTimings: [],
      };
    }

    this.isTracking = false;

    // Remove event listeners
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mouseup', this.handleMouseUp);

    return {
      mouseMovements: [...this.mouseMovements],
      keystrokeTimings: [...this.keystrokeTimings],
      clickLatency: this.clickLatency,
    };
  }

  private handleMouseMove = (event: MouseEvent): void => {
    if (!this.isTracking) return;

    // Calculate mouse movement velocity/acceleration
    const movement = Math.sqrt(
      Math.pow(event.movementX || 0, 2) + 
      Math.pow(event.movementY || 0, 2)
    );
    
    if (movement > 0) {
      this.mouseMovements.push(movement);
      
      // Keep only last 100 movements to prevent memory issues
      if (this.mouseMovements.length > 100) {
        this.mouseMovements.shift();
      }
    }
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.isTracking) return;

    const currentTime = performance.now();
    
    if (this.lastKeyTime > 0) {
      const timeDiff = currentTime - this.lastKeyTime;
      this.keystrokeTimings.push(timeDiff);
      
      // Keep only last 50 timings
      if (this.keystrokeTimings.length > 50) {
        this.keystrokeTimings.shift();
      }
    }
    
    this.lastKeyTime = currentTime;
  };

  private handleMouseDown = (event: MouseEvent): void => {
    if (!this.isTracking) return;
    this.clickStartTime = performance.now();
  };

  private handleMouseUp = (event: MouseEvent): void => {
    if (!this.isTracking || !this.clickStartTime) return;
    
    const clickDuration = performance.now() - this.clickStartTime;
    
    // Only record if it's a reasonable click duration (20ms - 500ms)
    if (clickDuration >= 20 && clickDuration <= 500) {
      this.clickLatency = clickDuration;
    }
    
    this.clickStartTime = undefined;
  };

  // Static utility methods for analysis
  static calculateMouseStability(movements: number[]): number {
    if (movements.length < 2) return 1.0;
    
    // Calculate coefficient of variation (lower = more stable)
    const mean = movements.reduce((sum, val) => sum + val, 0) / movements.length;
    const variance = movements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / movements.length;
    const stdDev = Math.sqrt(variance);
    
    const coefficientOfVariation = stdDev / mean;
    return Math.max(0, Math.min(1, 1 - coefficientOfVariation));
  }

  static calculateKeystrokeRhythm(timings: number[]): number {
    if (timings.length < 2) return 1.0;
    
    // Calculate rhythm consistency (lower variation = better rhythm)
    const mean = timings.reduce((sum, val) => sum + val, 0) / timings.length;
    const variance = timings.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / timings.length;
    const stdDev = Math.sqrt(variance);
    
    const coefficientOfVariation = stdDev / mean;
    return Math.max(0, Math.min(1, 1 - Math.min(coefficientOfVariation, 1)));
  }

  static analyzeClickLatency(latency?: number): {
    isNormal: boolean;
    type: 'normal' | 'too_fast' | 'too_slow' | 'missing';
  } {
    if (!latency) {
      return { isNormal: false, type: 'missing' };
    }
    
    if (latency < 50) {
      return { isNormal: false, type: 'too_fast' }; // Possibly impulsive
    }
    
    if (latency > 300) {
      return { isNormal: false, type: 'too_slow' }; // Possibly hesitant
    }
    
    return { isNormal: true, type: 'normal' };
  }
}
