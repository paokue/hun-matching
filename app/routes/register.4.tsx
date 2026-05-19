import { useState } from "react";
import { Form, Link, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/register.4";
import { requireUser } from "~/lib/auth.server";
import { uploadToBunny, generateFilePath, parseMultipartForm } from "~/lib/bunny.server";
import { Button } from "~/components/ui/Button";
import { StepIndicator } from "~/components/ui/StepIndicator";
import { Navbar } from "~/components/layout/Navbar";
import { prisma } from "~/lib/prisma.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Register — Step 4 of 4" }];
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

  if (!docType) return { error: "Please select a document type." };
  const file = files[docType]?.[0];
  if (!file) return { error: "Please select a file to upload." };

  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowed.includes(file.contentType)) return { error: "Invalid file type. Use JPG, PNG, WEBP or PDF." };

  const path = generateFilePath(`documents/${docType}`, session.userId, file.filename);
  const url = await uploadToBunny(file.buffer, path, file.contentType);

  const fieldMap: Record<string, string> = { nationalId: "nationalIdUrl", passport: "passportUrl", familyDoc: "familyDocUrl" };
  await prisma.user.update({ where: { id: session.userId }, data: { [fieldMap[docType]]: url } });

  return redirect("/dashboard");
}

const DOC_TYPES = [
  {
    key: "nationalId",
    icon: "🪪",
    label: "National ID Card",
    desc: "Front and back of your national ID",
  },
  {
    key: "passport",
    icon: "📗",
    label: "Passport",
    desc: "Bio-data page of your passport",
  },
  {
    key: "familyDoc",
    icon: "📋",
    label: "Family Booklet",
    desc: "Family registration document",
  },
] as const;

export default function RegisterStep4({ loaderData, actionData }: Route.ComponentProps) {
  const { user } = loaderData;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [selected, setSelected] = useState<string>("");

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={{ role: "applicant", profileId: user.profileId }} />
      <main className="flex-1 py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-2">
            <h1 className="text-2xl font-bold text-slate-900">Identity Document</h1>
            <p className="text-slate-500 mt-1 text-sm">Almost done, {user.fullName}! Upload one document to verify your identity.</p>
          </div>

          <StepIndicator current={4} />

          <Form method="post" encType="multipart/form-data" className="space-y-5">
            {actionData?.error && (
              <div className="p-4 rounded-xl text-sm bg-red-50 border border-red-200 text-red-700">
                {actionData.error}
              </div>
            )}

            {/* Document type selector */}
            <div className="grid sm:grid-cols-3 gap-3">
              {DOC_TYPES.map(({ key, icon, label, desc }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 text-center transition-all duration-200 ${
                    selected === key
                      ? "border-rose-500 bg-rose-50 shadow-md shadow-rose-100"
                      : "border-slate-200 bg-white hover:border-rose-200 hover:bg-rose-50/50"
                  }`}
                >
                  <span className="text-3xl">{icon}</span>
                  <span className={`text-sm font-semibold ${selected === key ? "text-rose-700" : "text-slate-800"}`}>{label}</span>
                  <span className="text-xs text-slate-500 leading-tight">{desc}</span>
                  {selected === key && (
                    <span className="mt-1 text-[10px] font-bold text-rose-500 uppercase tracking-wide">Selected ✓</span>
                  )}
                </button>
              ))}
            </div>

            {/* Hidden radio that mirrors the selected state */}
            <input type="hidden" name="docType" value={selected} />

            {/* File upload — visible only after selection */}
            {selected && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <p className="text-sm font-semibold text-slate-800">
                  Upload: {DOC_TYPES.find((d) => d.key === selected)?.label}
                </p>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-rose-300 transition-colors">
                  <p className="text-slate-400 text-sm mb-3">Click to select or drag and drop</p>
                  <input
                    type="file"
                    name={selected}
                    accept="image/*,.pdf"
                    required
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-rose-50 file:text-rose-600 file:font-medium hover:file:bg-rose-100"
                  />
                </div>
                <p className="text-xs text-slate-400">Accepted: JPG, PNG, WEBP, PDF · Max 10 MB</p>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              loading={isSubmitting}
              className="w-full"
              disabled={!selected}
            >
              {isSubmitting ? "Uploading..." : "Upload & Complete Registration"}
            </Button>

            {/* Skip option */}
            <div className="text-center pb-8">
              <Form method="post" className="inline">
                <input type="hidden" name="skip" value="1" />
                <button type="submit" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
                  Skip for now — I'll upload later from my dashboard
                </button>
              </Form>
            </div>
          </Form>
        </div>
      </main>
    </div>
  );
}
