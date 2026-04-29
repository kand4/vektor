
import { OutbreakAlert } from "../types";

/**
 * Since CDC/WHO do not have open public CORS-friendly JSON APIs,
 * This service returns a "Digital Twin" of the current global biological threat landscape.
 * Data reflects real-world alerts (Mpox, H5N1, Dengue, etc.)
 */

export const getGlobalOutbreaks = (): OutbreakAlert[] => [
    {
        id: "mpox-africa",
        disease: "Mpox (Monkeypox) Clade Ib",
        location: "DR Congo & Central Africa",
        region: "AFRICA",
        coordinates: { x: 55, y: 55 }, // Approx Lat/Lon mapped to %
        severity: "CRITICAL",
        cases: "17,000+ Suspected",
        source: "WHO",
        description: "PHEIC Declared. Rapid spread of new Clade Ib strain through sexual contact and close proximity.",
        vector: "Human-to-Human"
    },
    {
        id: "dengue-americas",
        disease: "Dengue Fever",
        location: "Brazil & Latin America",
        region: "AMERICAS",
        coordinates: { x: 28, y: 65 },
        severity: "HIGH",
        cases: "4.5 Million+",
        source: "PAHO/WHO",
        description: "Historic surge in dengue cases due to El Niño and climate change expanding mosquito range.",
        vector: "Aedes aegypti"
    },
    {
        id: "h5n1-usa",
        disease: "Avian Influenza (H5N1)",
        location: "USA",
        region: "AMERICAS",
        coordinates: { x: 18, y: 35 },
        severity: "MODERATE",
        cases: "Sporadic (Cattle/Human)",
        source: "CDC",
        description: "Ongoing outbreak in dairy cattle with sporadic spillover to farm workers. High surveillance.",
        vector: "Birds / Cattle"
    },
    {
        id: "oropouche-brazil",
        disease: "Oropouche Virus",
        location: "Amazon Region",
        region: "AMERICAS",
        coordinates: { x: 30, y: 60 },
        severity: "WATCH",
        cases: "8,000+",
        source: "CDC",
        description: "Spread by midges (Culicoides). Increasing reports of vertical transmission (mother-to-fetus).",
        vector: "Culicoides paraensis (Midge)"
    },
    {
        id: "cholera-yemen",
        disease: "Cholera",
        location: "Yemen & Horn of Africa",
        region: "AFRICA",
        coordinates: { x: 60, y: 45 },
        severity: "HIGH",
        cases: "Active Outbreak",
        source: "WHO",
        description: "Waterborne acute diarrheal infection caused by ingestion of food or water contaminated.",
        vector: "Contaminated Water"
    },
    {
        id: "dengue-sea",
        disease: "Dengue Fever",
        location: "Malaysia / Thailand / Singapore",
        region: "ASIA",
        coordinates: { x: 78, y: 55 },
        severity: "HIGH",
        cases: "120,000+ (Regional)",
        source: "MOH",
        description: "Consistent seasonal spike. Urban clusters identified in high density areas.",
        vector: "Aedes albopictus"
    },
    {
        id: "nipah-india",
        disease: "Nipah Virus",
        location: "Kerala, India",
        region: "ASIA",
        coordinates: { x: 70, y: 50 },
        severity: "WATCH",
        cases: "Sporadic Fatalities",
        source: "CDC",
        description: "Zoonotic virus (fruit bats) with high mortality rate. Seasonal surveillance active.",
        vector: "Fruit Bats (Pteropus)"
    },
    {
        id: "west-nile-europe",
        disease: "West Nile Virus",
        location: "Southern Europe (Italy/Greece)",
        region: "EUROPE",
        coordinates: { x: 52, y: 35 },
        severity: "MODERATE",
        cases: "Seasonal Rise",
        source: "ECDC",
        description: "Mosquito-borne transmission increasing in European summer due to warmer temperatures.",
        vector: "Culex mosquitoes"
    }
];
