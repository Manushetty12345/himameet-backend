# Hi Ma - API Documentation

Base URL: `https://api.himaapp.com/v1`

---

## 1. Authentication APIs

### 1.1 Send OTP
Triggers MSG91 to send a 6-digit OTP to the user's mobile number.
- **Endpoint:** `/auth/send-otp`
- **Method:** `POST`

**Request Body:**
```json
{
  "country_code": "+91",
  "mobile_number": "8296060368"
}
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "OTP sent successfully",
  "data": {
    "retry_timeout_seconds": 54
  }
}
```

### 1.2 Verify OTP
Verifies the OTP using MSG91 and handles user login/registration.
- **Endpoint:** `/auth/verify-otp`
- **Method:** `POST`

**Request Body:**
```json
{
  "country_code": "+91",
  "mobile_number": "8296060368",
  "otp": "123456"
}
```

**Response (Success - Existing User):**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "is_new_user": false,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp...",
    "user": {
      "id": 1024,
      "role": "female",
      "name": "Priya",
      "phone_number": "8296060368"
    }
  }
}
```

**Response (Success - New User):**
```json
{
  "status": "success",
  "message": "OTP verified, please complete profile",
  "data": {
    "is_new_user": true,
    "temp_token": "temp_jwt_for_registration_steps"
  }
}
```

### 1.3 Truecaller Login
One-tap login using the Truecaller SDK payload.
- **Endpoint:** `/auth/truecaller`
- **Method:** `POST`

**Request Body:**
```json
{
  "payload": "base64_encoded_truecaller_payload",
  "signature": "truecaller_signature",
  "signature_algorithm": "RSA"
}
```

**Response:** *(Same as Verify OTP Response)*

### 1.4 Logout
Logs the user out and revokes the push notification token.
- **Endpoint:** `/auth/logout`
- **Method:** `POST`
- **Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

---

## 2. Profile Setup (Onboarding)

### 2.1 Get Avatars
- **Endpoint:** `/onboarding/avatars?gender=male`
- **Method:** `GET`

**Response:**
```json
{
  "status": "success",
  "data": [
    {"id": 1, "avatar_url": "https://...", "gender": "male"}
  ]
}
```

### 2.2 Get Languages
- **Endpoint:** `/onboarding/languages`
- **Method:** `GET`

**Response:**
```json
{
  "status": "success",
  "data": [
    {"id": 1, "name_english": "Kannada", "language_code": "kn"}
  ]
}
```

### 2.3 Save Profile Setup
- **Endpoint:** `/user/profile-setup`
- **Method:** `POST`

**Request Body:**
```json
{
  "gender": "male",
  "avatar_id": 1,
  "language_id": 1
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Profile updated successfully",
  "data": {
    "next_step": "dashboard" 
  }
}
```

---

## 3. Creator Profile Setup (Female Only)

### 3.1 Get Interests/Topics
- **Endpoint:** `/onboarding/interests`
- **Method:** `GET`

**Response:**
```json
{
  "status": "success",
  "data": [
    {"id": 1, "name": "Politics"},
    {"id": 3, "name": "Love"}
  ]
}
```

### 3.2 Get Voice Verification Sentence
- **Endpoint:** `/onboarding/voice-sentence`
- **Method:** `GET`

**Response:**
```json
{
  "status": "success",
  "data": {
    "sentence_id": 101,
    "language_code": "mr",
    "text": "तू माझं आयुष्य आहेस"
  }
}
```

### 3.3 Submit Creator Application (Voice KYC)
- **Endpoint:** `/creator/application/submit`
- **Method:** `POST` (Multipart/Form-Data)

**Form Data:**
- `age`: 24
- `interest_ids`: [1, 3, 5]
- `bio`: "Hi I love music and travelling!"
- `sentence_id`: 101
- `voice_recording`: (File Upload)

**Response:**
```json
{
  "status": "success",
  "message": "Application submitted. Pending admin approval.",
  "data": {
    "application_status": "pending_review"
  }
}
```

---

## 4. Male Dashboard & Feed

### 4.1 Get Home Feed (Creator List)
- **Endpoint:** `/feed/creators`
- **Method:** `GET`
- **Query Params:** `?filter=music&page=1&limit=20`

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "creator_id": 204,
      "name": "Yamuna",
      "avatar_url": "https://...",
      "is_online": true,
      "is_new": false,
      "voice": {
        "rate_per_min": 10,
        "status": "available"
      },
      "video": {
        "rate_per_min": 60,
        "status": "offline"
      }
    }
  ]
}
```

