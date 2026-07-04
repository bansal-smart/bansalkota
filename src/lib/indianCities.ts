export type CityEntry = { city: string; state: string };

// State names match the STATES dropdown lists used across profile/registration
// forms exactly (e.g. "Jammu and Kashmir", not "Jammu & Kashmir").
export const INDIAN_CITIES: CityEntry[] = [
  // Andhra Pradesh
  { city: "Visakhapatnam", state: "Andhra Pradesh" },
  { city: "Vijayawada", state: "Andhra Pradesh" },
  { city: "Guntur", state: "Andhra Pradesh" },
  { city: "Nellore", state: "Andhra Pradesh" },
  { city: "Kurnool", state: "Andhra Pradesh" },
  { city: "Kadapa", state: "Andhra Pradesh" },
  { city: "Tirupati", state: "Andhra Pradesh" },
  { city: "Rajahmundry", state: "Andhra Pradesh" },
  { city: "Kakinada", state: "Andhra Pradesh" },
  { city: "Anantapur", state: "Andhra Pradesh" },
  { city: "Vizianagaram", state: "Andhra Pradesh" },
  { city: "Eluru", state: "Andhra Pradesh" },
  { city: "Chittoor", state: "Andhra Pradesh" },
  { city: "Ongole", state: "Andhra Pradesh" },
  // Arunachal Pradesh
  { city: "Itanagar", state: "Arunachal Pradesh" },
  { city: "Naharlagun", state: "Arunachal Pradesh" },
  { city: "Pasighat", state: "Arunachal Pradesh" },
  { city: "Tawang", state: "Arunachal Pradesh" },
  // Assam
  { city: "Guwahati", state: "Assam" },
  { city: "Dibrugarh", state: "Assam" },
  { city: "Silchar", state: "Assam" },
  { city: "Jorhat", state: "Assam" },
  { city: "Nagaon", state: "Assam" },
  { city: "Tinsukia", state: "Assam" },
  { city: "Tezpur", state: "Assam" },
  { city: "Bongaigaon", state: "Assam" },
  // Bihar
  { city: "Patna", state: "Bihar" },
  { city: "Gaya", state: "Bihar" },
  { city: "Bhagalpur", state: "Bihar" },
  { city: "Muzaffarpur", state: "Bihar" },
  { city: "Darbhanga", state: "Bihar" },
  { city: "Chhapra", state: "Bihar" },
  { city: "Purnia", state: "Bihar" },
  { city: "Arrah", state: "Bihar" },
  { city: "Begusarai", state: "Bihar" },
  { city: "Katihar", state: "Bihar" },
  { city: "Munger", state: "Bihar" },
  // Chhattisgarh
  { city: "Raipur", state: "Chhattisgarh" },
  { city: "Bhilai", state: "Chhattisgarh" },
  { city: "Bilaspur", state: "Chhattisgarh" },
  { city: "Korba", state: "Chhattisgarh" },
  { city: "Durg", state: "Chhattisgarh" },
  { city: "Rajnandgaon", state: "Chhattisgarh" },
  { city: "Jagdalpur", state: "Chhattisgarh" },
  // Delhi
  { city: "Delhi", state: "Delhi" },
  { city: "New Delhi", state: "Delhi" },
  { city: "Dwarka", state: "Delhi" },
  { city: "Rohini", state: "Delhi" },
  // Goa
  { city: "Panaji", state: "Goa" },
  { city: "Margao", state: "Goa" },
  { city: "Vasco da Gama", state: "Goa" },
  { city: "Mapusa", state: "Goa" },
  // Gujarat
  { city: "Ahmedabad", state: "Gujarat" },
  { city: "Surat", state: "Gujarat" },
  { city: "Vadodara", state: "Gujarat" },
  { city: "Rajkot", state: "Gujarat" },
  { city: "Bhavnagar", state: "Gujarat" },
  { city: "Jamnagar", state: "Gujarat" },
  { city: "Gandhinagar", state: "Gujarat" },
  { city: "Junagadh", state: "Gujarat" },
  { city: "Anand", state: "Gujarat" },
  { city: "Nadiad", state: "Gujarat" },
  { city: "Bharuch", state: "Gujarat" },
  // Haryana
  { city: "Gurugram", state: "Haryana" },
  { city: "Faridabad", state: "Haryana" },
  { city: "Panipat", state: "Haryana" },
  { city: "Ambala", state: "Haryana" },
  { city: "Karnal", state: "Haryana" },
  { city: "Hisar", state: "Haryana" },
  { city: "Rohtak", state: "Haryana" },
  { city: "Rewari", state: "Haryana" },
  { city: "Yamunanagar", state: "Haryana" },
  { city: "Sonipat", state: "Haryana" },
  { city: "Sirsa", state: "Haryana" },
  // Himachal Pradesh
  { city: "Shimla", state: "Himachal Pradesh" },
  { city: "Manali", state: "Himachal Pradesh" },
  { city: "Dharamshala", state: "Himachal Pradesh" },
  { city: "Solan", state: "Himachal Pradesh" },
  { city: "Mandi", state: "Himachal Pradesh" },
  { city: "Kullu", state: "Himachal Pradesh" },
  { city: "Una", state: "Himachal Pradesh" },
  // Jharkhand
  { city: "Ranchi", state: "Jharkhand" },
  { city: "Jamshedpur", state: "Jharkhand" },
  { city: "Dhanbad", state: "Jharkhand" },
  { city: "Bokaro", state: "Jharkhand" },
  { city: "Deoghar", state: "Jharkhand" },
  { city: "Hazaribagh", state: "Jharkhand" },
  // Karnataka
  { city: "Bengaluru", state: "Karnataka" },
  { city: "Mysuru", state: "Karnataka" },
  { city: "Hubballi", state: "Karnataka" },
  { city: "Mangaluru", state: "Karnataka" },
  { city: "Belagavi", state: "Karnataka" },
  { city: "Kalaburagi", state: "Karnataka" },
  { city: "Davanagere", state: "Karnataka" },
  { city: "Bellary", state: "Karnataka" },
  { city: "Bidar", state: "Karnataka" },
  { city: "Shivamogga", state: "Karnataka" },
  { city: "Tumakuru", state: "Karnataka" },
  { city: "Udupi", state: "Karnataka" },
  { city: "Hospet", state: "Karnataka" },
  // Kerala
  { city: "Kochi", state: "Kerala" },
  { city: "Thiruvananthapuram", state: "Kerala" },
  { city: "Kozhikode", state: "Kerala" },
  { city: "Kollam", state: "Kerala" },
  { city: "Thrissur", state: "Kerala" },
  { city: "Kannur", state: "Kerala" },
  { city: "Kottayam", state: "Kerala" },
  { city: "Kasaragod", state: "Kerala" },
  { city: "Alappuzha", state: "Kerala" },
  { city: "Palakkad", state: "Kerala" },
  { city: "Malappuram", state: "Kerala" },
  // Madhya Pradesh
  { city: "Bhopal", state: "Madhya Pradesh" },
  { city: "Indore", state: "Madhya Pradesh" },
  { city: "Gwalior", state: "Madhya Pradesh" },
  { city: "Jabalpur", state: "Madhya Pradesh" },
  { city: "Ujjain", state: "Madhya Pradesh" },
  { city: "Sagar", state: "Madhya Pradesh" },
  { city: "Satna", state: "Madhya Pradesh" },
  { city: "Ratlam", state: "Madhya Pradesh" },
  { city: "Rewa", state: "Madhya Pradesh" },
  { city: "Dewas", state: "Madhya Pradesh" },
  // Maharashtra
  { city: "Mumbai", state: "Maharashtra" },
  { city: "Pune", state: "Maharashtra" },
  { city: "Nagpur", state: "Maharashtra" },
  { city: "Nashik", state: "Maharashtra" },
  { city: "Aurangabad", state: "Maharashtra" },
  { city: "Solapur", state: "Maharashtra" },
  { city: "Kolhapur", state: "Maharashtra" },
  { city: "Akola", state: "Maharashtra" },
  { city: "Amravati", state: "Maharashtra" },
  { city: "Alibag", state: "Maharashtra" },
  { city: "Jalgaon", state: "Maharashtra" },
  { city: "Nanded", state: "Maharashtra" },
  { city: "Sangli", state: "Maharashtra" },
  { city: "Satara", state: "Maharashtra" },
  { city: "Latur", state: "Maharashtra" },
  { city: "Ahmednagar", state: "Maharashtra" },
  { city: "Wardha", state: "Maharashtra" },
  { city: "Karad", state: "Maharashtra" },
  { city: "Hinganghat", state: "Maharashtra" },
  { city: "Hingoli", state: "Maharashtra" },
  { city: "Degloor", state: "Maharashtra" },
  { city: "Udgir", state: "Maharashtra" },
  { city: "Pandharpur", state: "Maharashtra" },
  { city: "Phaltan", state: "Maharashtra" },
  { city: "Shirdi", state: "Maharashtra" },
  { city: "Shrirampur", state: "Maharashtra" },
  { city: "Paratwada", state: "Maharashtra" },
  { city: "Wai", state: "Maharashtra" },
  { city: "Wakad", state: "Maharashtra" },
  { city: "Nigdi", state: "Maharashtra" },
  { city: "Pimple Saudagar", state: "Maharashtra" },
  { city: "Walchandnagar", state: "Maharashtra" },
  { city: "Mangalvedha", state: "Maharashtra" },
  { city: "Mohol", state: "Maharashtra" },
  { city: "Kaij", state: "Maharashtra" },
  { city: "Kalamb", state: "Maharashtra" },
  { city: "Karanja Lad", state: "Maharashtra" },
  { city: "Selu", state: "Maharashtra" },
  // Manipur
  { city: "Imphal", state: "Manipur" },
  { city: "Thoubal", state: "Manipur" },
  // Meghalaya
  { city: "Shillong", state: "Meghalaya" },
  { city: "Tura", state: "Meghalaya" },
  // Mizoram
  { city: "Aizawl", state: "Mizoram" },
  { city: "Lunglei", state: "Mizoram" },
  // Nagaland
  { city: "Kohima", state: "Nagaland" },
  { city: "Dimapur", state: "Nagaland" },
  // Odisha
  { city: "Bhubaneswar", state: "Odisha" },
  { city: "Cuttack", state: "Odisha" },
  { city: "Rourkela", state: "Odisha" },
  { city: "Berhampur", state: "Odisha" },
  { city: "Sambalpur", state: "Odisha" },
  { city: "Puri", state: "Odisha" },
  { city: "Balasore", state: "Odisha" },
  // Punjab
  { city: "Ludhiana", state: "Punjab" },
  { city: "Amritsar", state: "Punjab" },
  { city: "Jalandhar", state: "Punjab" },
  { city: "Patiala", state: "Punjab" },
  { city: "Bathinda", state: "Punjab" },
  { city: "Mohali", state: "Punjab" },
  { city: "Kotkapura", state: "Punjab" },
  { city: "Hoshiarpur", state: "Punjab" },
  { city: "Moga", state: "Punjab" },
  { city: "Firozpur", state: "Punjab" },
  // Rajasthan
  { city: "Jaipur", state: "Rajasthan" },
  { city: "Jodhpur", state: "Rajasthan" },
  { city: "Kota", state: "Rajasthan" },
  { city: "Udaipur", state: "Rajasthan" },
  { city: "Ajmer", state: "Rajasthan" },
  { city: "Bikaner", state: "Rajasthan" },
  { city: "Bhilwara", state: "Rajasthan" },
  { city: "Alwar", state: "Rajasthan" },
  { city: "Sikar", state: "Rajasthan" },
  { city: "Bharatpur", state: "Rajasthan" },
  { city: "Pali", state: "Rajasthan" },
  { city: "Sri Ganganagar", state: "Rajasthan" },
  // Sikkim
  { city: "Gangtok", state: "Sikkim" },
  { city: "Namchi", state: "Sikkim" },
  // Tamil Nadu
  { city: "Chennai", state: "Tamil Nadu" },
  { city: "Coimbatore", state: "Tamil Nadu" },
  { city: "Madurai", state: "Tamil Nadu" },
  { city: "Tiruchirappalli", state: "Tamil Nadu" },
  { city: "Salem", state: "Tamil Nadu" },
  { city: "Tirunelveli", state: "Tamil Nadu" },
  { city: "Erode", state: "Tamil Nadu" },
  { city: "Vellore", state: "Tamil Nadu" },
  { city: "Thoothukudi", state: "Tamil Nadu" },
  { city: "Kodaikanal", state: "Tamil Nadu" },
  { city: "Kanchipuram", state: "Tamil Nadu" },
  { city: "Kumbakonam", state: "Tamil Nadu" },
  // Telangana
  { city: "Hyderabad", state: "Telangana" },
  { city: "Warangal", state: "Telangana" },
  { city: "Nizamabad", state: "Telangana" },
  { city: "Karimnagar", state: "Telangana" },
  { city: "Khammam", state: "Telangana" },
  { city: "Ramagundam", state: "Telangana" },
  { city: "Kothagudem", state: "Telangana" },
  // Tripura
  { city: "Agartala", state: "Tripura" },
  // Uttar Pradesh
  { city: "Lucknow", state: "Uttar Pradesh" },
  { city: "Kanpur", state: "Uttar Pradesh" },
  { city: "Ghaziabad", state: "Uttar Pradesh" },
  { city: "Agra", state: "Uttar Pradesh" },
  { city: "Varanasi", state: "Uttar Pradesh" },
  { city: "Meerut", state: "Uttar Pradesh" },
  { city: "Prayagraj", state: "Uttar Pradesh" },
  { city: "Bareilly", state: "Uttar Pradesh" },
  { city: "Aligarh", state: "Uttar Pradesh" },
  { city: "Moradabad", state: "Uttar Pradesh" },
  { city: "Noida", state: "Uttar Pradesh" },
  { city: "Gorakhpur", state: "Uttar Pradesh" },
  { city: "Jhansi", state: "Uttar Pradesh" },
  { city: "Mathura", state: "Uttar Pradesh" },
  // Uttarakhand
  { city: "Dehradun", state: "Uttarakhand" },
  { city: "Haridwar", state: "Uttarakhand" },
  { city: "Rudrapur", state: "Uttarakhand" },
  { city: "Roorkee", state: "Uttarakhand" },
  { city: "Haldwani", state: "Uttarakhand" },
  { city: "Kotdwar", state: "Uttarakhand" },
  { city: "Nainital", state: "Uttarakhand" },
  // West Bengal
  { city: "Kolkata", state: "West Bengal" },
  { city: "Howrah", state: "West Bengal" },
  { city: "Durgapur", state: "West Bengal" },
  { city: "Asansol", state: "West Bengal" },
  { city: "Siliguri", state: "West Bengal" },
  { city: "Kharagpur", state: "West Bengal" },
  { city: "Kalyani", state: "West Bengal" },
  { city: "Kolaghat", state: "West Bengal" },
  // Andaman and Nicobar Islands
  { city: "Port Blair", state: "Andaman and Nicobar Islands" },
  // Chandigarh
  { city: "Chandigarh", state: "Chandigarh" },
  // Dadra and Nagar Haveli and Daman and Diu
  { city: "Daman", state: "Dadra and Nagar Haveli and Daman and Diu" },
  { city: "Silvassa", state: "Dadra and Nagar Haveli and Daman and Diu" },
  // Jammu and Kashmir
  { city: "Srinagar", state: "Jammu and Kashmir" },
  { city: "Jammu", state: "Jammu and Kashmir" },
  { city: "Anantnag", state: "Jammu and Kashmir" },
  { city: "Baramulla", state: "Jammu and Kashmir" },
  { city: "Magam", state: "Jammu and Kashmir" },
  // Ladakh
  { city: "Leh", state: "Ladakh" },
  { city: "Kargil", state: "Ladakh" },
  // Lakshadweep
  { city: "Kavaratti", state: "Lakshadweep" },
  // Puducherry
  { city: "Puducherry", state: "Puducherry" },
  { city: "Karaikal", state: "Puducherry" },
];

/**
 * Case-insensitive city search: prefix matches rank above substring matches.
 */
export function searchCities(query: string, limit = 12): CityEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const starts: CityEntry[] = [];
  const contains: CityEntry[] = [];
  const seen = new Set<string>();

  for (const entry of INDIAN_CITIES) {
    const key = `${entry.city}|${entry.state}`;
    if (seen.has(key)) continue;
    const cityLower = entry.city.toLowerCase();
    if (cityLower.startsWith(q)) {
      starts.push(entry);
      seen.add(key);
    } else if (cityLower.includes(q)) {
      contains.push(entry);
      seen.add(key);
    }
  }

  starts.sort((a, b) => a.city.localeCompare(b.city));
  contains.sort((a, b) => a.city.localeCompare(b.city));

  return [...starts, ...contains].slice(0, limit);
}
