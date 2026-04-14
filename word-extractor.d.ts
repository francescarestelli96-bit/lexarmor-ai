declare module "word-extractor" {
  class ExtractedDocument {
    getBody(): string;
  }

  class WordExtractor {
    extract(input: string | Buffer): Promise<ExtractedDocument>;
  }

  export = WordExtractor;
}