### 4.2 Random Match
- **Endpoint:** `/feed/random-match`
- **Method:** `POST`

**Request Body:**
```json
{
  "call_type": "voice"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "matched_creator_id": 204
  }
}
```

---

## 5. Wallet & Recharging

### 5.1 Get Coin Packages
- **Endpoint:** `/wallet/packages`
- **Method:** `GET`

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "coins": 2500,
      "price_inr": 699,
      "discount_percentage": 30,
      "is_welcome_offer": true,
      "is_popular": false
    }
  ]
}
```

### 5.2 Initiate Recharge (PhonePe)
Generates the required base64 payload and X-VERIFY checksum so the mobile app can launch the PhonePe SDK.
- **Endpoint:** `/wallet/recharge/initiate`
- **Method:** `POST`

**Request Body:**
```json
{
  "package_id": 1
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "merchant_id": "M123456789",
    "merchant_transaction_id": "TXN_987654321",
    "base64_payload": "eyJtZXJjaGFudElkIjoi...=",
    "checksum": "89ab...cdef###1"
  }
}
```

### 5.3 PhonePe Webhook (Server-to-Server)
PhonePe will call this URL in the background after a payment succeeds or fails. Our server validates the checksum, adds the coins to the user's wallet, and records the transaction.
- **Endpoint:** `/wallet/recharge/webhook`
- **Method:** `POST`

**Request Body (From PhonePe):**
```json
{
  "response": "base64_encoded_response_from_phonepe"
}
```

### 5.4 Check Payment Status
If the app needs to manually verify the status of a payment (e.g., if the app was closed during payment).
- **Endpoint:** `/wallet/recharge/status/{transaction_id}`
- **Method:** `GET`

**Response:**
```json
{
  "status": "success",
  "data": {
    "transaction_id": "TXN_987654321",
    "payment_status": "SUCCESS", // or "PENDING", "FAILED"
    "coins_added": 2500
  }
}
```

### 5.5 PhonePe Redirect (Callback)
If using the PhonePe Custom UI / Web flow, PhonePe will redirect the user back to this URL after payment. This endpoint simply redirects the user back into the mobile app using a Deep Link (e.g., `himaapp://payment/success`).
- **Endpoint:** `/wallet/recharge/redirect`
- **Method:** `POST` / `GET` (Depending on PhonePe config)

**Request Body (From PhonePe):**
```json
{
  "code": "PAYMENT_SUCCESS",
  "merchantId": "M123456789",
  "transactionId": "TXN_987654321"
}
```

---

## 6. Creator Profile & Actions

### 6.1 Get Creator Profile
- **Endpoint:** `/creator/{creator_id}/profile`
- **Method:** `GET`

**Response:**
```json
{
  "status": "success",
  "data": {
    "creator_id": 205,
    "name": "Latha",
    "age": 19,
    "avatar_url": "https://...",
    "languages": ["Kannada"],
    "interests": ["Love", "Photography", "Travel", "Cooking"],
    "bio": "Hi hlahdhd...dhd",
    "call_rates": {
      "voice": 10,
      "video": 60
    },
    "friendship_status": "none",
    "is_notify_online_enabled": false
  }
}
```

### 6.2 Notify Me When Online
- **Endpoint:** `/creator/{creator_id}/notify-online`
- **Method:** `POST`

**Request Body:**
```json
{
  "enabled": true
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Notification preference updated."
}
```

### 6.3 Report User
- **Endpoint:** `/creator/{creator_id}/report`
- **Method:** `POST`

**Request Body:**
```json
{
  "reason": "Inappropriate content",
  "details": "..."
}
```

**Response:**
```json
{
  "status": "success",
  "message": "User reported successfully."
}
```

### 6.4 Block User
- **Endpoint:** `/creator/{creator_id}/block`
- **Method:** `POST`

**Response:**
```json
{
  "status": "success",
  "message": "User blocked."
}
```

---

## 7. Friends Management & Chat Logic

### 7.1 Send Friend Request
- **Endpoint:** `/friends/request`
- **Method:** `POST`

