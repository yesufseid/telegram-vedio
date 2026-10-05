# Telegram Bot + Mini App + Referral Verification System

## 1. Project Context

We already have an existing system with:

* **Backend:** Express.js
* **Frontend:** React.js
* **Database:** Neon PostgreSQL
* **Real-time communication:** WebSocket (WSS) already implemented between backend and React frontend
* **Existing verification page:** already built in the React frontend
* **Existing verification form:** already implemented and must be reused
* Do **not** replace the existing verification UI unless necessary.
* Do **not** create a second verification form.

Your task is to implement the Telegram bot registration flow, referral system, Mini App flow, WebSocket notifications, pre-verification availability flow, and waitlist behavior.

Before changing existing code, inspect the current project structure and understand the existing Express backend, React frontend, WSS implementation, verification page, and database setup.

---

# 2. Database

Use Neon PostgreSQL.

Create/update the database model for users as follows:

```prisma
model User {
  id             String   @id @default(cuid())
  username       String?
  phoneNumber    String
  telegramChatId String   @unique
  role           Role     @default(USER)
  referral       String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

enum Role {
  USER
  ADMIN
  SUPERADMIN
}
```

### Important rules

* `username` comes directly from Telegram.
* Do NOT ask the user to enter their Telegram username.
* Telegram usernames can be `null`.
* `telegramChatId` comes directly from Telegram and must be stored.
* `phoneNumber` must come from Telegram's contact-sharing functionality.
* Do NOT ask the user to manually type their phone number.
* `referral` stores the referring Telegram **username as a string**.
* `referral` is NOT a foreign key.
* New registrations always use:

```text
role = USER
```

* Do not allow users to select their role during registration.
* ADMIN and SUPERADMIN roles are managed separately in the database/admin process.

---

# 3. Telegram Bot Registration

Implement `/start`.

The command may contain an optional referral payload.

Examples:

```text
/start
```

or:

```text
/start referralUsername
```

or the equivalent Telegram deep-link payload.

When `/start` is received:

### Step 1 — Read Telegram information

Get from Telegram:

```text
telegramChatId
username
```

Do not ask the user for either of these.

`username` may be null.

---

### Step 2 — Determine referral

If a referral payload exists:

```text
referral = referring Telegram username
```

If no referral exists:

```text
referral = SUPERADMIN's Telegram username
```

Find the SUPERADMIN from the database and use their Telegram username.

Do not store the referral as a User foreign key.

---

### Step 3 — Ask for phone number

The bot must ask the user to share their phone number.

Use Telegram's contact request button.

The user should see something similar to:

```text
Please share your phone number to continue.
```

with:

```text
[ Share Phone Number ]
```

The backend must receive the contact information from Telegram.

Do not create a text input asking the user to type their phone number.

---

### Step 4 — Create user

After receiving the phone number, create the user:

```text
username = Telegram username
phoneNumber = shared Telegram phone number
telegramChatId = Telegram chat ID
role = USER
referral = determined referral username
```

Handle duplicate users safely.

If the Telegram chat ID already exists, do not create another user.

---

# 4. Notify Referral After Registration

After successfully registering a new user:

Find the referring user's Telegram username from the `referral` field.

Send the referring user a Telegram message containing the newly registered user's phone number.

Example:

```text
A new user has registered using your referral.

Phone: +251XXXXXXXXX
```

The message should be sent through the Telegram bot.

If the referral is the SUPERADMIN, notify the SUPERADMIN.

---

# 5. Mini App Button

After successful registration, show the user an:

```text
Open Mini App
```

button.

Only users with:

```text
role = USER
```

should receive this button through the Telegram bot UI.

Do not show this button to ADMIN or SUPERADMIN through the registration flow.

## Important

Do NOT implement backend authorization that rejects ADMIN or SUPERADMIN from opening/accessing the Mini App.

The role restriction here is specifically a Telegram bot UI requirement.

Do not add unnecessary backend role rejection for Mini App access.

---

# 6. Mini App Authentication / User Identification

When the Telegram Mini App opens, identify the Telegram user using Telegram Mini App initialization data.

Use the Telegram identity information to associate the Mini App session with the corresponding database User.

Do not rely only on a frontend-supplied user ID.

Validate Telegram Mini App initialization data appropriately before trusting the identity.

The backend should be able to determine:

```text
Telegram user
→ telegramChatId
→ User
```

---

# 7. Existing WebSocket System

There is already an existing WSS/WebSocket connection between the Express backend and React frontend.

Reuse the existing WSS implementation.

Do not create a completely separate WebSocket architecture unless the existing implementation genuinely cannot support the required events.

