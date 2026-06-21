# IloveCV

AI-powered CV and cover letter builder, using Google Gemini as the AI engine.

## What's been verified, and what hasn't

To be straightforward about this before you deploy:

**Verified directly:**
- The frontend HTML/JS has no syntax errors
- The serverless function (`api/generate.js`) loads correctly as an ES module and its error-handling logic works correctly for missing keys, missing prompts, and wrong HTTP methods (tested with mock requests)
- The Gemini API endpoint, model name, auth header, and response shape (`candidates[0].content.parts[0].text`) all match Google's current official documentation as of this writing

**NOT verified — needs your confirmation on first run:**
- An actual live call to Gemini with your real API key. My sandbox can't reach `generativelanguage.googleapis.com` directly, so I could not confirm an end-to-end real request/response. The code is built precisely to Google's documented contract, but you should run through the Step 5 checklist below yourself the first time you deploy, and watch for errors.
- Hostpinnacle's specific compatibility with serverless Node functions — confirm this with their support before migrating off Vercel.

If Step 5's checklist throws an error you don't recognize, paste it here and I'll fix it against the real failure, not a guess.

## Project structure

```
ilovecv-project/
├── api/
│   └── generate.js      ← serverless function, talks to Gemini, holds your API key safely
├── public/
│   └── index.html       ← the entire app (UI + logic)
├── vercel.json          ← tells Vercel how to route requests
├── package.json
└── .gitignore
```

Your Gemini API key NEVER goes in `index.html`. It lives only as an environment
variable on Vercel's servers, read by `api/generate.js`. The browser only ever
talks to `/api/generate` on your own domain — never directly to Google.

---

## Step 1 — Test locally first (recommended)

Install the Vercel CLI:

```bash
npm install -g vercel
```

From inside the `ilovecv-project` folder, create a local env file:

```bash
echo "GEMINI_API_KEY=your_actual_key_here" > .env
```

Then run:

```bash
vercel dev
```

This starts a local server (usually `http://localhost:3000`) that runs both
the static site AND the serverless function exactly as Vercel would in
production. Open that URL, paste a CV, and confirm the revamp works before
deploying anywhere.

**Important:** opening `index.html` directly by double-clicking it will NOT
work — `/api/generate` only exists when the project is served by Vercel
(locally via `vercel dev`, or once deployed). Always test through `vercel dev`
or the live URL, never the raw file.

---

## Step 2 — Push to GitHub

```bash
cd ilovecv-project
git init
git add .
git commit -m "feat: IloveCV with Gemini integration"
```

Create a new repo at github.com/new (call it `ilovecv`, keep it Public or
Private, don't add a README there), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/ilovecv.git
git branch -M main
git push -u origin main
```

---

## Step 3 — Deploy to Vercel (trial)

```bash
vercel
```

Follow the prompts:
- "Set up and deploy?" → Yes
- "Which scope?" → your account
- "Link to existing project?" → No
- "What's your project's name?" → ilovecv (or anything you like)
- "In which directory is your code located?" → ./ (press Enter)

Vercel will detect `vercel.json` and deploy automatically. You'll get a URL
like `https://ilovecv-yourname.vercel.app`.

---

## Step 4 — Add your Gemini API key to Vercel (critical)

The deploy will work, but AI features will fail until you add the key:

1. Go to https://vercel.com/dashboard
2. Click your `ilovecv` project
3. Go to **Settings → Environment Variables**
4. Add:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** your actual Gemini API key
   - **Environment:** Production, Preview, and Development (tick all three)
5. Click **Save**
6. Go to the **Deployments** tab, click the three dots on the latest
   deployment, and click **Redeploy** (environment variables only take
   effect on a fresh deploy)

---

## Step 5 — Test the live trial

Visit your `.vercel.app` URL and run through this checklist:

| Test | Expected result |
|---|---|
| Choose "Revamp an old CV" | Paste screen appears |
| Paste a real CV's text | Character count updates live |
| Click "Generate my CV now" | Loading spinner, then a filled-in CV appears |
| Check Profile tab after revamp | Name, email, phone should be filled |
| Check Experience tab after revamp | All jobs from the pasted CV should appear |
| Add a job description, regenerate | Match score panel appears above the CV |
| Click "Cover letter" in toolbar | AI writes a tailored letter |
| Click "Download PDF" | Browser print dialog opens with clean A4 layout |

If anything fails, open the browser's dev tools (F12) → **Console** tab and
look for a red error — it will now show you the *actual* reason (e.g. "Server
is missing GEMINI_API_KEY" or "Gemini API request failed (429)") instead of a
generic failure.

---

## Step 6 — Move to Hostpinnacle when ready

Vercel is excellent for this kind of project (static frontend + serverless
functions) and most people simply stay on it permanently — including for
production, not just trials, since the free tier covers significant traffic.

If you still want to move to Hostpinnacle afterward, you'll need a host that
supports Node.js serverless/server functions (not just static file hosting),
since `api/generate.js` needs somewhere to run. Confirm Hostpinnacle's plan
supports that before migrating, or keep the AI backend on Vercel and only
host the static frontend elsewhere, pointing `fetch('/api/generate')` to your
Vercel function's full URL instead of a relative path.

---

## Common issues

**"Failed to fetch" in the browser** — almost always means `/api/generate`
isn't reachable. Check: are you testing via `vercel dev` or a live URL (not
double-clicking the HTML file)? Is the deployment showing as "Ready" in the
Vercel dashboard?

**"Server is missing GEMINI_API_KEY"** — the environment variable wasn't
added, or was added after the last deploy. Redeploy after adding it.

**"Gemini API request failed (429)"** — you've hit the free tier's rate
limit (requests per minute) or daily quota. Wait a minute and retry, or
check your usage at https://aistudio.google.com.

**Cover letter or CV comes back empty** — check the Vercel function logs
(Vercel dashboard → your project → Deployments → click a deployment →
Functions tab) for the actual Gemini error, often a content safety block on
unusual input.
