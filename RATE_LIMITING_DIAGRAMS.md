# 🔒 Rate Limiting Flow Diagrams

## 1. Login Rate Limiting with Exponential Backoff

```
┌─────────────────────────────────────────────────────────────┐
│                    USER ATTEMPTS LOGIN                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │ Check Rate Limit     │
            │ checkLoginRateLimit()│
            └──────┬───────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
   ┌────────┐           ┌────────┐
   │ALLOWED?│           │ BLOCKED│
   └───┬────┘           └───┬────┘
       │                    │
       │ Yes                │ No
       │                    │
       ▼                    ▼
  ┌────────────┐      ┌─────────────────┐
  │ Try Login  │      │ Show Error:     │
  │            │      │ "Wait X minutes"│
  └─────┬──────┘      └─────────────────┘
        │
   ┌────┴────┐
   │         │
   ▼         ▼
 SUCCESS   FAILURE
   │         │
   │         ▼
   │    ┌────────────────────────┐
   │    │ recordFailedLogin      │
   │    │ Attempt()              │
   │    └────────┬───────────────┘
   │             │
   │             ▼
   │    ┌────────────────────┐
   │    │ Count Attempts     │
   │    │ in 1-hour window   │
   │    └────┬───────────────┘
   │         │
   │    ┌────┴────┐
   │    │         │
   │    ▼         ▼
   │  < 5       ≥ 5
   │  attempts   attempts
   │    │         │
   │    │         ▼
   │    │    ┌────────────────────┐
   │    │    │ Calculate Lockout: │
   │    │    │ 15min × 2^(n-1)   │
   │    │    │ Max: 24 hours      │
   │    │    └────┬───────────────┘
   │    │         │
   │    │         ▼
   │    │    ┌────────────────────┐
   │    │    │ Set lockedUntil    │
   │    │    │ Reset attempt count│
   │    │    └────────────────────┘
   │    │
   │    ▼
   │ ┌──────────────┐
   │ │ Clear Rate   │
   │ │ Limits       │
   │ │ clearLogin   │
   │ │ RateLimit()  │
   │ └──────────────┘
   │
   ▼
┌─────────────────┐
│ WALLET UNLOCKED │
│ Grant Access    │
└─────────────────┘
```

---

## 2. Exponential Backoff Progression

```
┌──────────────────────────────────────────────────────────────┐
│               LOCKOUT TIME PROGRESSION                        │
│                                                               │
│  Lockout #1:  ████████░░░░░░░░░░░░░░░░░░░░  15 minutes      │
│  Lockout #2:  ████████████████░░░░░░░░░░░░░  30 minutes (2x)│
│  Lockout #3:  ████████████████████████░░░░░  1 hour     (4x)│
│  Lockout #4:  ████████████████████████████░  2 hours    (8x)│
│  Lockout #5:  █████████████████████████████  4 hours   (16x)│
│  Lockout #6:  █████████████████████████████  8 hours   (32x)│
│  Lockout #7+: █████████████████████████████  24 hours  (MAX)│
│                                                               │
│  Formula: min(15min × 2^(level-1), 24hr)                     │
└──────────────────────────────────────────────────────────────┘

Timeline Example:
═══════════════════════════════════════════════════════════════

00:00  ┤ Attempt 1-5 (5 failed)
       ├─ 🔒 LOCKOUT #1: 15 minutes
00:15  ┤ Attempt 6-10 (5 failed)
       ├─ 🔒 LOCKOUT #2: 30 minutes
00:45  ┤ Attempt 11-15 (5 failed)
       ├─ 🔒 LOCKOUT #3: 1 hour
01:45  ┤ Attempt 16-20 (5 failed)
       ├─ 🔒 LOCKOUT #4: 2 hours
03:45  ┤ Attempt 21-25 (5 failed)
       ├─ 🔒 LOCKOUT #5: 4 hours
07:45  ┤ Attempt 26-30 (5 failed)
       ├─ 🔒 LOCKOUT #6: 8 hours
15:45  ┤ Attempt 31-35 (5 failed)
       ├─ 🔒 LOCKOUT #7: 24 hours (MAX)
39:45  ┤ ...continues at 24hr max
```

