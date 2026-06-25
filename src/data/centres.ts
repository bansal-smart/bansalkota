import cityMetro from "@/assets/city-metro.jpg";
import cityHills from "@/assets/city-hills.jpg";
import cityHeritage from "@/assets/city-heritage.jpg";
import cityCoastal from "@/assets/city-coastal.jpg";
import cityTempleAsset from "@/assets/city-temple.webp.asset.json";
const cityTemple = cityTempleAsset.url;
import cityPlains from "@/assets/city-plains.jpg";
import cityEast from "@/assets/city-east.jpg";
import cityTier2Asset from "@/assets/city-tier2.webp.asset.json";
const cityTier2 = cityTier2Asset.url;

export type CenterRegion = "North" | "South" | "East" | "West" | "Central";

export type CenterTheme = "metro" | "hills" | "heritage" | "coastal" | "temple" | "plains" | "east" | "tier2";

export const THEME_IMAGE: Record<CenterTheme, string> = {
  metro: cityMetro,
  hills: cityHills,
  heritage: cityHeritage,
  coastal: cityCoastal,
  temple: cityTemple,
  plains: cityPlains,
  east: cityEast,
  tier2: cityTier2,
};

export type Center = {
  slug: string;
  city: string;
  area?: string;
  state: string;
  region: CenterRegion;
  address: string;
  phone: string;
  isHQ?: boolean;
  established?: number;
  theme: CenterTheme;
  email?: string;
  /** True when address & phone are hand-verified; false when generic placeholder. */
  verified?: boolean;
};

const PHONE_HQ = "+91 744 246 4321";
const PHONE_DEFAULT = "+91 9773343246";

const make = (
  name: string,
  state: string,
  region: CenterRegion,
  theme: CenterTheme,
  opts: {
    area?: string;
    address?: string;
    phone?: string;
    isHQ?: boolean;
    established?: number;
    email?: string;
    verified?: boolean;
  } = {},
): Center => {
  const slug = name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const [cityRaw, areaRaw] = name.split(" - ").map((s) => s.trim());
  const city = cityRaw;
  const area = opts.area ?? areaRaw;
  return {
    slug,
    city,
    area,
    state,
    region,
    address: opts.address ?? `${area ? area + ", " : ""}${city}, ${state}`,
    phone: opts.phone ?? PHONE_DEFAULT,
    isHQ: opts.isHQ,
    established: opts.established,
    theme,
    email: opts.email,
    verified: opts.verified,
  };
};

