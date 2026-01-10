# Apple Sign-In Setup Guide

This guide explains how to configure Apple Sign-In for MyLiveLinks using Supabase Auth.

## Prerequisites

You need the following from Apple Developer:
- **Team ID**: Found in Apple Developer → Membership → Team ID (10 characters)
- **Key ID**: From the Sign in with Apple key you created
- **Service ID**: Your Service ID identifier (e.g., `FJ4YP4929K.com.mylivelinks.app`)
- **Private Key (.p8)**: Downloaded when you created the Sign in with Apple key

## Step 1: Generate Apple Client Secret JWT

Apple requires a JWT token (not the raw .p8 key) as the client secret.

### 1.1 Add credentials to `.env.local`

Create or update `.env.local` in the project root:

```bash
APPLE_TEAM_ID=FJ4YP4929K
APPLE_KEY_ID=S25WT34A2F
APPLE_SERVICE_ID=FJ4YP4929K.com.mylivelinks.app
APPLE_PRIVATE_KEY_P8="-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgdBb3ynD2wML6R2r3
36nzrNB1suQaQgAjdZK+zLtO5aigCgYIKoZIzj0DAQehRANCAATS6uxV4SjrJ7dp
O8xgGLZKn2sDHYBAFo0MwgciVTl0OSU8XnCWvLMo2bCr0DsVsOFxN8OfMJ0Px8Pz
D0Fv5Z2v
-----END PRIVATE KEY-----"
```

**Important**: 
- Keep the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines
- Wrap the entire key in quotes
- Never commit `.env.local` to git (it's already in `.gitignore`)

### 1.2 Run the JWT generation script

```bash
npx tsx scripts/generate_apple_client_secret.ts
```

This will output a JWT token that looks like:
```
eyJhbGciOiJFUzI1NiIsImtpZCI6IlMyNVdUMzRBMkYifQ.eyJpc3MiOiJGSjRZUDQ5MjlLIiwic3ViIjoiRko0WVA0OTI5Sy5jb20ubXlsaXZlbGlua3MuYXBwIiwiYXVkIjoiaHR0cHM6Ly9hcHBsZWlkLmFwcGxlLmNvbSIsImlhdCI6MTcwNTcyODAwMCwiZXhwIjoxNzIxMjgwMDAwfQ.signature
```

**Copy this entire JWT token.**

The JWT is valid for 180 days (Apple's maximum). You'll need to regenerate it before expiration.

## Step 2: Configure Supabase

### 2.1 Enable Apple Provider

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Apple** in the list
5. Click to expand

### 2.2 Configure Apple Settings

Fill in the following fields:

- **Enabled**: Toggle ON
- **Client ID**: `FJ4YP4929K.com.mylivelinks.app` (your APPLE_SERVICE_ID)
- **Secret Key**: Paste the JWT token you generated in Step 1.2
- **Redirect URL**: Copy the URL shown (e.g., `https://[your-project].supabase.co/auth/v1/callback`)

### 2.3 Configure Apple Developer Portal

1. Go to [Apple Developer](https://developer.apple.com/)
2. Navigate to **Certificates, Identifiers & Profiles** → **Identifiers**
3. Select your Service ID (`com.mylivelinks.app`)
4. Under **Sign in with Apple**, click **Configure**
5. Add the Supabase redirect URL from Step 2.2 to **Return URLs**
6. Add your web domain(s) to **Domains and Subdomains**:
   - `mylivelinks.com`
   - `www.mylivelinks.com`
7. Save changes

## Step 3: Test the Integration

### 3.1 Test Login (Logged Out)

1. Go to your login page: `https://www.mylivelinks.com/login`
2. Click **Continue with Apple**
3. Complete Apple authentication
4. You should be redirected back and logged in

### 3.2 Test Account Linking (Logged In)

1. Log in with email/password
2. Go to Settings: `https://www.mylivelinks.com/settings/account`
3. Under **Connected Accounts**, find **Apple**
4. Click **Connect**
5. Complete Apple authentication
6. You should see **Apple: Connected**

## Troubleshooting

### "Invalid client" error
- Verify the Service ID matches exactly in Supabase and Apple Developer
- Ensure the JWT is not expired (regenerate if needed)

### "Invalid redirect URI" error
- Check that the Supabase redirect URL is added to Apple Developer Portal
- Verify domains are configured correctly

### JWT generation fails
- Ensure the private key includes the BEGIN/END lines
- Check that all environment variables are set correctly
- Verify the private key is valid (not expired or revoked)

## Security Notes

- **Never commit** `.env.local` or the `.p8` file to git
- The JWT expires after 180 days - set a calendar reminder to regenerate
- The private key should only exist locally, never on the server
- Error messages are sanitized to prevent config exposure

## Environment Variables Reference

For `.env.local`:

```bash
# Apple Sign-In Configuration
APPLE_TEAM_ID=FJ4YP4929K
APPLE_KEY_ID=S25WT34A2F
APPLE_SERVICE_ID=FJ4YP4929K.com.mylivelinks.app
APPLE_PRIVATE_KEY_P8="-----BEGIN PRIVATE KEY-----
[Your private key content here]
-----END PRIVATE KEY-----"
```
