# Cleanup Queue Database Schema

**Purpose:** Track pending template duplicate cleanups for user reconnections (v1.2.15)

**Location:** Notion workspace (Beta Users database)

**Why needed:** When existing users reconnect (rare, <5% of logins), Notion's integration settings automatically duplicate the template. This queue tracks cleanups that need to run 8 minutes after OAuth to archive the duplicate.

---

## Database Properties

### Core Fields

| Property Name | Type | Description | Required |
|--------------|------|-------------|----------|
| **ID** | Title | Unique cleanup job ID (UUID or auto-increment) | Yes |
| **User ID** | Text | Internal user ID from Beta Users database | Yes |
| **Notion User ID** | Text | Notion user ID | Yes |
| **Access Token** | Text | Encrypted Notion access token (for API calls) | Yes |
| **Original Page ID** | Text | The page ID to KEEP (from user.sageStocksPageId) | Yes |
| **Execute At** | Date | Timestamp when cleanup should run (OAuth time + 8 min) | Yes |
| **Status** | Select | Current status: Pending, Completed, Failed | Yes |
| **Created At** | Created Time | Auto-populated creation timestamp | Yes |
| **Completed At** | Date | When cleanup was marked complete | No |
| **Error Message** | Text | Error details if cleanup failed | No |
| **Attempts** | Number | Number of retry attempts | No |

### Status Values

- **Pending:** Cleanup scheduled but not yet executed
- **Completed:** Duplicate successfully archived
- **Failed:** Cleanup failed after max retries (needs manual review)

---

## Queries/Views

### 1. Due Now
**Filter:** Status = Pending AND Execute At ≤ Now
**Purpose:** Find cleanups ready to process

### 2. Recent Failures
**Filter:** Status = Failed AND Created At ≥ Last 7 days
**Purpose:** Monitor cleanup failures

### 3. Pending Queue
**Filter:** Status = Pending
**Sort:** Execute At (ascending)
**Purpose:** See upcoming cleanups

---

## Example Cleanup Record

```json
{
  "id": "cleanup-abc123",
  "userId": "user-xyz789",
  "notionUserId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "accessToken": "encrypted_token_here",
  "originalPageId": "page-original-123",
  "executeAt": "2025-11-19T16:46:00.000Z",
  "status": "Pending",
  "createdAt": "2025-11-19T16:38:00.000Z",
  "completedAt": null,
  "errorMessage": null,
  "attempts": 0
}
```

---

## Cleanup Process

1. **OAuth Callback** detects reconnection (user exists + has saved page ID)
2. **Schedule Cleanup**: Create record with `executeAt` = now + 8 minutes
3. **Cron Job** runs every minute, finds records where `executeAt` ≤ now
4. **Execute Cleanup**:
   - Search for all "Sage Stocks" pages
   - Archive any that don't match `originalPageId`
   - Mark cleanup as Completed
5. **On Failure**: Increment attempts, log error, retry up to 3 times
6. **After 3 Failures**: Mark as Failed for manual review

---

## Retention Policy

- **Completed records:** Keep for 30 days (for audit trail)
- **Failed records:** Keep indefinitely (for manual review)
- **Pending records:** Auto-delete if >24 hours old (stale)

---

## Setup Instructions

### Option 1: Create in Notion UI

1. Go to Beta Users Notion workspace
2. Create new database: "Cleanup Queue"
3. Add properties as listed above
4. Create views for monitoring
5. Share with Notion integration

### Option 2: Create via API (Recommended)

See: `api/setup/create-cleanup-queue.ts` (one-time setup script)

---

## Monitoring

**Key metrics to track:**
- Cleanup success rate (should be >95%)
- Average time to completion (should be ~8-10 minutes)
- Failure rate (should be <5%)
- Queue depth (should stay <10 pending)

**Alerts:**
- If failure rate >10% in 24 hours
- If any cleanup is pending >1 hour
- If queue depth >50 (indicates processing lag)

---

## Related Files

- `api/auth/callback.ts` - Schedules cleanups
- `api/cron/cleanup-duplicates.ts` - Processes queue
- `lib/cleanup.ts` - Cleanup logic (to be created)
- `vercel.json` - Cron configuration

---

**Version:** v1.2.15
**Created:** November 19, 2025
**Purpose:** Solve template duplication for reconnection case (<5% of users)