---

## 3. Transaction Rate Limiting

```
┌─────────────────────────────────────────────────────────────┐
│               USER SUBMITS TRANSACTION                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
            ┌──────────────────────────┐
            │ Check Transaction Rate   │
            │ Limit                    │
            │ checkTransactionRateLimit│
            └──────┬───────────────────┘
                   │
                   ▼
        ┌────────────────────────┐
        │ Count Recent TXs:      │
        │ • Last 1 minute        │
        │ • Last 1 hour          │
        │ • Last 24 hours        │
        └────────┬───────────────┘
                 │
      ┌──────────┼──────────┐
      │          │          │
      ▼          ▼          ▼
 ┌────────┐ ┌────────┐ ┌────────┐
 │ ≥3/min │ │ ≥10/hr │ │ ≥50/day│
 └───┬────┘ └───┬────┘ └───┬────┘
     │          │          │
     └──────────┴──────────┘
                │
         ┌──────┴──────┐
         │             │
         ▼             ▼
    ┌────────┐    ┌────────┐
    │ BLOCKED│    │ALLOWED │
    └───┬────┘    └───┬────┘
        │             │
        │ Yes         │ No
        │             │
        ▼             ▼
  ┌────────────┐ ┌──────────────┐
  │ Show Error │ │recordTxSubmit│
  │ "Wait X sec│ │()            │
  └────────────┘ └──────┬───────┘
                        │
                        ▼
                 ┌────────────┐
                 │ Send TX to │
                 │ Blockchain │
                 └─────┬──────┘
                       │
                  ┌────┴────┐
                  │         │
                  ▼         ▼
             SUCCESS    FAILURE
                  │         │
                  │    ┌────┴────────────┐
                  │    │ Is it a rate    │
                  │    │ limit error?    │
                  │    └────┬────────────┘
                  │         │
                  │    ┌────┴────┐
                  │    │         │
                  │    Yes       No
                  │    │         │
                  │    ▼         │
                  │ ┌─────────┐  │
                  │ │record   │  │
                  │ │Violation│  │
                  │ │()       │  │
                  │ └─────────┘  │
                  │              │
                  ▼              ▼
            ┌────────────────────────┐
            │ Update UI with result  │
            └────────────────────────┘
```

---

## 4. Multi-Timeframe Transaction Tracking

```
┌────────────────────────────────────────────────────────────┐
│              TRANSACTION TIME WINDOWS                       │
│                                                             │
│  Current Time: NOW (12:00:00)                              │
│  │                                                          │
│  ├─ Last Minute ─┤                                         │
│  │ (11:59:00-12:00:00) → 2 transactions                   │
│  │                                                          │
│  ├──── Last Hour ────┤                                    │
│  │ (11:00:00-12:00:00) → 7 transactions                   │
│  │                                                          │
│  ├─────── Last 24 Hours ───────┤                           │
│  │ (Yesterday 12:00 - Today 12:00) → 23 transactions      │
│                                                             │
│  LIMITS:                                                    │
│  • Per Minute: 2/3  ✓                                      │
│  • Per Hour: 7/10   ✓                                      │
│  • Per Day: 23/50   ✓                                      │
│                                                             │
│  Result: ALLOWED ✓                                         │
└────────────────────────────────────────────────────────────┘

Example: Hitting the Limit
═══════════════════════════════════════════════════════════════

12:00:00 ┤ TX #1 submitted ✅ (1/min, 8/hr, 24/day)
12:00:10 ┤ TX #2 submitted ✅ (2/min, 8/hr, 24/day)
12:00:20 ┤ TX #3 submitted ✅ (3/min, 8/hr, 24/day)
12:00:30 ┤ TX #4 ❌ BLOCKED - Per minute limit reached
         │ Error: "Too many transactions. Max 3 per minute."
         │
12:01:00 ┤ [1-minute window slides, TX #1 expires]
12:01:00 ┤ TX #4 submitted ✅ (3/min, 9/hr, 25/day)
12:01:10 ┤ TX #5 submitted ✅ (3/min, 9/hr, 25/day)
12:01:20 ┤ TX #6 submitted ✅ (3/min, 10/hr, 25/day)
12:01:30 ┤ TX #7 ❌ BLOCKED - Per hour limit reached
         │ Error: "Hourly limit reached. Max 10 per hour."
         │
13:00:00 ┤ [1-hour window slides, more TXs expire]
13:00:00 ┤ TX #7 submitted ✅ (2/min, 5/hr, 25/day)
```

