Changelog

Unreleased

Added

- FaceDetectionSettings with runtime setSettings/getSettings (confidence, blink thresholds, smoothing)
- FPS and per-frame latency surfaced in FaceMetrics and UI
- UI sliders for confidence and blink thresholds in FaceDetectionDisplay

Changed

- EMA smoothing and temporal median filter to reduce jitter and false results
- Watchdog to switch to simulated fallback if MediaPipe stops producing results
- Vite config: disable runtime error overlay in production, lower logLevel

Fixed

- Reduced console noise by gating debug logs with VITE_DEBUG in DEV
- Safer event typing in FaceDetectionDisplay for input handlers