Add the required real-time events/messages to the existing system.

---

# 8. User Opens Mini App → Notify Referral

When a registered USER opens the Mini App:

1. Identify the user.
2. Find their `referral`.
3. Find the referring user.
4. Send a WebSocket event to the referring user's connected web session.

The referral should receive a notification that the referred user is ready.

Example UI:

```text
A referred user is ready for verification.

[ Verify User ]
```

The notification should identify the relevant user without exposing unnecessary information.

The referral must be able to click:

```text
Verify User
```

---

# 9. Verify User Button

When the referral clicks:

```text
Verify User
```

DO NOT immediately open the existing verification page.

First perform a **1-minute pre-verification loading / availability process**.

This is very important.

The 1-minute loading is:

```text
BEFORE opening the verification page
```

It is NOT a timeout for submitting the verification form.

It is NOT a timeout for the verification process itself.

---

# 10. One-Minute Availability Flow

When `[Verify User]` is clicked:

Show a loading state to the referral.

For example:

```text
Preparing verification...

Please wait.
```

Run the availability/system check for up to one minute.

The exact availability check should use the existing backend/system mechanism where possible.

Do not fake the availability result.

The system should determine whether the verification page/system can be opened.

---

# 11. Availability Success

If the availability check succeeds within the one-minute period:

Open/navigate the referral to the **existing verification page**.

Reuse the current verification page and current verification form.

Do not create another verification form.

The verification page should know which referred user is being verified.

The backend must associate the verification operation with:

```text
referring user
+
referred user
```

Do not trust arbitrary frontend IDs without server-side validation.

---

# 12. Availability Failure

If the system cannot become available after the one-minute loading period:

Show the referral:

```text
There is a system problem. Please try later.
```

Do not open the verification page.

The referral can click:

```text
Verify User
```

again later.

---

# 13. Retry After Availability Failure

When the referral clicks:

```text
Verify User
```

again after the previous availability attempt failed:

Notify the referred user:

```text
The system is now working. Please try again.
```

This notification must be sent to the referred user through the appropriate real-time mechanism.

The purpose is to tell the referred user that they should open the Mini App again.

---

# 14. Referred User Opens Mini App Again

When the referred user opens the Mini App again:

Repeat the ready flow.

The backend should detect that the user opened the Mini App.

Then send a WebSocket notification to their referral:

```text
The user is ready for verification.

[ Verify User ]
```

The referral can then click:

```text
Verify User
```

again.

The system should again perform the one-minute pre-verification availability check.

If successful, open the existing verification page.

---

# 15. Verification Page

The verification page already exists.

Do not redesign it unnecessarily.

Do not create a new form.

Use the existing verification form and existing submission logic where possible.

The backend should know which user is currently being verified.

The verification operation must be securely associated with:

```text
referred user
referring user
```

Do not allow a referral to submit verification for an arbitrary unrelated user by simply modifying a frontend ID.

Validate the relationship on the backend.

---

# 16. Verification Submission

When the referral successfully submits the existing verification form:

1. Process the existing verification logic.
2. If successful, notify the referred user through WSS.
3. The referred user's Mini App should receive the notification.

The user should see a message such as:

```text
Verification completed.
```

Then show the waitlist page.

---

# 17. Waitlist Page

After successful verification, the referred user must be placed into a waitlist state in the frontend.

Show a dedicated waitlist page.

Example:

```text
You are now on the waitlist.

Our team will get back to you soon.
```

The user should not be sent back to the registration flow.

---

# 18. LocalStorage Waitlist State

Store the waitlist state in browser `localStorage`.

For example:

```text
verificationStatus = WAITLIST
```

Use a clear and consistent key.

The exact implementation can follow the existing frontend storage conventions if available.

When the user opens the Mini App again:

### If localStorage contains the waitlist state:

Immediately show the waitlist page.

Do not show:

* registration
* verification
* Verify User flow
* onboarding

The user should directly see:

```text
You are now on the waitlist.

Our team will get back to you soon.
```

---

# 19. Important State Flow

Implement the frontend state flow approximately as:

```text
NEW USER
   ↓
Telegram registration
   ↓
Phone shared
   ↓
USER CREATED
   ↓
Open Mini App
   ↓
Notify referral
   ↓
Wait for referral verification
   ↓
Verification completed
   ↓
WAITLIST
```

Once:

```text
verificationStatus = WAITLIST
```

exists in localStorage:

```text
Mini App Open
      ↓
Check localStorage
      ↓
WAITLIST
      ↓
Show Waitlist Page
```

---

# 20. WebSocket Events

Use clear event names.

