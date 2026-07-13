import type { EditorModel, FieldError } from "../../validation";
import { Card } from "../ui/Card";
import ChannelForm from "./ChannelForm";
interface Props { model: EditorModel; errors: FieldError[]; onChange: (patch: Partial<EditorModel>) => void; }
export default function TargetTab({ model, errors, onChange }: Props) {
  const err = errors.find((e) => e.field === "tgtConfig")?.message;
  return (
    <Card className="p-6">
      <ChannelForm side="target" type={model.tgtType} value={model.tgtConfig}
        onChange={(json) => onChange({ tgtConfig: json })} error={err} />
    </Card>
  );
}
