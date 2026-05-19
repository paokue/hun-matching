import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seed() {
  console.log("Connected to MongoDB via Prisma");

  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || "Admin@123456", 12);
  const testPassword = await bcrypt.hash("Test1234!", 12);

  // Admin account (separate Admin collection — only username + password)
  await prisma.admin.upsert({
    where: { username: "admin" },
    update: { password: adminPassword },
    create: { username: "admin", password: adminPassword },
  });
  console.log("✅ Admin — username: admin | password: Admin@123456");

  // Sample applicant (dev testing)
  await prisma.user.upsert({
    where: { profileId: "Anna001" },
    update: { password: testPassword },
    create: {
      profileId: "Anna001",
      phone: "0201234567",
      password: testPassword,
      fullName: "Anna Phongsavanh",
      dateOfBirth: new Date("2000-03-15"),
      age: 25,
      height: 162,
      weight: 52,
      occupation: "Student",
      maritalStatus: "Single",
      tattooStatus: "No Tattoo",
      ethnicity: "Lao",
      religion: "Buddhism",
      currentAddress: "Vientiane, Laos",
      status: "active",
      isProfileComplete: true,
    },
  });
  console.log("✅ Applicant — profileId: Anna001 | phone: 0201234567 | password: Test1234!");

  // Sample agency (dev testing)
  await prisma.agency.upsert({
    where: { agencyId: "TestAgency001" },
    update: { password: testPassword },
    create: {
      agencyId: "TestAgency001",
      companyName: "Test Agency Co.",
      email: "agency@test.com",
      password: testPassword,
      role: "agency",
      status: "active",
      isVerified: true,
    },
  });
  console.log("✅ Agency — email: agency@test.com | password: Test1234!");

  // Membership packages
  const packages = [
    { name: "Basic Plan", description: "Get started with profile browsing", price: 49, durationDays: 30, features: ["Access to 50 profiles", "Full contact information", "Document downloads", "Basic search filters"] },
    { name: "Standard Plan", description: "Best for growing agencies", price: 99, durationDays: 60, features: ["Access to 200 profiles", "Full contact information", "Document downloads", "Advanced search filters", "Candidate selection (4 months)"] },
    { name: "Premium Plan", description: "Full access for established agencies", price: 199, durationDays: 90, features: ["Unlimited profile access", "Full contact information", "Document downloads", "Advanced search filters", "Priority candidate selection", "Dedicated support"] },
  ];

  for (const pkg of packages) {
    const existing = await prisma.membershipPackage.findFirst({ where: { name: pkg.name } });
    if (existing) await prisma.membershipPackage.update({ where: { id: existing.id }, data: pkg });
    else await prisma.membershipPackage.create({ data: pkg });
  }
  console.log("✅ Membership packages seeded");

  console.log(`
🎉 Seed complete!

Dev credentials:
  Admin     → username: admin               password: Admin@123456   (login: /admin/login)
  Applicant → phone:    0201234567          password: Test1234!      (login: /login)
  Agency    → email:    agency@test.com     password: Test1234!      (login: /agency/login)
`);
}

seed()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
