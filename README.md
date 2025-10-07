EmotionGuard

Overview

EmotionGuard provides real-time facial analysis, cognitive checks, and risk gating to support safer trading workflows. The app now includes low-noise logging, stable face tracking, configurable thresholds, and built-in metrics (FPS, latency).

Requirements

- Node.js 18+
- A webcam (for face analysis)

Install

```bash
npm install
```

Run (Development)

```bash
npm run dev
```

Run (Production)

```bash
npm run build
npm start
```

Key Features

- Stable face analysis (MediaPipe FaceMesh) with EMA smoothing and temporal median filtering
- Watchdog + simulated fallback to avoid dead-ends on camera failure
- Real-time performance metrics (FPS and per-frame latency) in the UI
- Configurable thresholds for detection confidence and blink hysteresis
- Quiet console: verbose logs only in DEV with VITE_DEBUG=true

Face Analysis Settings

Adjust at runtime from the Face Analysis card when detection is active:
- Detection confidence: `minDetectionConfidence` (also applied to tracking)
- Blink thresholds: `blinkCloseThreshold` and `blinkOpenThreshold` (hysteresis)

Environment Flags

- VITE_DEBUG=true enables verbose debug logging in development

Performance Targets

- 24+ FPS and median per-frame latency ≤ 80 ms on typical hardware

Tech Notes

- Vite configured to suppress runtime overlays and lower log verbosity in production
- TypeScript strict mode; UI built with Radix + Tailwind utilities

Troubleshooting

- No camera access: the app switches to simulated metrics automatically
- Noise in console: ensure `VITE_DEBUG` is unset or false in production


