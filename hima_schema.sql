-- ============================================================
-- HI MA APP â€” FULL DATABASE SCHEMA
-- Generated step by step based on app screens
-- Database: PostgreSQL
-- ============================================================


-- ============================================================
-- 1. AUTH / ONBOARDING
-- ============================================================

-- Core user table
CREATE TABLE users (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    phone_number            VARCHAR(15) NOT NULL UNIQUE,
    country_code            VARCHAR(5)  NOT NULL DEFAULT '+91',
    full_name               VARCHAR(100),
    is_verified             BOOLEAN     NOT NULL DEFAULT FALSE,
    referral_code           VARCHAR(20) UNIQUE,
    referred_by             BIGINT REFERENCES users(id),
    signup_source            VARCHAR(20) DEFAULT 'otp',        -- 'otp' or 'truecaller'

    -- profile fields (added later)
    gender                  VARCHAR(10),                        -- 'male' / 'female'
    avatar_id                BIGINT,                             -- FK added after avatars table
    language_id              INT,                                -- FK added after languages table
    user_role                VARCHAR(20) DEFAULT 'user',        -- 'user' (consumer) or 'creator'
    about_me                 TEXT,
    age                      INT,
    is_new_creator           BOOLEAN DEFAULT TRUE,
    notifications_enabled    BOOLEAN DEFAULT FALSE,
    is_online                BOOLEAN DEFAULT FALSE,
    last_seen_at              TIMESTAMP,
    profile_completed_step   VARCHAR(30),                        -- 'gender','language','notifications','completed'
    dnd_enabled               BOOLEAN DEFAULT FALSE,
    account_status            VARCHAR(20) DEFAULT 'good_standing', -- 'good_standing','warned','suspended','banned','pending_deletion'

    created_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- OTP tracking (only needed if NOT using a provider's built-in verify API)
CREATE TABLE otp_verifications (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    phone_number    VARCHAR(15) NOT NULL,
    otp_code        VARCHAR(6)  NOT NULL,
    purpose         VARCHAR(20) NOT NULL DEFAULT 'login',   -- 'login', 'signup'
    attempts        INT NOT NULL DEFAULT 0,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_otp_phone ON otp_verifications(phone_number);

-- Session/auth tokens
CREATE TABLE user_sessions (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token   TEXT NOT NULL,
    device_id       VARCHAR(100),
    platform        VARCHAR(20),                              -- 'android' / 'ios'
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 2. PROFILE SETUP (Gender, Avatar, Language)
-- ============================================================

-- Avatars master list
CREATE TABLE avatars (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    avatar_url      TEXT NOT NULL,
    gender          VARCHAR(10) NOT NULL,                     -- 'male' / 'female'
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    display_order   INT DEFAULT 0
);

-- Languages master list
CREATE TABLE languages (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name_english    VARCHAR(30) NOT NULL,                     -- 'Kannada'
    name_native     VARCHAR(30) NOT NULL,                     -- 'à²•à²¨à³à²¨à²¡'
    language_code   VARCHAR(5) NOT NULL UNIQUE,                -- 'kn','ta','te'
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    display_order   INT DEFAULT 0
);

-- Now link users -> avatars / languages
ALTER TABLE users ADD CONSTRAINT fk_users_avatar FOREIGN KEY (avatar_id) REFERENCES avatars(id);
ALTER TABLE users ADD CONSTRAINT fk_users_language FOREIGN KEY (language_id) REFERENCES languages(id);


-- ============================================================
-- 3. WALLET / COINS
-- ============================================================

CREATE TABLE wallets (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    coin_balance    BIGINT NOT NULL DEFAULT 0,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Coin packages (Wallet screen / Welcome offer)
CREATE TABLE coin_packages (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    coins               BIGINT NOT NULL,
    price               NUMERIC(10,2) NOT NULL,
    original_price      NUMERIC(10,2),
    discount_percent    INT,
    is_welcome_offer    BOOLEAN DEFAULT FALSE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    display_order       INT DEFAULT 0
);

-- Coin transactions (purchase + spend history)
CREATE TABLE coin_transactions (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    type            VARCHAR(20) NOT NULL,                     -- 'purchase','call_spend','chat_spend','refund','referral_bonus'
    coins           BIGINT NOT NULL,                          -- positive = credit, negative = debit
    amount_paid     NUMERIC(10,2),
    payment_id      VARCHAR(100),
    reference_id    BIGINT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Notification tokens (FCM)
CREATE TABLE notification_tokens (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fcm_token       TEXT NOT NULL,
    device_id       VARCHAR(100),
    platform        VARCHAR(20),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 4. HOME FEED / CHAT / CALLS (core)
-- ============================================================

-- Conversations
CREATE TABLE conversations (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_one_id     BIGINT NOT NULL REFERENCES users(id),
    user_two_id     BIGINT NOT NULL REFERENCES users(id),
    last_message_id BIGINT,
    last_message_at TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_one_id, user_two_id)
);

-- Messages
CREATE TABLE messages (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES conversations(id),
    sender_id       BIGINT NOT NULL REFERENCES users(id),
    message_text    TEXT,
    message_type    VARCHAR(20) DEFAULT 'text',                -- 'text','image','voice'
    is_deleted      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Now attach conversations.last_message_id -> messages
ALTER TABLE conversations ADD CONSTRAINT fk_conv_last_message FOREIGN KEY (last_message_id) REFERENCES messages(id);

-- Call logs
CREATE TABLE call_logs (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    caller_id               BIGINT NOT NULL REFERENCES users(id),
    receiver_id             BIGINT NOT NULL REFERENCES users(id),
    call_type               VARCHAR(10) NOT NULL,               -- 'voice' / 'video'
    status                  VARCHAR(20) NOT NULL,               -- 'ringing','ongoing','completed','missed','rejected'
    duration_seconds        INT DEFAULT 0,
    coins_charged           BIGINT DEFAULT 0,
    rate_per_min             NUMERIC(6,2),
    agora_channel_name       VARCHAR(100),
    agora_token               TEXT,
    end_reason                VARCHAR(30),                       -- 'completed','no_answer','rejected','insufficient_coins','network_error'
    started_at                TIMESTAMP,
    ended_at                  TIMESTAMP,
    created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Per-minute billing ticks during a call
CREATE TABLE call_billing_ticks (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    call_id         BIGINT NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,
    tick_number     INT NOT NULL,
    coins_deducted  BIGINT NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Creator-specific call/chat pricing
CREATE TABLE creator_settings (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id                 BIGINT NOT NULL UNIQUE REFERENCES users(id),
    voice_rate_per_min      NUMERIC(6,2) DEFAULT 8.00,
    video_rate_per_min      NUMERIC(6,2) DEFAULT 15.00,
    chat_rate_per_msg       NUMERIC(6,2) DEFAULT 0,
    is_available             BOOLEAN DEFAULT TRUE
);


-- ============================================================
-- 4B. CREATOR (FEMALE) ONBOARDING / VERIFICATION
-- ============================================================

-- Creator application / manual verification tracking
-- Female users go through admin review before they can go live as a creator
CREATE TABLE creator_applications (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id                 BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    status                  VARCHAR(20) NOT NULL DEFAULT 'pending_review',
                             -- 'pending_review', 'call_scheduled', 'approved', 'rejected'
    submitted_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verification_call_at     TIMESTAMP,                      -- when admin actually called
    reviewed_by_admin_id     BIGINT,
    rejection_reason         TEXT,
    reviewed_at               TIMESTAMP,
    created_at                 TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                 TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_creator_applications_status ON creator_applications(status);
CREATE INDEX idx_creator_applications_user ON creator_applications(user_id);


-- ============================================================
-- 5. TAGS / CATEGORIES (Music, Movies, Foodie, Love, Travel, New)
-- Also reused for creator "interests" (Politics, Art, Sports, etc.)
-- ============================================================

CREATE TABLE tags (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(30) NOT NULL UNIQUE,
    icon_url        TEXT,
    tag_type        VARCHAR(20) DEFAULT 'interest',            -- 'interest' or 'system'
    display_order   INT DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE
);

CREATE TABLE user_tags (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tag_id          INT NOT NULL REFERENCES tags(id),
    UNIQUE(user_id, tag_id)
);
CREATE INDEX idx_user_tags_tag ON user_tags(tag_id);


-- ============================================================
-- 6. FRIENDS / SOCIAL GRAPH
-- ============================================================

CREATE TABLE friend_requests (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    sender_id       BIGINT NOT NULL REFERENCES users(id),
    receiver_id     BIGINT NOT NULL REFERENCES users(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',    -- 'pending','accepted','rejected'
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at    TIMESTAMP,
    UNIQUE(sender_id, receiver_id)
);

CREATE TABLE friendships (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_one_id     BIGINT NOT NULL REFERENCES users(id),
    user_two_id     BIGINT NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_one_id, user_two_id)
);

CREATE TABLE favourite_friends (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, friend_id)
);

CREATE TABLE blocked_users (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    blocker_id      BIGINT NOT NULL REFERENCES users(id),
    blocked_id      BIGINT NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(blocker_id, blocked_id)
);

CREATE TABLE user_reports (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    reporter_id     BIGINT NOT NULL REFERENCES users(id),
    reported_id     BIGINT NOT NULL REFERENCES users(id),
    reason          VARCHAR(100),
    description     TEXT,
    status          VARCHAR(20) DEFAULT 'pending',             -- 'pending','reviewed','action_taken'
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE online_notify_subscriptions (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    subscriber_id   BIGINT NOT NULL REFERENCES users(id),
    target_user_id  BIGINT NOT NULL REFERENCES users(id),
    is_enabled      BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subscriber_id, target_user_id)
);


-- ============================================================
-- 7. REFERRALS
-- ============================================================

CREATE TABLE referrals (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    referrer_id         BIGINT NOT NULL REFERENCES users(id),
    referred_user_id    BIGINT NOT NULL UNIQUE REFERENCES users(id),
    coins_earned        BIGINT DEFAULT 40,
    status               VARCHAR(20) DEFAULT 'pending',         -- 'pending','completed'
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 8. MODERATION / WARNINGS
-- ============================================================

CREATE TABLE user_warnings (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(id),
    reason              VARCHAR(200) NOT NULL,
    issued_by_admin_id  BIGINT,
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 9. ACCOUNT DELETION
-- ============================================================

CREATE TABLE account_deletion_requests (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id                 BIGINT NOT NULL REFERENCES users(id),
    reason                  VARCHAR(50) NOT NULL,               -- 'Not able to here Hi ma','Abusive language', etc.
    other_reason            TEXT,
    requested_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    scheduled_purge_at       TIMESTAMP NOT NULL,                -- requested_at + 30 days
    status                    VARCHAR(20) DEFAULT 'pending'        -- 'pending','cancelled','purged'
);


-- ============================================================
-- 10. SUPPORT TICKETS
-- ============================================================

CREATE TABLE support_tickets (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    subject         VARCHAR(200),
    description     TEXT,
    status          VARCHAR(20) DEFAULT 'active',                -- 'active','resolved'
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at     TIMESTAMP
);

CREATE TABLE support_ticket_messages (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_id       BIGINT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_type     VARCHAR(10) NOT NULL,                        -- 'user' or 'admin'
    message         TEXT NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 11. STATIC / CMS CONTENT (Privacy, Terms, Refund, Guidelines)
-- ============================================================

CREATE TABLE static_pages (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    page_key        VARCHAR(50) NOT NULL UNIQUE,                 -- 'privacy_policy','terms','refund_policy','community_guidelines'
    title           VARCHAR(100) NOT NULL,
    content_html    TEXT NOT NULL,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- USEFUL INDEXES (performance)
-- ============================================================

CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_language ON users(language_id);
CREATE INDEX idx_users_role ON users(user_role);
CREATE INDEX idx_users_online ON users(is_online);

CREATE INDEX idx_call_logs_caller ON call_logs(caller_id);
CREATE INDEX idx_call_logs_receiver ON call_logs(receiver_id);
CREATE INDEX idx_call_logs_status ON call_logs(status);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_conversations_user_one ON conversations(user_one_id);
CREATE INDEX idx_conversations_user_two ON conversations(user_two_id);

CREATE INDEX idx_friend_requests_receiver ON friend_requests(receiver_id, status);
CREATE INDEX idx_friend_requests_sender ON friend_requests(sender_id, status);

CREATE INDEX idx_coin_transactions_user ON coin_transactions(user_id);

-- ============================================================
-- END OF SCHEMA
-- ============================================================

-- ============================================================
-- 10. CREATOR WALLET & PAYOUTS (Female Side)
-- ============================================================

-- Bank Accounts for Creators
CREATE TABLE bank_accounts (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id                 BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    account_holder_name     VARCHAR(100) NOT NULL,
    account_number          VARCHAR(50) NOT NULL,
    ifsc_code               VARCHAR(20) NOT NULL,
    passbook_image_url      TEXT NOT NULL,
    is_verified             BOOLEAN DEFAULT FALSE,
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Withdrawal Requests
CREATE TABLE withdrawal_requests (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id                 BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_inr              NUMERIC(10,2) NOT NULL,
    status                  VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed'
    admin_notes             TEXT,
    requested_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at            TIMESTAMP
);

CREATE INDEX idx_withdrawals_user ON withdrawal_requests(user_id);
CREATE INDEX idx_withdrawals_status ON withdrawal_requests(status);

