import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [".next/**", "node_modules/**", "out/**", "frontend/**", "public/**", "data/**"],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      /**
       * Avatars are pre-resized 160px WebP files on our own CDN, so next/image would add a
       * runtime optimizer hop and layout machinery for no gain.
       */
      "@next/next/no-img-element": "off",
    },
  },
];

export default config;
