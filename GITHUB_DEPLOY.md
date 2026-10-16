# Publish Odin Financial Lens publicly with GitHub Pages

This is the easiest path if you have never used GitHub before. Once published, the site can be opened by anyone with the link.

## One-time setup

1. Create a GitHub account at https://github.com if you do not already have one.
2. Create a new repository:
   - Click **+** in the top-right corner.
   - Choose **New repository**.
   - Repository name: `odin-financial-lens`.
   - Visibility: **Public**.
   - Do **not** add a README, .gitignore, or license on GitHub; this project already has files.

## Upload the project without using the command line

1. Open your new empty GitHub repository.
2. Click **uploading an existing file**.
3. Drag the contents of the `odin-process-mapper` folder into GitHub.
   - Upload the folder contents, not the parent folder itself.
   - Include hidden folders if your file picker allows it: `.github` and `.devcontainer`.
4. Click **Commit changes**.

## Turn on GitHub Pages

1. In the GitHub repository, open **Settings**.
2. Open **Pages** in the left sidebar.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Go to the **Actions** tab.
5. Wait for the workflow named **Deploy static site to GitHub Pages** to finish.
6. Open **Settings → Pages** again. GitHub will show the public URL.

The URL usually looks like:

```text
https://YOUR-USERNAME.github.io/odin-financial-lens/
```

## If you prefer GitHub Codespaces

1. Open the repository on GitHub.
2. Click **Code**.
3. Open the **Codespaces** tab.
4. Click **Create codespace on main**.
5. Once it opens, run:

```bash
pnpm install
pnpm run dev
```

Codespaces is useful for editing and previewing, but GitHub Pages is what you want for a public share link.

## Local commands if you are comfortable with terminal

```bash
pnpm install
pnpm run test
pnpm run build
pnpm run preview
```

## Notes

- The site is fully static after build.
- No backend or login is required.
- Uploaded spreadsheets are processed in the browser session; this MVP does not send files to a server.
- The included GitHub Actions workflow handles build and deployment automatically.
