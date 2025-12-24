const API_BASE = "https://car-specs.p.rapidapi.com/v2/cars";

const headers = {
  "x-rapidapi-host": "car-specs.p.rapidapi.com",
  "x-rapidapi-key": process.env.RAPIDAPI_KEY!,
};

// Cache for make and model IDs to avoid repeated lookups
const makeCache = new Map<string, string>();
const modelCache = new Map<string, string>();

export type CarSpecs = {
  make: string;
  model: string;
  trim: string;
  bodyType: string;
  engineHp: string;
  maximumTorqueNM: string;
  capacityCm3: string;
  fuelGrade: string;
  driveWheels: string;
  numberOfGears: string;
  acceleration0To100KmPerHS: string;
  maxSpeedKmPerH: string;
  fuelTankCapacityL: string;
  lengthMm: string;
  widthMm: string;
  heightMm: string;
  curbWeightKg: string;
  cargoVolumeM3: string;
  numberOfSeats: string;
  numberOfDoors: string;
};

async function fetchJson(url: string) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    console.error(`API error: ${res.status} for ${url}`);
    return null;
  }
  return res.json();
}

async function getMakeId(makeName: string): Promise<string | null> {
  const normalizedName = makeName.toLowerCase().trim();

  if (makeCache.has(normalizedName)) {
    return makeCache.get(normalizedName)!;
  }

  const makes = await fetchJson(`${API_BASE}/makes`);
  if (!makes) return null;

  // Cache all makes for future lookups
  for (const make of makes) {
    makeCache.set(make.name.toLowerCase(), make.id);
  }

  return makeCache.get(normalizedName) || null;
}

async function getModelId(makeId: string, modelName: string): Promise<string | null> {
  const cacheKey = `${makeId}-${modelName.toLowerCase()}`;

  if (modelCache.has(cacheKey)) {
    return modelCache.get(cacheKey)!;
  }

  const models = await fetchJson(`${API_BASE}/makes/${makeId}/models`);
  if (!models) return null;

  // Cache all models for this make
  for (const model of models) {
    modelCache.set(`${makeId}-${model.name.toLowerCase()}`, model.id);
  }

  // Try exact match first, then partial
  const exactMatch = modelCache.get(cacheKey);
  if (exactMatch) return exactMatch;

  // Try to find partial match (e.g., "A1" in "A1 Sportback")
  for (const model of models) {
    if (model.name.toLowerCase().includes(modelName.toLowerCase())) {
      return model.id;
    }
  }

  return null;
}

export async function getCarSpecs(
  manufacturer: string,
  model: string
): Promise<CarSpecs | null> {
  try {
    // Extract base model name (e.g., "A1" from "Audi A1 5 Door Sportback")
    // Our data has format "Audi A1" so extract second word
    const modelParts = model.split(" ");
    const baseModel = modelParts.length > 1 ? modelParts[1] : modelParts[0];

    // 1. Get make ID
    const makeId = await getMakeId(manufacturer);
    if (!makeId) {
      console.log(`Make not found: ${manufacturer}`);
      return null;
    }

    // 2. Get model ID
    const modelId = await getModelId(makeId, baseModel);
    if (!modelId) {
      console.log(`Model not found: ${baseModel} for ${manufacturer}`);
      return null;
    }

    // 3. Get generations
    const generations = await fetchJson(`${API_BASE}/models/${modelId}/generations`);
    if (!generations || generations.length === 0) {
      console.log(`No generations found for ${manufacturer} ${baseModel}`);
      return null;
    }

    // Get latest generation (usually last in array, or highest yearFrom)
    const latestGen = generations.reduce((latest: any, gen: any) => {
      if (!latest || (gen.yearFrom && gen.yearFrom > (latest.yearFrom || 0))) {
        return gen;
      }
      return latest;
    }, null);

    if (!latestGen) return null;

    // 4. Get trims for this generation
    const trims = await fetchJson(`${API_BASE}/generations/${latestGen.id}/trims`);
    if (!trims || trims.length === 0) {
      console.log(`No trims found for ${manufacturer} ${baseModel}`);
      return null;
    }

    // 5. Get specs for first trim (representative)
    const specs = await fetchJson(`${API_BASE}/trims/${trims[0].id}`);
    if (!specs) return null;

    return {
      make: specs.make || manufacturer,
      model: specs.model || model,
      trim: specs.trim || "",
      bodyType: specs.bodyType || "",
      engineHp: specs.engineHp || "",
      maximumTorqueNM: specs.maximumTorqueNM || "",
      capacityCm3: specs.capacityCm3 || "",
      fuelGrade: specs.fuelGrade || "",
      driveWheels: specs.driveWheels || "",
      numberOfGears: specs.numberOfGears || "",
      acceleration0To100KmPerHS: specs.acceleration0To100KmPerHS || "",
      maxSpeedKmPerH: specs.maxSpeedKmPerH || "",
      fuelTankCapacityL: specs.fuelTankCapacityL || "",
      lengthMm: specs.lengthMm || "",
      widthMm: specs.widthMm || "",
      heightMm: specs.heightMm || "",
      curbWeightKg: specs.curbWeightKg || "",
      cargoVolumeM3: specs.cargoVolumeM3 || "",
      numberOfSeats: specs.numberOfSeats || "",
      numberOfDoors: specs.numberOfDoors || "",
    };
  } catch (error) {
    console.error("Error fetching car specs:", error);
    return null;
  }
}
