# Project Context for Qwen Code

## Project Overview

This project is a Learning Management System (LMS) named **Quanby LMS (PHC LMS)**, built using the **Angular** framework (v18.x). It is a comprehensive frontend application designed to manage online learning for students, teachers, and administrators. The application integrates with various external services for features like text-to-speech, speech recognition, and real-time communication.

The core structure is based on an Angular CLI-generated application, organized into components, services, and modules under the `src/app` directory. It uses **Tailwind CSS** and **PrimeNG** for styling and UI components, with **Firebase** and **Supabase** integration for backend services and authentication. The project also includes a **Prisma** schema (`prisma/schema.prisma`) defining a complex database structure for users (students, teachers, admins), courses, assessments, assignments, communication forums, and speech lab functionalities.

## Key Technologies

*   **Framework:** Angular (v18.x)
*   **Language:** TypeScript, HTML, CSS
*   **Styling:** Tailwind CSS, PrimeNG
*   **State Management/Communication:** RxJS, HttpClient for API calls, WebSocket for real-time features.
*   **Backend Communication:** RESTful APIs (defined in `environment.ts`), Prisma ORM (for database schema definition).
*   **External Services:** Firebase, Supabase, AssemblyAI, Lexicala, various RapidAPI services for TTS/Speech Recognition.
*   **Build Tool:** Angular CLI via `angular.json`.

## Application Structure (Key Areas)

*   **Authentication:** Login and user-specific routing guards (`src/app/components/auth`, `src/app/services/guard`).
*   **User Roles:** Distinct dashboards and features for Students (`src/app/components/student`), Teachers (`src/app/components/teacher`), and Admins (`src/app/components/admin`).
*   **Core Learning Features:**
    *   Course management (Courses, Lessons, Topics).
    *   Assessments (Quizzes, Assignments) with various question types and grading rubrics.
    *   Practice modules.
    *   Performance tracking and analytics.
*   **Communication:**
    *   Forums (Course-specific and General Topics).
    *   Messaging.
    *   Video conferencing integration (Quanhub).
*   **Speech Lab:** A dedicated section for speech practice, including drills, lessons, and analyzers using external speech APIs.
*   **File Handling:** PDF and document viewing capabilities.

## Development Environment & Commands

*   **Install Dependencies:** `npm install`
*   **Development Server:** `npm start` or `ng serve` (runs on `http://localhost:4200/`). The app auto-reloads on file changes.
*   **Build:** `npm run build` or `ng build` (outputs to `dist/quanlab`).
*   **Testing:** `npm test` or `ng test` (uses Karma).
*   **Prisma:** Database schema is managed with Prisma. Commands like `npm run pull` and `npm run push` are defined for schema synchronization.

## Development Conventions

*   Follows standard Angular project structure and conventions (Modules, Components, Services).
*   Uses PrimeNG and Tailwind CSS for UI components and styling.
*   TypeScript strict mode is enabled (`tsconfig.json`).
*   Code is organized by feature (e.g., student, teacher, admin) and shared components/services.
*   Routing is managed via `AppRoutingModule` with guards for role-based access control.
*   Environment-specific variables are defined in `src/environments/environment.ts`.

## Important Notes

*   This is a frontend application. Backend services are expected to be running at the URLs specified in `environment.ts` (e.g., `https://core.quanbylab.com`).
*   The project includes a Prisma schema for a PostgreSQL database, indicating the backend likely uses Prisma.
*   There are specific sections for a 'Speech Lab' and integrations with services like AssemblyAI, suggesting advanced multimedia capabilities.
*   The project uses various third-party APIs, which require valid keys (some of which are present in the environment file).