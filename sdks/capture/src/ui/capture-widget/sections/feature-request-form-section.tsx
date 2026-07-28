import { Button } from "../components/primitives/button"
import { Field } from "../components/primitives/field"
import { Input } from "../components/primitives/input"
import { Label } from "../components/primitives/label"
import { Textarea } from "../components/primitives/textarea"

export function FeatureRequestFormSection(props: {
  busy: boolean
  description: string
  errorMessage: string | null
  onBack: () => void
  onDescriptionChange: (value: string) => void
  onSubmit: () => void
  onTitleChange: (value: string) => void
  title: string
}): React.JSX.Element {
  return (
    <section className="grid gap-4 p-5">
      <p className="m-0 text-muted-foreground text-sm">
        Suggest a feature. This is sent directly to the team board — no bug
        report is created.
      </p>
      <Field>
        <Label htmlFor="crikket-feature-title">Title</Label>
        <Input
          disabled={props.busy}
          id="crikket-feature-title"
          maxLength={200}
          onChange={(event) => props.onTitleChange(event.target.value)}
          placeholder="What should we add?"
          value={props.title}
        />
      </Field>
      <Field>
        <Label htmlFor="crikket-feature-description">Details</Label>
        <Textarea
          disabled={props.busy}
          id="crikket-feature-description"
          maxLength={4000}
          onChange={(event) => props.onDescriptionChange(event.target.value)}
          placeholder="Optional context…"
          rows={4}
          value={props.description}
        />
      </Field>
      {props.errorMessage ? (
        <p className="m-0 text-destructive text-sm">{props.errorMessage}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Button
          disabled={props.busy}
          onClick={props.onBack}
          type="button"
          variant="outline"
        >
          Back
        </Button>
        <Button
          disabled={props.busy || props.title.trim().length === 0}
          onClick={props.onSubmit}
          type="button"
        >
          {props.busy ? "Sending…" : "Send to board"}
        </Button>
      </div>
    </section>
  )
}
