# USHA ENTERPRISES — Solar ERP + CRM

A complete, production-oriented business management platform for **USHA ENTERPRISES**, Puranpur (Pilibhit), Uttar Pradesh. It covers the full residential rooftop-solar lifecycle: enquiry → customer → documents → government application → installation → subsidy → finance, plus staff, attendance, payroll, reporting and security.

The interface is bilingual-friendly (English with Hinglish guidance), uses **INR (₹)** and the **Asia/Kolkata** business day.

---

## 1. What is included

| Module | Highlights |
| --- | --- |
| Public website | Landing page, services, process, document checklist, enquiry form, privacy policy, subsidy calculator, bank/EMI calculator |
| Dashboard | KPIs, monthly revenue chart, pipeline, recent customers, pending work, notifications |
| Customers (CRM) | 12-stage application lifecycle, timestamped history, filters/search/pagination, assignment, archive, private documents |
| Documents | PDF/JPG/JPEG/PNG only, 5 MB limit, magic-byte validation, private storage, UUID filenames, masked Aadhaar/bank numbers, upload/access/download/verify audit trail, manual identity cross-check (no fake OCR) |
| Staff | Directory, profiles, hierarchy, photo upload, role-linked login, salary and targets |
| Attendance | Daily marker, monthly register, leave requests and approvals, auto-marking of approved leave |
| Payroll | Attendance-based automatic calculation, incentives/commission/overtime/advance, generate → approve → pay workflow, PDF salary slips, salary history, finance posting |
| Installations | Team, panels, inverter, inspection and net-meter tracking; automatic customer status progression |
| Finance | Income/expense ledger, categories, customer/staff links, P&L summary, protected salary postings |
| Subsidy | Admin-configurable schemes with effective dates, slabs, central/state rates, caps, eligibility, source links; public + internal calculators; saved calculations |
| Reports | Customer, staff, payroll, finance, attendance and installation reports with date/month/staff/village filters; **PDF + Excel** export |
| Settings | Company identity, users, role permissions, working days, overtime rate, notification contacts |
| Security | bcrypt (cost 12), JWT HttpOnly session cookie, middleware route protection, granular RBAC, row-level customer/staff scoping, audit logs, login history, rate limiting |
| UX | Responsive navy/solar-green UI, mobile sidebar, toasts, loading/empty/error states, 404/error pages, print-friendly documents |

---

## 2. Tech stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 3.4**
- **Prisma 6** ORM — SQLite for local development, PostgreSQL-ready schema
- **bcryptjs** password hashing, **jose** signed JWT session cookies
- **pdf-lib** PDF generation, **exceljs** Excel export
- **zod** validation, **lucide-react** icons
- Private file storage on the server filesystem (not public)

---

## 3. Quick start (local)

### Requirements

- Node.js **20 or newer**
- npm 10+
- Windows, macOS or Linux

### Install and seed

```bash
npm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
npm run setup               # prisma generate + db push + seed
npm run dev
```

Open **http://localhost:3000**.

The seed creates the owner account, all seven roles, company settings, the PM Surya Ghar subsidy rules and a clearly-marked demo dataset.

### Login credentials

| Role | Email | Password |
| --- | --- | --- |
| Super Admin (owner) | `admin@ushaenterprises.in` | `Admin@12345` |
| Manager | `rajesh@ushaenterprises.in` | `Staff@12345` |
| Area Manager | `anita@ushaenterprises.in` | `Staff@12345` |
| Team Leader | `sunil@ushaenterprises.in` | `Staff@12345` |
| Field Staff | `pooja@ushaenterprises.in` | `Staff@12345` |
| Field Staff | `vikas@ushaenterprises.in` | `Staff@12345` |
| Field Staff | `mohit@ushaenterprises.in` | `Staff@12345` |
| Accountant | `neha@ushaenterprises.in` | `Staff@12345` |

> **Change the owner password immediately after first login** from *My Profile → Change password*. The owner account is not forced to change it so that the first setup is not locked out; demo staff are prompted to change theirs.

### Forgot password

There is no password-reset email yet. Instead:

1. Staff clicks **Forgot password?** on `/login` and submits their registered email.
2. The request appears in **Settings → Users** for Super Admin / Admin users (and as a notification).
3. Admin verifies the person's identity, clicks **Set password**, and shares the temporary password offline.
4. The user signs in and is forced to change the temporary password.

The public endpoint always returns the same confirmation message, so it does not reveal whether an email is registered. Duplicate requests within 15 minutes are ignored, and every request/reset is written to the audit log.

---

## 4. Environment variables

Copy `.env.example` to `.env` and adjust:

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="replace-with-a-long-random-secret"
SESSION_MINUTES="480"
UPLOAD_DIR="./storage/uploads"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Generate a strong secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

- `AUTH_SECRET` signs session JWTs. Changing it logs everyone out.
- `SESSION_MINUTES` controls session lifetime (default 480 = 8 hours).
- `UPLOAD_DIR` must point to a **private, persistent** directory. Never expose it through the web server; files are served only by `/api/documents/[id]/file` after permission checks.
- `NEXT_PUBLIC_APP_URL` is used for absolute links in generated documents/notifications.

