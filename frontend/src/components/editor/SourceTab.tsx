import type { EditorModel, FieldError } from "../../validation";
import { Card } from "../ui/Card";
import ChannelForm from "./ChannelForm";
interface Props { model: EditorModel; errors: FieldError[]; onChange: (patch: Partial<EditorModel>) => void; }
export default function SourceTab({ model, errors, onChange }: Props) {
  const err = errors.find((e) => e.field === "srcConfig")?.message;
  return (
    <Card className="p-6">
      <ChannelForm side="source" type={model.srcType} value={model.srcConfig}
        onChange={(json) => onChange({ srcConfig: json })} error={err} />
    </Card>
  );
}
