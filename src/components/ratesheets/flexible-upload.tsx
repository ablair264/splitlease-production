"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";

// Standard field definitions with descriptions
const STANDARD_FIELDS = {
  cap_code: { label: "CAP Code", description: "Unique vehicle identifier", required: false },
  manufacturer: { label: "Manufacturer", description: "Vehicle make (e.g., BMW, Audi)", required: true },
  model: { label: "Model", description: "Vehicle model name", required: true },
  variant: { label: "Variant", description: "Specific vehicle variant/trim", required: false },
  monthly_rental: { label: "Monthly Rental", description: "Monthly lease payment", required: true },
  p11d: { label: "P11D Price", description: "List price including VAT", required: true },
  otr_price: { label: "OTR Price", description: "On-the-road price", required: false },
  term: { label: "Term (Months)", description: "Contract length in months", required: false },
  mileage: { label: "Annual Mileage", description: "Mileage allowance per year", required: false },
  mpg: { label: "Fuel Economy", description: "Miles per gallon", required: false },
  co2: { label: "CO2 Emissions", description: "CO2 emissions in g/km", required: false },
  fuel_type: { label: "Fuel Type", description: "Petrol, Diesel, Electric, Hybrid", required: false },
  electric_range: { label: "Electric Range", description: "EV/PHEV range in miles", required: false },
  insurance_group: { label: "Insurance Group", description: "Insurance group (1-50)", required: false },
  body_style: { label: "Body Style", description: "Car body type (Hatchback, Saloon, etc.)", required: false },
  transmission: { label: "Transmission", description: "Manual or Automatic", required: false },
  euro_rating: { label: "Euro Rating", description: "Euro emissions standard", required: false },
  upfront: { label: "Upfront Payment", description: "Initial rental payment", required: false },
} as const;

type FieldKey = keyof typeof STANDARD_FIELDS;
type FieldMappings = Partial<Record<FieldKey, number>>;

interface FileData {
  headers: string[];
  sampleRows: string[][];
  totalRows: number;
}

interface SavedMapping {
  id: string;
  providerName: string;
  columnMappings: FieldMappings;
}

interface VehicleResult {
  manufacturer?: string;
  model?: string;
  variant?: string;
  monthly_rental?: number;
  p11d?: number;
  term?: number;
  mileage?: number;
  score: number;
  scoreCategory: string;
  mpg?: number;
  co2?: number;
  [key: string]: unknown;
}

interface UploadResult {
  success: boolean;
  batchId: string;
  fileName: string;
  provider: string;
  stats: {
    totalVehicles: number;
    averageScore: number;
    topScore: number;
    scoreDistribution: {
      exceptional: number;
      excellent: number;
      good: number;
      fair: number;
      poor: number;
    };
  };
  topDeals: VehicleResult[];
  errors: string[];
  testMode: boolean;
}

interface FlexibleUploadProps {
  onUploadComplete: (results: UploadResult) => void;
  onError: (message: string) => void;
}

