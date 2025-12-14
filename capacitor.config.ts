import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.earthechoes.app",
  appName: "EarthEchoes",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
};

export default config;
