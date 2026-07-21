import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApiKeyDisplayProps {
  apiKey: string;
}

export function ApiKeyDisplay({ apiKey }: ApiKeyDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-destructive">このAPIキーは今だけ表示されます。デバイスの設定に控えてから閉じてください。</p>
      <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
        <code className="flex-1 overflow-x-auto whitespace-nowrap text-xs">{apiKey}</code>
        <Button type="button" variant="ghost" size="icon-sm" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          <span className="sr-only">コピー</span>
        </Button>
      </div>
    </div>
  );
}
