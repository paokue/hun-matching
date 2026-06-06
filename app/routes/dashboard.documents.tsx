import { useEffect } from "react";
import { Link, redirect, useFetcher } from "react-router";
import { toast } from "sonner";
import type { Route } from "./+types/dashboard.documents";
import { requireUser } from "~/lib/auth.server";
import { uploadToBunny, generateFilePath, parseMultipartForm } from "~/lib/bunny.server";
import { Button } from "~/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription } from "~/components/ui/Card";
import { DocPreview } from "~/components/ui/DocPreview";
import { Navbar } from "~/components/layout/Navbar";
import { useT } from "~/lib/i18n";
import { useApplicantRealtime } from "~/lib/pusher.realtime";
import { getLocaleFromRequest } from "~/lib/locale.server";
import { getTranslations } from "~/locales";
import { prisma } from "~/lib/prisma.server";

type DocItem = { key: string; label: string; desc: string; required: boolean };

export function meta(_: Route.MetaArgs) {
  return [{ title: "Documents — HanMatching.com" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireUser(request);
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, status: true, nationalIdUrl: true, passportUrl: true, familyDocUrl: true, profileId: true },
  });
  if (!user) throw redirect("/login");
  return { user };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireUser(request);
  const tr = getTranslations(getLocaleFromRequest(request)).documents;

  const owner = await prisma.user.findUnique({ where: { id: session.userId }, select: { phone: true } });

  const { files, fields } = await parseMultipartForm(request);
  const docType = fields.docType as "nationalId" | "passport" | "familyDoc";
  const file = files[docType]?.[0];

  if (!file) return { error: tr.errNoFile };

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowedTypes.includes(file.contentType)) return { error: tr.errInvalidType };
  if (file.buffer.length > 30 * 1024 * 1024) return { error: tr.errFileTooLarge };

  const path = generateFilePath(`documents/${docType}`, owner?.phone ?? session.userId, file.filename);
  const url = await uploadToBunny(file.buffer, path, file.contentType);

  const fieldMap: Record<string, "nationalIdUrl" | "passportUrl" | "familyDocUrl"> = {
    nationalId: "nationalIdUrl",
    passport: "passportUrl",
    familyDoc: "familyDocUrl",
  };

  await prisma.user.update({ where: { id: session.userId }, data: { [fieldMap[docType]]: url } });
  return { success: tr.uploadSuccess };
}

// Single document card with its own upload state, loading + toast
function DocUploadCard({ doc, uploaded, td }: { doc: DocItem; uploaded: string | null; td: ReturnType<typeof useT>["documents"] }) {
  const fetcher = useFetcher<typeof action>();
  const uploading = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if ("success" in fetcher.data) toast.success(fetcher.data.success);
    else if ("error" in fetcher.data) toast.error(fetcher.data.error);
  }, [fetcher.state, fetcher.data]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {doc.label}
            {doc.required && <span className="text-rose-500 ml-1 text-sm">{td.required}</span>}
          </CardTitle>
          {uploaded
            ? <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">{td.uploaded}</span>
            : <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-full">{td.notUploaded}</span>}
        </div>
        <CardDescription>{doc.desc}</CardDescription>
      </CardHeader>
      {uploaded && (
        <div className="mb-4 w-40">
          <p className="text-xs text-slate-400 mb-1.5">{td.currentLabel}</p>
          <DocPreview url={uploaded} label={doc.label} viewLabel={td.viewDoc} />
        </div>
      )}
      <fetcher.Form method="post" encType="multipart/form-data">
        <input type="hidden" name="docType" value={doc.key} />
        <div className="flex items-center gap-3">
          <input type="file" name={doc.key} accept="image/*,.pdf" className="flex-1 text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:text-xs file:font-medium hover:file:bg-slate-200" />
          <Button type="submit" size="sm" loading={uploading} variant={uploaded ? "outline" : "primary"}>
            {uploaded ? td.replaceBtn : td.uploadBtn}
          </Button>
        </div>
      </fetcher.Form>
    </Card>
  );
}

export default function Documents({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  useApplicantRealtime(user.id);
  const t = useT();

  const DOC_CONFIG = [
    { key: "nationalId", label: t.documents.nationalIdLabel, urlField: "nationalIdUrl" as const, desc: t.documents.nationalIdDesc, required: true },
    { key: "passport", label: t.documents.passportLabel, urlField: "passportUrl" as const, desc: t.documents.passportDesc, required: true },
    { key: "familyDoc", label: t.documents.familyDocLabel, urlField: "familyDocUrl" as const, desc: t.documents.familyDocDesc, required: false },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={{ role: "applicant", profileId: user.profileId }} />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard" className="text-slate-400 hover:text-slate-600 text-sm">{t.documents.backBtn}</Link>
          <span className="text-slate-300">/</span>
          <h1 className="text-xl font-bold text-slate-900">{t.documents.title}</h1>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 mb-6">{t.documents.importantMsg}</div>

        <div className="space-y-4">
          {DOC_CONFIG.map((doc) => (
            <DocUploadCard key={doc.key} doc={doc} uploaded={user[doc.urlField]} td={t.documents} />
          ))}
        </div>
      </main>
    </div>
  );
}
