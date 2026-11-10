/**
 * Removes demo business data while keeping roles, settings, subsidy rules
 * and the owner account. Run: npm run db:clean
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning demo business data…");
  await prisma.salaryPayment.deleteMany();
  await prisma.salary.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.customerDocument.deleteMany();
  await prisma.applicationHistory.deleteMany();
  await prisma.subsidyCalculation.deleteMany();
  await prisma.installation.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.loginHistory.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.user.deleteMany({ where: { email: { not: "admin@ushaenterprises.in" } } });
  await prisma.counter.deleteMany();
  console.log("Done. Owner account and configuration retained.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
