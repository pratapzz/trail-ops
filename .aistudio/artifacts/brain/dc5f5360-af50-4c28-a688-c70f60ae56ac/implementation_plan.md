# TrailOPS Pre-Login Onboarding Flow & UI Refinements

This update introduces a 3-step interactive onboarding experience prior to the sign-in screen based on your three HTML designs (including developer and maintainer attribution for **Pratap Paul** at the end of Step 3), adds a direct calendar icon trigger for changing the trip countdown date on the Home screen, and places the Train Schedule section directly above the Leave Group button in the Squad workspace.

## User Review & Critical Decisions

> [!IMPORTANT]
> All requirements from your prompt and the three attached HTML onboarding designs are incorporated:
> - **Pre-Login 3-Step Onboarding Flow**: Unauthenticated users see the 3 onboarding steps before reaching the Login screen. Logged-in users skip onboarding and Login on app launch, and logging out returns the user to the onboarding flow prior to Login.
> - **Developer & Maintainer Attribution (Step 3)**: At the bottom of the 3rd onboarding step (*"Your Privacy Matters"*), a refined credit badge displays **"Developed & Maintained by Pratap Paul"**.
> - **Interactive Navigation**: Every step includes working **Next** (`Explore TrailOPS` / `Continue` / `I Agree & Get Started`), **Back**, and **Skip** controls, plus interactive **Privacy Policy** and **Terms & Conditions** readers on Step 3.
> - **Home Screen Calendar Icon for Date Change**: The Trip Countdown section on the Home screen features a Calendar icon button on the Change Date control to open and pick a new target departure date.
> - **Train Schedule Placement**: The Train Schedule card in the Squad screen is positioned immediately above the **Leave Squad Expedition** button.

---

## 1. Overview & Core Concept

