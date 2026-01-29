

# Spam Cleanup & Auto-Unsubscribe App

## Overview
An AI-powered Gmail cleanup tool that analyzes your spam folder, intelligently identifies unwanted subscriptions, and automatically unsubscribes you from them - then deletes the emails to keep your inbox clean.

---

## Core Features

### 1. Google Authentication
- Secure "Sign in with Google" button
- Request Gmail API permissions (read, modify, and delete spam emails)
- Display connected account info and easy logout option

### 2. Spam Folder Scanner
- Connect to Gmail API and fetch emails from your spam folder
- Extract sender information, subject lines, and unsubscribe data
- Identify emails with "List-Unsubscribe" headers (can be auto-processed)
- Parse email content to find web-based unsubscribe links

### 3. AI-Powered Spam Analysis
- Each email gets analyzed by AI to determine spam confidence
- Categories: "Definitely Spam", "Likely Spam", "Might Be Important"
- Shows reasoning for each classification (e.g., "Marketing newsletter with unsubscribe link")
- You review and approve which emails to process

### 4. Smart Unsubscribe Engine
- **Auto-unsubscribe**: For emails with List-Unsubscribe headers, send unsubscribe request automatically via the Gmail API
- **Assisted unsubscribe**: For web-based links, open the unsubscribe page in a new tab for quick manual completion
- Visual indicators showing unsubscribe method for each email
- Success/failure tracking for each attempt

### 5. Auto-Delete After Unsubscribe
- Once successfully unsubscribed, the email is automatically deleted
- Confirmation toast notifications for each action
- Batch processing to handle multiple emails efficiently

### 6. Scheduled Cleanup
- Set up automatic daily, weekly, or monthly scans
- Configure which actions to take automatically vs. require approval
- View history of past scheduled cleanups and their results

### 7. Dashboard & Statistics
- Clean, modern interface showing your spam folder overview
- Statistics: emails processed, successful unsubscribes, emails deleted
- Filter and sort emails by sender, date, or AI confidence
- Quick actions for batch processing

---

## User Flow

1. **Connect** → Sign in with Google and grant Gmail permissions
2. **Scan** → App fetches and analyzes your spam folder
3. **Review** → See AI-categorized emails with unsubscribe options
4. **Approve** → Select emails you want to unsubscribe from
5. **Process** → App auto-unsubscribes or opens pages for manual completion
6. **Clean** → Successfully processed emails are auto-deleted
7. **Schedule** → Set up recurring cleanups for hands-off maintenance

---

## Technical Approach

- **Frontend**: Clean React dashboard with intuitive controls
- **Authentication**: Google OAuth via Supabase Auth
- **Gmail Integration**: Gmail API for reading, modifying, and deleting emails
- **AI Analysis**: OpenAI integration for intelligent spam classification
- **Backend**: Supabase Cloud for secure API handling and scheduled jobs
- **Scheduling**: Cron-based scheduled functions for automatic cleanup

