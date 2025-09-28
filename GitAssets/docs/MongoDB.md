# 🌍 Installing MongoDB Database

> MongoDB is a powerful **NoSQL database** that supports high-performance, high-availability, and easy scalability.  
> This guide covers installation via **Atlas (cloud/browser)**, **localhost on Windows**, and **standalone on Linux**.

> [!IMPORTANT]
> The bot now includes enhanced MongoDB integration with improved schemas, better error handling, and optimized cleanup operations.

---

## 📌 Table of Contents
- [1. MongoDB Atlas (Browser)](#-atlas-browser)
- [2. Localhost (Windows)](#-localhost-windows)
- [3. Standalone (Linux)](#-standalone-linux)
- [4. Useful Links](#-useful-links)

---

## 🌐 Atlas (Browser)
MongoDB Atlas is a **cloud-based database service** that allows you to deploy MongoDB clusters without local setup.

1. Go to the [MongoDB Atlas website](https://www.mongodb.com/cloud/atlas).
2. Sign up or log in.
3. Click **"Create a New Cluster"**, then choose your **cloud provider** and **region**.
4. Set your **cluster name** → Click **"Create Cluster"**.
5. Navigate to **Database Access → Add New Database User** → set username & password.
6. Navigate to **Network Access → Add IP Address** → whitelist your IP.
7. Retrieve your **connection string** (URI) → Use it in your application.

> [!TIP]
> Replace `<username>`, `<password>`, and `<cluster-url>` in the connection string with your actual values.

Example connection string:
```bash
    mongodb+srv://<username>:<password>@<cluster-url>/test?retryWrites=true&w=majority
```
---

## 💻 Localhost (Windows)
Run MongoDB locally on your Windows machine.
1. Download MongoDB from the [official website](https://www.mongodb.com/try/download/community)
2. Run the installer → follow the wizard.
3. Ensure "Install MongoDB as a Service" is checked.
4. Start MongoDB service via Command Prompt:
```bash
    mongod
```
5. Open a new terminal and test the client:
```bash
    mongo
```
> [!NOTE]
> By default, MongoDB runs on port `27017`.

---

## 🐧 Standalone (Linux)
Install MongoDB directly on your Linux machine (example: Ubuntu).
1. Import MongoDB public key:
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
```
2. Create MongoDB source list file:
```bash
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
```
3. Update package lists:
```bash
sudo apt-get update
```
4. Install MongoDB:
```bash
sudo apt-get install -y mongodb-org
```
5. Start MongoDB service:
```bash
sudo systemctl start mongod
```
6. Check status:
```bash
sudo systemctl status mongod
```
> [!IMPORTANT]
> To start MongoDB automatically on boot:
> `sudo systemctl enable mongod`

---

## 🤖 Apatite Bot MongoDB Integration

### Database Schema Overview
The Apatite Bot uses MongoDB with Mongoose ODM for data persistence across multiple systems:

#### **Core Collections**
- **`lfrequests`**: LFP/LFT system requests and submissions
- **`tickets`**: Support ticket system data
- **`cleanupLogs`**: Data cleanup operation audit trails
- **`failedDeletions`**: Failed deletion tracking for retry logic
- **`analyticsData`**: Anonymized analytics and performance metrics
- **`retentionPolicies`**: Configurable data retention policy definitions

### Data Cleanup System Schemas

#### **CleanupLog Collection**
Tracks all data cleanup operations with comprehensive statistics:

```javascript
const cleanupLogSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now, index: true },
    method: { type: String, required: true, enum: ['hybrid', 'discord', 'database'] },
    stats: {
        messageLogs: { type: Number, default: 0 },
        metadataLogs: { type: Number, default: 0 },
        auditLogs: { type: Number, default: 0 },
        analyticsData: { type: Number, default: 0 },
        errorCount: { type: Number, default: 0 },
        retriedFailures: { type: Number, default: 0 }
    },
    totalDeleted: { type: Number, default: 0 },
    retentionPolicies: {
        fullContent: { type: Number, required: true },
        metadata: { type: Number, required: true },
        auditLogs: { type: Number, required: true },
        analytics: { type: Number, required: true }
    },
    performance: {
        duration: { type: Number, default: 0 },
        channelsProcessed: { type: Number, default: 0 },
        apiCalls: { type: Number, default: 0 },
        rateLimitHits: { type: Number, default: 0 }
    },
    errorDetails: [{
        errorType: { type: String, enum: ['discord_api', 'database', 'permission', 'network', 'other'] },
        errorMessage: { type: String, required: true },
        channelId: String,
        timestamp: { type: Date, default: Date.now }
    }],
    serverInfo: {
        guildId: { type: String, required: true, index: true },
        guildName: String,
        botVersion: String
    }
}, {
    timestamps: true,
    collection: 'cleanupLogs',
    suppressReservedKeysWarning: true
});
```

#### **FailedDeletion Collection**
Tracks failed deletion operations for retry logic:

```javascript
const failedDeletionSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now, index: true },
    channelId: { type: String, required: true },
    channelName: { type: String },
    messageIds: [{ type: String }],
    logType: { type: String, required: true },
    failureReason: { type: String },
    retryCount: { type: Number, default: 0 },
    lastRetry: { type: Date },
    resolved: { type: Boolean, default: false, index: true },
    resolvedAt: { type: Date },
    serverInfo: {
        guildId: { type: String, required: true, index: true },
        guildName: String
    }
}, {
    timestamps: true,
    collection: 'failedDeletions',
    suppressReservedKeysWarning: true
});
```

#### **AnalyticsData Collection**
Stores anonymized analytics for performance monitoring:

```javascript
const analyticsDataSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now, index: true },
    eventType: { type: String, required: true },
    guildId: { type: String, index: true },
    userId: { type: String, index: true }, // Hashed/anonymized
    channelId: { type: String },
    data: { type: mongoose.Schema.Types.Mixed },
    piiRedacted: { type: Boolean, default: false },
    contentSanitized: { type: Boolean, default: false },
    retentionInfo: {
        expiresAt: { type: Date, index: true },
        dataType: { type: String, enum: ['fullContent', 'metadata', 'auditLogs', 'analytics'] },
        anonymized: { type: Boolean, default: true }
    }
}, {
    timestamps: true,
    collection: 'analyticsData',
    suppressReservedKeysWarning: true
});
```

#### **RetentionPolicy Collection**
Configurable data retention policies:

```javascript
const retentionPolicySchema = new mongoose.Schema({
    policyName: { type: String, required: true, unique: true },
    description: { type: String },
    dataType: { type: String, required: true, enum: ['fullContent', 'metadata', 'auditLogs', 'analytics'] },
    retentionDays: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    lastUpdated: { type: Date, default: Date.now },
    updatedBy: { type: String, required: true }
}, {
    timestamps: true,
    collection: 'retentionPolicies',
    suppressReservedKeysWarning: true
});
```

### Database Indexes
Optimized indexes for efficient querying:

```javascript
// Cleanup logs indexes
cleanupLogSchema.index({ timestamp: -1, 'serverInfo.guildId': 1 }); // Most recent first, by guild
cleanupLogSchema.index({ method: 1, timestamp: -1 }); // By method and time

