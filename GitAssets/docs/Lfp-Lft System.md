# 🔎 LFP / LFT System

> [!IMPORTANT]
> This feature is currently under active development.
> Expect changes to command syntax and database structure in future updates.

The **Looking For Players (LFP) / Looking For Team (LFT)** system is designed to help gamers connect with teammates and groups efficiently. Users can submit structured requests, which are reviewed by staff before being shared in public channels.

Other players can then view **approved requests** and directly contact the original poster.

---

## 🌊 Workflow Overview

### Request Submission & Review
```mermaid
flowchart TD
    A([User submits LFP/LFT request]):::user --> B{Is the request valid?}:::decision
    
    B -- Yes --> C([Staff reviews the request]):::process
    B -- No --> D([User is notified of invalid request]):::error
    
    C --> E{Did staff approve the request?}:::decision
    E -- Approve --> F([Request posted in public channel & user notified]):::success
    E -- Decline --> G([Staff fills in reason for decline]):::process
    G --> H([User is notified of decline with reason]):::error
    
    F --> I([Other users view and contact the poster]):::success

    %% Styles
    classDef user fill:#4A90E2,stroke:#1C3D6E,color:#fff;
    classDef decision fill:#F5A623,stroke:#7A4A00,color:#fff;
    classDef process fill:#8E44AD,stroke:#4A235A,color:#fff;
    classDef success fill:#27AE60,stroke:#14532D,color:#fff;
    classDef error fill:#E74C3C,stroke:#7B241C,color:#fff;
```

### Request Management (User Controls)
```mermaid
flowchart TD
    A([User wants to manage their requests]):::user --> B{Which action?}:::decision

    B -- List --> C([Bot lists all active requests]):::success

    B -- Cancel --> D([User selects request]):::user
    D --> E{Is the request active? ie: not archived/expired}:::decision
    E -- Yes --> F{Was it approved & posted?}:::decision
    F -- Approved --> G([Bot deletes public post & removes DB entry]):::success
    F -- Pending --> H([Bot deletes review post & removes DB entry]):::success
    E -- No --> I([User notified: Cannot cancel]):::error

    B -- Resend --> J{Is the request active?}:::decision
    J -- Active --> K([Declined: Already active]):::error
    J -- Inactive --> L([Request reposted for review & DB updated]):::success

    %% Styles
    classDef user fill:#4A90E2,stroke:#1C3D6E,color:#fff;
    classDef decision fill:#F5A623,stroke:#7A4A00,color:#fff;
    classDef success fill:#27AE60,stroke:#14532D,color:#fff;
    classDef error fill:#E74C3C,stroke:#7B241C,color:#fff;

```

### Failsafe Cleanup (User Leaves)
```mermaid
flowchart TD
    A([User leaves the server]):::user --> B([System detects member removal]):::process
    B --> C([Find all active LFP/LFT requests by user]):::process
    C --> D{Do requests exist?}:::decision
    D -- Yes --> E([Delete staff review posts, public posts, and DB entries]):::success
    D -- No --> F([No action required]):::neutral

    %% Styles
    classDef user fill:#4A90E2,stroke:#1C3D6E,color:#fff;
    classDef process fill:#8E44AD,stroke:#4A235A,color:#fff;
    classDef decision fill:#F5A623,stroke:#7A4A00,color:#fff;
    classDef success fill:#27AE60,stroke:#14532D,color:#fff;
    classDef neutral fill:#95A5A6,stroke:#2C3E50,color:#fff;
```

### Failsafe Cleanup (On-Demand Cleanup)
```mermaid
flowchart TD
    A([User sends a request via modal]):::process --> B{Check old request from the same user}:::decision

    B -- Pending --> C{Older than RequestExpiryDays?}:::decision
    C -- Yes --> D([Set status → Expired]):::expired
    C -- No --> E([Keep as Pending]):::pending

    B -- Approved --> F{Older than RequestArchiveDays?}:::decision
    F -- Yes --> G([Set status → Archived]):::archived
    F -- No --> H([Keep as Approved]):::approved

    %% Styles
    classDef process fill:#8E44AD,stroke:#4A235A,color:#fff;
    classDef decision fill:#F5A623,stroke:#7A4A00,color:#fff;
    classDef expired fill:#E74C3C,stroke:#7B241C,color:#fff;
    classDef archived fill:#34495E,stroke:#1C2833,color:#fff;
    classDef pending fill:#3498DB,stroke:#1B4F72,color:#fff;
    classDef approved fill:#27AE60,stroke:#14532D,color:#fff;
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
    userId:          String (required)
    guildId:         String (required)
    type:            Enum("LFP", "LFT") (required)
    game:            String (required)
    content:         Object (form details, required)
    status:          Enum("pending", "approved", "declined", "archived", "expired") (default: "pending")
    reviewedBy:      String (nullable, staff ID)
    messageId:       String (nullable, staff review message ID)
    publicMessageId: String (nullable, public channel post ID)
    createdAt:       Date (default: now)
```

---

## ⚒️ Moderation & Review
- 🛡 Staff review channel for pending requests
- ✅ Approve → Request posted to public channel
- ❌ Decline → User notified automatically
- 📦 Old requests can be archived/expired
- 📑 Actions are logged for accountability
- 🔒 Role-based permissions for staff reviewers
- ⏳ Built-in rate limiting to prevent spam
- 🔢 Users may only hold a limited number of active requests

> [!NOTE]
> Ensure to configure the necessary environment variables and database connections as per the main documentation to enable this system.

---

## 📸 Showcase

### Request submission modal (Valorant LFT example)
![LFT Modal Example](../assets/lft-lfp/lft-modal-valorant.png)

### Submission confirmation
![Request Submission Confirmation](../assets/lft-lfp/request-submission-confirmation.png)

### Staff review channel
![Staff Review Channel](../assets/lft-lfp/staff-review-channel.png)

### Public channel (approved requests)
![Public Channel with Approved Requests](../assets/lft-lfp/public-channel-approved-requests.png)

### User notification: approved
![User Notification of Approved Request](../assets/lft-lfp/user-notification-approved-request.png)

### User notification: declined
![User Notification of Declined Request](../assets/lft-lfp/user-notification-declined-request.png)

### Active requests list command
![Active Requests List Command](../assets/lft-lfp/active-requests-list-command.png)


