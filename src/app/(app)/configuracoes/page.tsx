import { ApiKeySettings } from "./ApiKeySettings";
import { StudySettings } from "./StudySettings";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Configurações</h1>
      <ApiKeySettings />
      <StudySettings />
    </div>
  );
}
