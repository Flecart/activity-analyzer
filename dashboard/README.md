# Personal Activity Dashboard

A modular dashboard for custom time tracking data.

## Local Development

```
npm install
npm run dev
```

## Deploying to GitHub Pages

This repo includes a GitHub Actions workflow (`.github/workflows/gh-pages.yml`) that automatically builds and deploys the static website to GitHub Pages from the `main` branch. Pushes to `main` will publish the site to:

```
https://<your-username>.github.io/<repository-name>/
```

**Tip:** Customize your repository's GitHub Pages settings if needed for your org/user.

### Triggering Vercel Backend Update

If you also use Vercel for the backend (for CSV uploading via the dashboard), you may want to ping the backend API on deployment to rebuild/revalidate.

Add a webhook or HTTP step to the workflow with your Vercel **deployment/proxy endpoint**, such as:

```
https://<your-vercel-app>.vercel.app/api/revalidate
```
or other endpoint according to your backend design.

**To add after deploy in the workflow:**

```
- name: Notify Vercel Backend
  run: |
    curl -X POST "https://<your-vercel-app>.vercel.app/api/revalidate?secret=<YOUR_SECRET>"
```

You can add secrets in your repo for secure tokens.

---

For more advanced static/data workflows consult the Next.js and GitHub Pages documentation.
