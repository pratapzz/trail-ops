# TRAIL OPS — Real Data Cleanup, Telephony Sync, Live Attendance & Simplified UI

Consolidate TRAIL OPS into a clean, clutter-free, real-data expedition tool: eliminate all remaining demo records, add developer attribution for Pratap Paul, enable synchronized emergency telephony, simplify in-app wording into clear friendly language, add image attachments to squad broadcasts with live notification alerts, and transform attendance into a commander-triggered live roll call with real-time Present vs Pending counters.

### User Review & Critical Decisions

> [!IMPORTANT]
> The revised scope synthesizes all prior requirements with the three newly requested features:
> 
> - **1. Simplified, Friendly Language (Clutter-Free)**: Replace dense military/technical jargon (e.g. "Telemetry telemetry", "Biometric contraindications", "Geofence geodetic perimeter", "Lossless RAW AirBeam") with plain, clean, human-readable English across the app (Home, Roll Call, Vault, Drive, Splitwise), while keeping the SOS screen sharp and punchy for emergencies.
> - **2. Image-Enabled Announcements & Live Squad Notifications**: Commanders and leads can attach a photo/image directly to any squad broadcast. Once published, all squad members receive a visible in-app notification banner and alert modal highlighting the new announcement with its image.
> - **3. Commander-Initiated Live Roll Call**:
>   - Only Super Admin has the "Start Roll Call" trigger button.
>   - When triggered, an active Attendance Notification Popup opens immediately on all squad members' phones with a one-tap button: **"I Am Present"**.
>   - In real-time, the roll call card displays live stats for everyone: **Present: X**, **Pending: Y**, and a live list of who has checked in and who is still pending.
> - **4. Home Screen Real Member Counting**: Replaces the static `38 / 42` demo counter with dynamic counts from real squad membership (`presentCount / totalCount`).
> - **5. Group Join Pending Queue**: Removes hardcoded applicants (`Rohan Sharma` and `Ananya Verma`) from `SquadRollCallScreen.tsx`. Starts empty and manages genuine join requests.
> - **6. Settings Developer Attribution**: Formally credits **Pratap Paul** as Lead Architect & Developer of TRAIL OPS in the Settings footer.
> - **7. SOS Telephony Synchronization**: Purges hardcoded demo numbers (`Prof. Roy`, `Dr. Anita`, `Tenzing`, `1077`). Contacts added by any squad member synchronize to every member's app, and deletions remove the line for the entire squad.
> - **8. HD Media Vault Delete Action**: Replaces the minus icon with a clear `<Trash2 />` **Delete** action button with confirmation.

---

### 1. Overview & Core Concept

TRAIL OPS is transformed from a static demo into a live, collaborative expedition tool for real groups. With this update:
1. Every string in the app is easy to read, simple, and clutter-free.
2. Group roll call becomes a real-time event: the expedition leader starts roll call, members tap a popup on their phones to confirm presence, and the attendance dashboard updates live for all members showing who is present and who is pending.
3. Broadcasts support visual information (trail maps, weather photos, schedules) and notify the entire group immediately.
4. Emergency contacts and route helplines are synchronized across all devices with zero dummy records.
5. Developer Pratap Paul is properly attributed in Settings.

---

### 2. User Experience & Visual Design

#### A. Commander-Triggered Live Roll Call System
- **Super Admin View**:
  - A prominent action: **"Start Squad Roll Call"** with active status indicator.
  - When active, shows a live session timer and real-time counter: **Present: [X]** · **Pending: [Y]** (e.g., *Present: 1 · Pending: 2*).
  - Ability to end or reset the roll-call session.
- **Member View (All Squad Devices)**:
  - When the Super Admin launches a roll call, a high-visibility modal opens over the app:
    - Title: **"📢 Roll Call in Progress"**
    - Message: *"Your Squad Commander has initiated attendance. Please tap below to confirm you are safe and present."*
    - Action: Large green button: **"✓ I Am Present"**.
  - Once tapped, the button turns to **"✓ Marked Present"** with a timestamp, and updates the live squad tally for everyone instantly.
  - Members who have not yet checked in are listed under **Pending Members**, allowing leaders to quickly identify who is missing.

