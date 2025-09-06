# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PHC LMS** (Pacific Harbour College Learning Management System) - An Angular 18-based educational platform with integrated speech analysis, video conferencing, real-time communication, and comprehensive course management.

## Development Commands

### Core Development
- `npm start` or `ng serve` - Start development server (http://localhost:4200)
- `npm run build` or `ng build` - Build production bundle
- `npm run watch` - Build with watch mode
- `npm test` or `ng test` - Run unit tests with Karma/Jasmine
- `ng generate component component-name` - Generate new Angular component
- `ng generate service service-name` - Generate new Angular service

### Database Operations
- `npm run seed` - Seed database with initial data
- `npm run pull` - Pull schema from database and generate Prisma client (`npx prisma db pull && npx prisma generate`)
- `npm run push` - Push schema changes and generate Prisma client (`npx prisma db push && npx prisma generate`)

### Electron (Desktop App)
- `npm run electron` - Start Electron app
- `npm run electron-build` - Build Angular then start Electron

## Architecture Overview

### Technology Stack
- **Frontend**: Angular 18 with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: TailwindCSS + PrimeNG + Angular Material + Bootstrap
- **Real-time**: WebSocket connections
- **AI Integration**: Google Gemini, AssemblyAI, Deepgram for speech analysis
- **Video**: VideoSDK for conferencing
- **File Handling**: Supabase for storage

### Core Module Structure

#### User Roles & Access Control
- **Students**: Course enrollment, lessons, assessments, speech lab, discussions
- **Teachers**: Course management, grading, analytics, whiteboard, speech lab supervision
- **Administrators**: User management, system configuration, reporting

#### Key Feature Modules

**LMS Core**:
- Course management with lessons, topics, assessments
- Assignment submission and grading with rubric support
- Real-time discussions (topic-based and course-wide forums)
- Performance tracking and analytics

**Speech Lab** (`/speechlab/*`):
- Interactive speech analysis with AI feedback
- Practice modules with drag-and-drop exercises
- Real-time pronunciation assessment
- Lab management for teachers

**Communication System**:
- WebSocket-based real-time messaging
- Thread-based discussions with reporting system
- Video conferencing integration
- Notification system

**Assessment Engine**:
- Quiz creation with multiple question types
- Rubric-based grading system
- Retake limitations and attempt tracking
- Speech-based assessments

### Database Schema Highlights

The Prisma schema includes:
- **User Management**: `students`, `teachers`, `administrators`
- **Academic Structure**: `courses`, `lessons`, `topics`, `classes`
- **Assessment System**: `assessments`, `assignments` with rubric support
- **Communication**: `topic_threads`, `course_forum_threads`, reporting system
- **Speech Lab**: Specialized tables for speech analysis and practice
- **Grading**: Comprehensive rubric and criteria-based evaluation

### API Service Structure

Central `APIService` handles:
- HTTP requests with authentication
- WebSocket connections for real-time features  
- File upload/download operations
- AI service integrations (Gemini, AssemblyAI)
- Notification and snackbar management

### Routing Architecture

Three main role-based routes:
- `/admin/*` - Administrative functions
- `/student/*` - Student portal with nested speechlab
- `/teacher/*` - Teacher dashboard with management tools

## Development Guidelines

### Component Organization
- Shared components in `shared/components/`
- Role-specific components under `components/{admin|student|teacher}/`
- Speech lab has its own module structure under `speechlab/`
- Unused components preserved in `unused-components/` for reference

### Styling Conventions
- TailwindCSS for utility classes with custom breakpoints
- PrimeNG components for complex UI elements
- Dark mode support via CSS classes
- Custom color scheme defined in environment

### State Management
- Service-based state management through `APIService`
- Guards for route protection based on user roles
- Real-time updates via WebSocket connections

### Key Configuration Files
- `tailwind.config.js` - Custom breakpoints and color scheme
- `src/environments/environment.ts` - API endpoints, keys, and feature flags
- `prisma/schema.prisma` - Database schema definition
- `angular.json` - Build configuration with proxy settings and allowedCommonJsDependencies
- `package.json` - Project dependencies and npm scripts

## Common Development Tasks

### Adding New Features
1. Check role-based routing structure in `app-routing.module.ts`
2. Create component in appropriate role directory
3. Update navigation in relevant dashboard component
4. Add database models to Prisma schema if needed
5. Update API service methods for data operations

### Database Changes
1. Modify `prisma/schema.prisma`
2. Run `npm run push` to apply changes
3. Update TypeScript types as needed
4. Test with `npm run seed` for data consistency

### Testing Speech Lab Features
- Speech lab requires microphone permissions
- Uses WebRTC for real-time audio processing
- Test with `speechlab` routes under student/teacher portals

### WebSocket Integration
- Real-time features depend on WebSocket connection
- Connection initialized in `APIService` constructor
- Used for notifications, live updates, and system maintenance messages

## Technical Implementation Details

### Authentication & Authorization
- Role-based authentication with separate guards: `PortalGuard` (students), `TportalGuard` (teachers), admin guards
- JWT tokens and encrypted API keys in environment configuration
- Session management handled through `APIService` with automatic logout on token expiration

### WebSocket Integration
- Real-time communication via WebSocket (`wss://core.quanbylab.com/websocket`)
- Connection managed in `APIService` constructor
- Used for live notifications, system messages, and real-time collaboration features

### AI Services Integration
- **Google Gemini**: Text generation and analysis (`@google/generative-ai`)
- **AssemblyAI**: Speech transcription and analysis (`assemblyai`)
- **Deepgram**: Alternative speech processing (`@deepgram/sdk`)
- All AI services configured with API keys in environment

### File Handling
- **Supabase**: Primary file storage and management
- **File processing**: Supports PDF, images, documents via `ng2-pdf-viewer`, `ngx-doc-viewer`
- **Export capabilities**: PDF generation with `jspdf`, Excel with `xlsx`, file downloads with `file-saver`

### Video & Communication
- **VideoSDK**: Real-time video conferencing (`@videosdk.live/js-sdk`)
- **WebRTC**: Peer-to-peer communication for speech lab features
- **Fabric.js**: Interactive whiteboard functionality

## Security & Performance Notes

- Context menu and developer tools disabled in production
- API keys and sensitive data in environment files (never commit these changes)
- File uploads handled through Supabase integration
- Performance monitoring via custom service
- Route guards prevent unauthorized access
- CSP and CORS configured for secure API communication
- Bundle size limits: 20MB for initial and component styles (configured in angular.json)