For example:

```text
USER_READY_FOR_VERIFICATION
VERIFICATION_PREPARING
VERIFICATION_AVAILABLE
VERIFICATION_SYSTEM_ERROR
VERIFICATION_RETRY_AVAILABLE
VERIFICATION_COMPLETED
```

You may adjust the exact event names to match the existing WSS architecture.

Do not duplicate existing event infrastructure.

Each event should contain only the data necessary for the client to process the event.

---

# 21. Security Requirements

Do not trust the frontend for sensitive identity information.

The backend must validate:

* Telegram Mini App identity
* Telegram chat ID
* User existence
* Referral relationship
* Verification target
* Verification submission ownership/relationship

Do not allow a user to change their:

```text
role
telegramChatId
referral
```

from the frontend.

Do not allow the frontend to impersonate another Telegram user by sending another user's ID.

Do not expose unnecessary phone numbers through WebSocket messages.

---

# 22. Error Handling

Handle at minimum:

### User already registered

Do not create duplicate records.

### Missing Telegram username

Allow:

```text
username = null
```

Do not reject registration because the Telegram user has no username.

### Invalid referral

If the referral username does not correspond to a valid referring user, follow the agreed fallback behavior rather than creating an invalid relationship.

### Missing phone number

Do not complete registration until Telegram contact sharing succeeds.

### WebSocket disconnected

The application should fail gracefully.

Do not crash the backend because a referral user's browser is offline.

### Verification target unavailable

Return an appropriate error rather than allowing verification of an invalid user.

### Availability failure

After one minute show exactly:

```text
There is a system problem. Please try later.
```

---

# 23. Telegram Bot UX

Keep the Telegram bot flow simple.

Expected flow:

```text
/start
   ↓
Welcome / registration
   ↓
Share phone number
   ↓
Registration successful
   ↓
Open Mini App
```

For referred users:

```text
/start referralUsername
   ↓
Share phone number
   ↓
Registered
   ↓
Open Mini App
```

Do not ask the user for information that Telegram already provides.

---

# 24. Referral UX

Referral receives:

```text
New referred user registered.

Phone: +251XXXXXXXXX
```

Later, when the referred user opens the Mini App:

```text
A referred user is ready for verification.

[ Verify User ]
```

When Verify User is clicked:

```text
Preparing verification...

Please wait.
```

After one minute:

### Success

Open verification page.

### Failure

Show:

```text
There is a system problem. Please try later.
```

If Verify User is clicked again:

Notify referred user:

```text
The system is now working. Please try again.
```

Then the referred user opens the Mini App again and the referral receives the ready notification again.

---

# 25. Do Not Change These Requirements

Do NOT:

* create a new verification form
* ask users to manually enter Telegram usernames
* ask users to manually type phone numbers
* make referral a foreign key
* let users choose their role
* enforce Mini App access restrictions in the backend based on role
* replace the existing WebSocket system unnecessarily
* make the one-minute wait part of form submission
* automatically open verification before the one-minute availability check succeeds
* invent unnecessary database models or fields without checking the existing project
* remove existing functionality

---

# 26. Implementation Process

Before coding:

1. Inspect the existing backend.
2. Inspect the existing React frontend.
3. Inspect the current WSS implementation.
4. Inspect the existing verification page and form.
5. Inspect the existing database schema.
6. Identify existing authentication/session mechanisms.
7. Identify existing Telegram integration if any.
8. Reuse existing utilities and architecture where possible.

Then implement incrementally.

Recommended order:

```text
1. Database/User model
2. Telegram bot registration
3. Phone contact collection
4. Referral handling
5. Referral phone notification
6. Mini App Telegram identity
7. Existing WSS integration
8. USER_READY_FOR_VERIFICATION event
9. Verify User action
10. One-minute availability flow
11. Existing verification page integration
12. Verification completion event
13. Waitlist page
14. localStorage waitlist state
15. Error handling
16. End-to-end testing
```

---


# 27. Final Requirements

The implementation must preserve the existing application's architecture wherever possible.

The most important relationship is:

```text
Telegram User
      ↓
Database User
      ↓
Referral
      ↓
Mini App
      ↓
WSS notification
      ↓
Verify User
      ↓
1-minute availability check
      ↓
Existing verification page
      ↓
Verification submitted
      ↓
WSS notification
      ↓
Waitlist
      ↓
localStorage
```

Implement this as a production-quality feature with clean separation between:

* Telegram bot logic
* User registration
* Referral handling
* Mini App identity
* WebSocket events
* Verification availability
* Existing verification logic
* Waitlist frontend state

remove unrelated parts of the application.
