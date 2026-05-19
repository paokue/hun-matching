import { Form, Link, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/dashboard.documents";
import { requireUser } from "~/lib/auth.server";
import { uploadToBunny, generateFilePath, parseMultipartForm } from "~/lib/bunny.server";
import { Button } from "~/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription } from "~/components/ui/Card";
import { Navbar } from "~/components/layout/Navbar";
import { useT } from "~/lib/i18n";
import { prisma } from "~/lib/prisma.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Documents — HanMatching.com" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireUser(request);
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, nationalIdUrl: true, passportUrl: true, familyDocUrl: true, profileId: true },
  });
  if (!user) throw redirect("/login");
  return { user };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireUser(request);

  const { files, fields } = await parseMultipartForm(request);
  const docType = fields.docType as "nationalId" | "passport" | "familyDoc";
  const file = files[docType]?.[0];

  if (!file) return { error: "No file provided." };

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowedTypes.includes(file.contentType)) return { error: "Invalid file type. Use JPG, PNG, WEBP, or PDF." };

  const path = generateFilePath(`documents/${docType}`, session.userId, file.filename);
  const url = await uploadToBunny(file.buffer, path, file.contentType);

  const fieldMap: Record<string, "nationalIdUrl" | "passportUrl" | "familyDocUrl"> = {
    nationalId: "nationalIdUrl",
    passport: "passportUrl",
    familyDoc: "familyDocUrl",
  };

  await prisma.user.update({ where: { id: session.userId }, data: { [fieldMap[docType]]: url } });
  return { success: "Document uploaded successfully." };
}

export default function Documents({ loaderData, actionData }: Route.ComponentProps) {
  const { user } = loaderData;
  const navigation = useNavigation();
  const isUploading = navigation.state === "submitting";
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

        {(actionData?.success || actionData?.error) && (
          <div className={`mb-4 p-4 rounded-xl text-sm ${actionData?.success ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
            {actionData?.success || actionData?.error}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 mb-6">{t.documents.importantMsg}</div>

        <div className="space-y-4">
          {DOC_CONFIG.map((doc) => {
            const uploaded = user[doc.urlField];
            return (
              <Card key={doc.key}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {doc.label}
                      {doc.required && <span className="text-rose-500 ml-1 text-sm">{t.documents.required}</span>}
                    </CardTitle>
                    {uploaded
                      ? <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">{t.documents.uploaded}</span>
                      : <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-full">{t.documents.notUploaded}</span>}
                  </div>
                  <CardDescription>{doc.desc}</CardDescription>
                </CardHeader>
                <Form method="post" encType="multipart/form-data">
                  <input type="hidden" name="docType" value={doc.key} />
                  <div className="flex items-center gap-3">
                    <input type="file" name={doc.key} accept="image/*,.pdf" className="flex-1 text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:text-xs file:font-medium hover:file:bg-slate-200" />
                    <Button type="submit" size="sm" loading={isUploading} variant={uploaded ? "outline" : "primary"}>
                      {uploaded ? t.documents.replaceBtn : t.documents.uploadBtn}
                    </Button>
                  </div>
                </Form>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