---

## 5. Useful scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Prisma generate + production build |
| `npm start` | Start the production server |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |
| `npm run setup` | Generate client, push schema, seed roles/settings/subsidy rules |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:push` | Push schema changes without migrations |
| `npm run db:seed` | Seed roles, owner, settings, subsidy rules and demo data |
| `npm run db:reset` | **Destructive:** reset schema and reseed everything |
| `npm run db:clean` | Remove demo business data, keep owner + roles + settings + subsidy rules |

`db:seed` respects `SEED_DEMO=false` and `SEED_ADMIN_PASSWORD`:

```bash
# Roles, owner and configuration only — no demo customers/staff
SEED_DEMO=false npm run db:seed
```

---

## 6. Roles and permissions

Permissions are stored per role in the database and can be edited in **Settings → Roles & permissions**. Super Admin always has every permission and cannot be modified.

| Permission | Super Admin | Admin | Manager | Area Manager | Team Leader | Field Staff | Accountant |
| --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Staff view / manage | ✓ | ✓ | view | view | view | — | view |
| Attendance view / manage | ✓ | ✓ | ✓ | ✓ | ✓ | — | view |
| Payroll view / manage / approve | ✓ | ✓ | view | view | — | — | ✓ |
| Customers view | ✓ | ✓ | ✓ | ✓ | ✓ | own/team | all |
| Customers create / edit | ✓ | ✓ | ✓ | ✓ | ✓ | own | — |
| Customers delete | ✓ | ✓ | ✓ | — | — | — | — |
| Documents verify | ✓ | ✓ | ✓ | ✓ | — | — | — |
| Installations view / manage | ✓ | ✓ | ✓ | ✓ | ✓ | view | — |
| Finance view / manage | ✓ | ✓ | view | — | — | — | ✓ |
| Subsidy view / manage | ✓ | ✓ | ✓ | view | view | view | — |
| Reports export | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Audit logs | ✓ | ✓ | ✓ | — | — | — | — |
| Settings / users / roles | ✓ | ✓ | — | — | — | — | — |

Row-level scoping is enforced server-side, not only in the UI:

- Field staff and team leaders see only customers assigned to them/their team.
- Staff without `payroll.view` can download **their own approved/paid** salary slip but not anyone else's.
- Aadhaar and bank account numbers are masked in lists and profiles.
- Every document upload, view, download, verification and deletion is written to the audit log.

---

## 7. Government subsidy configuration

**No government rate is hardcoded in the application logic.** The seeded PM Surya Ghar central slabs are data rows in the database:

- ₹30,000/kW for the first 2 kW
- ₹18,000 for the third kW
- ₹78,000 overall cap

The Uttar Pradesh (UPNEDA) state row is seeded as `UP-STATE-15K-CAP30K`:

- ₹15,000 per kW
- ₹30,000 maximum per customer
- applicable to Uttar Pradesh, any DISCOM, 0–100 kW slab
- source URL: <https://upneda.org.in>

Combined with the central PM Surya Ghar slabs, the verified result is:

| Capacity | Central | UP State | Total |
| --- | --- | --- | --- |
| 1 kW | ₹30,000 | ₹15,000 | ₹45,000 |
| 2 kW | ₹60,000 | ₹30,000 | ₹90,000 |
| 3 kW | ₹78,000 | ₹30,000 | ₹1,08,000 |
| 4 kW | ₹78,000 | ₹30,000 | ₹1,08,000 |
| 5 kW | ₹78,000 | ₹30,000 | ₹1,08,000 |

The maximum combined subsidy is therefore **₹1,08,000**. The calculators show the central and state amounts separately and then the total.

> These figures are seeded defaults. Government rates can change — always confirm the latest UPNEDA / PM Surya Ghar notification and update the scheme row, no code change is required.

Edit schemes in **Subsidy Schemes**:

- scheme code, name, state, DISCOM
- effective-from / effective-to dates
- capacity slab (min/max kW)
- central rate/kW, state rate/kW, maximum subsidy
- eligibility text, source URL, internal notes, active flag

The public and internal calculators use the same DB rules, so a rate change immediately affects new quotations. Every saved calculation stores a JSON snapshot of the slabs used, so historical quotes remain explainable.

---

## 8. Reports and documents

- Reports support filters: date range, month, staff, village and report-specific status.
- PDF exports include the company header/footer and are marked confidential.
- Excel exports include title, filters, summary and auto-filter.
- Salary slips are generated as PDFs and respect the company name/address from Settings.
- Report and slip generation is audited.

---

## 9. Production deployment

### Database

SQLite is convenient locally but **not recommended for concurrent production use**. Switch to PostgreSQL:

1. In `prisma/schema.prisma`, change:

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Set `DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/usha?schema=public"`.
3. Create an initial migration and deploy:

   ```bash
   npx prisma migrate dev --name init
   npx prisma migrate deploy
   npm run db:seed
   ```

