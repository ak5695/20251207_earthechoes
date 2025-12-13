const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const apiDir = path.join(process.cwd(), 'app', 'api');
const tempApiDir = path.join(process.cwd(), 'app', '_api_ignore');

function moveDir(src, dest) {
  if (fs.existsSync(src)) {
    fs.renameSync(src, dest);
    console.log(`Moved ${src} to ${dest}`);
    return true;
  }
  return false;
}

let moved = false;

try {
  // 1. Move API routes out of the way
  moved = moveDir(apiDir, tempApiDir);

  // 2. Run the build
  console.log('Starting mobile build...');
  execSync(
    'cross-env CAPACITOR_BUILD=true NEXT_PUBLIC_API_URL=https://20251207-earthechoes.vercel.app/api/trpc next build',
    { stdio: 'inherit' }
  );
  console.log('Mobile build completed successfully.');

} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
} finally {
  // 3. Restore API routes
  if (moved) {
    moveDir(tempApiDir, apiDir);
  }
}
