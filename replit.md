# EmotionGuard - Pre-Trade Stress Detection System

## Overview

EmotionGuard is a pre-trade "stress CAPTCHA" system designed to detect trader stress in real-time and provide graduated interventions (allow, delay, or block) to prevent emotion-driven trading decisions. The system combines behavioral biometrics, cognitive assessments, and self-reporting mechanisms to evaluate trader stress levels before order execution, helping reduce impulsive trading losses and improve risk management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client application is built with **React and TypeScript** using a modern component-based architecture. Key design decisions include:

- **Vite build system** for fast development and optimized production builds
- **shadcn/ui component library** with Radix UI primitives for consistent, accessible UI components
- **TailwindCSS** for utility-first styling with custom CSS variables for theming
- **Wouter for routing** - lightweight client-side routing solution
- **TanStack Query** for server state management and caching
- **Custom hooks pattern** for business logic abstraction (useEmotionGuard, useBiometrics, useWebSocket)

The application follows a modular component structure with clear separation between UI components, business logic hooks, and data management layers.

### Backend Architecture
The server uses **Express.js with TypeScript** in ESM module format. Core architectural patterns include:

- **Service layer architecture** - EmotionGuardService handles core assessment logic, RiskScoringService manages risk calculations, NLPAnalysisService processes journal entries
- **Repository pattern** - Storage abstraction layer for database operations
- **WebSocket integration** for real-time events and admin dashboard updates
- **Middleware-based request processing** with comprehensive logging and error handling
- **Validation layer** using Zod schemas for request/response validation

### Data Storage Solutions
The system uses **PostgreSQL** as the primary database with **Drizzle ORM** for type-safe database operations:

- **Neon serverless PostgreSQL** for cloud deployment with connection pooling
- **Schema-driven development** - shared TypeScript types between client and server
- **Migration management** through Drizzle Kit for schema evolution
- **Relational data modeling** - users, policies, assessments, baselines, audit logs, and real-time events

Key tables include policies for configuration management, assessments for tracking evaluations, user baselines for personalized thresholds, and comprehensive audit logging for compliance.

### Authentication and Authorization
Currently implements a **demo-user pattern** for development/demonstration purposes. The architecture supports role-based access control (trader, admin, supervisor) with policy-based permissions, though full authentication is not yet implemented.

### Real-time Assessment Pipeline
The core assessment workflow follows a **multi-phase evaluation pattern**:

1. **Quick Check Phase** - Passive behavioral biometrics collection (mouse movements, keystroke timing)
2. **Cognitive Assessment** - Stroop test for attention/stress measurement
3. **Self-Report** - Subjective stress level input
4. **Risk Scoring** - Algorithmic combination of all signals against user baseline
5. **Intervention Logic** - Policy-driven verdict (go/hold/block) with graduated responses

The system supports **configurable assessment modes** through policy settings, allowing organizations to customize which assessment components are enabled.

### Integration Architecture
The system is designed as an **embeddable SDK** that can integrate with existing trading platforms:

- **Pre-trade hooks** - JavaScript SDK for intercepting trade orders
- **Modal overlay system** - Non-intrusive UI that appears before trade execution
- **RESTful API** - Standard HTTP endpoints for assessment and configuration
- **WebSocket API** - Real-time event streaming for monitoring dashboards
- **Policy configuration** - Dynamic adjustment of assessment parameters without code changes

## External Dependencies

### Database Services
- **Neon PostgreSQL** - Serverless PostgreSQL database with connection pooling and automatic scaling
- **Drizzle ORM** - Type-safe database toolkit with migration management

### AI/ML Services
- **OpenAI API** - Natural language processing for journal entry analysis and emotional trigger detection (using GPT-5 model)

### UI Framework Dependencies
- **Radix UI primitives** - Accessible, unstyled UI components for complex interactions
- **TailwindCSS** - Utility-first CSS framework with custom design system
- **shadcn/ui** - Pre-built component library built on Radix UI foundations

### Development Tools
- **Vite** - Fast build tool and development server with HMR support
- **TypeScript** - Static type checking across the entire application stack
- **ESLint/Prettier** - Code quality and formatting tools
- **Replit integration** - Development environment plugins for runtime error handling and debugging

### Runtime Dependencies
- **Express.js** - Web application framework for the server layer
- **WebSocket (ws)** - Real-time bidirectional communication
- **TanStack Query** - Powerful data fetching and caching library
- **Zod** - Runtime type validation and schema definition
- **date-fns** - Date manipulation utilities for time-based analysis

The system is designed to be deployment-agnostic but optimized for serverless and containerized environments with minimal external service dependencies.