4. Back up the database on a schedule (`pg_dump`).

> The schema uses `Float` for INR values for SQLite compatibility. For accounting-grade precision, switch money fields to `Decimal` when moving to PostgreSQL.

### File storage

`UPLOAD_DIR` must be:

- outside `public/`
- persistent across deploys
- backed up together with the database

For multi-instance/serverless deployments, replace `lib/storage.ts` with S3-compatible object storage (private bucket + signed URLs). The rest of the app only depends on `saveUpload`, `readStored`, `deleteStored`.

### Build and run

```bash
npm ci
npm run build
npm start
```

Recommended reverse proxy: Nginx/Caddy with HTTPS. Set:

```env
NODE_ENV=production
AUTH_SECRET="<strong random secret>"
NEXT_PUBLIC_APP_URL="https://your-domain.example"
```

Security checklist:

- [ ] Replace `AUTH_SECRET` and never commit `.env`.
- [ ] Change the seeded owner password.
- [ ] Use HTTPS so the session cookie is sent with `Secure`.
- [ ] Restrict database and upload directory permissions.
- [ ] Schedule database + upload backups.
- [ ] Set up log/monitoring for `[api]` errors.
- [ ] Review role permissions after onboarding staff.

---

## 10. Before going live — company details

The seed ships **placeholder contact details**:

- Phone: `+91 00000 00000`
- Email: `info@ushaenterprises.in`
- Address: Ghungchai Chauraha, Super Market, Puranpur, Pilibhit, Uttar Pradesh

Update them in **Settings → Company**. They are used by:

- public website header/footer, landing page and privacy page
- login screen
- PDF headers/footers and salary slips
- Excel report headers
- WhatsApp/call floating buttons

No code change or redeploy is needed after saving settings.

Also review:

- **Settings → Company → subsidy disclaimer** (shown on public calculator results)
- **Settings → Company → default working days / overtime rate** (payroll defaults)
- **Subsidy Schemes** — verify rates against the latest official notification before quoting customers

---

## 11. Project structure

```
app/
  (site)/                 Public website, calculators, privacy
  app/                    Authenticated ERP (dashboard, CRM, staff, payroll, ...)
  api/                    Route handlers (REST-style JSON APIs)
  login/                  Login screen
  forgot-password/        Password reset request screen
components/
  public/                 Public header/footer/calculators/enquiry form
  customers/ staff/ payroll/ finance/ installations/ subsidy/ settings/ ...
  ui.tsx                  Shared UI kit
lib/
  auth.ts                 Sessions, password hashing, permissions
  access.ts               Row-level scoping
  api.ts                  API wrapper, validation, error shape
  storage.ts              Private file storage + magic-byte validation
  subsidy.ts              Pure DB-driven subsidy engine
  payroll.ts              Attendance-based payroll formula
  pdf.ts / excel.ts       Document generation
  audit.ts / notify.ts    Audit trail and notifications
.opencode/
  skills/playwright-cli/  Installed Playwright CLI agent skill
prisma/
  schema.prisma           Database schema
  seed.ts                 Roles, owner, settings, subsidy rules, demo data
  clean.ts                Remove demo business data
storage/uploads/          Private uploaded documents (not public)
```

---

## 12. Operational notes

- **Attendance → payroll:** generate payroll after attendance is marked. Present days, paid/unpaid leave and overtime are read from the attendance register. Re-generating an unpaid month refreshes the calculation; paid months are protected.
- **Salary payment:** marking a salary paid creates exactly one `SALARY` expense transaction. These transactions cannot be deleted directly from Finance.
- **Installations:** completing an installation moves an approved customer to *Installation Completed*; approving the net meter moves them to *Subsidy Pending*. Every automatic change is written to application history and audit logs.
- **Documents:** the system does **not** claim to OCR documents. Staff type the values they see and the cross-check compares them with the customer record; mismatches are flagged for human review.
- **Deletion policy:** customers are archived, not hard-deleted; users linked to staff are deactivated instead of deleted; verified documents require a verifier to remove.
- **Demo data:** clearly marked seed records. Run `npm run db:clean` before entering real customer data, or use `SEED_DEMO=false` from the start.

---

## 13. Troubleshooting

| Problem | Fix |
| --- | --- |
| `Environment variable not found: DATABASE_URL` | Copy `.env.example` to `.env` |
| `Prisma Client not generated` | `npm run db:generate` |
| Uploads fail | Check `UPLOAD_DIR` exists/is writable and file is PDF/JPG/PNG ≤ 5 MB |
| Session logs out immediately | `AUTH_SECRET` changed, or `SESSION_MINUTES` too low |
| PDF/Excel export 403 | Role needs `reports.view` |
| Staff cannot see a customer | Customer must be assigned to that staff member/team |
| Build warns about `CompressionStream` | Harmless `jose` Edge Runtime warning |

---

## 14. License / ownership

Built for **USHA ENTERPRISES**. All customer data, documents and business records belong to the company. Do not commit `.env`, the SQLite database or the upload directory to source control.
