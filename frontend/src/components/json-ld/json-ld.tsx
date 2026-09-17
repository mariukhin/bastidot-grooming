type JsonLdProps = {
  data: Record<string, unknown>;
};

const serialize = (data: Record<string, unknown>): string =>
  JSON.stringify(data).replace(/</g, '\u003c');

const JsonLd = ({ data }: JsonLdProps) => (
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialize(data) }} />
);

export default JsonLd;
