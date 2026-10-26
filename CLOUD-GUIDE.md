# Cloud and sign-in

BrightScale Tracker keeps its data in Supabase — project `brightscale-scanner`, schema **`tracker`** — instead of a JSON file on GitHub. The repository holds code only.

## Signing in
1. Open the app and enter your email.
2. Tap the link in the email on the same device (or type the 6-digit code if the email shows one).
3. Only emails listed in `tracker.members` can see data. Anyone else who signs in sees a "no access" screen.

## How sync works
- Every edit is written to the phone (IndexedDB) and queued in an outbox.
- The outbox is sent to Supabase immediately, in parent-to-child order, and retried with back-off when offline.
- The app pulls the server state on start, when it comes back to the foreground, and when another device changes something (realtime).
- The first time a device connects, anything on it that is newer than the server (or missing from it) is uploaded, so nothing is lost in the switch.

## Security
- Row-level security on every table: signed-in members only; anonymous requests are denied.
- Client links are random tokens; only a SHA-256 hash is stored in `tracker.share_links`. Links can be revoked.
- The client view is built by the `tracker-share` Edge Function and never includes money, subcontractor details or internal notes.

## Adding a team member
```sql
insert into tracker.members (company_id, email, role) values ('brightscale', 'name@example.com', 'manager');
```