**Request Body:**
```json
{
  "target_user_id": 205
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Friend request sent."
}
```

### 7.2 Get Friends Lists
- **Endpoint:** `/friends/list` (Also `/favourites`, `/requests/received`, `/requests/sent`)
- **Method:** `GET`

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "user_id": 205,
      "name": "Latha",
      "avatar_url": "https://...",
      "status": "request_sent"
    }
  ]
}
```

### 7.3 Toggle Favourite
- **Endpoint:** `/friends/{friend_id}/favourite`
- **Method:** `POST`

**Request Body:**
```json
{
  "is_favourite": true
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Added to favourites."
}
```

### 7.4 Clear / Delete Chat
- **Endpoints:** `POST /chat/{chat_id}/clear`, `DELETE /chat/{chat_id}`

**Response:**
```json
{
  "status": "success",
  "message": "Chat history cleared."
}
```

### 7.5 Get Chat Messages (History)
Loads the previous messages when opening a chat room. (Real-time texting will be handled via WebSockets).
- **Endpoint:** `/chat/{chat_id}/messages`
- **Method:** `GET`
- **Query Params:** `?page=1&limit=50`

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "message_id": 1001,
      "sender_id": 205,
      "content": "Hi there!",
      "timestamp": "2026-08-19T10:05:00Z"
    }
  ]
}
```

---

## 8. Calling APIs (Voice & Video)

### 8.1 Initiate Call
- **Endpoint:** `/call/initiate`
- **Method:** `POST`

**Request Body:**
```json
{
  "receiver_id": 205,
  "call_type": "video" 
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "call_id": 9921,
    "agora_channel_name": "channel_9921",
    "agora_token": "temp_rtc_token_for_agora",
    "rate_per_min": 60
  }
}
```

### 8.2 End Call
- **Endpoint:** `/call/end`
- **Method:** `POST`

**Request Body:**
```json
{
  "call_id": 9921,
  "end_reason": "user_hung_up" 
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Call ended successfully.",
  "data": {
    "duration_seconds": 185,
    "total_coins_deducted": 180,
    "remaining_wallet_balance": 150
  }
}
```

---

## 9. Call History (Recent Calls)

### 9.1 Get Recent Calls
- **Endpoint:** `/calls/history`
- **Method:** `GET`
- **Query Params:** `?filter=all`, `?sort=duration`

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "call_id": 9921,
      "user": {
        "id": 205,
        "name": "Latha",
        "avatar_url": "https://..."
      },
      "call_type": "voice",
      "status": "completed",
      "duration_seconds": 185,
      "timestamp": "2026-08-19T10:30:00Z"
    }
  ]
}
```

---

## 10. Profile Settings & Support

### 10.1 Get My Profile (Settings View)
- **Endpoint:** `/user/me`
- **Method:** `GET`

**Response:**
```json
{
  "status": "success",
  "data": {
    "user_id": 1024,
    "username": "SwQpK876",
    "avatar_url": "https://...",
    "dnd_enabled": false,
    "wallet_balance": 150
  }
}
```

### 10.2 Edit Profile
Allows the user to change their username and avatar. Gender and Language cannot be changed.
- **Endpoint:** `/user/profile`
- **Method:** `PUT`

**Request Body:**
```json
{
  "username": "SwQpK876_new",
  "avatar_id": 2
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Profile updated successfully",
  "data": {
    "username": "SwQpK876_new",
    "avatar_url": "https://..."
  }
}
```

### 10.3 Get Transactions
Fetches the user's payment and coin usage history.
- **Endpoint:** `/user/transactions`
- **Method:** `GET`

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "transaction_id": "txn_8910",
      "type": "recharge", // recharge, call_deduction, chat_deduction
      "coins": 2500,
      "amount_inr": 699,
      "status": "success",
      "timestamp": "2026-08-18T10:00:00Z"
    }
  ]
}
```

### 10.4 Get Referral Stats (Share & Get Coins)
Fetches the user's unique invite code and referral earnings.
- **Endpoint:** `/user/referral`
- **Method:** `GET`

**Response:**
```json
{
  "status": "success",
  "data": {
    "invite_code": "NSBX4156",
    "total_invites": 0,
    "coins_per_invite": 40,
    "total_coins_earned": 0,
    "share_message": "Join me on Hi ma and get free coins! Use code: NSBX4156"
  }
}
```

