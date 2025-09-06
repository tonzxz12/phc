# Project: Quanlab (Learning Management System)

## Project Overview

Quanlab is a comprehensive Learning Management System (LMS) built with a modern technology stack. The project primarily features an Angular frontend, a PostgreSQL database managed by Prisma, and integrates with Firebase for hosting and Firestore. It also incorporates advanced functionalities through various AI and speech processing services (Deepgram, AssemblyAI, Whisper). The application is designed to be cross-platform, with capabilities for desktop (Electron) and potential mobile (Ionic) deployment.

## Technologies Used

*   **Frontend:** Angular, TypeScript, Bootstrap, PrimeNG, Tailwind CSS
*   **Backend/Database:** Node.js (implied by `package.json` scripts and `app.js`), Prisma ORM, PostgreSQL
*   **Cloud/Deployment:** Firebase (Hosting, Firestore), Docker
*   **Desktop Application:** Electron
*   **Mobile Application (Potential):** Ionic
*   **AI/Speech Processing:** Deepgram, AssemblyAI, Whisper
*   **Other Libraries:** Supabase, jQuery, SweetAlert2, Chart.js, html2canvas, jspdf, qrcode, uuid, xlsx.

## Building and Running

This project uses `npm` for package management and script execution, and `ng` (Angular CLI) for frontend-specific tasks.

### Frontend Development

*   **Start Development Server:**
    ```bash
    npm start
    # or
    ng serve
    ```
    The application will typically be available at `http://localhost:4200/`.

*   **Build Frontend for Production:**
    ```bash
    npm run build
    # or
    ng build
    ```
    Build artifacts will be generated in the `dist/quanlab/browser` directory.

*   **Watch for Changes (Development):**
    ```bash
    npm run watch
    ```

### Testing

*   **Run Frontend Unit Tests:**
    ```bash
    npm test
    # or
    ng test
    ```

### Database Operations (Prisma)

*   **Seed the Database:**
    ```bash
    npm run seed
    ```

*   **Pull Database Schema and Generate Prisma Client:**
    ```bash
    npm run pull
    ```

*   **Push Schema to Database and Generate Prisma Client:**
    ```bash
    npm run push
    ```

### Desktop Application (Electron)

*   **Run Electron Application (after Angular build):**
    ```bash
    npm run electron
    ```

*   **Build Angular and Run Electron Application:**
    ```bash
    npm run electron-build
    ```

### Docker (Frontend Deployment)

The `Dockerfile` is configured to build the Angular frontend and serve it using an Apache httpd server.

*   **Build Docker Image:**
    ```bash
    docker build -t quanlab-frontend .
    ```

*   **Run Docker Container:**
    ```bash
    docker run -p 80:80 quanlab-frontend
    ```
    The application will be accessible via `http://localhost` (or the host's IP address).

### Firebase Deployment

The project is configured for Firebase hosting.

*   **Deploy to Firebase:**
    ```bash
    ng deploy
    ```
    This command uses the `@angular/fire:deploy` builder as configured in `angular.json`.

## Development Conventions

*   **Angular CLI:** Standard Angular project structure and development practices.
*   **TypeScript:** Used throughout the Angular frontend and likely for backend logic interacting with Prisma.
*   **Prisma:** Database schema is defined in `prisma/schema.prisma`, and Prisma CLI commands are integrated into `package.json` scripts for database migrations and client generation.
*   **Styling:** Utilizes Tailwind CSS for utility-first styling, alongside Bootstrap and PrimeNG components.
*   **Code Formatting:** `.editorconfig` is present, suggesting adherence to consistent code formatting.
*   **Firebase:** Used for hosting and potentially other backend services like Firestore (rules and indexes are defined).
*   **Electron:** Integration for building a desktop version of the application.
*   **Ionic:** Indicated by `ionic.config.json` and related `npm` scripts, suggesting potential for mobile application development.
