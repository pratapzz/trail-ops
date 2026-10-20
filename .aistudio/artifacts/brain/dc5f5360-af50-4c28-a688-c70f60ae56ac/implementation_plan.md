# TRAIL OPS — Mandatory Super Admin, Role Management, Group-Wide Continuous SOS Siren & Secure Group Deletion

Implement strict, transactionally secure Super Admin rules, safe transfer of group control, multi-admin promotion/demotion governance, emergency platform recovery, cascading group deletion, and real-time group-wide continuous SOS multi-tone sirens with phone dialer integration for faculty and commanders.

### User Review & Critical Decisions

> [!IMPORTANT]
> The updated plan synthesizes all role management rules and the newly confirmed SOS emergency features:
>
> 1. **Group-Wide Continuous SOS Siren**: When any squad member presses the SOS button, an urgent, continuous multi-tone emergency siren sound (Web Audio API synthesis) along with device vibration (`navigator.vibrate`) triggers immediately across **all members' phones in the squad**. A persistent emergency popup displays the distressed member's identity, timestamp, and location, and continues ringing until silenced or acknowledged.
> 2. **Add Faculty / Commander Emergency Numbers**: In the SOS screen, Super Admins, Admins, and Faculty can tap a `+ Add Number` button to add key emergency contact lines (Name, Role: Faculty/Super Admin/Admin, Phone Number). Every contact card provides an instant one-tap call button that redirects directly to the native phone dialer app (`tel:<number>`). Contacts synchronize across all squad members' devices in real time.
> 3. **Mandatory Super Admin Invariant**: Every active group must always have at least 1 Super Admin. Database triggers and transactional RPC functions reject any operation that leaves a group with zero Super Admins.
> 4. **Successor Appointment Flow**: When the last remaining Super Admin attempts to leave or step down, the system blocks the action and presents an interactive **"Appoint Successor"** modal. The transfer must succeed before the departing Super Admin can leave or demote.
> 5. **Multiple Super Admins**: Groups can have multiple Super Admins. Any authorized Super Admin can promote/demote members and other Super Admins, provided at least one Super Admin remains.
> 6. **Platform-Level Super Admin Recovery**: For recovering legacy groups that might lack a Super Admin, an authorized Platform Recovery tool with emergency master recovery verification is provided in Settings, preventing orphaned groups without silent random assignments.
> 7. **Super Admin Group Deletion**: Only an authorized Super Admin can delete a group. Requires typing the exact group name in a high-consequence confirmation modal. Performs transactional cascade deletion across all linked tables (memberships, itineraries, seat assignments, vault items) and cleans up Supabase storage files with clear error boundaries, without touching user personal accounts.

---

### 1. Overview & Core Concept

TRAIL OPS provides real-time safety, roll-call attendance, and emergency coordination for alpine and wilderness expeditions. In high-stakes outdoor environments, safety relies on two pillars: unambiguous leadership command and immediate, unignorable distress signaling.

This update introduces:
1. **Group-Wide Emergency Broadcast & Continuous Siren**: An SOS trigger by any member rings an audible, high-intensity dual-frequency oscillating siren on every squad member's device simultaneously, accompanied by device vibration and a top-priority emergency response modal.
2. **Faculty & Commander Emergency Contacts (`+ Add Number`)**: Super Admins, Admins, and Faculty can add emergency mobile lines for professors, lead guides, and commanders, with one-tap native dialer redirection (`tel:`) and live squad-wide synchronization.
3. **Creator Auto-Assignment & Mandatory Super Admin**: The creator is transactionally assigned as `super_admin`. Database constraints and server-side RPCs guarantee that no group can ever be left without a Super Admin.
4. **Safe Transfer of Control**: The sole Super Admin must name an active successor before stepping down or leaving.
5. **Secure Group Deletion**: A protected Super Admin Danger Zone that cascades deletions across all group data, removes cloud media files safely, and notifies all connected devices.
6. **Platform Emergency Recovery**: A secure tool in Settings for platform administrators to assign a Super Admin to any group in an irregular state.

---

### 2. User Experience & Visual Design

#### A. Group-Wide Continuous SOS Siren & Alert Modal
- **Member SOS Trigger**:
  - Tapping and confirming the SOS button immediately activates distress status in Supabase (`status = 'distress'`) and broadcasts a `trailoPS_squad_sos_alarm` event via Supabase Realtime and browser channels.
