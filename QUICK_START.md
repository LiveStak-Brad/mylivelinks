# Quick Start - Windows CMD/PowerShell

## Exact Commands to Run

### Step 1: Install Dependencies

```cmd
npm install
```

### Step 2: Start Dev Server

```cmd
npm run dev
```

Wait for:
```
✓ Ready in 2.3s
○ Local:        http://localhost:3000
```

### Step 3: Open URLs

1. **Live Room:** http://localhost:3000/live
2. **Demo Profile:** http://localhost:3000/demo_user_1

---

## What You Should See

### ✅ `/live` Page

- **Preview Mode banner** at top (purple gradient)
- **12-tile grid** (6×2) with fake streamers
- **Logo** in header
- **Randomize button** (replaces all 12 tiles)
- **Chat sidebar** (right side)
- **Tile controls** (hover to see: close, mute, gift button)
- **Gifter badges** on tiles

### ✅ `/[username]` Page (e.g., `/demo_user_1`)

- **Profile banner** (clickable)
- **Avatar** and username
- **Stats** (followers, diamonds, coins)
- **Action buttons** (Watch Live, Go Live, Follow, Message)
- **Diamond Conversion** component (works in preview mode)

---

## Test Features

1. **Click Randomize** → All 12 tiles replace with new fake streamers
2. **Hover over tile** → See gift button, close, mute controls
3. **Click gift button** → Gift modal opens (mocked, works without database)
4. **Visit `/demo_user_1`** → See profile page
5. **Try Diamond Conversion** → Works in preview mode (mocked)

---

## Confirmation

✅ **Works WITHOUT Agora keys**  
✅ **Works WITHOUT Supabase configured**  
✅ **All UI components render**  
✅ **Preview mode clearly labeled**  
✅ **Seed mode auto-populates 12 streamers**  

**You're ready to develop!** 🚀






