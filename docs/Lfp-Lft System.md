# 🔎 LFP/LFT System

> [!IMPORTANT]
> This page is still work in progress. Do not refer at the moment!

This system allows users to post "Looking For Players" (LFP) or "Looking For Team" (LFT) messages in a designated channel. Other users can then contact the users who posted these messages if they are interested in joining their team or playing together.

---

## 🌊 Flow of functionality

### User posting a request and staff review process
```mermaid
flowchart TD
    A([User submits LFP/LFT request]):::user --> B{Is the request valid?}:::decision
    
    B -- Yes --> C([Staff reviews the request]):::success
    B -- No --> D([User is notified of invalid request]):::error
    
    C --> E{Did staff approve the request?}:::decision
    E -- Approve --> F([Request posted in public channel & user notified]):::success
    E -- Decline --> G([User is notified of decline]):::error
    
    F --> H([Other users view and contact the poster]):::success

    %% Styles
    classDef user fill:#4A90E2,stroke:#1C3D6E,color:#fff;
    classDef decision fill:#F5A623,stroke:#7A4A00,color:#fff;
    classDef success fill:#27AE60,stroke:#14532D,color:#fff;
    classDef error fill:#E74C3C,stroke:#7B241C,color:#fff;
```

### User managing their requests
```mermaid
flowchart TD
    A([User wants to manage their requests]):::user --> B{What action do they want to take?}:::decision

    B -- List Requests --> C([Bot lists all active requests]):::success

    B -- Cancel Request --> D([User selects request to cancel]):::user
    D --> E{Is the request active (not archived/expired)?}:::decision

    E -- Yes --> F{Is the request approved and posted in public channel?}:::decision
    F -- Approved --> G([Bot deletes public channel message and deletes DB entry]):::success
    F -- Pending --> H([Bot removes review message and deletes DB entry]):::success

    E -- No --> I([Bot notifies the user that the request cannot be cancelled]):::error

    B -- Resend Request --> J{Is the request active?}:::decision
    J -- Active --> K([Bot declines resend request as request is already active]):::error
    J -- Inactive --> L([Bot resends post to review channel and updates DB]):::success

    %% Styles
    classDef user fill:#4A90E2,stroke:#1C3D6E,color:#fff;
    classDef decision fill:#F5A623,stroke:#7A4A00,color:#fff;
    classDef success fill:#27AE60,stroke:#14532D,color:#fff;
    classDef error fill:#E74C3C,stroke:#7B241C,color:#fff;

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
![LFT Modal Example](./assets/lft-lfp/lft-modal-valorant.png)

### Request submission confirmation
![Request Submission Confirmation](./assets/lft-lfp/request-submission-confirmation.png)

### Staff review channel with pending requests
![Staff Review Channel](./assets/lft-lfp/staff-review-channel.png)

### Public channel with approved requests
![Public Channel with Approved Requests](./assets/lft-lfp/public-channel-approved-requests.png)

### User notification of approved request
![User Notification of Approved Request](./assets/lft-lfp/user-notification-approved-request.png)

### User notification of declined request
![User Notification of Declined Request](./assets/lft-lfp/user-notification-declined-request.png)

### Active requests list command
![Active Requests List Command](./assets/lft-lfp/active-requests-list-command.png)

