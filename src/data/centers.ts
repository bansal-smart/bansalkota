export type CenterRegion = "North" | "South" | "East" | "West" | "Central";

export type Center = {
  slug: string;
  city: string;
  area?: string;
  state: string;
  region: CenterRegion;
  address: string;
  phone: string;
  isHQ?: boolean;
};

const PHONE = "+91 9773343246";

const make = (
  name: string,
  state: string,
  region: CenterRegion,
  opts: { area?: string; address?: string; phone?: string; isHQ?: boolean } = {},
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
    phone: opts.phone ?? PHONE,
    isHQ: opts.isHQ,
  };
};

export const CENTERS: Center[] = [
  // HQ
  make("Kota", "Rajasthan", "North", {
    address: "Bansal Tower, A-10, Road No. 1, IPIA, Kota – 324005",
    isHQ: true,
  }),

  // North
  make("Aligarh", "Uttar Pradesh", "North"),
  make("Amritsar", "Punjab", "North"),
  make("Baramulla", "Jammu & Kashmir", "North"),
  make("Anantnag", "Jammu & Kashmir", "North"),
  make("Dehradun - Ring Road", "Uttarakhand", "North"),
  make("Dehradun - GMS Road", "Uttarakhand", "North"),
  make("Dehradun - Rajpur Road", "Uttarakhand", "North"),
  make("Delhi - Preet Vihar", "Delhi", "North"),
  make("Jammu - I", "Jammu & Kashmir", "North"),
  make("Jammu - II", "Jammu & Kashmir", "North"),
  make("Magam", "Jammu & Kashmir", "North"),
  make("Meerut", "Uttar Pradesh", "North"),
  make("Rudrapur", "Uttarakhand", "North"),
  make("Srinagar", "Jammu & Kashmir", "North"),
  make("Rewari", "Haryana", "North"),
  make("Kotkapura", "Punjab", "North", { area: "Punjab" }),
  make("Mandi", "Himachal Pradesh", "North"),
  make("Yamunanagar", "Haryana", "North"),
  make("Lucknow", "Uttar Pradesh", "North"),

  // East
  make("Bokaro", "Jharkhand", "East"),
  make("Chhapra", "Bihar", "East"),
  make("Guwahati", "Assam", "East"),
  make("Jamshedpur", "Jharkhand", "East"),
  make("Kolkata - Belgharia", "West Bengal", "East"),
  make("Kolkata - Hazra", "West Bengal", "East"),
  make("Patna - Bihta", "Bihar", "East"),
  make("Patna - Boring Road", "Bihar", "East"),
  make("Dibrugarh", "Assam", "East"),

  // West (mostly Maharashtra)
  make("Akola", "Maharashtra", "West"),
  make("Amravati", "Maharashtra", "West"),
  make("Ahmednagar", "Maharashtra", "West"),
  make("Degloor", "Maharashtra", "West"),
  make("Hingoli", "Maharashtra", "West"),
  make("Jalgaon", "Maharashtra", "West"),
  make("Kaij", "Maharashtra", "West"),
  make("Kalamb", "Maharashtra", "West"),
  make("Karad", "Maharashtra", "West"),
  make("Karanja Lad", "Maharashtra", "West"),
  make("Kolhapur", "Maharashtra", "West"),
  make("Mangalvedha", "Maharashtra", "West"),
  make("Nagpur", "Maharashtra", "West"),
  make("Nilanga", "Maharashtra", "West"),
  make("Pandharpur", "Maharashtra", "West"),
  make("Paratwada", "Maharashtra", "West"),
  make("Pune - Katraj", "Maharashtra", "West"),
  make("Pune - Kharadi", "Maharashtra", "West"),
  make("Pune - Nanded City", "Maharashtra", "West"),
  make("Pune - Moshi", "Maharashtra", "West"),
  make("Pune - Akurdi", "Maharashtra", "West"),
  make("Pune - Wanwadi", "Maharashtra", "West"),
  make("Pune - Wagholi", "Maharashtra", "West"),
  make("Pune - Kiwale", "Maharashtra", "West"),
  make("Wakad", "Maharashtra", "West", { area: "Pune" }),
  make("Pimple Saudagar", "Maharashtra", "West", { area: "Pune" }),
  make("Nigdi", "Maharashtra", "West"),
  make("Pusad", "Maharashtra", "West"),
  make("Sangamner", "Maharashtra", "West"),
  make("Selu", "Maharashtra", "West"),
  make("Shirol", "Maharashtra", "West"),
  make("Sinnar", "Maharashtra", "West"),
  make("Udgir", "Maharashtra", "West"),
  make("Walchandnagar", "Maharashtra", "West"),
  make("Wardha", "Maharashtra", "West"),
  make("Hinganghat", "Maharashtra", "West"),
  make("Alibag", "Maharashtra", "West"),
  make("Wai", "Maharashtra", "West"),
  make("Phaltan", "Maharashtra", "West"),
  make("Mohol", "Maharashtra", "West"),
  make("Shrirampur", "Maharashtra", "West"),
  make("Shirdi", "Maharashtra", "West"),

  // South
  make("Bidar", "Karnataka", "South"),
  make("Hyderabad - Dilsukh Nagar", "Telangana", "South"),
  make("Hyderabad - Himayat Nagar", "Telangana", "South"),
  make("Hyderabad - Madhapur", "Telangana", "South"),
  make("Hyderabad - Miyapur", "Telangana", "South"),
  make("Hyderabad - Habsiguda", "Telangana", "South"),
  make("Hyderabad - Nadargul", "Telangana", "South"),
  make("Kurnool", "Andhra Pradesh", "South"),
  make("Nizamabad", "Telangana", "South"),
  make("Vijayawada", "Andhra Pradesh", "South"),
  make("Vizag", "Andhra Pradesh", "South"),
  make("Warangal", "Telangana", "South"),
  make("Raichur", "Karnataka", "South"),

  // Central
  make("Sagar", "Madhya Pradesh", "Central"),
];

export const findCenter = (slug: string) =>
  CENTERS.find((c) => c.slug === slug);
