# Immich + Authentik SSO Tutorial: Setting Up OAuth Authentication

This tutorial explains how to integrate Immich (a self-hosted photo management solution) with Authentik for Single Sign-On (SSO) authentication. After completing this guide, users can log into Immich using their Authentik credentials.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Part 1: Understanding OAuth2/OIDC](#part-1-understanding-oauth2oidc)
4. [Part 2: Creating the OAuth2 Provider in Authentik](#part-2-creating-the-oauth2-provider-in-authentik)
5. [Part 3: Creating the Authentik Application](#part-3-creating-the-authentik-application)
6. [Part 4: Configuring Immich OAuth Settings](#part-4-configuring-immich-oauth-settings)
7. [Part 5: Testing the Integration](#part-5-testing-the-integration)
8. [Part 6: Adding Application Icon](#part-6-adding-application-icon)
9. [Troubleshooting](#troubleshooting)
10. [Security Considerations](#security-considerations)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              USER BROWSER                                     │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  1. User visits Immich: https://photos.hrmsmrflrii.xyz                 │  │
│  │  2. Clicks "Login with Authentik" button                               │  │
│  │  3. Redirected to Authentik for login                                  │  │
│  │  4. After auth, redirected back to Immich with token                   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                    │                                      ▲
                    │ 2. Redirect to Authentik             │ 4. Redirect back
                    ▼                                      │    with auth code
┌──────────────────────────────────────────────────────────────────────────────┐
│  AUTHENTIK (192.168.40.21:9000)                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  OAuth2/OpenID Connect Provider                                         │ │
│  │                                                                         │ │
│  │  • Authenticates user credentials                                      │ │
│  │  • Issues access tokens and ID tokens                                  │ │
│  │  • Provides user info endpoint                                         │ │
│  │  • Manages application permissions                                     │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
                    │
                    │ 5. Exchange auth code for tokens
                    │ 6. Fetch user info
                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  IMMICH (192.168.40.22:2283)                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  Photo Management Application                                           │ │
│  │                                                                         │ │
│  │  • Receives OAuth tokens from Authentik                                │ │
│  │  • Creates/maps user account based on email                            │ │
│  │  • Grants access to photo library                                      │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

### OAuth2 Authorization Code Flow

```
┌────────┐     ┌───────────┐     ┌──────────┐     ┌────────┐
│  User  │     │  Immich   │     │ Authentik│     │ Immich │
│Browser │     │  Login    │     │   IdP    │     │ Server │
└───┬────┘     └─────┬─────┘     └────┬─────┘     └───┬────┘
    │                │                │               │
    │ 1. Click       │                │               │
    │   "Login"      │                │               │
    │───────────────>│                │               │
    │                │                │               │
    │ 2. Redirect to │                │               │
    │   Authentik    │                │               │
    │<───────────────│                │               │
    │                │                │               │
    │ 3. Authenticate│                │               │
    │   (username/   │                │               │
    │   password)    │                │               │
    │───────────────────────────────>│               │
    │                │                │               │
    │ 4. Consent     │                │               │
    │   (if needed)  │                │               │
    │<────────────────────────────────│               │
    │                │                │               │
    │ 5. Redirect    │                │               │
    │   with code    │                │               │
    │───────────────────────────────────────────────>│
    │                │                │               │
    │                │ 6. Exchange code for tokens    │
    │                │                │<──────────────│
    │                │                │──────────────>│
    │                │                │               │
    │                │ 7. Fetch user info             │
    │                │                │<──────────────│
    │                │                │──────────────>│
    │                │                │               │
    │ 8. Logged in!  │                │               │
    │<───────────────────────────────────────────────│
    │                │                │               │
```

---

## 2. Prerequisites

### Infrastructure Requirements

| Component | IP Address | Purpose |
|-----------|------------|---------|
| **Authentik** | 192.168.40.21 | Identity Provider (IdP) |
| **Immich** | 192.168.40.22 | Photo management application |
| **Traefik** | 192.168.40.20 | Reverse proxy with SSL |

### URLs Used

| Service | Internal URL | External URL |
|---------|--------------|--------------|
| Authentik | http://192.168.40.21:9000 | https://auth.hrmsmrflrii.xyz |
| Immich | http://192.168.40.22:2283 | https://photos.hrmsmrflrii.xyz |

### Requirements Checklist

- [ ] Authentik installed and running
- [ ] Immich installed and running
- [ ] Both services accessible via HTTPS through Traefik
- [ ] Admin access to both Authentik and Immich
- [ ] PostgreSQL database access for Immich (for configuration)

---

## Part 1: Understanding OAuth2/OIDC

### Key Concepts

| Term | Definition |
|------|------------|
| **OAuth2** | Authorization framework for granting limited access to user accounts |
| **OpenID Connect (OIDC)** | Identity layer on top of OAuth2 for authentication |
| **Identity Provider (IdP)** | Service that stores and verifies user identity (Authentik) |
| **Service Provider (SP)** | Application relying on IdP for authentication (Immich) |
| **Client ID** | Unique identifier for the application |
| **Client Secret** | Secret key shared between IdP and SP |
| **Redirect URI** | URL where IdP sends user after authentication |
| **Scopes** | Permissions requested (openid, email, profile) |

### What Happens During Login

1. User clicks "Login with Authentik" on Immich
2. Browser redirects to Authentik with client ID and redirect URI
3. User authenticates in Authentik (if not already logged in)
4. Authentik redirects back to Immich with an authorization code
5. Immich exchanges the code for access and ID tokens
6. Immich fetches user info using the access token
7. User is logged into Immich

---

## Part 2: Creating the OAuth2 Provider in Authentik

### Step 2.1: Access Authentik Admin Interface

1. Navigate to https://auth.hrmsmrflrii.xyz
2. Log in with your admin account
3. Go to **Applications** > **Providers**

### Step 2.2: Create OAuth2/OpenID Connect Provider

Click **Create** and configure:

| Field | Value | Notes |
|-------|-------|-------|
| **Name** | Immich OAuth Provider | Descriptive name |
| **Authentication flow** | default-authentication-flow | Or your custom flow |
| **Authorization flow** | default-provider-authorization-implicit-consent | Skips consent screen |

### Step 2.3: Protocol Settings

| Field | Value |
|-------|-------|
| **Client type** | Confidential |
| **Client ID** | `immich-oauth-client` |
| **Client Secret** | (generate or set your own) |
| **Redirect URIs** | `https://photos.hrmsmrflrii.xyz/auth/login` |
|                   | `https://photos.hrmsmrflrii.xyz/user-settings` |
|                   | `app.immich:/` (for mobile app) |

### Step 2.4: Advanced Protocol Settings

| Field | Value |
|-------|-------|
| **Signing Key** | authentik Self-signed Certificate |
| **Subject mode** | Based on the User's Email |
| **Include claims in id_token** | ✓ Enabled |
| **Issuer mode** | Each provider has a different issuer |

### Step 2.5: Scopes Configuration

Ensure these scopes are available:
- `openid` (required)
- `email` (required for user identification)
- `profile` (optional, for user display name)

Click **Save** to create the provider.

### Step 2.6: Note the Provider Details

After saving, note the following (you'll need them for Immich):

```
Issuer URL: https://auth.hrmsmrflrii.xyz/application/o/immich/
Client ID: immich-oauth-client
Client Secret: [your-secret]
```

You can verify the OIDC configuration at:
```
https://auth.hrmsmrflrii.xyz/application/o/immich/.well-known/openid-configuration
```

---

## Part 3: Creating the Authentik Application

### Step 3.1: Create Application

1. Go to **Applications** > **Applications**
2. Click **Create**

### Step 3.2: Application Settings

| Field | Value |
|-------|-------|
| **Name** | Immich |
| **Slug** | `immich` |
| **Provider** | Immich OAuth Provider (created above) |
| **Policy engine mode** | any |

### Step 3.3: UI Settings

| Field | Value |
|-------|-------|
| **Launch URL** | `https://photos.hrmsmrflrii.xyz` |
| **Icon** | Upload Immich icon (see Part 6) |
| **Publisher** | Immich |
| **Description** | Self-hosted photo management |

Click **Save**.

---

## Part 4: Configuring Immich OAuth Settings

### Method A: Via Immich Admin UI (Recommended)

1. Log into Immich as admin
2. Go to **Administration** > **Settings** > **OAuth Authentication**
3. Configure the following:

| Setting | Value |
|---------|-------|
| **Enable** | ✓ |
| **Issuer URL** | `https://auth.hrmsmrflrii.xyz/application/o/immich/` |
| **Client ID** | `immich-oauth-client` |
| **Client Secret** | [your-secret-from-authentik] |
| **Scope** | `openid email profile` |
| **Signing Algorithm** | RS256 |
| **Button Text** | `Login with Authentik` |
| **Auto Register** | ✓ (creates user on first login) |
| **Auto Launch** | ☐ (optional - skips login page) |

4. Click **Save**

### Method B: Via Database (Direct Configuration)

If you need to configure OAuth without UI access:

```bash
# SSH into the Immich server
ssh hermes-admin@192.168.40.22

# Update OAuth settings in PostgreSQL
docker exec immich_postgres psql -U postgres -d immich -c "
UPDATE system_metadata
SET value = jsonb_set(
    value,
    '{oauth}',
    '{
        \"enabled\": true,
        \"issuerUrl\": \"https://auth.hrmsmrflrii.xyz/application/o/immich/\",
        \"clientId\": \"immich-oauth-client\",
        \"clientSecret\": \"your-secret-here\",
        \"scope\": \"openid email profile\",
        \"signingAlgorithm\": \"RS256\",
        \"buttonText\": \"Login with Authentik\",
        \"autoRegister\": true,
        \"autoLaunch\": false,
        \"mobileOverrideEnabled\": true,
        \"mobileRedirectUri\": \"app.immich:/\"
    }'::jsonb
)
WHERE key = 'system-config';
"

# Restart Immich to apply changes
docker restart immich_server
```

### Verify Configuration

Check that OAuth is enabled:

```bash
curl -s http://192.168.40.22:2283/api/server/features | jq '.oauth'
# Should return: true
```

Check the OAuth button text:

```bash
curl -s http://192.168.40.22:2283/api/server/config | jq '.oauthButtonText'
# Should return: "Login with Authentik"
```

---

## Part 5: Testing the Integration

### Step 5.1: Test Login Flow

1. Open a new incognito/private browser window
2. Navigate to https://photos.hrmsmrflrii.xyz
3. You should see "Login with Authentik" button
4. Click the button
5. You should be redirected to Authentik login page
6. Log in with your Authentik credentials
7. After successful authentication, you should be redirected back to Immich and logged in

### Step 5.2: Verify User Creation

If auto-register is enabled:
1. Log into Immich admin
2. Go to **Administration** > **Users**
3. Verify the new user was created with the correct email

### Step 5.3: Test Mobile App

1. Open Immich mobile app
2. Enter server URL: `https://photos.hrmsmrflrii.xyz`
3. Tap "Login with Authentik"
4. Complete authentication in browser
5. You should be logged into the app

---

## Part 6: Adding Application Icon

### Download and Install Icon

```bash
# SSH into Authentik server
ssh hermes-admin@192.168.40.21

# Download Immich icon
curl -sL -o /tmp/immich-icon.png \
    'https://raw.githubusercontent.com/immich-app/immich/main/web/static/favicon.png'

# Copy to Authentik media directory
sudo cp /tmp/immich-icon.png /opt/authentik/media/application-icons/immich.png
sudo chown ubuntu:ubuntu /opt/authentik/media/application-icons/immich.png

# Verify
ls -la /opt/authentik/media/application-icons/immich.png
# Should show ~17KB PNG file
```

### Update Application in Database

```bash
docker exec authentik-postgres psql -U authentik -d authentik -c "
UPDATE authentik_core_application
SET meta_icon = 'application-icons/immich.png'
WHERE slug = 'immich';
"
```

### Verify Icon

1. Go to Authentik admin > Applications
2. The Immich application should now display its icon
3. Check the user dashboard - icon should appear there too

---

## Troubleshooting

### Issue: "Invalid redirect URI" Error

**Cause**: The redirect URI in Immich doesn't match what's configured in Authentik.

**Solution**:
1. Check Authentik provider settings
2. Ensure redirect URIs include:
   - `https://photos.hrmsmrflrii.xyz/auth/login`
   - `https://photos.hrmsmrflrii.xyz/user-settings`
   - `app.immich:/` (for mobile)

### Issue: "Invalid client" Error

**Cause**: Client ID mismatch between Authentik and Immich.

**Solution**:
1. Verify client ID in Authentik provider
2. Ensure exact match in Immich OAuth settings
3. Client IDs are case-sensitive

### Issue: User Not Created After Login

**Cause**: Auto-register is disabled or email scope not included.

**Solution**:
1. Enable "Auto Register" in Immich OAuth settings
2. Ensure `email` scope is included in scope configuration
3. Verify user has email set in Authentik

### Issue: Mobile App Not Redirecting

**Cause**: Mobile redirect URI not configured or app link handling issues.

**Solution**:
1. Add `app.immich:/` to redirect URIs in Authentik
2. Enable "Mobile Override" in Immich OAuth settings
3. Set mobile redirect URI to `app.immich:/`

### Checking Logs

**Authentik Logs**:
```bash
docker logs authentik-server --tail 50
```

**Immich Logs**:
```bash
docker logs immich_server --tail 50
```

### Verifying OIDC Configuration

```bash
# Check Authentik OIDC endpoints
curl -s https://auth.hrmsmrflrii.xyz/application/o/immich/.well-known/openid-configuration | jq .

# Should show:
# - issuer
# - authorization_endpoint
# - token_endpoint
# - userinfo_endpoint
# - jwks_uri
```

---

## Security Considerations

### Client Secret Management

- Never commit client secrets to version control
- Store secrets in secure location (password manager, vault)
- Rotate secrets periodically
- Use strong, randomly generated secrets

### Recommended Settings

| Setting | Recommendation | Reason |
|---------|----------------|--------|
| **Client Type** | Confidential | More secure than public clients |
| **Auto-register** | Enable carefully | Creates accounts automatically |
| **Auto-launch** | Disable | Allows password login as fallback |
| **Signing Algorithm** | RS256 | Industry standard, secure |

### Access Control

Consider configuring Authentik policies to:
- Limit which users can access Immich
- Require MFA for Immich access
- Set up group-based access control

---

## Quick Reference

### URLs

| Endpoint | URL |
|----------|-----|
| Authentik Admin | https://auth.hrmsmrflrii.xyz/if/admin/ |
| Authentik OIDC Config | https://auth.hrmsmrflrii.xyz/application/o/immich/.well-known/openid-configuration |
| Immich Admin | https://photos.hrmsmrflrii.xyz/admin |
| Immich API | https://photos.hrmsmrflrii.xyz/api |

### Configuration Values

| Setting | Value |
|---------|-------|
| Client ID | `immich-oauth-client` |
| Issuer URL | `https://auth.hrmsmrflrii.xyz/application/o/immich/` |
| Scopes | `openid email profile` |
| Button Text | `Login with Authentik` |

---

## Related Documentation

- [Authentik OAuth2 Provider](https://goauthentik.io/docs/providers/oauth2/)
- [Immich OAuth Documentation](https://immich.app/docs/administration/oauth)
- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)

---

*Last Updated: December 2024*
*Services: Authentik (IdP), Immich (Photo Management)*
*Authentication: OAuth2/OpenID Connect*
