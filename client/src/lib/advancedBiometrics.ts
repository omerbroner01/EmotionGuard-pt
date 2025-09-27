/**
 * Advanced Biometric Data Collection System
 * Collects sophisticated behavioral patterns for AI-powered stress detection
 */

export interface MousePatternData {
  velocity: number;
  acceleration: number;
  jerk: number; // Rate of change of acceleration
  curvature: number;
  pressure: number; // Simulated based on speed changes
  timestamp: number;
  x: number;
  y: number;
}

export interface KeystrokeDynamics {
  key: string;
  dwellTime: number; // Key press to release time
  flightTime: number; // Time between key releases
  pressVelocity: number; // How fast key was pressed
  releaseVelocity: number; // How fast key was released
  pressure: number; // Simulated pressure
  timestamp: number;
}

export interface InteractionPattern {
  type: 'click' | 'hover' | 'scroll' | 'focus' | 'blur';
  duration: number;
  intensity: number;
  coordinates?: { x: number; y: number };
  timestamp: number;
}

export interface BiometricAnalysis {
  stressIndicators: {
    mouseStability: number; // 0-1, higher = more stable
    keystrokeRhythm: number; // 0-1, higher = more consistent
    velocityVariance: number; // 0-1, higher = more erratic
    microTremors: number; // 0-1, higher = more tremors detected
    attentionScatter: number; // 0-1, higher = more scattered attention
  };
  
  patterns: {
    dominantFrequency: number; // Hz, dominant movement frequency
    rhythmicity: number; // 0-1, regularity of patterns
    complexity: number; // 0-1, pattern complexity
    asymmetry: number; // 0-1, left-right movement asymmetry
  };
  
  performance: {
    reactionSpeed: number; // 0-1, higher = faster
    precision: number; // 0-1, higher = more precise
    consistency: number; // 0-1, higher = more consistent
    fatigue: number; // 0-1, higher = more fatigued
  };
  
  confidence: number; // 0-1, data quality confidence
  sampleSize: number;
  duration: number; // ms
}

export interface AdvancedBiometricData {
  mousePatterns: MousePatternData[];
  keystrokeDynamics: KeystrokeDynamics[];
  interactionPatterns: InteractionPattern[];
  analysis: BiometricAnalysis;
  rawMetrics: {
    totalMouseEvents: number;
    totalKeyEvents: number;
    totalInteractions: number;
    avgSamplingRate: number;
  };
}

export class AdvancedBiometricTracker {
  private isTracking = false;
  private startTime = 0;
  
  // Enhanced mouse tracking
  private mousePatterns: MousePatternData[] = [];
  private lastMouseEvent?: { x: number; y: number; timestamp: number; velocity: number };
  private mouseHistory: Array<{ x: number; y: number; timestamp: number }> = [];
  
  // Advanced keystroke tracking
  private keystrokeDynamics: KeystrokeDynamics[] = [];
  private keyStates = new Map<string, { pressTime: number; x: number; y: number }>();
  private lastKeyRelease?: { timestamp: number; key: string };
  
  // Interaction pattern tracking
  private interactionPatterns: InteractionPattern[] = [];
  private focusStartTime?: number;
  private scrollStartTime?: number;
  private hoverStartTime?: number;
  private lastHoverTarget?: Element;
  
  // Performance monitoring
  private samplingRate = 0;
  private lastSampleTime = 0;
  
  start(): void {
    if (this.isTracking) return;
    
    console.log('🔬 Starting advanced biometric tracking...');
    this.isTracking = true;
    this.startTime = performance.now();
    
    // Reset all data
    this.mousePatterns = [];
    this.keystrokeDynamics = [];
    this.interactionPatterns = [];
    this.mouseHistory = [];
    this.keyStates.clear();
    
    // Enhanced mouse tracking with high frequency sampling
    document.addEventListener('mousemove', this.handleMouseMove, { passive: true });
    document.addEventListener('mousedown', this.handleMouseDown, { passive: true });
    document.addEventListener('mouseup', this.handleMouseUp, { passive: true });
    document.addEventListener('click', this.handleClick, { passive: true });
    
    // Advanced keystroke dynamics
    document.addEventListener('keydown', this.handleKeyDown, { passive: true });
    document.addEventListener('keyup', this.handleKeyUp, { passive: true });
    
    // Interaction pattern tracking
    document.addEventListener('mouseenter', this.handleMouseEnter, { passive: true });
    document.addEventListener('mouseleave', this.handleMouseLeave, { passive: true });
    document.addEventListener('scroll', this.handleScroll, { passive: true });
    document.addEventListener('focus', this.handleFocus, { passive: true });
    document.addEventListener('blur', this.handleBlur, { passive: true });
    
    console.log('🔬 Advanced biometric tracking started');
  }

