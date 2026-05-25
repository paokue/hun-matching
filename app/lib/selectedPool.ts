// Demo "selected applicants" data, shared by the agency dashboard and the
// full-page detail view. Swap for real DB selections when wired up.
export type SelectedProfile = {
  id: string;
  profileId: string;
  photo: string;
  firstName: string;
  lastName: string;
  name: string;
  dateOfBirth: string;
  age: number;
  height: number;
  weight: number;
  education: string;
  occupation: string;
  familyMembers: number;
  maritalStatus: string;
  tattooStatus: string;
  ethnicity: string;
  religion: string;
  birthProvince: string;
  birthDistrict: string;
  birthVillage: string;
  currentProvince: string;
  currentDistrict: string;
  currentVillage: string;
  phone: string;
  secondaryPhone: string;
  facebookUrl: string;
  tiktokUrl: string;
  expiresAt: string;
};

export const SELECTED_POOL: SelectedProfile[] = [
  {
    id: "s1", profileId: "HM-NAL22", photo: "https://i.pravatar.cc/600?img=5",
    firstName: "Nalina", lastName: "Phommachanh", name: "Nalina Phommachanh",
    dateOfBirth: "2003-04-12", age: 22, height: 160, weight: 48,
    education: "Bachelor's Degree", occupation: "Student", familyMembers: 5,
    maritalStatus: "Single", tattooStatus: "No Tattoo", ethnicity: "Lao", religion: "Buddhism",
    birthProvince: "Vientiane Capital", birthDistrict: "Chanthabouly", birthVillage: "Ban Sithan Neua",
    currentProvince: "Vientiane Capital", currentDistrict: "Sisattanak", currentVillage: "Ban Phonsinuan",
    phone: "+856 20 5512 3456", secondaryPhone: "+856 21 215 678",
    facebookUrl: "https://facebook.com/nalina.p", tiktokUrl: "https://tiktok.com/@nalina",
    expiresAt: "2026-09-24",
  },
  {
    id: "s2", profileId: "HM-SOM23", photo: "https://i.pravatar.cc/600?img=9",
    firstName: "Somaly", lastName: "Vongsay", name: "Somaly Vongsay",
    dateOfBirth: "2002-08-30", age: 23, height: 158, weight: 50,
    education: "High School (Grade 8–12)", occupation: "Employee", familyMembers: 4,
    maritalStatus: "Single", tattooStatus: "No Tattoo", ethnicity: "Hmong", religion: "Christianity",
    birthProvince: "Luang Prabang", birthDistrict: "Luang Prabang", birthVillage: "Ban Phonheuang",
    currentProvince: "Luang Prabang", currentDistrict: "Luang Prabang", currentVillage: "Ban Naviengkham",
    phone: "+856 20 5598 7654", secondaryPhone: "",
    facebookUrl: "https://facebook.com/somaly.v", tiktokUrl: "",
    expiresAt: "2026-09-24",
  },
  {
    id: "s3", profileId: "HM-CHA25", photo: "https://i.pravatar.cc/600?img=16",
    firstName: "Chansone", lastName: "Inthavong", name: "Chansone Inthavong",
    dateOfBirth: "2000-11-05", age: 25, height: 165, weight: 53,
    education: "Bachelor's Degree", occupation: "Business Owner", familyMembers: 6,
    maritalStatus: "Single", tattooStatus: "Has Tattoo", ethnicity: "Lao", religion: "Buddhism",
    birthProvince: "Savannakhet", birthDistrict: "Kaysone Phomvihane", birthVillage: "Ban Thakhamlian",
    currentProvince: "Savannakhet", currentDistrict: "Kaysone Phomvihane", currentVillage: "Ban Lattanalangsy",
    phone: "+856 20 2233 4455", secondaryPhone: "+856 41 212 345",
    facebookUrl: "https://facebook.com/chansone.i", tiktokUrl: "https://tiktok.com/@chansone",
    expiresAt: "2026-09-24",
  },
  {
    id: "s4", profileId: "HM-PHO24", photo: "https://i.pravatar.cc/600?img=20",
    firstName: "Phonevanh", lastName: "Sengaloun", name: "Phonevanh Sengaloun",
    dateOfBirth: "2001-02-18", age: 24, height: 162, weight: 49,
    education: "Vocational Certificate", occupation: "Freelancer", familyMembers: 3,
    maritalStatus: "Previously Married", tattooStatus: "No Tattoo", ethnicity: "Khmu", religion: "Animism",
    birthProvince: "Champasak", birthDistrict: "Pakse", birthVillage: "Ban Phabat",
    currentProvince: "Champasak", currentDistrict: "Pakse", currentVillage: "Ban Thaluang",
    phone: "+856 20 7788 9900", secondaryPhone: "",
    facebookUrl: "", tiktokUrl: "https://tiktok.com/@phonevanh",
    expiresAt: "2026-09-24",
  },
  {
    id: "s5", profileId: "HM-EUN23", photo: "https://i.pravatar.cc/600?img=10",
    firstName: "Eunji", lastName: "Keobounphan", name: "Eunji Keobounphan",
    dateOfBirth: "2002-06-21", age: 23, height: 167, weight: 52,
    education: "Master's Degree", occupation: "Employee", familyMembers: 4,
    maritalStatus: "Single", tattooStatus: "No Tattoo", ethnicity: "Other", religion: "Christianity",
    birthProvince: "Vientiane Capital", birthDistrict: "Xaysetha", birthVillage: "Ban Phonpapao",
    currentProvince: "Vientiane Capital", currentDistrict: "Chanthabouly", currentVillage: "Ban Hatsady",
    phone: "+856 20 5544 3322", secondaryPhone: "+856 21 263 412",
    facebookUrl: "https://facebook.com/eunji.k", tiktokUrl: "https://tiktok.com/@eunji",
    expiresAt: "2026-09-24",
  },
  {
    id: "s6", profileId: "HM-ALI24", photo: "https://i.pravatar.cc/600?img=30",
    firstName: "Alicia", lastName: "Soukthavong", name: "Alicia Soukthavong",
    dateOfBirth: "2001-09-14", age: 24, height: 159, weight: 47,
    education: "Bachelor's Degree", occupation: "Student", familyMembers: 5,
    maritalStatus: "Single", tattooStatus: "Has Tattoo", ethnicity: "Lao", religion: "Buddhism",
    birthProvince: "Luang Prabang", birthDistrict: "Nan", birthVillage: "Ban Nayang",
    currentProvince: "Luang Prabang", currentDistrict: "Luang Prabang", currentVillage: "Ban Vatthat",
    phone: "+856 20 9911 2233", secondaryPhone: "",
    facebookUrl: "https://facebook.com/alicia.s", tiktokUrl: "",
    expiresAt: "2026-09-24",
  },
];
