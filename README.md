# Breakthrough 120 Board

Two links once it's live:
- TV screen:     https://YOUR-SITE.netlify.app/
- Entry screen:  https://YOUR-SITE.netlify.app/update   (needs the PIN)

## What's in this folder
- public/index.html            the page (TV screen and entry screen)
- netlify/functions/board.mjs  saves agent numbers, slides and settings
- netlify/functions/photo.mjs  saves celebration photos
- netlify.toml                 tells Netlify how to set up the site
- package.json                 lists the one add-on Netlify installs

## Setup (one time)
1. GitHub: make a free account, create a new repository (e.g. "bt120-board"),
   click "uploading an existing file", and drag in everything in this folder
   (keep the folders as they are). Click "Commit changes".
2. Netlify: make a free account, click "Add new project" > "Import an existing project"
   > GitHub, pick the repository, leave all settings as they are, and click Deploy.
3. PIN: in Netlify go to Project configuration > Environment variables > Add a variable.
   Key: BOARD_PIN    Value: the PIN you want (e.g. 4 to 6 digits). Save.
   Then go to Deploys > Trigger deploy > Deploy project so the PIN takes effect.
4. Optional: Project configuration > Change project name, to get a nicer address.

To change the PIN later: edit BOARD_PIN, then Trigger deploy again.
