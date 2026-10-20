# TRAIL OPS — Production Bug Audit & Implementation Plan

## A. Executive Summary
TrailoPS is a robust React + TypeScript + Vite expedition operations platform utilizing Supabase for backend database storage, Row Level Security (RLS), authentication, and realtime subscriptions. While core UI components and features (group creation, roll call, HD Vault, Faculty Drive, chat, and SOS) are operational, several cross-device synchronization, authentication redirect, RLS scoping, and realtime event propagation issues require systematic resolution.

This audit report identifies shared root causes across database RLS policies, Supabase Realtime publication configurations, client state synchronization cycles, and OAuth redirect parameters. We present a rigorous, phased implementation plan designed to ensure 100% data preservation, zero downtime, strict multi-tenant group isolation, and enterprise-grade safety for emergency SOS systems without requiring migration to Firebase.

---

## B. Feature-by-Feature Findings & Root Causes

1. **Google Login**
   - *Finding*: Google OAuth redirects occasionally fail or reset session state in preview/production if redirect URLs mismatch or PKCE session tokens are dropped.
   - *Root Cause*: Missing explicit site URL configuration in Supabase Auth redirect settings, combined with strict third-party cookie restrictions in browser iframes. Email/password authentication remains fully stable as a reliable fallback.

2. **Announcement Pop-ups**
   - *Finding*: Announcements are stored and appear in history/notifications lists, but active modal pop-ups do not trigger across active users.
   - *Root Cause*: Client subscriptions rely solely on polling intervals rather than Supabase Realtime broadcast channels (`trailops_squad_bus_*`) coupled with unread notification state flags (`trailoPS_seen_notice_*`).

3. **Shared Checklists**
   - *Finding*: Super Admin checklist additions do not instantly propagate to member devices.
   - *Root Cause*: Gear checklists and packing notes have been managed primarily in local storage or un-synced database JSON blobs (`gear_checklist` columns without dedicated broadcast triggers or real-time Postgres changes subscriptions).

4. **HD Vault**
   - *Finding*: Media uploads succeed for the uploader, but appear empty for other squad members.
   - *Root Cause*: Supabase Storage bucket policies (`squad-vault`) or metadata table queries (`squad_media`) lack proper RLS SELECT permissions for non-creators in the same group, or file public URLs are not correctly resolved across devices.

5. **Faculty Drive**
   - *Finding*: Trip documents and permits uploaded by admin are not visible to ordinary members.
   - *Root Cause*: Metadata records in the backend database or storage bucket are filtered by `created_by = auth.uid()` instead of verifying membership in `squad_members` for the active group.

6. **Base Camp Check-in / Squad Roll Call**
   - *Finding*: Roll call sessions initiated by organizers do not trigger push prompts for members.
   - *Root Cause*: Active session states are stored in localStorage rather than persistent Postgres tables (`squad_roll_call_sessions` and `squad_roll_call_responses`), preventing cross-device polling and realtime events.

7. **Profile Persistence**
   - *Finding*: Profile data occasionally reverts or appears blank after deployments or re-authentication.
   - *Root Cause*: Fallback to local storage drafts when Supabase profile upsert fails due to schema mismatch or missing `user_id` foreign key constraints.

8. **Leaving a Group**
   - *Finding*: Departing members remain cached in active squad lists on other users' screens.
   - *Root Cause*: Lack of a real-time broadcast event (`GROUP_MEMBER_LEFT`) and absence of strict Super Admin succession enforcement before leaving.

9. **Chat Notifications**
   - *Finding*: Messages send successfully, but recipients do not receive visual alerts.
   - *Root Cause*: Chat components poll local state or lack Postgres Realtime table change subscriptions on `squad_messages`.

10. **SOS Emergency System**
    - *Finding*: SOS triggers fail to alert group members instantly, and location radar displays inaccurate GPS coordinates.
    - *Root Cause*: SOS alarms relied on tab storage events rather than database-backed incident records (`squad_sos_incidents`). Geolocation coordinates suffered from missing lat/lng validation checks and fallback parsing errors.

11. **Missing Items**
    - *Finding*: Missing item reports lack dedicated real-time synchronization and notification integration.
    - *Root Cause*: Missing items were treated as transient local UI state rather than persistent group records (`squad_missing_items`).

---

## C. Confirmed Facts vs. Unverified Hypotheses

| Feature | Status / Finding | Confirmed Fact | Unverified Hypothesis |
| :--- | :--- | :--- | :--- |
| **Auth** | Google Login | Email/password works; Supabase client is initialized. | Custom domain redirect mismatch is the sole cause of Google OAuth failure. |
| **Realtime** | Announcements & Chat | Local state polling works; Broadcast channels are partially wired. | Supabase Realtime postgres_changes is fully enabled on all tables without publication config. |
| **Storage** | HD Vault & Faculty Drive | Upload API endpoints exist. | Storage buckets have public/authenticated RLS policies correctly configured for group members. |
| **SOS** | Emergency & Radar | Audio siren works locally. | Geolocation inaccuracies stem from browser permissions vs. coordinate inversion. |

---

## D. Prioritised Phased Implementation Plan

- **Phase 1**: Backup, Baseline Build & Codebase Audit
- **Phase 2**: Google Login & Profile Persistence
- **Phase 3**: Shared Checklists, Membership & Group Synchronisation
- **Phase 4**: Announcements, Chat Alerts & Missing-Item Workflow
- **Phase 5**: Roll Call & Real-Time Attendance
- **Phase 6**: HD Vault & Faculty Drive Visibility/Permissions
- **Phase 7**: SOS, Responder Permissions & Accurate Location
- **Phase 8**: Regression, Security & Release Testing

---

## E. Security & Data-Preservation Risks

1. **RLS Bypass Risk**: Ensuring all database queries strictly verify group membership via `squad_members` lookup.
2. **Data Overwrite Risk**: Preventing client-side profile or gear checklist sync from overwriting newer remote data with stale local cache.
3. **Storage Exposure Risk**: Ensuring HD Vault and Faculty Drive buckets remain private and restricted to verified group members.

---

## F. Test Matrix & Acceptance Criteria

| Test ID | Feature | Scenario | Expected Result | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **TST-01** | Google Login | User clicks 'Sign in with Google' | Redirects to Google auth and returns with session | Session persisted in Supabase and localStorage |
| **TST-02** | Announcements | Super Admin broadcasts critical notice | Instant modal alert on all member devices | Red banner, title, sender, timestamp, dismiss button |
| **TST-03** | Shared Checklists | Admin adds gear item | Item appears on all member devices | Real-time sync without page refresh |
| **TST-04** | HD Vault | Member uploads photo | Photo appears in vault for all group members | Visible across distinct devices in same group |
| **TST-05** | SOS Emergency | Member holds SOS for 3s | Red alert modal triggers on all member devices | Countdown, cancellation, accurate GPS coordinates |

---

## G. Firebase Migration Recommendation

**Recommendation**: **Do NOT migrate to Firebase.**
- *Reasoning*: TrailoPS already has a fully functional Supabase backend structure, database tables, and client SDK integration. Migrating to Firebase would require rewriting authentication, database schemas, storage rules, and real-time listeners from scratch, introducing high migration risk and breaking existing production data. Fixing RLS policies, Realtime publication channels, and state synchronisation in Supabase is significantly safer, faster, and preserves all existing working features.

---

## H. Exact Next Steps for Approval

1. **Review**: Review this implementation plan and test matrix.
2. **Approval**: Provide explicit approval to proceed with **Phase 1** (Backup, baseline build, and source-code audit).
3. **Execution**: No code changes will be made until explicit approval is received.
