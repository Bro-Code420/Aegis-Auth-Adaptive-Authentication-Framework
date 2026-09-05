# 🚀 Socially - Risk-Aware Social Media Platform

A modern, high-performance Twitter/X clone built with the latest Next.js technologies and integrated with a production-grade security and risk-assessment layer using **AegisAuth**.

## 🛡️ Security Features (AegisAuth)

This project showcases an advanced, risk-aware security architecture:
- **Adaptive Risk Assessment**: Real-time evaluation of every login attempt based on IP, device, and frequency.
- **Forensic Audit Logs**: Complete `LoginHistory` tracking for all user access events.
- **Real-Time Security Alerts**: A "Security Bell" system that notifies users of suspicious activity (e.g., failed logins, account takeovers) instantly.
- **Secure Custom Auth**: Production-ready password hashing with `bcryptjs` and session monitoring.

## 💻 Tech Stack

- **Framework**: [Next.js 14 (App Router)](https://nextjs.org/)
- **Database**: [Neon PostgreSQL](https://neon.tech/)
- **ORM**: [Prisma](https://prisma.io/)
- **Security SDK**: [@devanshthaware/aegis-auth](https://www.npmjs.com/package/@devanshthaware/aegis-auth)
- **File Uploads**: [UploadThing](https://uploadthing.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🚀 How to Start

Follow these steps to get the project running locally:

### 1. Prerequisites
Ensure you have a [Neon](https://neon.tech/) PostgreSQL database and an account at [AegisAuth](https://aegis-auth.com).

### 2. Setup Environment Variables
Create a `.env.local` file in the root directory and add the following:

```env
# Database
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require"

# UploadThing
UPLOADTHING_TOKEN=your_uploadthing_token

# AegisAuth Credentials
NEXT_PUBLIC_AEGIS_API_KEY=your_api_key
NEXT_PUBLIC_AEGIS_BASE_URL=https://api.aegisauth.com
NEXT_PUBLIC_AEGIS_APP_ID=your_app_id
```

### 3. Installation & Preparation
Run the following commands in your terminal:

```bash
# Install dependencies
pnpm install

# Generate Prisma Client
npx prisma generate

# Sync Database Schema
npx prisma db push
```

### 4. Launch the Application
Start the development server:

```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## ⚡ Core Features

- 📱 **Responsive Design**: Optimized for mobile, tablet, and desktop views.
- 🔄 **Real-Time Polling**: Automatic security alert synchronization.
- ⚡ **Optimistic Updates**: Immediate UI feedback for Likes and Following.
- 🎭 **Dynamic Routing**: User profiles and notification centers.
- 🔄 **Data Fetching**: Efficient server-side fetching with revalidation.

## 🛣️ Features Breakdown

-   **Dashboard**: Main feed with post creation and user suggestions.
-   **Security Center**: Integrated "Bell Icon" for monitoring account threats.
-   **Profiles**: Detailed user profiles with forensic activity filters.
-   **Notifications**: Social engagement notifications (Likes, Comments, Follows).

## 📄 License

MIT