- **Audible Emergency Siren on All Squad Members' Phones**:
  - Implemented using a synthesized Web Audio API emergency siren (oscillating between 850Hz and 1250Hz with harmonics), avoiding reliance on external audio files that could fail in offline/low-bandwidth situations.
  - Paired with continuous vibration pulses via `navigator.vibrate([600, 200, 600, 200, 1000])`.
  - **Emergency Siren Modal**:
    - High-visibility red backdrop with animated beacon rings.
    - Large text: **"EMERGENCY SOS SIGNAL RECEIVED"**.
    - Member name, role, battery level, and timestamp.
    - Prominent action buttons:
      - **"Mute Siren & Acknowledge"**: Silences the continuous audio loop on this device.
      - **"Call Distress Member"**: Direct dialer redirect (`tel:<distress_phone>`).
      - **"Locate on Map / Coordinates"**: Displays GPS coordinates for rescue routing.

#### B. Faculty & Commander Number Management (`+ Add Number`) in SOS
- Located in `EmergencySOSScreen.tsx` under **"Expedition Leadership & Faculty Contacts"**:
  - **`+ Add Number` Button**: Visible to Super Admins, Admins, and Faculty. Clean rounded button with a plus icon.
  - **Add Contact Modal**:
    - Contact Name (e.g., `Dr. R. K. Banerjee`, `Prof. S. Sen`, `Lead Guide Tenzing`).
    - Role selector: `Faculty / Medical Lead`, `Super Admin / Commander`, `Admin / Safety Officer`.
    - Phone Number field with input validation (e.g., `+91 98300 12345`).
    - Optional Designation/Notes.
  - **Direct Dialer Action**:
    - Each contact card displays a green **"Call Now"** button (`<PhoneCall />`).
    - Clicking the button directly invokes `window.location.href = 'tel:' + sanitizedNumber`, opening the user's phone dialer app with the number pre-filled.
  - **Shared Synchronization**:
    - Persisted in Supabase and local storage (`trailoPS_emergency_contacts_<groupId>`).
    - When any admin adds or removes a number, the change synchronizes across all group members' devices.

#### C. Super Admin Badge & Role Management in Squad Members List
- **Visual Display**:
  - Super Admins display a gold `Crown` icon with a clean, unboxed label: `Super Admin · Squad Leader`.
  - Admins display a silver `Shield` icon: `Admin · Navigator`.
  - Faculty display an emerald `Award` icon: `Faculty · Expedition Advisor`.
  - Regular members display: `Member · Squad Explorer`.
- **Role Actions**:
  - Super Admins can promote/demote members.
  - If a Super Admin attempts to demote or remove the *last remaining Super Admin*, the action is blocked with an explanatory notice: *"At least one Super Admin must remain in the squad."*

#### D. Safe Transfer of Control Modal
- Triggered when the last Super Admin attempts to leave or step down:
  - **Modal Header**: `Transfer Squad Leadership`
  - Explains that a successor must be appointed before the sole Super Admin can step down.
  - Displays eligible active members.
  - Promoting the successor and executing the leave/demote occurs in an atomic, verified sequence.

#### E. Super Admin Group Deletion in Settings (Danger Zone)
- Visible **only** to the active Super Admin.
- Displays summary of data that will be erased.
- Requires typing the exact squad name to unlock the delete button.
- Cascade-cleans DB rows and cloud storage files, emits a realtime deletion broadcast, and returns members to the Gateway screen.

---

### 3. Key Product Decisions & Trade-Offs

#### Decision 1: Web Audio API Oscillator vs. Static MP3 for Emergency Siren
- **Chosen Approach**: Pure Web Audio API synthesized oscillating siren with dual oscillators (carrier 950Hz modulated by 4Hz LFO).
- **Why**: Wilderness apps often have spotty cellular connections. A static MP3 audio file might fail to load over flaky 2G/EDGE networks or get blocked by CORS. Web Audio API generates immediate, loud, zero-latency sound entirely in-browser without any network requests.
- **Alternatives Considered**: Bundled MP3 file was considered but Web Audio guarantees 100% offline reliability.

#### Decision 2: Permission Guard for Adding Leadership Contacts
- **Chosen Approach**: Allow Super Admins, Admins, and Faculty to add/edit emergency contact lines, while allowing all members to view and dial them.
- **Why**: Directly aligns with the user's preference and prevents accidental vandalism of emergency numbers by junior members while keeping leadership agile.