#### B. Image-Supported Broadcasts & Instant Squad Alerts
- **Composer**: When writing an announcement (Critical, Advisory, or Info), the composer includes an **"Attach Photo / Map"** button allowing device image selection or camera capture.
- **Broadcast Delivery**:
  - Saved to the shared squad broadcast feed.
  - Triggers an instant in-app notification popup on every squad member's screen displaying the broadcast headline, author, priority badge, and attached photo preview.
  - Tapping the notification takes the member directly to the full announcement.

#### C. Simplified, Friendly Copy (Clutter-Free)
- **Home / Gateway**:
  - "Squad Telemetry Online" $\rightarrow$ **"Squad Connected"**
  - "Perimeter Marker #3 Assembly" $\rightarrow$ **"Current Camp: Base Camp"**
  - "38 / 42 (90%) Present in Camp" $\rightarrow$ **Real squad counts: e.g. "1 / 1 Present"**
  - "Personal Trail Packing To-Do" $\rightarrow$ **"My Packing List"**
  - "Dual-band satellite & LoRa relay" $\rightarrow$ **"One-tap emergency help"**
- **Roll Call & Directory**:
  - Clear labels: "Squad Members", "Invite Code", "Announcements", "Group Expenses".
  - Clean cards without duplicate technical tags.
- **Settings**:
  - Attribution clearly states: **"TRAIL OPS · Developed by Pratap Paul"**.

#### D. Synchronized Emergency Numbers
- **Directory**: Leads and Route Helplines start clean with zero fabricated numbers.
- **Add / Remove**: Any squad member can add a local rescue line, guide contact, or camp doctor. The addition broadcasts and syncs across all squad devices via shared squad records (`trailoPS_emergency_helplines_${squadId}`). Deleting a contact removes it for all members.
- **One-Tap Calling**: Tapping any registered contact opens the device's native phone dialer (`tel:`).

#### E. Media Vault Delete Control
- The ambiguous minus button on media cards is replaced with an explicit, red-accented button: `<Trash2 className="w-3.5 h-3.5" />` with label **"Delete"**, accompanied by a confirmation prompt to prevent accidental removal.

---

### 3. Key Product Decisions & Trade-Offs

- **Real-Time Roll Call Coordination**:
  - *Chosen Approach*: Store live roll-call session state keyed by squad ID (`trailoPS_active_rollcall_${squadId}` and Supabase squad record). It tracks `sessionId`, `startedAt`, `active`, and `presentUserIds: string[]`.
  - *Why*: Allows instant synchronized responses on any squad member's phone without requiring complex third-party backend servers. Members who open the app see the attendance modal immediately as long as the session is active.
- **Broadcast Image Storage**:
  - *Chosen Approach*: Support image attachments encoded as compressed high-quality Data URIs or Supabase media URLs, displaying inline in both the announcement card and the notification alert popup.
  - *Why*: Allows visual warnings (e.g. photo of trail obstacle or route map) to be viewed even in offline or weak 3G conditions.
- **Uncluttering Strategy**:
  - *Chosen Approach*: Strip out verbose military mock descriptors ("tactical telemetry", "geodesic perimeter", "SAR synced") in favor of clear, friendly trekker terms, keeping the SOS distress section urgent, clean, and unambiguous.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                              APP STATE                                 │
│      Active Squad • User Role • Authenticated Members • Database       │
└───────────┬────────────────────────────┬───────────────────────────────┘
            │                            │
            ▼                            ▼
