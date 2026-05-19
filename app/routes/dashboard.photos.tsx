import { Form, Link, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/dashboard.photos";
import { requireUser } from "~/lib/auth.server";
import { uploadToBunny, generateFilePath, parseMultipartForm } from "~/lib/bunny.server";
import { Button } from "~/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription } from "~/components/ui/Card";
import { Navbar } from "~/components/layout/Navbar";
import { useT } from "~/lib/i18n";
import { prisma } from "~/lib/prisma.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Manage Photos — HanMatching.com" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireUser(request);
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, photos: true, profileId: true, fullName: true },
  });
  if (!user) throw redirect("/login");
  return { user };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireUser(request);

  const { files, fields } = await parseMultipartForm(request);
  const intent = fields.intent;

  if (intent === "upload" && files.photos) {
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) throw redirect("/login");

    const uploadedUrls: string[] = [];
    for (const file of files.photos) {
      if (!file.contentType.startsWith("image/")) continue;
      const path = generateFilePath("photos", session.userId, file.filename);
      const url = await uploadToBunny(file.buffer, path, file.contentType);
      uploadedUrls.push(url);
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { photos: [...user.photos, ...uploadedUrls] },
    });
    return { success: `${uploadedUrls.length} photo(s) uploaded successfully.` };
  }

  if (intent === "replace" && fields.photoIndex !== undefined) {
    const idx = Number(fields.photoIndex);
    const file = files.photo?.[0];
    if (!file || !file.contentType.startsWith("image/")) return { error: "Invalid file." };

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) throw redirect("/login");

    const path = generateFilePath("photos", session.userId, file.filename);
    const url = await uploadToBunny(file.buffer, path, file.contentType);
    const photos = [...user.photos];
    photos[idx] = url;

    await prisma.user.update({ where: { id: session.userId }, data: { photos } });
    return { success: "Photo replaced successfully." };
  }

  return { error: "Unknown action." };
}

export default function Photos({ loaderData, actionData }: Route.ComponentProps) {
  const { user } = loaderData;
  const navigation = useNavigation();
  const isUploading = navigation.state === "submitting";
  const photoCount = user.photos?.length ?? 0;
  const needed = Math.max(0, 5 - photoCount);
  const t = useT();

  const uploadDesc = photoCount >= 5
    ? t.photos.haveEnough.replace("{count}", String(photoCount))
    : t.photos.needMore.replace("{needed}", String(needed));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={{ role: "applicant", profileId: user.profileId }} />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard" className="text-slate-400 hover:text-slate-600 text-sm">{t.photos.backBtn}</Link>
          <span className="text-slate-300">/</span>
          <h1 className="text-xl font-bold text-slate-900">{t.photos.title}</h1>
        </div>

        {(actionData?.success || actionData?.error) && (
          <div className={`mb-4 p-4 rounded-xl text-sm ${actionData?.success ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
            {actionData?.success || actionData?.error}
          </div>
        )}

        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <strong>{t.photos.rulesTitle}</strong>
          <ul className="mt-1 space-y-1 list-disc list-inside text-amber-700">
            <li>{t.photos.rule1}</li><li>{t.photos.rule2}</li><li>{t.photos.rule3}</li><li>{t.photos.rule4}</li>
          </ul>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t.photos.uploadTitle}</CardTitle>
            <CardDescription>{uploadDesc}</CardDescription>
          </CardHeader>
          <Form method="post" encType="multipart/form-data">
            <input type="hidden" name="intent" value="upload" />
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-rose-300 transition-colors">
              <p className="text-slate-400 text-sm mb-3">{t.photos.dragDrop}</p>
              <input type="file" name="photos" multiple accept="image/*" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-rose-50 file:text-rose-600 file:font-medium hover:file:bg-rose-100" />
            </div>
            <Button type="submit" loading={isUploading} className="mt-4">{t.photos.uploadBtn}</Button>
          </Form>
        </Card>

        {photoCount > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t.photos.yourPhotos} ({photoCount})</CardTitle>
              <CardDescription>{t.photos.clickReplace}</CardDescription>
            </CardHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {user.photos.map((url, i) => (
                <div key={i} className="relative group">
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-40 object-cover rounded-xl" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-end p-2">
                    <Form method="post" encType="multipart/form-data" className="w-full">
                      <input type="hidden" name="intent" value="replace" />
                      <input type="hidden" name="photoIndex" value={i} />
                      <label className="block w-full">
                        <span className="block w-full text-center bg-white text-slate-800 text-xs font-medium py-1.5 rounded-lg cursor-pointer hover:bg-slate-100">{t.photos.replaceBtn}</span>
                        <input type="file" name="photo" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) (e.target.closest("form") as HTMLFormElement)?.requestSubmit(); }} />
                      </label>
                    </Form>
                  </div>
                  {i < 5 && <span className="absolute top-2 left-2 bg-rose-500 text-white text-xs px-1.5 py-0.5 rounded-md">#{i + 1}</span>}
                </div>
              ))}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
