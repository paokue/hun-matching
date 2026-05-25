import { useState, useRef, useEffect } from "react";
import { Form, Link, redirect, useNavigation, useFetcher } from "react-router";
import { toast } from "sonner";
import type { Route } from "./+types/dashboard.photos";
import { requireUser } from "~/lib/auth.server";
import { uploadToBunny, generateFilePath, parseMultipartForm } from "~/lib/bunny.server";
import { Button } from "~/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription } from "~/components/ui/Card";
import { ImageLightbox } from "~/components/ui/ImageLightbox";
import { Navbar } from "~/components/layout/Navbar";
import { useT } from "~/lib/i18n";
import { prisma } from "~/lib/prisma.server";

const MAX_IMAGES = 10;
const MAX_BYTES = 30 * 1024 * 1024;

export function meta(_: Route.MetaArgs) {
  return [{ title: "Manage Photos — HanMatching.com" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireUser(request);
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, photos: true, profileImage: true, profileId: true, fullName: true, status: true },
  });
  if (!user) throw redirect("/login");
  return { user };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireUser(request);
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) throw redirect("/login");

  const { files, fields } = await parseMultipartForm(request);
  const intent = fields.intent;

  if (intent === "profile") {
    const file = files.profileImage?.[0];
    if (!file || !file.contentType.startsWith("image/") || file.buffer.length > MAX_BYTES) return { error: "invalidFile" };
    const path = generateFilePath("profile", user.phone, file.filename);
    const url = await uploadToBunny(file.buffer, path, file.contentType);
    await prisma.user.update({ where: { id: session.userId }, data: { profileImage: url } });
    return { success: "profileSaved" };
  }

  if (intent === "upload" && files.photos) {
    const room = Math.max(0, MAX_IMAGES - user.photos.length);
    const valid = files.photos.filter((f) => f.contentType.startsWith("image/") && f.buffer.length <= MAX_BYTES).slice(0, room);
    const uploadedUrls: string[] = [];
    for (const file of valid) {
      const path = generateFilePath("photos", user.phone, file.filename);
      uploadedUrls.push(await uploadToBunny(file.buffer, path, file.contentType));
    }
    await prisma.user.update({
      where: { id: session.userId },
      data: { photos: [...user.photos, ...uploadedUrls] },
    });
    return { success: "uploaded" };
  }

  if (intent === "replace" && fields.photoIndex !== undefined) {
    const idx = Number(fields.photoIndex);
    const file = files.photo?.[0];
    if (!file || !file.contentType.startsWith("image/") || file.buffer.length > MAX_BYTES) return { error: "invalidFile" };

    const path = generateFilePath("photos", user.phone, file.filename);
    const url = await uploadToBunny(file.buffer, path, file.contentType);
    const photos = [...user.photos];
    photos[idx] = url;

    await prisma.user.update({ where: { id: session.userId }, data: { photos } });
    return { success: "replaced" };
  }

  return { error: "invalidFile" };
}

