# MamaSoccer Tournament App

A real-time, highly visual web application designed for managing and projecting a 16-team foosball tournament. Built perfectly suited for the vibrant "Mama Shelter" brand DNA, this application provides an end-to-end solution for guest registration, admin bracket management, and live TV broadcasting of match progress.

## 🚀 Features

*   **📱 Mobile-First Registration (`/`)**: Guests can easily register their teams (up to 16 teams per service) directly from their phones.
*   **💻 Tablet-Friendly Admin Dashboard (`/admin`)**: 
    *   Manage registrations (view, edit, delete).
    *   One-click "Generate Random Bracket" algorithm that perfectly balances teams and BYEs for any number of entries up to 16.
    *   Live match controls for scoring and declaring winners.
    *   Global countdown timer controls.
*   **📺 1080p TV Display (`/tv`)**: 
    *   A massive, real-time "Now Playing" banner for active tables.
    *   A beautifully structured, converging double-elimination bracket tree that updates instantly as teams advance.
    *   A synchronized, animated countdown timer with warning flashes (yellow at 30s, red pulse at 10s).
    *   A QR code screensaver when no matches are active to drive registrations.
*   **👥 Public Roster View (`/teams`)**: Allows anyone to see who has registered for the tournament in real-time.
*   **⚡ Real-Time Sync**: Fully powered by Supabase Realtime subscriptions to ensure all screens across the venue update within milliseconds without any page refreshes.

## 🛠 Tech Stack

*   **Frontend**: React, Vite, TypeScript
*   **Styling**: Tailwind CSS (customized with Mama Shelter brand colors: Charcoal, Neon Yellow, Neon Pink, Electric Blue, Lime Green)
*   **Animations**: Framer Motion
*   **Backend & Database**: Supabase (PostgreSQL, Row Level Security, Realtime Subscriptions)
*   **Routing**: React Router DOM

## ⚙️ Setup & Installation

### 1. Prerequisites
Ensure you have Node.js and npm installed on your machine.

### 2. Clone and Install
```bash
# Navigate to the web directory
cd web

# Install dependencies
npm install
```

### 3. Supabase Configuration
This application relies on a Supabase backend. You will need to execute the schema and set up your environment variables.

1.  Create a Supabase project at [database.new](https://database.new) (or use your existing one).
2.  Navigate to the **SQL Editor** in your Supabase dashboard.
3.  Copy the entire contents of the root `schema.sql` file and run it. This will create the necessary tables (`teams`, `matches`, `tournament_state`) and establish the correct Row Level Security (RLS) policies allowing anonymous client interactions.

### 4. Environment Variables
In the `web/` directory, create a `.env` file (or duplicate `.env.example` if available) and add your Supabase connection details:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Running the Application
```bash
# Start the Vite development server
npm run dev
```

The application will be available at `http://localhost:5173`.

## 🗺 Routing Guide

*   `http://localhost:5173/` - The Guest Registration portal.
*   `http://localhost:5173/teams` - The real-time list of registered teams. Add `?service=2` to view the second service.
*   `http://localhost:5173/admin` - The Tournament control panel.
*   `http://localhost:5173/tv` - The large-format stadium display. Add `?service=2` to display the second service.

## 🎨 Design Notes
The visual language relies heavily on dark backgrounds (`bg-gray-900`) contrasted with extreme neon accents (`#E6FF00`, `#FF0080`, `#00F0FF`). It uses the `Inter` and `Outfit` fonts to match the requested heavy, bold typography.
