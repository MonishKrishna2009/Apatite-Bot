# 🗺️ Development Roadmap

## 📍 Phase 1 – Core Competitive Features (High Priority)
1. LFP / LFT System ✅ **COMPLETED**
    - [x] Core Features (MVP)
        - [x] Player Post Creation (role, rank, region, availability)
        - [x] Team Post Creation (team name, roles needed, rank requirements)
        - [x] Database Storage for LFP/LFT posts
        - [x] Multi-game Support (Valorant, CS2, LoL)
        - [x] JSON Configuration System
        - [x] Dynamic Modal Generation
    - [x] Post Management
        - [x] List all user requests with detailed information
        - [x] Request cancellation for pending/approved posts
        - [x] Resend request for expired/archived posts
        - [x] Edit/Update LFP or LFT Posts
        - [x] Soft delete functionality
        - [x] Expire/Auto-Remove Old & ignored review posts
        - [x] Auto-cleanup system with archiving
    - [x] Advanced Features
        - [x] Game-specific channel routing
        - [x] Comprehensive action logging
        - [x] Detailed DM notifications
        - [x] Permission system with role-based access
        - [x] Smart edit logic (resets approved requests for review)
        - [x] Request lifecycle management
    - [ ] Future Enhancements (Stretch Goals)
        - [ ] Player Profiles Integration (track rank history, past teams)
        - [ ] Team Profiles Integration (track past rosters, tournament history)
        - [ ] Cross-Server Sync (share posts between partnered servers)
        - [ ] Advanced filtering and search
        - [ ] Request analytics and insights

2. Tournament System
    - [ ] Core Tournament Basics (MVP)
        - [ ] Tournament Creation
        - [ ] Team Registration
        - [ ] Basic Match Setup
    - [ ] Match Flow & Tracking
        - [ ] Match Lobby Auto-Setup
        - [ ] Score Reporting
        - [ ] Bracket Visualization (in Discord)
    - [ ] Enhancements & Automation
        - [ ] Notifications
        - [ ] Tournament Profiles
        - [ ] Staff Tools
    - [ ] Engagement & Advanced Features
        - [ ] Double Elimination Support
        - [ ] Predictions Integration
        - [ ] External Sync (Stretch Goal)

3. Player & Team Profiles
    - [ ] Player profile command (/profile) → rank, main roles, games
    - [ ] Team profile system → captain, roster, achievements
    - [ ] Link profiles with LFP/LFT requests

4. Request & Cleanup Improvements
    - [ ] Finalize expire/archive cleanup
    - [ ] Add per-game scalability (Valorant, CS, etc.)
    - [ ] Add scrim posting support

---

## 📍 Phase 2 – Advanced Management & Utility (Medium Priority)
1. Moderation / Automod Enhancements
    - [ ] Hybrid AI automod (filters + LLM fallback if needed)
    - [ ] Strike system → DB-based warning → escalating punishments
    - [ ] Raid mode → lockdown command
2. Utility Features
    - [ ] Role menus (self-assign game roles)
    - [ ] Verification (captcha/game-linked)
    - [ ] Custom forms for staff/tournament signup
3. Analytics (stretch goal)
    - [ ] Track usage stats (tickets opened, requests made, matches hosted)
    - [ ] Generate weekly activity summaries

--- 

## 📍 Phase 3 – Engagement & Community Retention (Medium Priority)

1. Point System (Core Backbone)
    - [ ] Universal Virtual Currency (points earned via predictions, events, scrims, activity)
    - [ ] Multi-Source Earnings (points from: tourney wins, scrims, predictions, activity, events)
    - [ ] Role Rewards (unlock special roles at certain point thresholds)
    - [ ] Shop System (users can redeem points for roles, perks, icons, cosmetics)
    - [ ] Seasonal Resets (points reset each season with Hall of Fame leaderboard)
    - [ ] Anti-Abuse System (rate limits, logging, staff oversight)
2. Prediction System (points integrated)
    - [ ] points on predicted match outcomes (1v1, team matches, tournaments)
    - [ ] **Leaderboard** → weekly/monthly resets
    - [ ] Multi-Match Predictions (predict tournament brackets in bulk)
3. Clip Submissions / Highlights (points as rewards)
    - [ ] `/submit-clip` → uploads to review channel
    - [ ] **User/Staff vote** → points awarded for best clip of the week
    - [ ] **Clip of the Month** → extra point rewards + spotlight role
    - [ ] **Social Boost** → push best clips to socials (stretch goal)
4. Giveaways & Rewards
    - [ ] Reaction/button giveaway system
    - [ ] Role-based eligibility (e.g., only tourney participants can enter)
    - [ ] Tiered Rewards (points, roles, perks)
    - [ ] Automated Winner Announcements
5. Extra Engagement Features (Stretch Goals)
    - [ ] **Scrim Finder** → auto-matchmake scrims between teams using queues
    - [ ] **MVP Votes** → in scrims/tournaments, community votes MVP, earns extra points
    - [ ] **Community Challenges** → weekly quests (e.g., "Win 3 ranked games with server tag")
    - [ ] **Leveling Integration** → merge with Discord XP system for hybrid progression

---