#### Decision 3: Atomic Invariant Enforcement
- **Chosen Approach**: Database triggers (`tr_prevent_orphan_group`) and transactional PostgreSQL functions (`manage_member_role`, `leave_squad_safely`, `delete_squad_group_cascade`) coupled with client-side optimistic synchronization.
- **Why**: Prevents race conditions where two Super Admins might try to demote each other simultaneously.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TRAIL OPS Client (React SPA)                    │
├──────────────────────────┬─────────────────────────────┬───────────────┤
│    EmergencySOSScreen    │     SquadRollCallScreen     │ SettingsScreen│
│(Continuous Siren, Add Num│(Role Management, Promotion, │(Delete Squad, │
│ Dialer Redirect, Helplines (Control Transfer Modal)    │ Recovery)     │
└────────────┬─────────────┴──────────────┬──────────────┴───────┬───────┘
             │                            │                      │
             ▼                            ▼                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Audio & Realtime Services Layer                    │
│  • Web Audio Siren Generator (Oscillating continuous alarm loop)       │
│  • Device Vibration Controller (navigator.vibrate pattern)             │
│  • Supabase Realtime & Broadcast Channels ('squad_emergency_alarm')    │
│  • Native Dialer Hook (window.location.href = 'tel:...')               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   src/lib/supabase.ts (API & RPC Layer)                │
│  - triggerSquadSOS()            - manageMemberRole()                   │
│  - addEmergencyContact()        - transferAndLeaveSquad()              │
│  - deleteEmergencyContact()     - deleteSquadGroupCascade()            │
│  - recoverGroupSuperAdmin()     - createSquadGroup()                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Supabase PostgreSQL Backend                        │
├────────────────────────────────────────────────────────────────────────┤
│  Tables:                                                               │
│   • squad_groups (id, name, code, created_by)                          │
│   • squad_members (id, group_id, user_id, role, status)                │
│   • squad_emergency_contacts (id, group_id, name, role, phone, added_by)│
│   • squad_audit_logs (id, group_id, actor_id, action, details)         │
│   • train_journeys / train_seat_assignments / media_vault_items        │
│                                                                        │
│  Triggers & RPCs:                                                      │
│   • tr_enforce_mandatory_super_admin                                   │
│   • rpc: manage_member_role()                                          │
│   • rpc: transfer_and_leave_squad()                                    │
│   • rpc: delete_squad_group_cascade()                                  │
│   • rpc: recover_group_super_admin()                                   │
│                                                                        │
│  Storage:                                                              │
│   • trailops-media bucket (purged on group deletion)                   │
└────────────────────────────────────────────────────────────────────────┘
```

#### New & Updated Components

1. **`src/lib/emergencyAudio.ts`**:
   - Web Audio API dual-tone siren engine (`startEmergencySiren()`, `stopEmergencySiren()`).
   - Mobile vibration trigger (`startEmergencyVibration()`, `stopEmergencyVibration()`).
2. **`src/components/modals/EmergencySirenAlertModal.tsx`**:
   - Fullscreen emergency distress alert that pops up on all squad members' devices when SOS is active.
   - Shows distress member info, GPS coordinates, one-tap "Call Distress Member" dialer link, and "Mute Siren & Acknowledge" button.
3. **`src/components/modals/AddEmergencyContactModal.tsx`**:
   - Modal to add Faculty, Super Admin, or Admin phone numbers.
   - Saves to Supabase and broadcasts update to all squad members.
4. **`src/components/EmergencySOSScreen.tsx`**:
   - Integrated `+ Add Contact` button for Super Admin, Admin, and Faculty.
   - One-tap phone dialer redirection (`tel:<number>`).
   - Group-wide SOS siren trigger on emergency button activation.
5. **`src/components/modals/TransferSuperAdminModal.tsx`**:
   - Modal prompting sole Super Admin to select a successor before leaving or demoting.
6. **`src/components/modals/DeleteGroupModal.tsx`**:
   - Super Admin deletion confirmation requiring exact group name match, cascade cleanup, and storage file deletion.
7. **`src/components/SettingsScreen.tsx`**:
   - Danger zone for group deletion, control transfer action, and platform recovery console.
8. **`src/components/SquadRollCallScreen.tsx`**:
   - Role promotion/demotion actions with single Super Admin protection.

#### Verification & Testing Plan
- **Test 1: SOS Continuous Siren & Vibration**: Trigger SOS from member account; verify continuous multi-tone oscillating alarm plays and vibration activates on all squad members' devices; verify "Mute Siren" stops the sound.
- **Test 2: Add Emergency Contact & Dialer Redirect**: With Super Admin/Faculty role, tap `+ Add Number`, add contact; verify number appears on all members' screens; tap "Call Now", verify browser triggers `tel:` protocol.
- **Test 3: Single Super Admin Protection**: With 1 Super Admin, verify self-demotion or leaving is blocked and triggers the Transfer Successor modal.
- **Test 4: Successor Transfer**: Appoint an active member as Super Admin; verify successor receives role and original Super Admin can leave cleanly.
- **Test 5: Multiple Super Admins**: With 2 Super Admins, verify promotion and demotion work smoothly while keeping at least 1 Super Admin.
- **Test 6: Emergency Recovery**: Test platform recovery tool with master key to assign Super Admin to a test squad with 0 admins.
- **Test 7: Secure Group Deletion**: Verify only Super Admin can delete group; verify name match validation; verify cascade cleanup of DB tables and storage files; verify all members are notified and returned to Gateway screen.