export default function Photos({ loaderData, actionData }: Route.ComponentProps) {
  const { user } = loaderData;
  const navigation = useNavigation();
  const galleryFetcher = useFetcher<typeof action>();
  const busyIntent = navigation.state !== "idle" ? (navigation.formData?.get("intent") as string | null) : null;
  const profileLoading = busyIntent === "profile";
  const galleryLoading = galleryFetcher.state !== "idle";
  const replacingIndex = busyIntent === "replace" ? Number(navigation.formData?.get("photoIndex")) : null;
  const photoCount = user.photos?.length ?? 0;
  const needed = Math.max(0, 5 - photoCount);
  const t = useT();
  const r = t.register;

  const galleryRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<{ file: File; url: string }[]>([]);
  const [profilePreview, setProfilePreview] = useState<string>(user.profileImage ?? "");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  const room = Math.max(0, MAX_IMAGES - photoCount);
  const galleryFull = room === 0;

  // Gallery upload result → clear selection + toast
  useEffect(() => {
    if (galleryFetcher.state !== "idle" || !galleryFetcher.data) return;
    if (galleryFetcher.data.success === "uploaded") {
      setSelected((prev) => { prev.forEach((s) => URL.revokeObjectURL(s.url)); return []; });
      if (galleryRef.current) galleryRef.current.value = "";
      toast.success(t.photos.uploadedMsg);
    } else if (galleryFetcher.data.error === "invalidFile") {
      toast.error(t.photos.invalidFileMsg);
    }
  }, [galleryFetcher.state, galleryFetcher.data]);

  // Profile / replace result → toast
  useEffect(() => {
    if (!actionData) return;
    if (actionData.success === "profileSaved") toast.success(t.photos.profileSavedMsg);
    else if (actionData.success === "replaced") toast.success(t.photos.replacedMsg);
    else if (actionData.error === "invalidFile") toast.error(t.photos.invalidFileMsg);
  }, [actionData]);

  function syncInput(items: { file: File; url: string }[]) {
    if (!galleryRef.current) return;
    const dt = new DataTransfer();
    items.forEach(({ file }) => dt.items.add(file));
    galleryRef.current.files = dt.files;
  }

  function onGalleryAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? []);
    const next = [...selected];
    for (const f of incoming) {
      if (next.length >= room) break;
      if (f.size > MAX_BYTES) continue;
      next.push({ file: f, url: URL.createObjectURL(f) });
    }
    setSelected(next);
    syncInput(next);
  }

  function removeSelected(idx: number) {
    const removed = selected[idx];
    if (removed) URL.revokeObjectURL(removed.url);
    const next = selected.filter((_, i) => i !== idx);
    setSelected(next);
    syncInput(next);
  }

  function onProfileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f && f.size > MAX_BYTES) { e.target.value = ""; return; }
    setProfilePreview(f ? URL.createObjectURL(f) : (user.profileImage ?? ""));
    if (f) (e.target.closest("form") as HTMLFormElement)?.requestSubmit();
  }

  const uploadDesc = photoCount >= 5
    ? t.photos.haveEnough.replace("{count}", String(photoCount))
    : t.photos.needMore.replace("{needed}", String(needed)).replace("{s}", needed !== 1 ? "s" : "");

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={{ role: "applicant", profileId: user.profileId }} />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard" className="text-slate-400 hover:text-slate-600 text-sm">{t.photos.backBtn}</Link>
          <span className="text-slate-300">/</span>
          <h1 className="text-xl font-bold text-slate-900">{t.photos.title}</h1>
        </div>

        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 overflow-hidden">
          <button
            type="button"
            onClick={() => setRulesOpen((v) => !v)}
            className="w-full flex items-center justify-between p-4 font-semibold"
          >
            <span>{t.photos.rulesTitle}</span>
            <svg className={`w-4 h-4 transition-transform duration-200 ${rulesOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {rulesOpen && (
            <ul className="px-4 pb-4 space-y-1 list-disc list-inside text-amber-700">
              <li>{t.photos.rule1}</li><li>{t.photos.rule2}</li><li>{t.photos.rule3}</li><li>{t.photos.rule4}</li>
            </ul>
          )}
        </div>

        {/* Profile image */}
        <Card className="mb-6 flex items-start gap-4">
          <Form method="post" encType="multipart/form-data" className="flex-shrink-0">
            <input type="hidden" name="intent" value="profile" />
            <label className="cursor-pointer block">
              <div className="relative w-28 h-28 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center hover:border-rose-300 transition-colors">
                {profilePreview ? (
                  <img src={profilePreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-9 h-9 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
                {profileLoading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <svg className="w-7 h-7 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  </div>
                )}
              </div>
              <input ref={profileRef} type="file" name="profileImage" accept="image/*" className="hidden" onChange={onProfileChange} disabled={profileLoading} />
            </label>
          </Form>
          <div className="space-y-1">
            <CardTitle>{t.photos.profileTitle}</CardTitle>
            <CardDescription>{r.profileImageDesc}</CardDescription>
            <Button type="button" size="sm" className="mt-2" disabled={profileLoading} onClick={() => profileRef.current?.click()}>
              {r.chooseFileBtn}
            </Button>
          </div>
        </Card>

        {/* Gallery upload */}

        {photoCount > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t.photos.yourPhotos} ({photoCount})</CardTitle>
              <CardDescription>{t.photos.clickReplace}</CardDescription>
            </CardHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {user.photos.map((url, i) => (
                <div key={i} className="relative group">
                  <button type="button" onClick={() => setLightbox(i)} className="block w-full">
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-40 object-cover rounded-xl" />
                  </button>
                  <span className="absolute top-2 left-2 bg-rose-500 text-white text-xs px-1.5 py-0.5 rounded-md">{i + 1}</span>
                  {replacingIndex === i && (
                    <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center">
                      <svg className="w-7 h-7 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    </div>
                  )}
                  <Form method="post" encType="multipart/form-data" className="absolute bottom-2 left-2 right-2">
                    <input type="hidden" name="intent" value="replace" />
                    <input type="hidden" name="photoIndex" value={i} />
                    <label className="block">
                      <span className="block w-full text-center bg-white/90 text-slate-800 text-xs font-medium py-1.5 rounded-lg cursor-pointer hover:bg-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow">{t.photos.replaceBtn}</span>
                      <input type="file" name="photo" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) (e.target.closest("form") as HTMLFormElement)?.requestSubmit(); }} />
                    </label>
                  </Form>
                </div>
              ))}
            </div>
          </Card>
        )}

        {!galleryFull && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>{t.photos.uploadTitle}</CardTitle>
              <CardDescription>{uploadDesc} · {photoCount}/{MAX_IMAGES}</CardDescription>
            </CardHeader>
            <galleryFetcher.Form method="post" encType="multipart/form-data">
              <input type="hidden" name="intent" value="upload" />
              <input ref={galleryRef} type="file" name="photos" accept="image/*" multiple className="hidden" onChange={onGalleryAdd} />

              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-rose-300 transition-colors flex flex-col items-center"
              >
                <p className="text-slate-400 text-sm mb-4">{r.uploadGalleryHint}</p>
                <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-50 text-rose-600 text-sm font-semibold">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 7.5L12 3m0 0L7.5 7.5M12 3v13.5" />
                  </svg>
                  {r.chooseFileBtn}
                </span>
                <p className="text-xs text-slate-400 mt-3">{r.acceptedImages}</p>
              </button>

              {selected.length > 0 && (
                <>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                    {selected.map((g, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                        <img src={g.url} alt="" className="w-full h-full object-cover" />
                        {galleryLoading ? (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => removeSelected(i)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/55 hover:bg-black/75 text-white flex items-center justify-center"
                            aria-label="Remove"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button type="submit" loading={galleryLoading} className="mt-4">{t.photos.uploadBtn}</Button>
                </>
              )}
            </galleryFetcher.Form>
          </Card>
        )}
      </main>

      <ImageLightbox images={user.photos} index={lightbox} setIndex={setLightbox} />
    </div>
  );
}
