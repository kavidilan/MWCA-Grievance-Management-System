# MWCA Grievance Management System — Full Project

This package contains the responsive frontend, Node.js/Express API and SQLite database setup.

Requires Node.js 22.5 or newer because it uses Node's built-in SQLite support.

## Run on Windows

1. Open CMD in the `backend` folder.
2. Run `npm.cmd install`.
3. Optional: run `npm.cmd run seed` to create 249 demonstration records.
4. Run `npm.cmd start`.
5. Open `http://localhost:3001`.

The SQLite file is created automatically as `backend/database/grievances.db`.

## Email referrals

Referral emails are sent through SMTP. Copy `backend/.env.example` to `backend/.env` and set the sender mailbox values before using **Send Email Referral**:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-gmail-address@gmail.com
SMTP_PASS=your-gmail-app-password
MAIL_FROM=your-gmail-address@gmail.com
```

For Gmail, `SMTP_PASS` must be a Google App Password for the sender account, not the normal Google account password. The application records the referral as sent only after the SMTP server accepts the message; otherwise it reports the delivery error and leaves the case unchanged.

To enable sending, replace every placeholder value in `backend/.env` with the real sender Gmail address and a Google App Password, then restart `npm.cmd start` in the backend folder. Regular Gmail passwords do not work for SMTP. The sender account must have 2-Step Verification enabled before an App Password can be created.

## API checks

- `http://localhost:3001/api/health`
- `http://localhost:3001/api/docs`
- `http://localhost:3001/api/grievances`

## Important

This is an MVP. Before using real sensitive grievance data, add authenticated user accounts, role-based authorization, encryption, secure file storage, backup procedures, retention rules and a formal government security review.
