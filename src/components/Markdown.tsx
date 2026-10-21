import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";

// Mantém a classe language-* dos blocos de código para o realce funcionar.
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ["className", /^language-./]],
  },
};

export function Markdown({ source, className = "" }: { source: string; className?: string }) {
  return (
    <div className={`markdown ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, schema], [rehypeHighlight, { detect: false }]]}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
