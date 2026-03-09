# Phase 1 Quick Start: 30-Minute Setup

*Last updated: November 3, 2025 at 9:09 AM*

This is the TL;DR version of [USER_SETTINGS_PHASE1.md](USER_SETTINGS_PHASE1.md). Follow these steps to get User Settings working in Notion.

---

## ⚡ Quick Setup (30 minutes)

### Step 1: Create Database (5 min)

1. Open Notion
2. Create new database: "User Settings"
3. Add these properties:

```
✅ Quick Property List (copy-paste ready):

1. User (Person type)
2. User ID (Text type)
3. Bypass Code (Text type) ← Users edit this
4. Bypass Active (Checkbox type) ← Auto-updated
5. Expires At (Date type) ← Auto-updated
6. Usage Today (Number type) ← Optional
7. Daily Limit (Number type) ← Default: 10
8. Status (Status type) ← Visual indicator
9. Last Updated (Last edited time)
```

### Step 2: Add Your Row (2 min)

1. Click "+ New" to add a row
2. Fill in:
   - **User**: Select yourself
   - **User ID**: Your Notion user ID (from profile URL)
   - **Daily Limit**: 10
   - **Status**: Inactive
3. Leave other fields empty

### Step 3: Set Up Automation (15 min)

**Choose ONE method:**

#### Method A: Notion Built-in Automation

1. Click "..." menu → "Automations" → "New"
2. **Trigger**: "When Bypass Code is edited"
3. **Action**: "Send API request"
   - URL: `https://stock-intelligence.vercel.app/api/bypass`
   - Method: POST
   - Body:
     ```json
     {
       "userId": "{{User ID}}",
       "code": "{{Bypass Code}}"
     }
     ```
4. Save

#### Method B: Make.com (If Notion doesn't support API calls)

1. Sign up at make.com (free)
2. Create scenario:
   - **Trigger**: Notion - Watch Database Items
   - **Action**: HTTP - Make a Request
     - URL: `https://stock-intelligence.vercel.app/api/bypass`
     - Body: `{"userId": "{{User ID}}", "code": "{{Bypass Code}}"}`
3. Activate scenario

### Step 4: Test (5 min)

1. Get your bypass code from Vercel environment variables
2. Paste it into your "Bypass Code" field in Notion
3. Wait 10 seconds
4. Verify:
   ```bash
   curl https://stock-intelligence.vercel.app/api/usage \
     -H "X-User-ID: your-notion-user-id"
   ```
5. Should show: `"bypassed": true`

---

## ✅ Checklist

- [ ] Notion database created with all properties
- [ ] Your personal row added with User ID
- [ ] Automation configured (Notion or Make.com)
- [ ] Tested with your bypass code
- [ ] Verified via curl command
- [ ] Ready to invite beta users

---

## 🚀 What's Next?

**After Phase 1 works:**
1. Invite 3-5 beta users
2. Give them the bypass code
3. Watch for 2-3 weeks
4. Gather feedback
5. Decide: Stay with Notion OR build web UI (Phase 2)

---

## 🆘 Quick Troubleshooting

**Automation doesn't trigger?**
→ Check automation is enabled (green toggle)

**Status doesn't update?**
→ Test API manually: `curl -X POST https://stock-intelligence.vercel.app/api/bypass -H "Content-Type: application/json" -d '{"userId": "your-id", "code": "your-code"}'`

**Invalid code error?**
→ Verify code in Vercel env vars (Settings → Environment Variables → `RATE_LIMIT_BYPASS_CODE`)

---

## 📊 Success Looks Like

✅ User enters bypass code → Status changes to "Active" within 10 seconds
✅ User can run unlimited analyses
✅ Bypass expires at midnight UTC automatically
✅ No support requests needed

---

## 🎯 Decision Criteria

**Build web UI (Phase 2) if:**
- Users request it (3+ of 5 beta users)
- Satisfaction < 7/10
- Friction too high with Notion

**Stay with Notion if:**
- Users satisfied (8+/10)
- No web UI requests
- Minimal support needed

---

## 📞 Support

**If stuck:**
1. Read full docs: [USER_SETTINGS_PHASE1.md](USER_SETTINGS_PHASE1.md)
2. Check Vercel logs: `vercel logs --follow`
3. Test APIs directly with curl
4. Verify environment variables in Vercel

**Your backend APIs already work!** This is just wiring up the UI.

Good luck! 🎉
---

