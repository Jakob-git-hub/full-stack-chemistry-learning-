# Appwrite Setup Guide for ChemVibe

## 1. Create Appwrite Project

1. Go to [Appwrite Cloud Console](https://cloud.appwrite.io/console)
2. Click **"Create Project"**
3. Name: `ChemVibe` (or your preferred name)
4. Copy the **Project ID** → paste into `.env` as `VITE_APPWRITE_PROJECT_ID`

## 2. Create Database

1. In your project, go to **Databases** → **Create Database**
2. Name: `chemvibe_db`
3. Copy the **Database ID** → paste into `.env` as `VITE_APPWRITE_DATABASE_ID`

## 3. Create Collections

### Collection 1: `lessons`
1. In your database, click **Create Collection**
2. Name: `lessons`
3. Collection ID: `lessons` (auto-generated)
4. Add these **Attributes** (all required unless noted):

| Attribute ID | Type | Size/Options | Required | Description |
|--------------|------|--------------|----------|-------------|
| `title` | String | 255 | ✅ | Lesson title |
| `category` | String | 100 | ✅ | e.g., "Alkane", "Alkohole" |
| `theory` | String | 10000 | ✅ | Theory explanation |
| `challenge` | String | 50000 | ✅ | JSON string of challenge object |
| `status` | String | 20 | ✅ | Enum: "draft", "published" |
| `topic` | String | 255 | ❌ | Optional topic tag |
| `created_at` | DateTime | - | ✅ | Auto-set on create |
| `updated_at` | DateTime | - | ✅ | Auto-set on update |

5. **Indexes** (for performance):
   - `status` (Key: `status`, Type: Key)
   - `category` (Key: `category`, Type: Key)
   - `created_at` (Key: `created_at`, Type: Key)

6. **Permissions** (Settings → Permissions):
   - **Read**: `role:all` (public can read published lessons)
   - **Create**: `role:admin` (only backend/admin creates)
   - **Update**: `role:admin`
   - **Delete**: `role:admin`

### Collection 2: `user_profiles`
1. Create Collection → Name: `user_profiles`
2. Collection ID: `user_profiles`
3. Add these **Attributes**:

| Attribute ID | Type | Size/Options | Required | Description |
|--------------|------|--------------|----------|-------------|
| `user_id` | String | 36 | ✅ | Appwrite Account user $id |
| `xp` | Integer | - | ✅ | Default: 0 |
| `streak` | Integer | - | ✅ | Default: 0 |
| `hearts` | Integer | - | ✅ | Default: 3 |
| `level` | Integer | - | ✅ | Default: 1 |
| `last_heart_regen` | DateTime | - | ❌ | Last regeneration timestamp |
| `completed_lessons` | String | 50000 | ✅ | JSON array of lesson IDs |

4. **Indexes**:
   - `user_id` (Key: `user_id`, Type: **Unique**)

5. **Permissions**:
   - **Read**: `user:{user_id}` (user reads own profile)
   - **Create**: `user:{user_id}` (user creates own profile)
   - **Update**: `user:{user_id}` (user updates own profile)
   - **Delete**: `user:{user_id}`

## 4. Configure Authentication

1. Go to **Auth** → **Settings**
2. **Email/Password**: Enable ✅
3. **Email Verification**: Enable ✅ (optional but recommended)
4. **Password Recovery**: Enable ✅
5. **Session Settings**:
   - Session Length: 365 days (or your preference)
   - Limit Sessions: 10

## 5. Configure Platform (for Web)

1. Go to **Auth** → **Platforms** → **Add Platform**
2. Choose **Web App**
3. Name: `ChemVibe Frontend`
4. Hostname: `localhost` (for dev) + your production domain
5. Save

## 6. Configure CORS (if needed)

1. Go to **Settings** → **CORS**
2. Add: `http://localhost:5173` (Vite default)
3. Add your production domain

## 7. Set Environment Variables

```bash
# In frontend directory
cp .env.example .env
# Edit .env with your values
```

```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your-actual-project-id
VITE_APPWRITE_DATABASE_ID=your-actual-database-id
VITE_APPWRITE_LESSONS_COLLECTION_ID=lessons
VITE_APPWRITE_PROFILES_COLLECTION_ID=user_profiles
```

## 8. Test Connection

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 - you should see the app load with demo data (since no lessons exist yet).

## 9. Add Demo Lessons (Optional)

Use the Admin Dashboard (Ctrl+Shift+A) or Appwrite Console to add lessons:

```json
{
  "title": "Methan aufbauen",
  "category": "Alkane",
  "theory": "Methan (CH₄) ist das einfachste Alkan...",
  "challenge": "{\"type\":\"molecule_builder\",\"question\":\"Baue Methan (CH₄)...\",\"difficulty\":\"easy\",\"target_smiles\":\"C\",\"target_atoms\":[{\"type\":\"carbon\",\"x\":350,\"y\":250},{\"type\":\"hydrogen\",\"x\":350,\"y\":150},{\"type\":\"hydrogen\",\"x\":450,\"y\":250},{\"type\":\"hydrogen\",\"x\":350,\"y\":350},{\"type\":\"hydrogen\",\"x\":250,\"y\":250}],\"target_bonds\":4,\"preplaced_atoms\":[{\"type\":\"carbon\",\"x\":350,\"y\":250}],\"palette_atoms\":[{\"type\":\"carbon\",\"symbol\":\"C\",\"name\":\"Kohlenstoff\"},{\"type\":\"hydrogen\",\"symbol\":\"H\",\"name\":\"Wasserstoff\"}]}",
  "status": "published",
  "topic": "Grundlagen"
}
```

## 10. Backend Environment (for lesson generation)

Create `/backend/.env`:

```env
# Appwrite
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key-from-appwrite-console
APPWRITE_DATABASE_ID=your-database-id
APPWRITE_LESSONS_COLLECTION_ID=lessons

# Zyte API
ZYTE_API_KEY=your-zyte-api-key

# LLM (OpenAI-compatible endpoint - works with HuggingFace TGI, vLLM, etc.)
LLM_API_KEY=your-llm-api-key
LLM_API_URL=https://api.openai.com/v1  # or your HF endpoint
LLM_MODEL=gpt-4o-mini  # or your model name
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Appwrite not configured" | Check `.env` values, restart dev server |
| CORS errors | Add `localhost:5173` to Appwrite CORS settings |
| Auth not persisting | Check Platform hostname includes `localhost` |
| Permission denied | Verify collection permissions match user roles |
| Profile not creating | Check `user_profiles` collection has `user_id` as Unique index |

## Production Deployment

1. Add production domain to Platform settings
2. Add production domain to CORS
3. Set environment variables in hosting platform (Vercel, Netlify, etc.)
4. Enable HTTPS in Appwrite project settings