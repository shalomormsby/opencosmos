# Notion User Settings Database - Visual Template

*Last updated: November 3, 2025 at 9:09 AM*

This document shows what your User Settings database should look like when properly configured.

---

## Database Properties Configuration

Copy this property list exactly:

| # | Property Name | Type | Configuration | Purpose |
|---|---------------|------|---------------|---------|
| 1 | **Name** | Title | (default) | Row identifier |
| 2 | **User** | Person | Select person | Who this row belongs to |
| 3 | **User ID** | Text | Plain text | Notion user ID for API calls |
| 4 | **Bypass Code** | Text | Plain text | **USERS EDIT THIS** to activate |
| 5 | **Bypass Active** | Checkbox | Unchecked by default | Shows if bypass is active |
| 6 | **Expires At** | Date | Include time | When bypass expires (midnight UTC) |
| 7 | **Usage Today** | Number | Format: Number | Analyses used today |
| 8 | **Daily Limit** | Number | Format: Number | Max analyses per day (default: 10) |
| 9 | **Status** | Status | Options: Active, Inactive, Error | Visual status indicator |
| 10 | **Last Updated** | Last edited time | Auto | Timestamp of last change |

---

## Example Database View

Here's what your database should look like with sample data:

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ User Settings                                                                      │
├───────────┬──────────┬─────────────┬──────────┬────────────┬─────────────────────┤
│ Name      │ User     │ User ID     │ Bypass   │ Bypass     │ Status              │
│           │          │             │ Code     │ Active     │                     │
├───────────┼──────────┼─────────────┼──────────┼────────────┼─────────────────────┤
│ Shalom    │ @Shalom  │ abc123-...  │ •••••••  │ ✅         │ 🟢 Active           │
│ Settings  │          │             │          │            │                     │
├───────────┼──────────┼─────────────┼──────────┼────────────┼─────────────────────┤
│ Beta User │ @Jane    │ def456-...  │ (empty)  │ ☐          │ ⚪ Inactive         │
│ 1         │          │             │          │            │                     │
├───────────┼──────────┼─────────────┼──────────┼────────────┼─────────────────────┤
│ Beta User │ @John    │ ghi789-...  │ •••••••  │ ✅         │ 🟢 Active           │
│ 2         │          │             │          │            │                     │
└───────────┴──────────┴─────────────┴──────────┴────────────┴─────────────────────┘

Additional columns (scroll right →):
├─────────────┬─────────────┬──────────────────────┐
│ Usage Today │ Daily Limit │ Expires At           │
├─────────────┼─────────────┼──────────────────────┤
│ 24          │ 10          │ Nov 1, 12:00 AM      │
├─────────────┼─────────────┼──────────────────────┤
│ 3           │ 10          │ (empty)              │
├─────────────┼─────────────┼──────────────────────┤
│ 15          │ 10          │ Nov 1, 12:00 AM      │
└─────────────┴─────────────┴──────────────────────┘
```

---

## Status Property Configuration

The "Status" property should have these options:

### Option 1: Active (Green)
- **Name**: Active
- **Color**: Green
- **When**: Bypass Active ✅ and Expires At is in the future

### Option 2: Inactive (Gray)
- **Name**: Inactive
- **Color**: Gray
- **When**: Bypass Active ☐ or Expires At is in the past

### Option 3: Error (Red)
- **Name**: Error
- **Color**: Red
- **When**: API call failed or invalid code

---

## User Workflow Mockup

### Initial State (Before Entering Code)

```
┌─────────────────────────────────────────────────┐
│ Shalom Settings                                  │
├─────────────────────────────────────────────────┤
│ User:           @Shalom Ormsby                   │
│ User ID:        abc123-def456-ghi789             │
│ Bypass Code:    [___________________]  ← EDIT    │
│ Bypass Active:  ☐ No                            │
│ Status:         ⚪ Inactive                      │
│ Usage Today:    7                                │
│ Daily Limit:    10                               │
│ Expires At:     (empty)                          │
└─────────────────────────────────────────────────┘

Status: Normal rate limits (3 analyses remaining today)
```

### After Entering Code (Active State)

```
┌─────────────────────────────────────────────────┐
│ Shalom Settings                                  │
├─────────────────────────────────────────────────┤
│ User:           @Shalom Ormsby                   │
│ User ID:        abc123-def456-ghi789             │
│ Bypass Code:    ••••••••••••••••••• (hidden)     │
│ Bypass Active:  ✅ Yes                           │
│ Status:         🟢 Active                        │
│ Usage Today:    24 (unlimited)                   │
│ Daily Limit:    10 (bypassed)                    │
│ Expires At:     Nov 1, 2025 12:00 AM UTC         │
└─────────────────────────────────────────────────┘

