import { toast } from "sonner";
import { useState, useRef } from "react";
import { data, Form, Link, redirect, useNavigation } from "react-router";

import { useT } from "~/lib/i18n";
import { prisma } from "~/lib/prisma.server";
import type { Route } from "./+types/register.3";
import { hashPassword, createUserSession } from "~/lib/auth.server";
import { getRegUserId, refreshRegCookie, destroyRegCookie } from "~/lib/registration.server";
import { uploadToBunny, generateFilePath, parseMultipartForm } from "~/lib/bunny.server";
import { getLocaleFromRequest } from "~/lib/locale.server";
import { getTranslations } from "~/locales";

import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Navbar } from "~/components/layout/Navbar";
import { StepIndicator } from "~/components/ui/StepIndicator";
import { Card, CardHeader, CardTitle } from "~/components/ui/Card";

const MAX_IMAGES = 10;
const MAX_BYTES = 30 * 1024 * 1024; // 30 MB

export function meta(_: Route.MetaArgs) {
  return [{ title: "Register — Step 3 of 4" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const uid = await getRegUserId(request);
  if (!uid) return redirect("/register");
  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { id: true, fullName: true, phone: true, secondaryPhone: true, facebookUrl: true, tiktokUrl: true, profileImage: true },
  });
  if (!user) return redirect("/register");
  const savedPhone = user.phone.startsWith("__pending__") ? "" : user.phone;
  const refresh = await refreshRegCookie(request);
  return data({ user: { ...user, phone: savedPhone } }, refresh ? { headers: { "Set-Cookie": refresh } } : undefined);
}

export async function action({ request }: Route.ActionArgs) {
  const uid = await getRegUserId(request);
  if (!uid) return redirect("/register");

  const { files, fields } = await parseMultipartForm(request);
  const g = (k: string) => (fields[k] ?? "").trim();

  const phone = g("phone");
  const secondaryPhone = g("secondaryPhone");
  const facebookUrl = g("facebookUrl");
  const tiktokUrl = g("tiktokUrl");
  const password = fields.password ?? "";
  const confirmPassword = fields.confirmPassword ?? "";

  const tr = getTranslations(getLocaleFromRequest(request)).register;
  const errors: Record<string, string> = {};
  if (!phone) errors.phone = tr.errPhoneRequired;
  if (!password || password.length < 8) errors.password = tr.errPasswordLength;
  if (password !== confirmPassword) errors.confirmPassword = tr.errPasswordMatch;

  const phoneExists = phone ? await prisma.user.findFirst({ where: { phone, NOT: { id: uid } } }) : null;
  if (phoneExists) errors.phone = tr.errPhoneExists;

  if (Object.keys(errors).length > 0) return { errors };

  // Profile image (≤ 30 MB)
  let profileImageUrl: string | undefined;
  const profileFile = files.profileImage?.[0];
  if (profileFile && profileFile.contentType.startsWith("image/") && profileFile.buffer.length <= MAX_BYTES) {
    const path = generateFilePath("profile", phone, profileFile.filename);
    profileImageUrl = await uploadToBunny(profileFile.buffer, path, profileFile.contentType);
  }

  // Gallery images (≤ 10, each ≤ 30 MB) → GalleryImage table (+ mirror into photos[])
  const galleryUrls: string[] = [];
  for (const file of (files.gallery ?? []).slice(0, MAX_IMAGES)) {
    if (!file.contentType.startsWith("image/")) continue;
    if (file.buffer.length > MAX_BYTES) continue;
    const path = generateFilePath("gallery", phone, file.filename);
    galleryUrls.push(await uploadToBunny(file.buffer, path, file.contentType));
  }
  if (galleryUrls.length > 0) {
    await prisma.galleryImage.createMany({
      data: galleryUrls.map((url, i) => ({ userId: uid, url, order: i })),
    });
  }

  await prisma.user.update({
    where: { id: uid },
    data: {
      phone,
      secondaryPhone: secondaryPhone || undefined,
      facebookUrl: facebookUrl || undefined,
      tiktokUrl: tiktokUrl || undefined,
      password: await hashPassword(password),
      ...(profileImageUrl ? { profileImage: profileImageUrl } : {}),
      ...(galleryUrls.length ? { photos: { push: galleryUrls } } : {}),
    },
  });

  // Account created — log them in and clear the registration cookie
  const destroyCookie = await destroyRegCookie(request);
  const authResponse = await createUserSession(uid, "applicant", "/register/4");
  const headers = new Headers(authResponse.headers);
  headers.append("Set-Cookie", destroyCookie);
  return new Response(null, { status: 302, headers });
}

