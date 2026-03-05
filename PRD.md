📄 Product Requirements Document (PRD)
Project Name: Mama Shelter Foosball Tournament App

Target Event: Father's Day Brunch (2 Services)

Core Vibe: Urban, trendy, fast-paced, and highly visual.

1. Project Overview
A real-time, web-based tournament management application. The app allows restaurant guests to register their foosball duos via mobile, while staff manage the matches on a tablet. The tournament bracket, current matches, and a synchronized countdown timer are projected on the restaurant's TV screens in real-time.

Key Mechanics:

Capacity: 2 separate tournaments (Service 1 & Service 2). Max 16 teams per service (fallback to 8).

Format: Single-elimination bracket.

Hardware: 2 Foosball tables playing simultaneously.

Timing: Fixed 4-minute matches governed by a global timer.

2. Tech Stack Recommendations (For the Dev/AI)
Frontend: Next.js (React) or Vite + React.

Styling: Tailwind CSS + Framer Motion (for smooth bracket transitions and timer alerts).

Backend/Database: Supabase 
keys: 




3. User Views & Features
A. Registration View (Public, Mobile-First)
Accessed via URL link (pre-event email) or QR Code on tables.

UI/UX: Simple, bold, mobile-optimized form.

Fields:

Team Name (Fun/quirky names encouraged).

Player 1 Name.

Player 2 Name.

Dropdown: Select Service (Service 1: 12h-14h | Service 2: 14h-16h00).

Logic & Constraints:

Real-time counter showing remaining spots (e.g., "12/16 teams registered").

If a service reaches 16 teams, disable the form for that service and display a "Service Full" state.

Success Screen: "You're in! Keep an eye on the TV screens for your match."

B. Admin Dashboard (Staff, Tablet/Mobile)
Password-protected view used by the staff member managing the tables.

Pre-Tournament Phase:

View list of registered teams per service.

Button: "Generate Bracket" (Randomizes matchups for 8 or 16 teams).

Active Tournament Phase:

Now Playing Module: Displays the current matchup for Table 1 and Table 2.

Global Timer Control: A prominent "START 4:00 TIMER" button. (This must instantly trigger the timer on the TV screen).

Score Input: Simple + and - buttons to log goals for each team on Table 1 and Table 2 while the timer runs.

End Match & Advance: When time is up, the admin clicks a button to declare the winners for both tables. The winning teams automatically advance to the next round in the database.

Override: Ability to manually edit a score or manually advance a team in case of a no-show.

C. TV Display View (Public, 1080p Landscape)
Projected on the restaurant screens. No user interaction, just a real-time visual dashboard.

The Bracket (Tournament Tree): Visual representation of the Round of 16, Quarter-finals, Semi-finals, and Final. Highlights the active teams.

"Now Playing" Banner: Clearly shows who needs to be at the tables.

MESA 1: Team A vs Team B

MESA 2: Team C vs Team D

The Giant Timer:

Synced perfectly with the Admin's start button.

Counts down from 4:00.

Animation: Flashes yellow at 30 seconds, and pulsing red for the final 10 seconds to create hype in the restaurant.

Live Scores: Displays the points entered by the Admin in real-time next to the "Now Playing" teams.

4. Design System & UI "Vibe"
Theme: "Mama Shelter DNA" - Dark mode background (charcoal/black) to make the text pop on TVs.

Accents: Neon colors (Neon Pink, Electric Blue, Lime Green) for the active matches, the timer, and winning teams.

Typography: Massive, heavy sans-serif fonts (e.g., font-black, uppercase). It must be easily readable from 10 meters away.

Empty States: If no matches are currently playing, show a screensaver-style looping graphic: "TORNEIO DE MATRAQUILHOS - MAMA LISBOA - [QR CODE]"

5. High-Level Data Model (For the Dev/AI)
Teams Table: id, name, player1, player2, service_id, created_at.

Matches Table: id, tournament_id, round (16, 8, 4, 2), table_number (1 or 2), team1_id, team2_id, team1_score, team2_score, winner_id, status (pending, active, completed).

Tournament_State Table: service_id, global_timer_status (stopped, running), timer_ends_at (timestamp for syncing the countdown).