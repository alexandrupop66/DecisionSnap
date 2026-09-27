DecisionSnap — Windows quick start

IMPORTANT: If your Gemini key was visible in a screenshot/chat, revoke it and create a NEW key first.

1. Double-click 1_SETUP_GEMINI_KEY.bat
2. Paste your NEW Gemini API key and press Enter.
3. Optional: double-click 3_TEST_GEMINI_CONNECTION.bat to verify the key/API.
4. Double-click 2_START_DECISIONSNAP.bat
5. Your browser opens http://localhost:3000

At the top of the AI panel you should see:
  AI ready · gemini-3.8-flash

If it says “AI setup needed”, rerun step 1 and restart the app.

You do NOT need to create or rename .env manually.
The local .env file is ignored by Git and is not included in this ZIP.

If Gemini 3.8 is temporarily busy, DecisionSnap automatically tries 3.7 and then 3.6.
