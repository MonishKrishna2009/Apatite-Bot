# 🔎 LFP/LFT System

> [!IMPORTANT]
> This page is still work in progress. Do not refer at the moment!

This system allows users to post "Looking For Players" (LFP) or "Looking For Team" (LFT) messages in a designated channel. Other users can then contact the users who posted these messages if they are interested in joining their team or playing together.

---

## 🌊 Flow of functionality

### User posting a request and staff review process
```mermaid
flowchart TD
    A[User submits LFP/LFT request] --> B{Is the request valid?}
    B -- Yes --> C[Staff reviews the request]
    B -- No --> D[User is notified of invalid request]
    C --> E{Staff approves or declines?}
    E -- Approve --> F[Request is posted in public channel and user is notified]
    E -- Decline --> G[User is notified of decline]
    F --> H[Other users view and contact the poster]
```

### User managing their requests
```mermaid
flowchart TD
    A[User wants to manage their requests] --> B{What action do they want to take?}
    B -- List Requests --> C[Bot lists all active requests]
    B -- Cancel Request --> D[User selects request to cancel]
    D --> E[Bot checks if the request is active ie: not archived/expired]
    E -- Yes --> F[Bot checks if the request is already approved and posted in public channel]
    F -- Approved --> G[Bot deletes public channel message and deletes the database entry]
    F -- Pending --> G[Bot removes the review message from the review channel and deletes the databse entry]
    E -- No --> G[Bot notifies the user that the request cannot be cancelled]
    B -- Resend Request --> H[Bot checks if the request is active ie: not archived/expired]
    H -- Active --> I[Bot declines the resend request as request is already active]
    H -- Inactive --> I[Bot resends the post to the review channel for review and updates the database]
```

---

## 🤖 Commands
- Game specific lfp/lft create commands
    - `valo-looking-for players`
    - `valo-looking-for team`
    - `csgo-looking-for players`
    - `csgo-looking-for team` .... etc (Create commands for other games as per requirement)

- Request management commands
    - `requests list` - List all active LFP/LFT requests
    - `requests cancel <request_id>` - Cancel an active LFP/LFT request
    - `requests resend <request_id>` - Resend an active LFP/LFT request

---

## 📅 Database Structure
```yaml
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    type: { type: String, enum: ["LFP", "LFT"], required: true },
    game: { type: String,required: true },
    content: { type: Object, required: true }, // Store form details
    status: { type: String, enum: ["pending", "approved", "declined", "archived", "expired"], default: "pending" },
    reviewedBy: { type: String, default: null },
    messageId: { type: String, default: null }, // Review channel message
    publicMessageId: { type: String, default: null }, // Public channel message
    createdAt: { type: Date, default: Date.now }
```

---

## ⚒️ Moderation and Review Process
- Staff members can review pending LFP/LFT requests in a dedicated review channel.
- They can approve or decline requests using buttons.
- Approved requests are automatically posted in a public channel.
- Declined requests notify the user.
- Staff can archive or expire old requests to keep the public channel clean.
- The bot logs all actions for accountability.
- Staff roles and permissions are configurable to control who can review and manage requests.
- The system includes rate limiting to prevent spam and abuse.
- Users can only have a limited number of active requests at a time.

> [!NOTE]
> Ensure to configure the necessary environment variables and database connections as per the main documentation to enable this system.

---

## 📸 Showcase of system

### LFT modal example for Valorant
![LFT Modal Example](./assets/lfp-lft-system/lft-modal-valorant.png)

### Request submission confirmation
![Request Submission Confirmation](./assets/lfp-lft-system/request-submission-confirmation.png)

### Staff review channel with pending requests
![Staff Review Channel](./assets/lfp-lft-system/staff-review-channel.png)

### Public channel with approved requests
![Public Channel with Approved Requests](./assets/lfp-lft-system/public-channel-approved-requests.png)

### User notification of approved request
![User Notification of Approved Request](./assets/lfp-lft-system/user-notification-approved-request.png)

### User notification of declined request
![User Notification of Declined Request](./assets/lfp-lft-system/user-notification-declined-request.png)

### Active requests list command
![Active Requests List Command](./assets/lfp-lft-system/active-requests-list-command.png)

