124 BODARE - FULL NETLIFY CLOUD SYNC

This project uses Netlify hosting, Netlify Functions and Netlify Blobs. It does NOT use Supabase.

WHAT SYNCS BETWEEN DEVICES
- Admin-edited page text and image source URLs
- All four residents' live statuses
- Tea, sugar and milk powder stock levels
- Borrowed-items log and return actions
- Uploaded gallery photos, captions and categories (stored as cloud media objects)
- Exam name and countdown date/time
- Visitor guest check-ins and reviews (moderated by Admin)

ACCESS RULES
- Public visitors can view the site and submit guest check-ins/reviews.
- Only a logged-in Admin can edit page text, update statuses/stock/borrowed items, set the countdown, upload/delete gallery images, and moderate submissions.
- Reviews appear publicly only after Admin approval. Guest submissions remain in the Admin submissions panel.

DEPLOYMENT
1. Extract this ZIP and upload the entire folder to a GitHub repository.
2. In Netlify choose Add new site -> Import an existing project and connect that GitHub repository.
3. In Netlify Site configuration -> Environment variables, add:
   ADMIN_PASSWORD = choose a strong unique admin password
   SESSION_SECRET = a long random secret (at least 32 random characters)
4. Trigger a new deploy after adding environment variables.
5. Open the deployed website and use Admin Login. Edit content and use Save changes for page text/images. Other dashboard controls save to the cloud when changed.

IMPORTANT
- Keep netlify/, package.json, netlify.toml, styles.css and admin.js in the deployed project.
- Deploy through Git-connected Netlify or Netlify CLI. A static drag-and-drop deploy will not run Functions.
- Do not put ADMIN_PASSWORD or SESSION_SECRET in HTML or JavaScript.
- Gallery images are uploaded to Netlify Blobs. Keep images below 8 MB each.
- This build has not been tested inside your Netlify account. After deployment, test admin login, status update, stock update, gallery upload, countdown, borrowing, guest check-in and review approval from a second device/browser.
- Netlify Blobs usage and plan limits apply. For a very large gallery or heavy traffic, consider object storage/CDN with quotas and image optimization.