// Failed deletions indexes
failedDeletionSchema.index({ resolved: 1, retryCount: 1, timestamp: 1 }); // For retry queries
failedDeletionSchema.index({ 'serverInfo.guildId': 1, resolved: 1 }); // By guild and status

// Analytics data indexes
analyticsDataSchema.index({ timestamp: -1, 'retentionInfo.expiresAt': 1 }); // For cleanup queries
analyticsDataSchema.index({ eventType: 1, timestamp: -1 }); // By event type and time
```

### Privacy & Compliance Features

#### **Data Protection**
- **PII Redaction**: Automatic removal of emails, phones, SSNs, credit cards, IPs
- **Content Sanitization**: Strip executable links and suspicious patterns
- **Anonymization**: User IDs are hashed for analytics data
- **Retention Policies**: Configurable data retention with automatic cleanup

#### **Compliance Support**
- **GDPR/CCPA Ready**: Built-in data deletion and portability support
- **Audit Trails**: Complete operation tracking for regulatory compliance
- **Data Minimization**: Only necessary data is stored and processed
- **User Rights**: Support for data access, deletion, and portability requests

### Connection Configuration
The bot automatically connects to MongoDB using the `MONGO_URI` environment variable:

```javascript
// Connection setup in src/Structure/Schemas/index.js
function ConnectMongo(client) {
    if (client.config.mongoUrl) {
        mongoose.connect(client.config.mongoUrl)
            .then(() => console.log('✅ MongoDB connected successfully'))
            .catch(err => console.error('❌ MongoDB connection failed:', err));
    }
}
```

---

## 🔗 Useful Links
- 📚 [Official Bun Documentation](https://bun.sh/docs)
- 🐙 [Bun GitHub Repository](https://github.com/oven-sh/bun)
- 🌐 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- 📘 [MongoDB Documentation](https://docs.mongodb.com/)
