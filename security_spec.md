# Security Specification — SubTrack (UC15 Cloud Sync)

## 1. Data Invariants
1. **Strict Ownership Isolation**: Every document in `/users/{userId}/subscriptions/{subscriptionId}` and `/users/{userId}/tags/{tagId}` belongs exclusively to `userId == request.auth.uid` and must have `data.ownerId == request.auth.uid`.
2. **Verified Identity**: Only authenticated users with `request.auth.token.email_verified == true` may read or write cloud-synced subscriptions and tags.
3. **Strict Schema & Volumetric Bounds (UC12)**:
   - `Subscription.name`: string, `1 <= size() <= 60`
   - `Subscription.amount`: number (`int` or `float`), `>= 0`
   - `Subscription.currency`: in `['VND', 'USD', 'EUR', 'JPY', 'GBP']`
   - `Subscription.cycle`: in `['weekly', 'monthly', 'quarterly', 'yearly']`
   - `Subscription.status`: in `['active', 'paused', 'cancelled']`
   - `Subscription.tagIds`: list, `size() <= 10`
   - `Tag.name`: string, `1 <= size() <= 30`
   - `Tag.color`: string, `4 <= size() <= 20`
4. **Immutable Ownership**: `ownerId` cannot be changed during updates (`incoming().ownerId == existing().ownerId`).

## 2. The "Dirty Dozen" Payloads (Rejected with PERMISSION_DENIED)
1. **Unauthenticated Write**: Creating a subscription with `request.auth == null`.
2. **Unverified Email Spoof**: Authenticated user with `email_verified: false` attempting to create/read `/users/{uid}/subscriptions/sub1`.
3. **Cross-Tenant Read/Write**: User A (`uid_A`) attempting to read or write `/users/uid_B/subscriptions/sub1`.
4. **OwnerId Spoofing on Create**: User A writing to `/users/uid_A/subscriptions/sub1` with `ownerId: "uid_B"`.
5. **OwnerId Mutation on Update**: User A updating an existing subscription to change `ownerId` to `"uid_B"`.
6. **Shadow / Ghost Field Injection**: Adding `"isAdmin": true` or `"extraField": "hack"` to a subscription payload.
7. **Oversized Name Attack (UC12 Violation)**: `name` with 61+ characters.
8. **Negative Amount Attack (UC12 Violation)**: `amount: -100`.
9. **Unbounded Tag Array Attack**: `tagIds` containing 15 elements (`size() > 10`).
10. **Invalid Status Enum**: `status: "hacked"` instead of `active | paused | cancelled`.
11. **Path ID Poisoning**: Document ID `{subscriptionId}` containing invalid characters or exceeding 128 chars.
12. **Blanket Collection Query**: Querying another user's collection list without matching `resource.data.ownerId == request.auth.uid`.