  stop(): AdvancedBiometricData {
    if (!this.isTracking) {
      return this.getEmptyData();
    }
    
    console.log('🔬 Stopping advanced biometric tracking...');
    this.isTracking = false;
    
    // Remove all event listeners
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('click', this.handleClick);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('mouseenter', this.handleMouseEnter);
    document.removeEventListener('mouseleave', this.handleMouseLeave);
    document.removeEventListener('scroll', this.handleScroll);
    document.removeEventListener('focus', this.handleFocus);
    document.removeEventListener('blur', this.handleBlur);
    
    const analysis = this.performAdvancedAnalysis();
    const duration = performance.now() - this.startTime;
    
    const result: AdvancedBiometricData = {
      mousePatterns: [...this.mousePatterns],
      keystrokeDynamics: [...this.keystrokeDynamics],
      interactionPatterns: [...this.interactionPatterns],
      analysis,
      rawMetrics: {
        totalMouseEvents: this.mousePatterns.length,
        totalKeyEvents: this.keystrokeDynamics.length,
        totalInteractions: this.interactionPatterns.length,
        avgSamplingRate: this.samplingRate
      }
    };
    
    console.log(`🔬 Advanced biometric analysis complete: ${result.rawMetrics.totalMouseEvents} mouse events, ${result.rawMetrics.totalKeyEvents} key events, confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
    
    return result;
  }

  private handleMouseMove = (event: MouseEvent): void => {
    if (!this.isTracking) return;
    
    const timestamp = performance.now();
    const x = event.clientX;
    const y = event.clientY;
    
    // Update sampling rate
    this.updateSamplingRate(timestamp);
    
    // Add to mouse history for pattern analysis
    this.mouseHistory.push({ x, y, timestamp });
    
    // Keep history manageable (last 200 points)
    if (this.mouseHistory.length > 200) {
      this.mouseHistory.shift();
    }
    
    // Calculate advanced metrics if we have previous data
    if (this.lastMouseEvent && this.mouseHistory.length >= 3) {
      const pattern = this.calculateMousePattern(event, this.lastMouseEvent, timestamp);
      if (pattern) {
        this.mousePatterns.push(pattern);
        
        // Keep patterns manageable
        if (this.mousePatterns.length > 500) {
          this.mousePatterns.shift();
        }
      }
    }
    
    // Calculate velocity for next iteration
    const velocity = this.lastMouseEvent 
      ? Math.sqrt(Math.pow(x - this.lastMouseEvent.x, 2) + Math.pow(y - this.lastMouseEvent.y, 2)) 
        / (timestamp - this.lastMouseEvent.timestamp) * 1000
      : 0;
    
    this.lastMouseEvent = { x, y, timestamp, velocity };
  };

  private calculateMousePattern(
    event: MouseEvent, 
    lastEvent: { x: number; y: number; timestamp: number; velocity: number }, 
    timestamp: number
  ): MousePatternData | null {
    const deltaX = event.clientX - lastEvent.x;
    const deltaY = event.clientY - lastEvent.y;
    const deltaT = timestamp - lastEvent.timestamp;
    
    if (deltaT === 0) return null;
    
    // Calculate velocity (pixels/second)
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = (distance / deltaT) * 1000;
    
    // Calculate acceleration (change in velocity)
    const acceleration = (velocity - lastEvent.velocity) / deltaT * 1000;
    
    // Calculate jerk (rate of change of acceleration)
    const jerk = this.calculateJerk(velocity, lastEvent.velocity, deltaT);
    
    // Calculate path curvature
    const curvature = this.calculateCurvature(event.clientX, event.clientY);
    
    // Simulate pressure based on speed changes (rapid deceleration = higher pressure)
    const pressure = Math.min(1.0, Math.abs(acceleration) / 1000);
    
    return {
      velocity,
      acceleration,
      jerk,
      curvature,
      pressure,
      timestamp,
      x: event.clientX,
      y: event.clientY
    };
  }

  private calculateJerk(currentVel: number, lastVel: number, deltaT: number): number {
    if (this.mousePatterns.length < 2) return 0;
    
    const lastPattern = this.mousePatterns[this.mousePatterns.length - 1];
    const currentAccel = (currentVel - lastVel) / deltaT;
    const jerk = (currentAccel - (lastPattern?.acceleration || 0)) / deltaT;
    
    return Math.abs(jerk);
  }

  private calculateCurvature(x: number, y: number): number {
    if (this.mouseHistory.length < 3) return 0;
    
    // Use last 3 points to calculate curvature
    const points = this.mouseHistory.slice(-3);
    const [p1, p2, p3] = points;
    
    // Calculate vectors
    const v1x = p2.x - p1.x;
    const v1y = p2.y - p1.y;
    const v2x = p3.x - p2.x;
    const v2y = p3.y - p2.y;
    
    // Calculate angle change
    const dot = v1x * v2x + v1y * v2y;
    const det = v1x * v2y - v1y * v2x;
    const angle = Math.abs(Math.atan2(det, dot));
    
    return angle / Math.PI; // Normalize to 0-1
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.isTracking || event.repeat) return;
    
    const timestamp = performance.now();
    const key = event.code;
    
    // Store press state
    this.keyStates.set(key, {
      pressTime: timestamp,
      x: this.lastMouseEvent?.x || 0,
      y: this.lastMouseEvent?.y || 0
    });
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    if (!this.isTracking) return;
    
    const timestamp = performance.now();
    const key = event.code;
    const keyState = this.keyStates.get(key);
    
    if (!keyState) return;
    
    const dwellTime = timestamp - keyState.pressTime;
    
    // Calculate flight time (time between key releases)
    const flightTime = this.lastKeyRelease 
      ? keyState.pressTime - this.lastKeyRelease.timestamp
      : 0;
    
    // Simulate press/release velocities based on dwell time
    const pressVelocity = Math.min(1.0, 100 / Math.max(dwellTime, 10));
    const releaseVelocity = Math.min(1.0, 50 / Math.max(dwellTime, 10));
    
    // Simulate pressure based on dwell time and typing rhythm
    const pressure = Math.min(1.0, dwellTime / 200);
    
    const keystrokeData: KeystrokeDynamics = {
      key,
      dwellTime,
      flightTime,
      pressVelocity,
      releaseVelocity,
      pressure,
      timestamp
    };
    
    this.keystrokeDynamics.push(keystrokeData);
    
    // Limit stored keystrokes
    if (this.keystrokeDynamics.length > 100) {
      this.keystrokeDynamics.shift();
    }
    
    this.lastKeyRelease = { timestamp, key };
    this.keyStates.delete(key);
  };

  private handleClick = (event: MouseEvent): void => {
    if (!this.isTracking) return;
    
    this.interactionPatterns.push({
      type: 'click',
      duration: 0,
      intensity: 1.0,
      coordinates: { x: event.clientX, y: event.clientY },
      timestamp: performance.now()
    });
  };

  private handleMouseEnter = (event: MouseEvent): void => {
    if (!this.isTracking) return;
    
    this.hoverStartTime = performance.now();
    this.lastHoverTarget = event.target as Element;
  };

  private handleMouseLeave = (event: MouseEvent): void => {
    if (!this.isTracking || !this.hoverStartTime) return;
    
    const duration = performance.now() - this.hoverStartTime;
    
    this.interactionPatterns.push({
      type: 'hover',
      duration,
      intensity: Math.min(1.0, duration / 1000),
      coordinates: { x: event.clientX, y: event.clientY },
      timestamp: this.hoverStartTime
    });
    
    this.hoverStartTime = undefined;
  };

  private handleScroll = (event: Event): void => {
    if (!this.isTracking) return;
    
    const timestamp = performance.now();
    
    if (!this.scrollStartTime) {
      this.scrollStartTime = timestamp;
    }
    
    this.interactionPatterns.push({
      type: 'scroll',
      duration: timestamp - this.scrollStartTime,
      intensity: 0.5,
      timestamp
    });
  };

  private handleFocus = (event: FocusEvent): void => {
    if (!this.isTracking) return;
    
    this.focusStartTime = performance.now();
  };

  private handleBlur = (event: FocusEvent): void => {
    if (!this.isTracking || !this.focusStartTime) return;
    
    const duration = performance.now() - this.focusStartTime;
    
    this.interactionPatterns.push({
      type: 'blur',
      duration,
      intensity: Math.min(1.0, duration / 5000),
      timestamp: this.focusStartTime
    });
  };

  private handleMouseDown = (event: MouseEvent): void => {
    // Track for click pressure analysis
  };

  private handleMouseUp = (event: MouseEvent): void => {
    // Track for click release analysis
  };

  private updateSamplingRate(timestamp: number): void {
    if (this.lastSampleTime > 0) {
      const deltaT = timestamp - this.lastSampleTime;
      const instantRate = 1000 / deltaT; // Hz
      
      // Exponential moving average
      this.samplingRate = this.samplingRate * 0.9 + instantRate * 0.1;
    }
    
    this.lastSampleTime = timestamp;
  }

  private performAdvancedAnalysis(): BiometricAnalysis {
    const duration = performance.now() - this.startTime;
    
    // Calculate stress indicators
    const stressIndicators = this.calculateStressIndicators();
    
    // Calculate pattern analysis
    const patterns = this.calculatePatternAnalysis();
    
    // Calculate performance metrics
    const performanceMetrics = this.calculatePerformanceMetrics();
    
    // Calculate confidence based on data quality
    const confidence = this.calculateConfidence(duration);
    
    return {
      stressIndicators,
      patterns,
      performance: performanceMetrics,
      confidence,
      sampleSize: this.mousePatterns.length + this.keystrokeDynamics.length,
      duration
    };
  }

  private calculateStressIndicators(): BiometricAnalysis['stressIndicators'] {
    // Mouse stability (coefficient of variation of velocity)
    const mouseStability = this.calculateMouseStability();
    
    // Keystroke rhythm consistency
    const keystrokeRhythm = this.calculateKeystrokeRhythm();
    
    // Velocity variance (higher = more erratic)
    const velocityVariance = this.calculateVelocityVariance();
    
    // Micro-tremors detection
    const microTremors = this.detectMicroTremors();
    
    // Attention scatter (interaction pattern dispersion)
    const attentionScatter = this.calculateAttentionScatter();
    
    return {
      mouseStability,
      keystrokeRhythm,
      velocityVariance,
      microTremors,
      attentionScatter
    };
  }

  private calculateMouseStability(): number {
    if (this.mousePatterns.length < 5) return 0.5;
    
    const velocities = this.mousePatterns.map(p => p.velocity);
    const mean = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
    const variance = velocities.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / velocities.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / (mean + 1); // Add 1 to avoid division by zero
    
    return Math.max(0, Math.min(1, 1 - cv / 2));
  }

  private calculateKeystrokeRhythm(): number {
    if (this.keystrokeDynamics.length < 3) return 0.5;
    
    const dwellTimes = this.keystrokeDynamics.map(k => k.dwellTime);
    const mean = dwellTimes.reduce((sum, t) => sum + t, 0) / dwellTimes.length;
    const variance = dwellTimes.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / dwellTimes.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / (mean + 1);
    
    return Math.max(0, Math.min(1, 1 - cv / 2));
  }

  private calculateVelocityVariance(): number {
    if (this.mousePatterns.length < 5) return 0.5;
    
    const velocities = this.mousePatterns.map(p => p.velocity);
    const mean = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
    const variance = velocities.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / velocities.length;
    
    // Normalize variance to 0-1 scale
    return Math.min(1, variance / 10000);
  }

  private detectMicroTremors(): number {
    if (this.mousePatterns.length < 10) return 0;
    
    let tremorCount = 0;
    const jerkThreshold = 100; // Adjust based on empirical data
    
    for (const pattern of this.mousePatterns) {
      if (pattern.jerk > jerkThreshold) {
        tremorCount++;
      }
    }
    
    return Math.min(1, tremorCount / this.mousePatterns.length * 10);
  }

  private calculateAttentionScatter(): number {
    if (this.interactionPatterns.length < 3) return 0.5;
    
    const hoverPatterns = this.interactionPatterns.filter(p => p.type === 'hover');
    if (hoverPatterns.length < 2) return 0.5;
    
    // Calculate average hover duration
    const avgHoverDuration = hoverPatterns.reduce((sum, p) => sum + p.duration, 0) / hoverPatterns.length;
    
    // Calculate variance in hover duration
    const variance = hoverPatterns.reduce((sum, p) => sum + Math.pow(p.duration - avgHoverDuration, 2), 0) / hoverPatterns.length;
    
    // Higher variance = more scattered attention
    return Math.min(1, Math.sqrt(variance) / 1000);
  }

  private calculatePatternAnalysis(): BiometricAnalysis['patterns'] {
    return {
      dominantFrequency: this.calculateDominantFrequency(),
      rhythmicity: this.calculateRhythmicity(),
      complexity: this.calculateComplexity(),
      asymmetry: this.calculateAsymmetry()
    };
  }

  private calculateDominantFrequency(): number {
    // Simplified frequency analysis - could be enhanced with FFT
    if (this.mousePatterns.length < 10) return 0;
    
    const intervals = [];
    for (let i = 1; i < this.mousePatterns.length; i++) {
      intervals.push(this.mousePatterns[i].timestamp - this.mousePatterns[i-1].timestamp);
    }
    
    const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
    return avgInterval > 0 ? 1000 / avgInterval : 0; // Convert to Hz
  }

  private calculateRhythmicity(): number {
    if (this.keystrokeDynamics.length < 5) return 0.5;
    
    const intervals = [];
    for (let i = 1; i < this.keystrokeDynamics.length; i++) {
      intervals.push(this.keystrokeDynamics[i].timestamp - this.keystrokeDynamics[i-1].timestamp);
    }
    
    const mean = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
    const variance = intervals.reduce((sum, i) => sum + Math.pow(i - mean, 2), 0) / intervals.length;
    const cv = Math.sqrt(variance) / (mean + 1);
    
    return Math.max(0, Math.min(1, 1 - cv));
  }

  private calculateComplexity(): number {
    if (this.mousePatterns.length < 10) return 0.5;
    
    // Calculate path complexity using curvature variance
    const curvatures = this.mousePatterns.map(p => p.curvature);
    const mean = curvatures.reduce((sum, c) => sum + c, 0) / curvatures.length;
    const variance = curvatures.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / curvatures.length;
    
    return Math.min(1, Math.sqrt(variance) * 2);
  }

  private calculateAsymmetry(): number {
    if (this.mousePatterns.length < 20) return 0.5;
    
    // Analyze left vs right movement bias
    let leftMovement = 0;
    let rightMovement = 0;
    
    for (let i = 1; i < this.mousePatterns.length; i++) {
      const deltaX = this.mousePatterns[i].x - this.mousePatterns[i-1].x;
      if (deltaX < 0) leftMovement += Math.abs(deltaX);
      if (deltaX > 0) rightMovement += Math.abs(deltaX);
    }
    
    const totalMovement = leftMovement + rightMovement;
    if (totalMovement === 0) return 0.5;
    
    return Math.abs(leftMovement - rightMovement) / totalMovement;
  }

  private calculatePerformanceMetrics(): BiometricAnalysis['performance'] {
    return {
      reactionSpeed: this.calculateReactionSpeed(),
      precision: this.calculatePrecision(),
      consistency: this.calculateConsistency(),
      fatigue: this.calculateFatigue()
    };
  }

  private calculateReactionSpeed(): number {
    if (this.keystrokeDynamics.length < 3) return 0.5;
    
    const avgDwellTime = this.keystrokeDynamics.reduce((sum, k) => sum + k.dwellTime, 0) / this.keystrokeDynamics.length;
    
    // Lower dwell time = faster reaction (but normalize)
    return Math.max(0, Math.min(1, 1 - avgDwellTime / 500));
  }

  private calculatePrecision(): number {
    if (this.mousePatterns.length < 10) return 0.5;
    
    // Calculate movement efficiency (straight line distance / actual path length)
    if (this.mousePatterns.length < 2) return 0.5;
    
    const start = this.mousePatterns[0];
    const end = this.mousePatterns[this.mousePatterns.length - 1];
    const straightDistance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    
    let actualPath = 0;
    for (let i = 1; i < this.mousePatterns.length; i++) {
      const prev = this.mousePatterns[i - 1];
      const curr = this.mousePatterns[i];
      actualPath += Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
    }
    
    return actualPath > 0 ? Math.min(1, straightDistance / actualPath) : 0.5;
  }

  private calculateConsistency(): number {
    // Combine mouse stability and keystroke rhythm
    const mouseStability = this.calculateMouseStability();
    const keystrokeRhythm = this.calculateKeystrokeRhythm();
    
    return (mouseStability + keystrokeRhythm) / 2;
  }

  private calculateFatigue(): number {
    if (this.mousePatterns.length < 20) return 0;
    
    // Analyze velocity degradation over time
    const firstHalf = this.mousePatterns.slice(0, Math.floor(this.mousePatterns.length / 2));
    const secondHalf = this.mousePatterns.slice(Math.floor(this.mousePatterns.length / 2));
    
    const firstHalfAvgVel = firstHalf.reduce((sum, p) => sum + p.velocity, 0) / firstHalf.length;
    const secondHalfAvgVel = secondHalf.reduce((sum, p) => sum + p.velocity, 0) / secondHalf.length;
    
    // Fatigue if velocity decreases significantly
    const velocityDrop = (firstHalfAvgVel - secondHalfAvgVel) / (firstHalfAvgVel + 1);
    
    return Math.max(0, Math.min(1, velocityDrop * 2));
  }

  private calculateConfidence(duration: number): number {
    let confidence = 0.3; // Base confidence
    
    // More data = higher confidence
    if (this.mousePatterns.length > 10) confidence += 0.2;
    if (this.mousePatterns.length > 50) confidence += 0.2;
    
    if (this.keystrokeDynamics.length > 5) confidence += 0.15;
    if (this.keystrokeDynamics.length > 20) confidence += 0.15;
    
    // Longer duration = higher confidence
    if (duration > 5000) confidence += 0.1; // 5 seconds
    if (duration > 15000) confidence += 0.1; // 15 seconds
    
    // Good sampling rate = higher confidence
    if (this.samplingRate > 30) confidence += 0.1;
    
    return Math.min(1.0, confidence);
  }

  private getEmptyData(): AdvancedBiometricData {
    return {
      mousePatterns: [],
      keystrokeDynamics: [],
      interactionPatterns: [],
      analysis: {
        stressIndicators: {
          mouseStability: 0.5,
          keystrokeRhythm: 0.5,
          velocityVariance: 0.5,
          microTremors: 0,
          attentionScatter: 0.5
        },
        patterns: {
          dominantFrequency: 0,
          rhythmicity: 0.5,
          complexity: 0.5,
          asymmetry: 0.5
        },
        performance: {
          reactionSpeed: 0.5,
          precision: 0.5,
          consistency: 0.5,
          fatigue: 0
        },
        confidence: 0.1,
        sampleSize: 0,
        duration: 0
      },
      rawMetrics: {
        totalMouseEvents: 0,
        totalKeyEvents: 0,
        totalInteractions: 0,
        avgSamplingRate: 0
      }
    };
  }
}