import {
  ChangeEmailCard,
  ChangePasswordCard,
  DeleteAccountCard,
  ProvidersCard,
  SessionsCard,
  UpdateAvatarCard,
  UpdateUsernameCard,
} from "@daveyplate/better-auth-ui";

export default function SettingsPage() {
  return (
    <main className="flex flex-col gap-6 container mx-auto px-4 py-12">
      <h4 className="font-bold">Account Settings</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 [&>form]:flex [&>form]:items-stretch">
        <UpdateAvatarCard
          className="md:col-span-2 [&>div]:first-of-type:flex-1"
          classNames={{
            avatar: {
              base: "size-full max-h-[24rem] aspect-square",
              fallback: "p-8",
            },
          }}
        />
        <ProvidersCard />

        <UpdateUsernameCard
          classNames={{
            content: "flex-1",
          }}
        />
        <ChangeEmailCard
          classNames={{
            content: "flex-1",
          }}
        />
        <ChangePasswordCard
          classNames={{
            header: "flex-1",
          }}
        />
        <SessionsCard />
        <DeleteAccountCard />
      </div>
    </main>
  );
}
