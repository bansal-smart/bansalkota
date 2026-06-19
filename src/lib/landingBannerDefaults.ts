import bannerJeeAsset from "@/assets/landing-banners/banner-jee.webp.asset.json";
const bannerJee = bannerJeeAsset.url;
import bannerNeetAsset from "@/assets/landing-banners/banner-neet.webp.asset.json";
const bannerNeet = bannerNeetAsset.url;
import bannerPhysics from "@/assets/landing-banners/banner-physics.jpg";
import bannerChemistry from "@/assets/landing-banners/banner-chemistry.jpg";
import type { BannerItem } from "@/lib/landingSchemas";

export const DEFAULT_BANNERS: BannerItem[] = [
  {
    image_url: bannerJee,
    caption: "JEE Advanced 2027 — Booster Batch",
    alt: "JEE Advanced 2027 Booster Batch promotional banner",
    link: "#register",
  },
  {
    image_url: bannerNeet,
    caption: "NEET 2027 Crash Course — Limited Seats",
    alt: "NEET 2027 Crash Course promotional banner",
    link: "#register",
  },
  {
    image_url: bannerPhysics,
    caption: "Physics — Mechanics & Waves (Class 12)",
    alt: "Physics course thumbnail",
  },
  {
    image_url: bannerChemistry,
    caption: "Chemistry — Organic & Inorganic (Class 12)",
    alt: "Chemistry course thumbnail",
  },
];