### 10.5 Toggle Do Not Disturb (DND)
- **Endpoint:** `/user/dnd`
- **Method:** `POST`

**Request Body:**
```json
{
  "enabled": true
}
```

**Response:**
```json
{
  "status": "success",
  "message": "DND status updated."
}
```

### 10.6 Get Admin Warnings
- **Endpoint:** `/user/warnings`
- **Method:** `GET`

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "reason": "Inappropriate language in bio",
      "issued_at": "2026-08-10T10:00:00Z"
    }
  ]
}
```

### 10.7 Support Tickets
- **Create Ticket:** `POST /support/tickets`
- **Get Tickets:** `GET /support/tickets?status=active`

**Request Body (Create):**
```json
{
  "subject": "Payment issue",
  "description": "Money deducted but coins not added."
}
```

**Response (GET):**
```json
{
  "status": "success",
  "data": [
    {
      "ticket_id": 505,
      "subject": "Payment issue",
      "status": "active",
      "created_at": "2026-08-19T10:00:00Z"
    }
  ]
}
```

### 10.8 Delete Account
- **Endpoint:** `/user/delete-account`
- **Method:** `POST`

**Request Body:**
```json
{
  "reasons": ["Hi ma not polite", "Not able to here Hi ma"],
  "other_reason": ""
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Account scheduled for deletion in 30 days."
}
```

### 10.9 Fetch Static CMS Pages
- **Endpoint:** `/static-pages/{page_key}`
- **Method:** `GET`

**Response:**
```json
{
  "status": "success",
  "data": {
    "title": "Terms & Conditions",
    "content_html": "<p>Welcome to Hi ma...</p>"
  }
}
```

### 10.10 Get In-App Notifications
Fetches alerts such as "Recharge successful", "Friend request accepted", etc.
- **Endpoint:** `/user/notifications`
- **Method:** `GET`

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "notification_id": 101,
      "title": "Recharge Successful",
      "body": "2500 coins have been added to your wallet.",
      "is_read": false,
      "timestamp": "2026-08-19T10:00:00Z"
    }
  ]
}
```

---

## 11. Creator Dashboard (Female Side)

### 11.1 Get Dashboard Home
Fetches the creator's current online/offline status, today's earnings, and any pending chat requests to display on the Home tab.
- **Endpoint:** `/creator/dashboard/home`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "status": "success",
  "data": {
    "todays_earnings_inr": 2450,
    "todays_earnings_coins": 4900,
    "status": {
      "is_voice_online": true,
      "is_video_online": false
    },
    "pending_chat_requests": [
      {
        "request_id": 901,
        "user_id": 105,
        "name": "Rahul Verma",
        "avatar_url": "https://...",
        "sent_at": "2026-08-19T10:00:00Z"
      }
    ]
  }
}
```

### 11.2 Toggle Online/Offline Status
Updates the creator's availability. If set to true, male users will see her as "Available" in their feed.
- **Endpoint:** `/creator/dashboard/status`
- **Method:** `POST`

**Request Body:**
```json
{
  "call_type": "voice", // or "video"
  "is_online": true
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Voice status updated to Online."
}
```

### 11.3 Accept Incoming Call Request
When a male user initiates a call, the female receives a push notification/socket event. If she accepts, this API generates the Agora tokens so she can join the call screen.
- **Endpoint:** `/call/{call_id}/accept`
- **Method:** `POST`

**Response:**
```json
{
  "status": "success",
  "message": "Call accepted",
  "data": {
    "agora_channel_name": "channel_9921",
    "agora_token": "temp_rtc_token_for_agora"
  }
}
```

### 11.4 Reject Incoming Call Request
If the female rejects the call or misses it, this API updates the call status so the male user knows it was rejected.
- **Endpoint:** `/call/{call_id}/reject`
- **Method:** `POST`

**Request Body:**
```json
{
  "reason": "busy" // optional
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Call rejected"
}
```

### 11.5 Get Creator Call History
Lists all past calls (Completed, Missed) specifically for the creator, showing exactly how much they earned per call.
- **Endpoint:** `/creator/calls/history`
- **Method:** `GET`
- **Query Params:** `?page=1&limit=20`

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "call_id": 9921,
      "male_user": {
        "id": 105,
        "name": "Rahul Verma",
        "avatar_url": "https://..."
      },
      "call_type": "voice",
      "status": "completed",
      "duration_seconds": 900, // 15 mins
      "coins_earned": 150,
      "inr_earned": 75,
      "timestamp": "2026-08-19T10:30:00Z"
    },
    {
      "call_id": 9922,
      "male_user": {
        "id": 106,
        "name": "Amit K.",
        "avatar_url": "https://..."
      },
      "call_type": "video",
      "status": "missed",
      "duration_seconds": 0,
      "coins_earned": 0,
      "inr_earned": 0,
      "timestamp": "2026-08-18T14:00:00Z"
    }
  ]
}
```