┌────────────────────────┐   ┌───────────────────────────────────────────┐
│   GatewayScreen.tsx    │   │         SquadRollCallScreen.tsx           │
│ • Real dynamic counts  │   │ • Super Admin: "Start Roll Call" button   │
│   (Present / Total)    │   │ • Real-time counter (Present vs Pending)  │
│ • Simplified friendly  │   │ • Member: Attendance popup notification   │
│   text throughout      │   │ • Multimodal broadcast (Text + Image)     │
└───────────┬────────────┘   │ • Empty pending queue (real requests)     │
            │                │ • Trash2 "Delete" button on media vault   │
            │                └─────────────────────┬─────────────────────┘
            ▼                                      ▼
┌────────────────────────┐   ┌───────────────────────────────────────────┐
│   EmergencySOSScreen   │   │            SettingsScreen.tsx             │
│ • Zero demo numbers    │   │ • Developer Credit: Pratap Paul           │
│ • Shared squad sync    │   │ • Clean user-friendly settings            │
│ • Cross-device delete  │   └───────────────────────────────────────────┘
└────────────────────────┘
```

#### Shared Squad Synchronization Models

| State Channel | Data Object | Cross-Device Sync Behavior |
|---|---|---|
| **Active Roll Call** | `{ active: boolean, startedAt: string, presentUserIds: string[] }` | When Super Admin activates, all member apps show attendance modal; real-time counter updates as users mark present |
| **Broadcasts** | `{ id, title, text, imageUrl?, priority, author, timestamp }` | When posted, triggers squad-wide alert popup with photo preview |
| **Emergency Helplines**| `{ id, name, phone, subtext, type }[]` | Shared across group; additions and deletions sync to all devices |
| **Join Requests** | `{ id, userId, name, avatar, requestedAt }[]` | Super Admin can approve or decline real incoming requests |

---

### 5. Detailed Implementation Steps

1. **Roll Call System & Attendance Popup**:
   - Add roll-call session state to `App.tsx` and `SquadRollCallScreen.tsx`.
   - Provide Super Admin with **"Start Roll Call"** and **"End Roll Call"** controls.
   - Implement the `AttendanceAlertModal` that pops up on members' devices when a roll call is triggered, with a one-tap **"I Am Present"** button.
   - Display real-time attendance stats: **Present: X** and **Pending: Y**, with member status badges.
2. **Multimodal Broadcasts with Images & Squad Alerts**:
   - Update announcement modal to include image attachment (photo upload / camera).
   - Display announcement image in feed cards.
   - Implement `BroadcastAlertModal` that pops up for all squad members when an announcement is posted.
3. **App-Wide Text Simplification (Clutter-Free)**:
   - Audit and replace dense military jargon across `GatewayScreen`, `SquadRollCallScreen`, `FeedScreen`, `SplitwiseModal`, and `FacultyDriveModal` with clean, friendly, natural wording.
   - Maintain strong, clear emergency wording in `EmergencySOSScreen`.
4. **Home Screen Real Member Counting**:
   - Update `GatewayScreen.tsx` to calculate and show real member numbers (e.g. `1 / 1 Present`, `100%`) instead of hardcoded `38 / 42`.
5. **Pending Group Queue Cleanup**:
   - Remove `"Rohan Sharma"` and `"Ananya Verma"` from `SquadRollCallScreen.tsx`.
   - Initialize queue empty `[]` and support real applicant approvals.
6. **Settings Developer Attribution**:
   - Add explicit credit in `SettingsScreen.tsx`: **"Architect & Developer: Pratap Paul"**.
7. **Emergency Contacts & Helplines Sync**:
   - Remove hardcoded demo leads and helplines from `EmergencySOSScreen.tsx`.
   - Connect emergency contacts to squad-synchronized storage so adding/removing updates for all squad members.
8. **HD Media Vault Delete Action**:
   - Replace `<Minus />` button with an explicit `<Trash2 />` **Delete** action button with confirmation toast.
9. **Verification**:
   - Run `compile_applet` and `lint_applet` to confirm clean compilation and zero errors.