// Parse file to extract headers and sample rows
async function parseFile(file: File): Promise<FileData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());
        const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
        const sampleRows = lines.slice(1, 4).map((line) =>
          line.split(",").map((cell) => cell.trim().replace(/"/g, ""))
        );
        resolve({ headers, sampleRows, totalRows: lines.length - 1 });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function FlexibleUpload({ onUploadComplete, onError }: FlexibleUploadProps) {
  const [uploadState, setUploadState] = useState<"idle" | "parsing" | "mapping" | "processing">("idle");
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMappings>({});
  const [providerName, setProviderName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [savedMappings, setSavedMappings] = useState<SavedMapping[]>([]);

  // Load saved provider mappings on component mount
  useEffect(() => {
    const loadSavedMappings = async () => {
      try {
        const response = await fetch("/api/ratesheets/mappings");
        if (response.ok) {
          const data = await response.json();
          setSavedMappings(data.mappings || []);
        }
      } catch (error) {
        console.warn("Could not load saved mappings:", error);
      }
    };

    loadSavedMappings();
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: unknown[]) => {
      if (rejectedFiles && Array.isArray(rejectedFiles) && rejectedFiles.length > 0) {
        onError("Please upload a CSV file");
        return;
      }

      if (acceptedFiles?.length > 0) {
        const file = acceptedFiles[0];
        setSelectedFile(file);
        setUploadState("parsing");

        try {
          const data = await parseFile(file);
          setFileData(data);
          setUploadState("mapping");
        } catch (error) {
          onError(error instanceof Error ? error.message : "Failed to parse file");
          setUploadState("idle");
        }
      }
    },
    [onError]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    multiple: false,
    maxFiles: 1,
  });

  const handleFieldMapping = (standardField: FieldKey, headerIndex: number) => {
    setFieldMappings((prev) => ({
      ...prev,
      [standardField]: headerIndex === -1 ? undefined : headerIndex,
    }));
  };

  const getHeaderPreview = (headerIndex: number | undefined) => {
    if (!fileData?.sampleRows?.length || headerIndex === undefined) return "";
    return fileData.sampleRows.map((row) => row[headerIndex] || "").join(", ");
  };

  const validateMapping = () => {
    const requiredFields = Object.entries(STANDARD_FIELDS)
      .filter(([, config]) => config.required)
      .map(([field]) => field as FieldKey);

    return requiredFields.filter((field) => fieldMappings[field] === undefined);
  };

  const loadSavedMapping = (savedMapping: SavedMapping) => {
    setProviderName(savedMapping.providerName);
    setFieldMappings(savedMapping.columnMappings || {});
  };

  const handleProceed = async (testMode = false) => {
    const missingRequired = validateMapping();
    if (missingRequired.length > 0) {
      onError(
        `Please map required fields: ${missingRequired.map((f) => STANDARD_FIELDS[f].label).join(", ")}`
      );
      return;
    }

    if (!providerName.trim()) {
      onError("Please enter a provider name");
      return;
    }

    if (!selectedFile || !fileData) {
      onError("No file selected");
      return;
    }

    setUploadState("processing");

    try {
      // Read the file content
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(selectedFile);
      });

      // Send to API
      const response = await fetch("/api/ratesheets/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileContent,
          fileName: selectedFile.name,
          providerName: providerName.trim(),
          mappings: fieldMappings,
          testMode,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      // Save the mapping for future use
      await fetch("/api/ratesheets/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerName: providerName.trim(),
          columnMappings: fieldMappings,
          fileFormat: "csv",
        }),
      });

      onUploadComplete(result);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Failed to process upload");
      setUploadState("mapping");
    }
  };

  const resetUpload = () => {
    setUploadState("idle");
    setFileData(null);
    setFieldMappings({});
    setProviderName("");
    setSelectedFile(null);
  };

  if (uploadState === "idle") {
    return (
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
          isDragActive ? "border-[#79d5e9] bg-[#79d5e9]/10" : "border-white/20 hover:border-white/40"
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-5xl mb-4">📊</div>
        <h2 className="text-xl font-semibold text-white mb-2">Upload Rate Sheet</h2>
        <p className="text-white/60 mb-4">Upload CSV files from any lease provider</p>
        <div className="text-sm text-white/40 mb-6">
          <p className="font-medium mb-2">Supported Formats:</p>
          <p>CSV (.csv) - Drag & drop or click to select</p>
        </div>
        <button
          className="px-6 py-3 rounded-lg text-[#0f1419] font-medium transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #79d5e9 0%, #6bc7db 100%)" }}
          onClick={(e) => e.stopPropagation()}
        >
          Choose File
        </button>
      </div>
    );
  }

  if (uploadState === "parsing") {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4 animate-pulse">📊</div>
        <p className="text-white/60">Parsing file headers...</p>
      </div>
    );
  }

  if (uploadState === "mapping" && fileData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Map Data Fields</h2>
            <p className="text-white/60 text-sm">Match your file headers to standard fields</p>
          </div>
          <button
            onClick={resetUpload}
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            ← Upload Different File
          </button>
        </div>

        {/* Provider Input */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Provider Name</label>
            <input
              type="text"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              placeholder="e.g., Lex Autolease, Arval, etc."
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-[#79d5e9]"
            />
          </div>

          {savedMappings.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Or load saved mapping
              </label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    const mapping = savedMappings.find((m) => m.id === e.target.value);
                    if (mapping) loadSavedMapping(mapping);
                  }
                }}
                className="w-full px-4 py-2 rounded-lg border border-white/10 text-white focus:outline-none focus:border-[#79d5e9]"
                style={{ backgroundColor: "#1a1f2a", colorScheme: "dark" }}
              >
                <option value="" style={{ backgroundColor: "#1a1f2a", color: "white" }}>-- Select saved provider --</option>
                {savedMappings.map((mapping) => (
                  <option key={mapping.id} value={mapping.id} style={{ backgroundColor: "#1a1f2a", color: "white" }}>
                    {mapping.providerName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* File Info */}
        <div
          className="p-4 rounded-lg"
          style={{ background: "rgba(121, 213, 233, 0.1)", border: "1px solid rgba(121, 213, 233, 0.2)" }}
        >
          <div className="flex items-center gap-6 text-sm">
            <span className="text-white/80">
              <strong className="text-white">File:</strong> {selectedFile?.name}
            </span>
            <span className="text-white/80">
              <strong className="text-white">Rows:</strong> {fileData.totalRows.toLocaleString()}
            </span>
            <span className="text-white/80">
              <strong className="text-white">Headers:</strong> {fileData.headers.length}
            </span>
          </div>
        </div>

        {/* Mapping Grid */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {Object.entries(STANDARD_FIELDS).map(([fieldKey, fieldConfig]) => (
            <div
              key={fieldKey}
              className={`p-4 rounded-lg flex flex-col md:flex-row md:items-center gap-4 ${
                fieldConfig.required ? "bg-white/5" : "bg-transparent"
              }`}
              style={{ border: "1px solid rgba(255, 255, 255, 0.1)" }}
            >
              <div className="flex-1">
                <label className="block font-medium text-white">
                  {fieldConfig.label}
                  {fieldConfig.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                <p className="text-xs text-white/50">{fieldConfig.description}</p>
              </div>

              <div className="flex-1">
                <select
                  value={fieldMappings[fieldKey as FieldKey] ?? -1}
                  onChange={(e) => handleFieldMapping(fieldKey as FieldKey, parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 text-white focus:outline-none focus:border-[#79d5e9]"
                  style={{ backgroundColor: "#1a1f2a", colorScheme: "dark" }}
                >
                  <option value={-1} style={{ backgroundColor: "#1a1f2a", color: "white" }}>-- Skip this field --</option>
                  {fileData.headers.map((header, index) => (
                    <option key={index} value={index} style={{ backgroundColor: "#1a1f2a", color: "white" }}>
                      {header || `Column ${index + 1}`}
                    </option>
                  ))}
                </select>

                {fieldMappings[fieldKey as FieldKey] !== undefined && (
                  <div className="mt-1 text-xs text-white/40 truncate">
                    <strong>Preview:</strong> {getHeaderPreview(fieldMappings[fieldKey as FieldKey]) || "No data"}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="text-sm">
            {validateMapping().length === 0 ? (
              <span className="text-green-400">✅ All required fields mapped</span>
            ) : (
              <span className="text-red-400">
                ❌ Missing: {validateMapping().map((f) => STANDARD_FIELDS[f].label).join(", ")}
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleProceed(true)}
              className="px-4 py-2 rounded-lg text-white border border-white/20 hover:bg-white/5 transition-colors"
            >
              Test First 10 Rows
            </button>
            <button
              onClick={() => handleProceed(false)}
              className="px-4 py-2 rounded-lg text-[#0f1419] font-medium transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #79d5e9 0%, #6bc7db 100%)" }}
            >
              Process All {fileData.totalRows.toLocaleString()} Rows
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (uploadState === "processing") {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4 animate-spin">⚙️</div>
        <p className="text-white/60">Processing {fileData?.totalRows.toLocaleString()} vehicles...</p>
        <p className="text-white/40 text-sm mt-2">This may take a moment for large files.</p>
      </div>
    );
  }

  return null;
}
