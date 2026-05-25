import { useState, useRef } from "react";
import { Form, Link, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/register.4";
import { requireUser } from "~/lib/auth.server";
import { uploadToBunny, generateFilePath, parseMultipartForm } from "~/lib/bunny.server";
import { Button } from "~/components/ui/Button";
import { StepIndicator } from "~/components/ui/StepIndicator";
import { Navbar } from "~/components/layout/Navbar";
import { useT } from "~/lib/i18n";
import { getLocaleFromRequest } from "~/lib/locale.server";
import { getTranslations } from "~/locales";
import { prisma } from "~/lib/prisma.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Register — Step 4 of 4" }];
}

// Custom centered file picker with translated button + filename (module-level so its state persists)
function FilePicker({ name, accept, title, dragHint, chooseLabel, noFileLabel }: {
  name: string;
  accept: string;
  title?: string;
  dragHint: string;
  chooseLabel: string;
  noFileLabel: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  return (
    <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-rose-300 transition-colors flex flex-col items-center">
      {title && <p className="text-sm font-semibold text-slate-700 mb-2">{title}</p>}
      <p className="text-slate-400 text-sm mb-4">{dragHint}</p>
      <input ref={ref} type="file" name={name} accept={accept} required className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-50 text-rose-600 text-sm font-semibold hover:bg-rose-100 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 7.5L12 3m0 0L7.5 7.5M12 3v13.5" />
        </svg>
        {chooseLabel}
      </button>
      <p className="text-sm text-slate-500 mt-3 truncate max-w-full">{fileName || noFileLabel}</p>
    </div>
  );
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireUser(request);
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, fullName: true, profileId: true, nationalIdUrl: true, passportUrl: true, familyDocUrl: true },
  });
  if (!user) throw redirect("/login");
  return { user };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireUser(request);

  const { files, fields } = await parseMultipartForm(request);
  const docType = fields.docType as "nationalId" | "passport" | "familyDoc" | undefined;

  if (fields.skip === "1") return redirect("/dashboard");

  const tr = getTranslations(getLocaleFromRequest(request)).register;
  if (!docType) return { error: tr.errSelectDoc };

  const imgAllowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

  // ID card — front + back as two separate files
  if (docType === "nationalId") {
    const front = files.nationalId_front?.[0];
    const back = files.nationalId_back?.[0];
    if (!front || !back) return { error: tr.errSelectFile };
    if (!imgAllowed.includes(front.contentType) || !imgAllowed.includes(back.contentType)) {
      return { error: tr.errInvalidFileType };
    }
    const frontUrl = await uploadToBunny(front.buffer, generateFilePath("documents/nationalId", session.userId, front.filename), front.contentType);
    const backUrl = await uploadToBunny(back.buffer, generateFilePath("documents/nationalId", session.userId, back.filename), back.contentType);
    await prisma.user.update({ where: { id: session.userId }, data: { nationalIdUrl: frontUrl, nationalIdBackUrl: backUrl } });
    return redirect("/dashboard");
  }

  // Passport / Family booklet — single file
  const file = files[docType]?.[0];
  if (!file) return { error: tr.errSelectFile };

  if (docType === "familyDoc") {
    if (file.contentType !== "application/pdf") return { error: tr.errPdfOnly };
  } else if (!imgAllowed.includes(file.contentType)) {
    return { error: tr.errInvalidFileType };
  }

  const path = generateFilePath(`documents/${docType}`, session.userId, file.filename);
  const url = await uploadToBunny(file.buffer, path, file.contentType);

  const fieldMap: Record<string, string> = { passport: "passportUrl", familyDoc: "familyDocUrl" };
  await prisma.user.update({ where: { id: session.userId }, data: { [fieldMap[docType]]: url } });

  return redirect("/dashboard");
}

