export { htmlToPortableText } from "./html-to-portable-text.js";
export { generateSanitySchema } from "./schema-generator.js";
export { ContentMigrator } from "./content-migrator.js";
export { MediaMigrator } from "./media-migrator.js";
export { generateRedirectMap, redirectsToNextConfig, saveRedirectMap } from "./redirect-map.js";
export type { Redirect } from "./redirect-map.js";

import type { Phase, PhaseContext, PhaseEvent, Manifest, SanityConfig, MigrateOptions } from "@unpress/shared";
import { ContentMigrator } from "./content-migrator.js";
import { MediaMigrator } from "./media-migrator.js";
import { generateSanitySchema } from "./schema-generator.js";

export interface MigrateInput {
  manifest: Manifest;
  sanity_config: SanityConfig;
  options: MigrateOptions;
}

export interface MigrateOutput {
  documents_created: number;
  media_uploaded: number;
  schemas_generated: number;
  errors: string[];
}

export const migratePhase: Phase<MigrateInput, MigrateOutput> = {
  name: "migrate",
  async *run(input: MigrateInput, ctx: PhaseContext): AsyncGenerator<PhaseEvent, MigrateOutput> {
    const errors: string[] = [];

    yield { type: "progress", percent: 0, message: "Generating Sanity schemas..." };
    const schemas = generateSanitySchema(input.manifest);

    yield { type: "progress", percent: 10, message: "Migrating content..." };
    const contentMigrator = new ContentMigrator(input.sanity_config);
    const docCount = await contentMigrator.migrateAll(input.manifest, input.options);

    yield { type: "progress", percent: 60, message: "Uploading media..." };
    let mediaCount = 0;
    if (input.options.include_media) {
      const mediaMigrator = new MediaMigrator(input.sanity_config);
      mediaCount = await mediaMigrator.uploadAll(input.manifest.media.items, input.options.media_concurrency);
    }

    yield { type: "progress", percent: 100, message: "Migration complete" };

    return {
      documents_created: docCount,
      media_uploaded: mediaCount,
      schemas_generated: schemas.length,
      errors,
    };
  },
};
