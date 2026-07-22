import { uploadAvatar } from "../actions";

export function AvatarUploadForm({
  userId,
  fotoUrl,
}: {
  userId: string;
  fotoUrl: string | null;
}) {
  const uploadWithId = uploadAvatar.bind(null, userId);

  return (
    <form action={uploadWithId} className="flex items-center gap-4">
      {fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fotoUrl}
          alt=""
          className="h-16 w-16 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-kmp-graphite/10 text-xl font-medium text-kmp-graphite/60">
          ?
        </span>
      )}
      <div className="flex flex-1 items-center gap-2">
        <input
          type="file"
          name="file"
          accept="image/*"
          required
          className="flex-1 text-xs text-kmp-graphite/70"
        />
        <button
          type="submit"
          className="rounded-md bg-kmp-graphite/10 px-3 py-1.5 text-xs font-medium text-kmp-graphite transition hover:bg-kmp-orange hover:text-white"
        >
          Enviar foto
        </button>
      </div>
    </form>
  );
}
