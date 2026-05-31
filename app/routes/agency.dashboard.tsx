import { useState, useMemo, useEffect } from "react";
import { Link, redirect, Form, useFetcher, useNavigate, useSearchParams, useRevalidator } from "react-router";
import { toast } from "sonner";
import { usePusherChannel, playNotifySound, PUSHER_CHANNELS, PUSHER_EVENTS } from "~/lib/pusher.realtime";
import { SELECTED_POOL } from "~/lib/selectedPool";
import type { Route } from "./+types/agency.dashboard";
import { requireAgency } from "~/lib/auth.server";
import { Navbar } from "~/components/layout/Navbar";
import { Badge, statusBadge } from "~/components/ui/Badge";
import { Button } from "~/components/ui/Button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/Tabs";
import { formatDate, OCCUPATIONS, MARITAL_STATUS, TATTOO_STATUS, ETHNICITIES, RELIGIONS } from "~/lib/utils";
import { useT } from "~/lib/i18n";
import { prisma } from "~/lib/prisma.server";


export function meta(_: Route.MetaArgs) {
  return [{ title: "Agency Dashboard — HanMatching.com" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireAgency(request);

  const agency = await prisma.agency.findUnique({ where: { id: session.userId } });
  if (!agency) throw redirect("/agency/login");

  if (agency.status !== "active") {
    return { agency, activeSelections: [], hasMembership: false, pendingPayment: false };
  }

  const [activeSelections, pendingPayment] = await Promise.all([
    prisma.selection.findMany({
      where: { agencyId: session.userId, isActive: true },
      include: { applicant: { select: { id: true, profileId: true, fullName: true, photos: true, age: true } } },
    }),
    prisma.payment.findFirst({ where: { agencyId: session.userId, status: "pending" } }),
  ]);

  const hasMembership =
    process.env.MOCK_MEMBERSHIP === "true" ||
    !!(agency.membershipExpiresAt && new Date(agency.membershipExpiresAt) > new Date());

  return { agency, activeSelections, hasMembership, pendingPayment: !!pendingPayment };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const ids = formData.getAll("profileId") as string[];
  // DB insertion not yet wired — just acknowledge the selection count
  return { confirmed: ids.length };
}

// ── Fake applicant pool ───────────────────────────────────────────────────────
type FakeProfile = { id: string; photo: string; name: string; age: number };

const POOL: FakeProfile[] = [
  { id: "f01", photo: "https://i.pravatar.cc/600?img=1", name: "Chanthala", age: 24 },
  { id: "f02", photo: "https://i.pravatar.cc/600?img=5", name: "Nalina", age: 22 },
  { id: "f03", photo: "https://i.pravatar.cc/600?img=7", name: "Boupha", age: 26 },
  { id: "f04", photo: "https://i.pravatar.cc/600?img=9", name: "Somaly", age: 23 },
  { id: "f05", photo: "https://i.pravatar.cc/600?img=11", name: "Keovila", age: 25 },
  { id: "f06", photo: "https://i.pravatar.cc/600?img=14", name: "Maly", age: 21 },
  { id: "f07", photo: "https://i.pravatar.cc/600?img=15", name: "Vanthida", age: 27 },
  { id: "f08", photo: "https://i.pravatar.cc/600?img=20", name: "Phonevanh", age: 24 },
  { id: "f09", photo: "https://i.pravatar.cc/600?img=21", name: "Manivone", age: 22 },
  { id: "f10", photo: "https://i.pravatar.cc/600?img=25", name: "Khamphanh", age: 28 },
  { id: "f11", photo: "https://i.pravatar.cc/600?img=26", name: "Bounta", age: 23 },
  { id: "f12", photo: "https://i.pravatar.cc/600?img=31", name: "Vilayvanh", age: 25 },
  { id: "f13", photo: "https://i.pravatar.cc/600?img=33", name: "Phommaly", age: 26 },
  { id: "f14", photo: "https://i.pravatar.cc/600?img=34", name: "Keomany", age: 24 },
  { id: "f15", photo: "https://i.pravatar.cc/600?img=35", name: "Bouavanh", age: 22 },
  { id: "f16", photo: "https://i.pravatar.cc/600?img=40", name: "Nakhone", age: 25 },
  { id: "f17", photo: "https://i.pravatar.cc/600?img=41", name: "Sisouk", age: 23 },
  { id: "f18", photo: "https://i.pravatar.cc/600?img=43", name: "Chansamone", age: 27 },
  { id: "f19", photo: "https://i.pravatar.cc/600?img=44", name: "Khamla", age: 24 },
  { id: "f20", photo: "https://i.pravatar.cc/600?img=45", name: "Saengkham", age: 22 },
  { id: "f21", photo: "https://i.pravatar.cc/600?img=46", name: "Phonesavanh", age: 26 },
  { id: "f22", photo: "https://i.pravatar.cc/600?img=47", name: "Daovone", age: 25 },
  { id: "f23", photo: "https://i.pravatar.cc/600?img=48", name: "Latsamy", age: 23 },
  { id: "f24", photo: "https://i.pravatar.cc/600?img=49", name: "Ketsana", age: 24 },
  { id: "f25", photo: "https://i.pravatar.cc/600?img=50", name: "Soukphaphone", age: 27 },
  { id: "f26", photo: "https://i.pravatar.cc/600?img=51", name: "Thida", age: 22 },
  { id: "f27", photo: "https://i.pravatar.cc/600?img=53", name: "Naly", age: 25 },
  { id: "f28", photo: "https://i.pravatar.cc/600?img=56", name: "Dalin", age: 26 },
  { id: "f29", photo: "https://i.pravatar.cc/600?img=57", name: "Mai Linh", age: 23 },
  { id: "f30", photo: "https://i.pravatar.cc/600?img=58", name: "Thu Huong", age: 24 },
  { id: "f31", photo: "https://i.pravatar.cc/600?img=60", name: "Anh Lan", age: 22 },
  { id: "f32", photo: "https://i.pravatar.cc/600?img=61", name: "Phuong Hoa", age: 25 },
  { id: "f33", photo: "https://i.pravatar.cc/600?img=62", name: "Bich Thao", age: 27 },
  { id: "f34", photo: "https://i.pravatar.cc/600?img=63", name: "Thanh Ngoc", age: 23 },
  { id: "f35", photo: "https://i.pravatar.cc/600?img=64", name: "Kim Tuyet", age: 26 },
  { id: "f36", photo: "https://i.pravatar.cc/600?img=65", name: "Hong Dung", age: 24 },
  { id: "f37", photo: "https://i.pravatar.cc/600?img=66", name: "Hanh Yen", age: 22 },
  { id: "f38", photo: "https://i.pravatar.cc/600?img=67", name: "Xuan My", age: 25 },
  { id: "f39", photo: "https://i.pravatar.cc/600?img=68", name: "Yuna", age: 26 },
  { id: "f40", photo: "https://i.pravatar.cc/600?img=69", name: "Mina", age: 24 },
  { id: "f41", photo: "https://i.pravatar.cc/600?img=70", name: "Sora", age: 23 },
  { id: "f42", photo: "https://i.pravatar.cc/600?img=2", name: "Jiwon", age: 25 },
  { id: "f43", photo: "https://i.pravatar.cc/600?img=3", name: "Minji", age: 22 },
  { id: "f44", photo: "https://i.pravatar.cc/600?img=6", name: "Seoyeon", age: 27 },
  { id: "f45", photo: "https://i.pravatar.cc/600?img=8", name: "Haeri", age: 24 },
  { id: "f46", photo: "https://i.pravatar.cc/600?img=10", name: "Eunji", age: 23 },
  { id: "f47", photo: "https://i.pravatar.cc/600?img=12", name: "Nayeon", age: 25 },
  { id: "f48", photo: "https://i.pravatar.cc/600?img=13", name: "Chaeyoung", age: 22 },
  { id: "f49", photo: "https://i.pravatar.cc/600?img=16", name: "Chansone", age: 26 },
  { id: "f50", photo: "https://i.pravatar.cc/600?img=17", name: "Bouasone", age: 24 },
  { id: "f51", photo: "https://i.pravatar.cc/600?img=18", name: "Khanthaly", age: 23 },
  { id: "f52", photo: "https://i.pravatar.cc/600?img=19", name: "Phetsamone", age: 25 },
  { id: "f53", photo: "https://i.pravatar.cc/600?img=22", name: "Vilayphone", age: 27 },
  { id: "f54", photo: "https://i.pravatar.cc/600?img=23", name: "Noulack", age: 22 },
  { id: "f55", photo: "https://i.pravatar.cc/600?img=24", name: "Syphone", age: 24 },
  { id: "f56", photo: "https://i.pravatar.cc/600?img=27", name: "Phetsaly", age: 26 },
  { id: "f57", photo: "https://i.pravatar.cc/600?img=28", name: "Sounita", age: 23 },
  { id: "f58", photo: "https://i.pravatar.cc/600?img=29", name: "Khouane", age: 25 },
  { id: "f59", photo: "https://i.pravatar.cc/600?img=30", name: "Alicia", age: 24 },
  { id: "f60", photo: "https://i.pravatar.cc/600?img=32", name: "Thiphavanh", age: 22 },
];

function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PAGE_SIZE = 30; // 5 cols × 6 rows

// ── Pending / Suspended gate ─────────────────────────────────────────────────
function AgencyGate({ agency }: { agency: { companyName: string; agencyId: string; status: string } }) {
  const isPending = agency.status === "pending";
  const g = useT().agencyGate;
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full text-center">
        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 text-4xl ${isPending ? "bg-amber-100" : "bg-red-100"}`}>
          {isPending ? "⏳" : "🚫"}
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-3">
          {isPending ? g.pendingTitle : g.suspendedTitle}
        </h2>
        <p className="text-slate-500 mb-8 leading-relaxed">
          {isPending ? g.pendingDesc : g.suspendedDesc}
        </p>
        <div className={`rounded-xl p-4 text-sm mb-8 ${isPending ? "bg-amber-50 border border-amber-200 text-amber-800" : "bg-red-50 border border-red-200 text-red-700"}`}>
          <p className="font-medium">{agency.companyName}</p>
          <p className="opacity-75 mt-0.5">{g.agencyIdLabel} {agency.agencyId}</p>
        </div>
        <Form method="post" action="/agency/logout">
          <button type="submit" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
            {g.signOut}
          </button>
        </Form>
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function AgencyDashboard({ loaderData }: Route.ComponentProps) {
  const { agency, activeSelections, hasMembership, pendingPayment } = loaderData;
  const t = useT();

  const confirmFetcher = useFetcher<typeof action>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const revalidator = useRevalidator();

  // Toast after a successful registration redirect (?registered=1)
  useEffect(() => {
    if (searchParams.get("registered") === "1") {
      toast.success(t.agencyRegister.successMsg);
      setSearchParams((p) => { p.delete("registered"); return p; }, { replace: true });
    }
  }, [searchParams]);

  // Real-time updates from Pusher for this specific agency
  usePusherChannel(PUSHER_CHANNELS.agency(agency.id), {
    [PUSHER_EVENTS.agencyStatus]: (data: unknown) => {
      const p = data as { status: string };
      if (p.status === "active") toast.success(t.realtime.agencyApproved);
      else if (p.status === "rejected") toast.error(t.realtime.agencyRejected);
      else if (p.status === "suspended") toast.error(t.realtime.agencySuspended);
      playNotifySound();
      // Re-runs loader; AgencyGate will swap to the live dashboard once status === "active".
      revalidator.revalidate();
    },
    [PUSHER_EVENTS.paymentStatus]: (data: unknown) => {
      const p = data as { status: string };
      if (p.status === "verified") toast.success(t.realtime.paymentApproved);
      else if (p.status === "rejected") toast.error(t.realtime.paymentRejected);
      playNotifySound();
      revalidator.revalidate();
    },
  });

  const [activeTab, setActiveTab] = useState<"new" | "selected">("new");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [previewProfile, setPreviewProfile] = useState<FakeProfile | null>(null);
  const [contactedIds, setContactedIds] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<"grid" | "list">("grid");
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState("");

  function toggleContacted(id: string, name: string) {
    setContactedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast.success(t.agencyDashboard.uncontactedToast.replace("{name}", name));
      } else {
        next.add(id);
        toast.success(t.agencyDashboard.contactedToast.replace("{name}", name));
      }
      return next;
    });
    setOpenMenuId(null);
  }

  // Toast on confirm result
  useEffect(() => {
    if (confirmFetcher.state !== "idle" || !confirmFetcher.data) return;
    const n = confirmFetcher.data.confirmed;
    toast.success(t.agencyDashboard.confirmedToast.replace("{n}", String(n)));
    setCheckedIds(new Set());
  }, [confirmFetcher.state, confirmFetcher.data]);
  const [filters, setFilters] = useState({
    minAge: "", maxAge: "",
    minHeight: "", maxHeight: "",
    minWeight: "", maxWeight: "",
    occupation: "", maritalStatus: "", tattooStatus: "", ethnicity: "", religion: "", location: "",
  });

  function toggleCheck(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function setFilter(key: keyof typeof filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function exportSelectedCsv() {
    const d = t.agencyDashboard;
    const headers = [
      d.csvNumber, d.csvProfileId, d.csvName, d.csvAge, d.csvHeight, d.csvWeight,
      d.csvOccupation, d.csvEducation, d.csvFamilyMembers, d.csvMaritalStatus, d.csvTattoo,
      d.csvEthnicity, d.csvReligion,
      d.csvBirthPlace, d.csvCurrentAddress,
      d.csvPhone, d.csvSecondaryPhone, d.csvFacebook, d.csvTiktok,
      d.csvExpires,
    ];
    const escapeCsv = (v: unknown) => {
      if (v == null) return "";
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = SELECTED_POOL.map((p, i) => [
      i + 1, p.profileId, p.name, p.age, p.height, p.weight,
      p.occupation, p.education, p.familyMembers, p.maritalStatus, p.tattooStatus,
      p.ethnicity, p.religion,
      [p.birthVillage, p.birthDistrict, p.birthProvince].filter(Boolean).join(", "),
      [p.currentVillage, p.currentDistrict, p.currentProvince].filter(Boolean).join(", "),
      p.phone, p.secondaryPhone, p.facebookUrl, p.tiktokUrl,
      p.expiresAt,
    ]);
    const csv = "﻿" + [headers, ...rows].map((r) => r.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selected-applicants-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t.agencyDashboard.exportedToast.replace("{n}", String(rows.length)));
  }

  function clearFilters() {
    setSearch("");
    setFilters({ minAge: "", maxAge: "", minHeight: "", maxHeight: "", minWeight: "", maxWeight: "", occupation: "", maritalStatus: "", tattooStatus: "", ethnicity: "", religion: "", location: "" });
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // Freshly shuffled on every mount (= every page navigation)
  const shuffledPool = useMemo(() => fisherYates(POOL), []);

  const filteredPool = useMemo(() => shuffledPool.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.minAge && p.age < Number(filters.minAge)) return false;
    if (filters.maxAge && p.age > Number(filters.maxAge)) return false;
    return true;
  }), [shuffledPool, search, filters]);

  const visibleProfiles = filteredPool.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPool.length;

  const stats = [
    {
      label: t.agencyDashboard.totalApplicants,
      value: POOL.length,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4.13a4 4 0 11-8 0 4 4 0 018 0zm6-4a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      label: t.agencyDashboard.mySelections,
      value: activeSelections.length,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
    },
    {
      label: t.agencyDashboard.membership,
      value: hasMembership ? t.agencyDashboard.active : t.agencyDashboard.none,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
    },
    {
      label: t.agencyDashboard.statusLabel,
      value: agency.isVerified ? t.agencyDashboard.verified : t.agencyDashboard.pending,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f7fc]">
      <Navbar user={{ role: "agency", companyName: agency.companyName }} />

      {agency.status !== "active" ? (
        <AgencyGate agency={agency} />
      ) : (
        <main className="flex-1 w-full">
          {/* ── Hero header ── */}
          <div className="bg-gradient-to-br from-rose-500 via-rose-600 to-pink-700 text-white pb-36">
            <div className="max-w-7xl mx-auto px-6 pt-28">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold shadow-inner flex-shrink-0">
                    {agency.companyName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">{agency.companyName}</h1>
                    <p className="text-rose-200 text-sm mt-0.5">
                      {t.agencyDashboard.agencyIdLabel}{" "}
                      <span className="font-semibold text-white">{agency.agencyId}</span>
                    </p>
                    {hasMembership && agency.membershipExpiresAt && (
                      <p className="text-rose-200 text-xs mt-1">
                        {t.agencyDashboard.activeMembershipMsg}{" "}
                        <span className="text-white font-semibold">{formatDate(agency.membershipExpiresAt)}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {agency.isVerified && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-400/20 border border-emerald-300/40 text-emerald-100 backdrop-blur-sm">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {t.agencyDashboard.verified}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Stats overlay — straddles hero / content boundary ── */}
          <div className="max-w-7xl mx-auto px-6 -mt-16 relative z-10 mb-14">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {stats.map((s) => (
                <div key={s.label} className="bg-white rounded-lg border border-gray-100 px-8 py-8 flex items-center gap-4">
                  <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                    {s.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-bold text-slate-900 leading-none">{s.value}</div>
                    <div className="text-xs text-slate-500 mt-1 truncate">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Content ── */}
          <div className="max-w-7xl mx-auto px-6 pb-20 space-y-12">

            {/* ── Applicants section with tabs ── */}
            <section>
              <Tabs defaultValue="new" onValueChange={(v) => setActiveTab(v as "new" | "selected")}>
                {/* Tabs + search + filter — stacks on mobile, inline on sm+ */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                  <TabsList className="w-full sm:w-auto border border-slate-200">
                    <TabsTrigger value="new" className="flex-1 sm:flex-none">
                      {t.agencyDashboard.tabNew}
                      <span className="ml-1 inline-flex items-center justify-center rounded-full bg-white/30 px-1.5 py-0.5 text-xs font-semibold">
                        {filteredPool.length}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="selected" className="flex-1 sm:flex-none">
                      {t.agencyDashboard.tabSelected}
                      {SELECTED_POOL.length > 0 && (
                        <span className="ml-1 inline-flex items-center justify-center rounded-full bg-white/30 px-1.5 py-0.5 text-xs font-semibold">
                          {SELECTED_POOL.length}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none sm:w-44">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                      </svg>
                      <input
                        type="text"
                        placeholder={t.agencyDashboard.searchPh}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 placeholder:text-slate-400 transition-colors"
                      />
                    </div>
                    {activeTab === "selected" && (
                      <button
                        onClick={exportSelectedCsv}
                        disabled={SELECTED_POOL.length === 0}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:border-emerald-300 hover:text-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={t.agencyDashboard.exportCsvTooltip}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
                        </svg>
                        <span className="hidden sm:inline">{t.agencyDashboard.exportCsv}</span>
                      </button>
                    )}
                    <button
                      onClick={() => setFilterOpen(true)}
                      className={`shrink-0 relative inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${activeFilterCount > 0 ? "bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-200" : "bg-white border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-500"}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                      </svg>
                      {t.agencyDashboard.filtersBtn}
                      {activeFilterCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-rose-500 text-xs font-bold flex items-center justify-center shadow">
                          {activeFilterCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* ── New Applicants tab ── */}
                <TabsContent value="new">{(true) && (
                  <div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                      {visibleProfiles.map((p) => {
                        const isChecked = checkedIds.has(p.id);
                        return (
                          <div
                            key={p.id}
                            className="group relative cursor-pointer"
                            onClick={() => hasMembership ? setPreviewProfile(p) : setShowSubscribeModal(true)}
                          >
                            <div className={`rounded-lg overflow-hidden border shadow-sm transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1 ${isChecked ? "border-rose-400 ring-2 ring-rose-300" : "border-slate-100 group-hover:border-rose-200"}`}>
                              <div className="aspect-[3/4] relative overflow-hidden bg-slate-100">
                                <img
                                  src={p.photo}
                                  alt=""
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />

                                {/* Bottom gradient — matches landing page */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent pointer-events-none" />

                                {/* Name + age — always on, bottom-left */}
                                <div className="absolute bottom-0 left-0 p-3 pointer-events-none">
                                  <p className="text-white font-bold text-sm leading-tight drop-shadow">{p.name}</p>
                                  <p className="text-white/80 text-xs mt-0.5 drop-shadow">{p.age} {t.agencyDashboard.yrs}</p>
                                </div>

                                {/* Checkbox — members only, top-right */}
                                {hasMembership && (
                                  <button
                                    onClick={(e) => toggleCheck(p.id, e)}
                                    className={`cursor-pointer absolute top-2 right-2 w-6 h-6 rounded-sm border-2 flex items-center justify-center transition-all duration-200 shadow-md ${isChecked
                                      ? "bg-rose-500 border-rose-500 opacity-100"
                                      : "bg-white/80 border-rose-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:border-rose-400"
                                      }`}
                                  >
                                    {isChecked && (
                                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Load More */}
                    {hasMore && (
                      <div className="flex justify-center mt-10">
                        <button
                          onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                          className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-white border border-slate-200 text-slate-700 text-sm font-semibold shadow-sm hover:border-rose-300 hover:text-rose-500 hover:shadow-md transition-all duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                          {t.agencyDashboard.loadMore}
                          <span className="text-xs text-slate-400 font-normal">
                            ({filteredPool.length - visibleCount} {t.agencyDashboard.remaining})
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}</TabsContent>

                {/* ── Selected Applicants tab ── */}
                <TabsContent value="selected">
                  <div>
                    {SELECTED_POOL.length === 0 ? (
                      <div className="text-center py-24 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </div>
                        <p className="text-slate-600 font-semibold">{t.agencyDashboard.emptySelectedTitle}</p>
                        <p className="text-slate-400 text-sm mt-1">{t.agencyDashboard.emptySelectedDesc}</p>
                      </div>
                    ) : (
                      <>
                      {/* View toggle */}
                      <div className="flex justify-end mb-4">
                        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
                          <button
                            onClick={() => setSelectedView("grid")}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${selectedView === "grid" ? "bg-rose-500 text-white" : "text-slate-500 hover:text-slate-700"}`}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                            {t.agencyDashboard.viewGrid}
                          </button>
                          <button
                            onClick={() => setSelectedView("list")}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${selectedView === "list" ? "bg-rose-500 text-white" : "text-slate-500 hover:text-slate-700"}`}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                            {t.agencyDashboard.viewList}
                          </button>
                        </div>
                      </div>

                      {selectedView === "grid" ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {SELECTED_POOL.map((sel) => {
                            const isContacted = contactedIds.has(sel.id);
                            return (
                              <div
                                key={sel.id}
                                className="group cursor-pointer"
                                onClick={() => navigate(`/agency/applicant/${sel.id}`)}
                              >
                                <div className={`bg-white rounded-2xl overflow-hidden border shadow-sm group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300 ${isContacted ? "border-emerald-300 ring-2 ring-emerald-200" : "border-slate-100 group-hover:border-rose-200"}`}>
                                  <div className="aspect-[3/4] relative overflow-hidden bg-slate-100">
                                    <img
                                      src={sel.photo}
                                      alt={sel.name}
                                      className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${isContacted ? "grayscale-[35%]" : ""}`}
                                    />
                                    {/* Gradient + name */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent pointer-events-none" />
                                    <div className="absolute bottom-0 left-0 p-3 pointer-events-none">
                                      <p className="text-white font-bold text-sm leading-tight drop-shadow">{sel.name}</p>
                                      <p className="text-white/80 text-xs mt-0.5 drop-shadow">{sel.age} {t.agencyDashboard.yrs}</p>
                                    </div>
                                    {/* Status badge */}
                                    <div className="absolute top-2 left-2">
                                      {isContacted ? (
                                        <span className="inline-flex items-center gap-1 bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold shadow-md">
                                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                          </svg>
                                          {t.agencyDashboard.contacted}
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold shadow-md">
                                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                          </svg>
                                          {t.agencyDashboard.selected}
                                        </span>
                                      )}
                                    </div>

                                    {/* 3-dots menu */}
                                    <div className="absolute top-2 right-2">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === sel.id ? null : sel.id); }}
                                        className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-colors"
                                      >
                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M10 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 5.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 5.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                                        </svg>
                                      </button>

                                      {openMenuId === sel.id && (
                                        <div
                                          className="absolute top-9 right-0 z-20 w-44 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 overflow-hidden"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Link
                                            to={`/agency/applicant/${sel.id}`}
                                            className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                          >
                                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            {t.agencyDashboard.viewDetail}
                                          </Link>
                                          <button
                                            onClick={() => toggleContacted(sel.id, sel.name)}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                          >
                                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {isContacted ? t.agencyDashboard.unmarkContact : t.agencyDashboard.markContact}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                <th className="px-4 py-3">{t.agencyDashboard.thApplicant}</th>
                                <th className="px-4 py-3">{t.agencyDashboard.thAge}</th>
                                <th className="px-4 py-3 hidden sm:table-cell">{t.agencyDashboard.thOccupation}</th>
                                <th className="px-4 py-3 hidden md:table-cell">{t.agencyDashboard.thLocation}</th>
                                <th className="px-4 py-3">{t.agencyDashboard.thStatus}</th>
                                <th className="px-4 py-3 text-right">{t.agencyDashboard.thActions}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {SELECTED_POOL.map((sel) => {
                                const isContacted = contactedIds.has(sel.id);
                                return (
                                  <tr
                                    key={sel.id}
                                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/agency/applicant/${sel.id}`)}
                                  >
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-3">
                                        <img src={sel.photo} alt={sel.name} className={`w-10 h-10 rounded-full object-cover flex-shrink-0 ${isContacted ? "grayscale-[35%]" : ""}`} />
                                        <div className="min-w-0">
                                          <p className="font-semibold text-slate-800 truncate">{sel.name}</p>
                                          <p className="text-xs text-slate-400">{sel.profileId}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{sel.age} {t.agencyDashboard.yrs}</td>
                                    <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{sel.occupation}</td>
                                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{sel.currentProvince}</td>
                                    <td className="px-4 py-3">
                                      {isContacted ? (
                                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 text-xs px-2 py-1 rounded-full font-semibold whitespace-nowrap">
                                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                          </svg>
                                          {t.agencyDashboard.contacted}
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 text-xs px-2 py-1 rounded-full font-semibold whitespace-nowrap">
                                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                          </svg>
                                          {t.agencyDashboard.selected}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                        <Link
                                          to={`/agency/applicant/${sel.id}`}
                                          title={t.agencyDashboard.viewDetail}
                                          className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-rose-300 hover:text-rose-500 transition-colors"
                                        >
                                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                          </svg>
                                        </Link>
                                        <button
                                          onClick={() => toggleContacted(sel.id, sel.name)}
                                          title={isContacted ? t.agencyDashboard.unmarkContact : t.agencyDashboard.markContact}
                                          className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${isContacted ? "border-emerald-300 text-emerald-500 bg-emerald-50" : "border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-500"}`}
                                        >
                                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Click-away overlay to close menu */}
                      {openMenuId && (
                        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                      )}
                      </>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </section>
          </div>
        </main>
      )}

      {/* ── Filter drawer ── */}
      {filterOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setFilterOpen(false)} />
      )}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${filterOpen ? "translate-x-0" : "translate-x-full"}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            <h2 className="font-semibold text-slate-900">{t.agencyFilters.title}</h2>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-100 text-rose-600 text-xs font-bold">{activeFilterCount}</span>
            )}
          </div>
          <button onClick={() => setFilterOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter fields */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t.agencyFilters.age}</p>
            <div className="flex gap-2">
              <input type="number" placeholder={t.agencyFilters.minAge} value={filters.minAge} onChange={(e) => setFilter("minAge", e.target.value)} min={18} max={60} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 placeholder:text-slate-400" />
              <input type="number" placeholder={t.agencyFilters.maxAge} value={filters.maxAge} onChange={(e) => setFilter("maxAge", e.target.value)} min={18} max={60} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 placeholder:text-slate-400" />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t.agencyFilters.height}</p>
            <div className="flex gap-2">
              <input type="number" placeholder={t.agencyFilters.minHeight} value={filters.minHeight} onChange={(e) => setFilter("minHeight", e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 placeholder:text-slate-400" />
              <input type="number" placeholder={t.agencyFilters.maxHeight} value={filters.maxHeight} onChange={(e) => setFilter("maxHeight", e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 placeholder:text-slate-400" />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t.agencyFilters.weight}</p>
            <div className="flex gap-2">
              <input type="number" placeholder={t.agencyFilters.minWeight} value={filters.minWeight} onChange={(e) => setFilter("minWeight", e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 placeholder:text-slate-400" />
              <input type="number" placeholder={t.agencyFilters.maxWeight} value={filters.maxWeight} onChange={(e) => setFilter("maxWeight", e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 placeholder:text-slate-400" />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t.agencyFilters.occupation}</p>
            <select value={filters.occupation} onChange={(e) => setFilter("occupation", e.target.value)} className="w-full px-3 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300">
              <option value="">{t.agencyFilters.anyOccupation}</option>
              {OCCUPATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t.agencyFilters.maritalStatus}</p>
            <select value={filters.maritalStatus} onChange={(e) => setFilter("maritalStatus", e.target.value)} className="w-full px-3 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300">
              <option value="">{t.agencyFilters.anyMaritalStatus}</option>
              {MARITAL_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t.agencyFilters.tattoo}</p>
            <select value={filters.tattooStatus} onChange={(e) => setFilter("tattooStatus", e.target.value)} className="w-full px-3 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300">
              <option value="">{t.agencyFilters.anyTattoo}</option>
              {TATTOO_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t.agencyFilters.ethnicity}</p>
            <select value={filters.ethnicity} onChange={(e) => setFilter("ethnicity", e.target.value)} className="w-full px-3 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300">
              <option value="">{t.agencyFilters.anyEthnicity}</option>
              {ETHNICITIES.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t.agencyFilters.religion}</p>
            <select value={filters.religion} onChange={(e) => setFilter("religion", e.target.value)} className="w-full px-3 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300">
              <option value="">{t.agencyFilters.anyReligion}</option>
              {RELIGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t.agencyFilters.location}</p>
            <input type="text" placeholder={t.agencyFilters.locationPh} value={filters.location} onChange={(e) => setFilter("location", e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 placeholder:text-slate-400" />
          </div>

        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
          <button onClick={clearFilters} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            {t.agencyFilters.clearAll}
          </button>
          <button onClick={() => setFilterOpen(false)} className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 transition-colors shadow-md shadow-rose-200">
            {t.agencyFilters.apply}
          </button>
        </div>
      </div>

      {/* ── Image preview modal ── */}
      {previewProfile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewProfile(null)}
        >
          <div className="relative max-h-[90vh] max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewProfile.photo}
              alt={previewProfile.name}
              className="w-full h-full object-cover rounded-2xl shadow-2xl"
            />
            {/* Gradient + name */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent rounded-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 p-5">
              <p className="text-white font-bold text-xl drop-shadow">{previewProfile.name}</p>
              <p className="text-white/80 text-sm mt-0.5 drop-shadow">{previewProfile.age} {t.agencyDashboard.yrs}</p>
            </div>
            {/* Close */}
            <button
              onClick={() => setPreviewProfile(null)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Confirm Selected float button ── */}
      {checkedIds.size > 0 && (
        <div className="fixed bottom-8 right-8 z-30">
          <confirmFetcher.Form method="post">
            {[...checkedIds].map((id) => (
              <input key={id} type="hidden" name="profileId" value={id} />
            ))}
            <button
              type="submit"
              disabled={confirmFetcher.state !== "idle"}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-rose-500 hover:bg-rose-600 disabled:opacity-70 text-white font-semibold text-sm shadow-xl shadow-rose-300 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl"
            >
              {confirmFetcher.state !== "idle" ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  {t.agencyDashboard.confirming}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {t.agencyDashboard.confirmSelected}
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/25 text-xs font-bold">
                    {checkedIds.size}
                  </span>
                </>
              )}
            </button>
          </confirmFetcher.Form>
        </div>
      )}

      {/* ── Subscribe modal ── */}
      {showSubscribeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowSubscribeModal(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowSubscribeModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="w-16 h-16 rounded-2xl bg-rose-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-rose-200">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-2">{t.agencyDashboard.membershipRequired}</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              {t.agencyDashboard.membershipRequiredDesc}
            </p>

            <div className="flex flex-col gap-3">
              <Link
                to="/agency/membership"
                className="w-full py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm shadow-md shadow-rose-200 hover:shadow-lg hover:shadow-rose-300 transition-all duration-200 block"
                onClick={() => setShowSubscribeModal(false)}
              >
                {t.agencyDashboard.viewMembershipPackages}
              </Link>
              <button
                onClick={() => setShowSubscribeModal(false)}
                className="w-full py-3 rounded-2xl bg-slate-50 text-slate-500 font-medium text-sm hover:bg-slate-100 transition-colors"
              >
                {t.agencyDashboard.maybeLater}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
