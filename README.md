# AI Interviewer - Interview Management Platform

A full-stack AI-powered interview platform that enables automated, proctored technical interviews with AI-driven question generation, real-time feedback, and advanced analytics.

## Features

### Core Interview Management
- **Proctored Interview Sessions**: Full-featured interview environment with video/audio monitoring
- **AI-Powered Questions**: Intelligent question generation using Google Gemini API based on candidate profiles
- **Real-time Feedback**: Instant AI feedback on candidate responses
- **Interview Scheduling**: Admin dashboard for scheduling and rescheduling interviews
- **Multi-User Support**: Separate interfaces for admins and candidates with role-based access control

### Candidate Features
- **Resume Upload & Parsing**: Automatic resume parsing using LangChain and PDF processing
- **Interview Dashboard**: View scheduled interviews and performance metrics
- **Real-time Interview Session**: Proctored interview with:
  - Real-time speech-to-text transcription (AssemblyAI)
  - AI-powered question generation
  - Audio/video monitoring and proctoring
  - Fullscreen enforcement
  - Violation detection and logging
  - Timer management

### Admin Features
- **Candidate Management**: Add, edit, delete, and view candidate profiles
- **Interview Management**: Schedule, reschedule, and cancel interviews
- **Resume Profiles**: View parsed resume data including skills, experience, and education
- **Performance Analytics**: 
  - Interview performance scores
  - Strength and weakness analysis
  - Recommended roles based on performance
  - Advanced analytics and insights
- **Interview History**: Track all candidate interviews and outcomes

### Advanced Technical Features
- **Asynchronous Job Processing**: Inngest-powered background job queue for:
  - Resume parsing and analysis
  - Interview profile creation
  - Post-interview analytics
- **Text-to-Speech (TTS)**: ElevenLabs integration for AI interviewer voice responses
- **Speech Recognition**: AssemblyAI integration for real-time candidate transcription
- **PDF Processing**: Automated resume extraction and analysis
- **Secure Authentication**: NextAuth.js with bcrypt password hashing
- **Database ORM**: Prisma with PostgreSQL for type-safe database operations

## System Architecture

