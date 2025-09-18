# 🌍 Installing MongoDB Database

> MongoDB is a powerful **NoSQL database** that supports high-performance, high-availability, and easy scalability.  
> This guide covers installation via **Atlas (cloud/browser)**, **localhost on Windows**, and **standalone on Linux**.

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

## 🔗 Useful Links
- 📚 [Official Bun Documentation](https://bun.sh/docs)
- 🐙 [Bun GitHub Repository](https://github.com/oven-sh/bun)
- 🌐 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- 📘 [MongoDB Documentation](https://docs.mongodb.com/)