### 11.6 Get Earnings Summary
Fetches the detailed earnings breakdown for the Wallet tab.
- **Endpoint:** `/creator/earnings/summary`
- **Method:** `GET`

**Response:**
```json
{
  "status": "success",
  "data": {
    "total_available_inr": 12500,
    "total_available_coins": 25000,
    "payable_inr": 10000,
    "rank": 12,
    "summary": {
      "lifetime": 145000,
      "this_month": 32500,
      "this_week": 8400,
      "today": 2450
    }
  }
}
```

### 11.7 Save/Update Bank Details
Uploads bank details and the passbook image for verification.
- **Endpoint:** `/creator/bank-details`
- **Method:** `POST`
- **Content-Type:** `multipart/form-data`

**Request Form Data:**
- `account_holder_name`: "Yamuna Devi"
- `account_number`: "1234567890"
- `ifsc_code`: "SBIN0001234"
- `passbook_image`: (File binary)

**Response:**
```json
{
  "status": "success",
  "message": "Bank details submitted and awaiting verification."
}
```

### 11.8 Get Bank Details
Fetches the currently linked bank account.
- **Endpoint:** `/creator/bank-details`
- **Method:** `GET`

**Response:**
```json
{
  "status": "success",
  "data": {
    "bank_name": "State Bank of India", // Derived from IFSC by backend
    "account_holder_name": "Yamuna Devi",
    "account_number_masked": "•••• 7890",
    "ifsc_code": "SBIN0001234",
    "is_verified": true
  }
}
```

### 11.9 Submit Withdrawal Request
Submits a request to withdraw funds to the linked bank account.
- **Endpoint:** `/creator/withdraw`
- **Method:** `POST`

**Request Body:**
```json
{
  "amount_inr": 5000
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Withdrawal request submitted successfully to Admin."
}
```

### 11.10 Get Withdrawal History
Lists all past payout requests with their statuses.
- **Endpoint:** `/creator/withdrawals/history`
- **Method:** `GET`

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "withdrawal_id": 401,
      "amount_inr": 5000,
      "status": "success",
      "requested_at": "2026-08-15T10:30:00Z"
    },
    {
      "withdrawal_id": 402,
      "amount_inr": 2500,
      "status": "pending",
      "requested_at": "2026-08-18T14:15:00Z"
    }
  ]
}
```

### 11.11 Get Profile Settings
Fetches the data for the Settings tab, including the admin-fixed call rates and editable profile data.
- **Endpoint:** `/creator/profile/settings`
- **Method:** `GET`

**Response:**
```json
{
  "status": "success",
  "data": {
    "name": "Yamuna Devi",
    "avatar_url": "https://...",
    "bio": "Hi! I love talking about music, life, and astrology. Let's chat!",
    "interests": ["Love", "Career", "Music"],
    "languages": ["English", "Hindi", "Kannada"],
    "fixed_rates": {
      "voice_rate": 10,
      "video_rate": 60
    }
  }
}
```

### 11.12 Update Profile
Allows the female creator to update her avatar, bio, and interests. (Languages and Call Rates cannot be updated here).
- **Endpoint:** `/creator/profile/edit`
- **Method:** `PUT`
- **Content-Type:** `multipart/form-data`

**Request Form Data:**
- `avatar_image`: (File binary, optional)
- `bio`: "Hi! Let's chat about life."
- `interests`: "[\"Love\", \"Career\"]" (JSON string array)

**Response:**
```json
{
  "status": "success",
  "message": "Profile updated successfully.",
  "data": {
    "avatar_url": "https://...",
    "bio": "Hi! Let's chat about life.",
    "interests": ["Love", "Career"]
  }
}
```
