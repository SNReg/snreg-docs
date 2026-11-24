# User guide

## Signing in

Use your username and password. If you have two-factor authentication, you're then asked for the 6-digit code from your authenticator app. Each code works once. Lost your phone? Use one of your recovery codes instead, or ask an admin to reset two-factor.

After 5 wrong passwords, logins for that username pause for 15 minutes.

Your session lasts 12 hours from your last activity.

## My account

- **Password**: at least 12 characters, not a common password. Changing it logs out your other sessions.
- **Two-factor authentication**: choose *Set up authenticator app*, scan the QR code with any TOTP app (Aegis, Google Authenticator, Authy, …) or type the key, then enter the code it shows. Save the 10 recovery codes you're shown; they appear only once.
- **API tokens**: for the `snreg` CLI and scripts. A token is shown once when you create it. Send it as `Authorization: Bearer snreg_pat_…`. Tokens expire (default 90 days, at most 365) and can be revoked any time.

## Logging in to Linux devices

On a managed device, log in with the same username and password (and code, if you use two-factor), over SSH or at the console. Your home directory is created on first login.

If the device can't reach the SNReg server, you can still log in with your password if you've logged in on that device in the last 7 days.

## My assets

**Assets** lists the equipment assigned to you and anything owned by your groups. Scanning the QR code on a label opens that item after you sign in.

## Mobile app

Enter your server's `https` address, then sign in with your username, password and two-factor code. The app keeps its own API token, which you can see and revoke under **My account**.

- **Scan** opens the asset on a QR or barcode label, where you can change its status, location and assignee.
- **Audit** lists open audits. Pick one and scan each item. You'll feel a buzz for each scan. Scans work offline and sync by themselves when you're back online.
- **Not accepted** in an audit lists scans the server refused, such as an unknown tag or an audit that has closed.
- **Tickets** shows your queue, where you can read tickets and add comments or internal notes.

You can't sign out while scans are waiting to sync, so they can't be lost.

## Getting support

Open **Support** and choose **New ticket**. Pick a request type, describe the problem and submit. Your name, groups and devices are attached for you, and if you have one active device it's already selected.

From **Support** you can follow your tickets, reply and close them. **Notifications** shows when someone replies or a ticket's status changes.
