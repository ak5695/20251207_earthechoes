const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const apiDir = path.join(process.cwd(), "app", "api");
const tempApiDir = path.join(process.cwd(), "app", "_api_ignore");

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

  // Clean .next directory to avoid stale type errors
  const nextDir = path.join(process.cwd(), ".next");
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log("Cleaned .next directory");
  }

  // Clean existing Service Worker files from public to prevent them from being copied
  const publicDir = path.join(process.cwd(), "public");
  const swFiles = ["sw.js", "sw.js.map", "workbox-*.js", "workbox-*.js.map"];

  // Simple glob-like deletion
  const files = fs.readdirSync(publicDir);
  files.forEach((file) => {
    if (
      file === "sw.js" ||
      file.startsWith("workbox-") ||
      file.startsWith("swe-worker-")
    ) {
      const filePath = path.join(publicDir, file);
      fs.unlinkSync(filePath);
      console.log(`Removed SW file: ${file}`);
    }
  });

  // 2. Run the build
  console.log("Starting mobile build...");
  // Use the production domain for the API
  execSync(
    "cross-env CAPACITOR_BUILD=true NEXT_PUBLIC_API_URL=https://earthechoes.dufran.cn/api/trpc next build --webpack",
    { stdio: "inherit" }
  );
  console.log("Mobile build completed successfully.");
} catch (error) {
  console.error("Build failed:", error);
  process.exit(1);
} finally {
  // 3. Restore API routes
  if (moved) {
    moveDir(tempApiDir, apiDir);
  }
}
