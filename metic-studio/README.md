# Metic Studio

A private studio for Metic Apparel: capture ideas the moment they come, then shape them into drops.

- **Inbox:** type a line or snap a photo and it's saved. "Add many mockups" turns a batch of images into one idea each.
- **Drops:** each World Series chapter, Titi's Closet, Places Series and anything new, with progress towards launch.
- **Pieces:** mockups, stage (Idea → Sketch → Mockup → Sample → Ready → Launched), Quiet or Loud side, colourways, price, supplier and notes.
- **Brand:** the rules every piece follows: tagline, the two recipes, naming, pricing, logos, suppliers, packaging.
- **Present:** a full-screen lookbook of a drop, to show someone on the iPad. Swipe or use the arrow keys.

It starts with Metic's existing drops and ideas, all editable.

**Adding mockups in bulk:** name each image after its piece, like `Wool Overcoat 001.jpg`, `Wool Overcoat 001 (2).jpg` or `Track Jacket 001 - model.jpg`. Then use **Add many mockups** and they go straight onto the right piece. Images that don't match a piece land in the Inbox as ideas.

## Try it now

```
npm install
npm run dev
```

Without Supabase it saves on this device only, which is fine for trying it out.

## Set up syncing (one time)

1. **Create a project.** Create a new, free Supabase project called `metic-studio`. Keep it separate from Eatsbythia.
2. **Run the setup script.** In the SQL Editor, run `supabase_setup.sql`.
3. **Turn off email confirmation for now.** Go to **Authentication → Sign In / Providers → Email**, so you can sign in straight away.
4. **Add your keys.** Copy `.env.example` to `.env.local` and add the project URL and publishable key from **Project Settings → API Keys**.
5. **Create your account.** Run `npm run dev`, choose **Create your account**, and sign up. The studio fills with your starting content.
6. **Lock it.** In **Authentication → Sign In / Providers**, turn off **Allow new users to sign up**, so nobody else can create an account.

## Put it online

1. **Push it to GitHub.** Push this folder to a new GitHub repository called `metic-studio`.
2. **Add your keys.** In **Settings → Secrets and variables → Actions → Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. **Turn on GitHub Pages.** In **Settings → Pages**, set **Source** to **GitHub Actions**.
4. **Install it.** Open `https://bhigayo.github.io/metic-studio/` on your iPad and iPhone, then **Share → Add to Home Screen**.

The code is public, but your ideas and images aren't: every table and the image bucket only allow your login.

## Tests

```
npm test
```
