mudaCopier3

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Supabase project at https://app.supabase.com/ if you haven't already.

3. Copy `.env.example` to `.env` and fill in your project's URL and anon key:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

   The `.env` file is ignored by git and is automatically read by Vite.

4. Start the dev server:

   ```bash
   npm run dev
   ```

5. Open http://localhost:5173 in your browser and log in or register.
