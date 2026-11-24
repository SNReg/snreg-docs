# 0009: Mobile app choices (P6)

**Status:** Accepted

## Context

Spec §6.8 and the P6 scope leave several behaviors open. These are the choices made for P6.

## Decisions

- **Network calls** go through the Tauri HTTP plugin instead of the webview. The server sends no CORS headers and doesn't need to. Redirects are off, so a token can't follow one to another host.
- **Server addresses** must use `https`. Plain `http` is accepted only for loopback, the same rule as the CLI.
- **Sign-in** uses the password and TOTP once, creates a 90-day personal access token, then closes the login session. Signing out revokes that token, so it needs a connection.
- **Token storage.** The token is kept in the Tauri store, inside the app's private storage. Android backups are turned off so it can't leave the device that way. It isn't in the Android Keystore or iOS Keychain yet.
- **Offline scans** are saved to disk before they count. They sync oldest first, one at a time, and each is removed only after the server accepts it. The server's scan endpoint is an upsert on audit and asset, so replaying a scan after a crash can't create a duplicate.
- **Barcode reader.** Android uses the bundled ML Kit reader instead of the plugin's default, which is downloaded from Google Play on first use. The default hangs without a connection and never works on phones without Play Services. The APK is a few MB larger per architecture.
- **Failed scans.** A network, auth, rate-limit or server error stops the sync and keeps the scan queued. A 404, 409 or 422 means the server will never accept it, so it moves to a "Not accepted" list for the person to review. It is never dropped silently.
- **Expired sessions.** Queued scans survive signing in again. The server address is locked while scans are waiting, so they can't be sent to a different install. Signing out is refused until they have synced.
- **Asset tags** follow the server's rule (`A-Z a-z 0-9 . _ -`, up to 32 characters), so labels for imported assets scan too.
- **Assignee** is entered as a user ID, like the web asset form.

## Consequences

- Links opened from outside the app (`snreg://` or `/a/<tag>` in another app) don't launch it yet. Those codes are handled when scanned.
- iOS is configured in the shared code but hasn't been built, because that needs macOS and Xcode.