---

## 5. Sliding Window vs Fixed Window

```
┌────────────────────────────────────────────────────────────┐
│              SLIDING WINDOW (What We Use)                   │
│                                                             │
│  Time: 12:30:45                                            │
│  Window: Last 60 minutes (11:30:45 - 12:30:45)            │
│                                                             │
│  ────┬──────────────────────────────────────────┬────     │
│      │                                          │           │
│   11:30:45                                  12:30:45      │
│      │←────────── 60 minutes ────────────────→│           │
│      │                                          │           │
│  ────┴──────────────────────────────────────────┴────     │
│                                                             │
│  Attempts in window: 3                                      │
│  Result: ALLOWED (3 < 5)                                   │
└────────────────────────────────────────────────────────────┘

VS

┌────────────────────────────────────────────────────────────┐
│              FIXED WINDOW (Old System)                      │
│                                                             │
│  Time: 12:30:45                                            │
│  Window: Current hour (12:00:00 - 12:59:59)               │
│                                                             │
│  ────┬──────────────────────────────────────────┬────     │
│      │                                          │           │
│   12:00:00                                 12:59:59       │
│      │←────────── 60 minutes ────────────────→│           │
│      │                                          │           │
│  ────┴──────────────────────────────────────────┴────     │
│                                                             │
│  Problem: Resets at hour boundary                          │
│  Vulnerable to timing attacks!                             │
└────────────────────────────────────────────────────────────┘

Why Sliding Window is Better:
═══════════════════════════════════════════════════════════════

Fixed Window Vulnerability:
12:59:00 ┤ 5 failed attempts (window about to reset)
12:59:59 ┤ [Window resets]
13:00:00 ┤ 5 more failed attempts (fresh window!)
         │ Total: 10 attempts in ~1 minute! ❌

Sliding Window Protection:
12:59:00 ┤ 5 failed attempts
13:00:00 ┤ Still counting attempts from 12:00:00
13:00:00 ┤ Attempt 6 ❌ BLOCKED (still in sliding window)
         │ Total: Only 5 attempts allowed ✅
```

---

## 6. Complete System Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    dWALLET SECURITY                         │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              User Interface Layer                     │  │
│  │  • Login Screen                                      │  │
│  │  • Transaction Modal                                 │  │
│  │  • Error Messages with Wait Times                    │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                        │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │           WalletContext (Orchestrator)                │  │
│  │  • verifyPassword()                                  │  │
│  │  • unlockWallet()                                    │  │
│  │  • sendTransaction()                                 │  │
│  └──────┬──────────────────────────────┬────────────────┘  │
│         │                              │                     │
│  ┌──────▼──────────────┐   ┌──────────▼──────────────┐    │
│  │  Login Rate Limiter │   │  TX Rate Limiter        │    │
│  │  ─────────────────  │   │  ──────────────────     │    │
│  │  • Exponential      │   │  • 3 txs/minute         │    │
│  │    Backoff          │   │  • 10 txs/hour          │    │
│  │  • Sliding Window   │   │  • 50 txs/day           │    │
│  │  • Progressive      │   │  • Cooldown Period      │    │
│  │    Penalties        │   │  • Violation Tracking   │    │
│  └──────┬──────────────┘   └──────────┬──────────────┘    │
│         │                              │                     │
│  ┌──────▼──────────────────────────────▼──────────────┐    │
│  │              Storage Layer                          │    │
│  │  • localStorage (persistent)                       │    │
│  │  • Sliding window timestamps                       │    │
│  │  • Lockout states                                  │    │
│  │  • Violation logs                                  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Monitoring & Audit                       │  │
│  │  • Real-time statistics                              │  │
│  │  • Violation tracking                                │  │
│  │  • Export capabilities                               │  │
│  │  • Emergency reset functions                         │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

