## 🚀 Backend: Real-Time Chat API

The core engine of the chat application, managing authentication, database persistence, and real-time events.

### 🛠 Tech Stack
- **Runtime:** Node.js & Express
- **Database:** MongoDB Atlas
- **Real-Time:** Socket.io
- **Process Management:** PM2

### 🌐 Deployment & Infrastructure
- **Infrastructure:** Hosted on **AWS EC2** (Ubuntu).
- **CI/CD:** Custom automated deployment pipeline for zero-downtime updates.
- **Networking (Zero Trust):** Secured via **Cloudflare Tunnels**, keeping the server hidden from the public internet.
- **Endpoint:** `https://api.talha2424.me`

### 🔑 Environment Variables
- `MONGO_URI`
- `JWT_SECRET`
- `PORT=5000`
### Architecture Overview
`User` ↔ `Cloudflare Edge` ↔ `Secure Tunnel` ↔ `AWS EC2 (Node.js)` ↔ `MongoDB Atlas`