export default function RegisterStep4({ loaderData, actionData }: Route.ComponentProps) {
  const { user } = loaderData;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [selected, setSelected] = useState<string>("");
  const t = useT();
  const r = t.register;

  const iconCls = "w-6 h-6";
  const DOC_TYPES = [
    {
      key: "nationalId",
      label: r.docNationalId,
      desc: r.docNationalIdDesc,
      icon: (
        <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="8.5" cy="11" r="2" />
          <path strokeLinecap="round" d="M13 10h5M13 13.5h5M5.5 15.5c.6-1.3 1.7-2 3-2s2.4.7 3 2" />
        </svg>
      ),
    },
    {
      key: "passport",
      label: r.docPassport,
      desc: r.docPassportDesc,
      icon: (
        <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h11a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" />
          <circle cx="11.5" cy="10" r="2.5" />
          <path strokeLinecap="round" d="M9 15h5" />
        </svg>
      ),
    },
    {
      key: "familyDoc",
      label: r.docFamily,
      desc: r.docFamilyDesc,
      icon: (
        <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5a2 2 0 00-2 2H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-1a2 2 0 00-2-2M9 5h6" />
          <path strokeLinecap="round" d="M8.5 12h7M8.5 15.5h7" />
        </svg>
      ),
    },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={{ role: "applicant", profileId: user.profileId }} />
      <main className="flex-1 py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-2">
            <h1 className="text-2xl font-bold text-slate-900">{r.identityDocTitle}</h1>
            <p className="text-slate-500 mt-1 text-sm">{r.identityDocSubtitle.replace("{name}", user.fullName)}</p>
          </div>

          <StepIndicator current={4} />

          <Form method="post" encType="multipart/form-data" className="space-y-5">
            {actionData?.error && (
              <div className="p-4 rounded-xl text-sm bg-red-50 border border-red-200 text-red-700">
                {actionData.error}
              </div>
            )}

            {/* Document type selector — always 1 row */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {DOC_TYPES.map(({ key, icon, label, desc }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  className={`flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-5 rounded-2xl border-2 text-center transition-all duration-200 ${
                    selected === key
                      ? "border-rose-500 bg-rose-50 shadow-md shadow-rose-100"
                      : "border-slate-200 bg-white hover:border-rose-200 hover:bg-rose-50/50"
                  }`}
                >
                  <span className={selected === key ? "text-rose-500" : "text-slate-400"}>{icon}</span>
                  <span className={`text-xs sm:text-sm font-semibold ${selected === key ? "text-rose-700" : "text-slate-800"}`}>{label}</span>
                  <span className="hidden sm:block text-xs text-slate-500 leading-tight">{desc}</span>
                  {selected === key && (
                    <span className="mt-1 text-[10px] font-bold text-rose-500 uppercase tracking-wide">{r.selectedTag}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Hidden radio that mirrors the selected state */}
            <input type="hidden" name="docType" value={selected} />

            {/* File upload — visible only after selection */}
            {selected && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <p className="text-sm font-semibold text-slate-800 text-center">
                  {r.uploadLabel} {DOC_TYPES.find((d) => d.key === selected)?.label}
                </p>

                {selected === "nationalId" ? (
                  <>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <FilePicker name="nationalId_front" accept="image/*,.pdf" title={r.idFrontLabel} dragHint={r.dragDropClick} chooseLabel={r.chooseFileBtn} noFileLabel={r.noFileChosen} />
                      <FilePicker name="nationalId_back" accept="image/*,.pdf" title={r.idBackLabel} dragHint={r.dragDropClick} chooseLabel={r.chooseFileBtn} noFileLabel={r.noFileChosen} />
                    </div>
                    <p className="text-xs text-slate-400 text-center">{r.acceptedDocs}</p>
                  </>
                ) : selected === "familyDoc" ? (
                  <>
                    <FilePicker name="familyDoc" accept="application/pdf,.pdf" dragHint={r.dragDropClick} chooseLabel={r.chooseFileBtn} noFileLabel={r.noFileChosen} />
                    <p className="text-xs text-slate-400 text-center">{r.acceptedPdfOnly}</p>
                  </>
                ) : (
                  <>
                    <FilePicker name="passport" accept="image/*,.pdf" dragHint={r.dragDropClick} chooseLabel={r.chooseFileBtn} noFileLabel={r.noFileChosen} />
                    <p className="text-xs text-slate-400 text-center">{r.acceptedDocs}</p>
                  </>
                )}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              loading={isSubmitting}
              className="w-full"
              disabled={!selected}
            >
              {isSubmitting ? r.uploadingBtn : r.uploadCompleteBtn}
            </Button>

            {/* Skip option */}
            <div className="text-center pb-8">
              <Form method="post" className="inline">
                <input type="hidden" name="skip" value="1" />
                <button type="submit" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
                  {r.skipText}
                </button>
              </Form>
            </div>
          </Form>
        </div>
      </main>
    </div>
  );
}
