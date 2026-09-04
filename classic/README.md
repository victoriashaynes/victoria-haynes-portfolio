# Victoria Haynes Portfolio

A fully self-contained static site. No build step, no dependencies, no Wix.
Every image, font, and the resume PDF live in this folder.

## Pages
- index.html (home: hero, about, projects, experience)
- resume.html (full resume + PDF download)
- merchandise.html / buying.html / flats.html / photography.html (project pages)
- contact.html

## Publish it free (pick one)
1. **Netlify Drop** (easiest): go to https://app.netlify.com/drop and drag this whole folder in. Done, you get a live URL, and you can attach a custom domain later.
2. **GitHub Pages**: push this folder to a repo, enable Pages in repo settings.
3. **Cloudflare Pages / Vercel**: import the folder as a static project.

## Editing
- Text: edit the HTML files directly, they're plain HTML.
- Colors/fonts: everything is tokenized at the top of css/style.css (light and dark themes).
- New merch designs: drop a JPG in assets/merch/ and copy one figure block in merchandise.html.