Status: Unlimited analyses until midnight UTC
```

---

## Database Views (Recommended)

### View 1: All Users (Default)
- **Name**: "All Users"
- **Type**: Table
- **Sort**: User (A → Z)
- **Filter**: None
- **Visible Columns**: Name, User, Status, Bypass Active, Usage Today, Daily Limit

### View 2: Active Bypasses
- **Name**: "Active Bypasses"
- **Type**: Table
- **Sort**: Expires At (ascending)
- **Filter**: Bypass Active is checked
- **Visible Columns**: Name, User, Expires At, Usage Today

### View 3: My Settings (User-specific)
- **Name**: "My Settings"
- **Type**: Table
- **Filter**: User is @[Your Name]
- **Visible Columns**: All columns

---

## Database Location Options

### Option 1: Top-Level Page (Recommended)
```
📊 Sage Stocks/
  ├── 📈 Stock Analyses
  ├── 📚 Stock History
  ├── ⚙️ User Settings  ← Add here
  └── 📖 Documentation
```

### Option 2: Settings Subfolder
```
📊 Sage Stocks/
  ├── 📈 Stock Analyses
  ├── 📚 Stock History
  ├── ⚙️ Settings/
  │   ├── User Settings  ← Add here
  │   └── System Config
  └── 📖 Documentation
```

### Option 3: Personal Dashboard
```
🏠 My Dashboard/
  ├── 📊 Sage Stocks/
  │   └── (analysis databases)
  └── ⚙️ User Settings  ← Add here (personal)
```

---

## Automation Visual Flow

```
┌─────────────────────┐
│ User edits          │
│ "Bypass Code" field │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Notion Automation   │
│ Triggers            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ POST /api/bypass    │
│ {                   │
│   userId: "abc123"  │
│   code: "secret"    │
│ }                   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Redis stores        │
│ bypass session      │
│ (expires midnight)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ API returns success │
│ {                   │
│   success: true     │
│   expiresAt: "..."  │
│ }                   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ (Optional)          │
│ Update "Status" to  │
│ "Active" in Notion  │
└─────────────────────┘
```

---

## Color Coding Suggestions

Use Notion's color options to make status clear:

| Field | Color | Meaning |
|-------|-------|---------|
| 🟢 Green row | Active bypass | User has unlimited access |
| ⚪ Gray row | Inactive | Normal limits apply |
| 🔴 Red row | Error | Something went wrong |
| 🟡 Yellow row | Expiring soon | Less than 1 hour left |

To set row color:
1. Hover over row
2. Click "..." menu
3. Select "Color"
4. Choose color

---

## Permissions Setup

### For Admin (You):
- **Full access** - Can edit all properties, see all users, modify automations

### For Beta Users:
- **Editor access** - Can edit their own row only
- **Visible properties**: Bypass Code, Usage Today, Status
- **Read-only properties**: User ID, Daily Limit, Expires At
- **Hidden properties**: (none, transparency is good)

### How to Set Permissions:
1. Share database with user
2. Click "Share" → "Invite"
3. Add user email
4. Set permission: "Can edit"
5. (Optional) Use filters to show only their row

---

## Database Icon & Cover Suggestions

**Icon Ideas:**
- ⚙️ (Settings gear)
- 👤 (User profile)
- 🔑 (Key/access)
- ⚡ (Power/activation)

**Cover Ideas:**
- Gradient background
- Abstract pattern
- Solid color (blue/gray)

---

## Example Filled Row

Here's what a complete user row looks like:

```
Name:           Shalom Settings
User:           @Shalom Ormsby
User ID:        abc123-def456-ghi789-012345
Bypass Code:    K8mP2nX9vQ7wL4hR3sT6yB1cF5jD0aE8
Bypass Active:  ✅ (checked)
Expires At:     Nov 1, 2025 12:00 AM UTC
Usage Today:    24
Daily Limit:    10
Status:         🟢 Active
Last Updated:   Oct 31, 2025 6:30 PM
```

---

## Quick Copy-Paste Setup

**Minimal Properties (Phase 1 MVP):**

If you want to start even simpler, just use these 5 properties:

1. **Name** (Title)
2. **Bypass Code** (Text) ← User edits this
3. **Status** (Status) ← Shows Active/Inactive
4. **Usage Today** (Number)
5. **Daily Limit** (Number)

Everything else is optional for Phase 1 testing.

---

## Testing Checklist

Use this to verify your setup:

- [ ] Database created with correct name
- [ ] All properties added with correct types
- [ ] Your personal row created
- [ ] User ID filled in correctly
- [ ] Daily Limit set to 10
- [ ] Status options configured (Active, Inactive, Error)
- [ ] Database shared with beta users (if applicable)
- [ ] Automation configured and enabled
- [ ] Tested with real bypass code
- [ ] Verified status updates within 10 seconds
- [ ] Confirmed unlimited analyses work

---

## What Success Looks Like

**User perspective:**
1. User opens Notion database
2. User sees their row
3. User pastes bypass code
4. Within 10 seconds, Status changes to "Active"
5. User runs unlimited analyses
6. At midnight, bypass expires automatically

**Admin perspective (you):**
1. All users visible in one database
2. Clear status indicators for each user
3. No support requests about "how to activate"
4. Automation runs reliably
5. Data stays in sync with backend

---

## Ready to Build!

Now that you have the visual reference, go set up your database:

1. Follow [PHASE1_QUICKSTART.md](PHASE1_QUICKSTART.md) for step-by-step setup
2. Use this template as a visual reference
3. Test with your own account first
4. Invite beta users once confirmed working

Good luck! 🚀
---