### 3-Tier Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Next.js Pages (App Router)                          │   │
│  │  ├── Admin Dashboard        (/admin/*)               │   │
│  │  ├── Candidate Interview    (/candidate/*)           │   │
│  │  ├── Auth Pages             (/auth/*)                │   │
│  │  └── Home Page              (/)                      │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React Components (TailwindCSS, Framer Motion)       │   │
│  │  ├── Form Components                                 │   │
│  │  ├── Table Components                               │   │
│  │  ├── Modal Components                               │   │
│  │  └── ProctoredInterview (1113 lines)                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP(S)
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Next.js API Routes (/api/*)                         │   │
│  │  ├── Authentication       (/auth/*)                  │   │
│  │  ├── Admin Routes         (/admin/*)                │   │
│  │  ├── Candidate Routes     (/candidates/*)           │   │
│  │  ├── Interview Session    (/session/*)              │   │
│  │  └── Utilities            (/tts, /token)            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Business Logic                                      │   │
│  │  ├── Authentication (NextAuth.js)                    │   │
│  │  ├── Authorization (Role checking)                   │   │
│  │  ├── Interview Management                           │   │
│  │  └── Question Generation (Gemini AI)                │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  External Service Integration                        │   │
│  │  ├── Google Gemini (AI)                              │   │
│  │  ├── AssemblyAI (STT)                                │   │
│  │  ├── ElevenLabs (TTS)                                │   │
│  │  ├── Inngest (Jobs)                                  │   │
│  │  └── Backblaze B2 (Storage)                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓ TCP/IP
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  PostgreSQL Database                                 │   │
│  │  ├── Users          (Authentication)                 │   │
│  │  ├── Admins         (Managers)                       │   │
│  │  ├── Candidates     (Interview participants)         │   │
│  │  ├── Interviews     (Session records)                │   │
│  │  ├── InterviewQ&As  (Questions and answers)          │   │
│  │  ├── Profiles       (Resume data)                    │   │
│  │  ├── Results        (Interview outcomes)             │   │
│  │  └── Roles          (Permissions)                    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Prisma ORM (Type-safe data access)                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram - Interview Session

```
CANDIDATE                           SERVER                        AI SERVICES
┌──────────────┐
│ Browser      │
│ Interview UI │
└──────┬───────┘
       │
       │ 1. Click "Start Interview"
       ├─────────────────────────────────┐
       │                                  ▼
       │                          POST /session/start
       │                          ┌──────────────────┐
       │                          │ Generate greeting│
       │                          │ + first question │
       │                          │ (via Gemini AI)  │
       │                          └────────┬─────────┘
       │◄─────────────────────────────────┤
       │ 2. Display question               │
       │    & start recording              │
       │                                   │
       │ 3. Speak answer                   │
       │    (voice→text via AssemblyAI)    │
       │                                   │
       │ 4. Submit answer                  │
       ├─────────────────────────────────┐
       │                                  ▼
       │                      POST /session/response
       │                      ┌────────────────────┐
       │                      │ Analyze answer     │
       │                      │ Generate feedback  │
       │                      │ (via Gemini AI)    │
       │                      │ Store in DB        │
       │                      └────────┬───────────┘
       │◄─────────────────────────────┤
       │ 5. Display feedback            │
       │ 6. Request next question       │
       │                                │
       ├──────────────────────────────┐
       │                               ▼
       │                    POST /session/generate
       │                    ┌───────────────────┐
       │                    │ Generate next Q   │
       │                    │ (via Gemini AI)   │
       │                    │ Difficulty level  │
       │                    │ adjustment        │
       │                    └─────────┬─────────┘
       │◄────────────────────────────┤
       │                              │
       │ ... repeat steps 3-6 ...     │
       │                              │
       │ 7. Click "End Interview"     │
       ├─────────────────────────────┐
       │                              ▼
       │                     POST /session/end
       │                     ┌──────────────────┐
       │                     │ Mark complete    │
       │                     │ Trigger Inngest  │
       │                     │ job for profile  │
       │                     │ creation         │
       │                     └────────┬─────────┘
       │◄─────────────────────────────┤
       │ 8. Show results summary
       │
       └─ Interview session complete
```

### Background Job Processing

```
EVENT                           INNGEST                        PROCESSING
┌────────────────┐
│ Resume Upload  │
└────────┬───────┘
         │
         ├─→ event: "pdf/uploaded"
         │
         └─────────────────────────────────────┐
                                               ▼
                                    ┌──────────────────────┐
                                    │ resumeParser Job     │
                                    │ (Inngest function)   │
                                    └──────────┬───────────┘
                                               │
                                    Step 1: Extract PDF
                                    │  └─ LangChain PDF Loader
                                    │
                                    Step 2: Parse Structure
                                    │  └─ Google Gemini API
                                    │
                                    Step 3: Store Result
                                    │  └─ Prisma + PostgreSQL
                                    │
                                    Result: ResumeProfile created
                                               │
                                               ▼
                                    ┌──────────────────────┐
                                    │ ResumeProfile ready  │
                                    │ Skills extracted     │
                                    │ Job area matched     │
                                    └──────────────────────┘

┌──────────────────┐
│ Interview Done   │
└────────┬─────────┘
         │
         ├─→ event: "interview/completed"
         │
         └─────────────────────────────────────┐
                                               ▼
                                    ┌──────────────────────┐
                                    │ createInterviewProfile
                                    │ Job (Inngest)        │
                                    └──────────┬───────────┘
                                               │
                                    Step 1: Fetch all Q&As
                                    │  └─ Prisma queries
                                    │
                                    Step 2: Calculate score
                                    │  └─ Business logic
                                    │
                                    Step 3: Analyze strengths
                                    │  └─ Gemini API
                                    │
                                    Step 4: Recommend roles
                                    │  └─ Pattern matching
                                    │
                                    Step 5: Store profile
                                    │  └─ Prisma + PostgreSQL
                                    │
                                    Result: InterviewProfile created
                                               │
                                               ▼
                                    ┌──────────────────────┐
                                    │ Results ready for    │
                                    │ admin & candidate    │
                                    └──────────────────────┘
```

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   CLIENT (Browser)                      │
│  ┌──────────────┐         ┌──────────────────────────┐ │
│  │   Admin UI   │         │   Candidate Interview    │ │
│  │  Dashboard   │         │   Session Component      │ │
│  └──────────────┘         └──────────────────────────┘ │
└──────────────┬──────────────────────────────┬──────────┘
               │                              │
               └──────────┬───────────────────┘
                          │ (HTTPS)
        ┌─────────────────▼─────────────────────┐
        │     NEXT.JS SERVER (API Routes)       │
        │ ┌───────────────────────────────────┐ │
        │ │  Admin Routes    Candidate Routes  │ │
        │ │  Auth Routes     Utility Routes    │ │
        │ └───────────────────────────────────┘ │
        └──────────────────┬────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼─────┐   ┌───────▼────────┐  ┌────▼─────┐
   │PostgreSQL│   │  Inngest Jobs  │  │ External │
   │Database  │   │  (Background)   │  │  APIs    │
   └──────────┘   └────────────────┘  └──────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   ┌────▼────────┐ ┌────▼────────┐ ┌────▼────────┐
   │ Resume      │ │Interview    │ │ Google      │
   │ Parser Job  │ │ Profile Job │ │ Gemini API  │
   └─────────────┘ └─────────────┘ └─────────────┘
```

## Technology Stack

### Frontend
- **Next.js 16.0.3** - React framework with App Router
- **React 19.2.0** - UI library
- **TailwindCSS 4** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Lucide React** - Icon library
- **React Toastify** - Toast notifications
- **React Date Picker** - Date/time input components

### Backend & APIs
- **Next.js API Routes** - Serverless functions
- **Prisma 7.0.0** - Type-safe ORM
- **PostgreSQL** - Database
- **NextAuth.js 4.24.13** - Authentication & authorization
- **Inngest 3.45.1** - Workflow and background job platform

### AI & ML Services
- **Google Gemini API** - Question generation and AI feedback
- **LangChain** - PDF processing and document handling
- **AssemblyAI** - Real-time speech-to-text transcription
- **ElevenLabs** - Text-to-speech for AI responses

### Storage & File Processing
- **Backblaze B2** - Cloud storage for resumes
- **pdf-parse** - PDF extraction library
- **WAV** - Audio processing

### Development Tools
- **ESLint** - Code linting
- **Babel React Compiler** - Optimizing compiler
- **Babel Plugin React Compiler** - Performance optimization

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- PostgreSQL database
- Google Gemini API key
- AssemblyAI API key
- ElevenLabs API key (optional, for TTS)
- Backblaze B2 credentials (optional, for resume storage)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-interviewer-nextjs.git
   cd ai-interviewer-nextjs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Add the following to `.env.local`:
   ```
   # Database
   DATABASE_URL=postgresql://user:password@localhost:5432/ai_interviewer
   
   # AI Services
   GEMINI_API_KEY=your_gemini_api_key
   ASSEMBLY_AI_API_KEY=your_assembly_ai_key
   ELEVEN_LABS_API_KEY=your_elevenlabs_key
   
   # Authentication
   NEXTAUTH_SECRET=your_secret_key
   NEXTAUTH_URL=http://localhost:3000
   
   # Inngest (for background jobs)
   INNGEST_API_KEY=your_inngest_key
   INNGEST_EVENT_KEY=your_inngest_event_key
   
   # Storage
   BACKBLAZE_API_KEY=your_backblaze_key
   BACKBLAZE_BUCKET=your_bucket_name
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.