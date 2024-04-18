import { Button } from "~/components/ui/button";
import { Slider } from "~/components/ui/slider";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { SettingsIcon } from "lucide-react";

import { ALLOWED_MODELS } from "~/lib/constants";
import { env } from "~/env";
import { BotSettings } from "~/types";

export function ButtonWithIcon() {
  return (
    <Button>
      <SettingsIcon className="mr-2 h-4 w-4" /> Settings
    </Button>
  );
}

export type SettingsProps = {
  botSettings: BotSettings;
  setBotSettings: (settings: BotSettings) => void;
};

export function Settings({ botSettings, setBotSettings }: SettingsProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <SettingsIcon className="mr-2 h-4 w-4" /> Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="dark bg-slate-900 text-slate-200  sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change settings</DialogTitle>
          <DialogDescription>
            Note: you can't customize your settings if you are using the
            community OpenAI API key.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Select
            value={botSettings.llm_model_name}
            onValueChange={(val) =>
              setBotSettings({ ...botSettings, llm_model_name: val })
            }
          >
            <Label htmlFor="model-name">Model</Label>
            <SelectTrigger className="mb-4 w-[70%]">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent className="dark" id="model-name">
              {ALLOWED_MODELS.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label htmlFor="temperature">{`Temperature - ${botSettings.temperature}`}</Label>
          <Slider
            id="temperature"
            defaultValue={[env.NEXT_PUBLIC_DEFAULT_TEMPERATURE]}
            max={2.0}
            step={0.01}
            value={[botSettings.temperature]}
            onValueChange={(vals) =>
              setBotSettings({
                ...botSettings,
                temperature: vals[0] ?? 0,
              })
            }
            className="w-[90%]"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="submit"
            variant="secondary"
            onClick={() =>
              setBotSettings({
                llm_model_name: env.NEXT_PUBLIC_DEFAULT_MODEL_NAME,
                temperature: env.NEXT_PUBLIC_DEFAULT_TEMPERATURE,
              })
            }
          >
            Reset
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="default">
              Done
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
