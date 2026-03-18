type JsonLdScriptProps = {
  value: Record<string, unknown>;
};

function safeSerialize(value: Record<string, unknown>) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function JsonLdScript({ value }: JsonLdScriptProps) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeSerialize(value) }} />;
}

