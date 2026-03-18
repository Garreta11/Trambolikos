import { client } from "../sanity/lib/client";

const { projectId, dataset } = client.config();

export interface SanityFileSource {
  asset: {
    _ref: string;
    _type: "reference";
  };
  _type?: string;
  _key?: string;
  alt?: string;
  caption?: string;
}

export function videoUrlFor(source: SanityFileSource) {
  const ref = source?.asset?._ref;

  if (!ref) return "";

  const parts = ref.split("-");
  const extension = parts[parts.length - 1];
  const id = parts.slice(1, parts.length - 1).join("-");

  return `https://cdn.sanity.io/files/${projectId}/${dataset}/${id}.${extension}`;
}