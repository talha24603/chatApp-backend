## 🚀 Deployment & Infrastructure

The application is engineered for production-grade security and scalability.

- **Frontend:** Hosted on **Vercel** with automated CI/CD from the `main` branch.
- **Backend:** Scaled on **AWS EC2** (Ubuntu) using **PM2** for persistent process management.
- **Networking (Zero Trust):** Secured via **Cloudflare Tunnels**, allowing the EC2 instance to remain invisible to the public internet while routing traffic via encrypted outbound-only connections.
- **Domain & SSL:** Custom domain (`talha2424.me`) with automated **SSL/TLS termination** handled at the Cloudflare edge.
- **Real-time Engine:** Event-driven communication powered by **Socket.io** with optimized WebSocket/Polling fallbacks.

### Architecture Overview
`User` ↔ `Cloudflare Edge` ↔ `Secure Tunnel` ↔ `AWS EC2 (Node.js)` ↔ `MongoDB Atlas`
