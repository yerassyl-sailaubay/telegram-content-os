import type { GenerationRequest, GenerationResult } from "./types";

export interface GenerationEngine {
  generate(request: GenerationRequest): Promise<GenerationResult>;
}