export default function RegisterStep3({ loaderData, actionData }: Route.ComponentProps) {
  const { user } = loaderData;
  const errors = actionData?.errors ?? {};
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const t = useT();
  const r = t.register;

  const galleryRef = useRef<HTMLInputElement>(null);
  const [profilePreview, setProfilePreview] = useState<string>(user.profileImage ?? "");
  const [gallery, setGallery] = useState<{ file: File; url: string }[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

  function onProfileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f && f.size > MAX_BYTES) {
      toast.error(r.imageTooLargeToast);
      e.target.value = "";
      return;
    }
    setProfilePreview(f ? URL.createObjectURL(f) : (user.profileImage ?? ""));
  }

  function syncInput(items: { file: File; url: string }[]) {
    if (!galleryRef.current) return;
    const dt = new DataTransfer();
    items.forEach(({ file }) => dt.items.add(file));
    galleryRef.current.files = dt.files;
  }

  function onGalleryAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? []);
    const next = [...gallery];
    let rejectedSize = false;
    let rejectedMax = false;
    for (const f of incoming) {
      if (next.length >= MAX_IMAGES) { rejectedMax = true; break; }
      if (f.size > MAX_BYTES) { rejectedSize = true; continue; }
      next.push({ file: f, url: URL.createObjectURL(f) });
    }
    if (rejectedSize) toast.error(r.imageTooLargeToast);
    if (rejectedMax) toast.error(r.maxImagesReached);
    setGallery(next);
    syncInput(next);
  }

  function removeGallery(idx: number) {
    const removed = gallery[idx];
    if (removed) URL.revokeObjectURL(removed.url);
    const next = gallery.filter((_, i) => i !== idx);
    setGallery(next);
    syncInput(next);
  }

  const galleryFull = gallery.length >= MAX_IMAGES;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-2">
            <h1 className="text-2xl font-bold text-slate-900">{r.step3Title}</h1>
            <p className="text-slate-500 mt-1 text-sm">{r.step3Subtitle.replace("{name}", user.fullName)}</p>
          </div>

          <StepIndicator current={3} />

          <Form method="post" encType="multipart/form-data" className="space-y-5">
            {/* Contact & Social + Account */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center shrink-0">5</span>
                  <CardTitle>{r.contactSocialTitle}</CardTitle>
                </div>
              </CardHeader>
              <div className="space-y-4 mt-2">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label={r.primaryPhoneLabel} name="phone" type="tel" placeholder="+856 20..." required defaultValue={user.phone} error={errors.phone} />
                  <Input label={r.secondaryPhoneLabel} name="secondaryPhone" type="tel" placeholder={r.secondaryPhonePh} defaultValue={user.secondaryPhone ?? ""} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label={r.facebookUrlLabel} required name="facebookUrl" type="url" placeholder={r.facebookUrlPh} defaultValue={user.facebookUrl ?? ""} />
                  <Input label={r.tiktokUrlLabel} required name="tiktokUrl" type="url" placeholder={r.tiktokUrlPh} defaultValue={user.tiktokUrl ?? ""} />
                </div>

                {/* Sub-divider */}
                <div className="flex items-center gap-3 pt-2">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">6</span>
                  <span className="text-sm font-semibold text-slate-700">{r.securityCard}</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label={r.passwordLabel} name="password" showPasswordToggle placeholder={r.passwordPh} required error={errors.password} hint={r.passwordHint} />
                  <Input label={r.confirmPasswordLabel} name="confirmPassword" showPasswordToggle placeholder={r.confirmPasswordPh} required error={errors.confirmPassword} />
                </div>
              </div>
            </Card>

            {/* Profile + Gallery (single card) */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center shrink-0">7</span>
                  <CardTitle>{r.imagesSectionTitle}</CardTitle>
                </div>
              </CardHeader>

              {/* Profile image */}
              <p className="text-sm font-semibold text-slate-700 mb-1">{r.profileImageTitle}</p>
              <p className="text-sm text-slate-500 mb-3">{r.profileImageDesc}</p>
              <label className="flex items-center gap-4 cursor-pointer mb-6">
                <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center flex-shrink-0 hover:border-rose-300 transition-colors">
                  {profilePreview ? (
                    <img src={profilePreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </div>
                <div className="text-sm text-rose-500 font-medium">{r.uploadProfileHint}</div>
                <input type="file" name="profileImage" accept="image/*" className="hidden" onChange={onProfileChange} />
              </label>

              {/* Gallery */}
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-slate-700">{r.galleryTitle}</p>
                <span className="text-xs text-slate-400">{gallery.length}/{MAX_IMAGES}</span>
              </div>
              <p className="text-sm text-slate-500 mb-3">{r.galleryDesc}</p>

              {/* Hidden submitted input — always in DOM */}
              <input ref={galleryRef} type="file" name="gallery" accept="image/*" multiple className="hidden" onChange={onGalleryAdd} />

              {galleryFull ? (
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center bg-slate-50">
                  <p className="text-slate-400 text-sm">{r.maxImagesReached}</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => galleryRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-rose-300 transition-colors"
                >
                  <p className="text-slate-400 text-sm mb-3">{r.uploadGalleryHint}</p>
                  <span className="inline-block bg-rose-50 text-rose-600 font-medium text-sm px-4 py-2 rounded-lg">{r.galleryTitle}</span>
                  <p className="text-xs text-slate-400 mt-3">{r.acceptedImages}</p>
                </button>
              )}

              {gallery.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                  {gallery.map((g, i) => (
                    <div key={i} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100">
                      <img
                        src={g.url}
                        alt=""
                        onClick={() => setPreview(g.url)}
                        className="w-full h-full object-cover cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => removeGallery(i)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/55 hover:bg-black/75 text-white flex items-center justify-center transition-colors"
                        aria-label="Remove"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <div className="flex gap-3 pb-8">
              <Link to="/register/2" className="flex-1">
                <Button variant="outline" size="lg" className="w-full">{r.backBtn}</Button>
              </Link>
              <Button type="submit" size="lg" loading={isSubmitting} className="flex-1">
                {isSubmitting ? r.creatingAccountBtn : r.nextDocumentBtn}
              </Button>
            </div>
          </Form>
        </div>
      </main>

      {/* Full image preview */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setPreview(null)}>
          <div className="relative max-h-[90vh] max-w-lg" onClick={(e) => e.stopPropagation()}>
            <img src={preview} alt="" className="max-h-[90vh] w-full object-contain rounded-2xl shadow-2xl" />
            <button
              onClick={() => setPreview(null)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
