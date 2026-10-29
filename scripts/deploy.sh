#!/bin/sh
# Build the app and publish dist/ to the gh-pages branch, which GitHub Pages serves.
set -e
npm run build
cd dist
touch .nojekyll
rm -rf .git
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C .. config user.name)" -c user.email="$(git -C .. config user.email)" commit -q -m "Deploy $(date '+%Y-%m-%d %H:%M')"
git -c credential.helper= -c credential.helper='!gh auth git-credential' push -q -f "$(git -C .. remote get-url origin)" gh-pages
rm -rf .git
echo "Deployed. Live in a minute at https://aari-7.github.io/gullu/"