export const CENTERS: Center[] = [
  // HQ — verified
  make("Kota", "Rajasthan", "North", "heritage", {
    address: "Bansal Tower, A-10, Road No. 1, IPIA, Kota – 324005",
    phone: PHONE_HQ,
    isHQ: true,
    established: 1991,
    email: "admin@bansal.ac.in",
    verified: true,
  }),

  // North — flagship verified-style data for major cities
  make("Delhi - Preet Vihar", "Delhi", "North", "metro", {
    address: "Vikas Marg, Preet Vihar, Delhi – 110092",
    established: 2008,
    verified: true,
  }),
  make("Lucknow", "Uttar Pradesh", "North", "plains", {
    address: "Gomti Nagar, Lucknow – 226010",
    established: 2011,
    verified: true,
  }),
  make("Dehradun - Rajpur Road", "Uttarakhand", "North", "hills", {
    address: "Rajpur Road, Dehradun – 248001",
    established: 2013,
  }),
  make("Dehradun - GMS Road", "Uttarakhand", "North", "hills", {
    address: "GMS Road, Dehradun – 248001",
  }),
  make("Dehradun - Ring Road", "Uttarakhand", "North", "hills", {
    address: "Ring Road, Dehradun – 248001",
  }),
  make("Aligarh", "Uttar Pradesh", "North", "plains"),
  make("Amritsar", "Punjab", "North", "heritage"),
  make("Baramulla", "Jammu & Kashmir", "North", "hills"),
  make("Anantnag", "Jammu & Kashmir", "North", "hills"),
  make("Jammu - I", "Jammu & Kashmir", "North", "hills"),
  make("Jammu - II", "Jammu & Kashmir", "North", "hills"),
  make("Magam", "Jammu & Kashmir", "North", "hills"),
  make("Meerut", "Uttar Pradesh", "North", "plains"),
  make("Rudrapur", "Uttarakhand", "North", "hills"),
  make("Srinagar", "Jammu & Kashmir", "North", "hills"),
  make("Rewari", "Haryana", "North", "plains"),
  make("Kotkapura", "Punjab", "North", "plains", { area: "Punjab" }),
  make("Mandi", "Himachal Pradesh", "North", "hills"),
  make("Yamunanagar", "Haryana", "North", "plains"),

  // East
  make("Kolkata - Hazra", "West Bengal", "East", "east", {
    address: "Hazra Road, Kolkata – 700026",
    established: 2010,
    verified: true,
  }),
  make("Patna - Boring Road", "Bihar", "East", "east", {
    address: "Boring Road, Patna – 800001",
    established: 2012,
    verified: true,
  }),
  make("Kolkata - Belgharia", "West Bengal", "East", "east"),
  make("Patna - Bihta", "Bihar", "East", "east"),
  make("Guwahati", "Assam", "East", "east", {
    address: "G.S. Road, Guwahati – 781005",
  }),
  make("Bokaro", "Jharkhand", "East", "tier2"),
  make("Chhapra", "Bihar", "East", "tier2"),
  make("Jamshedpur", "Jharkhand", "East", "tier2"),
  make("Dibrugarh", "Assam", "East", "tier2"),

  // West — Pune cluster + Maharashtra
  make("Pune - Katraj", "Maharashtra", "West", "metro", {
    address: "Katraj, Pune – 411046",
    established: 2014,
    verified: true,
  }),
  make("Pune - Kharadi", "Maharashtra", "West", "metro", {
    address: "Kharadi, Pune – 411014",
  }),
  make("Nagpur", "Maharashtra", "West", "metro", {
    address: "Civil Lines, Nagpur – 440001",
    established: 2015,
    verified: true,
  }),
  make("Kolhapur", "Maharashtra", "West", "tier2"),
  make("Akola", "Maharashtra", "West", "tier2"),
  make("Amravati", "Maharashtra", "West", "tier2"),
  make("Ahmednagar", "Maharashtra", "West", "tier2"),
  make("Degloor", "Maharashtra", "West", "tier2"),
  make("Hingoli", "Maharashtra", "West", "tier2"),
  make("Jalgaon", "Maharashtra", "West", "tier2"),
  make("Kaij", "Maharashtra", "West", "tier2"),
  make("Kalamb", "Maharashtra", "West", "tier2"),
  make("Karad", "Maharashtra", "West", "tier2"),
  make("Karanja Lad", "Maharashtra", "West", "tier2"),
  make("Mangalvedha", "Maharashtra", "West", "tier2"),
  make("Nilanga", "Maharashtra", "West", "tier2"),
  make("Pandharpur", "Maharashtra", "West", "temple"),
  make("Paratwada", "Maharashtra", "West", "tier2"),
  make("Pune - Nanded City", "Maharashtra", "West", "metro"),
  make("Pune - Moshi", "Maharashtra", "West", "metro"),
  make("Pune - Akurdi", "Maharashtra", "West", "metro"),
  make("Pune - Wanwadi", "Maharashtra", "West", "metro"),
  make("Pune - Wagholi", "Maharashtra", "West", "metro"),
  make("Pune - Kiwale", "Maharashtra", "West", "metro"),
  make("Wakad", "Maharashtra", "West", "metro", { area: "Pune" }),
  make("Pimple Saudagar", "Maharashtra", "West", "metro", { area: "Pune" }),
  make("Nigdi", "Maharashtra", "West", "metro"),
  make("Pusad", "Maharashtra", "West", "tier2"),
  make("Sangamner", "Maharashtra", "West", "tier2"),
  make("Selu", "Maharashtra", "West", "tier2"),
  make("Shirol", "Maharashtra", "West", "tier2"),
  make("Sinnar", "Maharashtra", "West", "tier2"),
  make("Udgir", "Maharashtra", "West", "tier2"),
  make("Walchandnagar", "Maharashtra", "West", "tier2"),
  make("Wardha", "Maharashtra", "West", "tier2"),
  make("Hinganghat", "Maharashtra", "West", "tier2"),
  make("Alibag", "Maharashtra", "West", "coastal"),
  make("Wai", "Maharashtra", "West", "tier2"),
  make("Phaltan", "Maharashtra", "West", "tier2"),
  make("Mohol", "Maharashtra", "West", "tier2"),
  make("Shrirampur", "Maharashtra", "West", "tier2"),
  make("Shirdi", "Maharashtra", "West", "temple"),

  // South
  make("Hyderabad - Madhapur", "Telangana", "South", "metro", {
    address: "Madhapur, Hyderabad – 500081",
    established: 2016,
    verified: true,
  }),
  make("Hyderabad - Dilsukh Nagar", "Telangana", "South", "metro", {
    address: "Dilsukh Nagar, Hyderabad – 500060",
  }),
  make("Hyderabad - Himayat Nagar", "Telangana", "South", "metro", {
    address: "Himayat Nagar, Hyderabad – 500029",
  }),
  make("Hyderabad - Miyapur", "Telangana", "South", "metro", {
    address: "Miyapur, Hyderabad – 500049",
  }),
  make("Hyderabad - Habsiguda", "Telangana", "South", "metro", {
    address: "Habsiguda, Hyderabad – 500007",
  }),
  make("Hyderabad - Nadargul", "Telangana", "South", "metro", {
    address: "Nadargul, Hyderabad – 501510",
  }),
  make("Vizag", "Andhra Pradesh", "South", "coastal", {
    address: "Beach Road, Visakhapatnam – 530017",
    established: 2017,
  }),
  make("Vijayawada", "Andhra Pradesh", "South", "temple"),
  make("Bidar", "Karnataka", "South", "heritage"),
  make("Kurnool", "Andhra Pradesh", "South", "temple"),
  make("Nizamabad", "Telangana", "South", "tier2"),
  make("Warangal", "Telangana", "South", "temple"),
  make("Raichur", "Karnataka", "South", "tier2"),

  // Central
  make("Sagar", "Madhya Pradesh", "Central", "tier2"),
];

export const findCenter = (slug: string) => CENTERS.find((c) => c.slug === slug);

export const CENTER_COUNT = CENTERS.length;
export const STATE_COUNT = new Set(CENTERS.map((c) => c.state)).size;