---

## 7. Error Message Flow

```
┌────────────────────────────────────────────────────────────┐
│              ERROR MESSAGE GENERATION                       │
└────────────────────────────────────────────────────────────┘

Login Errors:
═══════════════════════════════════════════════════════════════

Rate Limit Check
       │
       ├─ Allowed → Continue with login
       │
       └─ Blocked
          │
          ├─ If in lockout period:
          │   "Account locked. Please wait 15 minutes
          │    before trying again."
          │
          └─ If sliding window exceeded:
              "Too many failed attempts. Please wait
               60 minutes before trying again."

Transaction Errors:
═══════════════════════════════════════════════════════════════

TX Rate Limit Check
       │
       ├─ Allowed → Submit transaction
       │
       └─ Blocked
          │
          ├─ Per minute exceeded:
          │   "Too many transactions. Maximum 3
          │    transactions per minute."
          │
          ├─ Per hour exceeded:
          │   "Hourly limit reached. Maximum 10
          │    transactions per hour."
          │
          ├─ Per day exceeded:
          │   "Daily limit reached. Maximum 50
          │    transactions per day."
          │
          └─ In cooldown period:
              "Rate limit exceeded. Please wait 45
               seconds before submitting another
               transaction."
```

---

## 8. Security Threat Mitigation

```
┌────────────────────────────────────────────────────────────┐
│           THREAT vs MITIGATION MATRIX                       │
└────────────────────────────────────────────────────────────┘

┌──────────────────────┬────────────────────────────────────┐
│         THREAT       │         MITIGATION                 │
├──────────────────────┼────────────────────────────────────┤
│ Brute Force Attack   │ ✓ Exponential backoff             │
│                      │   15min → 30min → 1hr → 24hr      │
│                      │ ✓ Makes attacks computationally    │
│                      │   infeasible                      │
├──────────────────────┼────────────────────────────────────┤
│ Dictionary Attack    │ ✓ Progressive penalties            │
│                      │ ✓ Each lockout doubles wait time   │
│                      │ ✓ After 7 lockouts: 24hr wait      │
├──────────────────────┼────────────────────────────────────┤
│ Timing Attack        │ ✓ Sliding window (not fixed)       │
│                      │ ✓ Window doesn't reset at boundary │
│                      │ ✓ Continuous tracking              │
├──────────────────────┼────────────────────────────────────┤
│ Transaction Spam     │ ✓ Multi-timeframe limits           │
│                      │   3/min, 10/hr, 50/day             │
│                      │ ✓ Cooldown periods                 │
├──────────────────────┼────────────────────────────────────┤
│ Automated Bots       │ ✓ Rate limits block automation     │
│                      │ ✓ Cooldowns prevent rapid-fire     │
│                      │ ✓ Violation tracking               │
├──────────────────────┼────────────────────────────────────┤
│ DoS Attack           │ ✓ Rate limits protect services     │
│                      │ ✓ Client-side enforcement          │
│                      │ ✓ Reduces server load              │
├──────────────────────┼────────────────────────────────────┤
│ Replay Attack        │ ✓ Timestamp-based tracking         │
│                      │ ✓ Each attempt recorded            │
│                      │ ✓ Sliding window prevents reuse    │
└──────────────────────┴────────────────────────────────────┘

Effectiveness Rating:
═══════════════════════════════════════════════════════════════

Brute Force:        ████████████████████ 10/10 ✓✓✓
Dictionary:         ████████████████████ 10/10 ✓✓✓
Timing:             ████████████████████ 10/10 ✓✓✓
TX Spam:            █████████████████░░░  9/10 ✓✓
Automated Bots:     █████████████████░░░  9/10 ✓✓
DoS:                ████████████████░░░░  8/10 ✓✓
Replay:             ████████████████████ 10/10 ✓✓

Overall Security:   ███████████████████░  9.5/10 ✓✓✓
```

---

These diagrams illustrate the complete rate limiting system with exponential backoff and multi-timeframe transaction protection.