- **What It Does**: Welcomes logged-out and first-time explorers with a polished 3-screen introduction to TrailOPS before authentication, credits **Pratap Paul** as developer and maintainer on the final onboarding screen, refines the Home countdown date selector with a calendar icon trigger, and positions the Train Schedule right above the Leave Group action in the Squad tab.
- **Target Audience / Persona**: Expedition leaders, faculty coordinators, and trekkers opening TrailOPS on mobile or desktop.
- **Key Value**: Gives new and logged-out users a clear, trustworthy overview of TrailOPS features, privacy guarantees, and creator attribution while keeping authenticated sessions fast and friction-free.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Unauthenticated Launch & Post-Logout Flow**:
     - **Step 1 — "Great Journeys Start Together"**: Features the custom scenic mountain & hiker SVG illustration, feature badges (`Team`, `Expenses`, `Itinerary`), a **SKIP** button in the top header (jumps straight to Login), and the **Explore TrailOPS** primary CTA button (advances to Step 2).
     - **Step 2 — "Your Journey. Better Organised."**: Showcases the 5 core toolkit cards (*Trip & Team Management*, *Smart Expense Tracking*, *Itinerary & Documents*, *Group Updates & Photos*, *Safety & Emergency Contacts*), header **Back** (returns to Step 1) and **SKIP** (jumps to Login) actions, and the **Continue** primary CTA button (advances to Step 3).
     - **Step 3 — "Your Privacy Matters"**: Displays the 4 security & privacy pillars (*Secure Authentication*, *Secure Database*, *We Only Use What's Needed*, *We Do Not Share Your Data*), interactive **Read Privacy Policy** and **Terms & Conditions** detail drawers, a header **Back** button (returns to Step 2), the **I Agree & Get Started** CTA button (navigates to the Login screen), and a footer attribution at the end of Step 3 reading **"Developed & Maintained by Pratap Paul"**.
  2. **Authenticated Launch Flow**:
     - When a user is already logged in with a completed profile, opening or refreshing TrailOPS bypasses both Onboarding and Login, landing directly on the Home screen.
     - When the user signs out from Settings, the session clears and the app returns to Step 1 of the onboarding flow before Login.
  3. **Home Screen Calendar Date Picker**:
     - On the Home screen's **Trip Countdown** card, the **Change Date** button features a prominent **Calendar** icon alongside an instant date picker trigger so users can tap the calendar icon to pick and save a new departure date.
  4. **Squad Screen Train Schedule Ordering**:
     - On the Squad screen, the **Train Schedule** section is placed immediately above the **Leave Squad Expedition** button at the bottom of the workspace.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Matches the exact pastel sunset/rose-lilac wave backdrops, floating white rounded cards (`rounded-[32px]`), and editorial serif headings (`Bodoni Moda` / `Playfair Display` paired with `Plus Jakarta Sans`) from the three provided HTML templates, with a clean, cohesive developer credit signature at the bottom of Step 3.
  - *Interactive Feedback & Motion*: Smooth step transitions between Steps 1, 2, and 3, clickable pagination indicators, and responsive touch targets ($\ge 44\text{px}$).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Session-Aware Onboarding Routing**
  - *Chosen Approach*: Tie onboarding visibility directly to authentication state—logged-in users go straight to Home (`gateway`), while unauthenticated sessions and sign-out events route to the 3-step onboarding screen (`onboarding`) before `signin`.
  - *Why*: Ensures logged-in users never see onboarding or login screens when reopening the app, while logging out cleanly restores the full pre-login experience as requested.
- **Decision 2: Native React Onboarding Component Matching Provided HTML + Creator Credit**
  - *Chosen Approach*: Convert the three attached HTML files into a unified, self-contained multi-step screen component with all SVG artwork, wave gradients, typography, interactive buttons wired to state, and the **"Developed & Maintained by Pratap Paul"** footer at the end of Step 3.
  - *Why*: Delivers instant step transitions (`Next`, `Back`, `Skip`, and `I Agree & Get Started`) with zero iframe reload flicker while prominently displaying creator attribution on the final step.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Application Session Router                        │
│  • Checks active session & profile completion on launch                 │
│  • Logged In  ──► Home Screen (Gateway)                                 │
│  • Logged Out ──► Pre-Login Onboarding (Steps 1 → 2 → 3) ──► Sign In   │
└───────────────┬─────────────────────────────────────────┬───────────────┘
                │                                         │
                ▼                                         ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────┐
│     Pre-Login Onboarding Screen       │ │   Home & Squad Enhancements   │
│  ┌─────────────────────────────────┐  │ │  • Home Trip Countdown:       │
│  │ Step 1: Great Journeys          │  │ │    Calendar icon trigger +    │
│  │  • Skip ──► Sign In             │  │ │    date picker & Save Date    │
│  │  • Next (Explore) ──► Step 2    │  │ │  • Squad Workspace Footer:    │
│  ├─────────────────────────────────┤  │ │    1. Train Schedule Card     │
│  │ Step 2: Better Organised        │  │ │    2. Leave Squad Button      │
│  │  • Back ──► Step 1              │  │ └───────────────────────────────┘
│  │  • Skip ──► Sign In             │  │
│  │  • Next (Continue) ──► Step 3   │  │
│  ├─────────────────────────────────┤  │
│  │ Step 3: Your Privacy Matters    │  │
│  │  • Back ──► Step 2              │  │
│  │  • Policy / Terms Modal Viewers │  │
│  │  • I Agree & Get Started ──►    │  │
│  │    Sign In Screen               │  │
│  │  • Footer Attribution:          │  │
│  │    "Developed & Maintained by   │  │
│  │     Pratap Paul"                │  │
│  └─────────────────────────────────┘  │
└───────────────────────────────────────┘
```

- **Interactive Component & State Mapping**:
  - **Onboarding Step State (`step: 1 | 2 | 3`)**:
    - `Next` increments `step` from `1 → 2` and `2 → 3`; on Step 3, `I Agree & Get Started` transitions `currentScreen` to `'signin'`.
    - `Back` decrements `step` from `3 → 2` and `2 → 1`.
    - `Skip` immediately transitions `currentScreen` to `'signin'`.
    - Clicking **Read Privacy Policy** or **Terms & Conditions** on Step 3 opens an in-card overlay displaying the full privacy and terms details.
    - Step 3 footer renders the developer credit: **Developed & Maintained by Pratap Paul**.
  - **Sign-Out Handler**:
    - Signing out clears the active user credentials from `localStorage` and sets `currentScreen` to `'onboarding'`, ensuring the 3-step onboarding flow appears again before the login screen.
  - **Home Countdown Calendar Icon**:
    - Clicking the Calendar icon button in the Trip Countdown header opens the date editor and triggers the native calendar picker (`showPicker()`) so the user can immediately choose and save the new countdown date.
